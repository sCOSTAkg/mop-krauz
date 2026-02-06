
import React, { useState } from 'react';
import { Module, UserProgress, Lesson } from '../types';
import { telegram } from '../services/telegramService';

interface ModuleListProps {
  modules: Module[];
  userProgress: UserProgress;
  onSelectLesson: (lesson: Lesson) => void;
  onBack: () => void;
}

export const ModuleList: React.FC<ModuleListProps> = ({ modules, userProgress, onSelectLesson }) => {
  const [shakingId, setShakingId] = useState<string | null>(null);

  const handleModuleClick = (module: Module, isLocked: boolean) => {
    if (isLocked) {
        setShakingId(module.id);
        telegram.haptic('error');
        setTimeout(() => setShakingId(null), 400);
        return;
    }
    
    telegram.haptic('medium');
    const nextLesson = module.lessons.find(l => !userProgress.completedLessonIds.includes(l.id)) || module.lessons[0];
    if (nextLesson) onSelectLesson(nextLesson);
  };

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 pb-8">
        {modules.map((module, index) => {
            const isLocked = userProgress.level < module.minLevel;
            const completedCount = module.lessons.filter(l => userProgress.completedLessonIds.includes(l.id)).length;
            const totalCount = module.lessons.length;
            const progressPercent = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;
            
            // Refined Palette for Dark Mode
            const accentColor = module.category === 'SALES' ? '#10B981' : // Emerald
                                module.category === 'PSYCHOLOGY' ? '#8B5CF6' : // Violet
                                module.category === 'TACTICS' ? '#F43F5E' : // Rose
                                '#6C5DD3'; // Default Purple

            const moduleNum = (index + 1).toString().padStart(2, '0');

            return (
                <div 
                    key={module.id}
                    onClick={() => handleModuleClick(module, isLocked)}
                    className={`
                        relative w-full rounded-[2rem] overflow-hidden transition-all duration-300 group select-none min-h-[140px]
                        ${shakingId === module.id ? 'animate-shake' : ''}
                        ${isLocked ? 'opacity-60 saturate-0' : 'cursor-pointer hover:scale-[1.02] active:scale-[0.98]'}
                    `}
                    style={{ 
                        background: isLocked 
                            ? '#16181D' 
                            : `linear-gradient(145deg, #16181D 0%, #0F1115 100%)`,
                        boxShadow: isLocked ? 'none' : `0 10px 40px -10px ${accentColor}15`,
                        border: '1px solid rgba(255,255,255,0.06)'
                    }}
                >
                    {/* Background Mesh Gradient */}
                    {!isLocked && (
                        <div className="absolute top-0 right-0 w-32 h-32 rounded-full blur-[60px] opacity-20 transition-opacity duration-500 group-hover:opacity-30" style={{ backgroundColor: accentColor }}></div>
                    )}

                    {/* Progress Bar Line (Top) */}
                    <div className="absolute top-0 left-0 w-full h-[2px] bg-white/5">
                        <div className="h-full transition-all duration-1000 ease-out shadow-[0_0_10px_currentColor]" style={{ width: `${progressPercent}%`, backgroundColor: accentColor, color: accentColor }}></div>
                    </div>

                    <div className="relative z-10 p-6 flex flex-col h-full justify-between">
                        
                        <div className="flex justify-between items-start">
                            <div className="flex-1 pr-4">
                                <span className={`text-[9px] font-black uppercase tracking-[0.2em] mb-2 block`} style={{ color: isLocked ? '#555' : accentColor }}>
                                    {module.category}
                                </span>
                                <h3 className={`text-lg font-black leading-tight line-clamp-2 ${isLocked ? 'text-slate-500' : 'text-white group-hover:text-transparent group-hover:bg-clip-text group-hover:bg-gradient-to-r group-hover:from-white group-hover:to-white/70'} transition-all`}>
                                    {module.title}
                                </h3>
                            </div>
                            <h2 className="text-4xl font-black text-white/5 leading-none tracking-tighter absolute right-4 top-4 select-none">
                                {moduleNum}
                            </h2>
                        </div>

                        <div className="mt-4 flex items-end justify-between">
                             <div className="flex items-center gap-2">
                                <div className="flex -space-x-2 overflow-hidden">
                                    {[...Array(Math.min(3, module.lessons.length))].map((_, i) => (
                                        <div key={i} className={`w-2 h-2 rounded-full ring-2 ring-[#16181D] ${i < completedCount ? 'bg-white' : 'bg-white/10'}`}></div>
                                    ))}
                                    {module.lessons.length > 3 && <div className="w-2 h-2 rounded-full bg-white/10 ring-2 ring-[#16181D]"></div>}
                                </div>
                                <span className="text-[9px] font-bold text-white/30 uppercase tracking-wide">
                                    {completedCount}/{totalCount}
                                </span>
                             </div>
                             
                             <div className={`w-8 h-8 rounded-full flex items-center justify-center border transition-colors ${
                                 isLocked ? 'border-white/5 text-white/20' : 'border-white/10 text-white group-hover:bg-white group-hover:text-black group-hover:border-transparent'
                             }`}>
                                 {isLocked ? (
                                     <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
                                 ) : (
                                     <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M14 5l7 7m0 0l-7 7m7-7H3" /></svg>
                                 )}
                             </div>
                        </div>
                    </div>
                </div>
            );
        })}
    </div>
  );
};
