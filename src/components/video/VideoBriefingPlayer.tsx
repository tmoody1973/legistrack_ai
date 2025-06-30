import React, { useState, useEffect, useRef } from 'react';
import { Play, Pause, Volume2, VolumeX, Download, Share2, Bookmark, SkipBack, SkipForward, Loader, Eye, EyeOff } from 'lucide-react';
import { Button } from '../common/Button';
import Hls from 'hls.js';

interface VideoBriefingPlayerProps {
  videoUrl: string;
  title: string;
  transcript?: string;
  thumbnailUrl?: string;
  onEnded?: () => void;
  isLoading?: boolean;
}

export const VideoBriefingPlayer: React.FC<VideoBriefingPlayerProps> = ({
  videoUrl,
  title,
  transcript,
  thumbnailUrl,
  onEnded,
  isLoading = false
}) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showTranscript, setShowTranscript] = useState(false);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [error, setError] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const playerRef = useRef<HTMLDivElement>(null);
  const hlsRef = useRef<Hls | null>(null);

  useEffect(() => {
    // Reset error state when videoUrl changes
    setError(null);
    
    if (!videoUrl) return;
    
    // Initialize video player
    const initializePlayer = () => {
      const video = videoRef.current;
      if (!video) return;
      
      // Check if the URL is an HLS stream
      if (videoUrl.includes('.m3u8')) {
        // For HLS streams, we need to use HLS.js if it's available
        if (Hls.isSupported()) {
          if (hlsRef.current) {
            hlsRef.current.destroy();
          }
          
          const hls = new Hls({
            enableWorker: true,
            lowLatencyMode: false, // Disable low latency mode to prevent buffer stalling
            maxBufferLength: 30,    // Increase buffer length for smoother playback
            backBufferLength: 90    // Increase back buffer for better seeking
          });
          
          hls.loadSource(videoUrl);
          hls.attachMedia(video);
          
          hls.on(Hls.Events.MANIFEST_PARSED, () => {
            console.log('HLS manifest loaded successfully');
            if (video) {
              video.play().catch(e => {
                console.warn('Auto-play prevented:', e);
              });
            }
          });
          
          hls.on(Hls.Events.ERROR, (event, data) => {
            // Handle non-fatal errors gracefully
            if (!data.fatal) {
              // Log non-fatal errors as warnings without showing to user
              console.warn('HLS non-fatal error:', data.details, data);
              
              // Let HLS.js handle recovery for common non-fatal errors
              if (data.details === 'bufferStalledError' || 
                  data.details === 'bufferSeekOverHole' ||
                  data.details === 'bufferAppendError' ||
                  data.details === 'bufferAddCodecError') {
                // These are common buffering issues that HLS.js can recover from
                console.warn(`HLS.js handling recovery for: ${data.details}`);
                return;
              }
            }
            
            // Only handle fatal errors that require user intervention
            if (data.fatal) {
              console.error('HLS fatal error:', data);
              
              switch(data.type) {
                case Hls.ErrorTypes.NETWORK_ERROR:
                  console.error('Fatal network error, attempting recovery', data);
                  try {
                    hls.startLoad();
                  } catch (e) {
                    console.error('Failed to recover from network error:', e);
                    setError('Network error loading video. Please check your connection and try again.');
                  }
                  break;
                  
                case Hls.ErrorTypes.MEDIA_ERROR:
                  console.error('Fatal media error, attempting recovery', data);
                  try {
                    hls.recoverMediaError();
                  } catch (e) {
                    console.error('Failed to recover from media error:', e);
                    setError('Media error loading video. The video format may not be supported.');
                  }
                  break;
                  
                default:
                  console.error('Unrecoverable HLS error:', data);
                  setError('Error loading video stream. Please try again later.');
                  break;
              }
            }
          });
          
          hlsRef.current = hls;
        } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
          // For Safari which has built-in HLS support
          video.src = videoUrl;
        } else {
          console.error('HLS.js not available and browser does not support HLS');
          setError('Your browser does not support the required video format.');
        }
      } else {
        // For regular video URLs
        video.src = videoUrl;
      }
    };
    
    initializePlayer();
    
    // Cleanup function
    return () => {
      if (hlsRef.current) {
        hlsRef.current.destroy();
        hlsRef.current = null;
      }
    };
  }, [videoUrl]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const handleTimeUpdate = () => setCurrentTime(video.currentTime);
    const handleDurationChange = () => setDuration(video.duration);
    const handleEnded = () => {
      setIsPlaying(false);
      onEnded?.();
    };
    const handleError = (e: any) => {
      console.error('Video element error:', e);
      // Only set error for actual video element errors, not HLS.js errors
      if (e.target && e.target.error) {
        setError('Error loading video. Please try again later.');
      }
    };
    const handlePlay = () => setIsPlaying(true);
    const handlePause = () => setIsPlaying(false);

    video.addEventListener('timeupdate', handleTimeUpdate);
    video.addEventListener('durationchange', handleDurationChange);
    video.addEventListener('ended', handleEnded);
    video.addEventListener('error', handleError);
    video.addEventListener('play', handlePlay);
    video.addEventListener('pause', handlePause);

    return () => {
      video.removeEventListener('timeupdate', handleTimeUpdate);
      video.removeEventListener('durationchange', handleDurationChange);
      video.removeEventListener('ended', handleEnded);
      video.removeEventListener('error', handleError);
      video.removeEventListener('play', handlePlay);
      video.removeEventListener('pause', handlePause);
    };
  }, [onEnded]);

  const togglePlay = () => {
    const video = videoRef.current;
    if (!video) return;

    if (isPlaying) {
      video.pause();
    } else {
      video.play().catch(e => {
        console.error('Play error:', e);
        setError('Could not play video. Please try again.');
      });
    }
  };

  const toggleMute = () => {
    const video = videoRef.current;
    if (!video) return;

    video.muted = !isMuted;
    setIsMuted(!isMuted);
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const video = videoRef.current;
    if (!video) return;

    const newTime = parseFloat(e.target.value);
    video.currentTime = newTime;
    setCurrentTime(newTime);
  };

  const toggleFullscreen = () => {
    if (!playerRef.current) return;

    if (!isFullscreen) {
      if (playerRef.current.requestFullscreen) {
        playerRef.current.requestFullscreen();
      }
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
      }
    }
    setIsFullscreen(!isFullscreen);
  };

  const handlePlaybackRateChange = (rate: number) => {
    const video = videoRef.current;
    if (!video) return;

    video.playbackRate = rate;
    setPlaybackRate(rate);
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  const skipForward = () => {
    const video = videoRef.current;
    if (!video) return;

    video.currentTime = Math.min(video.duration, video.currentTime + 10);
  };

  const skipBackward = () => {
    const video = videoRef.current;
    if (!video) return;

    video.currentTime = Math.max(0, video.currentTime - 10);
  };

  if (isLoading) {
    return (
      <div className="bg-gray-900 rounded-lg overflow-hidden shadow-lg">
        <div className="aspect-video bg-gray-800 flex items-center justify-center">
          <div className="text-center">
            <Loader className="w-12 h-12 text-primary-500 animate-spin mx-auto mb-4" />
            <p className="text-white text-lg">Generating your personalized video briefing...</p>
            <p className="text-gray-400 text-sm mt-2">This may take a minute or two</p>
          </div>
        </div>
      </div>
    );
  }

  if (!videoUrl) {
    return (
      <div className="bg-gray-900 rounded-lg overflow-hidden shadow-lg">
        <div className="aspect-video bg-gray-800 flex items-center justify-center">
          <div className="text-center">
            <p className="text-white text-lg">Video URL not available</p>
            <p className="text-gray-400 text-sm mt-2">The video may still be processing</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gray-900 rounded-lg overflow-hidden shadow-lg" ref={playerRef}>
      {/* Video Player */}
      <div className="relative">
        {error ? (
          <div className="aspect-video bg-gray-800 flex items-center justify-center">
            <div className="text-center p-4">
              <p className="text-white text-lg mb-2">{error}</p>
              <p className="text-gray-400 text-sm">
                Please try refreshing the page or check the video URL:
                <br />
                {videoUrl}
              </p>
              <Button 
                variant="outline" 
                className="mt-4 text-white border-white hover:bg-gray-700"
                onClick={() => window.open(videoUrl, '_blank')}
              >
                Open Video in New Tab
              </Button>
            </div>
          </div>
        ) : (
          <video
            ref={videoRef}
            poster={thumbnailUrl}
            className="w-full aspect-video bg-black"
            onClick={togglePlay}
            onPlay={() => setIsPlaying(true)}
            onPause={() => setIsPlaying(false)}
            playsInline
            crossOrigin="anonymous"
          />
        )}
        
        {/* Play/Pause Overlay */}
        <div 
          className="absolute inset-0 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity cursor-pointer"
          onClick={togglePlay}
        >
          <div className="bg-black bg-opacity-50 rounded-full p-4">
            {isPlaying ? (
              <Pause className="w-8 h-8 text-white" />
            ) : (
              <Play className="w-8 h-8 text-white" />
            )}
          </div>
        </div>
      </div>

      {/* Controls */}
      <div className="bg-gray-800 p-4">
        <div className="flex flex-col space-y-2">
          {/* Title */}
          <h3 className="text-white font-medium truncate">{title}</h3>
          
          {/* Progress Bar */}
          <div className="flex items-center space-x-2">
            <span className="text-gray-400 text-sm">{formatTime(currentTime)}</span>
            <input
              type="range"
              min="0"
              max={duration || 100}
              value={currentTime}
              onChange={handleSeek}
              className="flex-1 h-2 bg-gray-700 rounded-full appearance-none [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-primary-500"
            />
            <span className="text-gray-400 text-sm">{formatTime(duration)}</span>
          </div>
          
          {/* Control Buttons */}
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <button 
                onClick={skipBackward}
                className="text-gray-400 hover:text-white transition-colors"
              >
                <SkipBack className="w-5 h-5" />
              </button>
              
              <button 
                onClick={togglePlay}
                className="bg-primary-500 hover:bg-primary-600 text-white rounded-full p-2 transition-colors"
              >
                {isPlaying ? (
                  <Pause className="w-5 h-5" />
                ) : (
                  <Play className="w-5 h-5" />
                )}
              </button>
              
              <button 
                onClick={skipForward}
                className="text-gray-400 hover:text-white transition-colors"
              >
                <SkipForward className="w-5 h-5" />
              </button>
              
              <button 
                onClick={toggleMute}
                className="text-gray-400 hover:text-white transition-colors"
              >
                {isMuted ? (
                  <VolumeX className="w-5 h-5" />
                ) : (
                  <Volume2 className="w-5 h-5" />
                )}
              </button>
            </div>
            
            <div className="flex items-center space-x-3">
              <div className="relative group">
                <button className="text-gray-400 hover:text-white transition-colors">
                  {playbackRate}x
                </button>
                <div className="absolute bottom-full right-0 mb-2 hidden group-hover:block bg-gray-800 rounded shadow-lg p-2 z-10">
                  {[0.5, 1, 1.5, 2].map(rate => (
                    <button
                      key={rate}
                      onClick={() => handlePlaybackRateChange(rate)}
                      className={`block px-4 py-1 text-sm ${playbackRate === rate ? 'text-primary-500' : 'text-gray-400 hover:text-white'}`}
                    >
                      {rate}x
                    </button>
                  ))}
                </div>
              </div>
              
              <button 
                onClick={() => setShowTranscript(!showTranscript)}
                className={`text-gray-400 hover:text-white transition-colors ${showTranscript ? 'text-primary-500' : ''}`}
              >
                {showTranscript ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
              
              <button 
                onClick={() => window.open(videoUrl, '_blank')}
                className="text-gray-400 hover:text-white transition-colors"
              >
                <Share2 className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Transcript */}
      {showTranscript && transcript && (
        <div className="bg-gray-800 border-t border-gray-700 p-4 max-h-40 overflow-y-auto">
          <h4 className="text-white text-sm font-medium mb-2">Transcript</h4>
          <p className="text-gray-300 text-sm">{transcript}</p>
        </div>
      )}
    </div>
  );
};