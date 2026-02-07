import React, { useState } from 'react';
import ReactPlayer from 'react-player';

interface VideoPlayerWrapperProps {
  url: string;
  width?: string | number;
  height?: string | number;
  controls?: boolean;
  className?: string;
  /** Additional config for ReactPlayer (e.g., youtube playerVars) */
  config?: any;
}

/**
 * Универсальный обёртка для видеоплеера.
 * - Показывает индикатор загрузки пока видео не готово.
 * - Скрывает индикатор при начале воспроизведения (onPlay) и при ошибке (onError).
 * - Поддерживает любые URL (YouTube, MP4, Vimeo и др.).
 */
export const VideoPlayerWrapper: React.FC<VideoPlayerWrapperProps> = ({
  url,
  width = '100%',
  height = '100%',
  controls = true,
  className = '',
  config,
  ...rest,
}) => {
  const [isReady, setIsReady] = useState(false);

  const handleReady = () => setIsReady(true);
  const handlePlay = () => setIsReady(true);
  const handleError = () => setIsReady(true);

  return (
    <div className={`relative ${className}`}> 
      {/* Loading overlay */}
      {!isReady && (
        <div className="absolute inset-0 flex items-center justify-center bg-[#16181D] animate-pulse z-10">
          <div className="flex flex-col items-center gap-3">
            <div className="w-12 h-12 rounded-full border-2 border-white/10 border-t-[#6C5DD3] animate-spin" />
            <span className="text-[9px] font-black uppercase tracking-[0.2em] text-white/20">
              Загрузка данных...
            </span>
          </div>
        </div>
      )}
      <ReactPlayer
        url={url}
        width={width}
        height={height}
        controls={controls}
        onReady={handleReady}
        onPlay={handlePlay}
        onError={handleError}
        config={config} {...rest}
        className="w-full h-full object-cover"
      />
    </div>
  );
};
