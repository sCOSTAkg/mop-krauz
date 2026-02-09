
import React, { useMemo } from 'react';
import { Tab, UserProgress, Lesson, Material, Stream, ArenaScenario, AppNotification, Module, AppConfig } from '../types';
import { telegram } from '../services/telegramService';
import { Avatar } from '../utils/avatar';

// ─── Types ──────────────────────────────────────────────────────
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

// ─── Helpers ────────────────────────────────────────────────────
const getGreeting = () => {
  const h = new Date().getHours();
  if (h < 5) return 'Ночной дозор 🌙';
  if (h < 12) return 'Доброе утро ☀️';
  if (h < 18) return 'Добрый день 👋';
  return 'Добрый вечер 🌆';
};

const getRankTitle = (level: number): string => {
  if (level >= 20) return 'Легенда';
  if (level >= 15) return 'Командир';
  if (level >= 10) return 'Центурион';
  if (level >= 7) return 'Спартанец';
  if (level >= 5) return 'Воин';
  if (level >= 3) return 'Рекрут';
  return 'Новобранец';
};

const formatEventDate = (d: Date | string) => {
  try {
    const date = new Date(d);
    const now = new Date();
    const diff = date.getTime() - now.getTime();
    const days = Math.ceil(diff / 86400000);
    if (days === 0) return 'Сегодня';
    if (days === 1) return 'Завтра';
    if (days < 7) return `Через ${days} дн.`;
    return date.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' });
  } catch { return '—'; }
};

