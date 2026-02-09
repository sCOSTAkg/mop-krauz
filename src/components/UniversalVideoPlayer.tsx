
import React from 'react';
import ReactPlayer from 'react-player';

interface UniversalVideoPlayerProps {
  url: string;
  controls?: boolean;
  width?: string;
  height?: string;
  className?: string;
}

export const UniversalVideoPlayer: React.FC<UniversalVideoPlayerProps> = ({
  url,
  controls = true,
  width = '100%',
  height = '100%',
  className = ''
}) => {
  // ReactPlayer supports multiple platforms automatically:
  // - YouTube, Vimeo, Dailymotion, SoundCloud, Streamable, Wistia, Twitch, Facebook
  // - Direct video files (mp4, webm, ogv), HLS streams, DASH streams

  // Additional manual parsing for Kinescope, Rutube and other platforms

  // Kinescope.io support
  const getKinescopeEmbedUrl = (url: string): string | null => {
    // Kinescope formats:
    // https://kinescope.io/XXXXXXX
    // https://kinescope.io/embed/XXXXXXX
    // https://APP_ID.kinescope.io/XXXXXXX
    const kinescopeMatch = url.match(/kinescope\.io\/(?:embed\/)?(\w+)/);
    if (kinescopeMatch) {
      return `https://kinescope.io/embed/${kinescopeMatch[1]}`;
    }

    // Custom domain format: https://APP_ID.kinescope.io/VIDEO_ID
    const customKinescopeMatch = url.match(/([\w-]+)\.kinescope\.io\/(\w+)/);
    if (customKinescopeMatch) {
      return `https://${customKinescopeMatch[1]}.kinescope.io/${customKinescopeMatch[2]}`;
    }

    return null;
  };

  const getRutubeEmbedUrl = (url: string): string | null => {
    const rutubeMatch = url.match(/rutube\.ru\/(?:video|play\/embed)\/(\w+)/);
    if (rutubeMatch) {
      return `https://rutube.ru/play/embed/${rutubeMatch[1]}`;
    }
    return null;
  };

  const getOkRuEmbedUrl = (url: string): string | null => {
    const okMatch = url.match(/ok\.ru\/video\/(\d+)/);
    if (okMatch) {
      return `https://ok.ru/videoembed/${okMatch[1]}`;
    }
    return null;
  };

  const getVKEmbedUrl = (url: string): string | null => {
    const vkMatch = url.match(/vk\.com\/video(-?\d+_\d+)/);
    if (vkMatch) {
      return `https://vk.com/video_ext.php?oid=${vkMatch[1].split('_')[0]}&id=${vkMatch[1].split('_')[1]}`;
    }
    return null;
  };

  // Check for special platforms
  const kinescopeUrl = getKinescopeEmbedUrl(url);
  const rutubeUrl = getRutubeEmbedUrl(url);
  const okUrl = getOkRuEmbedUrl(url);
  const vkUrl = getVKEmbedUrl(url);

  // If it's Kinescope, Rutube, OK.ru, or VK - use iframe
  if (kinescopeUrl || rutubeUrl || okUrl || vkUrl) {
    const embedUrl = kinescopeUrl || rutubeUrl || okUrl || vkUrl;
    return (
      <div className={className} style={{ width, height, position: 'relative', paddingTop: '56.25%' }}>
        <iframe
          src={embedUrl || ''}
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            border: 'none',
            borderRadius: '12px'
          }}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen"
          allowFullScreen
        />
      </div>
    );
  }

  // Otherwise use ReactPlayer (supports YouTube, Vimeo, etc.)
  return (
    <div className={className} style={{ width, height }}>
      <ReactPlayer
        url={url}
        controls={controls}
        width="100%"
        height="100%"
        config={{
          youtube: {
            playerVars: { showinfo: 1, modestbranding: 1 }
          },
          vimeo: {
            playerOptions: { responsive: true }
          }
        }}
      />
    </div>
  );
};
