
import React, { useEffect, useState, useCallback, useRef } from 'react';
import { Tab, UserRole, AppNotification, SmartNavAction } from '../types';
import { telegram } from '../services/telegramService';

// ─── Types ──────────────────────────────────────────────────────
interface SmartNavProps {
  activeTab: Tab;
  setActiveTab: (tab: Tab) => void;
  role: UserRole;
  adminSubTab: string;
  setAdminSubTab: (tab: string) => void;
  isLessonActive: boolean;
  onExitLesson: () => void;
  notifications: AppNotification[];
  onClearNotifications: () => void;
  action?: SmartNavAction | null;
}

// ─── Tab configs ────────────────────────────────────────────────
interface TabItem {
  id: Tab;
  label: string;
  icon: React.ReactNode;
  primary?: boolean; // show in main bar
}

const HOME_ICON = <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />;
const MODULES_ICON = <><rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" /><rect x="3" y="14" width="7" height="7" rx="1" /><rect x="14" y="14" width="7" height="7" rx="1" /></>;
const PROFILE_ICON = <><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" /></>;
const ADMIN_ICON = <><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" /></>;

const ALL_TABS: TabItem[] = [
  { id: Tab.HOME, label: 'Главная', icon: HOME_ICON, primary: true },
  { id: Tab.MODULES, label: 'Курс', icon: MODULES_ICON, primary: true },
  { id: Tab.PROFILE, label: 'Профиль', icon: PROFILE_ICON, primary: true },
  { id: Tab.ARENA, label: 'Арена', icon: <><polygon points="13 2 3 14 12 14 11 22 21 10 12 10" /></> },
  { id: Tab.MATERIALS, label: 'Материалы', icon: <><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /></> },
  { id: Tab.STREAMS, label: 'Эфиры', icon: <><polygon points="23 7 16 12 23 17 23 7" /><rect x="1" y="5" width="15" height="14" rx="2" ry="2" /></> },
  { id: Tab.NOTEBOOK, label: 'Заметки', icon: <><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" /><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" /></> },
  { id: Tab.HABITS, label: 'Привычки', icon: <><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" /><polyline points="22 4 12 14.01 9 11.01" /></> },
  { id: Tab.RATING, label: 'Рейтинг', icon: <><path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z" /></> },
];

// ─── Admin sub-tab configs ──────────────────────────────────────
const ADMIN_SUBS = [
  { id: 'OVERVIEW', icon: '📊', label: 'Обзор' },
  { id: 'COURSE', icon: '🎓', label: 'Курс' },
  { id: 'MATERIALS', icon: '📎', label: 'Матер.' },
  { id: 'ARENA', icon: '⚔️', label: 'Арена' },
  { id: 'STREAMS', icon: '📡', label: 'Эфиры' },
  { id: 'CALENDAR', icon: '📅', label: 'Календ.' },
  { id: 'USERS', icon: '👥', label: 'Юзеры' },
  { id: 'SETTINGS', icon: '⚙️', label: 'Синхр.' },
];

// ─── Helpers ────────────────────────────────────────────────────
const formatNotifTime = (date?: string) => {
  if (!date) return '';
  try {
    const d = new Date(date);
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const mins = Math.floor(diffMs / 60000);
    if (mins < 1) return 'сейчас';
    if (mins < 60) return `${mins} мин`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs} ч`;
    const days = Math.floor(hrs / 24);
    return `${days} дн`;
  } catch { return ''; }
};

const NOTIF_ICONS: Record<string, string> = {
  INFO: 'ℹ️',
  SUCCESS: '✅',
  WARNING: '⚠️',
  ALERT: '🚨',
  XP: '⚡',
};

// ═════════════════════════════════════════════════════════════════
//                    SMART NAV COMPONENT
// ═════════════════════════════════════════════════════════════════

export const SmartNav: React.FC<SmartNavProps> = ({
  activeTab, setActiveTab, role,
  adminSubTab, setAdminSubTab,
  isLessonActive, onExitLesson,
  notifications, onClearNotifications, action,
}) => {
  const [showMore, setShowMore] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showAdmin, setShowAdmin] = useState(false);
  const backdropRef = useRef<HTMLDivElement>(null);

  const unreadCount = notifications.filter(n => !n.isRead).length;

  // Close overlays on tab change
  useEffect(() => {
    setShowAdmin(activeTab === Tab.ADMIN_DASHBOARD);
    setShowMore(false);
    setShowNotifications(false);
  }, [activeTab]);

  // Close more menu on outside click
  useEffect(() => {
    if (!showMore && !showNotifications) return;
    const handler = (e: MouseEvent) => {
      if (backdropRef.current && e.target === backdropRef.current) {
        setShowMore(false);
        setShowNotifications(false);
      }
    };
    document.addEventListener('click', handler);
    return () => document.removeEventListener('click', handler);
  }, [showMore, showNotifications]);

  const handleTabClick = useCallback((tab: Tab) => {
    telegram.haptic('selection');
    if (isLessonActive) onExitLesson();
    setActiveTab(tab);
    setShowMore(false);
    setShowNotifications(false);
  }, [isLessonActive, onExitLesson, setActiveTab]);

  const handleBack = useCallback(() => {
    telegram.haptic('medium');
    if (showNotifications) { setShowNotifications(false); return; }
    if (showMore) { setShowMore(false); return; }
    if (isLessonActive) onExitLesson();
    else setActiveTab(Tab.HOME);
  }, [showNotifications, showMore, isLessonActive, onExitLesson, setActiveTab]);

  // Primary tabs (always visible in bar)
  const primaryTabs = ALL_TABS.filter(t => t.primary);
  const moreTabs = ALL_TABS.filter(t => !t.primary);
  const isMainTab = [Tab.HOME, Tab.PROFILE, Tab.ADMIN_DASHBOARD, Tab.MODULES].includes(activeTab);
  const showBackButton = isLessonActive || (!isMainTab && !showMore);

  // ─── Render helpers ─────────────────────────────────────────

  const renderAction = () => {
    if (!action) return null;
    const cls: Record<string, string> = {
      primary: 'bg-accent',
      success: 'bg-[#34C759]',
      danger: 'bg-[#FF3B30]',
    };
    return (
      <div className="px-4 pb-2">
        <button
          onClick={action.onClick}
          disabled={action.loading}
          className={`w-full h-11 px-5 flex items-center justify-center gap-2 rounded-xl text-white font-semibold text-sm active:scale-[0.98] transition-all ${cls[action.variant || 'primary']}`}
        >
          {action.loading ? (
            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          ) : (
            <>
              {action.icon && <span className="text-sm">{action.icon}</span>}
              <span>{action.label}</span>
            </>
          )}
        </button>
      </div>
    );
  };

  return (
    <div className="fixed bottom-0 left-0 right-0 z-[100]">
      {/* ═══ Backdrop (for overlays) ═══ */}
      {(showMore || showNotifications) && (
        <div
          ref={backdropRef}
          className="fixed inset-0 bg-black/30 backdrop-blur-[2px] z-[99] animate-fade-in"
          onClick={() => { setShowMore(false); setShowNotifications(false); }}
        />
      )}

      {/* ═══ Notification Panel ═══ */}
      {showNotifications && (
        <div className="relative z-[101] bg-card border border-border-color rounded-t-2xl shadow-2xl mx-2 mb-0 animate-slide-up">
          <div className="px-4 pt-3.5 pb-2.5 flex justify-between items-center border-b border-border-color">
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold text-text-primary">Уведомления</span>
              {unreadCount > 0 && (
                <span className="bg-[#FF3B30] text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full min-w-[18px] text-center">{unreadCount}</span>
              )}
            </div>
            <div className="flex items-center gap-2">
              {notifications.length > 0 && (
                <button onClick={onClearNotifications} className="text-[10px] font-bold text-text-secondary uppercase hover:text-red-500 transition-colors px-2 py-1">
                  Очистить
                </button>
              )}
              <button
                onClick={() => setShowNotifications(false)}
                className="w-7 h-7 rounded-full bg-body flex items-center justify-center hover:bg-border-color transition-colors"
              >
                <svg className="w-3.5 h-3.5 text-text-secondary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>
          <div className="max-h-[45vh] overflow-y-auto no-scrollbar p-3 space-y-2">
            {notifications.length === 0 ? (
              <div className="py-10 text-center">
                <span className="text-3xl block mb-2">🔔</span>
                <p className="text-sm text-text-secondary">Нет уведомлений</p>
              </div>
            ) : (
              notifications.map(n => (
                <div
                  key={n.id}
                  className={`p-3 rounded-xl border transition-all ${
                    n.type === 'ALERT'
                      ? 'bg-[#FF3B30]/5 border-[#FF3B30]/20'
                      : n.type === 'SUCCESS'
                        ? 'bg-[#34C759]/5 border-[#34C759]/20'
                        : 'bg-body border-border-color'
                  }`}
                >
                  <div className="flex items-start gap-2.5">
                    <span className="text-base mt-0.5">{NOTIF_ICONS[n.type] || 'ℹ️'}</span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <h4 className="text-sm font-bold text-text-primary truncate">{n.title}</h4>
                        <span className="text-[9px] text-text-secondary shrink-0">{formatNotifTime(n.date)}</span>
                      </div>
                      <p className="text-xs text-text-secondary mt-0.5 leading-relaxed">{n.message}</p>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* ═══ More Menu (Grid Sheet) ═══ */}
      {showMore && (
        <div className="relative z-[101] bg-card border border-border-color rounded-t-2xl shadow-2xl mx-2 mb-0 animate-slide-up">
          <div className="w-10 h-1 bg-border-color rounded-full mx-auto mt-2.5 mb-1" />
          <div className="px-4 pt-1 pb-4">
            <p className="text-[10px] font-bold text-text-secondary uppercase mb-3 ml-1">Все разделы</p>
            <div className="grid grid-cols-4 gap-2">
              {ALL_TABS.map(tab => {
                const isActive = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => handleTabClick(tab.id)}
                    className={`flex flex-col items-center p-3 rounded-xl transition-all active:scale-90 ${
                      isActive
                        ? 'bg-accent/10 border border-accent/30'
                        : 'bg-body border border-transparent hover:border-border-color'
                    }`}
                  >
                    <svg
                      className={`w-5 h-5 mb-1.5 ${isActive ? 'text-accent' : 'text-text-secondary'}`}
                      viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"
                    >
                      {tab.icon}
                    </svg>
                    <span className={`text-[10px] font-medium ${isActive ? 'text-accent' : 'text-text-secondary'}`}>{tab.label}</span>
                  </button>
                );
              })}
              {role === 'ADMIN' && (
                <button
                  onClick={() => handleTabClick(Tab.ADMIN_DASHBOARD)}
                  className={`flex flex-col items-center p-3 rounded-xl transition-all active:scale-90 ${
                    activeTab === Tab.ADMIN_DASHBOARD
                      ? 'bg-accent/10 border border-accent/30'
                      : 'bg-body border border-transparent hover:border-border-color'
                  }`}
                >
                  <svg className={`w-5 h-5 mb-1.5 ${activeTab === Tab.ADMIN_DASHBOARD ? 'text-accent' : 'text-text-secondary'}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                    {ADMIN_ICON}
                  </svg>
                  <span className={`text-[10px] font-medium ${activeTab === Tab.ADMIN_DASHBOARD ? 'text-accent' : 'text-text-secondary'}`}>Админ</span>
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ═══ Admin Sub-tabs (scrollable) ═══ */}
      {showAdmin && activeTab === Tab.ADMIN_DASHBOARD && (
        <div className="bg-card border-t border-border-color">
          <div className="flex gap-0.5 px-2 py-1.5 overflow-x-auto no-scrollbar">
            {ADMIN_SUBS.map(sub => (
              <button
                key={sub.id}
                onClick={() => { telegram.haptic('light'); setAdminSubTab(sub.id); }}
                className={`flex-shrink-0 flex items-center gap-1 px-3 py-2 rounded-lg text-[10px] font-bold uppercase transition-all whitespace-nowrap ${
                  adminSubTab === sub.id
                    ? 'bg-accent text-white'
                    : 'text-text-secondary hover:bg-body'
                }`}
              >
                <span className="text-xs">{sub.icon}</span>
                <span>{sub.label}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ═══ Action Button ═══ */}
      {action && renderAction()}

      {/* ═══ Main Tab Bar ═══ */}
      <div className="bg-surface/95 backdrop-blur-md border-t border-border-color pb-[var(--safe-bottom)]">
        <div className="flex items-center justify-around h-14 max-w-lg mx-auto px-2">
          {/* Back button */}
          {showBackButton && (
            <button onClick={handleBack} className="flex flex-col items-center justify-center w-14 h-14 text-text-secondary active:scale-90 transition-transform">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
              </svg>
              <span className="text-[9px] font-bold mt-0.5">Назад</span>
            </button>
          )}

          {/* Primary tabs */}
          {primaryTabs.map(tab => (
            <TabButton
              key={tab.id}
              isActive={activeTab === tab.id}
              onClick={() => handleTabClick(tab.id)}
              label={tab.label}
              icon={tab.icon}
            />
          ))}

          {/* Notifications */}
          <button
            onClick={() => { telegram.haptic('selection'); setShowNotifications(!showNotifications); setShowMore(false); }}
            className={`flex flex-col items-center justify-center w-14 h-14 transition-colors relative ${showNotifications ? 'text-accent' : 'text-text-secondary'}`}
          >
            <div className="relative">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
              </svg>
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1.5 bg-[#FF3B30] text-white text-[8px] font-bold min-w-[14px] h-3.5 rounded-full flex items-center justify-center px-0.5">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </div>
            <span className="text-[9px] font-bold mt-0.5">Связь</span>
          </button>

          {/* More menu */}
          <button
            onClick={() => { telegram.haptic('selection'); setShowMore(!showMore); setShowNotifications(false); }}
            className={`flex flex-col items-center justify-center w-14 h-14 transition-colors ${showMore ? 'text-accent' : 'text-text-secondary'}`}
          >
            <div className="flex gap-0.5">
              <div className={`w-1 h-1 rounded-full transition-colors ${showMore ? 'bg-accent' : 'bg-text-secondary'}`} />
              <div className={`w-1 h-1 rounded-full transition-colors ${showMore ? 'bg-accent' : 'bg-text-secondary'}`} />
              <div className={`w-1 h-1 rounded-full transition-colors ${showMore ? 'bg-accent' : 'bg-text-secondary'}`} />
            </div>
            <span className="text-[9px] font-bold mt-1.5">Ещё</span>
          </button>

          {/* Admin shortcut (if admin) */}
          {role === 'ADMIN' && (
            <TabButton
              isActive={activeTab === Tab.ADMIN_DASHBOARD}
              onClick={() => handleTabClick(Tab.ADMIN_DASHBOARD)}
              label="Админ"
              icon={ADMIN_ICON}
            />
          )}
        </div>
      </div>
    </div>
  );
};

// ─── Tab Button ─────────────────────────────────────────────────
const TabButton = ({ isActive, onClick, label, icon }: { isActive: boolean; onClick: () => void; label: string; icon: React.ReactNode }) => (
  <button
    onClick={onClick}
    className={`flex flex-col items-center justify-center w-14 h-14 transition-all active:scale-90 relative ${isActive ? 'text-accent' : 'text-text-secondary'}`}
  >
    {isActive && (
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-5 h-0.5 bg-accent rounded-full" />
    )}
    <svg
      className={`w-5 h-5 transition-transform ${isActive ? 'scale-110' : ''}`}
      viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"
    >
      {icon}
    </svg>
    <span className={`text-[9px] font-bold mt-0.5 ${isActive ? 'text-accent' : ''}`}>{label}</span>
  </button>
);
