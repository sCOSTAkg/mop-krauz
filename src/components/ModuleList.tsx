
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
    const match = url.match(/^.*(youtu\.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/);
    return match?.[2]?.length === 11 ? `https://img.youtube.com/vi/${match[2]}/mqdefault.jpg` : null;
};

const CATEGORY_META: Record<ModuleCategory, { emoji: string; label: string; color: string }> = {
    SALES:      { emoji: '\u{1F4B0}', label: 'Продажи',    color: '#FF9500' },
    PSYCHOLOGY: { emoji: '\u{1F9E0}', label: 'Психология',  color: '#AF52DE' },
    TACTICS:    { emoji: '\u2694\uFE0F', label: 'Тактика',    color: '#FF3B30' },
    GENERAL:    { emoji: '\u{1F4DA}', label: 'База',        color: '#007AFF' },
};

export const ModuleList: React.FC<ModuleListProps> = React.memo(({ modules, userProgress, onSelectLesson }) => {
  const [shakingId, setShakingId] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const handleModuleClick = (module: Module) => {
    const isLocked = !userProgress.isAuthenticated || userProgress.level < module.minLevel;

    if (isLocked) {
        setShakingId(module.id);
        telegram.haptic('error');
        setTimeout(() => setShakingId(null), 500);
        if (!userProgress.isAuthenticated) telegram.showAlert('Авторизуйтесь, чтобы начать обучение.', 'Доступ закрыт');
        else telegram.showAlert(`Необходим уровень ${module.minLevel}. Завершайте предыдущие модули.`, 'Рано, боец');
        return;
    }

    telegram.haptic('selection');
    setExpandedId(prev => prev === module.id ? null : module.id);
  };

  const handleLessonClick = (e: React.MouseEvent, lesson: Lesson) => {
      e.stopPropagation();
      telegram.haptic('medium');
      onSelectLesson(lesson);
  };

  if (modules.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
        <div className="w-16 h-16 rounded-2xl bg-[var(--color-accent)]/10 flex items-center justify-center text-3xl mb-4">{'\u{1F4DA}'}</div>
        <h3 className="text-lg font-semibold text-text-primary mb-2">Программа формируется</h3>
        <p className="text-sm text-text-secondary max-w-xs">Модули появятся после добавления администратором.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3 pb-28">
        {modules.map((module, idx) => {
            const isLocked = !userProgress.isAuthenticated || userProgress.level < module.minLevel;
            const completedCount = module.lessons.filter(l => userProgress.completedLessonIds.includes(l.id)).length;
            const totalCount = module.lessons.length;
            const progressPercent = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;
            const isCompleted = progressPercent === 100;
            const isExpanded = expandedId === module.id;
            const bgImage = module.imageUrl || getYouTubeThumbnail(module.videoUrl);
            const cat = CATEGORY_META[module.category] || CATEGORY_META.GENERAL;

            return (
                <div
                    key={module.id}
                    className={`
                        relative overflow-hidden rounded-2xl bg-card border border-border-color
                        transition-all duration-300 ease-out
                        ${shakingId === module.id ? 'animate-shake' : ''}
                        ${isExpanded ? 'shadow-md' : 'shadow-sm'}
                    `}
                >
                    {/* MODULE CARD HEADER — clickable */}
                    <div
                        onClick={() => handleModuleClick(module)}
                        className="relative cursor-pointer active:scale-[0.99] transition-transform"
                    >
                        {/* Background image */}
                        {bgImage ? (
                            <div className="absolute inset-0 h-full">
                                <img src={bgImage} alt="" loading="lazy" className={`w-full h-full object-cover ${isLocked ? 'grayscale opacity-40' : 'opacity-30'}`} />
                                <div className="absolute inset-0 bg-gradient-to-r from-card via-card/90 to-card/70"></div>
                            </div>
                        ) : null}

                        <div className="relative z-10 p-4 flex items-center gap-4">
                            {/* Module number / icon */}
                            <div
                                className="w-12 h-12 rounded-xl flex items-center justify-center text-lg font-bold flex-shrink-0 border"
                                style={{
                                    backgroundColor: `${cat.color}15`,
                                    borderColor: `${cat.color}30`,
                                    color: cat.color
                                }}
                            >
                                {isLocked ? '\u{1F512}' : isCompleted ? '\u2713' : (idx + 1)}
                            </div>

                            {/* Info */}
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-1">
                                    <span
                                        className="text-[10px] font-bold uppercase tracking-wide"
                                        style={{ color: cat.color }}
                                    >
                                        {cat.label}
                                    </span>
                                    {totalCount > 0 && (
                                        <span className="text-[10px] text-text-secondary">{'\u2022'} {totalCount} {totalCount === 1 ? 'урок' : totalCount < 5 ? 'урока' : 'уроков'}</span>
                                    )}
                                </div>
                                <h3 className="text-sm font-bold text-text-primary leading-tight truncate">
                                    {module.title}
                                </h3>
                                {!isExpanded && module.description && (
                                    <p className="text-xs text-text-secondary line-clamp-1 mt-0.5">{module.description}</p>
                                )}
                            </div>

                            {/* Progress + Chevron */}
                            <div className="flex items-center gap-3 flex-shrink-0">
                                {!isLocked && totalCount > 0 && (
                                    <div className="relative w-9 h-9">
                                        <svg className="w-9 h-9 -rotate-90" viewBox="0 0 36 36">
                                            <circle cx="18" cy="18" r="15" fill="none" stroke="currentColor" strokeWidth="2.5" className="text-body" />
                                            <circle cx="18" cy="18" r="15" fill="none" stroke={isCompleted ? '#34C759' : 'var(--color-accent)'} strokeWidth="2.5"
                                                strokeDasharray={`${progressPercent * 0.942} 100`}
                                                strokeLinecap="round" className="transition-all duration-700"
                                            />
                                        </svg>
                                        <span className="absolute inset-0 flex items-center justify-center text-[9px] font-bold text-text-primary">
                                            {progressPercent}%
                                        </span>
                                    </div>
                                )}
                                <svg
                                    className={`w-4 h-4 text-text-secondary transition-transform duration-300 ${isExpanded ? 'rotate-180' : ''}`}
                                    fill="none" viewBox="0 0 24 24" stroke="currentColor"
                                >
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                </svg>
                            </div>
                        </div>

                        {/* Thin progress bar at bottom of header */}
                        {!isLocked && totalCount > 0 && !isExpanded && (
                            <div className="h-0.5 bg-body">
                                <div
                                    className="h-full transition-all duration-700"
                                    style={{
                                        width: `${progressPercent}%`,
                                        backgroundColor: isCompleted ? '#34C759' : 'var(--color-accent)'
                                    }}
                                />
                            </div>
                        )}
                    </div>

                    {/* LESSONS ACCORDION */}
                    <div
                        className={`transition-all duration-300 ease-out overflow-hidden ${
                            isExpanded ? 'max-h-[2000px] opacity-100' : 'max-h-0 opacity-0'
                        }`}
                    >
                        {module.description && (
                            <p className="text-xs text-text-secondary px-4 pb-3 leading-relaxed">{module.description}</p>
                        )}

                        <div className="px-3 pb-3 space-y-1.5 stagger">
                            {module.lessons.map((lesson, lIdx) => {
                                const isDone = userProgress.completedLessonIds.includes(lesson.id);
                                const thumb = getYouTubeThumbnail(lesson.videoUrl);

                                return (
                                    <div
                                        key={lesson.id}
                                        onClick={(e) => handleLessonClick(e, lesson)}
                                        className={`
                                            flex items-center gap-3 p-3 rounded-xl
                                            border transition-all duration-200
                                            cursor-pointer active:scale-[0.98]
                                            ${isDone
                                                ? 'bg-[#34C759]/5 border-[#34C759]/20'
                                                : 'bg-body/50 border-border-color hover:border-accent/30 backdrop-blur-sm'
                                            }
                                        `}
                                    >
                                        {/* Lesson thumbnail or number */}
                                        {thumb ? (
                                            <div className="w-10 h-10 rounded-lg overflow-hidden flex-shrink-0 border border-border-color">
                                                <img src={thumb} alt="" className="w-full h-full object-cover" loading="lazy" />
                                            </div>
                                        ) : (
                                            <div className={`
                                                w-8 h-8 rounded-lg flex-shrink-0 flex items-center justify-center text-xs font-bold
                                                ${isDone
                                                    ? 'bg-[#34C759] text-white'
                                                    : 'bg-surface text-text-secondary border border-border-color'
                                                }
                                            `}>
                                                {isDone ? '\u2713' : (lIdx + 1)}
                                            </div>
                                        )}

                                        {/* Lesson info */}
                                        <div className="flex-1 min-w-0">
                                            <h4 className={`text-sm font-medium leading-tight truncate ${isDone ? 'text-[#34C759]' : 'text-text-primary'}`}>
                                                {lesson.title}
                                            </h4>
                                            <div className="flex items-center gap-2 mt-0.5">
                                                <span className="text-[10px] text-text-secondary">+{lesson.xpReward} XP</span>
                                                {lesson.videoUrl && <span className="text-[10px] text-text-secondary">{'\u2022'} Видео</span>}
                                                {lesson.homeworkType && <span className="text-[10px] text-text-secondary">{'\u2022'} {lesson.homeworkType === 'TEXT' ? 'Текст' : lesson.homeworkType === 'PHOTO' ? 'Фото' : lesson.homeworkType === 'VIDEO' ? 'Видео' : 'Файл'}</span>}
                                            </div>
                                        </div>

                                        {/* Arrow */}
                                        <svg className="w-4 h-4 text-text-secondary/50 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                        </svg>
                                    </div>
                                );
                            })}
                        </div>

                        {/* Collapse handle */}
                        <div className="flex justify-center pb-2">
                            <div className="w-10 h-1 bg-border-color rounded-full"></div>
                        </div>
                    </div>
                </div>
            );
        })}
    </div>
  );
});
