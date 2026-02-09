
import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { UserProgress, CalendarEvent, AppConfig, Tab, SmartNavAction, Module, AppTheme } from '../types';
import { CalendarView } from './CalendarView';
import { telegram } from '../services/telegramService';
import { Avatar } from '../utils/avatar';
import { XPService, XP_RULES } from '../services/xpService';
import { Storage } from '../services/storage';
import { verifyStoryScreenshot } from '../services/geminiService';
import { Auth } from './Auth';

// ─── Types ──────────────────────────────────────────────────────
interface ProfileProps {
  userProgress: UserProgress;
  onLogout: () => void;
  allUsers: UserProgress[];
  onUpdateUser: (updatedUser: Partial<UserProgress>) => void;
  events: CalendarEvent[];
  activeTabOverride?: string;
  onLogin: (data: any) => void;
  onNavigate: (tab: Tab) => void;
  setNavAction?: (action: SmartNavAction | null) => void;
  modules?: Module[];
}

type ProfileTab = 'STATS' | 'CALENDAR' | 'RATING' | 'SETTINGS';

// ─── Style constants ────────────────────────────────────────────
const cl = {
  card: 'bg-card rounded-2xl border border-border-color',
  input: 'w-full bg-body p-3 rounded-xl text-sm font-medium text-text-primary outline-none border border-border-color focus:border-[#6C5DD3] transition-all',
  label: 'text-[10px] font-bold text-text-secondary uppercase ml-1 block mb-1',
  accent: '#6C5DD3',
};

