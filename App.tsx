import React, { useState, useEffect, useRef, useCallback, lazy, Suspense } from 'react';
import { Tab, UserProgress, Lesson, AppConfig, Module, Material, Stream, CalendarEvent, ArenaScenario, AppNotification, Habit, Goal, SmartNavAction } from './types';
import { COURSE_MODULES, MOCK_EVENTS, MOCK_MATERIALS, MOCK_STREAMS } from './constants';
import { Storage } from './services/storage';
import { telegram } from './services/telegramService';
import { Toast, ToastMessage } from './components/Toast';
import { SmartNav } from './components/SmartNav';
import { Backend } from './services/backendService';
import { XPService } from './services/xpService';

// 🚀 LAZY LOADING - Components load only when needed
const HomeDashboard = lazy(() => import('./components/HomeDashboard'));
const Profile = lazy(() => import('./components/Profile'));
const LessonView = lazy(() => import('./components/LessonView'));
const AdminDashboard = lazy(() => import('./components/AdminDashboard'));
const SalesArena = lazy(() => import('./components/SalesArena'));
const HabitTracker = lazy(() => import('./components/HabitTracker'));
const NotebookView = lazy(() => import('./components/NotebookView'));
const MaterialsView = lazy(() => import('./components/MaterialsView'));
const VideoHub = lazy(() => import('./components/VideoHub'));
const ModuleList = lazy(() => import('./components/ModuleList'));
// SCENARIOS импортируется вместе с SalesArena, не нужен lazy load

// Loading Spinner
const LoadingSpinner = () => (
  <div className="flex items-center justify-center min-h-screen bg-body">
    <div className="relative w-16 h-16">
      <div className="absolute top-0 left-0 w-full h-full border-4 border-primary/20 rounded-full"></div>
      <div className="absolute top-0 left-0 w-full h-full border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
    </div>
  </div>
);

const DEFAULT_CONFIG: AppConfig = {
  appName: 'SalesPro: 300 Spartans',
  appDescription: 'Elite Sales Academy',
  primaryColor: '#6C5DD3',
  systemInstruction: `Ты — Командир элитного отряда продаж "300 Спартанцев". Твоя задача: сделать из новобранца настоящую машину продаж. СТИЛЬ: Жесткий, военный, вдохновляющий.`,
  welcomeVideoUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ', 
  welcomeMessage: 'Добро пожаловать в Спарту. Здесь куется характер.',
  integrations: { 
      telegramBotToken: '', 
      googleDriveFolderId: '', 
      crmWebhookUrl: '', 
      aiModelVersion: 'gemini-3-flash-preview',
      databaseUrl: '',
      airtablePat: '', 
      airtableBaseId: '',
      airtableTableName: 'Users'
  },
  features: { enableRealTimeSync: true, autoApproveHomework: false, maintenanceMode: false, allowStudentChat: true, publicLeaderboard: true },
  aiConfig: {
      activeProvider: 'GOOGLE_GEMINI',
      apiKeys: {},
      modelOverrides: {}
  },
  systemAgent: {
      enabled: false,
      autoFix: false,
      monitoringInterval: 20000,
      sensitivity: 'LOW',
      autonomyLevel: 'PASSIVE'
  }
};

