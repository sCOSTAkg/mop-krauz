
import React from 'react';
import { Tab, UserProgress, Lesson, Material, Stream, ArenaScenario, AppNotification, Module } from '../types';
import { ModuleList } from './ModuleList';
import { telegram } from '../services/telegramService';

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
}

export const HomeDashboard: React.FC<HomeDashboardProps> = ({ 
  onNavigate, 
  userProgress, 
  onProfileClick,
  modules,
  onSelectLesson
}) => {
  // Calculate overall course progress
  const totalLessons = modules.reduce((acc, m) => acc + m.lessons.length, 0);
  const completedCount = userProgress.completedLessonIds.length;
  const overallProgress = totalLessons > 0 ? Math.round((completedCount / totalLessons) * 100) : 0;

  const getGreeting = () => {
      const hour = new Date().getHours();
      if (hour < 5) return 'Ночной дозор';
      if (hour < 12) return 'Доброе утро';
      if (hour < 18) return 'Добрый день';
      return 'Добрый вечер';
  };

  return (
    <div className="min-h-screen bg-body transition-colors duration-300">
      {/* BACKGROUND DECORATION */}
      <div className="fixed top-0 left-0 w-full h-[50vh] bg-gradient-to-b from-[#6C5DD3]/5 to-transparent pointer-events-none"></div>

      {/* HEADER */}
      <div className="px-6 pt-[calc(var(--safe-top)+16px)] flex justify-between items-center sticky top-0 z-40 pb-4 backdrop-blur-xl bg-body/80 border-b border-transparent transition-all">
          <div className="flex items-center gap-4" onClick={onProfileClick}>
              <div className="relative group cursor-pointer">
                  <div className="absolute -inset-0.5 bg-gradient-to-tr from-[#6C5DD3] to-[#FFAB7B] rounded-full opacity-60 group-hover:opacity-100 transition duration-300 blur-sm"></div>
                  <img 
                    src={userProgress.avatarUrl || `https://ui-avatars.com/api/?name=${userProgress.name}`} 
                    className="relative w-10 h-10 rounded-full object-cover border border-surface shadow-lg" 
                  />
                  <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-surface rounded-full"></div>
              </div>
              <div className="cursor-pointer">
                  <p className="text-text-secondary text-[10px] font-black uppercase tracking-widest mb-0.5">{getGreeting()}</p>
                  <h1 className="text-base font-black text-text-primary leading-none tracking-tight">{userProgress.name}</h1>
              </div>
          </div>
          
          {/* Right side is now empty, SmartNav handles notifications */}
      </div>

      <div className="px-6 pt-4 pb-36 space-y-8 animate-fade-in max-w-4xl mx-auto">
        
        {/* MAIN PROGRESS WIDGET */}
        <div className="relative bg-[#16181D] rounded-[2.5rem] p-6 shadow-xl border border-white/5 overflow-hidden group">
             {/* Dynamic background glow */}
             <div className="absolute top-0 right-0 w-64 h-64 bg-[#6C5DD3]/10 rounded-full blur-[60px] -mr-16 -mt-16 group-hover:bg-[#6C5DD3]/15 transition-colors duration-500"></div>
             
             <div className="flex justify-between items-start mb-8 relative z-10">
                 <div>
                     <div className="flex items-center gap-2 mb-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-[#00B050] animate-pulse"></span>
                        <span className="text-slate-400 text-[9px] font-black uppercase tracking-[0.2em]">Статус обучения</span>
                     </div>
                     <h2 className="text-4xl font-black text-white tracking-tight">{overallProgress}<span className="text-2xl text-white/30">%</span></h2>
                 </div>
                 <div className="w-12 h-12 rounded-2xl bg-white/5 flex items-center justify-center text-2xl border border-white/10 shadow-inner text-[#6C5DD3]">
                     🛡️
                 </div>
             </div>

             <div className="relative w-full bg-white/5 rounded-full h-3 mb-6 overflow-hidden border border-white/5">
                 <div className="absolute inset-0 w-full h-full bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-20"></div>
                 <div 
                    className="bg-gradient-to-r from-[#6C5DD3] to-[#A090FF] h-full rounded-full transition-all duration-1000 relative" 
                    style={{ width: `${overallProgress}%` }}
                 >
                     <div className="absolute top-0 left-0 w-full h-full bg-white/30 animate-[shimmer_2s_infinite]"></div>
                 </div>
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
                className="w-full py-4 bg-white text-black rounded-2xl font-black uppercase text-xs tracking-[0.15em] shadow-lg hover:shadow-xl hover:scale-[1.01] active:scale-[0.98] transition-all flex items-center justify-center gap-2"
             >
                 <span>Продолжить</span>
                 <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" /></svg>
             </button>
        </div>

        {/* COMMAND PANELS (GRID) */}
        <div>
            <div className="flex justify-between items-center mb-4 px-1">
                <h3 className="text-sm font-black text-text-primary uppercase tracking-widest">Командный Пункт</h3>
            </div>
            <div className="grid grid-cols-2 gap-4">
                {[
                    { id: Tab.ARENA, title: 'АРЕНА', icon: '⚔️', color: 'from-red-500/20 to-red-600/5', border: 'border-red-500/20', text: 'text-red-500', desc: 'Симуляции' },
                    { id: Tab.MATERIALS, title: 'БАЗА', icon: '📚', color: 'from-blue-500/20 to-blue-600/5', border: 'border-blue-500/20', text: 'text-blue-500', desc: 'Знания' },
                    { id: Tab.STREAMS, title: 'ЭФИРЫ', icon: '📹', color: 'from-purple-500/20 to-purple-600/5', border: 'border-purple-500/20', text: 'text-purple-500', desc: 'Записи' },
                    { id: Tab.NOTEBOOK, title: 'БЛОКНОТ', icon: '📝', color: 'from-green-500/20 to-green-600/5', border: 'border-green-500/20', text: 'text-green-500', desc: 'Заметки' },
                ].map((item) => (
                    <button 
                        key={item.id}
                        onClick={() => { telegram.haptic('selection'); onNavigate(item.id); }}
                        className={`
                            relative bg-surface p-5 rounded-[2rem] text-left border ${item.border} 
                            hover:border-opacity-50 transition-all active:scale-95 group overflow-hidden shadow-sm
                        `}
                    >
                        <div className={`absolute inset-0 bg-gradient-to-br ${item.color} opacity-0 group-hover:opacity-100 transition-opacity duration-500`}></div>
                        
                        <div className="relative z-10 flex flex-col h-full justify-between min-h-[90px]">
                            <div className="flex justify-between items-start">
                                <div className={`w-10 h-10 rounded-2xl bg-body flex items-center justify-center text-xl shadow-inner ${item.text}`}>
                                    {item.icon}
                                </div>
                                <span className="opacity-0 group-hover:opacity-100 transition-opacity text-[10px] text-text-secondary">↗</span>
                            </div>
                            <div>
                                <h4 className="font-black text-text-primary text-sm tracking-wide">{item.title}</h4>
                                <p className="text-[9px] text-text-secondary font-bold uppercase tracking-wider opacity-60">{item.desc}</p>
                            </div>
                        </div>
                    </button>
                ))}
            </div>
        </div>

        {/* MODULES LIST */}
        <div className="space-y-4">
             <div className="flex flex-col gap-4 px-1">
                 <div className="flex justify-between items-end">
                    <h3 className="text-sm font-black text-text-primary uppercase tracking-widest">Программа</h3>
                    <span className="text-[9px] font-bold text-text-secondary bg-surface px-2 py-1 rounded-lg border border-border-color">
                        {modules.length} modules
                    </span>
                 </div>
             </div>
             <ModuleList modules={modules} userProgress={userProgress} onSelectLesson={onSelectLesson} onBack={() => {}} />
        </div>
      </div>
    </div>
  );
};
