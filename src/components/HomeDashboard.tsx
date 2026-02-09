
import React, { useMemo } from 'react';
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
  if (h < 5) return 'Ночной дозор';
  if (h < 12) return 'Доброе утро';
  if (h < 18) return 'Добрый день';
  return 'Добрый вечер';
};

const getRank = (level: number) => {
  if (level >= 20) return { title: 'Легенда', icon: '👑' };
  if (level >= 15) return { title: 'Командир', icon: '⭐' };
  if (level >= 10) return { title: 'Центурион', icon: '🦅' };
  if (level >= 7) return { title: 'Спартанец', icon: '🛡️' };
  if (level >= 5) return { title: 'Воин', icon: '⚔️' };
  if (level >= 3) return { title: 'Рекрут', icon: '🎯' };
  return { title: 'Новобранец', icon: '🏷️' };
};

const formatEventDate = (d: Date | string) => {
  try {
    const date = new Date(d);
    const diff = Math.ceil((date.getTime() - Date.now()) / 86400000);
    if (diff === 0) return 'Сегодня';
    if (diff === 1) return 'Завтра';
    if (diff < 7) return `Через ${diff} дн.`;
    return date.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' });
  } catch { return '—'; }
};

const formatTime = (d: Date | string) => {
  try { return new Date(d).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' }); }
  catch { return ''; }
};

const getYTThumb = (url?: string) => {
  if (!url) return null;
  const m = url.match(/(?:youtu\.be\/|v=|embed\/)([^#&?]{11})/);
  return m ? `https://img.youtube.com/vi/${m[1]}/mqdefault.jpg` : null;
};

const MOTIVATIONS = [
  'Дисциплина — это мост между целями и достижениями.',
  'Каждый эксперт когда-то был новичком.',
  'Не бойся идти медленно — бойся стоять на месте.',
  'Успех — это сумма маленьких ежедневных усилий.',
  'Тот, кто учится каждый день, не может проиграть.',
  'Продажа — это не давление. Это решение проблемы.',
  'Путь воина — это постоянное совершенствование.',
  'Сила — в регулярности, а не в интенсивности.',
];

// ─── SVG Ring ───────────────────────────────────────────────────
const ProgressRing = ({ percent, size = 52, stroke = 4 }: { percent: number; size?: number; stroke?: number }) => {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const offset = c - (Math.min(percent, 100) / 100) * c;
  return (
    <svg width={size} height={size} className="rotate-[-90deg]">
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="var(--border-color)" strokeWidth={stroke} />
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="url(#ring-grad)" strokeWidth={stroke}
        strokeDasharray={c} strokeDashoffset={offset} strokeLinecap="round"
        className="transition-all duration-700" />
      <defs>
        <linearGradient id="ring-grad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#6C5DD3" />
          <stop offset="100%" stopColor="#A78BFA" />
        </linearGradient>
      </defs>
    </svg>
  );
};

const SectionHeader = ({ title, action, onAction }: { title: string; action?: string; onAction?: () => void }) => (
  <div className="flex justify-between items-center mb-3">
    <h3 className="text-sm font-extrabold text-text-primary tracking-tight">{title}</h3>
    {action && onAction && (
      <button onClick={() => { telegram.haptic('selection'); onAction(); }}
        className="text-[11px] font-bold text-[#6C5DD3] flex items-center gap-0.5 active:scale-95 py-1 px-1 transition-transform">
        {action}
        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" /></svg>
      </button>
    )}
  </div>
);

// ═══════════════════════════════════════════════════════════════
export const HomeDashboard: React.FC<HomeDashboardProps> = ({
  onNavigate, userProgress: u, onProfileClick,
  modules, materials, streams, scenarios,
  onSelectLesson, allUsers, appConfig,
}) => {
  const isAuth = u.isAuthenticated;

  const stats = useMemo(() => {
    const allLessons = modules.flatMap(m => m.lessons);
    const total = allLessons.length;
    const completed = u.completedLessonIds?.length || 0;
    const progress = total > 0 ? Math.round((completed / total) * 100) : 0;
    const bestStreak = Math.max(0, ...(u.habits?.map(h => h.streak) || [0]));
    const xpForNext = 1000;
    const xpInLevel = u.xp % xpForNext;
    const xpPercent = Math.round((xpInLevel / xpForNext) * 100);
    const rank = getRank(u.level);

    let nextLesson: Lesson | null = null;
    let nextModule: Module | null = null;
    for (const m of modules) {
      for (const l of m.lessons) {
        if (!u.completedLessonIds?.includes(l.id)) { nextLesson = l; nextModule = m; break; }
      }
      if (nextLesson) break;
    }

    const today = new Date().toISOString().split('T')[0];
    const habitsTotal = u.habits?.length || 0;
    const habitsDone = u.habits?.filter(h => h.completedDates?.includes(today))?.length || 0;
    const myRank = [...allUsers].sort((a, b) => b.xp - a.xp).findIndex(x => x.name === u.name) + 1;

    return { total, completed, progress, bestStreak, xpForNext, xpInLevel, xpPercent, rank, nextLesson, nextModule, habitsTotal, habitsDone, myRank: myRank > 0 ? myRank : allUsers.length + 1 };
  }, [u, modules, allUsers]);

  const upcoming = useMemo(() => {
    const now = new Date();
    return streams.filter(s => s.status === 'UPCOMING' || s.status === 'LIVE' || new Date(s.date) > now)
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()).slice(0, 2);
  }, [streams]);

  const motivation = useMemo(() => {
    const day = Math.floor((Date.now() - new Date(new Date().getFullYear(), 0, 0).getTime()) / 86400000);
    return MOTIVATIONS[day % MOTIVATIONS.length];
  }, []);

  const nav = (tab: Tab) => { telegram.haptic('selection'); onNavigate(tab); };

  return (
    <div className="min-h-screen bg-body/50 relative">
      {/* ═══ HEADER ═══ */}
      <div className="px-4 pt-[calc(var(--safe-top)+8px)] flex justify-between items-center sticky top-0 z-40 pb-3 island-blur bg-body/60">
        <div className="flex items-center gap-3 cursor-pointer" onClick={onProfileClick}>
          <div className="relative">
            <div className={`rounded-full p-[2px] ${isAuth ? 'bg-gradient-to-br from-[#6C5DD3] to-[#A78BFA]' : ''}`}>
              <Avatar src={u.avatarUrl} name={u.name} className={`border-2 border-body ${!isAuth ? 'opacity-60' : ''}`} />
            </div>
            {isAuth && <div className="absolute bottom-0 right-0 w-3 h-3 bg-[#34C759] border-2 border-body rounded-full" />}
          </div>
          <div>
            <p className="text-text-secondary text-[10px] font-semibold uppercase tracking-wider">{getGreeting()}</p>
            <h1 className="text-sm font-extrabold text-text-primary leading-none">{u.name}</h1>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {isAuth && (
            <div className="glass-card rounded-xl px-3 py-1.5 flex items-center gap-1.5">
              <span className="text-xs animate-bounce-gentle">⚡</span>
              <span className="text-xs font-extrabold gradient-text">{u.xp.toLocaleString()}</span>
            </div>
          )}
          {!isAuth && (
            <button onClick={onProfileClick} className="btn-accent text-xs !py-2 !px-4 !rounded-xl active:scale-95">
              Войти
            </button>
          )}
        </div>
      </div>

      <div className="px-4 pt-4 pb-28 space-y-5 max-w-xl mx-auto desktop-max relative z-10 stagger">

        {/* ═══ WELCOME (UNAUTH) ═══ */}
        {!isAuth && (
          <div className="glass-card rounded-2xl overflow-hidden accent-glow">
            {appConfig?.welcomeVideoUrl && appConfig.welcomeVideoUrl.length > 5 && (() => {
              const thumb = getYTThumb(appConfig.welcomeVideoUrl);
              return thumb ? (
                <div className="relative aspect-video w-full overflow-hidden">
                  <img src={thumb} alt="" className="w-full h-full object-cover" loading="lazy" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent" />
                  <a href={appConfig.welcomeVideoUrl} target="_blank" rel="noopener noreferrer"
                    className="absolute inset-0 flex items-center justify-center">
                    <div className="w-16 h-16 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center animate-breathing border border-white/30">
                      <svg className="w-7 h-7 text-white ml-0.5" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>
                    </div>
                  </a>
                  <div className="absolute bottom-4 left-4 right-4">
                    <h2 className="text-white text-lg font-extrabold drop-shadow-lg">Академия Продаж</h2>
                    <p className="text-white/70 text-xs mt-1">{appConfig?.welcomeMessage?.slice(0, 80) || 'Элитная подготовка продавцов'}</p>
                  </div>
                </div>
              ) : null;
            })()}
            <div className="p-5">
              {!(appConfig?.welcomeVideoUrl && appConfig.welcomeVideoUrl.length > 5 && getYTThumb(appConfig.welcomeVideoUrl)) && (
                <>
                  <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#6C5DD3] to-[#A78BFA] flex items-center justify-center mb-4 animate-float">
                    <span className="text-3xl">🎓</span>
                  </div>
                  <h2 className="text-lg font-extrabold text-text-primary mb-2">Академия Продаж</h2>
                  <p className="text-text-secondary text-sm leading-relaxed mb-4">
                    {appConfig?.welcomeMessage || 'Элитная подготовка. Доступ к материалам откроется после авторизации.'}
                  </p>
                </>
              )}
              <button onClick={onProfileClick}
                className="w-full btn-accent text-sm flex items-center justify-center gap-2">
                <span>Начать обучение</span>
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M17 8l4 4m0 0l-4 4m4-4H3" /></svg>
              </button>
            </div>
          </div>
        )}

        {/* ═══ AUTH DASHBOARD ═══ */}
        {isAuth && (
          <>
            {/* ── Hero Stats ── */}
            <div className="grid grid-cols-4 gap-2">
              {[
                { icon: stats.rank.icon, val: `Lvl ${u.level}`, sub: stats.rank.title, color: '#6C5DD3' },
                { icon: '🔥', val: String(stats.bestStreak), sub: 'Серия', color: '#FF9500' },
                { icon: '📦', val: `${stats.progress}%`, sub: 'Курс', color: '#34C759' },
                { icon: '🏆', val: `#${stats.myRank}`, sub: 'Рейтинг', color: '#007AFF' },
              ].map((s, i) => (
                <div key={i} className="glass-card rounded-2xl p-3 text-center relative overflow-hidden group cursor-pointer"
                  onClick={() => nav(i === 3 ? Tab.RATING : Tab.PROFILE)}>
                  <div className="absolute inset-0 opacity-0 group-active:opacity-100 transition-opacity"
                    style={{ background: `radial-gradient(circle at 50% 50%, ${s.color}15, transparent 70%)` }} />
                  <span className="text-lg block">{s.icon}</span>
                  <p className="text-sm font-extrabold text-text-primary mt-0.5">{s.val}</p>
                  <p className="text-[7px] text-text-secondary uppercase font-bold tracking-widest">{s.sub}</p>
                </div>
              ))}
            </div>

            {/* ── XP Progress ── */}
            <div className="glass-card rounded-2xl p-4 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 rounded-full opacity-20"
                style={{ background: 'radial-gradient(circle, #6C5DD3, transparent 70%)', transform: 'translate(30%, -30%)' }} />
              <div className="flex items-center justify-between mb-2 relative z-10">
                <div className="flex items-center gap-2">
                  <span className="text-base animate-bounce-gentle">⚡</span>
                  <span className="text-sm font-extrabold gradient-text">{u.xp.toLocaleString()} XP</span>
                </div>
                <span className="text-[10px] font-bold text-text-secondary bg-body/50 px-2 py-0.5 rounded-lg">
                  Lvl {u.level} → {u.level + 1}
                </span>
              </div>
              <div className="w-full h-2.5 bg-body/80 rounded-full overflow-hidden relative z-10">
                <div className="h-full rounded-full transition-all duration-1000 ease-out relative"
                  style={{ width: `${stats.xpPercent}%`, background: 'linear-gradient(90deg, #6C5DD3, #8B7FE8, #A78BFA)' }}>
                  <div className="absolute inset-0 shimmer rounded-full" />
                </div>
              </div>
              <p className="text-[9px] text-text-secondary mt-1.5 relative z-10">{stats.xpInLevel} / {stats.xpForNext} XP до следующего уровня</p>
            </div>

            {/* ── Next Lesson Card ── */}
            {stats.nextLesson && stats.nextModule && (
              <div>
                <SectionHeader title="Продолжить" />
                <button onClick={() => onSelectLesson(stats.nextLesson!)}
                  className="w-full glass-card rounded-2xl overflow-hidden text-left active:scale-[0.98] transition-all accent-glow">
                  <div className="flex gap-3 p-4">
                    {(() => {
                      const thumb = getYTThumb(stats.nextLesson!.videoUrl);
                      return thumb ? (
                        <div className="w-20 h-14 rounded-xl overflow-hidden shrink-0 relative shadow-lg">
                          <img src={thumb} alt="" className="w-full h-full object-cover" loading="lazy" />
                          <div className="absolute inset-0 flex items-center justify-center bg-black/30 backdrop-blur-[1px]">
                            <svg className="w-5 h-5 text-white drop-shadow-lg" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>
                          </div>
                        </div>
                      ) : (
                        <div className="w-20 h-14 rounded-xl bg-gradient-to-br from-[#6C5DD3]/20 to-[#A78BFA]/20 flex items-center justify-center shrink-0">
                          <span className="text-xl">📖</span>
                        </div>
                      );
                    })()}
                    <div className="flex-1 min-w-0">
                      <p className="text-[9px] font-extrabold text-[#6C5DD3] uppercase tracking-wider mb-0.5">{stats.nextModule!.title}</p>
                      <h4 className="text-sm font-bold text-text-primary truncate">{stats.nextLesson!.title}</h4>
                      <div className="flex items-center gap-2 mt-1.5 text-[10px] text-text-secondary">
                        {stats.nextLesson!.durationMinutes && <span>⏱ {stats.nextLesson!.durationMinutes} мин</span>}
                        <span>📦 Урок {modules.flatMap(m => m.lessons).indexOf(stats.nextLesson!) + 1}/{stats.total}</span>
                      </div>
                    </div>
                    <div className="self-center shrink-0">
                      <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#6C5DD3] to-[#A78BFA] flex items-center justify-center shadow-lg accent-glow">
                        <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>
                      </div>
                    </div>
                  </div>
                  <div className="h-1 bg-body/50">
                    <div className="h-full transition-all duration-700" style={{ width: `${stats.progress}%`, background: 'linear-gradient(90deg, #6C5DD3, #A78BFA)' }} />
                  </div>
                </button>
              </div>
            )}

            {/* ── Daily Habits ── */}
            {stats.habitsTotal > 0 && (
              <button onClick={() => nav(Tab.HABITS)}
                className="w-full glass-card rounded-2xl p-4 text-left active:scale-[0.98] transition-all">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <ProgressRing percent={stats.habitsTotal > 0 ? (stats.habitsDone / stats.habitsTotal) * 100 : 0} size={44} stroke={4} />
                    <div>
                      <h4 className="text-sm font-bold text-text-primary">Привычки</h4>
                      <p className="text-[10px] text-text-secondary">{stats.habitsDone} из {stats.habitsTotal} сегодня</p>
                    </div>
                  </div>
                  <div className="flex gap-1">
                    {Array.from({ length: Math.min(stats.habitsTotal, 5) }).map((_, i) => (
                      <div key={i} className={`w-2 h-2 rounded-full transition-all duration-300 ${i < stats.habitsDone ? 'bg-[#FF9500] shadow-[0_0_6px_rgba(255,149,0,0.4)]' : 'bg-border-color'}`} />
                    ))}
                  </div>
                </div>
              </button>
            )}

            {/* ── Upcoming Streams ── */}
            {upcoming.length > 0 && (
              <div>
                <SectionHeader title="Ближайшие эфиры" action="Все" onAction={() => nav(Tab.STREAMS)} />
                <div className="space-y-2">
                  {upcoming.map(s => (
                    <button key={s.id} onClick={() => nav(Tab.STREAMS)}
                      className="w-full glass-card rounded-xl p-3 flex items-center gap-3 text-left active:scale-[0.98] transition-all">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 relative ${s.status === 'LIVE' ? 'bg-[#FF3B30]/15' : 'bg-[#6C5DD3]/10'}`}>
                        <span className="text-lg">{s.status === 'LIVE' ? '🔴' : '📡'}</span>
                        {s.status === 'LIVE' && <div className="absolute inset-0 rounded-xl badge-live bg-[#FF3B30]/10" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="text-sm font-bold text-text-primary truncate">{s.title}</h4>
                        {s.status === 'LIVE'
                          ? <span className="text-[10px] font-extrabold text-[#FF3B30] uppercase animate-pulse">● В эфире</span>
                          : <span className="text-[10px] text-text-secondary">{formatEventDate(s.date)} · {formatTime(s.date)}</span>
                        }
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </>
        )}

        {/* ═══ QUICK ACTIONS ═══ */}
        <div>
          <SectionHeader title="Разделы" />
          <div className="grid grid-cols-2 tablet-grid gap-2.5">
            {[
              { id: Tab.MODULES, title: 'Курс', icon: '📦', desc: `${modules.length} модулей`, gradient: 'from-[#6C5DD3]/10 to-[#A78BFA]/5' },
              { id: Tab.ARENA, title: 'Арена', icon: '⚔️', desc: `${scenarios.length} сцен.`, gradient: 'from-[#FF3B30]/10 to-[#FF6B6B]/5' },
              { id: Tab.HABITS, title: 'Привычки', icon: '🔥', desc: 'Дисциплина', gradient: 'from-[#FF9500]/10 to-[#FFB84D]/5' },
              { id: Tab.STREAMS, title: 'Эфиры', icon: '📡', desc: `${streams.length} зап.`, gradient: 'from-[#007AFF]/10 to-[#4DA6FF]/5' },
              { id: Tab.NOTEBOOK, title: 'Блокнот', icon: '📝', desc: `${u.notebook?.length || 0} зап.`, gradient: 'from-[#34C759]/10 to-[#6DD58C]/5' },
              { id: Tab.MATERIALS, title: 'Материалы', icon: '📎', desc: `${materials.length} файлов`, gradient: 'from-[#AF52DE]/10 to-[#C77DFF]/5' },
            ].map(item => (
              <button key={item.id} onClick={() => nav(item.id)}
                className="glass-card p-4 rounded-2xl text-left transition-all active:scale-95 relative overflow-hidden group">
                {!isAuth && <span className="absolute top-2.5 right-2.5 text-[7px] font-bold text-text-secondary/30 uppercase">Demo</span>}
                <div className={`absolute inset-0 bg-gradient-to-br ${item.gradient} opacity-0 group-hover:opacity-100 group-active:opacity-100 transition-opacity`} />
                <div className="relative z-10">
                  <div className="w-11 h-11 rounded-xl glass-card flex items-center justify-center text-xl mb-3 animate-float" style={{ animationDelay: `${Math.random() * 2}s` }}>
                    {item.icon}
                  </div>
                  <h4 className="font-extrabold text-text-primary text-sm">{item.title}</h4>
                  <p className="text-[10px] text-text-secondary mt-0.5">{item.desc}</p>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* ═══ MODULES PREVIEW ═══ */}
        {modules.length > 0 && (
          <div>
            <SectionHeader title="Программа" action={`${modules.length} модулей`} onAction={() => nav(Tab.MODULES)} />
            <div className="space-y-2">
              {modules.slice(0, 3).map((m, i) => {
                const total = m.lessons.length;
                const done = m.lessons.filter(l => u.completedLessonIds?.includes(l.id)).length;
                const pct = total > 0 ? Math.round((done / total) * 100) : 0;
                return (
                  <button key={m.id}
                    onClick={() => { const f = m.lessons[0]; if (f) { telegram.haptic('selection'); onSelectLesson(f); } }}
                    className="w-full glass-card rounded-xl p-3.5 flex items-center gap-3 text-left active:scale-[0.98] transition-all">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#6C5DD3]/15 to-[#A78BFA]/10 flex items-center justify-center text-sm font-extrabold text-[#6C5DD3] shrink-0 shadow-inner">
                      {i + 1}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="text-sm font-bold text-text-primary truncate">{m.title}</h4>
                      <div className="flex items-center gap-2 mt-1.5">
                        <div className="flex-1 h-1.5 bg-body/80 rounded-full overflow-hidden">
                          <div className="h-full rounded-full transition-all duration-700"
                            style={{ width: `${pct}%`, background: 'linear-gradient(90deg, #6C5DD3, #A78BFA)' }} />
                        </div>
                        <span className="text-[9px] text-text-secondary shrink-0 font-semibold">{done}/{total}</span>
                      </div>
                    </div>
                    {pct >= 100 && <span className="text-sm shrink-0 animate-bounce-gentle">✅</span>}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* ═══ MOTIVATION ═══ */}
        {isAuth && (
          <div className="glass-card rounded-2xl p-5 text-center relative overflow-hidden">
            <div className="absolute inset-0 opacity-30"
              style={{ background: 'radial-gradient(circle at 50% 0%, rgba(108,93,211,0.15), transparent 60%)' }} />
            <span className="text-2xl block mb-2 animate-float relative z-10">💬</span>
            <p className="text-sm text-text-primary leading-relaxed italic relative z-10">«{motivation}»</p>
          </div>
        )}

      </div>
    </div>
  );
};
