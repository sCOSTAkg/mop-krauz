
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
    <div className="space-y-6">
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
                        relative w-full rounded-[2.5rem] p-1 overflow-hidden transition-all duration-300 group
                        ${shakingId === module.id ? 'animate-shake' : ''}
                        ${isLocked ? 'opacity-70 grayscale cursor-not-allowed' : 'hover:scale-[1.02] active:scale-[0.98] cursor-pointer shadow-xl'}
                    `}
                >
                    {/* Glassy Border Container */}
                    <div className="absolute inset-0 bg-gradient-to-br from-white/20 to-transparent rounded-[2.5rem] pointer-events-none z-20"></div>
                    
                    {/* Main Card Content */}
                    <div className={`relative h-48 rounded-[2.3rem] overflow-hidden flex flex-col justify-end p-6 ${isLocked ? 'bg-[#14161B]' : 'bg-[#14161B]'}`}>
                        
                        {/* Background Image/Gradient */}
                        <div className={`absolute inset-0 bg-gradient-to-t ${gradient} z-0`}></div>
                        <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-20 z-0 mix-blend-overlay"></div>
                        
                        {/* Status Badge */}
                        <div className="absolute top-5 right-5 z-10">
                            {isLocked ? (
                                <div className="w-10 h-10 rounded-full bg-black/40 backdrop-blur-md flex items-center justify-center border border-white/10">
                                    🔒
                                </div>
                            ) : (
                                <div className="w-10 h-10 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center border border-white/20 text-white font-black text-xs">
                                    {progressPercent}%
                                </div>
                            )}
                        </div>

                        {/* Text Content */}
                        <div className="relative z-10">
                            <div className="flex items-center gap-2 mb-2">
                                <span className="px-2 py-0.5 rounded-md bg-black/30 backdrop-blur-md text-[8px] font-black uppercase tracking-widest text-white/80 border border-white/10">
                                    Модуль {index + 1}
                                </span>
                                {isLocked && <span className="px-2 py-0.5 rounded-md bg-red-500/80 text-[8px] font-black uppercase tracking-widest text-white">Lvl {module.minLevel}</span>}
                            </div>
                            
                            <h3 className="text-2xl font-black text-white leading-tight mb-2 drop-shadow-lg max-w-[80%]">
                                {module.title}
                            </h3>
                            
                            {/* Progress Line */}
                            {!isLocked && (
                                <div className="w-full h-1.5 bg-black/30 rounded-full overflow-hidden mt-2 backdrop-blur-sm">
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
