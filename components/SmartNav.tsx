
import React, { useRef, useEffect, useState } from 'react';
import { Tab, UserRole, AppNotification } from '../types';
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
  onClearNotifications
}) => {
  const [expandedPanel, setExpandedPanel] = useState<'NONE' | 'ADMIN' | 'NOTIFICATIONS'>('NONE');
  const [isScrolledDown, setIsScrolledDown] = useState(false);
  const lastScrollY = useRef(0);

  // --- SCROLL LISTENER (SHRINK EFFECT) ---
  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      const main = document.querySelector('main');
      if (main) {
           const scrollY = main.scrollTop;
           if (scrollY > 100 && scrollY > lastScrollY.current) {
                setIsScrolledDown(true);
                // Auto collapse if scrolling down
                setExpandedPanel('NONE'); 
           } else if (scrollY < lastScrollY.current || scrollY < 50) {
                setIsScrolledDown(false);
           }
           lastScrollY.current = scrollY;
      } else {
           // Fallback for window scroll
           if (currentScrollY > 100 && currentScrollY > lastScrollY.current) {
               setIsScrolledDown(true);
               setExpandedPanel('NONE');
           } else if (currentScrollY < lastScrollY.current) {
               setIsScrolledDown(false);
           }
           lastScrollY.current = currentScrollY;
      }
    };

    // Attach to window and potential main container
    window.addEventListener('scroll', handleScroll, { passive: true });
    const mainElement = document.querySelector('main');
    if (mainElement) mainElement.addEventListener('scroll', handleScroll, { passive: true });

    return () => {
        window.removeEventListener('scroll', handleScroll);
        if (mainElement) mainElement.removeEventListener('scroll', handleScroll);
    };
  }, []);

  // --- STATE MANAGEMENT ---
  const isMainTab = [Tab.HOME, Tab.PROFILE, Tab.ADMIN_DASHBOARD].includes(activeTab);
  const isBackMode = isLessonActive || (!isMainTab && !isLessonActive);
  const unreadCount = notifications.filter(n => !n.isRead).length;

  useEffect(() => {
      if (activeTab === Tab.ADMIN_DASHBOARD) {
          setExpandedPanel('ADMIN');
      } else if (expandedPanel === 'ADMIN') {
          setExpandedPanel('NONE');
      }
  }, [activeTab]);

  const toggleNotifications = () => {
      telegram.haptic('selection');
      setExpandedPanel(prev => prev === 'NOTIFICATIONS' ? 'NONE' : 'NOTIFICATIONS');
      setIsScrolledDown(false); // Force expand on interaction
  };

  const handleBack = () => {
      telegram.haptic('medium');
      if (isLessonActive) onExitLesson();
      else setActiveTab(Tab.HOME);
  };

  const handleTabClick = (tab: Tab) => {
      telegram.haptic('selection');
      setActiveTab(tab);
      if (tab !== Tab.ADMIN_DASHBOARD && expandedPanel === 'ADMIN') setExpandedPanel('NONE');
      if (expandedPanel === 'NOTIFICATIONS') setExpandedPanel('NONE');
  };

  // --- RENDER HELPERS ---

  const renderAdminLinks = () => (
      <div className="flex gap-1 px-1 pb-2 overflow-x-auto no-scrollbar">
         {[
            { id: 'OVERVIEW', icon: '📊', label: 'Штаб' },
            { id: 'NEURAL_CORE', icon: '🧠', label: 'ИИ' },
            { id: 'COURSE', icon: '🎓', label: 'Курс' },
            { id: 'ARENA', icon: '⚔️', label: 'Арена' },
            { id: 'USERS', icon: '👥', label: 'Люди' },
            { id: 'SETTINGS', icon: '⚙️', label: 'Опции' },
         ].map(link => (
             <button
                key={link.id}
                onClick={() => { telegram.haptic('light'); setAdminSubTab(link.id); }}
                className={`flex-shrink-0 flex flex-col items-center justify-center w-14 h-12 rounded-xl border transition-all ${
                    adminSubTab === link.id 
                    ? 'bg-[#6C5DD3] border-[#6C5DD3] text-white shadow-lg' 
                    : 'bg-white/5 border-transparent text-white/40 hover:bg-white/10'
                }`}
             >
                 <span className="text-lg">{link.icon}</span>
             </button>
         ))}
      </div>
  );

  const renderNotifications = () => (
      <div className="px-3 pb-3 max-h-[60vh] overflow-y-auto custom-scrollbar">
          <div className="flex justify-between items-center mb-2 px-1">
              <span className="text-[10px] font-black uppercase text-white/40 tracking-widest">Центр связи</span>
              <button onClick={onClearNotifications} className="text-[10px] text-red-400 font-bold hover:text-red-300">Очистить</button>
          </div>
          {notifications.length === 0 ? (
              <div className="py-6 text-center text-white/20 text-xs font-bold uppercase">Нет новых сообщений</div>
          ) : (
              <div className="space-y-2">
                  {notifications.map(n => (
                      <div key={n.id} className={`p-3 rounded-xl border flex gap-3 ${
                          n.type === 'ALERT' ? 'bg-red-500/10 border-red-500/30' : 'bg-white/5 border-white/5'
                      }`}>
                          <div className={`w-1 rounded-full ${n.type === 'ALERT' ? 'bg-red-500' : 'bg-[#6C5DD3]'}`}></div>
                          <div className="flex-1">
                              <h4 className="text-xs font-bold text-white leading-tight">{n.title}</h4>
                              <p className="text-[10px] text-white/60 mt-1 leading-snug">{n.message}</p>
                              <span className="text-[8px] text-white/20 mt-1 block">{new Date(n.date).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                          </div>
                      </div>
                  ))}
              </div>
          )}
      </div>
  );

  return (
    <div className="fixed bottom-6 left-0 right-0 z-[100] flex justify-center pointer-events-none px-4" style={{ paddingBottom: 'var(--safe-bottom)' }}>
      <div 
        className={`
          pointer-events-auto island-blur bg-[#0F1115]/95 shadow-[0_20px_50px_-10px_rgba(0,0,0,0.5)] border border-white/10 overflow-hidden relative
          transition-all duration-500 cubic-bezier(0.23, 1, 0.32, 1)
          ${isScrolledDown && expandedPanel === 'NONE' && !isBackMode ? 'w-[120px] rounded-full translate-y-4 opacity-80 hover:w-auto hover:opacity-100 hover:translate-y-0' : 'w-full max-w-[360px] rounded-[2rem]'}
          ${expandedPanel !== 'NONE' ? 'rounded-[2.5rem]' : ''}
        `}
      >
        {/* Dynamic Background Mesh inside Island */}
        <div className="absolute inset-0 opacity-30 pointer-events-none bg-[radial-gradient(circle_at_50%_100%,_rgba(108,93,211,0.25),_transparent_80%)]"></div>

        <div className="relative z-10 flex flex-col w-full">
            
            {/* EXPANDABLE AREA (Top) */}
            <div className={`transition-all duration-500 ease-[cubic-bezier(0.23,1,0.32,1)] overflow-hidden ${
                expandedPanel !== 'NONE' ? 'max-h-[400px] opacity-100 pt-3' : 'max-h-0 opacity-0'
            }`}>
                {expandedPanel === 'ADMIN' && renderAdminLinks()}
                {expandedPanel === 'NOTIFICATIONS' && renderNotifications()}
            </div>

            {/* MAIN INTERFACE ROW */}
            <div className="h-[64px] flex items-center justify-between px-2 w-full">
                
                {isBackMode ? (
                    // --- BACK BUTTON MODE ---
                    <button 
                        onClick={handleBack}
                        className="w-full h-full flex items-center justify-center gap-3 group active:scale-95 transition-transform"
                    >
                        <div className="w-10 h-10 rounded-full bg-[#6C5DD3] flex items-center justify-center shadow-lg shadow-[#6C5DD3]/30 group-hover:scale-110 transition-transform">
                             <svg className="w-5 h-5 text-white pr-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" /></svg>
                        </div>
                        <div className="flex flex-col items-start">
                             <span className="text-[9px] font-black uppercase tracking-[0.2em] text-[#6C5DD3]">{isLessonActive ? 'В ШТАБ' : 'НАЗАД'}</span>
                             <span className="text-xs font-bold text-white">{isLessonActive ? 'Завершить задачу' : 'Главное меню'}</span>
                        </div>
                    </button>
                ) : (
                    // --- NAVIGATION MODE ---
                    <>
                        {/* 1. Home */}
                        <NavButton 
                            isActive={activeTab === Tab.HOME}
                            onClick={() => handleTabClick(Tab.HOME)}
                            icon={<path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />}
                            isCollapsed={isScrolledDown && expandedPanel === 'NONE'}
                        />

                        {/* 2. Notification Center (Center Piece) */}
                        <div className="flex items-center justify-center w-14 h-14">
                            <button 
                                onClick={toggleNotifications}
                                className={`
                                    relative w-12 h-12 rounded-2xl flex items-center justify-center transition-all duration-300
                                    ${expandedPanel === 'NOTIFICATIONS' ? 'bg-white text-black scale-110 shadow-[0_0_20px_rgba(255,255,255,0.3)]' : 'text-slate-400 hover:text-white hover:bg-white/10'}
                                    ${isScrolledDown && expandedPanel === 'NONE' ? 'scale-75' : ''}
                                `}
                            >
                                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                                </svg>
                                {unreadCount > 0 && (
                                    <span className="absolute top-2 right-2 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-[#0F1115] animate-pulse"></span>
                                )}
                            </button>
                        </div>

                        {/* 3. Profile */}
                        <NavButton 
                            isActive={activeTab === Tab.PROFILE}
                            onClick={() => handleTabClick(Tab.PROFILE)}
                            icon={<path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />}
                            extraIcon={<circle cx="12" cy="7" r="4" />}
                            isCollapsed={isScrolledDown && expandedPanel === 'NONE'}
                        />

                        {/* 4. Admin (Conditional) */}
                        {role === 'ADMIN' && (
                             <NavButton 
                                isActive={activeTab === Tab.ADMIN_DASHBOARD}
                                onClick={() => handleTabClick(Tab.ADMIN_DASHBOARD)}
                                icon={<path d="M12 2a10 10 0 1 0 10 10 M12 2v10l4.24-4.24" />}
                                isCollapsed={isScrolledDown && expandedPanel === 'NONE'}
                                isAdmin
                             />
                        )}
                    </>
                )}
            </div>
        </div>
      </div>
    </div>
  );
};

// --- SUB-COMPONENT: NAV BUTTON ---
const NavButton = ({ isActive, onClick, icon, extraIcon, isCollapsed, isAdmin }: any) => {
    if (isCollapsed && !isActive) return null; // Hide inactive buttons when collapsed

    return (
        <button 
          onClick={onClick} 
          className={`
            relative w-14 h-full flex items-center justify-center transition-all duration-300 rounded-2xl group
            ${isActive ? 'text-white' : 'text-slate-500 hover:text-white'}
            ${isCollapsed ? 'w-full' : ''} 
          `}
        >
          {isActive && (
             <div className="absolute inset-x-2 bottom-0 h-1 bg-[#6C5DD3] rounded-t-full shadow-[0_0_10px_#6C5DD3] mx-auto w-4"></div>
          )}
          
          <div className={`transition-all duration-300 ${isActive ? 'scale-110 -translate-y-1 drop-shadow-[0_0_8px_rgba(108,93,211,0.5)]' : 'group-hover:scale-110'}`}>
              <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
                  {icon}
                  {extraIcon}
              </svg>
          </div>
        </button>
    );
};
