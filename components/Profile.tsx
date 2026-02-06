
import React, { useState, useEffect, useRef } from 'react';
import { UserProgress, CalendarEvent, UserRole } from '../types';
import { CalendarView } from './CalendarView';
import { telegram } from '../services/telegramService';

interface ProfileProps {
  userProgress: UserProgress;
  onLogout: () => void;
  allUsers: UserProgress[];
  onUpdateUser: (updatedUser: Partial<UserProgress>) => void;
  events: CalendarEvent[];
  activeTabOverride?: string;
}

type ProfileTab = 'STATS' | 'CALENDAR' | 'RATING' | 'SETTINGS';

const ARMOR_OPTIONS = [
    { value: 'Classic Bronze', label: 'Classic Bronze (Классика)' },
    { value: 'Midnight Stealth', label: 'Midnight Stealth (Стелс)' },
    { value: 'Golden God', label: 'Golden God (Божественный)' },
    { value: 'Futuristic Chrome', label: 'Futuristic Chrome (Кибер)' },
];

const BACKGROUND_OPTIONS = [
    { value: 'Ancient Battlefield', label: 'Ancient Battlefield (Поле боя)' },
    { value: 'Temple of Olympus', label: 'Temple of Olympus (Олимп)' },
    { value: 'Stormy Peak', label: 'Stormy Peak (Шторм)' },
    { value: 'Volcanic Gates', label: 'Volcanic Gates (Вулкан)' },
];