const DEFAULT_USER: UserProgress = {
  name: 'Новобранец',
  role: 'STUDENT',
  isAuthenticated: false,
  xp: 0,
  level: 1,
  completedLessonIds: [],
  submittedHomeworks: [],
  chatHistory: [],
  theme: 'LIGHT',
  notifications: {
    pushEnabled: false,
    telegramSync: false,
    deadlineReminders: true,
    chatNotifications: true
  },
  notebook: [],
  habits: [],
  goals: [], 
  stats: XPService.getInitStats()
};

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<Tab>(Tab.HOME);
  const [adminSubTab, setAdminSubTab] = useState<'OVERVIEW' | 'COURSE' | 'MATERIALS' | 'STREAMS' | 'USERS' | 'SETTINGS' | 'ARENA' | 'CALENDAR'>('OVERVIEW');
  const [selectedLessonId, setSelectedLessonId] = useState<string | null>(null);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const [navAction, setNavAction] = useState<SmartNavAction | null>(null);

  const [appConfig, setAppConfig] = useState<AppConfig>(() => Storage.get<AppConfig>('appConfig', DEFAULT_CONFIG));
  const [modules, setModules] = useState<Module[]>(() => Storage.get<Module[]>('courseModules', COURSE_MODULES));
  const [materials, setMaterials] = useState<Material[]>(() => Storage.get<Material[]>('materials', MOCK_MATERIALS));
  const [streams, setStreams] = useState<Stream[]>(() => Storage.get<Stream[]>('streams', MOCK_STREAMS));
  const [events, setEvents] = useState<CalendarEvent[]>(() => Storage.get<CalendarEvent[]>('events', MOCK_EVENTS));
  const [scenarios, setScenarios] = useState<ArenaScenario[]>(() => Storage.get<ArenaScenario[]>('scenarios', []));
  const [allUsers, setAllUsers] = useState<UserProgress[]>(() => Storage.get<UserProgress[]>('allUsers', []));
  const [userProgress, setUserProgress] = useState<UserProgress>(() => Storage.get<UserProgress>('progress', DEFAULT_USER));
  const [notifications, setNotifications] = useState<AppNotification[]>(() => Storage.get<AppNotification[]>('local_notifications', []));

  const activeLesson = selectedLessonId ? modules.flatMap(m => m.lessons).find(l => l.id === selectedLessonId) : null;
  const activeModule = activeLesson ? modules.find(m => m.lessons.some(l => l.id === activeLesson.id)) : null;

  useEffect(() => {
      setNavAction(null);
  }, [activeTab, selectedLessonId]);

  const syncData = useCallback(async () => {
      const remoteConfig = await Backend.fetchGlobalConfig(appConfig);
      if (JSON.stringify(remoteConfig) !== JSON.stringify(appConfig)) {
          setAppConfig(remoteConfig);
      }

      const rawNotifs = await Backend.fetchNotifications();
      const myNotifs = rawNotifs.filter(n => {
          if (n.targetUserId && n.targetUserId !== userProgress.telegramId) return false;
          if (n.targetRole && n.targetRole !== 'ALL' && n.targetRole !== userProgress.role) return false;
          return true;
      });

      if (myNotifs.length > notifications.length) {
          const latest = myNotifs[0];
          if (latest && latest.date > new Date(Date.now() - 10000).toISOString()) { 
               addToast(latest.type === 'ALERT' ? 'error' : 'info', latest.title, latest.link);
               telegram.haptic('success');
          }
      }
      setNotifications(myNotifs);

      const content = await Backend.fetchAllContent();
      if (content) {
          if (JSON.stringify(content.modules) !== JSON.stringify(modules)) setModules(content.modules);
          if (JSON.stringify(content.materials) !== JSON.stringify(materials)) setMaterials(content.materials);
          if (JSON.stringify(content.streams) !== JSON.stringify(streams)) setStreams(content.streams);
          if (JSON.stringify(content.events) !== JSON.stringify(events)) setEvents(content.events);
          if (JSON.stringify(content.scenarios) !== JSON.stringify(scenarios)) setScenarios(content.scenarios);
      }

      const remoteUsers = await Backend.getLeaderboard();
      if (JSON.stringify(remoteUsers) !== JSON.stringify(allUsers)) {
          setAllUsers(remoteUsers);
      }

      if (userProgress.isAuthenticated) {
          const freshUser = await Backend.syncUser(userProgress);
          if (freshUser.xp !== userProgress.xp || freshUser.level !== userProgress.level || freshUser.role !== userProgress.role) {
              setUserProgress(prev => ({ ...prev, ...freshUser }));
          }
      }
  }, [appConfig, userProgress, modules, materials, streams, events, scenarios, allUsers, notifications]);

  useEffect(() => {
      syncData();
      const interval = setInterval(syncData, 15000); 
      return () => clearInterval(interval);
  }, [syncData]);


  useEffect(() => {
    const root = document.documentElement;
    if (userProgress.theme === 'DARK') {
        root.classList.add('dark');
        telegram.setBackgroundColor('#050505');
        telegram.setHeaderColor('#050505');
    } else {
        root.classList.remove('dark');
        telegram.setBackgroundColor('#F3F4F6');
        telegram.setHeaderColor('#F3F4F6');
    }
  }, [userProgress.theme]);

  useEffect(() => {
    Storage.set('progress', userProgress);
    const timer = setTimeout(() => {
        if (userProgress.isAuthenticated) Backend.saveUser(userProgress);
    }, 2000); 
    return () => clearTimeout(timer);
  }, [userProgress]);

  const addToast = (type: 'success' | 'error' | 'info', message: string, link?: string) => {
    const id = Date.now().toString();
    setToasts(prev => [...prev, { id, type, message, link }]);
    if (telegram.isAvailable) telegram.haptic(type === 'error' ? 'error' : 'success');
  };

  const removeToast = (id: string) => setToasts(prev => prev.filter(t => t.id !== id));

  const handleNavigate = (link?: string) => {
      if (!link) return;
      if (link.startsWith('http')) {
          window.open(link, '_blank');
      } else if (Object.values(Tab).includes(link as Tab)) {
          setActiveTab(link as Tab);
      }
  };

  const handleLogin = async (userData: any) => {
    addToast('info', 'Синхронизация данных...');
    const tempUser = { ...userProgress, ...userData, isAuthenticated: true };
    const syncedUser = await Backend.syncUser(tempUser); 
    setUserProgress(syncedUser);
    Backend.saveUser(syncedUser);
    await syncData(); 
    addToast('success', 'С возвращением, боец!');
  };

  const handleLogout = () => {
    setUserProgress({ ...DEFAULT_USER });
    setActiveTab(Tab.HOME);
  };

  const handleUpdateUser = (data: Partial<UserProgress>) => setUserProgress(prev => ({ ...prev, ...data }));

  const handleUpdateModules = (newModules: Module[]) => { 
      setModules(newModules); 
      Backend.saveCollection('modules', newModules); 
  };
  const handleUpdateMaterials = (newMats: Material[]) => { 
      setMaterials(newMats); 
      Backend.saveCollection('materials', newMats); 
  };
  const handleUpdateStreams = (newStreams: Stream[]) => { 
      setStreams(newStreams); 
      Backend.saveCollection('streams', newStreams); 
  };
  const handleUpdateEvents = (newEvents: CalendarEvent[]) => { 
      setEvents(newEvents); 
      Backend.saveCollection('events', newEvents); 
  };
  const handleUpdateScenarios = (newScenarios: ArenaScenario[]) => { 
      setScenarios(newScenarios); 
      Backend.saveCollection('scenarios', newScenarios); 
  };
  const handleUpdateConfig = (newConfig: AppConfig) => { 
      setAppConfig(newConfig); 
      Backend.saveGlobalConfig(newConfig); 
  };
  const handleUpdateAllUsers = (newUsers: UserProgress[]) => {
      setAllUsers(newUsers);
      Storage.set('allUsers', newUsers);
  };
  const handleSendBroadcast = (notification: AppNotification) => {
      Backend.sendBroadcast(notification);
      setNotifications(prev => [notification, ...prev]);
      addToast('success', 'Оповещение отправлено');
  };
  const handleClearNotifications = () => {
      Storage.set('local_notifications', []);
      setNotifications([]);
      Backend.saveCollection('notifications', []); 
      addToast('info', 'История очищена');
  };

  const handleUpdateLesson = (updatedLesson: Lesson) => {
      const updatedModules = modules.map(m => {
          if (m.lessons.some(l => l.id === updatedLesson.id)) {
              return {
                  ...m,
                  lessons: m.lessons.map(l => l.id === updatedLesson.id ? updatedLesson : l)
              };
          }
          return m;
      });
      setModules(updatedModules);
      Backend.saveCollection('modules', updatedModules);
      addToast('success', 'Урок обновлен');
  };

  const handleCompleteLesson = (lessonId: string, xpBonus: number) => {
      const newXp = userProgress.xp + xpBonus;
      const newLevel = Math.floor(newXp / 1000) + 1;

      setUserProgress(prev => ({
          ...prev,
          xp: newXp,
          level: newLevel,
          completedLessonIds: [...prev.completedLessonIds, lessonId]
      }));
      addToast('success', `Урок пройден! +${xpBonus} XP`);
      setSelectedLessonId(null);
  };

  const handleXPEarned = (amount: number) => {
      setUserProgress(prev => {
          const newXp = prev.xp + amount;
          return {
              ...prev,
              xp: newXp,
              level: Math.floor(newXp / 1000) + 1
          };
      });
      addToast('success', `+${amount} XP`);
  };

  return (
    <div className="flex flex-col h-[100dvh] bg-body text-text-primary transition-colors duration-300 overflow-hidden relative">
      <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
          <video 
              autoPlay 
              loop 
              muted 
              playsInline 
              className="w-full h-full object-cover filter blur-sm opacity-30 dark:opacity-20 scale-110"
              src="https://assets.mixkit.co/videos/preview/mixkit-stars-in-space-background-1610-large.mp4"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-transparent via-body/40 to-body"></div>
      </div>

      <div className="fixed top-[var(--safe-top)] left-4 right-4 z-[200] flex flex-col gap-2 pointer-events-none">
        {toasts.map(t => <Toast key={t.id} toast={t} onRemove={removeToast} onClick={() => handleNavigate(t.link)} />)}
      </div>

      <Suspense fallback={<LoadingSpinner />}>
        <main className="flex-1 overflow-y-auto no-scrollbar scroll-smooth relative z-10">
          {activeLesson ? (
             <div className="animate-slide-up min-h-full bg-body relative z-10">
               <LessonView 
                 lesson={activeLesson}
                 isCompleted={userProgress.completedLessonIds.includes(activeLesson.id)}
                 onComplete={handleCompleteLesson}
                 onBack={() => setSelectedLessonId(null)}
                 onNavigate={(id) => setSelectedLessonId(id)}
                 parentModule={activeModule}
                 userProgress={userProgress}
                 onUpdateUser={handleUpdateUser}
                 onUpdateLesson={handleUpdateLesson}
               />
             </div>
          ) : (
             <div key={activeTab} className="animate-fade-in min-h-full relative z-10">
                {activeTab === Tab.HOME && (
                   <HomeDashboard 
                     onNavigate={setActiveTab}
                     userProgress={userProgress}
                     onProfileClick={() => setActiveTab(Tab.PROFILE)}
                     modules={modules}
                     materials={materials}
                     streams={streams}
                     scenarios={scenarios}
                     onSelectLesson={(l) => setSelectedLessonId(l.id)}
                     onUpdateUser={handleUpdateUser}
                     allUsers={allUsers}
                     notifications={notifications}
                     appConfig={appConfig} 
                   />
                )}

                {activeTab === Tab.ARENA && <SalesArena userProgress={userProgress} />}

                {activeTab === Tab.HABITS && (
                    <HabitTracker 
                        habits={userProgress.habits || []}
                        goals={userProgress.goals || []}
                        onUpdateHabits={(habits) => handleUpdateUser({ habits })}
                        onUpdateGoals={(goals) => handleUpdateUser({ goals })}
                        onXPEarned={handleXPEarned}
                        onBack={() => setActiveTab(Tab.HOME)}
                        setNavAction={setNavAction} 
                        isAuthenticated={userProgress.isAuthenticated}
                    />
                )}

                {activeTab === Tab.NOTEBOOK && (
                   <NotebookView 
                      entries={userProgress.notebook} 
                      onUpdate={(e) => handleUpdateUser({ notebook: e })} 
                      onBack={() => setActiveTab(Tab.HOME)} 
                      onXPEarned={handleXPEarned}
                      setNavAction={setNavAction} 
                   />
                )}

                {activeTab === Tab.MATERIALS && (
                    <MaterialsView 
                      materials={materials} 
                      onBack={() => setActiveTab(Tab.HOME)} 
                      userProgress={userProgress} 
                    />
                )}

                {activeTab === Tab.STREAMS && (
                    <VideoHub 
                      streams={streams} 
                      onBack={() => setActiveTab(Tab.HOME)} 
                      userProgress={userProgress}
                      onUpdateUser={handleUpdateUser}
                      setNavAction={setNavAction} 
                    />
                )}

                {activeTab === Tab.MODULES && (
                    <div className="px-6 pt-10 pb-32 max-w-2xl mx-auto space-y-8 animate-fade-in">
                        <div className="flex items-center gap-4">
                            <button onClick={() => setActiveTab(Tab.HOME)} className="w-10 h-10 rounded-2xl bg-surface border border-border-color flex items-center justify-center active:scale-90 transition-transform">
                                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" /></svg>
                            </button>
                            <div>
                                <span className="text-[#6C5DD3] text-[10px] font-black uppercase tracking-[0.3em] mb-1 block">Full Course</span>
                                <h1 className="text-3xl font-black text-text-primary tracking-tighter">ВСЕ МОДУЛИ</h1>
                            </div>
                        </div>
                        <ModuleList modules={modules} userProgress={userProgress} onSelectLesson={(l) => setSelectedLessonId(l.id)} onBack={() => setActiveTab(Tab.HOME)} />
                    </div>
                )}

                {activeTab === Tab.PROFILE && (
                   <Profile 
                      userProgress={userProgress} 
                      onLogout={handleLogout} 
                      allUsers={allUsers}
                      onUpdateUser={handleUpdateUser}
                      events={events}
                      onLogin={handleLogin}
                      onNavigate={setActiveTab}
                      setNavAction={setNavAction} 
                   />
                )}

                {activeTab === Tab.ADMIN_DASHBOARD && userProgress.role === 'ADMIN' && (
                    <AdminDashboard 
                      config={appConfig}
                      onUpdateConfig={handleUpdateConfig}
                      modules={modules}
                      onUpdateModules={handleUpdateModules}
                      materials={materials}
                      onUpdateMaterials={handleUpdateMaterials}
                      streams={streams}
                      onUpdateStreams={handleUpdateStreams}
                      events={events}
                      onUpdateEvents={handleUpdateEvents}
                      scenarios={scenarios}
                      onUpdateScenarios={handleUpdateScenarios}
                      users={allUsers}
                      onUpdateUsers={handleUpdateAllUsers}
                      currentUser={userProgress}
                      activeSubTab={adminSubTab}
                      onSendBroadcast={handleSendBroadcast}
                      notifications={notifications}
                      onClearNotifications={handleClearNotifications}
                      addToast={addToast}
                    />
                )}
             </div>
          )}
        </main>
      </Suspense>

      <SmartNav 
        activeTab={activeTab} 
        setActiveTab={setActiveTab} 
        role={userProgress.role} 
        adminSubTab={adminSubTab}
        setAdminSubTab={(t) => setAdminSubTab(t as any)}
        isLessonActive={!!selectedLessonId}
        onExitLesson={() => setSelectedLessonId(null)}
        notifications={notifications}
        onClearNotifications={handleClearNotifications}
        action={navAction} 
      />
    </div>
  );
};

export default App;
