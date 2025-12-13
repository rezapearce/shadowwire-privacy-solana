'use client';

import { useState, useRef, useCallback } from 'react';
import Webcam from 'react-webcam';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Video, Upload, Play, Square, CheckCircle2, X, Loader2 } from 'lucide-react';

interface VideoEvidenceUploaderProps {
  questionId: string;
  userId: string;
  screeningId: string;
  onUploadComplete: (path: string) => void;
  onRemove?: () => void;
  existingVideoUrl?: string;
}

type UploadMode = 'initial' | 'recording' | 'preview' | 'uploading' | 'completed';

export function VideoEvidenceUploader({
  questionId,
  userId,
  screeningId,
  onUploadComplete,
  onRemove,
  existingVideoUrl,
}: VideoEvidenceUploaderProps) {
  const [mode, setMode] = useState<UploadMode>(existingVideoUrl ? 'completed' : 'initial');
  const [recordedChunks, setRecordedChunks] = useState<Blob[]>([]);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [videoBlob, setVideoBlob] = useState<Blob | null>(null);
  const [videoUrl, setVideoUrl] = useState<string | null>(existingVideoUrl || null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const webcamRef = useRef<Webcam>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleStartRecording = useCallback(() => {
    if (!webcamRef.current?.stream) {
      toast.error('Camera not available. Please check permissions.');
      return;
    }

    const mediaRecorder = new MediaRecorder(webcamRef.current.stream, {
      mimeType: 'video/webm',
    });

    mediaRecorderRef.current = mediaRecorder;
    const chunks: Blob[] = [];

    mediaRecorder.ondataavailable = (event) => {
      if (event.data.size > 0) {
        chunks.push(event.data);
      }
    };

    mediaRecorder.onstop = () => {
      const blob = new Blob(chunks, { type: 'video/webm' });
      setVideoBlob(blob);
      setRecordedChunks(chunks);
      setMode('preview');
    };

    mediaRecorder.start();
    setMode('recording');
  }, []);

  const handleStopRecording = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
  }, []);

  const handleFileSelect = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('video/')) {
      toast.error('Please select a video file');
      return;
    }

    // Validate file size (50MB limit)
    if (file.size > 52428800) {
      toast.error('Video file is too large. Maximum size is 50MB.');
      return;
    }

    setVideoBlob(file);
    setMode('preview');
  }, []);

  const handleRetake = useCallback(() => {
    setMode('initial');
    setVideoBlob(null);
    setRecordedChunks([]);
    setUploadProgress(0);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, []);

  const handleUpload = useCallback(async () => {
    if (!videoBlob) {
      toast.error('No video to upload');
      return;
    }

    if (!screeningId) {
      toast.error('Screening ID is missing');
      return;
    }

    setMode('uploading');
    setUploadProgress(0);

    try {
      const filePath = `${userId}/${screeningId}/${questionId}.webm`;

      // Upload with progress tracking
      const { data, error } = await supabase.storage
        .from('clinical-evidence')
        .upload(filePath, videoBlob, {
          cacheControl: '3600',
          upsert: true,
        });

      if (error) {
        throw error;
      }

      // Simulate progress for better UX
      setUploadProgress(100);

      const fullPath = `${userId}/${screeningId}/${questionId}.webm`;
      setVideoUrl(fullPath);
      setMode('completed');
      onUploadComplete(fullPath);
      toast.success('Video uploaded successfully');
    } catch (error: any) {
      console.error('Upload error:', error);
      toast.error(`Failed to upload video: ${error.message || 'Unknown error'}`);
      setMode('preview');
      setUploadProgress(0);
    }
  }, [videoBlob, screeningId, userId, questionId, onUploadComplete]);

  const handleRemove = useCallback(() => {
    if (videoUrl) {
      // Optionally delete from storage
      supabase.storage
        .from('clinical-evidence')
        .remove([videoUrl])
        .catch((error) => {
          console.error('Error deleting video:', error);
        });
    }

    setVideoUrl(null);
    setVideoBlob(null);
    setRecordedChunks([]);
    setMode('initial');
    setUploadProgress(0);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    if (onRemove) {
      onRemove();
    }
    toast.success('Video removed');
  }, [videoUrl, onRemove]);

  // Render based on mode
  if (mode === 'initial') {
    return (
      <div className="mt-4 p-4 border rounded-lg space-y-3">
        <div className="flex gap-2">
          <Button
            type="button"
            onClick={handleStartRecording}
            variant="outline"
            className="flex-1"
          >
            <Video className="h-4 w-4 mr-2" />
            Record Video
          </Button>
          <Button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            variant="outline"
            className="flex-1"
          >
            <Upload className="h-4 w-4 mr-2" />
            Upload File
          </Button>
        </div>
        <input
          ref={fileInputRef}
          type="file"
          accept="video/*"
          onChange={handleFileSelect}
          className="hidden"
        />
      </div>
    );
  }

  if (mode === 'recording') {
    return (
      <div className="mt-4 p-4 border rounded-lg space-y-3">
        <div className="relative w-full aspect-video bg-black rounded-lg overflow-hidden">
          <Webcam
            ref={webcamRef}
            audio={true}
            videoConstraints={{
              width: 1280,
              height: 720,
              facingMode: 'user',
            }}
            className="w-full h-full object-cover"
          />
          <div className="absolute top-2 left-2 flex items-center gap-2 bg-red-600 text-white px-3 py-1 rounded-full">
            <div className="w-2 h-2 bg-white rounded-full animate-pulse" />
            <span className="text-sm font-medium">Recording</span>
          </div>
        </div>
        <Button
          type="button"
          onClick={handleStopRecording}
          variant="destructive"
          className="w-full"
        >
          <Square className="h-4 w-4 mr-2" />
          Stop Recording
        </Button>
      </div>
    );
  }

  if (mode === 'preview') {
    const previewUrl = videoBlob ? URL.createObjectURL(videoBlob) : null;

    return (
      <div className="mt-4 p-4 border rounded-lg space-y-3">
        {previewUrl && (
          <div className="relative w-full aspect-video bg-black rounded-lg overflow-hidden">
            <video
              src={previewUrl}
              controls
              className="w-full h-full object-contain"
            />
          </div>
        )}
        <div className="flex gap-2">
          <Button
            type="button"
            onClick={handleRetake}
            variant="outline"
            className="flex-1"
          >
            <X className="h-4 w-4 mr-2" />
            Retake
          </Button>
          <Button
            type="button"
            onClick={handleUpload}
            className="flex-1"
          >
            <CheckCircle2 className="h-4 w-4 mr-2" />
            Confirm & Upload
          </Button>
        </div>
      </div>
    );
  }

  if (mode === 'uploading') {
    return (
      <div className="mt-4 p-4 border rounded-lg space-y-3">
        <div className="flex items-center gap-3">
          <Loader2 className="h-5 w-5 animate-spin text-primary" />
          <div className="flex-1">
            <p className="text-sm font-medium">Uploading video...</p>
            <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
              <div
                className="bg-primary h-2 rounded-full transition-all duration-300"
                style={{ width: `${uploadProgress}%` }}
              />
            </div>
            <p className="text-xs text-muted-foreground mt-1">{uploadProgress}%</p>
          </div>
        </div>
      </div>
    );
  }

  if (mode === 'completed') {
    return (
      <div className="mt-4 p-4 border rounded-lg bg-green-50 border-green-200 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5 text-green-600" />
            <span className="text-sm font-medium text-green-900">Video Attached</span>
          </div>
          <Button
            type="button"
            onClick={handleRemove}
            variant="ghost"
            size="sm"
          >
            <X className="h-4 w-4 mr-1" />
            Remove
          </Button>
        </div>
      </div>
    );
  }

  return null;
}
