
import React, { useState } from 'react';
import { Tab, UserProgress, Lesson, Material, Stream, ArenaScenario, AppNotification } from '../types';
import { ModuleList } from './ModuleList';
import { telegram } from '../services/telegramService';

interface HomeDashboardProps {
  onNavigate: (tab: Tab) => void;
  userProgress: UserProgress;
  onProfileClick: () => void;
  modules: any[];
  materials: Material[];
  streams: Stream[];
  scenarios: ArenaScenario[];
  onSelectLesson: (lesson: Lesson) => void;
  onUpdateUser: (data: Partial<UserProgress>) => void;
  allUsers: UserProgress[];
  notifications?: AppNotification[];
}

export const HomeDashboard: React.FC<HomeDashboardProps> = ({ 
  onNavigate, 
  userProgress, 
  onProfileClick,
  modules,
  onSelectLesson,
  notifications = []
}) => {
  const [activeCategory, setActiveCategory] = useState<'ALL' | 'SALES' | 'PSYCHOLOGY' | 'TACTICS'>('ALL');
  const [showNotifications, setShowNotifications] = useState(false);

  // Calculate overall course progress
  const totalLessons = modules.reduce((acc, m) => acc + m.lessons.length, 0);
  const completedCount = userProgress.completedLessonIds.length;
  const overallProgress = totalLessons > 0 ? Math.round((completedCount / totalLessons) * 100) : 0;

  const filteredModules = activeCategory === 'ALL' 
    ? modules 
    : modules.filter(m => m.category === activeCategory);

  const categories = [
    { id: 'ALL', label: 'Все', icon: '💠' },
    { id: 'SALES', label: 'Продажи', icon: '💰' },
    { id: 'PSYCHOLOGY', label: 'Психология', icon: '🧠' },
    { id: 'TACTICS', label: 'Тактика', icon: '⚔️' }
  ] as const;

  const handleNotificationsToggle = () => {
      setShowNotifications(!showNotifications);
      telegram.haptic('light');
  };

  return (
    <div className="min-h-screen bg-body transition-colors duration-300">
      {/* HEADER */}
      <div className="px-6 pt-[calc(var(--safe-top)+10px)] flex justify-between items-center bg-body/80 backdrop-blur-xl sticky top-0 z-40 pb-4 border-b border-border-color">
          <div className="flex items-center gap-3" onClick={onProfileClick}>
              <div className="relative group cursor-pointer">
                  <div className="absolute -inset-1 bg-gradient-to-r from-[#6C5DD3] to-[#FFAB7B] rounded-full blur opacity-40 group-hover:opacity-100 transition duration-1000 group-hover:duration-200"></div>
                  <img 
                    src={userProgress.avatarUrl || `https://ui-avatars.com/api/?name=${userProgress.name}`} 
                    className="relative w-11 h-11 rounded-full object-cover border-2 border-surface shadow-xl" 
                  />
                  <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-500 border-2 border-surface rounded-full shadow-sm"></div>
              </div>
              <div className="cursor-pointer">
                  <p className="text-text-secondary text-[9px] font-black uppercase tracking-[0.15em]">Боец №{userProgress.telegramId?.slice(-4) || '300'}</p>
                  <h1 className="text-lg font-black text-text-primary leading-none tracking-tight">{userProgress.name || 'Новобранец'}</h1>
              </div>
          </div>
          
          <div className="relative">
              <button 
                onClick={handleNotificationsToggle}
                className="w-10 h-10 rounded-2xl bg-surface border border-border-color flex items-center justify-center text-text-primary shadow-sm hover:scale-105 active:scale-95 transition-all relative overflow-hidden group"
              >
                  <div className="absolute inset-0 bg-[#6C5DD3]/5 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                  <span className="text-xl relative z-10">🔔</span>
                  {notifications.length > 0 && <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full animate-pulse"></span>}
              </button>

              {/* Notification Popup */}
              {showNotifications && (
                  <>
                      <div className="fixed inset-0 z-40 bg-black/20 backdrop-blur-sm" onClick={() => setShowNotifications(false)}></div>
                      <div className="absolute right-0 top-12 z-50 w-80 bg-surface border border-border-color rounded-2xl shadow-2xl p-4 animate-scale-in origin-top-right">
                          <h3 className="text-xs font-black uppercase tracking-widest text-text-secondary mb-3">Оповещения ({notifications.length})</h3>
                          <div className="max-h-60 overflow-y-auto custom-scrollbar space-y-2">
                              {notifications.length === 0 ? (
                                  <p className="text-xs text-text-secondary text-center py-4">Тишина в эфире...</p>
                              ) : (
                                  notifications.map(n => (
                                      <div key={n.id} className={`p-3 rounded-xl border flex flex-col gap-1 ${
                                          n.type === 'ALERT' ? 'bg-red-500/10 border-red-500/20' : 
                                          n.type === 'SUCCESS' ? 'bg-green-500/10 border-green-500/20' : 
                                          'bg-body border-border-color'
                                      }`}>
                                          <div className="flex justify-between items-start">
                                              <span className={`text-[10px] font-black uppercase tracking-wide ${
                                                  n.type === 'ALERT' ? 'text-red-500' : 
                                                  n.type === 'SUCCESS' ? 'text-green-500' : 'text-[#6C5DD3]'
                                              }`}>{n.type}</span>
                                              <span className="text-[9px] text-text-secondary">{new Date(n.date).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                                          </div>
                                          <h4 className="text-xs font-bold text-text-primary">{n.title}</h4>
                                          <p className="text-[10px] text-text-secondary leading-snug">{n.message}</p>
                                      </div>
                                  ))
                              )}
                          </div>
                      </div>
                  </>
              )}
          </div>
      </div>

      <div className="px-5 pt-6 pb-32 space-y-7 animate-fade-in max-w-2xl mx-auto">
        
        {/* COMMAND CENTER (HERO) */}
        <div className="relative group">
            <div className="absolute -inset-0.5 bg-gradient-to-r from-[#6C5DD3] to-[#4A3D8D] rounded-[2.5rem] blur opacity-20 group-hover:opacity-30 transition duration-1000"></div>
            <div className="relative bg-[#14161B] rounded-[2.5rem] p-7 text-white overflow-hidden shadow-2xl border border-white/5">
                {/* Visual accents */}
                <div className="absolute top-0 right-0 w-48 h-48 bg-[#6C5DD3] rounded-full blur-[80px] opacity-10 -mr-20 -mt-20"></div>
                
                <div className="relative z-10">
                    <div className="flex justify-between items-start mb-8">
                        <div>
                            <span className="inline-block px-3 py-1 bg-white/5 border border-white/10 rounded-full text-[9px] font-black uppercase tracking-widest text-[#6C5DD3] mb-3">Командный Центр</span>
                            <h2 className="text-3xl font-black leading-[0.9] tracking-tighter">ШТУРМ <br/><span className="text-white/40">ВЕРШИНЫ</span></h2>
                        </div>
                        <div className="text-right">
                             <div className="text-4xl font-black">{overallProgress}%</div>
                             <div className="text-[9px] font-black text-white/30 uppercase tracking-widest">Курс пройден</div>
                        </div>
                    </div>

                    <div className="flex items-center gap-4">
                        <button 
                            onClick={() => {
                                const firstIncomplete = modules.flatMap(m => m.lessons).find(l => !userProgress.completedLessonIds.includes(l.id));
                                if(firstIncomplete) onSelectLesson(firstIncomplete);
                            }}
                            className="flex-1 flex items-center justify-center gap-3 bg-white text-black py-4 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-slate-200 transition-all active:scale-[0.97] shadow-xl"
                        >
                            В БОЙ
                        </button>
                        <div className="w-14 h-14 bg-white/5 border border-white/10 rounded-2xl flex items-center justify-center text-2xl">
                            ⚔️
                        </div>
                    </div>
                </div>
                
                {/* Tiny Progress Bar at the bottom */}
                <div className="absolute bottom-0 left-0 right-0 h-1.5 bg-white/5">
                    <div className="h-full bg-[#6C5DD3] transition-all duration-1000 ease-out" style={{ width: `${overallProgress}%` }}></div>
                </div>
            </div>
        </div>

        {/* TRAINING GROUND GRID */}
        <div>
            <div className="flex justify-between items-center mb-4 px-1">
                <h3 className="text-lg font-black text-text-primary uppercase tracking-tight">Полигон</h3>
                <span className="text-[10px] font-bold text-[#6C5DD3] uppercase">Тренировки</span>
            </div>
            <div className="grid grid-cols-2 gap-4">
                {[
                    { id: Tab.ARENA, title: 'АРЕНА', icon: '⚔️', color: 'bg-red-500', desc: 'Симуляции' },
                    { id: Tab.MATERIALS, title: 'БАЗА', icon: '📚', color: 'bg-blue-500', desc: 'Знания' },
                    { id: Tab.STREAMS, title: 'ЭФИРЫ', icon: '📹', color: 'bg-purple-500', desc: 'Записи' },
                    { id: Tab.NOTEBOOK, title: 'БЛОКНОТ', icon: '📝', color: 'bg-green-500', desc: 'Заметки' },
                ].map((item) => (
                    <button 
                        key={item.id}
                        onClick={() => onNavigate(item.id)}
                        className="bg-surface dark:bg-[#1F2128] p-5 rounded-[2rem] text-left border border-border-color shadow-sm hover:shadow-lg transition-all active:scale-95 group relative overflow-hidden"
                    >
                        <div className={`w-10 h-10 rounded-2xl ${item.color} bg-opacity-10 flex items-center justify-center text-xl mb-3 group-hover:scale-110 transition-transform`}>
                            {item.icon}
                        </div>
                        <h4 className="font-black text-text-primary text-sm tracking-tight">{item.title}</h4>
                        <p className="text-[8px] text-text-secondary font-black uppercase mt-0.5 tracking-wider">{item.desc}</p>
                    </button>
                ))}
            </div>
        </div>

        {/* MODULE LIST SECTION */}
        <div className="space-y-4">
             <div className="flex flex-col gap-4 px-1">
                 <div className="flex justify-between items-end">
                    <h3 className="text-lg font-black text-text-primary uppercase tracking-tight">Учебный план</h3>
                    <span className="text-[10px] font-bold text-text-secondary bg-surface px-2 py-1 rounded-lg border border-border-color">
                        {filteredModules.length} доступно
                    </span>
                 </div>
                 
                 <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1 -mx-5 px-5 md:mx-0 md:px-0">
                    {categories.map(cat => (
                        <button 
                            key={cat.id}
                            onClick={() => setActiveCategory(cat.id as any)}
                            className={`
                                flex items-center gap-2 px-4 py-3 rounded-2xl text-[10px] font-black uppercase whitespace-nowrap transition-all border flex-shrink-0
                                ${activeCategory === cat.id 
                                    ? 'bg-[#6C5DD3] text-white border-[#6C5DD3] shadow-lg shadow-[#6C5DD3]/20 scale-105' 
                                    : 'bg-surface text-text-secondary border-border-color hover:bg-body hover:border-[#6C5DD3]/30'}
                            `}
                        >
                            <span className="text-base leading-none">{cat.icon}</span>
                            <span>{cat.label}</span>
                        </button>
                    ))}
                 </div>
             </div>
             <ModuleList modules={filteredModules} userProgress={userProgress} onSelectLesson={onSelectLesson} onBack={() => {}} />
        </div>
      </div>
    </div>
  );
};
