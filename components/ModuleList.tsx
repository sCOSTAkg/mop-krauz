
import React, { useState, useEffect, useRef } from 'react';
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
  const [selectedModule, setSelectedModule] = useState<Module | null>(null);
  const [isPopupClosing, setIsPopupClosing] = useState(false);
  const [sheetTranslateY, setSheetTranslateY] = useState(0);
  
  const touchStart = useRef<number>(0);
  const isAuthenticated = userProgress.isAuthenticated;

  // Lock body scroll when popup is open
  useEffect(() => {
      if (selectedModule) {
          document.body.style.overflow = 'hidden';
      } else {
          document.body.style.overflow = '';
      }
      return () => { document.body.style.overflow = ''; };
  }, [selectedModule]);

  const closePopup = () => {
      setIsPopupClosing(true);
      setTimeout(() => {
          setSelectedModule(null);
          setIsPopupClosing(false);
          setSheetTranslateY(0);
      }, 300);
  };

  const handleModuleClick = (module: Module) => {
    telegram.haptic('selection');
    setSelectedModule(module);
  };

  const handleLessonClick = (lesson: Lesson, isLocked: boolean) => {
      if (isLocked) {
          telegram.haptic('error');
          if (!isAuthenticated) telegram.showAlert('Авторизуйтесь, чтобы начать обучение.', 'Доступ закрыт');
          else telegram.showAlert('Повысьте уровень, чтобы открыть этот модуль.', 'Рано, боец');
          return;
      }
      telegram.haptic('medium');
      closePopup(); // Close sheet before navigating
      // Small delay to allow sheet animation to start closing
      setTimeout(() => onSelectLesson(lesson), 50);
  };

  // --- SWIPE HANDLERS ---
  const handleTouchStart = (e: React.TouchEvent) => {
      touchStart.current = e.touches[0].clientY;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
      const deltaY = e.touches[0].clientY - touchStart.current;
      if (deltaY > 0) {
          setSheetTranslateY(deltaY);
      }
  };

  const handleTouchEnd = () => {
      if (sheetTranslateY > 100) {
          closePopup();
      } else {
          setSheetTranslateY(0); // Snap back
      }
  };

  return (
    <>
    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3 sm:gap-5 pb-32">
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
                    case 'SALES': return { accent: '#10B981', label: 'ПРОДАЖИ', gradient: 'from-emerald-900', ring: 'group-hover:ring-emerald-500/50' };
                    case 'PSYCHOLOGY': return { accent: '#8B5CF6', label: 'ПСИХОЛОГИЯ', gradient: 'from-violet-900', ring: 'group-hover:ring-violet-500/50' };
                    case 'TACTICS': return { accent: '#F43F5E', label: 'ТАКТИКА', gradient: 'from-rose-900', ring: 'group-hover:ring-rose-500/50' };
                    default: return { accent: '#6366f1', label: 'БАЗА', gradient: 'from-indigo-900', ring: 'group-hover:ring-indigo-500/50' };
                }
            };

            const style = getConfig(module.category);
            
            return (
                <div 
                    key={module.id}
                    onClick={() => handleModuleClick(module)}
                    className={`
                        group relative w-full overflow-hidden rounded-[1.25rem] sm:rounded-[1.75rem]
                        aspect-[16/9] sm:aspect-[16/10]
                        bg-[#16181D] shadow-md hover:shadow-2xl
                        transition-all duration-300 active:scale-[0.98]
                        border border-white/5 hover:border-transparent cursor-pointer
                    `}
                    style={{ animationDelay: `${index * 0.05}s` }}
                >
                    {/* HOVER GLOW BORDER */}
                    <div className={`absolute inset-0 rounded-[1.25rem] sm:rounded-[1.75rem] ring-2 ring-transparent ${style.ring} transition-all duration-500 z-20 pointer-events-none`}></div>

                    {/* BACKGROUND IMAGE LAYER */}
                    <div className="absolute inset-0 z-0">
                        {bgImage ? (
                            <img 
                                src={bgImage} 
                                alt={module.title}
                                className={`w-full h-full object-cover transition-transform duration-700 ease-out ${isLocked ? 'scale-100 grayscale-[0.8]' : 'group-hover:scale-110 opacity-80'}`}
                            />
                        ) : (
                            <div className={`w-full h-full bg-gradient-to-br ${style.gradient} to-[#16181D] opacity-40`}></div>
                        )}
                        {/* SMOOTH GRADIENT OVERLAY */}
                        <div className="absolute inset-0 bg-gradient-to-t from-[#050505] via-[#050505]/60 to-transparent opacity-90"></div>
                        
                        {/* Shimmer Effect on Hover */}
                        {!isLocked && <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent translate-x-[-100%] group-hover:animate-shimmer z-10 pointer-events-none"></div>}
                    </div>

                    {/* TOP BAR (STATUS & TAGS) */}
                    <div className="absolute top-3 left-3 right-3 flex justify-between items-start z-10">
                         <div className="flex gap-2">
                             <span 
                                className="px-2 py-1 rounded-md text-[8px] font-black uppercase tracking-widest backdrop-blur-xl border border-white/10 shadow-sm"
                                style={{ backgroundColor: `${style.accent}30`, color: '#fff' }}
                             >
                                 {style.label}
                             </span>
                             {isCompleted && <span className="bg-[#00B050] text-white text-[8px] font-black px-1.5 py-1 rounded-md shadow-lg">DONE</span>}
                         </div>

                         <div className="flex gap-2">
                            {isLocked && (
                                <div className="w-6 h-6 rounded-full bg-black/40 backdrop-blur-md border border-white/10 flex items-center justify-center">
                                    <span className="text-[10px]">🔒</span>
                                </div>
                            )}
                         </div>
                    </div>

                    {/* CONTENT LAYER */}
                    <div className="absolute bottom-0 left-0 right-0 p-3 sm:p-5 z-10 flex flex-col justify-end h-full pointer-events-none">
                        <div className="mt-auto transform translate-y-1 group-hover:translate-y-0 transition-transform duration-300">
                            <h3 className="text-xs sm:text-sm font-black text-white leading-tight mb-1 line-clamp-2 drop-shadow-md">
                                {module.title}
                            </h3>
                            
                            <p className="text-[9px] font-medium text-white/70 line-clamp-1 mb-2">
                                {module.description}
                            </p>

                            {/* COMPACT PROGRESS BAR */}
                            <div className="flex items-center gap-2 mt-1">
                                <div className="flex-1 h-1 bg-white/20 rounded-full overflow-hidden backdrop-blur-sm">
                                     <div 
                                        className="h-full rounded-full transition-all duration-700 ease-out relative" 
                                        style={{ 
                                            width: `${isLocked ? 0 : progressPercent}%`, 
                                            backgroundColor: style.accent,
                                            boxShadow: `0 0 10px ${style.accent}`
                                        }}
                                     ></div>
                                </div>
                                <span className="text-[9px] font-black min-w-[24px] text-right" style={{ color: isLocked ? '#64748B' : style.accent }}>
                                    {isLocked ? `L${module.minLevel}` : `${Math.round(progressPercent)}%`}
                                </span>
                            </div>
                        </div>
                    </div>
                </div>
            );
        })}
    </div>

    {/* --- MODULE DETAILS POPUP (BOTTOM SHEET) --- */}
    {selectedModule && (
        <div className="fixed inset-0 z-[150] flex items-end justify-center">
            {/* Backdrop */}
            <div 
                className={`absolute inset-0 bg-black/80 backdrop-blur-md transition-opacity duration-300 ${isPopupClosing ? 'opacity-0' : 'opacity-100'}`}
                onClick={closePopup}
            ></div>

            {/* Sheet Container */}
            <div 
                className={`
                    relative w-full max-w-lg h-[85vh] bg-[#0F1115] rounded-t-[2.5rem] overflow-hidden shadow-2xl border-t border-white/10
                    flex flex-col transition-transform duration-300 ease-out
                    ${isPopupClosing ? 'translate-y-full' : 'translate-y-0 animate-slide-up'}
                `}
                style={{ transform: isPopupClosing ? 'translateY(100%)' : `translateY(${sheetTranslateY}px)` }}
            >
                {/* Swipe Handle Area */}
                <div 
                    className="absolute top-0 left-0 w-full h-10 flex justify-center items-center z-50 cursor-grab active:cursor-grabbing bg-gradient-to-b from-black/50 to-transparent"
                    onTouchStart={handleTouchStart}
                    onTouchMove={handleTouchMove}
                    onTouchEnd={handleTouchEnd}
                >
                    <div className="w-12 h-1.5 bg-white/30 rounded-full"></div>
                </div>

                {/* Close Button */}
                <button 
                    onClick={closePopup} 
                    className="absolute top-4 right-4 z-40 w-8 h-8 rounded-full bg-black/40 backdrop-blur-md flex items-center justify-center text-white/70 border border-white/10 active:scale-90 transition-transform"
                >
                    ✕
                </button>

                {/* Header Image */}
                <div className="relative h-48 flex-shrink-0">
                    <div className="absolute inset-0">
                        {selectedModule.imageUrl ? (
                            <img 
                                src={selectedModule.imageUrl} 
                                className="w-full h-full object-cover"
                            />
                        ) : selectedModule.videoUrl ? (
                            <video 
                                src={selectedModule.videoUrl} 
                                className="w-full h-full object-cover"
                                controls
                            />
                        ) : (
                            <img 
                                src={getYouTubeThumbnail(selectedModule.videoUrl) || ''} 
                                className="w-full h-full object-cover"
                            />
                        )}
                        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-[#0F1115]/60 to-[#0F1115]"></div>
                    </div>
                    <div className="absolute bottom-4 left-6 right-6">
                        <span className="text-[#6C5DD3] text-[9px] font-black uppercase tracking-[0.2em] mb-1 block">Модуль</span>
                        <h2 className="text-2xl font-black text-white leading-tight shadow-black drop-shadow-md">{selectedModule.title}</h2>
                    </div>
                </div>

                {/* Scrollable Content */}
                <div className="flex-1 overflow-y-auto custom-scrollbar p-6 pt-2 space-y-6">
                    <p className="text-white/60 text-xs font-medium leading-relaxed">
                        {selectedModule.description}
                    </p>

                    <div className="space-y-3">
                        <h3 className="text-white text-[10px] font-black uppercase tracking-widest opacity-50">Уроки модуля</h3>
                        
                        {selectedModule.lessons.map((lesson, idx) => {
                            const isLessonCompleted = userProgress.completedLessonIds.includes(lesson.id);
                            const isModuleLocked = (userProgress.level < selectedModule.minLevel || !isAuthenticated);
                            
                            return (
                                <div 
                                    key={lesson.id}
                                    onClick={() => handleLessonClick(lesson, isModuleLocked)}
                                    className={`
                                        relative overflow-hidden rounded-2xl p-4 flex items-center gap-4 border 
                                        transition-all
                                        ${isModuleLocked 
                                            ? 'border-white/5 bg-white/[0.01] cursor-not-allowed' 
                                            : 'border-white/10 bg-white/[0.03] active:bg-white/5 cursor-pointer active:scale-[0.99] hover:border-[#6C5DD3]/30'
                                        }
                                    `}
                                >
                                    {/* Blurred Content Overlay for Locked Items */}
                                    {isModuleLocked && (
                                        <div className="absolute inset-0 z-20 flex items-center justify-center bg-black/40 backdrop-blur-[2px]">
                                            <div className="w-8 h-8 rounded-full bg-black/60 flex items-center justify-center border border-white/10 shadow-lg">
                                                <span className="text-xs">🔒</span>
                                            </div>
                                        </div>
                                    )}

                                    {/* Number / Icon */}
                                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-xs font-black flex-shrink-0 border ${isLessonCompleted ? 'bg-[#00B050]/20 border-[#00B050]/50 text-[#00B050]' : 'bg-white/5 border-white/10 text-white/50'}`}>
                                        {isLessonCompleted ? '✓' : idx + 1}
                                    </div>

                                    {/* Text Info */}
                                    <div className={`flex-1 min-w-0 ${isModuleLocked ? 'blur-[1.5px] opacity-60' : ''}`}>
                                        <h4 className="text-sm font-bold text-white leading-tight mb-1">
                                            {lesson.title}
                                        </h4>
                                        <div className="flex items-center gap-3">
                                            <span className="text-[9px] font-black text-white/40 uppercase tracking-wider">{lesson.homeworkType}</span>
                                            <span className="text-[9px] font-bold text-[#6C5DD3]">+{lesson.xpReward} XP</span>
                                        </div>
                                    </div>

                                    {/* Action Icon */}
                                    {!isModuleLocked && (
                                        <div className="text-white/20">
                                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                    
                    {/* Bottom Padding for scroll */}
                    <div className="h-10"></div>
                </div>
                {isAdmin && (
                    <div className="p-4 bg-[#0F1115] border-t border-white/10">
                        <label className="block text-xs font-black text-white mb-1">Видео URL модуля</label>
                        <input
                            type="text"
                            value={selectedModule.videoUrl || ''}
                            onChange={e => setSelectedModule({ ...selectedModule, videoUrl: e.target.value })}
                            className="w-full bg-white/5 border border-white/10 rounded px-3 py-2 text-sm focus:border-[#6C5DD3] outline-none"
                        />
                    </div>
                )}
                
                {/* Fixed Footer with Start Button if accessible */}
                {(!userProgress.level || userProgress.level >= selectedModule.minLevel) && isAuthenticated && (
                    <div className="p-4 bg-[#0F1115] border-t border-white/10 flex-shrink-0">
                        <button 
                            onClick={() => {
                                const next = selectedModule.lessons.find(l => !userProgress.completedLessonIds.includes(l.id)) || selectedModule.lessons[0];
                                handleLessonClick(next, false);
                            }}
                            className="w-full py-4 bg-[#6C5DD3] text-white rounded-2xl font-black uppercase text-xs tracking-[0.2em] shadow-lg shadow-[#6C5DD3]/20 active:scale-95 transition-all hover:bg-[#5b4eb5]"
                        >
                            Продолжить обучение
                        </button>
                    </div>
                )}
            </div>
        </div>
    )}
    </>
  );
};
