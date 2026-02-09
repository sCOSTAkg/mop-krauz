
import React, { useState, useEffect } from 'react';
import ReactPlayer from 'react-player';
import { Stream, UserProgress, SmartNavAction, VideoCategory } from '../types';
import { XPService } from '../services/xpService';
import { telegram } from '../services/telegramService';

const VideoPlayer = ReactPlayer as unknown as React.ComponentType<any>;

interface VideoHubProps {
  streams: Stream[];
  onBack: () => void;
  userProgress: UserProgress;
  onUpdateUser: (data: Partial<UserProgress>) => void;
  setNavAction?: (action: SmartNavAction | null) => void;
}

export const VideoHub: React.FC<VideoHubProps> = ({ streams, userProgress, onUpdateUser, setNavAction }) => {
  const [activeCategory, setActiveCategory] = useState<VideoCategory | 'ALL'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  const categories: { id: VideoCategory | 'ALL', label: string, icon: string }[] = [
    { id: 'ALL', label: 'Все', icon: '🌈' },
    { id: 'WEBINAR', label: 'Вебинары', icon: '📡' },
    { id: 'TUTORIAL', label: 'Уроки', icon: '🎓' },
    { id: 'SHORT', label: 'Шортсы', icon: '⚡' },
    { id: 'INSIGHT', label: 'Инсайты', icon: '🧠' },
  ];

  const filteredStreams = streams.filter(s => {
    const matchesCategory = activeCategory === 'ALL' || s.category === activeCategory;
    const matchesSearch = s.title.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const liveStream = streams.find(s => s.status === 'LIVE');

  useEffect(() => {
    if (setNavAction && liveStream) {
        const isVisited = userProgress.stats?.streamsVisited?.includes(liveStream.id);
        if (!isVisited) {
            setNavAction({
                label: 'ПРИСОЕДИНИТЬСЯ К ЭФИРУ',
                onClick: () => {
                    window.open(liveStream.youtubeUrl, '_blank');
                    handleCheckIn(liveStream.id);
                },
                variant: 'success',
                icon: '🔴'
            });
        }
    }
    return () => { if (setNavAction) setNavAction(null); }
  }, [liveStream, userProgress]);

  const handleCheckIn = (streamId: string) => {
      const result = XPService.visitStream(userProgress, streamId);
      if (result.allowed) {
          onUpdateUser(result.user);
          telegram.haptic('success');
      }
  };

  return (
    <div className="px-4 pt-6 pb-28 max-w-2xl mx-auto space-y-6 animate-fade-in bg-transparent">
        <div>
            <h1 className="text-2xl font-bold text-text-primary">Видеотека</h1>
        </div>

        {/* Search & Categories */}
        <div className="space-y-4">
            <div className="relative">
                <input 
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    placeholder="Поиск видео..."
                    className="w-full bg-body border border-border-color p-3 pl-10 rounded-xl text-sm outline-none focus:border-[#6C5DD3] transition-all"
                />
                <span className="absolute left-4 top-1/2 -translate-y-1/2 opacity-30">🔍</span>
            </div>

            <div className="flex gap-2 overflow-x-auto no-scrollbar pb-2">
                {categories.map(cat => (
                    <button 
                        key={cat.id}
                        onClick={() => { setActiveCategory(cat.id); telegram.haptic('selection'); }}
                        className={`
                            px-4 py-2.5 rounded-xl whitespace-nowrap text-xs font-medium border transition-all flex items-center gap-2
                            ${activeCategory === cat.id ? 'bg-[#6C5DD3] text-white border-[#6C5DD3]' : 'bg-surface text-text-secondary border-border-color'}
                        `}
                    >
                        <span>{cat.icon}</span>
                        {cat.label}
                    </button>
                ))}
            </div>
        </div>

        {/* Video Grid */}
        <div className="grid grid-cols-1 gap-6">
            {filteredStreams.map((stream, i) => (
                <div key={stream.id} className="group bg-card rounded-2xl overflow-hidden border border-border-color shadow-sm transition-all animate-slide-up" style={{ animationDelay: `${i*0.1}s` }}>
                    <div className="relative aspect-video bg-black overflow-hidden">
                        <VideoPlayer 
                            url={stream.youtubeUrl} 
                            width="100%" 
                            height="100%" 
                            light={true}
                            controls
                            playIcon={
                                <div className="w-14 h-14 bg-white/20 backdrop-blur-md rounded-full flex items-center justify-center transition-transform group-hover:scale-110">
                                    <svg className="w-8 h-8 text-white ml-1" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>
                                </div>
                            }
                        />
                        {stream.status === 'LIVE' && (
                            <div className="absolute top-4 left-4 flex items-center gap-2 px-3 py-1 bg-red-600 rounded-lg shadow-lg">
                                <span className="w-2 h-2 bg-white rounded-full animate-pulse"></span>
                                <span className="text-xs font-semibold text-white">В ЭФИРЕ</span>
                            </div>
                        )}
                        <div className="absolute top-4 right-4 px-3 py-1 bg-black/40 backdrop-blur-md rounded-lg text-xs font-medium text-white/70 border border-white/10">
                            {stream.category || 'RECORD'}
                        </div>
                    </div>
                    <div className="p-6">
                        <div className="flex justify-between items-start mb-4">
                            <div>
                                <h3 className="text-sm font-semibold text-text-primary leading-tight group-hover:text-[#6C5DD3] transition-colors">{stream.title}</h3>
                                <p className="text-xs text-text-secondary font-medium mt-1">{new Date(stream.date).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' })}</p>
                            </div>
                            <div className="w-10 h-10 rounded-xl bg-body flex items-center justify-center text-text-secondary border border-border-color">
                                ➔
                            </div>
                        </div>
                    </div>
                </div>
            ))}

            {filteredStreams.length === 0 && (
                <div className="py-20 text-center space-y-4 opacity-40">
                    <span className="text-6xl">📽️</span>
                    <p className="text-sm font-medium text-text-secondary">Видео не найдены</p>
                </div>
            )}
        </div>
    </div>
  );
};
