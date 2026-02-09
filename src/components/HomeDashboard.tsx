
import React, { useMemo, useState } from 'react';
import { Tab, UserProgress, Lesson, Material, Stream, ArenaScenario, AppNotification, Module, AppConfig } from '../types';
import { telegram } from '../services/telegramService';
import { Avatar } from '../utils/avatar';

interface HomeDashboardProps {
  onNavigate: (tab: Tab) => void;
  userProgress: UserProgress;
  onProfileClick: () => void;
  modules: Module[];
  materials: Material[];
  streams: Stream[];
  scenarios: ArenaScenario[];
  onSelectLesson: (lesson: Lesson) => void;
  onUpdateUser: (data: Partial<UserProgress>) => void;
  allUsers: UserProgress[];
  notifications?: AppNotification[];
  appConfig?: AppConfig;
}

const getGreeting = () => {
  const h = new Date().getHours();
  if (h < 5) return 'Ночная смена';
  if (h < 12) return 'Доброе утро';
  if (h < 18) return 'Добрый день';
  return 'Добрый вечер';
};

const getRank = (level: number) => {
  if (level >= 20) return 'Легенда';
  if (level >= 15) return 'Командир';
  if (level >= 10) return 'Центурион';
  if (level >= 7) return 'Спартанец';
  if (level >= 5) return 'Воин';
  if (level >= 3) return 'Рекрут';
  return 'Новобранец';
};

const fmtDate = (d: Date | string) => {
  try {
    const date = new Date(d);
    const diff = Math.ceil((date.getTime() - Date.now()) / 86400000);
    if (diff === 0) return 'Сегодня';
    if (diff === 1) return 'Завтра';
    return date.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' });
  } catch { return ''; }
};

