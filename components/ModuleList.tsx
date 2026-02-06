
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
  const [lockedTooltipId, setLockedTooltipId] = useState<string | null>(null);

  const handleModuleClick = (module: Module, isLocked: boolean) => {
    if (isLocked) {
        setShakingId(module.id);
        setLockedTooltipId(module.id);
        telegram.haptic('error');
        
        // Clear shaker
        setTimeout(() => setShakingId(null), 400);
        // Clear tooltip
        setTimeout(() => setLockedTooltipId(null), 2000);
        return;
    }
    
    telegram.haptic('medium');
    const nextLesson = module.lessons.find(l => !userProgress.completedLessonIds.includes(l.id)) || module.lessons[0];
    if (nextLesson) onSelectLesson(nextLesson);
  };

  return (
    <div className="space-y-4 md:space-y-6 pb-4">
        {modules.map((module, index) => {
            const isLocked = userProgress.level < module.minLevel;
            const completedCount = module.lessons.filter(l => userProgress.completedLessonIds.includes(l.id)).length;
            const totalCount = module.lessons.length;
            const progressPercent = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;
            
            // Dynamic Gradients based on Category
            const gradient = module.category === 'SALES' ? 'from-emerald-600/90 to-emerald-900/90' :
                             module.category === 'PSYCHOLOGY' ? 'from-purple-600/90 to-purple-900/90' :
                             module.category === 'TACTICS' ? 'from-red-600/90 to-red-900/90' :
                             'from-slate-700/90 to-slate-900/90';

            return (
                <div 
                    key={module.id}
                    onClick={() => handleModuleClick(module, isLocked)}
                    className={`
                        relative w-full rounded-[2rem] md:rounded-[2.5rem] p-1 overflow-hidden transition-all duration-300 group select-none
                        ${shakingId === module.id ? 'animate-shake ring-2 ring-red-500/50' : ''}
                        ${isLocked 
                            ? 'cursor-pointer hover:brightness-75' 
                            : 'hover:scale-[1.01] active:scale-[0.98] cursor-pointer shadow-lg hover:shadow-xl shadow-[#6C5DD3]/10'}
                    `}
                >
                    {/* Glassy Border Container */}
                    <div className="absolute inset-0 bg-gradient-to-br from-white/20 to-transparent rounded-[2rem] md:rounded-[2.5rem] pointer-events-none z-20"></div>
                    
                    {/* Locked Overlay / Tooltip */}
                    {isLocked && (
                        <div className={`absolute inset-0 z-30 bg-black/60 backdrop-blur-[2px] flex items-center justify-center transition-opacity duration-300 ${lockedTooltipId === module.id ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}>
                            {lockedTooltipId === module.id ? (
                                <div className="bg-red-600 text-white px-4 py-2 rounded-xl shadow-2xl animate-scale-in">
                                    <p className="text-[10px] font-black uppercase tracking-widest">Требуется {module.minLevel} Уровень</p>
                                </div>
                            ) : (
                                <div className="bg-black/40 p-3 rounded-full border border-white/10 animate-pulse transform group-hover:scale-110 transition-transform">
                                    <span className="text-2xl">🔒</span>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Main Card Content */}
                    <div className={`
                        relative min-h-[12rem] h-auto rounded-[1.8rem] md:rounded-[2.3rem] overflow-hidden flex flex-col justify-end p-5 md:p-6 transition-all duration-500
                        ${isLocked ? 'bg-[#0a0b0d] brightness-50 grayscale-[0.8] group-hover:grayscale-[0.5]' : 'bg-[#14161B]'}
                    `}>
                        
                        {/* Background Image/Gradient */}
                        <div className={`absolute inset-0 bg-gradient-to-t ${gradient} z-0`}></div>
                        <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-20 z-0 mix-blend-overlay"></div>
                        
                        {/* Status Badge */}
                        <div className="absolute top-4 right-4 md:top-5 md:right-5 z-10 transition-transform duration-300 group-hover:scale-110">
                            {isLocked ? (
                                <div className="w-8 h-8 md:w-10 md:h-10 rounded-full bg-black/40 backdrop-blur-md flex items-center justify-center border border-white/10 shadow-lg">
                                    🔒
                                </div>
                            ) : (
                                <div className="w-8 h-8 md:w-10 md:h-10 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center border border-white/20 text-white font-black text-[10px] md:text-xs">
                                    {progressPercent}%
                                </div>
                            )}
                        </div>

                        {/* Text Content */}
                        <div className="relative z-10 flex flex-col gap-1 transform transition-transform duration-300 group-hover:translate-y-[-2px]">
                            <div className="flex items-center gap-2 mb-1">
                                <span className="px-2 py-0.5 rounded-md bg-black/30 backdrop-blur-md text-[8px] font-black uppercase tracking-widest text-white/80 border border-white/10">
                                    Модуль {index + 1}
                                </span>
                                {isLocked && <span className="px-2 py-0.5 rounded-md bg-red-500/80 text-[8px] font-black uppercase tracking-widest text-white animate-pulse">Lvl {module.minLevel}</span>}
                            </div>
                            
                            <h3 className="text-xl md:text-2xl font-black text-white leading-tight drop-shadow-lg max-w-[85%] break-words">
                                {module.title}
                            </h3>
                            
                            {/* Progress Line */}
                            {!isLocked && (
                                <div className="w-full h-1.5 bg-black/30 rounded-full overflow-hidden mt-3 backdrop-blur-sm">
                                    <div 
                                        className="h-full bg-white shadow-[0_0_10px_white] transition-all duration-1000 ease-out" 
                                        style={{ width: `${progressPercent}%` }}
                                    ></div>
                                </div>
                            )}
                            
                            <div className="mt-3 flex items-center justify-between text-white/60 text-[10px] font-bold uppercase tracking-wider">
                                <span>{module.lessons.length} Уроков</span>
                                <span>{completedCount} Пройдено</span>
                            </div>
                        </div>
                    </div>
                </div>
            );
        })}
    </div>
  );
};