export const Profile: React.FC<ProfileProps> = ({ userProgress, onLogout, allUsers, onUpdateUser, events, activeTabOverride }) => {
  const [activeTab, setActiveTab] = useState<ProfileTab>((activeTabOverride as ProfileTab) || 'STATS');
  
  // Parallax Effect State
  const [tilt, setTilt] = useState({ x: 0, y: 0 });
  const avatarRef = useRef<HTMLDivElement>(null);

  // Settings State
  const [editName, setEditName] = useState(userProgress.name);
  const [editTelegram, setEditTelegram] = useState(userProgress.telegramUsername || '');
  const [editInstagram, setEditInstagram] = useState(userProgress.instagram || '');
  const [editAbout, setEditAbout] = useState(userProgress.aboutMe || '');
  const [editNotifications, setEditNotifications] = useState(userProgress.notifications);
  // Visual Settings State
  const [editArmor, setEditArmor] = useState(userProgress.armorStyle || 'Classic Bronze');
  const [editBackground, setEditBackground] = useState(userProgress.backgroundStyle || 'Ancient Battlefield');

  const [isSaving, setIsSaving] = useState(false);

  // Invite Link
  const inviteLink = userProgress.inviteLink || `https://t.me/SalesProBot?start=ref_${userProgress.telegramUsername || 'unknown'}`;

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!avatarRef.current) return;
    const rect = avatarRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;
    
    // Calculate rotation (max 15 degrees)
    const rotateX = ((y - centerY) / centerY) * -10;
    const rotateY = ((x - centerX) / centerX) * 10;

    setTilt({ x: rotateX, y: rotateY });
  };

  const handleMouseLeave = () => setTilt({ x: 0, y: 0 });

  const handleSaveSettings = () => {
    setIsSaving(true);
    // Simulate network delay
    setTimeout(() => {
        onUpdateUser({
            name: editName,
            telegramUsername: editTelegram,
            instagram: editInstagram,
            aboutMe: editAbout,
            notifications: editNotifications,
            armorStyle: editArmor,
            backgroundStyle: editBackground
        });
        telegram.haptic('success');
        setIsSaving(false);
    }, 800);
  };

  const toggleTheme = () => {
      const newTheme = userProgress.theme === 'DARK' ? 'LIGHT' : 'DARK';
      onUpdateUser({ theme: newTheme });
      telegram.haptic('selection');
  };

  const copyInviteLink = () => {
      navigator.clipboard.writeText(inviteLink);
      telegram.haptic('selection');
      // In a real app, use a proper Toast here
      alert('Ссылка скопирована!'); 
  };

  const toggleNotification = (key: keyof typeof editNotifications) => {
    setEditNotifications(prev => ({ ...prev, [key]: !prev[key] }));
  };

  // --- SUB-COMPONENTS ---

  const renderStats = () => (
      <div className="space-y-6">
          {/* Main Stats Grid */}
          <div className="grid grid-cols-2 gap-4 animate-slide-up fill-mode-both">
              <div className="bg-white dark:bg-white/5 p-5 rounded-[2rem] border border-slate-200 dark:border-white/5 flex flex-col justify-between h-32 relative overflow-hidden group hover:border-[#FFAB7B]/30 transition-colors shadow-sm dark:shadow-none">
                  <div className="absolute top-0 right-0 w-24 h-24 bg-[#FFAB7B] rounded-full blur-[40px] opacity-10 group-hover:opacity-20 transition-opacity"></div>
                  <div className="w-8 h-8 bg-[#FFAB7B]/20 text-[#FFAB7B] rounded-full flex items-center justify-center text-lg relative z-10">⚡</div>
                  <div className="relative z-10">
                      <h3 className="text-3xl font-black text-slate-800 dark:text-white">{userProgress.xp}</h3>
                      <p className="text-[10px] font-bold text-slate-400 dark:text-white/40 uppercase tracking-widest">Total XP</p>
                  </div>
              </div>
              <div className="bg-white dark:bg-white/5 p-5 rounded-[2rem] border border-slate-200 dark:border-white/5 flex flex-col justify-between h-32 relative overflow-hidden group hover:border-[#6C5DD3]/30 transition-colors shadow-sm dark:shadow-none">
                  <div className="absolute top-0 right-0 w-24 h-24 bg-[#6C5DD3] rounded-full blur-[40px] opacity-10 group-hover:opacity-20 transition-opacity"></div>
                  <div className="w-8 h-8 bg-[#6C5DD3]/20 text-[#6C5DD3] rounded-full flex items-center justify-center text-lg relative z-10">🛡️</div>
                  <div className="relative z-10">
                      <h3 className="text-3xl font-black text-slate-800 dark:text-white">{userProgress.level}</h3>
                      <p className="text-[10px] font-bold text-slate-400 dark:text-white/40 uppercase tracking-widest">Rank Level</p>
                  </div>
              </div>
          </div>

          {/* Activity Graph Card */}
          <div className="bg-white dark:bg-[#14161B] p-6 rounded-[2.5rem] border border-slate-200 dark:border-white/5 relative overflow-hidden animate-slide-up delay-100 fill-mode-both shadow-md dark:shadow-none">
             <div className="flex justify-between items-center mb-6">
                 <h3 className="font-black text-slate-800 dark:text-white">Боевая Активность</h3>
                 <span className="text-[10px] bg-[#00B050]/20 text-[#00B050] border border-[#00B050]/20 px-2 py-1 rounded-lg font-bold uppercase animate-pulse-slow">+12% week</span>
             </div>
             
             {/* CSS Chart */}
             <div className="flex items-end h-32 gap-3">
                 {[40, 65, 30, 80, 50, 90, 60].map((h, i) => (
                     <div key={i} className="flex-1 flex flex-col items-center gap-2 group cursor-pointer">
                         <div className="w-full bg-slate-100 dark:bg-white/5 rounded-t-xl relative h-full overflow-hidden">
                             <div 
                                className="absolute bottom-0 w-full bg-[#6C5DD3] rounded-t-xl transition-all duration-500 cubic-bezier(0.34, 1.56, 0.64, 1) group-hover:bg-[#FFAB7B] group-hover:shadow-[0_0_15px_#FFAB7B] origin-bottom" 
                                style={{ height: `${h}%` }}
                             ></div>
                         </div>
                         <span className="text-[9px] font-bold text-slate-400 dark:text-white/30 uppercase transition-colors group-hover:text-[#6C5DD3] dark:group-hover:text-white">{['Пн','Вт','Ср','Чт','Пт','Сб','Вс'][i]}</span>
                     </div>
                 ))}
             </div>
          </div>
      </div>
  );

  const renderLeaderboard = () => {
      // Merge current user with allUsers if not present (Mock Data included for visual check)
      const mockUsers: UserProgress[] = [
          { name: 'Leonidas', xp: 5000, level: 10, role: 'ADMIN', isAuthenticated: true, completedLessonIds: [], submittedHomeworks: [], chatHistory: [], notifications: {}, notebook: [], theme: 'DARK' } as UserProgress,
          { name: 'Artemis', xp: 4200, level: 8, role: 'STUDENT', isAuthenticated: true, completedLessonIds: [], submittedHomeworks: [], chatHistory: [], notifications: {}, notebook: [], theme: 'DARK' } as UserProgress,
      ];
      
      const combinedUsers = [...mockUsers, ...allUsers];
      if (!combinedUsers.find(u => u.name === userProgress.name)) {
          combinedUsers.push(userProgress);
      }
      
      const sortedUsers = combinedUsers.sort((a, b) => b.xp - a.xp);

      return (
          <div className="space-y-4">
              <div className="bg-gradient-to-br from-white to-slate-50 dark:from-[#1F2128] dark:to-[#14161B] text-slate-900 dark:text-white p-6 rounded-[2rem] mb-6 relative overflow-hidden animate-slide-up fill-mode-both border border-slate-200 dark:border-white/5 shadow-xl dark:shadow-2xl">
                  <div className="absolute top-0 right-0 text-[100px] opacity-5 rotate-12 -translate-y-4 pointer-events-none">🏆</div>
                  <h3 className="text-2xl font-black mb-1">Топ Бойцов</h3>
                  <p className="text-slate-400 dark:text-white/40 text-xs font-bold uppercase tracking-widest mb-6">Рейтинг отряда</p>
                  
                  <div className="flex items-end justify-center gap-4 mb-4">
                      {/* 2nd Place */}
                      <div className="flex flex-col items-center transform transition-transform hover:-translate-y-1 duration-300">
                          <div className="w-12 h-12 rounded-full border border-slate-300 dark:border-white/20 p-0.5 mb-2 relative">
                              <img src={`https://ui-avatars.com/api/?name=${sortedUsers[1]?.name || 'Bot'}`} className="w-full h-full rounded-full object-cover grayscale opacity-70" />
                              <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 bg-[#C0C0C0] text-[#1F2128] text-[9px] font-black px-1.5 rounded-full shadow-sm">2</div>
                          </div>
                          <span className="text-[10px] font-bold text-slate-600 dark:text-white/70">{sortedUsers[1]?.name || 'Empty'}</span>
                          <span className="text-[9px] text-slate-400 dark:text-white/30">{sortedUsers[1]?.xp || 0} XP</span>
                      </div>
                      
                      {/* 1st Place */}
                      <div className="flex flex-col items-center -translate-y-4 transform transition-transform hover:-translate-y-5 duration-300">
                          <div className="w-16 h-16 rounded-full border-2 border-[#FFD700] p-0.5 mb-2 relative shadow-[0_0_30px_rgba(255,215,0,0.3)]">
                              <img src={`https://ui-avatars.com/api/?name=${sortedUsers[0]?.name || 'Bot'}`} className="w-full h-full rounded-full object-cover" />
                              <div className="absolute -bottom-3 left-1/2 -translate-x-1/2 bg-[#FFD700] text-[#1F2128] text-[10px] font-black px-2 py-0.5 rounded-full shadow-lg">1</div>
                              <div className="absolute -top-6 left-1/2 -translate-x-1/2 text-2xl animate-bounce">👑</div>
                          </div>
                          <span className="text-xs font-bold text-[#FFD700]">{sortedUsers[0]?.name || 'Empty'}</span>
                          <span className="text-[9px] text-slate-500 dark:text-white/50">{sortedUsers[0]?.xp || 0} XP</span>
                      </div>

                      {/* 3rd Place */}
                      <div className="flex flex-col items-center transform transition-transform hover:-translate-y-1 duration-300">
                          <div className="w-12 h-12 rounded-full border border-slate-300 dark:border-white/20 p-0.5 mb-2 relative">
                              <img src={`https://ui-avatars.com/api/?name=${sortedUsers[2]?.name || 'Bot'}`} className="w-full h-full rounded-full object-cover grayscale opacity-70" />
                              <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 bg-[#CD7F32] text-[#1F2128] text-[9px] font-black px-1.5 rounded-full shadow-sm">3</div>
                          </div>
                          <span className="text-[10px] font-bold text-slate-600 dark:text-white/70">{sortedUsers[2]?.name || 'Empty'}</span>
                          <span className="text-[9px] text-slate-400 dark:text-white/30">{sortedUsers[2]?.xp || 0} XP</span>
                      </div>
                  </div>
              </div>

              <div className="bg-white dark:bg-[#14161B] rounded-[2rem] border border-slate-200 dark:border-white/5 overflow-hidden animate-slide-up delay-100 fill-mode-both shadow-md dark:shadow-none">
                  {sortedUsers.slice(3).map((u, i) => (
                      <div key={i} className={`p-4 flex items-center justify-between border-b border-slate-100 dark:border-white/5 last:border-0 hover:bg-slate-50 dark:hover:bg-white/5 transition-colors ${u.name === userProgress.name ? 'bg-[#6C5DD3]/10 hover:bg-[#6C5DD3]/20' : ''}`}>
                          <div className="flex items-center gap-4">
                              <span className="text-slate-400 dark:text-white/30 font-black text-sm w-4">{i + 4}</span>
                              <div className="w-10 h-10 rounded-full bg-slate-200 dark:bg-white/5 overflow-hidden">
                                  <img src={u.avatarUrl || `https://ui-avatars.com/api/?name=${u.name}`} className="w-full h-full object-cover" />
                              </div>
                              <div>
                                  <p className="font-bold text-slate-800 dark:text-white text-sm">{u.name} {u.name === userProgress.name && <span className="text-[#6C5DD3]">(Вы)</span>}</p>
                                  <p className="text-[10px] text-slate-400 dark:text-white/40 font-bold uppercase">Lvl {u.level}</p>
                              </div>
                          </div>
                          <div className="text-right">
                              <span className="font-black text-slate-800 dark:text-white text-sm">{u.xp}</span>
                              <span className="text-[9px] text-slate-400 dark:text-white/30 block">XP</span>
                          </div>
                      </div>
                  ))}
              </div>
          </div>
      );
  };

  const renderSettings = () => (
      <div className="space-y-6">
          {/* Theme Toggle */}
          <div className="bg-white dark:bg-[#14161B] p-6 rounded-[2.5rem] border border-slate-200 dark:border-white/5 animate-slide-up fill-mode-both shadow-md dark:shadow-none">
              <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-slate-100 dark:bg-white/5 flex items-center justify-center text-xl">
                          {userProgress.theme === 'DARK' ? '🌙' : '☀️'}
                      </div>
                      <div>
                          <h3 className="font-black text-slate-800 dark:text-white">Оформление</h3>
                          <p className="text-slate-400 text-xs">Сменить тему приложения</p>
                      </div>
                  </div>
                  <button 
                    onClick={toggleTheme}
                    className="relative w-14 h-8 bg-slate-200 dark:bg-[#050505] rounded-full p-1 transition-colors border border-slate-300 dark:border-white/10"
                  >
                      <div className={`w-6 h-6 bg-white dark:bg-[#6C5DD3] rounded-full shadow-md transform transition-transform duration-300 flex items-center justify-center text-[10px] ${userProgress.theme === 'DARK' ? 'translate-x-6' : 'translate-x-0'}`}>
                          {userProgress.theme === 'DARK' ? 'D' : 'L'}
                      </div>
                  </button>
              </div>
          </div>

          {/* Visual Style (New) */}
          <div className="bg-white dark:bg-[#14161B] p-6 rounded-[2.5rem] border border-slate-200 dark:border-white/5 animate-slide-up fill-mode-both shadow-md dark:shadow-none">
              <h3 className="font-black text-slate-800 dark:text-white mb-2 text-lg">Визуальный стиль</h3>
              <p className="text-slate-400 text-xs mb-6">Настройки для генерации аватара</p>

              <div className="space-y-4">
                  <div className="relative group">
                      <label className="text-[10px] font-black uppercase text-slate-400 dark:text-white/30 pl-2 mb-1 block">Стиль Брони</label>
                      <div className="relative">
                           <select 
                                value={editArmor}
                                onChange={(e) => setEditArmor(e.target.value)}
                                className="w-full appearance-none bg-slate-50 dark:bg-white/5 p-4 pl-12 rounded-2xl font-bold text-slate-800 dark:text-white outline-none border border-transparent focus:border-[#6C5DD3] transition-all focus:bg-white dark:focus:bg-black"
                           >
                                {ARMOR_OPTIONS.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                           </select>
                           <span className="absolute left-4 top-1/2 -translate-y-1/2 text-lg opacity-30 grayscale group-focus-within:grayscale-0 transition-all">🛡️</span>
                           <span className="absolute right-4 top-1/2 -translate-y-1/2 text-[10px] text-slate-400 pointer-events-none">▼</span>
                      </div>
                  </div>

                  <div className="relative group">
                      <label className="text-[10px] font-black uppercase text-slate-400 dark:text-white/30 pl-2 mb-1 block">Фоновое окружение</label>
                      <div className="relative">
                           <select 
                                value={editBackground}
                                onChange={(e) => setEditBackground(e.target.value)}
                                className="w-full appearance-none bg-slate-50 dark:bg-white/5 p-4 pl-12 rounded-2xl font-bold text-slate-800 dark:text-white outline-none border border-transparent focus:border-[#6C5DD3] transition-all focus:bg-white dark:focus:bg-black"
                           >
                                {BACKGROUND_OPTIONS.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                           </select>
                           <span className="absolute left-4 top-1/2 -translate-y-1/2 text-lg opacity-30 grayscale group-focus-within:grayscale-0 transition-all">🌄</span>
                           <span className="absolute right-4 top-1/2 -translate-y-1/2 text-[10px] text-slate-400 pointer-events-none">▼</span>
                      </div>
                  </div>
              </div>
          </div>

          {/* Personal Info */}
          <div className="bg-white dark:bg-[#14161B] p-6 rounded-[2.5rem] border border-slate-200 dark:border-white/5 animate-slide-up fill-mode-both shadow-md dark:shadow-none">
              <h3 className="font-black text-slate-800 dark:text-white mb-6 text-lg">Личное дело</h3>
              
              <div className="space-y-4">
                  <div className="relative group">
                      <label className="text-[10px] font-black uppercase text-slate-400 dark:text-white/30 pl-2 mb-1 block">ФИО / Позывной</label>
                      <input 
                          value={editName}
                          onChange={(e) => setEditName(e.target.value)}
                          className="w-full bg-slate-50 dark:bg-white/5 p-4 pl-12 rounded-2xl font-bold text-slate-800 dark:text-white outline-none border border-transparent focus:border-[#6C5DD3] transition-all focus:bg-white dark:focus:bg-black focus:shadow-[0_0_20px_rgba(108,93,211,0.2)]"
                          placeholder="Ваше Имя"
                      />
                      <span className="absolute left-4 top-[34px] text-lg opacity-30 grayscale group-focus-within:grayscale-0 transition-all">👤</span>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                      <div className="relative group">
                          <label className="text-[10px] font-black uppercase text-slate-400 dark:text-white/30 pl-2 mb-1 block">Telegram</label>
                          <input 
                              value={editTelegram}
                              onChange={(e) => setEditTelegram(e.target.value)}
                              className="w-full bg-slate-50 dark:bg-white/5 p-4 pl-10 rounded-2xl font-bold text-slate-800 dark:text-white outline-none border border-transparent focus:border-[#6C5DD3] transition-all focus:bg-white dark:focus:bg-black"
                              placeholder="@username"
                          />
                          <span className="absolute left-4 top-[34px] text-lg opacity-30 grayscale group-focus-within:grayscale-0 transition-all">✈️</span>
                      </div>
                      <div className="relative group">
                          <label className="text-[10px] font-black uppercase text-slate-400 dark:text-white/30 pl-2 mb-1 block">Instagram</label>
                          <input 
                              value={editInstagram}
                              onChange={(e) => setEditInstagram(e.target.value)}
                              className="w-full bg-slate-50 dark:bg-white/5 p-4 pl-10 rounded-2xl font-bold text-slate-800 dark:text-white outline-none border border-transparent focus:border-[#6C5DD3] transition-all focus:bg-white dark:focus:bg-black"
                              placeholder="@insta"
                          />
                          <span className="absolute left-4 top-[34px] text-lg opacity-30 grayscale group-focus-within:grayscale-0 transition-all">📸</span>
                      </div>
                  </div>

                  <div>
                      <label className="text-[10px] font-black uppercase text-slate-400 dark:text-white/30 pl-2 mb-1 block">О себе</label>
                      <textarea 
                          value={editAbout}
                          onChange={(e) => setEditAbout(e.target.value)}
                          className="w-full bg-slate-50 dark:bg-white/5 p-4 rounded-2xl font-medium text-slate-800 dark:text-white text-sm outline-none border border-transparent focus:border-[#6C5DD3] transition-all focus:bg-white dark:focus:bg-black resize-none h-24"
                          placeholder="Расскажите о себе, целях и опыте..."
                      />
                  </div>
              </div>
          </div>

          {/* Invitation Link */}
          <div className="bg-gradient-to-r from-slate-100 to-white dark:from-[#1F2128] dark:to-[#14161B] p-6 rounded-[2.5rem] shadow-xl animate-slide-up delay-100 fill-mode-both text-slate-900 dark:text-white relative overflow-hidden border border-slate-200 dark:border-white/5">
             <div className="absolute top-0 right-0 p-4 opacity-10 text-5xl rotate-12 pointer-events-none">🤝</div>
             <h3 className="font-black mb-1 text-lg">Призыв в отряд</h3>
             <p className="text-slate-500 dark:text-white/40 text-xs mb-4">Ваша личная пригласительная ссылка</p>
             
             <div className="bg-white dark:bg-black/40 p-4 rounded-2xl border border-slate-200 dark:border-white/10 flex items-center justify-between gap-3 backdrop-blur-md">
                 <span className="text-xs font-mono text-[#6C5DD3] dark:text-[#FFAB7B] truncate flex-1">{inviteLink}</span>
                 <button 
                    onClick={copyInviteLink}
                    className="bg-slate-100 dark:bg-white/10 hover:bg-slate-200 dark:hover:bg-white/20 text-slate-800 dark:text-white p-2 rounded-xl text-xs font-bold transition-colors"
                 >
                    COPY
                 </button>
             </div>
          </div>

          {/* Notifications */}
          <div className="bg-white dark:bg-[#14161B] p-6 rounded-[2.5rem] border border-slate-200 dark:border-white/5 animate-slide-up delay-200 fill-mode-both shadow-md dark:shadow-none">
              <h3 className="font-black text-slate-800 dark:text-white mb-6 text-lg">Уведомления</h3>
              
              <div className="space-y-4">
                  {[
                      { key: 'pushEnabled', label: 'Push-уведомления' },
                      { key: 'telegramSync', label: 'Синхронизация Telegram' },
                  ].map((item) => (
                      <div key={item.key} className="flex items-center justify-between p-2 hover:bg-slate-50 dark:hover:bg-white/5 rounded-xl transition-colors">
                          <span className="font-bold text-sm text-slate-700 dark:text-white">{item.label}</span>
                          <button 
                            onClick={() => toggleNotification(item.key as keyof typeof editNotifications)}
                            className={`w-12 h-7 rounded-full p-1 transition-colors duration-300 ${
                                editNotifications[item.key as keyof typeof editNotifications] 
                                ? 'bg-[#6C5DD3]' 
                                : 'bg-slate-200 dark:bg-white/10'
                            }`}
                          >
                              <div className={`w-5 h-5 rounded-full bg-white shadow-sm transition-transform duration-300 ${
                                  editNotifications[item.key as keyof typeof editNotifications] 
                                  ? 'translate-x-5' 
                                  : 'translate-x-0'
                              }`} />
                          </button>
                      </div>
                  ))}
              </div>
          </div>

          <button 
            onClick={handleSaveSettings}
            disabled={isSaving}
            className="w-full py-4 bg-[#6C5DD3] text-white rounded-[1.5rem] font-black uppercase tracking-widest shadow-[0_10px_30px_rgba(108,93,211,0.3)] hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-2 animate-slide-up delay-300 fill-mode-both hover:bg-[#5b4eb5]"
          >
              {isSaving ? 'Сохранение...' : 'Сохранить изменения'}
          </button>
          
          <button 
             onClick={onLogout} 
             className="w-full py-4 text-red-500 font-black uppercase tracking-widest hover:bg-red-500/10 rounded-[1.5rem] transition-colors"
          >
             Выйти из системы
          </button>
      </div>
  );

  // --- MAIN RENDER ---
  
  // If activeTabOverride is set, render only the content part without the header
  if (activeTabOverride) {
      return (
          <div className="animate-fade-in">
              {renderLeaderboard()}
          </div>
      );
  }
  
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#050505] pb-32 overflow-x-hidden transition-colors duration-300">
      {/* HEADER WITH 3D AVATAR */}
      <div className="relative bg-white dark:bg-[#14161B] pb-10 rounded-b-[3rem] overflow-hidden border-b border-slate-200 dark:border-white/5 shadow-xl dark:shadow-none transition-colors duration-300">
          {/* Animated Background */}
          <div className="absolute inset-0 opacity-10">
             <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_50%_50%,_rgba(108,93,211,0.4),_transparent_70%)]"></div>
             <div className="absolute bottom-0 w-full h-1/2 bg-[linear-gradient(to_top,_#F3F4F6,_transparent)] dark:bg-[linear-gradient(to_top,_#050505,_transparent)]"></div>
          </div>

          {/* Top Bar */}
          <div className="relative z-20 px-6 pt-12 flex justify-between items-start mb-4">
             <div className="px-3 py-1 rounded-full bg-slate-100 dark:bg-white/5 backdrop-blur-md border border-slate-200 dark:border-white/10 text-[10px] font-black text-slate-500 dark:text-white/70 uppercase tracking-widest">
                 {userProgress.role}
             </div>
          </div>

          {/* 3D AVATAR STAGE */}
          <div 
            className="relative z-10 flex flex-col items-center justify-center perspective-container py-4"
            onMouseMove={handleMouseMove}
            onMouseLeave={handleMouseLeave}
            ref={avatarRef}
          >
              <div 
                 className="relative w-48 h-48 md:w-56 md:h-56 transition-transform duration-100 ease-out preserve-3d"
                 style={{ 
                     transform: `rotateX(${tilt.x}deg) rotateY(${tilt.y}deg)`,
                 }}
              >
                  {/* Holographic Ring Base */}
                  <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-40 h-40 bg-[#6C5DD3]/20 rounded-full blur-xl transform scale-y-50 animate-pulse"></div>
                  
                  {/* Energy Aura/Glow behind */}
                  <div className="absolute inset-0 rounded-[2.5rem] bg-[#6C5DD3]/20 blur-2xl animate-pulse-slow"></div>

                  {/* The Avatar Image */}
                  <div className="w-full h-full rounded-[2.5rem] border-4 border-white dark:border-[#1F2128] shadow-[0_20px_50px_rgba(0,0,0,0.2)] dark:shadow-[0_20px_50px_rgba(0,0,0,0.8)] overflow-hidden relative bg-slate-100 dark:bg-[#0F1115] group animate-avatar-breathe">
                      <img 
                        src={userProgress.avatarUrl || `https://ui-avatars.com/api/?name=${userProgress.name}`} 
                        className="w-full h-full object-cover transform scale-110 group-hover:scale-100 transition-transform duration-700"
                        alt="Avatar" 
                      />
                      {/* Scanline Effect */}
                      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-[#6C5DD3]/10 to-transparent h-[200%] w-full animate-scanline pointer-events-none"></div>
                      <div className="absolute inset-0 ring-1 ring-inset ring-black/5 dark:ring-white/10 rounded-[2.5rem]"></div>
                  </div>
              </div>

              <div className="text-center mt-6">
                  <h1 className="text-3xl font-black text-slate-900 dark:text-white leading-tight mb-1">{userProgress.name}</h1>
                  <p className="text-[#6C5DD3] font-bold text-xs uppercase tracking-[0.2em]">{userProgress.armorStyle || 'Recruit'}</p>
              </div>
          </div>
      </div>

      {/* NAVIGATION TABS */}
      <div className="px-6 -mt-8 relative z-20">
          <div className="bg-white dark:bg-[#14161B] p-2 rounded-[2rem] shadow-2xl shadow-slate-200/50 dark:shadow-black/50 flex justify-between items-center mb-8 overflow-x-auto no-scrollbar relative z-30 border border-slate-200 dark:border-white/5 transition-colors duration-300">
              {[
                  { id: 'STATS', icon: '📊', label: 'Инфо' },
                  { id: 'CALENDAR', icon: '📅', label: 'План' },
                  { id: 'RATING', icon: '🏆', label: 'Топ' },
                  { id: 'SETTINGS', icon: '⚙️', label: 'Опции' },
              ].map((tab) => {
                  const isActive = activeTab === tab.id;
                  return (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id as ProfileTab)}
                        className={`flex items-center gap-2 px-4 py-3 rounded-[1.5rem] transition-all duration-300 min-w-[90px] justify-center relative overflow-hidden ${
                            isActive 
                            ? 'bg-slate-900 dark:bg-[#1F2128] text-white shadow-lg shadow-[#6C5DD3]/20 scale-105 ring-1 ring-[#6C5DD3]/50' 
                            : 'text-slate-400 dark:text-white/30 hover:bg-slate-100 dark:hover:bg-white/5 hover:text-slate-900 dark:hover:text-white'
                        }`}
                    >
                        {isActive && (
                            <div className="absolute inset-0 bg-gradient-to-tr from-[#6C5DD3]/20 to-transparent pointer-events-none"></div>
                        )}
                        <span className={`text-lg relative z-10 transition-transform duration-300 ${isActive ? 'rotate-6' : ''}`}>{tab.icon}</span>
                        <span className="text-[10px] font-black uppercase tracking-wide relative z-10">{tab.label}</span>
                    </button>
                  );
              })}
          </div>

          {/* CONTENT AREA */}
          <div className="min-h-[300px]">
              {activeTab === 'STATS' && renderStats()}
              {activeTab === 'CALENDAR' && <CalendarView externalEvents={events} isDark={userProgress.theme === 'DARK'} />}
              {activeTab === 'RATING' && renderLeaderboard()}
              {activeTab === 'SETTINGS' && renderSettings()}
          </div>
      </div>

      <style>{`
        .perspective-container { perspective: 1000px; }
        .preserve-3d { transform-style: preserve-3d; }
        @keyframes scanline {
            0% { transform: translateY(-50%); }
            100% { transform: translateY(0%); }
        }
        .animate-scanline { animation: scanline 3s linear infinite; }
        @keyframes breathe {
            0%, 100% { transform: scale(1); box-shadow: 0 20px 50px rgba(0,0,0,0.8); border-color: rgba(255,255,255,0.05); }
            50% { transform: scale(1.02); box-shadow: 0 25px 60px rgba(108, 93, 211, 0.2); border-color: rgba(108, 93, 211, 0.3); }
        }
        .animate-avatar-breathe {
            animation: breathe 4s ease-in-out infinite;
        }
      `}</style>
    </div>
  );
};
