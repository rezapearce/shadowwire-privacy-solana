'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import Webcam from 'react-webcam';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Video, Upload, Play, Square, CheckCircle2, X, Loader2, CircleHelp, RotateCcw } from 'lucide-react';
import { VideoInstructionModal } from './VideoInstructionModal';

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
  const [showInstructions, setShowInstructions] = useState(false);
  const [hasSeenInstructions, setHasSeenInstructions] = useState(false);
  const [pendingRecording, setPendingRecording] = useState(false);
  const [shouldStartRecording, setShouldStartRecording] = useState(false);
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('environment');

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const webcamRef = useRef<Webcam>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Start recording when webcam stream is ready
  useEffect(() => {
    if (shouldStartRecording && mode === 'recording' && webcamRef.current?.stream) {
      const stream = webcamRef.current.stream;
      
      try {
        const mediaRecorder = new MediaRecorder(stream, {
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
        setShouldStartRecording(false);
      } catch (error: any) {
        console.error('Error starting recording:', error);
        toast.error('Camera access denied. Please check your browser settings or use the \'Upload File\' option instead.');
        setMode('initial');
        setShouldStartRecording(false);
      }
    }
  }, [shouldStartRecording, mode]);

  const startRecordingInternal = useCallback(() => {
    // Set mode to recording first to render Webcam component
    setMode('recording');
    setShouldStartRecording(true);
  }, []);

  const handleStartRecording = useCallback(() => {
    // Check if user has seen instructions
    if (!hasSeenInstructions) {
      setPendingRecording(true);
      setShowInstructions(true);
      return;
    }

    // Proceed with recording
    startRecordingInternal();
  }, [hasSeenInstructions, startRecordingInternal]);

  const handleInstructionsClose = useCallback(() => {
    setShowInstructions(false);
    
    // If this was the first time and user clicked Record Video, proceed with recording
    if (pendingRecording) {
      setHasSeenInstructions(true);
      setPendingRecording(false);
      // Small delay to ensure modal closes before starting recording
      setTimeout(() => {
        startRecordingInternal();
      }, 100);
    }
  }, [pendingRecording, startRecordingInternal]);

  const handleStopRecording = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
  }, []);

  const handleFlipCamera = useCallback(() => {
    setFacingMode((prev) => (prev === 'user' ? 'environment' : 'user'));
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
    setHasSeenInstructions(false); // Reset so instructions show again on next recording
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
      <>
        <div className="mt-4 p-4 border rounded-lg space-y-3">
          {/* Mobile: Stack vertically */}
          <div className="flex flex-col md:hidden gap-2">
            <div className="flex gap-2">
              <Button
                type="button"
                onClick={handleStartRecording}
                variant="outline"
                className="flex-1 min-h-[44px]"
              >
                <Video className="h-4 w-4 mr-2" />
                Record Video
              </Button>
              <Button
                type="button"
                onClick={() => setShowInstructions(true)}
                variant="outline"
                size="icon"
                className="min-h-[44px] min-w-[44px]"
                title="Recording Tips"
              >
                <CircleHelp className="h-4 w-4" />
              </Button>
            </div>
            <Button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              variant="outline"
              className="w-full min-h-[44px]"
            >
              <Upload className="h-4 w-4 mr-2" />
              Upload File
            </Button>
          </div>
          {/* Desktop: Horizontal layout */}
          <div className="hidden md:flex gap-2">
            <div className="flex-1 flex gap-2">
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
                onClick={() => setShowInstructions(true)}
                variant="outline"
                size="icon"
                title="Recording Tips"
              >
                <CircleHelp className="h-4 w-4" />
              </Button>
            </div>
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
        <VideoInstructionModal
          isOpen={showInstructions}
          onClose={handleInstructionsClose}
        />
      </>
    );
  }

  if (mode === 'recording') {
    return (
      <>
        <div className="mt-4 p-4 border rounded-lg space-y-3">
          <div className="relative w-full aspect-video bg-black rounded-lg overflow-hidden">
            <Webcam
              ref={webcamRef}
              audio={true}
              videoConstraints={{
                width: { ideal: 1280 },
                height: { ideal: 720 },
                facingMode: facingMode,
              }}
              className="w-full h-full object-cover"
              onUserMedia={() => {
                // Stream is ready, recording will start via useEffect
              }}
              onUserMediaError={(error) => {
                console.error('Webcam error:', error);
                toast.error('Camera access denied. Please check your browser settings or use the \'Upload File\' option instead.');
                setMode('initial');
                setShouldStartRecording(false);
              }}
            />
            {mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording' && (
              <div className="absolute top-2 left-2 flex items-center gap-2 bg-red-600 text-white px-3 py-1 rounded-full">
                <div className="w-2 h-2 bg-white rounded-full animate-pulse" />
                <span className="text-sm font-medium">Recording</span>
              </div>
            )}
            <Button
              type="button"
              onClick={handleFlipCamera}
              variant="secondary"
              size="icon"
              className="absolute top-2 right-2 h-11 w-11 bg-black/50 hover:bg-black/70 text-white border-0"
              title="Flip Camera"
              disabled={mediaRecorderRef.current?.state === 'recording'}
            >
              <RotateCcw className="h-5 w-5" />
            </Button>
          </div>
          <Button
            type="button"
            onClick={handleStopRecording}
            variant="destructive"
            className="w-full min-h-[44px]"
            disabled={!mediaRecorderRef.current || mediaRecorderRef.current.state !== 'recording'}
          >
            <Square className="h-4 w-4 mr-2" />
            Stop Recording
          </Button>
        </div>
        <VideoInstructionModal
          isOpen={showInstructions}
          onClose={handleInstructionsClose}
        />
      </>
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
        <div className="flex flex-col md:flex-row gap-2">
          <Button
            type="button"
            onClick={handleRetake}
            variant="outline"
            className="flex-1 w-full md:w-auto min-h-[44px]"
          >
            <X className="h-4 w-4 mr-2" />
            Retake
          </Button>
          <Button
            type="button"
            onClick={handleUpload}
            className="flex-1 w-full md:w-auto min-h-[44px]"
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
      <>
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
        <VideoInstructionModal
          isOpen={showInstructions}
          onClose={handleInstructionsClose}
        />
      </>
    );
  }

  return (
    <>
      {showInstructions && (
        <VideoInstructionModal
          isOpen={showInstructions}
          onClose={handleInstructionsClose}
        />
      )}
    </>
  );
}
