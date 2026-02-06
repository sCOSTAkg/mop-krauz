
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
  const isAuthenticated = userProgress.isAuthenticated;

  const handleModuleClick = (module: Module, isLocked: boolean) => {
    // If user is not authenticated, EVERYTHING is locked
    if (!isAuthenticated) {
        setShakingId(module.id);
        telegram.haptic('error');
        telegram.showAlert('Доступ закрыт. Пожалуйста, авторизуйтесь.', 'Security');
        setTimeout(() => setShakingId(null), 400);
        return;
    }

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
    <div className="grid grid-cols-1 gap-3 pb-24 sm:grid-cols-2 lg:grid-cols-3">
        {modules.map((module) => {
            const isLevelLocked = userProgress.level < module.minLevel;
            // Locked if level is too low OR if not authenticated
            const isLocked = isLevelLocked || !isAuthenticated;
            
            const completedCount = module.lessons.filter(l => userProgress.completedLessonIds.includes(l.id)).length;
            const totalCount = module.lessons.length;
            const progressPercent = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;
            const isCompleted = progressPercent === 100;
            
            // Visual Config based on Category
            const getConfig = (cat: string) => {
                switch(cat) {
                    case 'SALES': return { 
                        bg: 'from-emerald-900/80 to-emerald-950/90',
                        border: 'border-emerald-500/30',
                        accent: '#10B981', 
                        glow: 'group-hover:shadow-[0_0_30px_-5px_rgba(16,185,129,0.3)]',
                        icon: '💰'
                    };
                    case 'PSYCHOLOGY': return { 
                        bg: 'from-violet-900/80 to-violet-950/90',
                        border: 'border-violet-500/30',
                        accent: '#8B5CF6', 
                        glow: 'group-hover:shadow-[0_0_30px_-5px_rgba(139,92,246,0.3)]',
                        icon: '🧠' 
                    };
                    case 'TACTICS': return { 
                        bg: 'from-rose-900/80 to-rose-950/90',
                        border: 'border-rose-500/30',
                        accent: '#F43F5E', 
                        glow: 'group-hover:shadow-[0_0_30px_-5px_rgba(244,63,94,0.3)]',
                        icon: '⚔️' 
                    };
                    default: return { 
                        bg: 'from-indigo-900/80 to-indigo-950/90',
                        border: 'border-indigo-500/30',
                        accent: '#6366f1', 
                        glow: 'group-hover:shadow-[0_0_30px_-5px_rgba(99,102,241,0.3)]',
                        icon: '🛡️' 
                    };
                }
            };

            const style = getConfig(module.category);
            
            // Dynamic classes
            const baseClasses = "relative w-full rounded-[1.25rem] overflow-hidden transition-all duration-300 border flex flex-col justify-between group active:scale-[0.98] backdrop-blur-md shadow-lg";
            
            // If not authenticated, force a specific "Security Lock" look
            let stateClasses = '';
            if (!isAuthenticated) {
                stateClasses = 'opacity-70 bg-[#121418] border-white/5 grayscale';
            } else if (isLevelLocked) {
                stateClasses = 'opacity-80 bg-[#121418] border-white/5';
            } else {
                stateClasses = `bg-gradient-to-br ${style.bg} ${style.border} ${style.glow} hover:-translate-y-1`;
            }

            return (
                <div 
                    key={module.id}
                    onClick={() => handleModuleClick(module, isLocked)}
                    className={`${baseClasses} ${stateClasses} ${shakingId === module.id ? 'animate-shake' : ''}`}
                >
                    {/* Locked Overlay / Pattern */}
                    {isLocked && <div className="absolute inset-0 bg-[repeating-linear-gradient(45deg,transparent,transparent_10px,rgba(0,0,0,0.2)_10px,rgba(0,0,0,0.2)_20px)] pointer-events-none"></div>}
                    {!isLocked && <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-[0.07] pointer-events-none"></div>}
                    
                    {/* Unauth Security Overlay */}
                    {!isAuthenticated && (
                        <div className="absolute inset-0 flex items-center justify-center z-20 pointer-events-none">
                            <div className="bg-black/80 backdrop-blur-sm border border-white/10 rounded-xl px-4 py-2 flex items-center gap-2">
                                <span className="text-lg">🔒</span>
                                <span className="text-[9px] font-black uppercase text-white tracking-widest">Locked</span>
                            </div>
                        </div>
                    )}

                    <div className="p-4 flex flex-col h-full relative z-10">
                        
                        {/* Header: Category & Status */}
                        <div className="flex justify-between items-center mb-3">
                            <div className="flex items-center gap-2">
                                <span className="text-lg leading-none filter drop-shadow-md grayscale-[0.2] group-hover:grayscale-0 transition-all">{style.icon}</span>
                                <span 
                                    className="text-[9px] font-black uppercase tracking-[0.15em]"
                                    style={{ color: isLocked ? '#64748B' : style.accent }}
                                >
                                    {module.category}
                                </span>
                            </div>
                            
                            {/* Status Icon */}
                            <div>
                                 {isLocked ? (
                                     <div className="w-6 h-6 rounded-full bg-black/40 border border-white/5 flex items-center justify-center">
                                        <svg className="w-3 h-3 text-white/20" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
                                     </div>
                                 ) : isCompleted ? (
                                     <div className="w-6 h-6 rounded-full bg-[#00B050]/20 border border-[#00B050]/50 flex items-center justify-center shadow-[0_0_10px_rgba(0,176,80,0.3)]">
                                        <span className="text-[#00B050] font-black text-[9px]">✓</span>
                                     </div>
                                 ) : (
                                     <div className="w-6 h-6 rounded-full border border-white/10 flex items-center justify-center bg-white/5 group-hover:bg-white/10 transition-colors">
                                        <svg className="w-3 h-3 text-white/60 group-hover:text-white transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" /></svg>
                                     </div>
                                 )}
                             </div>
                        </div>

                        {/* Title */}
                        <div className="flex-1 min-h-[3rem] flex items-center">
                            <h3 className={`text-sm font-bold leading-snug line-clamp-2 ${isLocked ? 'text-white/30' : 'text-white drop-shadow-sm'}`}>
                                {module.title}
                            </h3>
                        </div>

                        {/* Progress Footer */}
                        <div className="mt-4">
                             {!isLocked ? (
                                 <div className="space-y-1.5">
                                     <div className="flex justify-between items-end">
                                         <span className="text-[9px] font-bold text-white/40">
                                             Прогресс
                                         </span>
                                         <span className="text-[9px] font-black" style={{ color: style.accent }}>
                                             {completedCount}/{totalCount}
                                         </span>
                                     </div>
                                     <div className="w-full h-1 bg-black/40 rounded-full overflow-hidden backdrop-blur-sm">
                                         <div 
                                            className="h-full rounded-full transition-all duration-700 ease-out relative" 
                                            style={{ 
                                                width: `${progressPercent}%`, 
                                                backgroundColor: style.accent,
                                                boxShadow: `0 0 10px ${style.accent}`
                                            }}
                                         ></div>
                                     </div>
                                 </div>
                             ) : (
                                 <div className="pt-2 border-t border-white/5">
                                     <p className="text-[9px] font-bold text-white/20 uppercase tracking-wider text-center">
                                         {isAuthenticated ? `Доступ с ${module.minLevel} уровня` : 'Авторизуйтесь'}
                                     </p>
                                 </div>
                             )}
                        </div>
                    </div>
                </div>
            );
        })}
    </div>
  );
};