const fmtTime = (d: Date | string) => {
  try { return new Date(d).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' }); }
  catch { return ''; }
};

const ytThumb = (url?: string) => {
  if (!url) return null;
  const m = url.match(/(?:youtu\.be\/|v=|embed\/)([^#&?]{11})/);
  return m ? `https://img.youtube.com/vi/${m[1]}/hqdefault.jpg` : null;
};

// Business/professional background images for section cards
const CARD_IMAGES: Record<string, string> = {
  MODULES:   'https://images.unsplash.com/photo-1497366216548-37526070297c?w=600&h=400&fit=crop&q=70',
  ARENA:     'https://images.unsplash.com/photo-1552664730-d307ca884978?w=600&h=400&fit=crop&q=70',
  HABITS:    'https://images.unsplash.com/photo-1506784983877-45594efa4cbe?w=600&h=400&fit=crop&q=70',
  STREAMS:   'https://images.unsplash.com/photo-1524178232363-1fb2b075b655?w=600&h=400&fit=crop&q=70',
  NOTEBOOK:  'https://images.unsplash.com/photo-1517842645767-c639042777db?w=600&h=400&fit=crop&q=70',
  MATERIALS: 'https://images.unsplash.com/photo-1521737604893-d14cc237f11d?w=600&h=400&fit=crop&q=70',
};

const QUOTES = [
  'Дисциплина — мост между целями и достижениями',
  'Каждый эксперт когда-то был новичком',
  'Успех — сумма маленьких ежедневных усилий',
  'Продажа — это решение проблемы клиента',
];

// ═══════════════════════════════════════════════════════════════
export const HomeDashboard: React.FC<HomeDashboardProps> = ({
  onNavigate, userProgress: u, onProfileClick,
  modules, materials, streams, scenarios,
  onSelectLesson, allUsers, appConfig,
}) => {
  const isAuth = u.isAuthenticated;
  const [programOpen, setProgramOpen] = useState(false);

  const stats = useMemo(() => {
    const total = modules.reduce((a, m) => a + m.lessons.length, 0);
    const completed = u.completedLessonIds?.length || 0;
    const pct = total > 0 ? Math.round((completed / total) * 100) : 0;
    const streak = Math.max(0, ...(u.habits?.map(h => h.streak) || [0]));
    const xpNext = 1000;
    const xpIn = u.xp % xpNext;
    const xpPct = Math.round((xpIn / xpNext) * 100);

    let nextLesson: Lesson | null = null;
    let nextModule: Module | null = null;
    for (const m of modules) {
      for (const l of m.lessons) {
        if (!u.completedLessonIds?.includes(l.id)) { nextLesson = l; nextModule = m; break; }
      }
      if (nextLesson) break;
    }

    const today = new Date().toISOString().split('T')[0];
    const habitsT = u.habits?.length || 0;
    const habitsD = u.habits?.filter(h => h.completedDates?.includes(today))?.length || 0;
    const sorted = [...allUsers].sort((a, b) => b.xp - a.xp);
    const myRank = sorted.findIndex(x => x.name === u.name) + 1;

    return { total, completed, pct, streak, xpNext, xpIn, xpPct, nextLesson, nextModule, habitsT, habitsD, myRank: myRank > 0 ? myRank : sorted.length + 1 };
  }, [u, modules, allUsers]);

  const upcoming = useMemo(() => {
    const now = new Date();
    return streams.filter(s => s.status === 'UPCOMING' || s.status === 'LIVE' || new Date(s.date) > now)
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()).slice(0, 3);
  }, [streams]);

  const quote = useMemo(() => QUOTES[Math.floor(Date.now() / 86400000) % QUOTES.length], []);

  const nav = (tab: Tab) => { telegram.haptic('selection'); onNavigate(tab); };

  return (
    <div className="min-h-screen bg-body">

      {/* ═══ HEADER ═══ */}
      <header className="px-4 pt-[calc(var(--safe-top)+10px)] pb-3 flex justify-between items-center sticky top-0 z-40 nav-bar">
        <div className="flex items-center gap-3 cursor-pointer" onClick={onProfileClick}>
          <Avatar src={u.avatarUrl} name={u.name} className={`border border-border-color ${!isAuth ? 'opacity-40' : ''}`} />
          <div>
            <p className="text-text-secondary text-[10px] font-medium">{getGreeting()}</p>
            <h1 className="text-[14px] font-bold text-text-primary leading-tight">{u.name}</h1>
          </div>
        </div>
        {isAuth ? (
          <div className="flex items-center gap-1.5 bg-card rounded-lg px-3 py-1.5 border border-border-color">
            <span className="text-[10px] text-text-secondary font-medium">XP</span>
            <span className="text-[13px] font-bold text-text-primary tabular-nums">{u.xp.toLocaleString()}</span>
          </div>
        ) : (
          <button onClick={onProfileClick} className="btn-accent text-xs !py-2 !px-5 !rounded-lg">Войти</button>
        )}
      </header>

      <div className="px-4 pt-3 pb-28 space-y-5 max-w-xl mx-auto desktop-max">

        {/* ═══ WELCOME HERO (unauth) ═══ */}
        {!isAuth && (
          <div className="photo-card animate-fade-in" style={{ aspectRatio: '16/9' }}>
            {appConfig?.welcomeVideoUrl && ytThumb(appConfig.welcomeVideoUrl) ? (
              <>
                <img src={ytThumb(appConfig.welcomeVideoUrl)!} alt="" loading="lazy" />
                <div className="overlay" />
                <a href={appConfig.welcomeVideoUrl} target="_blank" rel="noopener noreferrer"
                  className="absolute inset-0 flex items-center justify-center z-10">
                  <div className="w-14 h-14 rounded-full border-2 border-white/30 bg-white/10 backdrop-blur-sm flex items-center justify-center">
                    <svg className="w-6 h-6 text-white ml-0.5" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>
                  </div>
                </a>
                <div className="content z-10">
                  <h2 className="text-white text-lg font-bold">Академия Продаж</h2>
                  <p className="text-white/50 text-xs mt-1">{appConfig?.welcomeMessage?.slice(0, 80) || 'Курс, арена, AI-тренировки'}</p>
                </div>
              </>
            ) : (
              <>
                <img src={CARD_IMAGES.MODULES} alt="" loading="lazy" />
                <div className="overlay" />
                <div className="content">
                  <h2 className="text-white text-lg font-bold">Академия Продаж</h2>
                  <p className="text-white/50 text-xs mt-1">{appConfig?.welcomeMessage || 'Элитная подготовка продавцов'}</p>
                </div>
              </>
            )}
          </div>
        )}

        {!isAuth && (
          <button onClick={onProfileClick} className="w-full btn-accent text-sm py-3.5 rounded-xl flex items-center justify-center gap-2 animate-fade-in">
            Начать обучение
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" /></svg>
          </button>
        )}

        {/* ═══ AUTH — Stats Row ═══ */}
        {isAuth && (
          <div className="grid grid-cols-4 gap-2 animate-fade-in">
            {[
              { val: String(u.level), label: getRank(u.level) },
              { val: String(stats.streak), label: 'Серия дн.' },
              { val: `${stats.pct}%`, label: 'Прогресс' },
              { val: `#${stats.myRank}`, label: 'Рейтинг' },
            ].map((s, i) => (
              <button key={i} onClick={() => nav(i === 3 ? Tab.RATING : Tab.PROFILE)}
                className="bg-card border border-border-color rounded-xl p-2.5 text-center active:scale-95 transition-transform">
                <p className="text-[15px] font-bold text-text-primary tabular-nums leading-none">{s.val}</p>
                <p className="text-[8px] text-text-secondary font-semibold uppercase tracking-widest mt-1.5">{s.label}</p>
              </button>
            ))}
          </div>
        )}

        {/* ═══ XP Progress ═══ */}
        {isAuth && (
          <div className="bg-card border border-border-color rounded-xl p-3.5 animate-fade-in">
            <div className="flex justify-between items-center mb-2">
              <span className="text-[11px] font-semibold text-text-secondary">Уровень {u.level}</span>
              <span className="text-[10px] text-text-secondary tabular-nums">{stats.xpIn}/{stats.xpNext} XP</span>
            </div>
            <div className="w-full h-1.5 bg-border-color rounded-full overflow-hidden">
              <div className="h-full rounded-full bg-accent transition-all duration-700" style={{ width: `${stats.xpPct}%` }} />
            </div>
          </div>
        )}

        {/* ═══ Continue Lesson — Photo Card ═══ */}
        {isAuth && stats.nextLesson && stats.nextModule && (
          <div className="animate-slide-up">
            <p className="text-[11px] font-semibold text-text-secondary uppercase tracking-wider mb-2 px-0.5">Продолжить</p>
            <button onClick={() => onSelectLesson(stats.nextLesson!)}
              className="w-full photo-card text-left active:scale-[0.98] transition-transform" style={{ aspectRatio: '2/1' }}>
              {(() => {
                const thumb = ytThumb(stats.nextLesson!.videoUrl);
                return (
                  <>
                    <img src={thumb || CARD_IMAGES.MODULES} alt="" loading="lazy" />
                    <div className="overlay" />
                    <div className="content">
                      {/* Pill tags */}
                      <div className="flex gap-1.5 mb-2">
                        <span className="pill pill-active text-[9px] !py-0.5 !px-2">{stats.nextModule!.title}</span>
                        {stats.nextLesson!.durationMinutes && (
                          <span className="pill text-[9px] !py-0.5 !px-2 !border-white/20 !text-white/60">{stats.nextLesson!.durationMinutes} мин</span>
                        )}
                      </div>
                      <h3 className="text-white text-[15px] font-bold leading-tight">{stats.nextLesson!.title}</h3>
                      <div className="flex items-center justify-between mt-2">
                        <span className="text-white/40 text-[10px]">Урок {modules.flatMap(m => m.lessons).indexOf(stats.nextLesson!) + 1} из {stats.total}</span>
                        {/* Progress bar */}
                        <div className="w-20 h-1 bg-white/10 rounded-full overflow-hidden">
                          <div className="h-full bg-accent rounded-full" style={{ width: `${stats.pct}%` }} />
                        </div>
                      </div>
                    </div>
                  </>
                );
              })()}
            </button>
          </div>
        )}

        {/* ═══ Habits Bar ═══ */}
        {isAuth && stats.habitsT > 0 && (
          <button onClick={() => nav(Tab.HABITS)}
            className="w-full bg-card border border-border-color rounded-xl p-3.5 text-left active:scale-[0.98] transition-transform animate-fade-in">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[11px] font-semibold text-text-secondary uppercase tracking-wider">Привычки</p>
                <p className="text-[14px] font-bold text-text-primary mt-0.5">{stats.habitsD} <span className="text-text-secondary font-normal text-[12px]">из {stats.habitsT} сегодня</span></p>
              </div>
              <div className="flex gap-1 items-end h-7">
                {Array.from({ length: Math.min(stats.habitsT, 7) }).map((_, i) => (
                  <div key={i}
                    className={`w-1.5 rounded-sm transition-all duration-300 ${i < stats.habitsD ? 'bg-accent' : 'bg-border-color'}`}
                    style={{ height: i < stats.habitsD ? '100%' : '40%' }} />
                ))}
              </div>
            </div>
          </button>
        )}

        {/* ═══ Upcoming — Schedule style ═══ */}
        {upcoming.length > 0 && isAuth && (
          <div className="animate-fade-in">
            <div className="flex justify-between items-center mb-2 px-0.5">
              <p className="text-[11px] font-semibold text-text-secondary uppercase tracking-wider">Эфиры</p>
              <button onClick={() => nav(Tab.STREAMS)} className="text-[11px] font-semibold text-accent active:opacity-60">
                Все
              </button>
            </div>
            <div className="space-y-1.5">
              {upcoming.map(s => {
                const isLive = s.status === 'LIVE';
                const thumb = ytThumb(s.videoUrl);
                return (
                  <button key={s.id} onClick={() => nav(Tab.STREAMS)}
                    className="w-full bg-card border border-border-color rounded-xl p-3 flex items-center gap-3 text-left active:scale-[0.98] transition-transform">
                    {/* Thumbnail or date */}
                    {thumb ? (
                      <div className="w-12 h-12 rounded-lg overflow-hidden shrink-0">
                        <img src={thumb} alt="" className="w-full h-full object-cover" loading="lazy" />
                      </div>
                    ) : (
                      <div className="w-12 h-12 rounded-lg bg-surface border border-border-color flex flex-col items-center justify-center shrink-0">
                        <span className="text-[10px] font-bold text-text-primary leading-none">{new Date(s.date).getDate()}</span>
                        <span className="text-[8px] text-text-secondary uppercase">{new Date(s.date).toLocaleDateString('ru-RU', { month: 'short' })}</span>
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <h4 className="text-[13px] font-semibold text-text-primary truncate">{s.title}</h4>
                      {isLive
                        ? <div className="flex items-center gap-1.5 mt-0.5">
                            <div className="w-1.5 h-1.5 rounded-full bg-red-500" />
                            <span className="text-[10px] font-bold text-red-500 uppercase">Live</span>
                          </div>
                        : <span className="text-[10px] text-text-secondary">{fmtDate(s.date)} · {fmtTime(s.date)}</span>
                      }
                    </div>
                    <svg className="w-4 h-4 text-text-secondary/30 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* ═══ SECTIONS — Photo Cards Grid ═══ */}
        <div>
          <p className="text-[11px] font-semibold text-text-secondary uppercase tracking-wider mb-2 px-0.5">Разделы</p>
          <div className="grid grid-cols-2 tablet-grid gap-2.5 stagger">
            {[
              { id: Tab.MODULES, title: 'Курс', sub: `${modules.length} модулей`, img: CARD_IMAGES.MODULES },
              { id: Tab.ARENA, title: 'Арена', sub: `${scenarios.length} сценариев`, img: CARD_IMAGES.ARENA },
              { id: Tab.HABITS, title: 'Привычки', sub: 'Ежедневная дисциплина', img: CARD_IMAGES.HABITS },
              { id: Tab.STREAMS, title: 'Эфиры', sub: `${streams.length} записей`, img: CARD_IMAGES.STREAMS },
              { id: Tab.NOTEBOOK, title: 'Блокнот', sub: `${u.notebook?.length || 0} записей`, img: CARD_IMAGES.NOTEBOOK },
              { id: Tab.MATERIALS, title: 'Материалы', sub: `${materials.length} файлов`, img: CARD_IMAGES.MATERIALS },
            ].map(item => (
              <button key={item.id} onClick={() => nav(item.id)}
                className="photo-card text-left active:scale-[0.97] transition-transform" style={{ aspectRatio: '4/3' }}>
                <img src={item.img} alt="" loading="lazy" />
                <div className="overlay" />
                {!isAuth && (
                  <div className="absolute top-2.5 right-2.5">
                    <span className="pill !border-white/15 !text-white/40 text-[8px] !py-0 !px-1.5">Preview</span>
                  </div>
                )}
                <div className="content">
                  <h4 className="text-white font-bold text-[14px]">{item.title}</h4>
                  <p className="text-white/40 text-[10px] mt-0.5">{item.sub}</p>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* ═══ PROGRAM SPOILER ═══ */}
        {modules.length > 0 && (
          <div className={`${programOpen ? 'spoiler-open' : ''} animate-fade-in`}>
            <button onClick={() => { setProgramOpen(p => !p); telegram.haptic('selection'); }}
              className="w-full bg-card border border-border-color rounded-xl p-3.5 flex items-center justify-between active:scale-[0.98] transition-transform">
              <div>
                <p className="text-[13px] font-semibold text-text-primary text-left">Программа курса</p>
                <p className="text-[10px] text-text-secondary text-left mt-0.5">{modules.length} модулей · {stats.total} уроков</p>
              </div>
              <svg className={`w-4 h-4 text-text-secondary transition-transform duration-300 ${programOpen ? 'rotate-180' : ''}`}
                fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>

            <div className="spoiler-body space-y-1.5">
              {modules.map((m, i) => {
                const t = m.lessons.length;
                const d = m.lessons.filter(l => u.completedLessonIds?.includes(l.id)).length;
                const p = t > 0 ? Math.round((d / t) * 100) : 0;
                return (
                  <button key={m.id}
                    onClick={() => { const f = m.lessons[0]; if (f) { telegram.haptic('selection'); onSelectLesson(f); } }}
                    className="w-full bg-card border border-border-color rounded-xl p-3 flex items-center gap-3 text-left active:scale-[0.98] transition-transform">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-[11px] font-bold shrink-0 ${p >= 100 ? 'bg-accent text-[#09090B]' : 'bg-surface border border-border-color text-text-secondary'}`}>
                      {p >= 100 ? '✓' : (i + 1)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="text-[13px] font-semibold text-text-primary truncate">{m.title}</h4>
                      <div className="flex items-center gap-2 mt-1.5">
                        <div className="flex-1 h-1 bg-border-color rounded-full overflow-hidden">
                          <div className="h-full bg-accent rounded-full transition-all duration-500" style={{ width: `${p}%` }} />
                        </div>
                        <span className="text-[9px] text-text-secondary tabular-nums shrink-0">{d}/{t}</span>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* ═══ QUOTE ═══ */}
        {isAuth && (
          <div className="bg-card border border-border-color rounded-xl p-4 animate-fade-in">
            <p className="text-[11px] text-text-secondary leading-relaxed text-center italic">«{quote}»</p>
          </div>
        )}
      </div>
    </div>
  );
};
