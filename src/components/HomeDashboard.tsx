
import React, { useMemo } from 'react';
import ReactPlayer from 'react-player';
import { Tab, UserProgress, Lesson, Material, Stream, ArenaScenario, AppNotification, Module, AppConfig } from '../types';
import { ModuleList } from './ModuleList';
import { telegram } from '../services/telegramService';
import { Avatar } from '../utils/avatar';

// Fix for ReactPlayer in Vite
const VideoPlayer = ReactPlayer as unknown as React.ComponentType<any>;

interface HomeDashboardProps {
  onNavigate: (tab: Tab) => void;
  userProgress: UserProgress;
  onProfileClick: () => void;
  modules: Module[];
  materials: Material[];
  streams: Stream[];
  scenarios: ArenaScenario[];
  onSelectLesson: (lesson: Lesson) => void;
  onUpdateUser: (data: Partial<UserProgress>) => void;
  allUsers: UserProgress[];
  notifications?: AppNotification[];
  appConfig?: AppConfig;
}

export const HomeDashboard: React.FC<HomeDashboardProps> = ({
  onNavigate, 
  userProgress, 
  onProfileClick,
  modules,
  onSelectLesson,
  appConfig
}) => {
  const { totalLessons, completedCount, overallProgress } = useMemo(() => {
    const total = modules.reduce((acc, m) => acc + m.lessons.length, 0);
    const completed = userProgress.completedLessonIds.length;
    return { totalLessons: total, completedCount: completed, overallProgress: total > 0 ? Math.round((completed / total) * 100) : 0 };
  }, [modules, userProgress.completedLessonIds]);
  const isAuthenticated = userProgress.isAuthenticated;

  const getGreeting = () => {
      const hour = new Date().getHours();
      if (hour < 5) return 'Ночной дозор';
      if (hour < 12) return 'Доброе утро';
      if (hour < 18) return 'Добрый день';
      return 'Добрый вечер';
  };

  const handleCommandClick = (tab: Tab) => {
      // Allow navigation for everyone (Teaser Mode)
      telegram.haptic('selection');
      onNavigate(tab);
  };

  return (
    <div className="min-h-screen bg-body relative">
      {/* HEADER */}
      <div className="px-4 pt-[calc(var(--safe-top)+12px)] flex justify-between items-center sticky top-0 z-40 pb-3 backdrop-blur-md bg-body/80 border-b border-border-color">
          <div className="flex items-center gap-3" onClick={onProfileClick}>
              <div className="relative cursor-pointer">
                  <Avatar src={userProgress.avatarUrl} name={userProgress.name} className={`border border-border-color ${!isAuthenticated ? 'opacity-60' : ''}`} />
                  {isAuthenticated && <div className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-[#34C759] border-2 border-surface rounded-full"></div>}
              </div>
              <div className="cursor-pointer">
                  <p className="text-text-secondary text-xs font-medium mb-0.5">{getGreeting()}</p>
                  <h1 className="text-base font-semibold text-text-primary leading-none">{userProgress.name}</h1>
              </div>
          </div>
          {!isAuthenticated && (
              <button onClick={onProfileClick} className="px-4 py-2 rounded-xl bg-[#6C5DD3] text-white text-xs font-semibold shadow-sm">
                  Войти
              </button>
          )}
      </div>

      <div className="px-4 pt-4 pb-28 space-y-6 animate-fade-in max-w-4xl mx-auto relative z-10">

        {/* MAIN WIDGET: WELCOME (Unauth) OR PROGRESS (Auth) */}
        {!isAuthenticated ? (
            <div className="bg-card rounded-2xl overflow-hidden shadow-sm border border-border-color animate-slide-up">
                {/* Welcome Video Widget */}
                {appConfig?.welcomeVideoUrl && appConfig.welcomeVideoUrl.length > 5 && (
                    <div className="relative aspect-video w-full bg-black rounded-t-2xl overflow-hidden">
                        <VideoPlayer
                            url={appConfig.welcomeVideoUrl}
                            width="100%"
                            height="100%"
                            light={true}
                            playing={true}
                            playIcon={
                                <div className="w-14 h-14 bg-white/20 backdrop-blur-md rounded-full flex items-center justify-center cursor-pointer">
                                    <svg className="w-6 h-6 text-white ml-1" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>
                                </div>
                            }
                        />
                    </div>
                )}

                <div className="p-4">
                    <h2 className="text-xl font-bold text-text-primary mb-2">Академия Продаж</h2>
                    <p className="text-text-secondary text-sm leading-relaxed mb-4">
                        {appConfig?.welcomeMessage || "Элитная подготовка. Смотрите программу курса ниже, но доступ к материалам откроется после авторизации."}
                    </p>
                    <button
                        onClick={onProfileClick}
                        className="w-full py-3.5 bg-[#6C5DD3] text-white rounded-xl font-semibold text-sm shadow-sm active:scale-[0.98] transition-all flex items-center justify-center gap-2"
                    >
                        <span>Начать</span>
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" /></svg>
                    </button>
                </div>
            </div>
        ) : (
            <div className="bg-card rounded-2xl p-4 shadow-sm border border-border-color animate-slide-up">
                 <div className="flex justify-between items-start mb-6">
                     <div>
                         <p className="text-text-secondary text-xs font-medium mb-1">Прогресс обучения</p>
                         <h2 className="text-3xl font-bold text-text-primary">{overallProgress}<span className="text-xl text-text-secondary">%</span></h2>
                     </div>
                     <div className="text-xs text-text-secondary font-medium bg-body px-3 py-1.5 rounded-lg">
                         {completedCount}/{totalLessons}
                     </div>
                 </div>

                 <div className="w-full bg-body rounded-full h-1.5 mb-5">
                     <div
                        className="bg-[#6C5DD3] h-full rounded-full transition-all duration-700"
                        style={{ width: `${overallProgress}%` }}
                     ></div>
                 </div>

                 <button
                    onClick={() => {
                        const firstIncomplete = modules.flatMap(m => m.lessons).find(l => !userProgress.completedLessonIds.includes(l.id));
                        if(firstIncomplete) {
                            onSelectLesson(firstIncomplete);
                        } else if (modules[0]?.lessons[0]) {
                            onSelectLesson(modules[0].lessons[0]);
                        }
                    }}
                    className="w-full py-3.5 bg-[#6C5DD3] text-white rounded-xl font-semibold text-sm shadow-sm active:scale-[0.98] transition-all flex items-center justify-center gap-2"
                 >
                     <span>Продолжить</span>
                     <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" /></svg>
                 </button>
            </div>
        )}

        {/* COMMAND PANELS (GRID) */}
        <div>
            <div className="flex justify-between items-center mb-3 px-1">
                <h3 className="text-base font-semibold text-text-primary">Разделы</h3>
            </div>
            <div className="grid grid-cols-2 gap-3">
                {[
                    { id: Tab.ARENA, title: 'Арена', icon: '⚔️', desc: 'Симуляции' },
                    { id: Tab.HABITS, title: 'Трекер', icon: '🔥', desc: 'Дисциплина' },
                    { id: Tab.STREAMS, title: 'Эфиры', icon: '📹', desc: 'Записи' },
                    { id: Tab.NOTEBOOK, title: 'Блокнот', icon: '📝', desc: 'Заметки' },
                ].map((item) => (
                    <button
                        key={item.id}
                        onClick={() => handleCommandClick(item.id)}
                        className="bg-card p-4 rounded-2xl text-left border border-border-color transition-all active:scale-95 shadow-sm"
                    >
                        {!isAuthenticated && (
                            <div className="absolute top-3 right-3 z-20">
                                <span className="text-xs font-medium text-text-secondary opacity-50">Demo</span>
                            </div>
                        )}
                        <div className="flex flex-col justify-between min-h-[80px]">
                            <div className="w-10 h-10 rounded-xl bg-body flex items-center justify-center text-xl">
                                {item.icon}
                            </div>
                            <div className="mt-3">
                                <h4 className="font-semibold text-text-primary text-sm">{item.title}</h4>
                                <p className="text-xs text-text-secondary mt-0.5">{item.desc}</p>
                            </div>
                        </div>
                    </button>
                ))}
            </div>
        </div>

        {/* MODULES LIST */}
        <div className="space-y-3">
             <div className="flex justify-between items-center px-1">
                <h3 className="text-base font-semibold text-text-primary">Программа</h3>
                {modules.length > 0 && (
                    <button
                        onClick={() => { telegram.haptic('selection'); onNavigate(Tab.MODULES); }}
                        className="text-xs font-medium text-[#6C5DD3] flex items-center gap-1 active:scale-95 py-2 px-1"
                    >
                        Все модули
                        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                    </button>
                )}
             </div>
             <ModuleList modules={modules} userProgress={userProgress} onSelectLesson={onSelectLesson} onBack={() => {}} />
        </div>
      </div>
    </div>
  );
};
