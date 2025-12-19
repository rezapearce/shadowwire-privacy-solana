'use client';

import { useState, useRef, useEffect } from 'react';
import { Play, Pause, Volume2, VolumeX, Maximize, Loader2, Bookmark } from 'lucide-react';
import { Button } from '@/components/ui/button';

export interface VideoBookmark {
  timestamp: number;
  timeString: string;
  note?: string;
}

interface AIInsights {
  riskScore: number | null;
  domainScores?: {
    social?: number | null;
    fineMotor?: number | null;
    language?: number | null;
    grossMotor?: number | null;
  };
}

interface VideoPlayerProps {
  src: string | null | undefined;
  className?: string;
  autoPlay?: boolean;
  showControls?: boolean;
  onBookmark?: (bookmark: VideoBookmark) => void;
  bookmarks?: VideoBookmark[];
  aiInsights?: AIInsights;
  showAIAnalysis?: boolean;
}

export function VideoPlayer({ 
  src, 
  className = '', 
  autoPlay = false,
  showControls = true,
  onBookmark,
  bookmarks = [],
  aiInsights,
  showAIAnalysis = false
}: VideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentTime, setCurrentTime] = useState(0);
  const [localBookmarks, setLocalBookmarks] = useState<VideoBookmark[]>(bookmarks);
  const [showAI, setShowAI] = useState(showAIAnalysis);

  // Format time as MM:SS
  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleBookmark = () => {
    const video = videoRef.current;
    if (!video) return;

    const timestamp = video.currentTime;
    const bookmark: VideoBookmark = {
      timestamp,
      timeString: formatTime(timestamp),
    };

    setLocalBookmarks((prev) => [...prev, bookmark]);
    if (onBookmark) {
      onBookmark(bookmark);
    }
  };

  const jumpToBookmark = (timestamp: number) => {
    const video = videoRef.current;
    if (!video) return;
    video.currentTime = timestamp;
  };

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const handleLoadedData = () => {
      setIsLoading(false);
    };

    const handleError = () => {
      setIsLoading(false);
      setError('Failed to load video');
    };

    const handlePlay = () => setIsPlaying(true);
    const handlePause = () => setIsPlaying(false);
    const handleTimeUpdate = () => setCurrentTime(video.currentTime);

    video.addEventListener('loadeddata', handleLoadedData);
    video.addEventListener('error', handleError);
    video.addEventListener('play', handlePlay);
    video.addEventListener('pause', handlePause);
    video.addEventListener('timeupdate', handleTimeUpdate);

    return () => {
      video.removeEventListener('loadeddata', handleLoadedData);
      video.removeEventListener('error', handleError);
      video.removeEventListener('play', handlePlay);
      video.removeEventListener('pause', handlePause);
      video.removeEventListener('timeupdate', handleTimeUpdate);
    };
  }, []);

  const togglePlay = () => {
    const video = videoRef.current;
    if (!video) return;

    if (isPlaying) {
      video.pause();
    } else {
      video.play();
    }
  };

  const toggleMute = () => {
    const video = videoRef.current;
    if (!video) return;

    video.muted = !isMuted;
    setIsMuted(!isMuted);
  };

  const toggleFullscreen = () => {
    const video = videoRef.current;
    if (!video) return;

    if (video.requestFullscreen) {
      video.requestFullscreen();
    } else if ((video as any).webkitRequestFullscreen) {
      (video as any).webkitRequestFullscreen();
    } else if ((video as any).mozRequestFullScreen) {
      (video as any).mozRequestFullScreen();
    } else if ((video as any).msRequestFullscreen) {
      (video as any).msRequestFullscreen();
    }
  };

  if (!src) {
    return (
      <div className={`flex items-center justify-center bg-slate-100 rounded-lg p-8 ${className}`}>
        <p className="text-muted-foreground">No video available</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`flex items-center justify-center bg-slate-100 rounded-lg p-8 ${className}`}>
        <p className="text-destructive">{error}</p>
      </div>
    );
  }

  return (
    <div className={`relative bg-black rounded-lg overflow-hidden ${className}`}>
      <div className="relative">
        <video
          ref={videoRef}
          src={src}
          className="w-full h-full"
          autoPlay={autoPlay}
          playsInline
          onLoadedData={() => setIsLoading(false)}
          onError={() => {
            setIsLoading(false);
            setError('Failed to load video');
          }}
        />

        {/* AI Analysis Overlay */}
        {showAI && aiInsights && (
          <div className="absolute top-4 right-4 bg-black/80 text-white p-3 rounded-lg text-sm max-w-xs">
            <div className="font-semibold mb-2 flex items-center gap-2">
              <span>AI Analysis</span>
              <button
                onClick={() => setShowAI(false)}
                className="ml-auto text-xs hover:text-gray-300"
              >
                ×
              </button>
            </div>
            {aiInsights.riskScore !== null && (
              <div className="mb-2">
                <div className="text-xs text-gray-300 mb-1">Overall Risk</div>
                <div className="font-bold">{aiInsights.riskScore}/100</div>
              </div>
            )}
            {aiInsights.domainScores && (
              <div className="space-y-1 text-xs">
                {aiInsights.domainScores.social !== null && (
                  <div>Personal-Social: {aiInsights.domainScores.social}%</div>
                )}
                {aiInsights.domainScores.fineMotor !== null && (
                  <div>Fine Motor: {aiInsights.domainScores.fineMotor}%</div>
                )}
                {aiInsights.domainScores.language !== null && (
                  <div>Language: {aiInsights.domainScores.language}%</div>
                )}
                {aiInsights.domainScores.grossMotor !== null && (
                  <div>Gross Motor: {aiInsights.domainScores.grossMotor}%</div>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/50">
          <Loader2 className="h-8 w-8 animate-spin text-white" />
        </div>
      )}

      {showControls && !isLoading && (
        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-4">
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={togglePlay}
              className="text-white hover:bg-white/20"
            >
              {isPlaying ? (
                <Pause className="h-5 w-5" />
              ) : (
                <Play className="h-5 w-5" />
              )}
            </Button>

            <Button
              variant="ghost"
              size="sm"
              onClick={toggleMute}
              className="text-white hover:bg-white/20"
            >
              {isMuted ? (
                <VolumeX className="h-5 w-5" />
              ) : (
                <Volume2 className="h-5 w-5" />
              )}
            </Button>

            {onBookmark && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleBookmark}
                className="text-white hover:bg-white/20"
                title={`Bookmark at ${formatTime(currentTime)}`}
              >
                <Bookmark className="h-5 w-5" />
              </Button>
            )}

            {aiInsights && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowAI(!showAI)}
                className={`text-white hover:bg-white/20 ${showAI ? 'bg-white/30' : ''}`}
                title="Toggle AI Analysis"
              >
                <span className="text-xs">AI</span>
              </Button>
            )}

            <div className="flex-1" />

            <Button
              variant="ghost"
              size="sm"
              onClick={toggleFullscreen}
              className="text-white hover:bg-white/20"
            >
              <Maximize className="h-5 w-5" />
            </Button>
          </div>
        </div>
      )}

      {/* Bookmarks List */}
      {(localBookmarks.length > 0 || bookmarks.length > 0) && (
        <div className="mt-4 p-4 bg-slate-50 rounded-lg">
          <h4 className="text-sm font-semibold text-slate-900 mb-2">Bookmarks</h4>
          <div className="space-y-1">
            {(localBookmarks.length > 0 ? localBookmarks : bookmarks).map((bookmark, index) => (
              <button
                key={index}
                onClick={() => jumpToBookmark(bookmark.timestamp)}
                className="w-full text-left px-3 py-2 text-sm bg-white rounded border hover:bg-slate-100 transition-colors flex items-center justify-between"
              >
                <span className="font-mono text-slate-600">{bookmark.timeString}</span>
                {bookmark.note && (
                  <span className="text-slate-500 ml-2">{bookmark.note}</span>
                )}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

