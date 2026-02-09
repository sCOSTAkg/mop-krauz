
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

const SECTION_IMAGES: Record<string, string> = {
  MODULES:   'https://images.unsplash.com/photo-1497366216548-37526070297c?w=500&h=300&fit=crop&q=70',
  ARENA:     'https://images.unsplash.com/photo-1552664730-d307ca884978?w=500&h=300&fit=crop&q=70',
  HABITS:    'https://images.unsplash.com/photo-1506784983877-45594efa4cbe?w=500&h=300&fit=crop&q=70',
  STREAMS:   'https://images.unsplash.com/photo-1524178232363-1fb2b075b655?w=500&h=300&fit=crop&q=70',
  NOTEBOOK:  'https://images.unsplash.com/photo-1517842645767-c639042777db?w=500&h=300&fit=crop&q=70',
  MATERIALS: 'https://images.unsplash.com/photo-1521737604893-d14cc237f11d?w=500&h=300&fit=crop&q=70',
};

const DOT_COLORS = ['#4A6CF7', '#E5487A', '#F7B955', '#1EA952', '#8B5CF6', '#F06449'];

const QUOTES = [
  'Дисциплина — мост между целями и достижениями.',
  'Каждый эксперт когда-то был новичком.',
  'Успех — сумма ежедневных усилий.',
  'Продажа — это решение проблемы клиента.',
];

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
      <header className="px-5 pt-[calc(var(--safe-top)+12px)] pb-2 flex justify-between items-center">
        <div className="flex items-center gap-3 cursor-pointer" onClick={onProfileClick}>
          <div className="relative">
            <Avatar src={u.avatarUrl} name={u.name} className={`avatar-ring ${!isAuth ? 'opacity-40' : ''}`} />
            {isAuth && <div className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-[#1EA952] border-2 border-body rounded-full" />}
          </div>
          <div>
            <p className="text-text-tertiary text-[11px] font-medium">{getGreeting()}</p>
            <h2 className="text-[15px] font-bold text-text-primary">{u.name}</h2>
          </div>
        </div>
        {isAuth ? (
          <div className="icon-btn" onClick={() => nav(Tab.PROFILE)}>
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
          </div>
        ) : (
          <button onClick={onProfileClick} className="btn-accent text-[13px] !py-2.5 !px-5 !rounded-xl">Войти</button>
        )}
      </header>

      <div className="px-5 pt-3 pb-28 space-y-5 max-w-xl mx-auto desktop-max">

        {/* ═══ LARGE TITLE ═══ */}
        {isAuth && (
          <div className="animate-fade-in">
            <h1 className="title-xl">Академия<br/>Продаж</h1>
            <div className="flex items-center gap-2 mt-2">
              <span className="pill pill-blue">Уровень {u.level}</span>
              <span className="pill pill-gray">{getRank(u.level)}</span>
            </div>
          </div>
        )}

        {!isAuth && (
          <div className="animate-fade-in">
            <h1 className="title-xl">Академия<br/>Продаж</h1>
            <p className="text-text-secondary text-[14px] mt-2 leading-relaxed">{appConfig?.welcomeMessage || 'Элитная подготовка. Курс, тренировки, AI-симуляции.'}</p>
          </div>
        )}

        {/* ═══ WELCOME VIDEO ═══ */}
        {!isAuth && appConfig?.welcomeVideoUrl && (() => {
          const thumb = ytThumb(appConfig.welcomeVideoUrl);
          return thumb ? (
            <a href={appConfig.welcomeVideoUrl} target="_blank" rel="noopener noreferrer"
              className="block photo-card animate-slide-up" style={{ aspectRatio: '16/9' }}>
              <img src={thumb} alt="" loading="lazy" />
              <div className="overlay" />
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-14 h-14 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center border border-white/30">
                  <svg className="w-6 h-6 text-white ml-0.5" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>
                </div>
              </div>
            </a>
          ) : null;
        })()}

        {!isAuth && (
          <button onClick={onProfileClick} className="w-full btn-accent text-[14px] py-3.5 animate-fade-in flex items-center justify-center gap-2">
            Начать обучение
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" /></svg>
          </button>
        )}

        {/* ═══ MAIN STATS CARD ═══ */}
        {isAuth && (
          <div className="card p-5 animate-slide-up">
            {/* Progress line with dots */}
            <div className="flex items-center justify-between mb-4">
              <p className="text-[13px] font-semibold text-text-primary">Прогресс курса</p>
              <span className="pill pill-blue text-[10px]">{stats.pct}%</span>
            </div>

            <div className="progress-track mb-4">
              <div className="progress-fill bg-accent" style={{ width: `${stats.pct}%` }} />
            </div>

            {/* Dot indicators for modules */}
            <div className="dot-progress mb-5">
              {modules.map((m, i) => {
                const done = m.lessons.every(l => u.completedLessonIds?.includes(l.id));
                const inProgress = m.lessons.some(l => u.completedLessonIds?.includes(l.id));
                return (
                  <span key={m.id} style={{
                    background: done ? DOT_COLORS[i % DOT_COLORS.length] : inProgress ? DOT_COLORS[i % DOT_COLORS.length] : 'var(--border-color)',
                    opacity: done ? 1 : inProgress ? 0.4 : 0.3,
                    width: done || inProgress ? '8px' : '6px',
                    height: done || inProgress ? '8px' : '6px',
                  }} />
                );
              })}
            </div>

            {/* Stats grid — SugarCRM style big numbers */}
            <div className="grid grid-cols-4 gap-3">
              {[
                { num: String(u.xp), unit: '', label: 'XP' },
                { num: String(stats.streak), unit: 'дн.', label: 'Серия' },
                { num: String(stats.completed), unit: '', label: 'Уроков' },
                { num: `#${stats.myRank}`, unit: '', label: 'Рейтинг' },
              ].map((s, i) => (
                <button key={i} onClick={() => nav(i === 3 ? Tab.RATING : Tab.PROFILE)} className="text-center">
                  <p className="stat-number tabular-nums">{s.num}<span className="stat-unit">{s.unit}</span></p>
                  <p className="stat-label">{s.label}</p>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* ═══ XP LEVEL BAR ═══ */}
        {isAuth && (
          <div className="card p-4 animate-fade-in">
            <div className="flex items-center justify-between mb-2.5">
              <span className="text-[12px] font-semibold text-text-secondary">Уровень {u.level} → {u.level + 1}</span>
              <span className="text-[11px] text-text-tertiary tabular-nums">{stats.xpIn}/{stats.xpNext}</span>
            </div>
            <div className="progress-track">
              <div className="progress-fill" style={{
                width: `${stats.xpPct}%`,
                background: 'linear-gradient(90deg, #4A6CF7, #8B5CF6)',
              }} />
            </div>
          </div>
        )}

        {/* ═══ CONTINUE LESSON ═══ */}
        {isAuth && stats.nextLesson && stats.nextModule && (
          <div className="animate-slide-up">
            <p className="text-[12px] font-semibold text-text-tertiary uppercase tracking-wider mb-2.5 px-1">Продолжить</p>
            <button onClick={() => onSelectLesson(stats.nextLesson!)}
              className="w-full text-left photo-card" style={{ aspectRatio: '2.2/1' }}>
              {(() => {
                const thumb = ytThumb(stats.nextLesson!.videoUrl);
                return (
                  <>
                    <img src={thumb || SECTION_IMAGES.MODULES} alt="" loading="lazy" />
                    <div className="overlay" />
                    <div className="absolute inset-0 p-4 flex flex-col justify-end">
                      <div className="flex gap-1.5 mb-2">
                        <span className="pill pill-blue text-[9px] !py-0.5">{stats.nextModule!.title}</span>
                        {stats.nextLesson!.durationMinutes && (
                          <span className="pill text-[9px] !py-0.5 bg-white/10 text-white/70">{stats.nextLesson!.durationMinutes} мин</span>
                        )}
                      </div>
                      <h3 className="text-white text-[16px] font-bold leading-snug">{stats.nextLesson!.title}</h3>
                      <div className="flex items-center gap-3 mt-2">
                        <span className="text-white/40 text-[10px]">Урок {modules.flatMap(m => m.lessons).indexOf(stats.nextLesson!) + 1} / {stats.total}</span>
                        <div className="flex-1" />
                        <div className="w-9 h-9 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center">
                          <svg className="w-4 h-4 text-white ml-0.5" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>
                        </div>
                      </div>
                    </div>
                  </>
                );
              })()}
            </button>
          </div>
        )}

        {/* ═══ HABITS ═══ */}
        {isAuth && stats.habitsT > 0 && (
          <button onClick={() => nav(Tab.HABITS)} className="w-full card p-4 text-left animate-fade-in">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[12px] font-semibold text-text-secondary">Привычки сегодня</p>
                <div className="flex items-baseline gap-1 mt-1">
                  <span className="stat-number text-[20px]">{stats.habitsD}</span>
                  <span className="text-text-tertiary text-[13px] font-medium">/ {stats.habitsT}</span>
                </div>
              </div>
              {/* Circular mini chart */}
              <svg width="44" height="44" viewBox="0 0 44 44" className="shrink-0">
                <circle cx="22" cy="22" r="18" fill="none" stroke="var(--bg-card-alt)" strokeWidth="4" />
                <circle cx="22" cy="22" r="18" fill="none" stroke="#1EA952" strokeWidth="4"
                  strokeLinecap="round" strokeDasharray={`${(stats.habitsD / stats.habitsT) * 113.1} 113.1`}
                  transform="rotate(-90 22 22)" className="transition-all duration-700" />
                <text x="22" y="26" textAnchor="middle" fill="var(--text-primary)" fontSize="11" fontWeight="700">
                  {Math.round((stats.habitsD / stats.habitsT) * 100)}%
                </text>
              </svg>
            </div>
          </button>
        )}

        {/* ═══ UPCOMING STREAMS ═══ */}
        {upcoming.length > 0 && isAuth && (
          <div className="animate-fade-in">
            <div className="flex justify-between items-center mb-2.5 px-1">
              <p className="text-[12px] font-semibold text-text-tertiary uppercase tracking-wider">Расписание</p>
              <button onClick={() => nav(Tab.STREAMS)} className="text-[12px] font-semibold text-accent active:opacity-60">Все</button>
            </div>
            <div className="space-y-2.5 stagger">
              {upcoming.map(s => {
                const isLive = s.status === 'LIVE';
                return (
                  <button key={s.id} onClick={() => nav(Tab.STREAMS)}
                    className="w-full card p-3.5 flex items-center gap-3.5 text-left">
                    {/* Date block */}
                    <div className={`w-12 h-12 rounded-2xl flex flex-col items-center justify-center shrink-0 ${isLive ? 'bg-[#FDEEF3]' : 'bg-card-alt'}`}>
                      {isLive ? (
                        <div className="w-3 h-3 rounded-full bg-[#E5487A]" />
                      ) : (
                        <>
                          <span className="text-[13px] font-bold text-text-primary leading-none">{new Date(s.date).getDate()}</span>
                          <span className="text-[8px] font-semibold text-text-tertiary uppercase mt-0.5">{new Date(s.date).toLocaleDateString('ru-RU', { month: 'short' })}</span>
                        </>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="text-[13px] font-semibold text-text-primary truncate">{s.title}</h4>
                      <div className="flex items-center gap-2 mt-1">
                        {isLive
                          ? <span className="pill pill-pink text-[9px] !py-0">Live</span>
                          : <span className="text-[11px] text-text-tertiary">{fmtDate(s.date)} · {fmtTime(s.date)}</span>
                        }
                      </div>
                    </div>
                    <svg className="w-4 h-4 text-text-tertiary shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* ═══ SECTIONS GRID — Photo Cards ═══ */}
        <div>
          <p className="text-[12px] font-semibold text-text-tertiary uppercase tracking-wider mb-2.5 px-1">Разделы</p>
          <div className="grid grid-cols-2 tablet-grid gap-3 stagger">
            {[
              { id: Tab.MODULES, title: 'Курс', sub: `${modules.length} модулей`, img: SECTION_IMAGES.MODULES, pill: 'pill-blue' },
              { id: Tab.ARENA, title: 'Арена', sub: `${scenarios.length} сценариев`, img: SECTION_IMAGES.ARENA, pill: 'pill-pink' },
              { id: Tab.HABITS, title: 'Привычки', sub: 'Дисциплина', img: SECTION_IMAGES.HABITS, pill: 'pill-green' },
              { id: Tab.STREAMS, title: 'Эфиры', sub: `${streams.length} записей`, img: SECTION_IMAGES.STREAMS, pill: 'pill-orange' },
              { id: Tab.NOTEBOOK, title: 'Блокнот', sub: `${u.notebook?.length || 0} записей`, img: SECTION_IMAGES.NOTEBOOK, pill: 'pill-gray' },
              { id: Tab.MATERIALS, title: 'Материалы', sub: `${materials.length} файлов`, img: SECTION_IMAGES.MATERIALS, pill: 'pill-gray' },
            ].map(item => (
              <button key={item.id} onClick={() => nav(item.id)}
                className="photo-card text-left" style={{ aspectRatio: '4/3' }}>
                <img src={item.img} alt="" loading="lazy" />
                <div className="overlay" />
                {!isAuth && (
                  <div className="absolute top-3 right-3">
                    <span className="pill bg-black/20 text-white/60 text-[8px] !py-0 backdrop-blur-sm">Preview</span>
                  </div>
                )}
                <div className="absolute bottom-0 left-0 right-0 p-3.5">
                  <h4 className="text-white font-bold text-[15px] leading-tight">{item.title}</h4>
                  <p className="text-white/50 text-[10px] mt-1">{item.sub}</p>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* ═══ PROGRAM SPOILER ═══ */}
        {modules.length > 0 && (
          <div className={`${programOpen ? 'spoiler-open' : ''} animate-fade-in`}>
            <button onClick={() => { setProgramOpen(p => !p); telegram.haptic('selection'); }}
              className="w-full card p-4 flex items-center justify-between">
              <div>
                <p className="text-[14px] font-semibold text-text-primary text-left">Программа курса</p>
                <p className="text-[11px] text-text-tertiary text-left mt-0.5">{modules.length} модулей · {stats.total} уроков</p>
              </div>
              <svg className={`w-5 h-5 text-text-tertiary transition-transform duration-300 ${programOpen ? 'rotate-180' : ''}`}
                fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>

            <div className="spoiler-body space-y-2">
              {modules.map((m, i) => {
                const t = m.lessons.length;
                const d = m.lessons.filter(l => u.completedLessonIds?.includes(l.id)).length;
                const p = t > 0 ? Math.round((d / t) * 100) : 0;
                const isDone = p >= 100;
                return (
                  <button key={m.id}
                    onClick={() => { const f = m.lessons[0]; if (f) { telegram.haptic('selection'); onSelectLesson(f); } }}
                    className="w-full card p-3.5 flex items-center gap-3 text-left">
                    {/* Colored index circle */}
                    <div className="w-9 h-9 rounded-full flex items-center justify-center text-[12px] font-bold shrink-0"
                      style={{
                        background: isDone ? DOT_COLORS[i % DOT_COLORS.length] : 'var(--bg-card-alt)',
                        color: isDone ? '#FFF' : 'var(--text-secondary)',
                      }}>
                      {isDone ? '✓' : (i + 1)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="text-[13px] font-semibold text-text-primary truncate">{m.title}</h4>
                      <div className="flex items-center gap-2 mt-2">
                        <div className="flex-1 progress-track !h-[4px]">
                          <div className="progress-fill" style={{
                            width: `${p}%`,
                            background: DOT_COLORS[i % DOT_COLORS.length],
                          }} />
                        </div>
                        <span className="text-[10px] text-text-tertiary tabular-nums shrink-0">{d}/{t}</span>
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
          <div className="card-flat p-5 animate-fade-in">
            <p className="text-[12px] text-text-secondary leading-relaxed text-center italic">«{quote}»</p>
          </div>
        )}
      </div>
    </div>
  );
};
