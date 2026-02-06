
import React from 'react';
import { Tab, UserRole } from '../types';

interface SmartNavProps {
  activeTab: Tab;
  setActiveTab: (tab: Tab) => void;
  role: UserRole;
  adminSubTab: string;
  setAdminSubTab: (tab: any) => void;
  isLessonActive: boolean;
  onExitLesson: () => void;
}

export const SmartNav: React.FC<SmartNavProps> = ({ 
  activeTab, 
  setActiveTab, 
  role,
  adminSubTab,
  setAdminSubTab,
  isLessonActive,
  onExitLesson
}) => {
  
  const adminLinks = [
    { id: 'OVERVIEW', icon: '📊', label: 'Штаб' },
    { id: 'NEURAL_CORE', icon: '🧠', label: 'ИИ Ядро' },
    { id: 'DATABASE', icon: '🗄️', label: 'База' },
    { id: 'COURSE', icon: '🎓', label: 'Курс' },
    { id: 'ARENA', icon: '⚔️', label: 'Арена' },
    { id: 'STREAMS', icon: '📹', label: 'Эфиры' },
    { id: 'MATERIALS', icon: '📚', label: 'База' },
    { id: 'CALENDAR', icon: '📅', label: 'План' },
    { id: 'USERS', icon: '👥', label: 'Люди' },
    { id: 'DEPLOY', icon: '🚀', label: 'Deploy' },
    { id: 'SETTINGS', icon: '⚙️', label: 'Настр.' },
  ];

  const isAdminView = activeTab === Tab.ADMIN_DASHBOARD;

  // MODE: Lesson Active
  // If a lesson is active, hide the main nav to focus the user, show only exit button.
  if (isLessonActive) {
    return (
      <div className="fixed bottom-8 left-0 right-0 z-[100] flex justify-center pointer-events-none px-6">
        <button 
          onClick={onExitLesson} 
          className="pointer-events-auto bg-[#14161B] text-white px-6 py-4 rounded-full shadow-2xl flex items-center gap-3 active:scale-95 transition-transform border border-white/10"
        >
          <div className="w-6 h-6 rounded-full bg-white/10 flex items-center justify-center text-[10px]">✕</div>
          <span className="text-xs font-black uppercase tracking-widest">Завершить урок</span>
        </button>
      </div>
    );
  }

  // Helper for nav buttons to keep JSX clean
  const NavButton = ({ tab, icon, isActive }: { tab: Tab, icon: React.ReactNode, isActive: boolean }) => (
      <button 
        onClick={() => setActiveTab(tab)} 
        className={`relative w-12 h-12 flex items-center justify-center rounded-2xl transition-all duration-300 ${isActive ? 'text-[#FFAB7B] -translate-y-2' : 'text-slate-400 dark:text-white/30 hover:text-slate-600 dark:hover:text-white/60'}`}
      >
        {isActive && (
           <div className="absolute -bottom-2 w-1 h-1 rounded-full bg-[#FFAB7B]"></div>
        )}
        {icon}
      </button>
  );

  return (
    <div className="fixed bottom-6 left-0 right-0 z-[100] px-4 flex justify-center pointer-events-none" style={{ paddingBottom: 'var(--safe-area-bottom)' }}>
      <div 
        className={`
          pointer-events-auto dynamic-island glass-panel bg-white/95 dark:bg-[#14161B]/95 backdrop-blur-xl rounded-[2.5rem] flex flex-col items-center transition-all duration-500 ease-[cubic-bezier(0.25,1,0.5,1)] shadow-2xl dark:shadow-black/50 border border-slate-200 dark:border-white/10
          ${isAdminView ? 'w-full max-w-[420px] p-2' : 'w-auto px-2 h-20'}
        `}
      >
        {/* MODE: Admin Sub-Navigation (Only visible when Admin Dashboard is active) */}
        {isAdminView && (
          <div className="w-full flex gap-1 mb-2 overflow-x-auto no-scrollbar py-2 px-1 border-b border-white/5">
            {adminLinks.map(link => (
              <button
                key={link.id}
                onClick={() => setAdminSubTab(link.id)}
                className={`flex-shrink-0 flex flex-col items-center justify-center py-2.5 px-3 rounded-2xl transition-all min-w-[60px] ${adminSubTab === link.id ? 'bg-[#6C5DD3] text-white shadow-lg shadow-[#6C5DD3]/20' : 'text-slate-400 dark:text-white/40 hover:bg-slate-100 dark:hover:bg-white/5'}`}
              >
                <span className="text-lg mb-1">{link.icon}</span>
                <span className="text-[8px] font-black uppercase tracking-tighter opacity-80">{link.label}</span>
              </button>
            ))}
          </div>
        )}

        {/* Main Navigation Bar */}
        <div className={`flex items-center justify-evenly ${isAdminView ? 'w-full px-4 py-1 h-14' : 'h-full gap-4 px-4'}`}>
            
            <NavButton 
              tab={Tab.HOME} 
              isActive={activeTab === Tab.HOME}
              icon={<svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24"><path d="M12 5.69l5 4.5V18h-2v-6H9v6H7v-7.81l5-4.5M12 3L2 12h3v8h6v-6h2v6h6v-8h3L12 3z"/></svg>}
            />
            
            <NavButton 
              tab={Tab.CHAT} 
              isActive={activeTab === Tab.CHAT}
              icon={<svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24"><path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm0 14H5.17L4 17.17V4h16v12z"/></svg>}
            />

            <NavButton 
              tab={Tab.PROFILE} 
              isActive={activeTab === Tab.PROFILE}
              icon={<svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24"><path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/></svg>}
            />

            {/* Role Based Buttons */}
            {role === 'CURATOR' && (
               <NavButton 
                  tab={Tab.CURATOR_DASHBOARD}
                  isActive={activeTab === Tab.CURATOR_DASHBOARD}
                  icon={<svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24"><path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-5 14H7v-2h7v2zm3-4H7v-2h10v2zm0-4H7V7h10v2z"/></svg>}
               />
            )}

            {role === 'ADMIN' && (
               <NavButton 
                  tab={Tab.ADMIN_DASHBOARD}
                  isActive={activeTab === Tab.ADMIN_DASHBOARD}
                  icon={<svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24"><path d="M19.14 12.94c.04-.3.06-.61.06-.94 0-.32-.02-.64-.07-.94l2.03-1.58c.18-.14.23-.41.12-.61l-1.92-3.32c-.12-.22-.37-.29-.59-.22l-2.39.96c-.5-.38-1.03-.7-1.62-.94l-.36-2.54c-.04-.24-.24-.41-.48-.41h-3.84c-.24 0-.43.17-.47.41l-.36 2.54c-.59.24-1.13.57-1.62.94l-2.39-.96c-.22-.08-.47 0-.59.22L2.74 8.87c-.12.21-.08.47.12.61l2.03 1.58c-.05.3-.09.63-.09.94s.02.64.07.94l-2.03 1.58c-.18.14-.23.41-.12.61l1.92 3.32c.12.22.37.29.59.22l2.39-.96c.5.38 1.03.7 1.62.94l.36 2.54c.05.24.24.41.48.41h3.84c.24 0 .44-.17.47-.41l.36-2.54c.59-.24 1.13-.56 1.62-.94l2.39.96c.22.08.47 0 .59-.22l1.92-3.32c.12-.22.07-.47-.12-.61l-2.01-1.58zM12 15.6c-1.98 0-3.6-1.62-3.6-3.6s1.62-3.6 3.6-3.6 3.6 1.62 3.6 3.6-1.62 3.6-3.6 3.6z"/></svg>}
               />
            )}
        </div>
      </div>
    </div>
  );
};