const formatTime = (d: Date | string) => {
  try { return new Date(d).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' }); }
  catch { return ''; }
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

const getYTThumb = (url?: string) => {
  if (!url) return null;
  const m = url.match(/(?:youtu\.be\/|v=|embed\/)([^#&?]{11})/);
  return m ? `https://img.youtube.com/vi/${m[1]}/mqdefault.jpg` : null;
};

// ─── Small components ───────────────────────────────────────────
const SectionHeader = ({ title, action, onAction }: { title: string; action?: string; onAction?: () => void }) => (
  <div className="flex justify-between items-center mb-3">
    <h3 className="text-sm font-bold text-text-primary">{title}</h3>
    {action && onAction && (
      <button onClick={() => { telegram.haptic('selection'); onAction(); }} className="text-[11px] font-bold text-[#6C5DD3] flex items-center gap-0.5 active:scale-95 py-1 px-1">
        {action}
        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" /></svg>
      </button>
    )}
  </div>
);

// ═════════════════════════════════════════════════════════════════
//                    HOME DASHBOARD
// ═════════════════════════════════════════════════════════════════
export const HomeDashboard: React.FC<HomeDashboardProps> = ({
  onNavigate, userProgress: u, onProfileClick,
  modules, materials, streams, scenarios,
  onSelectLesson, onUpdateUser, allUsers,
  notifications, appConfig,
}) => {
  const isAuth = u.isAuthenticated;

  // ─── Computed stats ─────────────────────────────────────────
  const stats = useMemo(() => {
    const allLessons = modules.flatMap(m => m.lessons);
    const total = allLessons.length;
    const completed = u.completedLessonIds?.length || 0;
    const progress = total > 0 ? Math.round((completed / total) * 100) : 0;
    const homeworks = u.submittedHomeworks?.length || 0;
    const bestStreak = Math.max(0, ...(u.habits?.map(h => h.streak) || [0]));
    const xpForNext = 1000;
    const xpInLevel = u.xp % xpForNext;
    const xpPercent = Math.round((xpInLevel / xpForNext) * 100);

    // Next lesson to continue
    let nextLesson: Lesson | null = null;
    let nextModule: Module | null = null;
    for (const m of modules) {
      for (const l of m.lessons) {
        if (!u.completedLessonIds?.includes(l.id)) {
          nextLesson = l;
          nextModule = m;
          break;
        }
      }
      if (nextLesson) break;
    }

    // Today's habits progress
    const today = new Date().toISOString().split('T')[0];
    const habitsTotal = u.habits?.length || 0;
    const habitsDoneToday = u.habits?.filter(h => h.completedDates?.includes(today))?.length || 0;

    // Rank
    const myRank = [...allUsers].sort((a, b) => b.xp - a.xp).findIndex(x => x.name === u.name) + 1;

    return {
      total, completed, progress, homeworks, bestStreak,
      xpForNext, xpInLevel, xpPercent,
      nextLesson, nextModule,
      habitsTotal, habitsDoneToday,
      myRank: myRank > 0 ? myRank : allUsers.length + 1,
    };
  }, [u, modules, allUsers]);

  // ─── Upcoming events & streams ──────────────────────────────
  const upcoming = useMemo(() => {
    const now = new Date();
    const upcomingStreams = streams
      .filter(s => s.status === 'UPCOMING' || s.status === 'LIVE' || new Date(s.date) > now)
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
      .slice(0, 2);
    return upcomingStreams;
  }, [streams]);

  // ─── Daily motivation ───────────────────────────────────────
  const motivation = useMemo(() => {
    const dayOfYear = Math.floor((Date.now() - new Date(new Date().getFullYear(), 0, 0).getTime()) / 86400000);
    return MOTIVATIONS[dayOfYear % MOTIVATIONS.length];
  }, []);

  const nav = (tab: Tab) => { telegram.haptic('selection'); onNavigate(tab); };

  // ═══════════════════════════════════════════════════════════
  //                       RENDER
  // ═══════════════════════════════════════════════════════════
  return (
    <div className="min-h-screen bg-body relative">
      {/* ═══ HEADER ═══ */}
      <div className="px-4 pt-[calc(var(--safe-top)+8px)] flex justify-between items-center sticky top-0 z-40 pb-3 backdrop-blur-md bg-body/80 border-b border-border-color">
        <div className="flex items-center gap-3 cursor-pointer" onClick={onProfileClick}>
          <div className="relative">
            <Avatar src={u.avatarUrl} name={u.name} className={`border border-border-color ${!isAuth ? 'opacity-60' : ''}`} />
            {isAuth && <div className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-[#34C759] border-2 border-surface rounded-full" />}
          </div>
          <div>
            <p className="text-text-secondary text-[10px] font-medium">{getGreeting()}</p>
            <h1 className="text-sm font-bold text-text-primary leading-none">{u.name}</h1>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {isAuth && (
            <div className="flex items-center gap-1.5 bg-card border border-border-color rounded-xl px-3 py-1.5">
              <span className="text-xs">⚡</span>
              <span className="text-xs font-bold text-text-primary">{u.xp.toLocaleString()}</span>
            </div>
          )}
          {!isAuth && (
            <button onClick={onProfileClick} className="px-4 py-2 rounded-xl bg-[#6C5DD3] text-white text-xs font-bold shadow-sm active:scale-95">
              Войти
            </button>
          )}
        </div>
      </div>

      <div className="px-4 pt-4 pb-28 space-y-5 animate-fade-in max-w-xl mx-auto relative z-10">

        {/* ═══ WELCOME (UNAUTH) ═══ */}
        {!isAuth && (
          <div className="bg-card rounded-2xl overflow-hidden shadow-sm border border-border-color animate-slide-up">
            {appConfig?.welcomeVideoUrl && appConfig.welcomeVideoUrl.length > 5 && (
              <div className="relative aspect-video w-full bg-black overflow-hidden">
                {(() => {
                  const thumb = getYTThumb(appConfig.welcomeVideoUrl);
                  return thumb ? (
                    <a href={appConfig.welcomeVideoUrl} target="_blank" rel="noopener noreferrer" className="block w-full h-full relative">
                      <img src={thumb} alt="" className="w-full h-full object-cover" loading="lazy" />
                      <div className="absolute inset-0 flex items-center justify-center bg-black/20">
                        <div className="w-14 h-14 bg-white/20 backdrop-blur-md rounded-full flex items-center justify-center">
                          <svg className="w-6 h-6 text-white ml-0.5" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>
                        </div>
                      </div>
                    </a>
                  ) : (
                    <div className="w-full h-full bg-gradient-to-br from-[#6C5DD3] to-[#7B6FE0] flex items-center justify-center">
                      <span className="text-4xl">🎓</span>
                    </div>
                  );
                })()}
              </div>
            )}
            <div className="p-5">
              <h2 className="text-lg font-bold text-text-primary mb-2">Академия Продаж</h2>
              <p className="text-text-secondary text-sm leading-relaxed mb-4">
                {appConfig?.welcomeMessage || 'Элитная подготовка. Смотрите программу курса ниже — доступ к материалам откроется после авторизации.'}
              </p>
              <button
                onClick={onProfileClick}
                className="w-full py-3.5 bg-[#6C5DD3] text-white rounded-xl font-bold text-sm shadow-sm active:scale-[0.98] transition-all flex items-center justify-center gap-2"
              >
                <span>Начать обучение</span>
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M17 8l4 4m0 0l-4 4m4-4H3" /></svg>
              </button>
            </div>
          </div>
        )}

        {/* ═══ AUTHENTICATED DASHBOARD ═══ */}
        {isAuth && (
          <>
            {/* ── Stats Row ── */}
            <div className="grid grid-cols-4 gap-2 animate-slide-up">
              {[
                { icon: '🛡️', val: u.level, sub: getRankTitle(u.level) },
                { icon: '🔥', val: stats.bestStreak, sub: 'Серия' },
                { icon: '📦', val: `${stats.progress}%`, sub: 'Курс' },
                { icon: '🏆', val: `#${stats.myRank}`, sub: 'Рейтинг' },
              ].map((s, i) => (
                <div key={i} className="bg-card rounded-xl border border-border-color p-3 text-center">
                  <span className="text-base">{s.icon}</span>
                  <p className="text-sm font-bold text-text-primary mt-0.5">{s.val}</p>
                  <p className="text-[8px] text-text-secondary uppercase font-bold">{s.sub}</p>
                </div>
              ))}
            </div>

            {/* ── XP Progress ── */}
            <div className="bg-card rounded-2xl border border-border-color p-4 animate-slide-up">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className="text-base">⚡</span>
                  <span className="text-sm font-bold text-text-primary">{u.xp.toLocaleString()} XP</span>
                </div>
                <span className="text-[10px] font-bold text-text-secondary">Lvl {u.level} → {u.level + 1}</span>
              </div>
              <div className="w-full h-2 bg-body rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-700"
                  style={{ width: `${stats.xpPercent}%`, background: 'linear-gradient(90deg, #6C5DD3, #8B7FE8)' }}
                />
              </div>
              <p className="text-[9px] text-text-secondary mt-1.5">{stats.xpInLevel} / {stats.xpForNext} XP до следующего уровня</p>
            </div>

            {/* ── Next Lesson Card ── */}
            {stats.nextLesson && stats.nextModule && (
              <div className="animate-slide-up">
                <SectionHeader title="Продолжить обучение" />
                <button
                  onClick={() => onSelectLesson(stats.nextLesson!)}
                  className="w-full bg-card rounded-2xl border border-border-color overflow-hidden text-left active:scale-[0.98] transition-all shadow-sm"
                >
                  <div className="flex gap-3 p-4">
                    {/* Thumbnail */}
                    {(() => {
                      const thumb = getYTThumb(stats.nextLesson!.videoUrl);
                      return thumb ? (
                        <div className="w-20 h-14 rounded-xl overflow-hidden shrink-0 relative">
                          <img src={thumb} alt="" className="w-full h-full object-cover" loading="lazy" />
                          <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                            <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>
                          </div>
                        </div>
                      ) : (
                        <div className="w-20 h-14 rounded-xl bg-[#6C5DD3]/10 flex items-center justify-center shrink-0">
                          <span className="text-xl">📖</span>
                        </div>
                      );
                    })()}
                    <div className="flex-1 min-w-0">
                      <p className="text-[9px] font-bold text-[#6C5DD3] uppercase mb-0.5">{stats.nextModule!.title}</p>
                      <h4 className="text-sm font-bold text-text-primary truncate">{stats.nextLesson!.title}</h4>
                      <div className="flex items-center gap-2 mt-1.5">
                        <div className="flex items-center gap-3 text-[10px] text-text-secondary">
                          {stats.nextLesson!.durationMinutes && (
                            <span>⏱ {stats.nextLesson!.durationMinutes} мин</span>
                          )}
                          <span>📦 Урок {modules.flatMap(m => m.lessons).indexOf(stats.nextLesson!) + 1}/{stats.total}</span>
                        </div>
                      </div>
                    </div>
                    <div className="self-center shrink-0">
                      <div className="w-9 h-9 rounded-xl bg-[#6C5DD3] flex items-center justify-center">
                        <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>
                      </div>
                    </div>
                  </div>
                  {/* Progress bar under card */}
                  <div className="h-1 bg-body">
                    <div className="h-full bg-[#6C5DD3] transition-all duration-500" style={{ width: `${stats.progress}%` }} />
                  </div>
                </button>
              </div>
            )}

            {/* ── Daily Habits Mini ── */}
            {stats.habitsTotal > 0 && (
              <div className="animate-slide-up">
                <button
                  onClick={() => nav(Tab.HABITS)}
                  className="w-full bg-card rounded-2xl border border-border-color p-4 text-left active:scale-[0.98] transition-all"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-[#FF9500]/10 flex items-center justify-center">
                        <span className="text-lg">🔥</span>
                      </div>
                      <div>
                        <h4 className="text-sm font-bold text-text-primary">Привычки сегодня</h4>
                        <p className="text-[10px] text-text-secondary">{stats.habitsDoneToday} из {stats.habitsTotal} выполнено</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {/* Mini progress dots */}
                      <div className="flex gap-1">
                        {Array.from({ length: Math.min(stats.habitsTotal, 5) }).map((_, i) => (
                          <div
                            key={i}
                            className={`w-2.5 h-2.5 rounded-full transition-colors ${i < stats.habitsDoneToday ? 'bg-[#FF9500]' : 'bg-body border border-border-color'}`}
                          />
                        ))}
                      </div>
                      <svg className="w-4 h-4 text-text-secondary" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                    </div>
                  </div>
                </button>
              </div>
            )}

            {/* ── Upcoming Events/Streams ── */}
            {upcoming.length > 0 && (
              <div className="animate-slide-up">
                <SectionHeader title="Ближайшие эфиры" action="Все" onAction={() => nav(Tab.STREAMS)} />
                <div className="space-y-2">
                  {upcoming.map(s => (
                    <button
                      key={s.id}
                      onClick={() => nav(Tab.STREAMS)}
                      className="w-full bg-card rounded-xl border border-border-color p-3 flex items-center gap-3 text-left active:scale-[0.98] transition-all"
                    >
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${s.status === 'LIVE' ? 'bg-[#FF3B30]/10' : 'bg-[#6C5DD3]/10'}`}>
                        <span className="text-lg">{s.status === 'LIVE' ? '🔴' : '📡'}</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="text-sm font-bold text-text-primary truncate">{s.title}</h4>
                        <div className="flex items-center gap-2 mt-0.5">
                          {s.status === 'LIVE' ? (
                            <span className="text-[10px] font-bold text-[#FF3B30] uppercase animate-pulse">● В эфире</span>
                          ) : (
                            <span className="text-[10px] text-text-secondary">{formatEventDate(s.date)} · {formatTime(s.date)}</span>
                          )}
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </>
        )}

        {/* ═══ QUICK ACTIONS GRID ═══ */}
        <div className="animate-slide-up">
          <SectionHeader title="Разделы" />
          <div className="grid grid-cols-2 gap-2.5">
            {[
              { id: Tab.MODULES, title: 'Курс', icon: '📦', desc: `${modules.length} модулей`, color: '#6C5DD3' },
              { id: Tab.ARENA, title: 'Арена', icon: '⚔️', desc: `${scenarios.length} сценариев`, color: '#FF3B30' },
              { id: Tab.HABITS, title: 'Привычки', icon: '🔥', desc: 'Дисциплина', color: '#FF9500' },
              { id: Tab.STREAMS, title: 'Эфиры', icon: '📡', desc: `${streams.length} записей`, color: '#007AFF' },
              { id: Tab.NOTEBOOK, title: 'Блокнот', icon: '📝', desc: `${u.notebook?.length || 0} записей`, color: '#34C759' },
              { id: Tab.MATERIALS, title: 'Материалы', icon: '📎', desc: `${materials.length} файлов`, color: '#AF52DE' },
            ].map(item => (
              <button
                key={item.id}
                onClick={() => nav(item.id)}
                className="bg-card p-4 rounded-2xl text-left border border-border-color transition-all active:scale-95 shadow-sm relative overflow-hidden"
              >
                {!isAuth && (
                  <div className="absolute top-2.5 right-2.5">
                    <span className="text-[8px] font-bold text-text-secondary/40 uppercase">Demo</span>
                  </div>
                )}
                <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xl mb-3" style={{ backgroundColor: `${item.color}10` }}>
                  {item.icon}
                </div>
                <h4 className="font-bold text-text-primary text-sm">{item.title}</h4>
                <p className="text-[10px] text-text-secondary mt-0.5">{item.desc}</p>
              </button>
            ))}
          </div>
        </div>

        {/* ═══ MODULES PREVIEW (compact, max 3) ═══ */}
        {modules.length > 0 && (
          <div className="animate-slide-up">
            <SectionHeader title="Программа" action={`${modules.length} модулей`} onAction={() => nav(Tab.MODULES)} />
            <div className="space-y-2">
              {modules.slice(0, 3).map((m, i) => {
                const lessonsInModule = m.lessons.length;
                const completedInModule = m.lessons.filter(l => u.completedLessonIds?.includes(l.id)).length;
                const moduleProgress = lessonsInModule > 0 ? Math.round((completedInModule / lessonsInModule) * 100) : 0;

                return (
                  <button
                    key={m.id}
                    onClick={() => {
                      const first = m.lessons[0];
                      if (first) { telegram.haptic('selection'); onSelectLesson(first); }
                    }}
                    className="w-full bg-card rounded-xl border border-border-color p-3.5 flex items-center gap-3 text-left active:scale-[0.98] transition-all"
                  >
                    <div className="w-10 h-10 rounded-xl bg-[#6C5DD3]/10 flex items-center justify-center text-sm font-bold text-[#6C5DD3] shrink-0">
                      {i + 1}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="text-sm font-bold text-text-primary truncate">{m.title}</h4>
                      <div className="flex items-center gap-2 mt-1">
                        <div className="flex-1 h-1.5 bg-body rounded-full overflow-hidden">
                          <div className="h-full bg-[#6C5DD3] rounded-full transition-all" style={{ width: `${moduleProgress}%` }} />
                        </div>
                        <span className="text-[9px] text-text-secondary shrink-0">{completedInModule}/{lessonsInModule}</span>
                      </div>
                    </div>
                    {moduleProgress >= 100 && <span className="text-sm shrink-0">✅</span>}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* ═══ MOTIVATION ═══ */}
        {isAuth && (
          <div className="bg-card rounded-2xl border border-border-color p-5 text-center animate-slide-up">
            <span className="text-2xl block mb-2">💬</span>
            <p className="text-sm text-text-primary leading-relaxed italic">«{motivation}»</p>
          </div>
        )}

      </div>
    </div>
  );
};
