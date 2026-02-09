
import React, { useState } from 'react';
import { Module, UserProgress, Lesson, ModuleCategory } from '../types';
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

const CATEGORY_EMOJI: Record<ModuleCategory, string> = {
    SALES: '\u{1F4B0}',
    PSYCHOLOGY: '\u{1F9E0}',
    TACTICS: '\u2694\uFE0F',
    GENERAL: '\u{1F4DA}'
};

export const ModuleList: React.FC<ModuleListProps> = React.memo(({ modules, userProgress, onSelectLesson }: ModuleListProps) => {
  const [shakingId, setShakingId] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const handleModuleClick = (module: Module) => {
    const isLevelLocked = userProgress.level < module.minLevel;
    const isAuthenticated = userProgress.isAuthenticated;

    if (isLevelLocked || !isAuthenticated) {
        setShakingId(module.id);
        telegram.haptic('error');
        setTimeout(() => setShakingId(null), 500);

        if (!isAuthenticated) telegram.showAlert('\u0410\u0432\u0442\u043E\u0440\u0438\u0437\u0443\u0439\u0442\u0435\u0441\u044C, \u0447\u0442\u043E\u0431\u044B \u043D\u0430\u0447\u0430\u0442\u044C \u043E\u0431\u0443\u0447\u0435\u043D\u0438\u0435.', '\u0414\u043E\u0441\u0442\u0443\u043F \u0437\u0430\u043A\u0440\u044B\u0442');
        else telegram.showAlert(`\u041D\u0435\u043E\u0431\u0445\u043E\u0434\u0438\u043C \u0443\u0440\u043E\u0432\u0435\u043D\u044C ${module.minLevel}. \u0412\u044B\u043F\u043E\u043B\u043D\u044F\u0439\u0442\u0435 \u0437\u0430\u0434\u0430\u043D\u0438\u044F \u043F\u0440\u0435\u0434\u044B\u0434\u0443\u0449\u0438\u0445 \u043C\u043E\u0434\u0443\u043B\u0435\u0439.`, '\u0420\u0430\u043D\u043E, \u0431\u043E\u0435\u0446');

        return;
    }

    telegram.haptic('selection');
    setExpandedId(expandedId === module.id ? null : module.id);
  };

  const handleLessonClick = (e: React.MouseEvent, lesson: Lesson) => {
      e.stopPropagation();
      telegram.haptic('medium');
      onSelectLesson(lesson);
  };

  // Empty state
  if (modules.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
        <div className="w-16 h-16 rounded-2xl bg-[#6C5DD3]/10 flex items-center justify-center text-3xl mb-4">
          {'\u{1F4DA}'}
        </div>
        <h3 className="text-lg font-semibold text-text-primary mb-2">{'\u041F\u0440\u043E\u0433\u0440\u0430\u043C\u043C\u0430 \u0444\u043E\u0440\u043C\u0438\u0440\u0443\u0435\u0442\u0441\u044F'}</h3>
        <p className="text-sm text-text-secondary max-w-xs">
          {'\u041C\u043E\u0434\u0443\u043B\u0438 \u043F\u043E\u044F\u0432\u044F\u0442\u0441\u044F \u0437\u0434\u0435\u0441\u044C \u043F\u043E\u0441\u043B\u0435 \u0434\u043E\u0431\u0430\u0432\u043B\u0435\u043D\u0438\u044F \u0430\u0434\u043C\u0438\u043D\u0438\u0441\u0442\u0440\u0430\u0442\u043E\u0440\u043E\u043C.'}
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3 pb-28">
        {modules.map((module) => {
            const isLevelLocked = userProgress.level < module.minLevel;
            const isAuthenticated = userProgress.isAuthenticated;
            const isLocked = (isLevelLocked || !isAuthenticated);

            const completedCount = module.lessons.filter(l => userProgress.completedLessonIds.includes(l.id)).length;
            const totalCount = module.lessons.length;
            const progressPercent = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;
            const isCompleted = progressPercent === 100;
            const isExpanded = expandedId === module.id;

            const bgImage = module.imageUrl || getYouTubeThumbnail(module.videoUrl);
            const categoryEmoji = CATEGORY_EMOJI[module.category] || '\u{1F4DA}';

            return (
                <div
                    key={module.id}
                    onClick={() => handleModuleClick(module)}
                    className={`
                        group relative w-full overflow-hidden rounded-2xl
                        bg-card shadow-sm hover:shadow-md
                        transition-all duration-300
                        border border-border-color cursor-pointer
                        ${shakingId === module.id ? 'animate-shake' : ''}
                        ${isExpanded ? 'row-span-2' : ''}
                    `}
                >
                    <div className={`relative flex flex-col h-full ${isExpanded ? 'min-h-[400px]' : 'aspect-[16/10]'}`}>

                        {/* BACKGROUND LAYER */}
                        <div className={`absolute inset-0 z-0 transition-all duration-300 ${isExpanded ? 'h-32 opacity-40' : 'h-full opacity-100'}`}>
                            {bgImage ? (
                                <img
                                    src={bgImage}
                                    alt={module.title}
                                    loading="lazy"
                                    className={`w-full h-full object-cover ${isLocked ? 'grayscale opacity-60' : 'opacity-80'}`}
                                />
                            ) : (
                                <div className="w-full h-full bg-body flex items-center justify-center">
                                    <span className="text-5xl opacity-15 select-none">{categoryEmoji}</span>
                                </div>
                            )}
                            <div className="absolute inset-0 bg-gradient-to-t from-card via-card/60 to-transparent"></div>
                        </div>

                        {/* TOP BAR */}
                        <div className="relative z-10 p-4 flex justify-between items-start">
                             <div className="flex gap-2 items-center">
                                 <span className="px-2 py-1 rounded-lg text-xs font-medium bg-[#6C5DD3]/10 text-[#6C5DD3]">
                                     {module.category === 'SALES' ? '\u041F\u0440\u043E\u0434\u0430\u0436\u0438' : module.category === 'PSYCHOLOGY' ? '\u041F\u0441\u0438\u0445\u043E\u043B\u043E\u0433\u0438\u044F' : module.category === 'TACTICS' ? '\u0422\u0430\u043A\u0442\u0438\u043A\u0430' : '\u0411\u0430\u0437\u0430'}
                                 </span>
                                 {isCompleted && <span className="bg-[#34C759]/10 text-[#34C759] text-xs font-medium px-2 py-1 rounded-lg">{'\u2713'}</span>}
                                 {totalCount > 0 && (
                                    <span className="text-xs text-text-secondary">
                                        {totalCount} {totalCount === 1 ? '\u0443\u0440\u043E\u043A' : totalCount < 5 ? '\u0443\u0440\u043E\u043A\u0430' : '\u0443\u0440\u043E\u043A\u043E\u0432'}
                                    </span>
                                 )}
                             </div>
                             {isLocked && (
                                <div className="w-7 h-7 rounded-full bg-body/80 flex items-center justify-center">
                                    <span className="text-sm">{'\u{1F512}'}</span>
                                </div>
                             )}
                        </div>

                        {/* MAIN INFO */}
                        <div className={`relative z-10 px-4 transition-all duration-300 ${isExpanded ? 'mt-2 mb-4' : 'mt-auto pb-4'}`}>
                            <h3 className="text-base font-semibold text-text-primary leading-tight mb-2">
                                {module.title}
                            </h3>
                            {!isExpanded && module.description && (
                                <p className="text-xs text-text-secondary line-clamp-2 mb-3">
                                    {module.description}
                                </p>
                            )}

                            {/* Progress Bar */}
                            <div className="flex items-center gap-3">
                                <div className="flex-1 h-1.5 bg-body rounded-full overflow-hidden">
                                     <div
                                        className="h-full rounded-full transition-all duration-500 bg-[#6C5DD3]"
                                        style={{ width: `${isLocked ? 0 : progressPercent}%` }}
                                     ></div>
                                </div>
                                <span className={`text-xs font-medium whitespace-nowrap ${isLocked ? 'text-text-secondary' : 'text-[#6C5DD3]'}`}>
                                    {isLocked ? `L${module.minLevel}` : totalCount > 0 ? `${completedCount}/${totalCount}` : '0%'}
                                </span>
                            </div>
                        </div>

                        {/* LESSONS LIST (Expanded) */}
                        {isExpanded && (
                            <div className="relative z-10 px-4 pb-4 space-y-2 flex-1 overflow-y-auto animate-fade-in custom-scrollbar">
                                <p className="text-xs text-text-secondary mb-3 px-1">{module.description}</p>
                                {module.lessons.map((lesson, lIdx) => {
                                    const isLessonCompleted = userProgress.completedLessonIds.includes(lesson.id);

                                    return (
                                        <div
                                            key={lesson.id}
                                            onClick={(e) => handleLessonClick(e, lesson)}
                                            className="flex items-center gap-3 p-3 rounded-xl bg-body border border-border-color transition-colors active:scale-[0.98]"
                                        >
                                            <div className={`
                                                w-7 h-7 rounded-full flex-shrink-0 flex items-center justify-center text-xs font-semibold
                                                ${isLessonCompleted
                                                    ? 'bg-[#34C759]/10 text-[#34C759]'
                                                    : 'bg-surface text-text-secondary'
                                                }
                                            `}>
                                                {isLessonCompleted ? '\u2713' : lIdx + 1}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <h4 className="text-sm font-medium text-text-primary leading-tight">{lesson.title}</h4>
                                                <div className="flex items-center gap-2 mt-1">
                                                    <span className="text-xs text-text-secondary">+{lesson.xpReward} XP</span>
                                                </div>
                                            </div>
                                            <svg className="w-4 h-4 text-text-secondary" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                                        </div>
                                    );
                                })}
                            </div>
                        )}

                        {/* Collapse indicator */}
                        {isExpanded && (
                            <div className="relative z-10 flex justify-center pb-2">
                                <div className="w-10 h-1 bg-border-color rounded-full"></div>
                            </div>
                        )}
                    </div>
                </div>
            );
        })}
    </div>
  );
});
