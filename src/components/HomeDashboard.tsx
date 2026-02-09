
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

// ─── Helpers ────────────────────────────────────────────────────
const getGreeting = () => {
  const h = new Date().getHours();
  if (h < 5) return 'Ночной дозор';
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
    if (diff < 7) return `${diff} дн.`;
    return date.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' });
  } catch { return '—'; }
};

const fmtTime = (d: Date | string) => {
  try { return new Date(d).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' }); }
  catch { return ''; }
};

const ytThumb = (url?: string) => {
  if (!url) return null;
  const m = url.match(/(?:youtu\.be\/|v=|embed\/)([^#&?]{11})/);
  return m ? `https://img.youtube.com/vi/${m[1]}/mqdefault.jpg` : null;
};

// Section card background images (dark, business, abstract)
const SECTION_BG: Record<string, string> = {
  MODULES:   'https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?w=400&h=200&fit=crop&q=60',
  ARENA:     'https://images.unsplash.com/photo-1552664730-d307ca884978?w=400&h=200&fit=crop&q=60',
  HABITS:    'https://images.unsplash.com/photo-1484480974693-6ca0a78fb36b?w=400&h=200&fit=crop&q=60',
  STREAMS:   'https://images.unsplash.com/photo-1516321497487-e288fb19713f?w=400&h=200&fit=crop&q=60',
  NOTEBOOK:  'https://images.unsplash.com/photo-1517842645767-c639042777db?w=400&h=200&fit=crop&q=60',
  MATERIALS: 'https://images.unsplash.com/photo-1521737604893-d14cc237f11d?w=400&h=200&fit=crop&q=60',
};

const MOTIVATIONS = [
  'Дисциплина — это мост между целями и достижениями.',
  'Каждый эксперт когда-то был новичком.',
  'Успех — это сумма маленьких ежедневных усилий.',
  'Продажа — это решение проблемы клиента.',
  'Путь воина — постоянное совершенствование.',
  'Сила — в регулярности, а не в интенсивности.',
];

// ─── Small components ───────────────────────────────────────────
const Section = ({ title, action, onAction }: { title: string; action?: string; onAction?: () => void }) => (
  <div className="flex justify-between items-center mb-3 px-0.5">
    <h3 className="text-[13px] font-bold text-text-primary uppercase tracking-wide">{title}</h3>
    {action && onAction && (
      <button onClick={() => { telegram.haptic('selection'); onAction(); }}
        className="text-[11px] font-semibold text-text-secondary flex items-center gap-0.5 active:opacity-60 transition-opacity">
        {action}
        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
      </button>
    )}
  </div>
);

// ═════════════════════════════════════════════════════════════════
export const HomeDashboard: React.FC<HomeDashboardProps> = ({
  onNavigate, userProgress: u, onProfileClick,
  modules, materials, streams, scenarios,
  onSelectLesson, allUsers, appConfig,
}) => {
  const isAuth = u.isAuthenticated;
  const [programOpen, setProgramOpen] = useState(false);

  // ─── Stats ──────────────────────────────────────────────────
  const stats = useMemo(() => {
    const total = modules.reduce((a, m) => a + m.lessons.length, 0);
    const completed = u.completedLessonIds?.length || 0;
    const progress = total > 0 ? Math.round((completed / total) * 100) : 0;
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
    const habitsTotal = u.habits?.length || 0;
    const habitsDone = u.habits?.filter(h => h.completedDates?.includes(today))?.length || 0;

    const sorted = [...allUsers].sort((a, b) => b.xp - a.xp);
    const myRank = sorted.findIndex(x => x.name === u.name) + 1;

    return { total, completed, progress, streak, xpNext, xpIn, xpPct, nextLesson, nextModule, habitsTotal, habitsDone, myRank: myRank > 0 ? myRank : sorted.length + 1 };
  }, [u, modules, allUsers]);

  const upcoming = useMemo(() => {
    const now = new Date();
    return streams.filter(s => s.status === 'UPCOMING' || s.status === 'LIVE' || new Date(s.date) > now)
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()).slice(0, 2);
  }, [streams]);

  const motivation = useMemo(() => MOTIVATIONS[Math.floor((Date.now() / 86400000)) % MOTIVATIONS.length], []);

  const nav = (tab: Tab) => { telegram.haptic('selection'); onNavigate(tab); };

  // ═══════════════════════════════════════════════════════════
  return (
    <div className="min-h-screen bg-body/50 relative">

      {/* ═══ HEADER ═══ */}
      <div className="px-4 pt-[calc(var(--safe-top)+8px)] flex justify-between items-center sticky top-0 z-40 pb-3 island-blur bg-body/60">
        <div className="flex items-center gap-3 cursor-pointer" onClick={onProfileClick}>
          <div className="relative">
            <Avatar src={u.avatarUrl} name={u.name} className={`border border-border-color ${!isAuth ? 'opacity-50' : ''}`} />
            {isAuth && <div className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-emerald-500 border-2 border-body rounded-full" />}
          </div>
          <div>
            <p className="text-text-secondary text-[10px] font-semibold tracking-wider uppercase">{getGreeting()}</p>
            <h1 className="text-[15px] font-bold text-text-primary leading-tight">{u.name}</h1>
          </div>
        </div>
        {isAuth ? (
          <div className="glass-card rounded-lg px-3 py-1.5 flex items-center gap-1.5">
            <span className="text-[10px] font-bold text-text-secondary">XP</span>
            <span className="text-[13px] font-bold text-text-primary">{u.xp.toLocaleString()}</span>
          </div>
        ) : (
          <button onClick={onProfileClick} className="px-4 py-2 rounded-lg bg-text-primary text-body text-xs font-bold active:scale-95 transition-transform">
            Войти
          </button>
        )}
      </div>

      <div className="px-4 pt-4 pb-28 space-y-4 max-w-xl mx-auto desktop-max relative z-10">

        {/* ═══ WELCOME (unauth) ═══ */}
        {!isAuth && (
          <div className="rounded-2xl overflow-hidden glass-card animate-fade-in">
            {appConfig?.welcomeVideoUrl && appConfig.welcomeVideoUrl.length > 5 && (() => {
              const thumb = ytThumb(appConfig.welcomeVideoUrl);
              return thumb ? (
                <a href={appConfig.welcomeVideoUrl} target="_blank" rel="noopener noreferrer" className="block relative aspect-video w-full overflow-hidden">
                  <img src={thumb} alt="" className="w-full h-full object-cover" loading="lazy" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/30 to-transparent" />
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="w-14 h-14 rounded-full border-2 border-white/40 flex items-center justify-center bg-white/10 backdrop-blur-sm">
                      <svg className="w-6 h-6 text-white ml-0.5" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>
                    </div>
                  </div>
                  <div className="absolute bottom-3 left-4 right-4">
                    <h2 className="text-white text-base font-bold">Академия Продаж</h2>
                  </div>
                </a>
              ) : null;
            })()}
            <div className="p-4">
              <p className="text-text-secondary text-sm leading-relaxed mb-4">
                {appConfig?.welcomeMessage || 'Элитная подготовка. Программа курса доступна ниже.'}
              </p>
              <button onClick={onProfileClick}
                className="w-full py-3 bg-text-primary text-body rounded-xl font-bold text-sm active:scale-[0.98] transition-transform flex items-center justify-center gap-2">
                Начать обучение
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" /></svg>
              </button>
            </div>
          </div>
        )}

        {/* ═══ AUTH DASHBOARD ═══ */}
        {isAuth && (
          <>
            {/* ── Stat Row ── */}
            <div className="grid grid-cols-4 gap-2 animate-fade-in">
              {[
                { val: `${u.level}`, label: getRank(u.level) },
                { val: `${stats.streak}`, label: 'Серия' },
                { val: `${stats.progress}%`, label: 'Курс' },
                { val: `#${stats.myRank}`, label: 'Рейтинг' },
              ].map((s, i) => (
                <div key={i} className="glass-card rounded-xl p-2.5 text-center cursor-pointer active:scale-95 transition-transform"
                  onClick={() => nav(i === 3 ? Tab.RATING : Tab.PROFILE)}>
                  <p className="text-[15px] font-bold text-text-primary leading-none">{s.val}</p>
                  <p className="text-[8px] text-text-secondary uppercase font-bold tracking-widest mt-1">{s.label}</p>
                </div>
              ))}
            </div>

            {/* ── XP Bar ── */}
            <div className="glass-card rounded-xl p-3.5 animate-fade-in">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] font-bold text-text-secondary tracking-wider uppercase">Прогресс уровня</span>
                <span className="text-[10px] font-semibold text-text-secondary">{u.level} → {u.level + 1}</span>
              </div>
              <div className="w-full h-1.5 bg-border-color rounded-full overflow-hidden">
                <div className="h-full rounded-full transition-all duration-1000 bg-text-primary/70" style={{ width: `${stats.xpPct}%` }} />
              </div>
              <p className="text-[9px] text-text-secondary mt-1.5 text-right">{stats.xpIn} / {stats.xpNext}</p>
            </div>

            {/* ── Next Lesson ── */}
            {stats.nextLesson && stats.nextModule && (
              <div className="animate-slide-up">
                <Section title="Продолжить" />
                <button onClick={() => onSelectLesson(stats.nextLesson!)}
                  className="w-full rounded-2xl overflow-hidden text-left active:scale-[0.98] transition-transform relative">
                  {/* BG image */}
                  {(() => {
                    const thumb = ytThumb(stats.nextLesson!.videoUrl);
                    return (
                      <div className="relative">
                        {thumb && <img src={thumb} alt="" className="absolute inset-0 w-full h-full object-cover" loading="lazy" />}
                        <div className={`absolute inset-0 ${thumb ? 'bg-gradient-to-r from-black/85 via-black/70 to-black/50' : 'bg-card'}`} />
                        <div className="relative z-10 p-4 flex items-center gap-4">
                          <div className="w-12 h-12 rounded-xl border border-white/20 flex items-center justify-center bg-white/10 backdrop-blur-sm shrink-0">
                            <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className={`text-[9px] font-bold uppercase tracking-widest mb-0.5 ${thumb ? 'text-white/50' : 'text-text-secondary'}`}>{stats.nextModule!.title}</p>
                            <h4 className={`text-sm font-bold truncate ${thumb ? 'text-white' : 'text-text-primary'}`}>{stats.nextLesson!.title}</h4>
                            <div className={`flex items-center gap-3 mt-1 text-[10px] ${thumb ? 'text-white/40' : 'text-text-secondary'}`}>
                              {stats.nextLesson!.durationMinutes && <span>{stats.nextLesson!.durationMinutes} мин</span>}
                              <span>Урок {modules.flatMap(m => m.lessons).indexOf(stats.nextLesson!) + 1} из {stats.total}</span>
                            </div>
                          </div>
                        </div>
                        {/* Bottom progress */}
                        <div className="h-0.5 bg-white/10">
                          <div className="h-full bg-white/40 transition-all duration-700" style={{ width: `${stats.progress}%` }} />
                        </div>
                      </div>
                    );
                  })()}
                </button>
              </div>
            )}

            {/* ── Habits Mini ── */}
            {stats.habitsTotal > 0 && (
              <button onClick={() => nav(Tab.HABITS)}
                className="w-full glass-card rounded-xl p-3.5 text-left active:scale-[0.98] transition-transform animate-fade-in">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-[11px] font-bold text-text-secondary uppercase tracking-wider">Привычки</span>
                    <p className="text-[13px] font-bold text-text-primary mt-0.5">{stats.habitsDone} <span className="text-text-secondary font-normal">из {stats.habitsTotal}</span></p>
                  </div>
                  <div className="flex gap-1.5 items-center">
                    {Array.from({ length: Math.min(stats.habitsTotal, 6) }).map((_, i) => (
                      <div key={i} className={`w-2 h-6 rounded-sm transition-colors ${i < stats.habitsDone ? 'bg-text-primary/60' : 'bg-border-color'}`} />
                    ))}
                  </div>
                </div>
              </button>
            )}

            {/* ── Upcoming Streams ── */}
            {upcoming.length > 0 && (
              <div className="animate-fade-in">
                <Section title="Эфиры" action="Все" onAction={() => nav(Tab.STREAMS)} />
                <div className="space-y-2">
                  {upcoming.map(s => (
                    <button key={s.id} onClick={() => nav(Tab.STREAMS)}
                      className="w-full glass-card rounded-xl p-3 flex items-center gap-3 text-left active:scale-[0.98] transition-transform">
                      <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${s.status === 'LIVE' ? 'bg-red-500/10' : 'bg-border-color'}`}>
                        {s.status === 'LIVE'
                          ? <div className="w-2.5 h-2.5 rounded-full bg-red-500" />
                          : <svg className="w-4 h-4 text-text-secondary" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
                        }
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="text-[13px] font-semibold text-text-primary truncate">{s.title}</h4>
                        {s.status === 'LIVE'
                          ? <span className="text-[10px] font-bold text-red-500 uppercase">В эфире</span>
                          : <span className="text-[10px] text-text-secondary">{fmtDate(s.date)} · {fmtTime(s.date)}</span>
                        }
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </>
        )}

        {/* ═══ SECTIONS GRID — Cards with background images ═══ */}
        <div className="animate-fade-in">
          <Section title="Разделы" />
          <div className="grid grid-cols-2 tablet-grid gap-2.5">
            {[
              { id: Tab.MODULES, title: 'Курс', desc: `${modules.length} модулей`, bg: SECTION_BG.MODULES },
              { id: Tab.ARENA, title: 'Арена', desc: `${scenarios.length} сценариев`, bg: SECTION_BG.ARENA },
              { id: Tab.HABITS, title: 'Привычки', desc: 'Дисциплина', bg: SECTION_BG.HABITS },
              { id: Tab.STREAMS, title: 'Эфиры', desc: `${streams.length} записей`, bg: SECTION_BG.STREAMS },
              { id: Tab.NOTEBOOK, title: 'Блокнот', desc: `${u.notebook?.length || 0} записей`, bg: SECTION_BG.NOTEBOOK },
              { id: Tab.MATERIALS, title: 'Материалы', desc: `${materials.length} файлов`, bg: SECTION_BG.MATERIALS },
            ].map(item => (
              <button key={item.id} onClick={() => nav(item.id)}
                className="relative rounded-2xl overflow-hidden text-left active:scale-[0.97] transition-transform aspect-[4/3]">
                {/* BG Image */}
                <img src={item.bg} alt="" className="absolute inset-0 w-full h-full object-cover" loading="lazy" />
                {/* Dark overlay + glass frost at bottom */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-black/10" />
                {/* Demo badge */}
                {!isAuth && (
                  <div className="absolute top-2 right-2 px-1.5 py-0.5 rounded bg-white/10 backdrop-blur-sm">
                    <span className="text-[7px] font-bold text-white/60 uppercase tracking-wider">Preview</span>
                  </div>
                )}
                {/* Content */}
                <div className="absolute bottom-0 left-0 right-0 p-3">
                  <h4 className="font-bold text-white text-[13px] leading-tight">{item.title}</h4>
                  <p className="text-[10px] text-white/50 mt-0.5">{item.desc}</p>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* ═══ PROGRAM SPOILER ═══ */}
        {modules.length > 0 && (
          <div className="animate-fade-in">
            <button
              onClick={() => { setProgramOpen(p => !p); telegram.haptic('selection'); }}
              className="w-full glass-card rounded-xl p-3.5 flex items-center justify-between active:scale-[0.98] transition-transform"
            >
              <div className="flex items-center gap-3">
                <span className="text-[11px] font-bold text-text-secondary uppercase tracking-wider">Программа курса</span>
                <span className="text-[10px] text-text-secondary">{modules.length} модулей · {stats.total} уроков</span>
              </div>
              <svg className={`w-4 h-4 text-text-secondary transition-transform duration-300 ${programOpen ? 'rotate-180' : ''}`}
                fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>

            {/* Spoiler content */}
            <div className={`overflow-hidden transition-all duration-400 ease-out ${programOpen ? 'max-h-[2000px] opacity-100 mt-2' : 'max-h-0 opacity-0'}`}>
              <div className="space-y-1.5">
                {modules.map((m, i) => {
                  const total = m.lessons.length;
                  const done = m.lessons.filter(l => u.completedLessonIds?.includes(l.id)).length;
                  const pct = total > 0 ? Math.round((done / total) * 100) : 0;
                  return (
                    <button key={m.id}
                      onClick={() => { const f = m.lessons[0]; if (f) { telegram.haptic('selection'); onSelectLesson(f); } }}
                      className="w-full glass-card rounded-xl p-3 flex items-center gap-3 text-left active:scale-[0.98] transition-transform">
                      <div className="w-8 h-8 rounded-lg bg-border-color flex items-center justify-center text-[11px] font-bold text-text-secondary shrink-0">
                        {pct >= 100 ? '✓' : (i + 1)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="text-[13px] font-semibold text-text-primary truncate">{m.title}</h4>
                        <div className="flex items-center gap-2 mt-1">
                          <div className="flex-1 h-1 bg-border-color rounded-full overflow-hidden">
                            <div className="h-full bg-text-primary/50 rounded-full transition-all duration-500" style={{ width: `${pct}%` }} />
                          </div>
                          <span className="text-[9px] text-text-secondary shrink-0">{done}/{total}</span>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* ═══ QUOTE ═══ */}
        {isAuth && (
          <div className="glass-card rounded-xl p-4 animate-fade-in">
            <p className="text-[11px] text-text-secondary leading-relaxed text-center italic">«{motivation}»</p>
          </div>
        )}

      </div>
    </div>
  );
};
