
import React, { useEffect, useState } from 'react';
import { Tab, UserRole, AppNotification, SmartNavAction } from '../types';
import { telegram } from '../services/telegramService';

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

export const SmartNav: React.FC<SmartNavProps> = ({
  activeTab,
  setActiveTab,
  role,
  adminSubTab,
  setAdminSubTab,
  isLessonActive,
  onExitLesson,
  notifications,
  onClearNotifications,
  action
}) => {
  const [showNotifications, setShowNotifications] = useState(false);
  const [showAdmin, setShowAdmin] = useState(false);
  const unreadCount = notifications.filter(n => !n.isRead).length;

  useEffect(() => {
      if (activeTab === Tab.ADMIN_DASHBOARD) {
          setShowAdmin(true);
      } else {
          setShowAdmin(false);
      }
  }, [activeTab]);

  const handleTabClick = (tab: Tab) => {
      telegram.haptic('selection');
      if (isLessonActive) onExitLesson();
      setActiveTab(tab);
      setShowNotifications(false);
  };

  const handleBack = () => {
      telegram.haptic('medium');
      if (showNotifications) { setShowNotifications(false); return; }
      if (isLessonActive) onExitLesson();
      else setActiveTab(Tab.HOME);
  };

  const isMainTab = [Tab.HOME, Tab.PROFILE, Tab.ADMIN_DASHBOARD].includes(activeTab);
  const showBackButton = isLessonActive || (!isMainTab && !isLessonActive);

  const renderAction = () => {
      if (!action) return null;
      const variantClasses: Record<string, string> = {
          primary: 'bg-[#6C5DD3]',
          success: 'bg-[#34C759]',
          danger: 'bg-[#FF3B30]'
      };
      return (
          <div className="px-4 pb-2">
              <button
                  onClick={action.onClick}
                  disabled={action.loading}
                  className={`w-full h-11 px-5 flex items-center justify-center gap-2 rounded-xl text-white font-semibold text-sm active:scale-[0.98] transition-all ${variantClasses[action.variant || 'primary']}`}
              >
                  {action.loading ? (
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
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
      {/* Notification Panel (slides up above tab bar) */}
      {showNotifications && (
          <div className="bg-card border border-border-color rounded-t-2xl shadow-sm mx-2 mb-0 animate-slide-up">
              <div className="px-4 pt-3 pb-2 flex justify-between items-center border-b border-border-color">
                  <span className="text-sm font-semibold text-text-primary">Уведомления</span>
                  <div className="flex items-center gap-3">
                      <button onClick={onClearNotifications} className="text-xs text-text-secondary font-medium">Очистить</button>
                      <button onClick={() => setShowNotifications(false)} className="w-7 h-7 rounded-full bg-body flex items-center justify-center">
                          <svg className="w-3.5 h-3.5 text-text-secondary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                      </button>
                  </div>
              </div>
              <div className="max-h-[40vh] overflow-y-auto custom-scrollbar p-3 space-y-2">
                  {notifications.length === 0 ? (
                      <div className="py-6 text-center text-text-secondary text-sm">Нет уведомлений</div>
                  ) : (
                      notifications.map(n => (
                          <div key={n.id} className={`p-3 rounded-xl border ${n.type === 'ALERT' ? 'bg-[#FF3B30]/5 border-[#FF3B30]/20' : 'bg-body border-border-color'}`}>
                              <h4 className="text-sm font-medium text-text-primary mb-0.5">{n.title}</h4>
                              <p className="text-xs text-text-secondary">{n.message}</p>
                          </div>
                      ))
                  )}
              </div>
          </div>
      )}

      {/* Admin Sub-tabs */}
      {showAdmin && activeTab === Tab.ADMIN_DASHBOARD && (
          <div className="bg-card border-t border-border-color px-2 py-2 flex gap-1 justify-center">
              {[
                  { id: 'OVERVIEW', icon: '📊' },
                  { id: 'COURSE', icon: '🎓' },
                  { id: 'ARENA', icon: '⚔️' },
                  { id: 'STREAMS', icon: '📡' },
                  { id: 'USERS', icon: '👥' },
                  { id: 'SETTINGS', icon: '⚙️' },
              ].map(link => (
                  <button
                      key={link.id}
                      onClick={() => { telegram.haptic('light'); setAdminSubTab(link.id); }}
                      className={`flex-shrink-0 w-10 h-10 rounded-xl flex items-center justify-center transition-all ${
                          adminSubTab === link.id
                          ? 'bg-[#6C5DD3] text-white'
                          : 'text-text-secondary hover:bg-body'
                      }`}
                  >
                      <span className="text-sm">{link.icon}</span>
                  </button>
              ))}
          </div>
      )}

      {/* Action button */}
      {action && renderAction()}

      {/* iOS-style Tab Bar */}
      <div className="bg-surface/90 backdrop-blur-md border-t border-border-color pb-[var(--safe-bottom)] px-2">
        <div className="flex items-center justify-around h-12 max-w-lg mx-auto">
            {showBackButton && (
                <button onClick={handleBack} className="flex flex-col items-center justify-center w-12 h-12 text-text-secondary active:scale-90 transition-transform">
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" /></svg>
                    <span className="text-[10px] font-medium mt-0.5">Назад</span>
                </button>
            )}

            <TabButton
                isActive={activeTab === Tab.HOME}
                onClick={() => handleTabClick(Tab.HOME)}
                label="Главная"
                icon={<path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />}
            />

            <TabButton
                isActive={activeTab === Tab.PROFILE}
                onClick={() => handleTabClick(Tab.PROFILE)}
                label="Профиль"
                icon={<><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" /></>}
            />

            {/* Notifications */}
            <button
                onClick={() => { telegram.haptic('selection'); setShowNotifications(!showNotifications); }}
                className={`flex flex-col items-center justify-center w-12 h-12 transition-colors relative ${showNotifications ? 'text-[#6C5DD3]' : 'text-text-secondary'}`}
            >
                <div className="relative">
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                    </svg>
                    {unreadCount > 0 && (
                        <span className="absolute -top-1 -right-1 w-2 h-2 bg-[#FF3B30] rounded-full"></span>
                    )}
                </div>
                <span className="text-[10px] font-medium mt-0.5">Связь</span>
            </button>

            {role === 'ADMIN' && (
                <TabButton
                    isActive={activeTab === Tab.ADMIN_DASHBOARD}
                    onClick={() => handleTabClick(Tab.ADMIN_DASHBOARD)}
                    label="Админ"
                    icon={<path d="M12 2a10 10 0 1 0 10 10 M12 2v10l4.24-4.24" />}
                />
            )}
        </div>
      </div>
    </div>
  );
};

const TabButton = ({ isActive, onClick, label, icon }: { isActive: boolean; onClick: () => void; label: string; icon: React.ReactNode }) => (
    <button
        onClick={onClick}
        className={`flex flex-col items-center justify-center w-12 h-12 transition-colors ${isActive ? 'text-[#6C5DD3]' : 'text-text-secondary'}`}
    >
        <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
            {icon}
        </svg>
        <span className="text-[10px] font-medium mt-0.5">{label}</span>
    </button>
);
