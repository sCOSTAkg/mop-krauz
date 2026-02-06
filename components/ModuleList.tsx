
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
  const [transitioningId, setTransitioningId] = useState<string | null>(null);

  const getCategoryConfig = (category: string) => {
    switch (category) {
      case 'SALES': return { icon: '💰', color: '#00B050' };
      case 'PSYCHOLOGY': return { icon: '🧠', color: '#6C5DD3' };
      case 'TACTICS': return { icon: '⚔️', color: '#FF4B4B' };
      default: return { icon: '🎓', color: '#94A3B8' };
    }
  };

  const handleModuleClick = (module: Module, isLocked: boolean) => {
    if (isLocked) {
        setShakingId(module.id);
        telegram.haptic('error');
        setTimeout(() => setShakingId(null), 400);
        return;
    }
    
    // Start transition animation
    setTransitioningId(module.id);
    telegram.haptic('medium');

    const nextLesson = module.lessons.find(l => !userProgress.completedLessonIds.includes(l.id)) || module.lessons[0];
    
    // Delay navigation to show animation
    if (nextLesson) {
        setTimeout(() => {
            onSelectLesson(nextLesson);
        }, 500);
    }
  };

  return (
    <div className="space-y-4">
        {modules.map((module, index) => {
            const isLocked = userProgress.level < module.minLevel;
            const completedCount = module.lessons.filter(l => userProgress.completedLessonIds.includes(l.id)).length;
            const totalCount = module.lessons.length;
            const progressPercent = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;
            
            const cat = getCategoryConfig(module.category);
            
            const isSelected = transitioningId === module.id;
            const isOthers = transitioningId !== null && transitioningId !== module.id;

            return (
                <div 
                    key={module.id}
                    onClick={() => !transitioningId && handleModuleClick(module, isLocked)}
                    className={`
                        relative w-full rounded-[1.5rem] p-5 transition-all duration-500 ease-out group
                        flex items-center gap-4 cursor-pointer overflow-hidden border
                        ${shakingId === module.id ? 'animate-shake' : ''}
                        
                        ${/* Base Styles */ ''}
                        ${isLocked 
                            ? 'opacity-50 grayscale bg-surface/50 border-border-color' 
                            : 'bg-surface border-border-color shadow-sm'}
                        
                        ${/* Hover Effects (Only if not transitioning) */ ''}
                        ${!isLocked && !transitioningId ? 'hover:scale-[1.01] active:scale-[0.98] hover:shadow-[0_0_20px_rgba(212,175,55,0.3)] hover:border-[#D4AF37]/50' : ''}
                        
                        ${/* Active Selection Animation */ ''}
                        ${isSelected ? '!scale-105 !border-[#6C5DD3] !shadow-[0_0_50px_rgba(108,93,211,0.5)] z-20 ring-1 ring-[#6C5DD3]/50' : ''}
                        
                        ${/* Fade out others */ ''}
                        ${isOthers ? 'opacity-30 scale-95 blur-[2px] grayscale' : ''}
                    `}
                    style={{ animationDelay: `${index * 0.05}s` }}
                >   
                    {/* Icon Container */}
                    <div className={`
                        w-14 h-14 rounded-2xl flex-shrink-0 flex items-center justify-center text-2xl relative overflow-hidden border border-border-color transition-colors duration-500
                        ${isSelected ? 'bg-[#6C5DD3] text-white border-transparent' : 'bg-body'}
                    `}>
                        <div className={`absolute inset-0 opacity-10 transition-opacity ${isSelected ? 'opacity-0' : 'opacity-10'}`} style={{ backgroundColor: cat.color }}></div>
                        <span className="relative z-10">{isLocked ? '🔒' : cat.icon}</span>
                    </div>

                    <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-1">
                             <span className={`text-[8px] font-black uppercase tracking-widest transition-colors ${isSelected ? 'text-[#6C5DD3]' : 'text-text-secondary'}`}>
                                 Модуль {index + 1} • {module.lessons.length} уроков
                             </span>
                             {isLocked && <span className="text-[8px] font-black bg-body px-1.5 py-0.5 rounded text-text-secondary border border-border-color">Lvl {module.minLevel}</span>}
                        </div>
                        <h3 className={`text-sm font-black leading-tight truncate pr-4 transition-colors ${isSelected ? 'text-[#6C5DD3]' : 'text-text-primary'}`}>
                            {module.title}
                        </h3>
                        
                        {/* Progress Bar */}
                        {!isLocked && (
                          <div className="mt-2 flex items-center gap-2">
                              <div className="h-1 flex-1 bg-body rounded-full overflow-hidden">
                                  <div 
                                      className="h-full rounded-full transition-all duration-700" 
                                      style={{ width: `${progressPercent}%`, backgroundColor: isSelected ? '#6C5DD3' : cat.color }}
                                  ></div>
                              </div>
                              <span className="text-[8px] font-black text-text-secondary">{progressPercent}%</span>
                          </div>
                        )}
                    </div>

                    {/* Simple Chevron */}
                    <div className={`transition-all duration-300 ${isSelected ? 'translate-x-1 text-[#6C5DD3]' : 'text-text-secondary/30 group-hover:text-text-primary'}`}>
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M9 5l7 7-7 7" />
                        </svg>
                    </div>
                </div>
            );
        })}
    </div>
  );
};
