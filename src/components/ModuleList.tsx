
import React, { useState, useRef, useEffect } from 'react';
import { Module, UserProgress, Lesson, ModuleCategory } from '../types';
import { telegram } from '../services/telegramService';

interface ModuleListProps {
  modules: Module[];
  userProgress: UserProgress;
  onSelectLesson: (lesson: Lesson) => void;
  onBack: () => void;
}

const ytThumb = (url?: string) => {
  if (!url) return null;
  const m = url.match(/(?:youtu\.be\/|v=|embed\/)([^#&?]{11})/);
  return m ? `https://img.youtube.com/vi/${m[1]}/hqdefault.jpg` : null;
};

const GRADIENTS = [
  'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
  'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
  'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
  'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)',
  'linear-gradient(135deg, #fa709a 0%, #fee140 100%)',
  'linear-gradient(135deg, #a18cd1 0%, #fbc2eb 100%)',
  'linear-gradient(135deg, #fccb90 0%, #d57eeb 100%)',
  'linear-gradient(135deg, #f6d365 0%, #fda085 100%)',
];

const MESH_COLORS = [
  ['rgba(102,126,234,0.4)', 'rgba(118,75,162,0.3)'],
  ['rgba(240,147,251,0.4)', 'rgba(245,87,108,0.3)'],
  ['rgba(79,172,254,0.4)', 'rgba(0,242,254,0.3)'],
  ['rgba(67,233,123,0.4)', 'rgba(56,249,215,0.3)'],
  ['rgba(250,112,154,0.4)', 'rgba(254,225,64,0.3)'],
  ['rgba(161,140,209,0.4)', 'rgba(251,194,235,0.3)'],
];

const CATEGORY_META: Record<ModuleCategory, { label: string; icon: string }> = {
  SALES:      { label: 'Продажи',   icon: '💰' },
  PSYCHOLOGY: { label: 'Психология', icon: '🧠' },
  TACTICS:    { label: 'Тактика',   icon: '⚔️' },
  GENERAL:    { label: 'База',      icon: '📚' },
};

const BG_IMAGES = [
  'https://images.unsplash.com/photo-1557804506-669a67965ba0?w=800&h=500&fit=crop&q=60',
  'https://images.unsplash.com/photo-1552664730-d307ca884978?w=800&h=500&fit=crop&q=60',
  'https://images.unsplash.com/photo-1497366216548-37526070297c?w=800&h=500&fit=crop&q=60',
  'https://images.unsplash.com/photo-1519389950473-47ba0277781c?w=800&h=500&fit=crop&q=60',
  'https://images.unsplash.com/photo-1522202176988-66273c2fd55f?w=800&h=500&fit=crop&q=60',
  'https://images.unsplash.com/photo-1553877522-43269d4ea984?w=800&h=500&fit=crop&q=60',
  'https://images.unsplash.com/photo-1531545514256-b1400bc00f31?w=800&h=500&fit=crop&q=60',
  'https://images.unsplash.com/photo-1504384308090-c894fdcc538d?w=800&h=500&fit=crop&q=60',
];

export const ModuleList: React.FC<ModuleListProps> = React.memo(({ modules, userProgress, onSelectLesson }) => {
  const [activeModule, setActiveModule] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const [parallaxY, setParallaxY] = useState(0);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const onScroll = () => setParallaxY(el.scrollTop);
    el.addEventListener('scroll', onScroll, { passive: true });
    return () => el.removeEventListener('scroll', onScroll);
  }, []);

  if (modules.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] px-6 text-center">
        <div className="w-20 h-20 rounded-3xl flex items-center justify-center text-4xl mb-5" style={{ background: GRADIENTS[0] }}>📚</div>
        <h3 className="text-xl font-bold text-text-primary mb-2">Программа формируется</h3>
        <p className="text-sm text-text-secondary max-w-xs leading-relaxed">Модули появятся после добавления администратором</p>
      </div>
    );
  }

  return (
    <div ref={scrollRef} className="h-screen overflow-y-auto no-scrollbar bg-body" style={{ scrollSnapType: 'y proximity' }}>

      {/* HERO HEADER */}
      <div className="relative overflow-hidden" style={{ height: '35vh', minHeight: 220 }}>
        <div className="absolute inset-0" style={{
          background: 'linear-gradient(135deg, #0f0c29 0%, #302b63 50%, #24243e 100%)',
          transform: `translateY(${parallaxY * 0.3}px)`,
        }} />
        {/* Mesh */}
        <div className="absolute inset-0 opacity-30" style={{
          background: 'radial-gradient(circle at 20% 80%, rgba(120,119,198,0.5) 0%, transparent 50%), radial-gradient(circle at 80% 20%, rgba(255,119,198,0.4) 0%, transparent 50%)',
        }} />
        {/* Noise */}
        <div className="absolute inset-0 opacity-[0.03]" style={{
          backgroundImage: 'url("data:image/svg+xml,%3Csvg viewBox=\'0 0 256 256\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cfilter id=\'n\'%3E%3CfeTurbulence type=\'fractalNoise\' baseFrequency=\'0.9\'/%3E%3C/filter%3E%3Crect width=\'100%25\' height=\'100%25\' filter=\'url(%23n)\'/%3E%3C/svg%3E")',
        }} />

        <div className="absolute inset-0 flex flex-col justify-end p-6 pb-8">
          <p className="text-white/40 text-xs font-semibold uppercase tracking-[0.2em] mb-2">Академия Продаж</p>
          <h1 className="text-white text-[34px] font-black leading-[1.05] tracking-tight">
            Программа<br/>курса
          </h1>
          <div className="flex items-center gap-3 mt-4">
            <span className="text-white/50 text-sm font-medium">{modules.length} модулей</span>
            <span className="w-1 h-1 rounded-full bg-white/20" />
            <span className="text-white/50 text-sm font-medium">{modules.reduce((a, m) => a + m.lessons.length, 0)} уроков</span>
          </div>
        </div>
      </div>

      {/* MODULES — edge-to-edge cards */}
      <div className="relative -mt-5">
        {modules.map((module, idx) => {
          const isLocked = !userProgress.isAuthenticated || userProgress.level < module.minLevel;
          const completed = module.lessons.filter(l => userProgress.completedLessonIds?.includes(l.id)).length;
          const total = module.lessons.length;
          const pct = total > 0 ? Math.round((completed / total) * 100) : 0;
          const isDone = pct >= 100;
          const isActive = activeModule === module.id;
          const bgImg = module.imageUrl || ytThumb(module.videoUrl) || BG_IMAGES[idx % BG_IMAGES.length];
          const gradient = GRADIENTS[idx % GRADIENTS.length];
          const mesh = MESH_COLORS[idx % MESH_COLORS.length];
          const cat = CATEGORY_META[module.category] || CATEGORY_META.GENERAL;

          return (
            <div key={module.id} style={{ scrollSnapAlign: 'start' }}>
              {/* MODULE HERO CARD — full-bleed */}
              <div
                onClick={() => {
                  if (isLocked) {
                    telegram.haptic('error');
                    if (!userProgress.isAuthenticated) telegram.showAlert('Авторизуйтесь для доступа', 'Доступ закрыт');
                    else telegram.showAlert(`Необходим уровень ${module.minLevel}`, 'Рано, боец');
                    return;
                  }
                  telegram.haptic('selection');
                  setActiveModule(prev => prev === module.id ? null : module.id);
                }}
                className="relative overflow-hidden cursor-pointer active:brightness-95 transition-all"
                style={{ minHeight: isActive ? 'auto' : '200px' }}
              >
                {/* BG Image with parallax */}
                <div className="absolute inset-0">
                  <img
                    src={bgImg} alt="" loading="lazy"
                    className={`w-full h-full object-cover transition-all duration-500 ${isLocked ? 'grayscale brightness-50 scale-105' : 'scale-105'}`}
                    style={{ transform: `scale(1.1) translateY(${(parallaxY - idx * 200) * 0.05}px)` }}
                  />
                </div>

                {/* Gradient overlay */}
                <div className="absolute inset-0" style={{
                  background: `linear-gradient(to top, rgba(0,0,0,0.85) 0%, rgba(0,0,0,0.4) 40%, rgba(0,0,0,0.2) 100%)`,
                }} />

                {/* Mesh color accent */}
                <div className="absolute inset-0 opacity-40 mix-blend-overlay" style={{
                  background: `radial-gradient(circle at 30% 70%, ${mesh[0]} 0%, transparent 60%), radial-gradient(circle at 80% 30%, ${mesh[1]} 0%, transparent 50%)`,
                }} />

                {/* Content */}
                <div className="relative z-10 p-5 pt-8 pb-6 flex flex-col justify-end" style={{ minHeight: '200px' }}>
                  {/* Top row: number + category */}
                  <div className="flex items-start justify-between mb-auto">
                    <div className="flex items-center gap-2.5">
                      <div className="w-10 h-10 rounded-2xl flex items-center justify-center font-black text-[18px]"
                        style={{
                          background: isLocked ? 'rgba(255,255,255,0.08)' : isDone ? 'rgba(52,199,89,0.2)' : 'rgba(255,255,255,0.12)',
                          color: isLocked ? 'rgba(255,255,255,0.3)' : isDone ? '#34C759' : '#FFF',
                          backdropFilter: 'blur(10px)',
                          border: '1px solid rgba(255,255,255,0.1)',
                        }}>
                        {isLocked ? '🔒' : isDone ? '✓' : String(idx + 1).padStart(2, '0')}
                      </div>
                      <span className="text-white/40 text-[10px] font-bold uppercase tracking-[0.15em] px-2.5 py-1 rounded-full"
                        style={{ background: 'rgba(255,255,255,0.08)', backdropFilter: 'blur(8px)' }}>
                        {cat.label}
                      </span>
                    </div>

                    {/* Progress ring */}
                    {!isLocked && total > 0 && (
                      <div className="relative w-12 h-12">
                        <svg className="w-12 h-12 -rotate-90" viewBox="0 0 48 48">
                          <circle cx="24" cy="24" r="20" fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="3" />
                          <circle cx="24" cy="24" r="20" fill="none" stroke={isDone ? '#34C759' : '#FFF'} strokeWidth="3"
                            strokeDasharray={`${pct * 1.257} 125.7`}
                            strokeLinecap="round" className="transition-all duration-700" />
                        </svg>
                        <span className="absolute inset-0 flex items-center justify-center text-[11px] font-bold text-white">{pct}%</span>
                      </div>
                    )}
                  </div>

                  {/* Title area */}
                  <div className="mt-6">
                    <h2 className="text-white text-[26px] font-black leading-[1.1] tracking-tight mb-1.5">
                      {module.title}
                    </h2>
                    {module.description && (
                      <p className="text-white/45 text-[13px] leading-relaxed line-clamp-2">{module.description}</p>
                    )}
                  </div>

                  {/* Bottom stats */}
                  <div className="flex items-center gap-4 mt-4">
                    <span className="text-white/35 text-[11px] font-semibold">{total} {total === 1 ? 'урок' : total < 5 ? 'урока' : 'уроков'}</span>
                    {!isLocked && completed > 0 && (
                      <>
                        <span className="w-1 h-1 rounded-full bg-white/15" />
                        <span className="text-white/35 text-[11px] font-semibold">{completed} пройдено</span>
                      </>
                    )}
                    <div className="flex-1" />
                    <svg className={`w-5 h-5 text-white/30 transition-transform duration-300 ${isActive ? 'rotate-180' : ''}`}
                      fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>

                  {/* Progress bar — thin line at very bottom */}
                  {!isLocked && total > 0 && (
                    <div className="mt-4 h-[3px] rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.08)' }}>
                      <div className="h-full rounded-full transition-all duration-700" style={{
                        width: `${pct}%`,
                        background: isDone ? '#34C759' : gradient,
                      }} />
                    </div>
                  )}
                </div>

                {/* Divider line between modules */}
                <div className="absolute bottom-0 left-0 right-0 h-px bg-white/[0.04]" />
              </div>

              {/* LESSONS ACCORDION */}
              <div className={`transition-all duration-500 ease-out overflow-hidden ${isActive ? 'max-h-[5000px] opacity-100' : 'max-h-0 opacity-0'}`}>
                <div className="bg-body py-3">
                  {/* Horizontal scroll lesson cards */}
                  <div className="overflow-x-auto no-scrollbar px-4">
                    <div className="flex gap-3" style={{ paddingRight: '16px' }}>
                      {module.lessons.map((lesson, lIdx) => {
                        const isDone = userProgress.completedLessonIds?.includes(lesson.id);
                        const thumb = ytThumb(lesson.videoUrl);

                        return (
                          <div
                            key={lesson.id}
                            onClick={(e) => {
                              e.stopPropagation();
                              telegram.haptic('medium');
                              onSelectLesson(lesson);
                            }}
                            className="flex-shrink-0 cursor-pointer active:scale-[0.97] transition-all duration-200"
                            style={{ width: '280px' }}
                          >
                            <div className="relative overflow-hidden rounded-2xl" style={{
                              background: 'var(--bg-card)',
                              boxShadow: 'var(--shadow-card)',
                              border: isDone ? '2px solid rgba(52,199,89,0.3)' : '1px solid var(--border-color)',
                            }}>
                              {/* Lesson thumbnail */}
                              <div className="relative" style={{ aspectRatio: '16/9' }}>
                                {thumb ? (
                                  <>
                                    <img src={thumb} alt="" loading="lazy" className="w-full h-full object-cover" />
                                    <div className="absolute inset-0" style={{
                                      background: 'linear-gradient(to top, rgba(0,0,0,0.6) 0%, transparent 60%)',
                                    }} />
                                    {/* Play button */}
                                    <div className="absolute inset-0 flex items-center justify-center">
                                      <div className="w-11 h-11 rounded-full flex items-center justify-center"
                                        style={{ background: 'rgba(255,255,255,0.15)', backdropFilter: 'blur(10px)', border: '1px solid rgba(255,255,255,0.2)' }}>
                                        <svg className="w-5 h-5 text-white ml-0.5" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>
                                      </div>
                                    </div>
                                  </>
                                ) : (
                                  <div className="w-full h-full flex items-center justify-center" style={{ background: gradient }}>
                                    <span className="text-white/60 font-black text-[28px]">{String(lIdx + 1).padStart(2, '0')}</span>
                                  </div>
                                )}

                                {/* Done badge */}
                                {isDone && (
                                  <div className="absolute top-3 right-3 w-7 h-7 rounded-full bg-[#34C759] flex items-center justify-center shadow-lg">
                                    <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                                    </svg>
                                  </div>
                                )}

                                {/* Lesson number */}
                                <div className="absolute bottom-3 left-3 text-white/50 text-[10px] font-bold uppercase tracking-wider">
                                  Урок {lIdx + 1}
                                </div>
                              </div>

                              {/* Lesson info */}
                              <div className="p-3.5">
                                <h4 className={`text-[14px] font-bold leading-snug line-clamp-2 ${isDone ? 'text-[#34C759]' : 'text-text-primary'}`}>
                                  {lesson.title}
                                </h4>
                                <div className="flex items-center gap-2 mt-2">
                                  <span className="text-[10px] font-semibold px-2 py-0.5 rounded-md"
                                    style={{
                                      background: isDone ? 'rgba(52,199,89,0.1)' : 'var(--bg-card-alt)',
                                      color: isDone ? '#34C759' : 'var(--text-tertiary)',
                                    }}>
                                    +{lesson.xpReward} XP
                                  </span>
                                  {lesson.videoUrl && (
                                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded-md"
                                      style={{ background: 'var(--bg-card-alt)', color: 'var(--text-tertiary)' }}>
                                      Видео
                                    </span>
                                  )}
                                  {lesson.homeworkTask && (
                                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded-md"
                                      style={{ background: 'var(--bg-card-alt)', color: 'var(--text-tertiary)' }}>
                                      ДЗ
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* View all button */}
                  {module.lessons.length > 3 && (
                    <div className="px-4 mt-3">
                      <button onClick={() => onSelectLesson(module.lessons[0])}
                        className="w-full py-3 rounded-2xl text-[13px] font-bold text-text-secondary border border-border-color bg-card active:scale-[0.98] transition-transform">
                        Начать модуль →
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Bottom spacer for nav */}
      <div className="h-28" />
    </div>
  );
});