// ─── Helpers ────────────────────────────────────────────────────
const formatDate = (d?: string) => {
  if (!d) return '—';
  try { return new Date(d).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' }); }
  catch { return '—'; }
};

const daysSince = (d?: string) => {
  if (!d) return 0;
  try { return Math.floor((Date.now() - new Date(d).getTime()) / 86400000); }
  catch { return 0; }
};

const getRankTitle = (level: number): { title: string; icon: string } => {
  if (level >= 20) return { title: 'Легенда', icon: '🏛️' };
  if (level >= 15) return { title: 'Командир', icon: '⚔️' };
  if (level >= 10) return { title: 'Центурион', icon: '🛡️' };
  if (level >= 7) return { title: 'Спартанец', icon: '🗡️' };
  if (level >= 5) return { title: 'Воин', icon: '💪' };
  if (level >= 3) return { title: 'Рекрут', icon: '🏃' };
  return { title: 'Новобранец', icon: '🌱' };
};

// ─── Small components ───────────────────────────────────────────
const ProgressRing = ({ percent, size = 60, stroke = 5, color = cl.accent }: { percent: number; size?: number; stroke?: number; color?: string }) => {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const offset = c * (1 - Math.min(percent, 100) / 100);
  return (
    <svg width={size} height={size} className="transform -rotate-90">
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="currentColor" className="text-border-color" strokeWidth={stroke} />
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth={stroke} strokeLinecap="round" strokeDasharray={c} strokeDashoffset={offset} className="transition-all duration-700" />
    </svg>
  );
};

const Toggle = ({ label, value, onChange, icon }: { label: string; value: boolean; onChange: () => void; icon?: string }) => (
  <div className="flex items-center justify-between py-2">
    <div className="flex items-center gap-2">
      {icon && <span className="text-sm">{icon}</span>}
      <span className="text-sm text-text-primary">{label}</span>
    </div>
    <button onClick={onChange} className={`w-11 h-6 rounded-full p-0.5 transition-colors ${value ? 'bg-[#6C5DD3]' : 'bg-body border border-border-color'}`}>
      <div className={`w-5 h-5 bg-white rounded-full shadow-sm transition-transform ${value ? 'translate-x-5' : ''}`} />
    </button>
  </div>
);

const Badge = ({ icon, label, earned, desc }: { icon: string; label: string; earned: boolean; desc?: string }) => (
  <div className={`flex flex-col items-center p-3 rounded-xl border transition-all ${earned ? 'border-[#6C5DD3]/30 bg-[#6C5DD3]/5' : 'border-border-color bg-body opacity-40 grayscale'}`}>
    <span className="text-2xl mb-1">{icon}</span>
    <span className="text-[10px] font-bold text-text-primary text-center leading-tight">{label}</span>
    {desc && <span className="text-[8px] text-text-secondary mt-0.5">{desc}</span>}
  </div>
);

// ═════════════════════════════════════════════════════════════════
//                     MAIN COMPONENT
// ═════════════════════════════════════════════════════════════════
export const Profile: React.FC<ProfileProps> = ({
  userProgress, onLogout, allUsers, onUpdateUser, events,
  activeTabOverride, onLogin, onNavigate, setNavAction, modules = [],
}) => {
  const [activeTab, setActiveTab] = useState<ProfileTab>((activeTabOverride as ProfileTab) || 'STATS');
  const u = userProgress;

  // ─── Settings State ─────────────────────────────────────────
  const [editName, setEditName] = useState(u.name || '');
  const [editTelegram, setEditTelegram] = useState(u.telegramUsername || '');
  const [editInstagram, setEditInstagram] = useState(u.instagram || '');
  const [editAbout, setEditAbout] = useState(u.aboutMe || '');
  const [editDossier, setEditDossier] = useState(u.dossier || {});
  const safeNotifs = u.notifications || { pushEnabled: false, telegramSync: false, deadlineReminders: false, chatNotifications: false };
  const [editNotifs, setEditNotifs] = useState(safeNotifs);
  const [isSaving, setIsSaving] = useState(false);

  // ─── Story verification ─────────────────────────────────────
  const storyInputRef = useRef<HTMLInputElement>(null);
  const [verifyingStory, setVerifyingStory] = useState(false);

  // ─── Config ─────────────────────────────────────────────────
  const appConfig = Storage.get<AppConfig>('appConfig', {} as any);
  const inviteBase = appConfig?.integrations?.inviteBaseUrl || 'https://t.me/SalesProBot?start=ref_';
  const inviteLink = `${inviteBase}${u.telegramUsername || 'unknown'}`;

  // ─── Computed stats ─────────────────────────────────────────
  const stats = useMemo(() => {
    const s = u.stats || XPService.getInitStats();
    const allLessons = modules.flatMap(m => m.lessons);
    const totalLessons = allLessons.length;
    const completed = u.completedLessonIds?.length || 0;
    const homeworks = u.submittedHomeworks?.length || 0;
    const coursePercent = totalLessons > 0 ? Math.round((completed / totalLessons) * 100) : 0;
    const xpForNext = 1000;
    const xpInLevel = u.xp % xpForNext;
    const xpPercent = Math.round((xpInLevel / xpForNext) * 100);
    const rank = getRankTitle(u.level);
    const bestStreak = Math.max(0, ...(u.habits?.map(h => h.streak) || [0]));
    const notebookCount = u.notebook?.length || 0;
    const goalsTotal = u.goals?.length || 0;
    const goalsCompleted = u.goals?.filter(g => g.isCompleted)?.length || 0;
    const daysOnPlatform = daysSince(u.registrationDate);

    return {
      ...s, totalLessons, completed, homeworks, coursePercent,
      xpForNext, xpInLevel, xpPercent, rank,
      bestStreak, notebookCount, goalsTotal, goalsCompleted, daysOnPlatform,
    };
  }, [u, modules]);

  // ─── Achievements ───────────────────────────────────────────
  const achievements = useMemo(() => [
    { icon: '🎯', label: 'Первый урок', earned: stats.completed >= 1, desc: 'Пройти 1 урок' },
    { icon: '📚', label: 'Студент', earned: stats.completed >= 5, desc: '5 уроков' },
    { icon: '🏆', label: 'Знаток', earned: stats.completed >= 20, desc: '20 уроков' },
    { icon: '✍️', label: 'Автор', earned: stats.homeworks >= 1, desc: '1 домашка' },
    { icon: '📝', label: 'Прилежный', earned: stats.homeworks >= 10, desc: '10 домашек' },
    { icon: '🔥', label: 'На серии', earned: stats.bestStreak >= 7, desc: '7 дней подряд' },
    { icon: '💬', label: 'Любопытный', earned: Object.values(stats.questionsAsked || {}).reduce((a: number, b: number) => a + b, 0) >= 10, desc: '10 вопросов' },
    { icon: '📡', label: 'Зритель', earned: (stats.streamsVisited?.length || 0) >= 3, desc: '3 эфира' },
    { icon: '📸', label: 'Амбассадор', earned: stats.storiesPosted >= 1, desc: '1 сторис' },
    { icon: '🤝', label: 'Рекрутер', earned: stats.referralsCount >= 1, desc: '1 реферал' },
    { icon: '💡', label: 'Инициатор', earned: stats.initiativesCount >= 1, desc: '1 инициатива' },
    { icon: '🎖️', label: 'Полный курс', earned: stats.coursePercent >= 100, desc: '100% курса' },
  ], [stats]);

  const earnedCount = achievements.filter(a => a.earned).length;

  // ─── Activity heatmap (real data from habits) ───────────────
  const activityData = useMemo(() => {
    const days = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];
    const counts = new Array(7).fill(0);
    const now = new Date();
    const weekStart = new Date(now);
    weekStart.setDate(now.getDate() - now.getDay() + (now.getDay() === 0 ? -6 : 1));
    weekStart.setHours(0, 0, 0, 0);

    (u.habits || []).forEach(h => {
      (h.completedDates || []).forEach(d => {
        const date = new Date(d);
        if (date >= weekStart) {
          const dayIdx = (date.getDay() + 6) % 7; // Monday=0
          counts[dayIdx]++;
        }
      });
    });

    const max = Math.max(1, ...counts);
    return days.map((label, i) => ({
      label,
      count: counts[i],
      percent: Math.round((counts[i] / max) * 100) || 5, // min 5% for visibility
    }));
  }, [u.habits]);

  // ─── Nav Action for Settings save ───────────────────────────
  const handleSaveSettings = useCallback(() => {
    setIsSaving(true);
    onUpdateUser({
      name: editName,
      telegramUsername: editTelegram,
      instagram: editInstagram,
      aboutMe: editAbout,
      dossier: editDossier,
      notifications: editNotifs,
    });
    telegram.haptic('success');
    setTimeout(() => setIsSaving(false), 400);
  }, [editName, editTelegram, editInstagram, editAbout, editDossier, editNotifs, onUpdateUser]);

  useEffect(() => {
    if (activeTab === 'SETTINGS' && setNavAction) {
      setNavAction({ label: isSaving ? 'СОХРАНЕНИЕ...' : 'СОХРАНИТЬ', onClick: handleSaveSettings, variant: 'primary', loading: isSaving, icon: '💾' });
    } else if (setNavAction) {
      setNavAction(null);
    }
  }, [activeTab, isSaving, handleSaveSettings, setNavAction]);

  // ─── Auth guard ─────────────────────────────────────────────
  if (!u.isAuthenticated) {
    return <div className="min-h-full"><Auth onLogin={onLogin} existingUsers={allUsers} /></div>;
  }

  // ─── Story handler ──────────────────────────────────────────
  const handleStoryFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setVerifyingStory(true);
    telegram.haptic('medium');
    const reader = new FileReader();
    reader.onloadend = async () => {
      const base64 = reader.result as string;
      const isValid = await verifyStoryScreenshot(base64);
      if (isValid) {
        const result = XPService.shareStory(u);
        if (result.allowed) {
          onUpdateUser(result.user);
          telegram.showAlert(`Скриншот принят! +${result.xp} XP`, 'Успех');
          telegram.haptic('success');
        } else {
          telegram.showAlert(result.message || 'Лимит исчерпан', 'Внимание');
        }
      } else {
        telegram.showAlert('ИИ не распознал сторис или упоминание курса. Попробуйте чёткий скриншот.', 'Ошибка');
        telegram.haptic('error');
      }
      setVerifyingStory(false);
    };
    reader.readAsDataURL(file);
  };

  const themeOptions: { value: AppTheme; label: string; icon: string; desc: string }[] = [
    { value: 'SYSTEM', label: 'Система', icon: '📱', desc: 'Как в устройстве' },
    { value: 'AUTO', label: 'Авто', icon: '🌓', desc: 'По времени дня' },
    { value: 'LIGHT', label: 'Светлая', icon: '☀️', desc: 'Всегда светлая' },
    { value: 'DARK', label: 'Тёмная', icon: '🌙', desc: 'Всегда тёмная' },
  ];

  const copyInviteLink = () => {
    navigator.clipboard.writeText(inviteLink);
    telegram.haptic('selection');
    telegram.showAlert(`Ссылка скопирована!`, 'Успех');
  };

  // ═══════════════════════════════════════════════════════════
  //                     RENDER SECTIONS
  // ═══════════════════════════════════════════════════════════

  // ─── STATS ──────────────────────────────────────────────────
  const renderStats = () => (
    <div className="space-y-4">
      {/* XP + Level Progress */}
      <div className={`${cl.card} p-5 animate-fade-in`}>
        <div className="flex items-center gap-4">
          <div className="relative">
            <ProgressRing percent={stats.xpPercent} size={72} stroke={6} />
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-lg font-bold text-text-primary">{u.level}</span>
            </div>
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-sm">{stats.rank.icon}</span>
              <span className="font-bold text-text-primary text-sm">{stats.rank.title}</span>
            </div>
            <div className="flex items-baseline gap-1.5 mb-2">
              <span className="text-2xl font-bold text-text-primary">{u.xp.toLocaleString()}</span>
              <span className="text-xs text-text-secondary">XP</span>
            </div>
            <div className="w-full h-2 bg-body rounded-full overflow-hidden">
              <div className="h-full bg-[#6C5DD3] rounded-full transition-all duration-700" style={{ width: `${stats.xpPercent}%` }} />
            </div>
            <p className="text-[10px] text-text-secondary mt-1">{stats.xpInLevel} / {stats.xpForNext} до уровня {u.level + 1}</p>
          </div>
        </div>
      </div>

      {/* Course Progress */}
      <div className={`${cl.card} p-5 animate-fade-in`}>
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-bold text-text-primary text-sm">Прогресс курса</h3>
          <span className="text-xs font-bold text-[#6C5DD3]">{stats.coursePercent}%</span>
        </div>
        <div className="w-full h-3 bg-body rounded-full overflow-hidden mb-4">
          <div
            className="h-full rounded-full transition-all duration-700"
            style={{ width: `${stats.coursePercent}%`, background: 'linear-gradient(90deg, #6C5DD3, #7B6FE0)' }}
          />
        </div>
        <div className="grid grid-cols-4 gap-2">
          {[
            ['📦', stats.completed, `/ ${stats.totalLessons}`, 'Уроков'],
            ['✍️', stats.homeworks, '', 'Домашек'],
            ['📝', stats.notebookCount, '', 'Записей'],
            ['🎯', stats.goalsCompleted, `/ ${stats.goalsTotal}`, 'Целей'],
          ].map(([icon, val, extra, label]) => (
            <div key={label as string} className="text-center">
              <span className="text-lg">{icon}</span>
              <p className="text-sm font-bold text-text-primary">{val}<span className="text-text-secondary text-[10px]">{extra}</span></p>
              <p className="text-[9px] text-text-secondary uppercase">{label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Quick Stats Grid */}
      <div className="grid grid-cols-2 gap-3 animate-fade-in">
        <button onClick={() => { telegram.haptic('medium'); onNavigate(Tab.HABITS); }} className={`${cl.card} p-4 text-left active:scale-95 transition-transform`}>
          <div className="w-8 h-8 bg-[#6C5DD3]/10 rounded-xl flex items-center justify-center text-lg mb-3">🔥</div>
          <h3 className="text-xl font-bold text-text-primary">{stats.bestStreak}</h3>
          <p className="text-xs text-text-secondary">Лучшая серия</p>
        </button>
        <button onClick={() => { telegram.haptic('medium'); onNavigate(Tab.NOTEBOOK); }} className={`${cl.card} p-4 text-left active:scale-95 transition-transform`}>
          <div className="w-8 h-8 bg-[#6C5DD3]/10 rounded-xl flex items-center justify-center text-lg mb-3">📅</div>
          <h3 className="text-xl font-bold text-text-primary">{stats.daysOnPlatform}</h3>
          <p className="text-xs text-text-secondary">Дней на курсе</p>
        </button>
      </div>

      {/* Activity Chart (real data) */}
      <div className={`${cl.card} p-5 animate-fade-in`}>
        <h3 className="font-bold text-text-primary text-sm mb-4">Активность за неделю</h3>
        <div className="flex items-end h-28 gap-2">
          {activityData.map((d, i) => (
            <div key={i} className="flex-1 flex flex-col items-center gap-1.5">
              <span className="text-[9px] font-bold text-text-secondary">{d.count || ''}</span>
              <div className="w-full bg-body rounded-lg relative h-full overflow-hidden">
                <div
                  className="absolute bottom-0 w-full rounded-lg transition-all duration-500"
                  style={{ height: `${d.percent}%`, background: d.count > 0 ? '#6C5DD3' : 'var(--border-color)' }}
                />
              </div>
              <span className="text-[10px] text-text-secondary">{d.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Achievements */}
      <div className={`${cl.card} p-5 animate-fade-in`}>
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-bold text-text-primary text-sm">Достижения</h3>
          <span className="text-xs font-bold text-[#6C5DD3]">{earnedCount} / {achievements.length}</span>
        </div>
        <div className="grid grid-cols-4 gap-2">
          {achievements.map((a, i) => (
            <Badge key={i} {...a} />
          ))}
        </div>
      </div>

      {/* Bonus Actions */}
      <div className={`${cl.card} p-4 grid grid-cols-2 gap-3 animate-fade-in`}>
        <button onClick={() => storyInputRef.current?.click()} disabled={verifyingStory} className="bg-[#6C5DD3] text-white p-4 rounded-xl active:scale-95 transition-transform">
          <input type="file" ref={storyInputRef} onChange={handleStoryFile} accept="image/*" className="hidden" />
          <div className="flex flex-col items-center">
            {verifyingStory
              ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin mb-1" />
              : <span className="text-xl mb-1">📸</span>
            }
            <span className="text-xs font-semibold">{verifyingStory ? 'Проверка...' : 'Story'}</span>
            <span className="text-[10px] opacity-70">+{XP_RULES.STORY_REPOST} XP</span>
          </div>
        </button>
        <button onClick={copyInviteLink} className={`${cl.card} text-text-primary p-4 rounded-xl active:scale-95 transition-transform`}>
          <div className="flex flex-col items-center">
            <span className="text-xl mb-1">🤝</span>
            <span className="text-xs font-semibold">Пригласить</span>
            <span className="text-[10px] text-text-secondary">+{XP_RULES.REFERRAL_FRIEND.toLocaleString()} XP</span>
          </div>
        </button>
      </div>
    </div>
  );

  // ─── LEADERBOARD ────────────────────────────────────────────
  const renderLeaderboard = () => {
    const combined = [...allUsers];
    if (!combined.find(x => x.telegramId === u.telegramId || x.name === u.name)) combined.push(u);
    const sorted = combined.sort((a, b) => b.xp - a.xp);
    const top3 = sorted.slice(0, 3);
    const rest = sorted.slice(3);
    const myRank = sorted.findIndex(x => x.telegramId === u.telegramId || x.name === u.name) + 1;

    return (
      <div className="space-y-4">
        {/* My Rank Banner */}
        {myRank > 0 && (
          <div className={`${cl.card} p-4 flex items-center justify-between animate-fade-in`}>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full overflow-hidden">
                <Avatar src={u.avatarUrl} name={u.name} size="w-full h-full" />
              </div>
              <div>
                <p className="text-sm font-bold text-text-primary">{u.name}</p>
                <p className="text-xs text-text-secondary">{u.xp.toLocaleString()} XP</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-2xl font-bold text-[#6C5DD3]">#{myRank}</span>
            </div>
          </div>
        )}

        {/* Top 3 Podium */}
        <div className={`${cl.card} p-5 animate-fade-in`}>
          <div className="flex justify-center items-end gap-4 mb-4">
            {top3[1] && (
              <div className="flex flex-col items-center">
                <div className="w-14 h-14 rounded-full border-2 border-border-color relative overflow-hidden">
                  <Avatar src={top3[1].avatarUrl} name={top3[1].name} size="w-full h-full" />
                  <div className="absolute -bottom-0.5 left-1/2 -translate-x-1/2 bg-text-secondary text-white text-[9px] font-bold px-1.5 rounded-full">2</div>
                </div>
                <span className="text-xs font-medium mt-2 text-text-primary">{top3[1].name}</span>
                <span className="text-[10px] text-text-secondary">{top3[1].xp.toLocaleString()}</span>
              </div>
            )}
            {top3[0] && (
              <div className="flex flex-col items-center -translate-y-3">
                <div className="w-20 h-20 rounded-full border-2 border-[#FFD700] relative overflow-hidden">
                  <Avatar src={top3[0].avatarUrl} name={top3[0].name} size="w-full h-full" />
                  <div className="absolute -top-4 left-1/2 -translate-x-1/2 text-2xl">👑</div>
                  <div className="absolute -bottom-0.5 left-1/2 -translate-x-1/2 bg-[#FFD700] text-black text-[9px] font-bold px-2 rounded-full">1</div>
                </div>
                <span className="text-sm font-bold mt-2 text-text-primary">{top3[0].name}</span>
                <span className="text-xs text-text-secondary">{top3[0].xp.toLocaleString()} XP</span>
              </div>
            )}
            {top3[2] && (
              <div className="flex flex-col items-center">
                <div className="w-14 h-14 rounded-full border-2 border-border-color relative overflow-hidden">
                  <Avatar src={top3[2].avatarUrl} name={top3[2].name} size="w-full h-full" />
                  <div className="absolute -bottom-0.5 left-1/2 -translate-x-1/2 bg-[#CD7F32] text-white text-[9px] font-bold px-1.5 rounded-full">3</div>
                </div>
                <span className="text-xs font-medium mt-2 text-text-primary">{top3[2].name}</span>
                <span className="text-[10px] text-text-secondary">{top3[2].xp.toLocaleString()}</span>
              </div>
            )}
          </div>
        </div>

        {/* Full List */}
        {rest.length > 0 && (
          <div className={`${cl.card} overflow-hidden animate-fade-in`}>
            {rest.map((x, i) => {
              const isMe = x.telegramId === u.telegramId || x.name === u.name;
              return (
                <div key={i} className={`p-3 flex items-center justify-between border-b border-border-color last:border-0 ${isMe ? 'bg-[#6C5DD3]/5' : ''}`}>
                  <div className="flex items-center gap-3">
                    <span className="text-text-secondary font-bold text-xs w-6 text-center">{i + 4}</span>
                    <Avatar src={x.avatarUrl} name={x.name} size="w-9 h-9" />
                    <div>
                      <p className="font-medium text-text-primary text-sm">{x.name} {isMe && <span className="text-[#6C5DD3] text-[10px]">(Вы)</span>}</p>
                      <p className="text-[10px] text-text-secondary">Lvl {x.level}</p>
                    </div>
                  </div>
                  <span className="font-bold text-text-primary text-sm">{x.xp.toLocaleString()}</span>
                </div>
              );
            })}
          </div>
        )}

        {/* Bonus Actions */}
        <div className={`${cl.card} p-4 grid grid-cols-2 gap-3 animate-fade-in`}>
          <button onClick={() => storyInputRef.current?.click()} disabled={verifyingStory} className="bg-[#6C5DD3] text-white p-4 rounded-xl active:scale-95 transition-transform">
            <input type="file" ref={storyInputRef} onChange={handleStoryFile} accept="image/*" className="hidden" />
            <div className="flex flex-col items-center">
              {verifyingStory
                ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin mb-1" />
                : <span className="text-xl mb-1">📸</span>}
              <span className="text-xs font-semibold">{verifyingStory ? 'Проверка...' : 'Story'}</span>
              <span className="text-[10px] opacity-70">+{XP_RULES.STORY_REPOST} XP</span>
            </div>
          </button>
          <button onClick={copyInviteLink} className={`${cl.card} text-text-primary p-4 rounded-xl active:scale-95 transition-transform`}>
            <div className="flex flex-col items-center">
              <span className="text-xl mb-1">🤝</span>
              <span className="text-xs font-semibold">Пригласить</span>
              <span className="text-[10px] text-text-secondary">+{XP_RULES.REFERRAL_FRIEND.toLocaleString()} XP</span>
            </div>
          </button>
        </div>
      </div>
    );
  };

  // ─── SETTINGS ───────────────────────────────────────────────
  const renderSettings = () => (
    <div className="space-y-4">
      {/* Theme */}
      <div className={`${cl.card} p-4 animate-fade-in`}>
        <h3 className="font-bold text-text-primary text-sm mb-3">Тема оформления</h3>
        <div className="grid grid-cols-4 gap-2">
          {themeOptions.map(opt => (
            <button
              key={opt.value}
              onClick={() => { onUpdateUser({ theme: opt.value }); telegram.haptic('selection'); }}
              className={`flex flex-col items-center p-3 rounded-xl border transition-all active:scale-95 ${u.theme === opt.value ? 'border-[#6C5DD3] bg-[#6C5DD3]/10' : 'border-border-color bg-body'}`}
            >
              <span className="text-xl mb-1">{opt.icon}</span>
              <span className="text-xs font-bold text-text-primary">{opt.label}</span>
              <span className="text-[9px] text-text-secondary mt-0.5 text-center leading-tight">{opt.desc}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Personal Info */}
      <div className={`${cl.card} p-4 space-y-3 animate-fade-in`}>
        <h3 className="font-bold text-text-primary text-sm">Личные данные</h3>
        <div>
          <label className={cl.label}>Имя</label>
          <input value={editName} onChange={e => setEditName(e.target.value)} className={cl.input} placeholder="Ваше имя" />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={cl.label}>Telegram</label>
            <input value={editTelegram} onChange={e => setEditTelegram(e.target.value)} className={cl.input} placeholder="@username" />
          </div>
          <div>
            <label className={cl.label}>Instagram</label>
            <input value={editInstagram} onChange={e => setEditInstagram(e.target.value)} className={cl.input} placeholder="@insta" />
          </div>
        </div>
        <div>
          <label className={cl.label}>О себе</label>
          <textarea value={editAbout} onChange={e => setEditAbout(e.target.value)} className={`${cl.input} resize-none h-20`} placeholder="Расскажите о себе..." />
        </div>
      </div>

      {/* Dossier */}
      <div className={`${cl.card} p-4 space-y-3 animate-fade-in`}>
        <h3 className="font-bold text-text-primary text-sm">Досье спартанца</h3>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={cl.label}>Дата рождения</label>
            <input type="date" value={editDossier.birthDate || ''} onChange={e => setEditDossier({ ...editDossier, birthDate: e.target.value })} className={cl.input} />
          </div>
          <div>
            <label className={cl.label}>Город</label>
            <input value={editDossier.location || ''} onChange={e => setEditDossier({ ...editDossier, location: e.target.value })} className={cl.input} placeholder="Город" />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={cl.label}>Рост</label>
            <input value={editDossier.height || ''} onChange={e => setEditDossier({ ...editDossier, height: e.target.value })} className={cl.input} placeholder="175 см" />
          </div>
          <div>
            <label className={cl.label}>Вес</label>
            <input value={editDossier.weight || ''} onChange={e => setEditDossier({ ...editDossier, weight: e.target.value })} className={cl.input} placeholder="70 кг" />
          </div>
        </div>
        <div>
          <label className={cl.label}>Опыт работы</label>
          <input value={editDossier.workExperience || ''} onChange={e => setEditDossier({ ...editDossier, workExperience: e.target.value })} className={cl.input} placeholder="2 года в продажах" />
        </div>
        <div>
          <label className={cl.label}>Цель по доходу</label>
          <input value={editDossier.incomeGoal || ''} onChange={e => setEditDossier({ ...editDossier, incomeGoal: e.target.value })} className={cl.input} placeholder="500 000 ₽/мес" />
        </div>
        <div>
          <label className={cl.label}>Ожидания от курса</label>
          <textarea value={editDossier.courseExpectations || ''} onChange={e => setEditDossier({ ...editDossier, courseExpectations: e.target.value })} className={`${cl.input} resize-none h-16`} placeholder="Чего ждёте от курса?" />
        </div>
        <div>
          <label className={cl.label}>Мотивация</label>
          <textarea value={editDossier.motivation || ''} onChange={e => setEditDossier({ ...editDossier, motivation: e.target.value })} className={`${cl.input} resize-none h-16`} placeholder="Что вас мотивирует?" />
        </div>
      </div>

      {/* Notification Preferences */}
      <div className={`${cl.card} p-4 animate-fade-in`}>
        <h3 className="font-bold text-text-primary text-sm mb-2">Уведомления</h3>
        <Toggle icon="📱" label="Push-уведомления" value={editNotifs.pushEnabled} onChange={() => setEditNotifs({ ...editNotifs, pushEnabled: !editNotifs.pushEnabled })} />
        <Toggle icon="✈️" label="Синхронизация с Telegram" value={editNotifs.telegramSync} onChange={() => setEditNotifs({ ...editNotifs, telegramSync: !editNotifs.telegramSync })} />
        <Toggle icon="⏰" label="Напоминания о дедлайнах" value={editNotifs.deadlineReminders} onChange={() => setEditNotifs({ ...editNotifs, deadlineReminders: !editNotifs.deadlineReminders })} />
        <Toggle icon="💬" label="Уведомления чата" value={editNotifs.chatNotifications} onChange={() => setEditNotifs({ ...editNotifs, chatNotifications: !editNotifs.chatNotifications })} />
      </div>

      {/* Account Info */}
      <div className={`${cl.card} p-4 space-y-2 animate-fade-in`}>
        <h3 className="font-bold text-text-primary text-sm mb-1">Аккаунт</h3>
        <div className="flex justify-between py-1">
          <span className="text-xs text-text-secondary">Роль</span>
          <span className="text-xs font-bold text-text-primary">{u.role}</span>
        </div>
        <div className="flex justify-between py-1">
          <span className="text-xs text-text-secondary">Telegram ID</span>
          <span className="text-xs font-mono text-text-primary">{u.telegramId || '—'}</span>
        </div>
        <div className="flex justify-between py-1">
          <span className="text-xs text-text-secondary">Дата регистрации</span>
          <span className="text-xs text-text-primary">{formatDate(u.registrationDate)}</span>
        </div>
        <div className="flex justify-between py-1">
          <span className="text-xs text-text-secondary">Дней на платформе</span>
          <span className="text-xs font-bold text-text-primary">{stats.daysOnPlatform}</span>
        </div>
      </div>

      {/* Logout */}
      <button
        onClick={() => {
          if (window.confirm('Выйти из аккаунта? Данные сохранены в Airtable.')) {
            onLogout();
          }
        }}
        className="w-full py-3.5 text-[#FF3B30] font-semibold text-sm rounded-xl bg-[#FF3B30]/5 border border-[#FF3B30]/20 transition-colors active:scale-95"
      >
        Выйти из аккаунта
      </button>
    </div>
  );

  // ═══════════════════════════════════════════════════════════
  //                    MAIN RENDER
  // ═══════════════════════════════════════════════════════════

  if (activeTabOverride) {
    return <div className="animate-fade-in">{renderLeaderboard()}</div>;
  }

  return (
    <div className="min-h-screen bg-body pb-28">
      {/* Header */}
      <div className="bg-card border-b border-border-color pb-6 pt-[calc(var(--safe-top)+12px)]">
        <div className="flex items-center justify-between px-4 mb-4">
          <span className="text-[10px] font-bold text-text-secondary bg-body px-3 py-1 rounded-lg uppercase">{u.role}</span>
          {stats.daysOnPlatform > 0 && (
            <span className="text-[10px] text-text-secondary">{stats.daysOnPlatform} дн. на курсе</span>
          )}
        </div>

        <div className="flex flex-col items-center px-4">
          <div className="relative mb-3">
            <div className="w-24 h-24 rounded-full border-2 border-border-color overflow-hidden">
              <Avatar src={u.avatarUrl} name={u.name} size="w-full h-full" />
            </div>
            {/* Level badge */}
            <div className="absolute -bottom-1 -right-1 bg-[#6C5DD3] text-white text-[10px] font-bold w-7 h-7 rounded-full flex items-center justify-center border-2 border-card">
              {u.level}
            </div>
          </div>
          <h1 className="text-xl font-bold text-text-primary mb-0.5">{u.name}</h1>
          <p className="text-[#6C5DD3] text-sm font-medium flex items-center gap-1">
            <span>{stats.rank.icon}</span>
            <span>{u.armorStyle || stats.rank.title}</span>
          </p>
          {u.aboutMe && (
            <p className="text-xs text-text-secondary mt-2 text-center max-w-[250px] leading-relaxed">{u.aboutMe}</p>
          )}
          {/* Mini stats row */}
          <div className="flex items-center gap-6 mt-3">
            <div className="text-center">
              <p className="text-sm font-bold text-text-primary">{u.xp.toLocaleString()}</p>
              <p className="text-[9px] text-text-secondary uppercase">XP</p>
            </div>
            <div className="w-px h-6 bg-border-color" />
            <div className="text-center">
              <p className="text-sm font-bold text-text-primary">{earnedCount}</p>
              <p className="text-[9px] text-text-secondary uppercase">Бейджи</p>
            </div>
            <div className="w-px h-6 bg-border-color" />
            <div className="text-center">
              <p className="text-sm font-bold text-text-primary">{stats.coursePercent}%</p>
              <p className="text-[9px] text-text-secondary uppercase">Курс</p>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="px-4 pt-4">
        <div className="bg-card p-1 rounded-xl border border-border-color flex mb-4">
          {([
            { id: 'STATS', label: '📊 Стат', },
            { id: 'CALENDAR', label: '📅 Дни' },
            { id: 'RATING', label: '🏆 Топ' },
            { id: 'SETTINGS', label: '⚙️ Настр.' },
          ] as const).map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 py-2.5 rounded-lg text-xs font-medium transition-all ${activeTab === tab.id ? 'bg-[#6C5DD3] text-white shadow-sm' : 'text-text-secondary'}`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="min-h-[300px]">
          {activeTab === 'STATS' && renderStats()}
          {activeTab === 'CALENDAR' && <CalendarView externalEvents={events} />}
          {activeTab === 'RATING' && renderLeaderboard()}
          {activeTab === 'SETTINGS' && renderSettings()}
        </div>
      </div>
    </div>
  );
};
