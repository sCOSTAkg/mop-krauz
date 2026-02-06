
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
    <div className="grid grid-cols-1 gap-3 pb-24 sm:grid-cols-2 lg:grid-cols-3">
        {modules.map((module, index) => {
            const isLocked = userProgress.level < module.minLevel;
            const completedCount = module.lessons.filter(l => userProgress.completedLessonIds.includes(l.id)).length;
            const totalCount = module.lessons.length;
            const progressPercent = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;
            const isCompleted = progressPercent === 100;
            
            // Visual Config based on Category
            const getConfig = (cat: string) => {
                switch(cat) {
                    case 'SALES': return { 
                        grad: 'from-emerald-500/20 to-emerald-900/40', 
                        accent: '#10B981', 
                        icon: '💰'
                    };
                    case 'PSYCHOLOGY': return { 
                        grad: 'from-violet-500/20 to-violet-900/40', 
                        accent: '#8B5CF6', 
                        icon: '🧠' 
                    };
                    case 'TACTICS': return { 
                        grad: 'from-rose-500/20 to-rose-900/40', 
                        accent: '#F43F5E', 
                        icon: '⚔️' 
                    };
                    default: return { 
                        grad: 'from-blue-500/20 to-blue-900/40', 
                        accent: '#6C5DD3', 
                        icon: '🛡️' 
                    };
                }
            };

            const style = getConfig(module.category);
            const activeGradient = isLocked ? 'bg-[#1F2128]' : `bg-gradient-to-br ${style.grad}`;
            const accentColor = isLocked ? '#64748B' : style.accent;

            return (
                <div 
                    key={module.id}
                    onClick={() => handleModuleClick(module, isLocked)}
                    className={`
                        relative w-full rounded-[1.5rem] overflow-hidden transition-all duration-300
                        border border-white/5 flex flex-col justify-between
                        ${shakingId === module.id ? 'animate-shake' : ''}
                        ${isLocked 
                            ? 'opacity-60 grayscale cursor-not-allowed' 
                            : 'cursor-pointer hover:border-white/20 active:scale-[0.98] shadow-lg hover:shadow-xl'}
                        ${activeGradient}
                    `}
                    style={{ 
                        boxShadow: isLocked ? 'none' : `0 10px 30px -10px ${accentColor}20`
                    }}
                >
                    {/* Background Noise/Texture */}
                    <div className="absolute inset-0 opacity-[0.03] bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] pointer-events-none"></div>

                    <div className="p-5 flex flex-col h-full justify-between relative z-10">
                        {/* Header Area */}
                        <div className="flex justify-between items-start gap-4">
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-1.5">
                                    <span className="text-lg leading-none">{style.icon}</span>
                                    <span 
                                        className="text-[9px] font-black uppercase tracking-[0.2em]"
                                        style={{ color: accentColor }}
                                    >
                                        {module.category}
                                    </span>
                                </div>
                                <h3 className={`text-sm font-extrabold leading-snug line-clamp-2 ${isLocked ? 'text-slate-500' : 'text-white'}`}>
                                    {module.title}
                                </h3>
                            </div>
                            
                            {/* Status Icon */}
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center border transition-all flex-shrink-0 ${
                                 isLocked 
                                 ? 'border-white/5 bg-black/20 text-slate-600' 
                                 : 'border-white/10 bg-white/10 text-white backdrop-blur-sm'
                             }`}>
                                 {isLocked ? (
                                     <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
                                 ) : isCompleted ? (
                                     <span className="text-[#00B050] font-black text-xs">✓</span>
                                 ) : (
                                     <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M9 5l7 7-7 7" /></svg>
                                 )}
                             </div>
                        </div>

                        {/* Footer / Progress */}
                        <div className="mt-5">
                             <div className="flex justify-between items-end mb-2">
                                 <span className="text-[10px] font-bold text-slate-500 dark:text-white/40">
                                     {completedCount} <span className="opacity-50">/ {totalCount}</span>
                                 </span>
                                 <span className="text-[10px] font-black" style={{ color: accentColor }}>
                                     {progressPercent}%
                                 </span>
                             </div>
                             
                             <div className="w-full h-1.5 bg-black/20 rounded-full overflow-hidden backdrop-blur-sm">
                                 <div 
                                    className="h-full rounded-full transition-all duration-700 ease-out relative" 
                                    style={{ 
                                        width: `${progressPercent}%`, 
                                        backgroundColor: accentColor
                                    }}
                                 >
                                     {!isLocked && <div className="absolute top-0 right-0 w-2 h-full bg-white/50 blur-[2px]"></div>}
                                 </div>
                             </div>
                        </div>
                    </div>
                </div>
            );
        })}
    </div>
  );
};
