
import React, { useRef } from 'react';
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
  
  const touchStartX = useRef(0);
  const touchEndX = useRef(0);

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

  // Tabs ordered for swipe logic
  const TABS_ORDER = [Tab.HOME, Tab.PROFILE];
  if (role === 'ADMIN') TABS_ORDER.push(Tab.ADMIN_DASHBOARD);

  const handleTouchStart = (e: React.TouchEvent) => {
      touchStartX.current = e.targetTouches[0].clientX;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
      touchEndX.current = e.targetTouches[0].clientX;
  };

  const handleTouchEnd = () => {
      if (touchStartX.current - touchEndX.current > 50) {
          // Swipe Left -> Next Tab
          const currIdx = TABS_ORDER.indexOf(activeTab);
          if (currIdx < TABS_ORDER.length - 1) setActiveTab(TABS_ORDER[currIdx + 1]);
      }

      if (touchEndX.current - touchStartX.current > 50) {
          // Swipe Right -> Prev Tab
          const currIdx = TABS_ORDER.indexOf(activeTab);
          if (currIdx > 0) setActiveTab(TABS_ORDER[currIdx - 1]);
      }
  };

  // MODE: Lesson Active
  if (isLessonActive) {
    return (
      <div className="fixed bottom-8 left-0 right-0 z-[100] flex justify-center pointer-events-none px-6 animate-slide-up">
        <button 
          onClick={onExitLesson} 
          className="pointer-events-auto bg-[#16181D] text-white px-8 py-4 rounded-full shadow-[0_10px_30px_rgba(0,0,0,0.5)] flex items-center gap-3 active:scale-95 transition-transform border border-white/10 group hover:border-red-500/50"
        >
          <div className="w-6 h-6 rounded-full bg-white/10 flex items-center justify-center text-[10px] group-hover:bg-red-500 transition-colors">✕</div>
          <span className="text-xs font-black uppercase tracking-widest">Завершить урок</span>
        </button>
      </div>
    );
  }

  // Helper for nav buttons to keep JSX clean
  const NavButton = ({ tab, icon, isActive, showBadge = false }: { tab: Tab, icon: React.ReactNode, isActive: boolean, showBadge?: boolean }) => (
      <button 
        onClick={() => setActiveTab(tab)} 
        className={`relative w-14 h-14 flex items-center justify-center rounded-full transition-all duration-300
          ${isActive ? 'text-[#6C5DD3] -translate-y-2' : 'text-slate-400 hover:text-slate-600 dark:hover:text-white/60 active:scale-95'}
        `}
      >
        {isActive && (
           <>
             {/* Active Glow */}
             <div className="absolute inset-0 bg-[#6C5DD3]/20 rounded-full blur-lg opacity-50"></div>
             {/* Indicator Dot */}
             <div className="absolute -bottom-2 w-1 h-1 rounded-full bg-[#6C5DD3] shadow-[0_0_8px_#6C5DD3]"></div>
           </>
        )}
        {showBadge && (
            <div className="absolute top-2 right-3 w-2 h-2 bg-[#FFD700] rounded-full animate-pulse border border-[#16181D]"></div>
        )}
        <div className={`transition-transform duration-300 ${isActive ? 'scale-110 drop-shadow-[0_0_5px_rgba(108,93,211,0.5)]' : ''}`}>
            {icon}
        </div>
      </button>
  );

  return (
    <div className="fixed bottom-6 left-0 right-0 z-[100] px-4 flex justify-center pointer-events-none" style={{ paddingBottom: 'var(--safe-area-bottom)' }}>
      <div 
        className={`
          pointer-events-auto dynamic-island bg-[#16181D]/90 backdrop-blur-2xl rounded-[2.5rem] flex flex-col items-center transition-all duration-500 ease-[cubic-bezier(0.25,1,0.5,1)] shadow-2xl ring-1 ring-white/10
          ${isAdminView ? 'w-full max-w-[420px] p-2' : 'w-auto px-8 h-20'}
        `}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {/* MODE: Admin Sub-Navigation */}
        {isAdminView && (
          <div className="w-full flex gap-1 mb-2 overflow-x-auto no-scrollbar py-2 px-1 border-b border-white/5 animate-fade-in">
            {adminLinks.map((link, idx) => (
              <button
                key={link.id}
                onClick={() => setAdminSubTab(link.id)}
                className={`flex-shrink-0 flex flex-col items-center justify-center py-2.5 px-3 rounded-2xl transition-all min-w-[60px] animate-slide-up ${adminSubTab === link.id ? 'bg-[#6C5DD3] text-white shadow-lg shadow-[#6C5DD3]/20 scale-105' : 'text-slate-400 dark:text-white/40 hover:bg-slate-100 dark:hover:bg-white/5'}`}
                style={{ animationDelay: `${idx * 0.05}s` }}
              >
                <span className="text-lg mb-1">{link.icon}</span>
                <span className="text-[8px] font-black uppercase tracking-tighter opacity-80">{link.label}</span>
              </button>
            ))}
          </div>
        )}

        {/* Main Navigation Bar */}
        <div className={`flex items-center justify-between ${isAdminView ? 'w-full px-4 py-1 h-14' : 'h-full gap-8'}`}>
            
            <NavButton 
              tab={Tab.HOME} 
              isActive={activeTab === Tab.HOME}
              icon={<svg className="w-7 h-7" fill="currentColor" viewBox="0 0 24 24"><path d="M12 5.69l5 4.5V18h-2v-6H9v6H7v-7.81l5-4.5M12 3L2 12h3v8h6v-6h2v6h6v-8h3L12 3z"/></svg>}
            />
            
            <NavButton 
              tab={Tab.PROFILE} 
              isActive={activeTab === Tab.PROFILE}
              icon={<svg className="w-7 h-7" fill="currentColor" viewBox="0 0 24 24"><path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/></svg>}
            />

            {role === 'ADMIN' && (
               <NavButton 
                  tab={Tab.ADMIN_DASHBOARD}
                  isActive={activeTab === Tab.ADMIN_DASHBOARD}
                  showBadge={true} 
                  icon={<svg className="w-7 h-7" fill="currentColor" viewBox="0 0 24 24"><path d="M19.14 12.94c.04-.3.06-.61.06-.94 0-.32-.02-.64-.07-.94l2.03-1.58c.18-.14.23-.41.12-.61l-1.92-3.32c-.12-.22-.37-.29-.59-.22l-2.39.96c-.5-.38-1.03-.7-1.62-.94l-.36-2.54c-.04-.24-.24-.41-.48-.41h-3.84c-.24 0-.43.17-.47.41l-.36 2.54c-.59.24-1.13.57-1.62.94l-2.39-.96c-.22-.08-.47 0-.59.22L2.74 8.87c-.12.21-.08.47.12.61l2.03 1.58c-.05.3-.09.63-.09.94s.02.64.07.94l-2.03 1.58c-.18.14-.23.41-.12.61l1.92 3.32c.12.22.37.29.59.22l2.39-.96c.5.38 1.03.7 1.62.94l.36 2.54c.05.24.24.41.48.41h3.84c.24 0 .44-.17.47-.41l.36-2.54c.59-.24 1.13-.56 1.62-.94l2.39.96c.22.08.47 0 .59-.22l1.92-3.32c.12-.22.07-.47-.12-.61l-2.01-1.58zM12 15.6c-1.98 0-3.6-1.62-3.6-3.6s1.62-3.6 3.6-3.6 3.6 1.62 3.6 3.6-1.62 3.6-3.6 3.6z"/></svg>}
               />
            )}
        </div>
      </div>
    </div>
  );
};
