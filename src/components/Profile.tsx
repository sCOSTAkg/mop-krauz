
import React, { useState, useEffect, useRef } from 'react';
import { UserProgress, CalendarEvent, UserRole, AppConfig, Tab, SmartNavAction } from '../types';
import { CalendarView } from './CalendarView';
import { telegram } from '../services/telegramService';
import { Avatar } from '../utils/avatar';
import { XPService, XP_RULES } from '../services/xpService';
import { Storage } from '../services/storage';
import { verifyStoryScreenshot } from '../services/geminiService';
import { Auth } from './Auth';

interface ProfileProps {
  userProgress: UserProgress;
  onLogout: () => void;
  allUsers: UserProgress[];
  onUpdateUser: (updatedUser: Partial<UserProgress>) => void;
  events: CalendarEvent[];
  activeTabOverride?: string;
  onLogin: (data: any) => void;
  onNavigate: (tab: Tab) => void;
  setNavAction?: (action: SmartNavAction | null) => void; // New Prop
}

type ProfileTab = 'STATS' | 'CALENDAR' | 'RATING' | 'SETTINGS';

export const Profile: React.FC<ProfileProps> = ({ userProgress, onLogout, allUsers, onUpdateUser, events, activeTabOverride, onLogin, onNavigate, setNavAction }) => {
  const [activeTab, setActiveTab] = useState<ProfileTab>((activeTabOverride as ProfileTab) || 'STATS');

  // Settings State
  const [editName, setEditName] = useState(userProgress.name || '');
  const [editTelegram, setEditTelegram] = useState(userProgress.telegramUsername || '');
  const [editInstagram, setEditInstagram] = useState(userProgress.instagram || '');
  const [editAbout, setEditAbout] = useState(userProgress.aboutMe || '');
  
  const safeNotifications = userProgress.notifications || { 
      pushEnabled: false, 
      telegramSync: false, 
      deadlineReminders: false, 
      chatNotifications: false 
  };
  const [editNotifications, setEditNotifications] = useState(safeNotifications);

  const [isSaving, setIsSaving] = useState(false);
  const [storyFile, setStoryFile] = useState<string | null>(null);
  const storyInputRef = useRef<HTMLInputElement>(null);
  const [verifyingStory, setVerifyingStory] = useState(false);

  // Config for invite link
  const appConfig = Storage.get<AppConfig>('appConfig', {} as any);
  const inviteBase = appConfig?.integrations?.inviteBaseUrl || 'https://t.me/SalesProBot?start=ref_';
  const inviteLink = `${inviteBase}${userProgress.telegramUsername || 'unknown'}`;

  // Manage Nav Action based on Tab
  useEffect(() => {
      if (activeTab === 'SETTINGS' && setNavAction) {
          setNavAction({
              label: isSaving ? 'СОХРАНЕНИЕ...' : 'СОХРАНИТЬ',
              onClick: handleSaveSettings,
              variant: 'primary',
              loading: isSaving,
              icon: '💾'
          });
      } else if (setNavAction) {
          setNavAction(null);
      }
  }, [activeTab, isSaving, editName, editTelegram, editInstagram, editAbout]); // Dependencies to ensure fresh state

  // If not authenticated, show Auth component within Profile tab
  if (!userProgress.isAuthenticated) {
      return (
          <div className="min-h-full">
              <Auth onLogin={onLogin} existingUsers={allUsers} />
          </div>
      );
  }

  const handleSaveSettings = () => {
    setIsSaving(true);
    // Simulate network delay
    setTimeout(() => {
        onUpdateUser({
            name: editName,
            telegramUsername: editTelegram,
            instagram: editInstagram,
            aboutMe: editAbout,
            notifications: editNotifications
        });
        telegram.haptic('success');
        setIsSaving(false);
    }, 800);
  };

  const themeOptions: { value: import('../types').AppTheme; label: string; icon: string; desc: string }[] = [
      { value: 'SYSTEM', label: 'Система', icon: '📱', desc: 'Как в устройстве' },
      { value: 'AUTO', label: 'Авто', icon: '🌓', desc: 'По времени дня' },
      { value: 'LIGHT', label: 'Светлая', icon: '☀️', desc: 'Всегда светлая' },
      { value: 'DARK', label: 'Тёмная', icon: '🌙', desc: 'Всегда тёмная' },
  ];

  const setTheme = (t: import('../types').AppTheme) => {
      onUpdateUser({ theme: t });
      telegram.haptic('selection');
  };

  const copyInviteLink = () => {
      navigator.clipboard.writeText(inviteLink);
      telegram.haptic('selection');
      telegram.showAlert(`Ссылка скопирована: ${inviteLink}`, 'Успех');
  };

  const handleStoryFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      setVerifyingStory(true);
      telegram.haptic('medium');
      
      const reader = new FileReader();
      reader.onloadend = async () => {
          const base64 = reader.result as string;
          const isValid = await verifyStoryScreenshot(base64);
          
          if (isValid) {
              const result = XPService.shareStory(userProgress);
              if (result.allowed) {
                  onUpdateUser(result.user);
                  telegram.showAlert(`Скриншот принят! Начислено +${result.xp} XP`, 'Успех');
                  telegram.haptic('success');
              } else {
                  telegram.showAlert(result.message || 'Лимит', 'Внимание');
              }
          } else {
              telegram.showAlert('ИИ не распознал сторис или упоминание курса. Попробуйте четкий скриншот.', 'Ошибка');
              telegram.haptic('error');
          }
          setVerifyingStory(false);
      };
      reader.readAsDataURL(file);
  };

  const handleShareStoryClick = () => {
      storyInputRef.current?.click();
  };

  // --- SUB-COMPONENTS ---

  const renderStats = () => (
      <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3 animate-fade-in">
              <div className="bg-card p-4 rounded-2xl border border-border-color flex flex-col justify-between h-28">
                  <div className="w-8 h-8 bg-[#6C5DD3]/10 rounded-xl flex items-center justify-center text-lg">⚡</div>
                  <div>
                      <h3 className="text-2xl font-bold text-text-primary">{userProgress.xp}</h3>
                      <p className="text-xs text-text-secondary">XP</p>
                  </div>
              </div>
              <div className="bg-card p-4 rounded-2xl border border-border-color flex flex-col justify-between h-28">
                  <div className="w-8 h-8 bg-[#6C5DD3]/10 rounded-xl flex items-center justify-center text-lg">🛡️</div>
                  <div>
                      <h3 className="text-2xl font-bold text-text-primary">{userProgress.level}</h3>
                      <p className="text-xs text-text-secondary">Уровень</p>
                  </div>
              </div>
          </div>

          <div className="grid grid-cols-2 gap-3 animate-fade-in">
              <button onClick={() => { telegram.haptic('medium'); onNavigate(Tab.HABITS); }} className="bg-card p-4 rounded-2xl border border-border-color text-left active:scale-95 transition-transform">
                  <div className="w-8 h-8 rounded-xl bg-body flex items-center justify-center text-lg mb-3">🔥</div>
                  <h3 className="text-xl font-bold text-text-primary">{Math.max(...(userProgress.habits?.map(h => h.streak) || [0]))}</h3>
                  <p className="text-xs text-text-secondary">Лучшая серия</p>
              </button>
              <button onClick={() => { telegram.haptic('medium'); onNavigate(Tab.NOTEBOOK); }} className="bg-card p-4 rounded-2xl border border-border-color text-left active:scale-95 transition-transform">
                  <div className="w-8 h-8 rounded-xl bg-body flex items-center justify-center text-lg mb-3">📝</div>
                  <h3 className="text-xl font-bold text-text-primary">{userProgress.notebook?.length || 0}</h3>
                  <p className="text-xs text-text-secondary">Записей</p>
              </button>
          </div>

          <div className="bg-card p-4 rounded-2xl border border-border-color animate-fade-in">
             <h3 className="font-semibold text-text-primary mb-4">Активность</h3>
             <div className="flex items-end h-28 gap-2">
                 {[40, 65, 30, 80, 50, 90, 60].map((h, i) => (
                     <div key={i} className="flex-1 flex flex-col items-center gap-1.5">
                         <div className="w-full bg-body rounded-lg relative h-full overflow-hidden">
                             <div className="absolute bottom-0 w-full bg-[#6C5DD3] rounded-lg transition-all duration-500" style={{ height: `${h}%` }}></div>
                         </div>
                         <span className="text-[10px] text-text-secondary">{['Пн','Вт','Ср','Чт','Пт','Сб','Вс'][i]}</span>
                     </div>
                 ))}
             </div>
          </div>
      </div>
  );

  const renderLeaderboard = () => {
      // Merge current user with allUsers if not present
      const combinedUsers = [...allUsers];
      if (!combinedUsers.find(u => u.name === userProgress.name)) {
          combinedUsers.push(userProgress);
      }
      // Sort desc
      const sortedUsers = combinedUsers.sort((a, b) => b.xp - a.xp);
      const top3 = sortedUsers.slice(0, 3);
      const rest = sortedUsers.slice(3);

      return (
          <div className="space-y-4">
              {/* Top 3 */}
              <div className="bg-card p-5 rounded-2xl border border-border-color animate-fade-in">
                  <div className="flex justify-center items-end gap-4 mb-4">
                      {top3[1] && (
                          <div className="flex flex-col items-center">
                              <div className="w-14 h-14 rounded-full border-2 border-border-color relative">
                                  <Avatar src={top3[1].avatarUrl} name={top3[1].name} size="w-full h-full" />
                                  <div className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 bg-text-secondary text-white text-[10px] font-semibold px-1.5 rounded-full">2</div>
                              </div>
                              <span className="text-xs font-medium mt-2 text-text-primary">{top3[1].name}</span>
                              <span className="text-xs text-text-secondary">{top3[1].xp}</span>
                          </div>
                      )}
                      {top3[0] && (
                          <div className="flex flex-col items-center -translate-y-3">
                              <div className="w-20 h-20 rounded-full border-3 border-[#FFD700] relative">
                                  <Avatar src={top3[0].avatarUrl} name={top3[0].name} size="w-full h-full" />
                                  <div className="absolute -top-4 left-1/2 -translate-x-1/2 text-2xl">👑</div>
                                  <div className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 bg-[#FFD700] text-black text-[10px] font-bold px-2 rounded-full">1</div>
                              </div>
                              <span className="text-sm font-bold mt-2 text-text-primary">{top3[0].name}</span>
                              <span className="text-xs text-text-secondary">{top3[0].xp} XP</span>
                          </div>
                      )}
                      {top3[2] && (
                          <div className="flex flex-col items-center">
                              <div className="w-14 h-14 rounded-full border-2 border-border-color relative">
                                  <Avatar src={top3[2].avatarUrl} name={top3[2].name} size="w-full h-full" />
                                  <div className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 bg-[#CD7F32] text-white text-[10px] font-semibold px-1.5 rounded-full">3</div>
                              </div>
                              <span className="text-xs font-medium mt-2 text-text-primary">{top3[2].name}</span>
                              <span className="text-xs text-text-secondary">{top3[2].xp}</span>
                          </div>
                      )}
                  </div>
              </div>

              {/* Bonus Actions */}
              <div className="bg-card p-4 rounded-2xl border border-border-color grid grid-cols-2 gap-3">
                  <button onClick={handleShareStoryClick} disabled={verifyingStory} className="bg-[#6C5DD3] text-white p-4 rounded-xl active:scale-95 transition-transform">
                      <input type="file" ref={storyInputRef} onChange={handleStoryFileChange} accept="image/*" className="hidden" />
                      <div className="flex flex-col items-center">
                          {verifyingStory ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin mb-1"></div> : <span className="text-xl mb-1">📸</span>}
                          <span className="text-xs font-semibold">{verifyingStory ? 'Проверка...' : 'Story'}</span>
                          <span className="text-xs opacity-70">+{XP_RULES.STORY_REPOST} XP</span>
                      </div>
                  </button>
                  <button onClick={copyInviteLink} className="bg-card border border-border-color text-text-primary p-4 rounded-xl active:scale-95 transition-transform">
                      <div className="flex flex-col items-center">
                          <span className="text-xl mb-1">🤝</span>
                          <span className="text-xs font-semibold">Пригласить</span>
                          <span className="text-xs text-text-secondary">+{XP_RULES.REFERRAL_FRIEND.toLocaleString()} XP</span>
                      </div>
                  </button>
              </div>

              {/* Full List */}
              <div className="bg-card rounded-2xl border border-border-color overflow-hidden animate-fade-in">
                  {rest.map((u, i) => (
                      <div key={i} className={`p-3 flex items-center justify-between border-b border-border-color last:border-0 ${u.name === userProgress.name ? 'bg-[#6C5DD3]/5' : ''}`}>
                          <div className="flex items-center gap-3">
                              <span className="text-text-secondary font-semibold text-sm w-6 text-center">{i + 4}</span>
                              <Avatar src={u.avatarUrl} name={u.name} size="w-9 h-9" />
                              <div>
                                  <p className="font-medium text-text-primary text-sm">{u.name} {u.name === userProgress.name && <span className="text-[#6C5DD3]">(Вы)</span>}</p>
                                  <p className="text-xs text-text-secondary">Lvl {u.level}</p>
                              </div>
                          </div>
                          <span className="font-semibold text-text-primary text-sm">{u.xp}</span>
                      </div>
                  ))}
              </div>
          </div>
      );
  };

  const renderSettings = () => (
      <div className="space-y-4">
          <div className="bg-card p-4 rounded-2xl border border-border-color animate-fade-in">
              <h3 className="font-semibold text-text-primary text-sm mb-3">Тема оформления</h3>
              <div className="grid grid-cols-4 gap-2">
                  {themeOptions.map(opt => (
                      <button
                          key={opt.value}
                          onClick={() => setTheme(opt.value)}
                          className={`flex flex-col items-center p-3 rounded-xl border transition-all active:scale-95 ${
                              userProgress.theme === opt.value
                                  ? 'border-[#6C5DD3] bg-[#6C5DD3]/10'
                                  : 'border-border-color bg-body'
                          }`}
                      >
                          <span className="text-xl mb-1">{opt.icon}</span>
                          <span className="text-xs font-semibold text-text-primary">{opt.label}</span>
                          <span className="text-[10px] text-text-secondary mt-0.5 leading-tight text-center">{opt.desc}</span>
                      </button>
                  ))}
              </div>
          </div>

          <div className="bg-card p-4 rounded-2xl border border-border-color space-y-4 animate-fade-in">
              <h3 className="font-semibold text-text-primary">Личные данные</h3>
              <div>
                  <label className="text-xs font-medium text-text-secondary ml-1 mb-1 block">Имя</label>
                  <input value={editName} onChange={(e) => setEditName(e.target.value)} className="w-full bg-body p-3 rounded-xl text-sm font-medium text-text-primary outline-none border border-border-color focus:border-[#6C5DD3] transition-all" placeholder="Ваше имя" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                  <div>
                      <label className="text-xs font-medium text-text-secondary ml-1 mb-1 block">Telegram</label>
                      <input value={editTelegram} onChange={(e) => setEditTelegram(e.target.value)} className="w-full bg-body p-3 rounded-xl text-sm text-text-primary outline-none border border-border-color focus:border-[#6C5DD3] transition-all" placeholder="@username" />
                  </div>
                  <div>
                      <label className="text-xs font-medium text-text-secondary ml-1 mb-1 block">Instagram</label>
                      <input value={editInstagram} onChange={(e) => setEditInstagram(e.target.value)} className="w-full bg-body p-3 rounded-xl text-sm text-text-primary outline-none border border-border-color focus:border-[#6C5DD3] transition-all" placeholder="@insta" />
                  </div>
              </div>
              <div>
                  <label className="text-xs font-medium text-text-secondary ml-1 mb-1 block">О себе</label>
                  <textarea value={editAbout} onChange={(e) => setEditAbout(e.target.value)} className="w-full bg-body p-3 rounded-xl text-sm text-text-primary outline-none border border-border-color focus:border-[#6C5DD3] transition-all resize-none h-20" placeholder="Расскажите о себе..." />
              </div>
          </div>

          <button onClick={onLogout} className="w-full py-3.5 text-[#FF3B30] font-semibold text-sm rounded-xl bg-[#FF3B30]/5 border border-[#FF3B30]/20 transition-colors">
             Выйти
          </button>
      </div>
  );

  // --- MAIN RENDER ---
  
  if (activeTabOverride) {
      return (
          <div className="animate-fade-in">
              {renderLeaderboard()}
          </div>
      );
  }
  
  return (
    <div className="min-h-screen bg-body pb-28">
      {/* Header */}
      <div className="bg-card border-b border-border-color pb-6 pt-[calc(var(--safe-top)+12px)]">
          <div className="flex items-center justify-between px-4 mb-4">
             <span className="text-xs font-medium text-text-secondary bg-body px-3 py-1 rounded-lg">{userProgress.role}</span>
          </div>

          <div className="flex flex-col items-center px-4">
              <div className="w-24 h-24 rounded-full border-2 border-border-color overflow-hidden mb-3">
                  <Avatar src={userProgress.avatarUrl} name={userProgress.name} size="w-full h-full" />
              </div>
              <h1 className="text-xl font-bold text-text-primary mb-0.5">{userProgress.name}</h1>
              <p className="text-[#6C5DD3] text-sm font-medium">{userProgress.armorStyle || 'Новичок'}</p>
          </div>
      </div>

      {/* Tabs */}
      <div className="px-4 pt-4">
          <div className="bg-card p-1 rounded-xl border border-border-color flex mb-4">
              {[
                  { id: 'STATS', label: 'Статистика' },
                  { id: 'CALENDAR', label: 'Календарь' },
                  { id: 'RATING', label: 'Рейтинг' },
                  { id: 'SETTINGS', label: 'Настройки' },
              ].map((tab) => (
                  <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id as ProfileTab)}
                      className={`flex-1 py-2 rounded-lg text-xs font-medium transition-all ${
                          activeTab === tab.id
                          ? 'bg-[#6C5DD3] text-white'
                          : 'text-text-secondary'
                      }`}
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
