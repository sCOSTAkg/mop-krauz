
import React, { useState } from 'react';
import { Module, UserProgress, Lesson } from '../types';
import { telegram } from '../services/telegramService';

interface ModuleListProps {
  modules: Module[];
  userProgress: UserProgress;
  onSelectLesson: (lesson: Lesson) => void;
  onBack: () => void;
}

const getYouTubeThumbnail = (url?: string) => {
    if (!url) return null;
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
    const match = url.match(regExp);
    return (match && match[2].length === 11) 
      ? `https://img.youtube.com/vi/${match[2]}/mqdefault.jpg` 
      : null;
};

export const ModuleList: React.FC<ModuleListProps> = ({ modules, userProgress, onSelectLesson }) => {
  const [shakingId, setShakingId] = useState<string | null>(null);
  const isAuthenticated = userProgress.isAuthenticated;

  const handleModuleClick = (module: Module, isLocked: boolean) => {
    if (!isAuthenticated) {
        setShakingId(module.id);
        telegram.haptic('warning');
        telegram.showAlert('Этот модуль доступен только участникам программы. Авторизуйтесь, чтобы начать.', 'Доступ закрыт');
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
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 pb-32">
        {modules.map((module, index) => {
            const isLevelLocked = userProgress.level < module.minLevel;
            const isLocked = (isLevelLocked || !isAuthenticated);
            
            const completedCount = module.lessons.filter(l => userProgress.completedLessonIds.includes(l.id)).length;
            const totalCount = module.lessons.length;
            const progressPercent = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;
            const isCompleted = progressPercent === 100;
            
            const bgImage = module.imageUrl || getYouTubeThumbnail(module.videoUrl);

            // Visual Config based on Category
            const getConfig = (cat: string) => {
                switch(cat) {
                    case 'SALES': return { accent: '#10B981', label: 'ПРОДАЖИ', gradient: 'from-emerald-900 via-emerald-900/50' };
                    case 'PSYCHOLOGY': return { accent: '#8B5CF6', label: 'ПСИХОЛОГИЯ', gradient: 'from-violet-900 via-violet-900/50' };
                    case 'TACTICS': return { accent: '#F43F5E', label: 'ТАКТИКА', gradient: 'from-rose-900 via-rose-900/50' };
                    default: return { accent: '#6366f1', label: 'БАЗА', gradient: 'from-indigo-900 via-indigo-900/50' };
                }
            };

            const style = getConfig(module.category);
            
            return (
                <div 
                    key={module.id}
                    onClick={() => handleModuleClick(module, isLocked)}
                    className={`
                        relative w-full h-auto aspect-[4/3] sm:aspect-[16/9] rounded-[2rem] overflow-hidden transition-all duration-300
                        flex flex-col justify-end group active:scale-[0.97]
                        ${isLocked ? 'cursor-not-allowed' : 'cursor-pointer hover:shadow-2xl hover:-translate-y-1'}
                        ${shakingId === module.id ? 'animate-shake' : ''}
                        shadow-lg shadow-black/10 border border-white/5 bg-[#16181D]
                    `}
                    style={{ animationDelay: `${index * 0.1}s` }}
                >
                    {/* BACKGROUND IMAGE LAYER */}
                    <div className="absolute inset-0 bg-[#16181D]">
                        {bgImage && (
                            <img 
                                src={bgImage} 
                                alt={module.title}
                                className={`w-full h-full object-cover transition-transform duration-[1.5s] ease-out ${isLocked ? 'scale-100 grayscale-[0.8] opacity-40' : 'group-hover:scale-110 opacity-70'}`}
                            />
                        )}
                        {/* GRADIENT OVERLAY */}
                        <div className={`absolute inset-0 bg-gradient-to-t ${style.gradient} to-transparent opacity-90`}></div>
                        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-black/90"></div>
                    </div>

                    {/* LOCK / STATUS LAYER */}
                    <div className="absolute top-4 right-4 flex gap-2 z-20">
                        {isCompleted && (
                            <div className="w-8 h-8 rounded-full bg-[#00B050] flex items-center justify-center shadow-lg shadow-green-500/40 animate-scale-in">
                                <span className="text-white font-black text-xs">✓</span>
                            </div>
                        )}
                        {isLocked && (
                            <div className="w-8 h-8 rounded-full bg-black/60 backdrop-blur-md border border-white/10 flex items-center justify-center">
                                <span className="text-xs">🔒</span>
                            </div>
                        )}
                    </div>

                    <div className="absolute top-4 left-4 z-20">
                         <span 
                            className="px-2 py-1 rounded-lg text-[8px] font-black uppercase tracking-widest backdrop-blur-sm border border-white/10"
                            style={{ backgroundColor: `${style.accent}30`, color: style.accent }}
                         >
                             {style.label}
                         </span>
                    </div>

                    {/* CONTENT LAYER */}
                    <div className="relative z-10 p-5 w-full">
                        <h3 className="text-lg sm:text-xl font-black text-white leading-tight mb-2 line-clamp-2 drop-shadow-md">
                            {module.title}
                        </h3>
                        
                        <p className="text-[10px] font-medium text-white/70 line-clamp-2 mb-4 leading-relaxed">
                            {module.description}
                        </p>

                        {/* PROGRESS BAR */}
                        <div className="flex items-center gap-3">
                            <div className="flex-1 h-1.5 bg-white/10 rounded-full overflow-hidden backdrop-blur-sm border border-white/5">
                                 <div 
                                    className="h-full rounded-full transition-all duration-700 ease-out relative" 
                                    style={{ 
                                        width: `${isLocked ? 0 : progressPercent}%`, 
                                        backgroundColor: style.accent,
                                        boxShadow: `0 0 10px ${style.accent}`
                                    }}
                                 ></div>
                            </div>
                            
                            <span className="text-[9px] font-black min-w-[30px] text-right" style={{ color: isLocked ? '#64748B' : style.accent }}>
                                {isLocked ? `LVL ${module.minLevel}` : `${Math.round(progressPercent)}%`}
                            </span>
                        </div>
                    </div>
                </div>
            );
        })}
    </div>
  );
};
