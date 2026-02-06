
import React, { useState, useEffect } from 'react';
import { Tab, UserProgress, Lesson, AppConfig, Module, Material, Stream, CalendarEvent, ArenaScenario, AppNotification } from './types';
import { COURSE_MODULES, MOCK_EVENTS, MOCK_MATERIALS, MOCK_STREAMS } from './constants';
import { HomeDashboard } from './components/HomeDashboard';
import { Profile } from './components/Profile';
import { LessonView } from './components/LessonView';
import { AdminDashboard } from './components/AdminDashboard';
import { CuratorDashboard } from './components/CuratorDashboard';
import { Auth } from './components/Auth';
import { Welcome } from './components/Welcome';
import { SmartNav } from './components/SmartNav';
import { Storage } from './services/storage';
import { telegram } from './services/telegramService';
import { Toast, ToastMessage } from './components/Toast';
import { SCENARIOS, SalesArena } from './components/SalesArena'; 
import { NotebookView } from './components/NotebookView';
import { MaterialsView } from './components/MaterialsView';
import { StreamsView } from './components/StreamsView';
import { SystemHealthAgent } from './components/SystemHealthAgent';
import { Backend } from './services/backendService';
import { XPService } from './services/xpService';

const DEFAULT_CONFIG: AppConfig = {
  appName: 'SalesPro: 300 Spartans',
  appDescription: 'Elite Sales Academy',
  primaryColor: '#6C5DD3',
  systemInstruction: `Ты — Командир элитного отряда продаж "300 Спартанцев". Твоя задача: сделать из новобранца настоящую машину продаж. СТИЛЬ: Жесткий, военный, вдохновляющий.`,
  integrations: { 
      telegramBotToken: '', 
      googleDriveFolderId: '', 
      crmWebhookUrl: '', 
      aiModelVersion: 'gemini-3-flash-preview',
      supabaseUrl: "https://ijyktbybtsxkknxexftf.supabase.co",
      supabaseAnonKey: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlqeWt0YnlidHN4a2tueGV4ZnRmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk5NTAxMTUsImV4cCI6MjA4NTUyNjExNX0.ks8PXhkJDUaiey4CQahf2jl_-Mo_WaDeDtwtNlttYcI"
  },
  features: { enableRealTimeSync: true, autoApproveHomework: false, maintenanceMode: false, allowStudentChat: true, publicLeaderboard: true },
  aiConfig: {
      activeProvider: 'GOOGLE_GEMINI',
      apiKeys: {},
      modelOverrides: {}
  },
  systemAgent: {
      enabled: true,
      autoFix: true,
      monitoringInterval: 15000,
      sensitivity: 'HIGH'
  }
};

const DEFAULT_USER: UserProgress = {
  name: '',
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
  stats: XPService.getInitStats()
};

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<Tab>(Tab.HOME);
  const [adminSubTab, setAdminSubTab] = useState<'OVERVIEW' | 'COURSE' | 'MATERIALS' | 'STREAMS' | 'USERS' | 'SETTINGS' | 'ARENA' | 'CALENDAR' | 'NEURAL_CORE' | 'DATABASE' | 'DEPLOY'>('OVERVIEW');
  const [selectedLessonId, setSelectedLessonId] = useState<string | null>(null);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const [showWelcome, setShowWelcome] = useState(true);

  // Initialize from LocalStorage (Fast Load)
  const [appConfig, setAppConfig] = useState<AppConfig>(() => Storage.get<AppConfig>('appConfig', DEFAULT_CONFIG));
  const [modules, setModules] = useState<Module[]>(() => Storage.get<Module[]>('courseModules', COURSE_MODULES));
  const [materials, setMaterials] = useState<Material[]>(() => Storage.get<Material[]>('materials', MOCK_MATERIALS));
  const [streams, setStreams] = useState<Stream[]>(() => Storage.get<Stream[]>('streams', MOCK_STREAMS));
  const [events, setEvents] = useState<CalendarEvent[]>(() => Storage.get<CalendarEvent[]>('events', MOCK_EVENTS));
  const [scenarios, setScenarios] = useState<ArenaScenario[]>(() => Storage.get<ArenaScenario[]>('scenarios', SCENARIOS));
  const [allUsers, setAllUsers] = useState<UserProgress[]>(() => Storage.get<UserProgress[]>('allUsers', []));
  const [userProgress, setUserProgress] = useState<UserProgress>(() => Storage.get<UserProgress>('progress', DEFAULT_USER));
  const [notifications, setNotifications] = useState<AppNotification[]>([]);

  const activeLesson = selectedLessonId ? modules.flatMap(m => m.lessons).find(l => l.id === selectedLessonId) : null;
  const activeModule = activeLesson ? modules.find(m => m.lessons.some(l => l.id === activeLesson.id)) : null;

  // --- INITIAL SYSTEM SYNC (CONFIG) ---
  useEffect(() => {
      const fetchConfig = async () => {
          const remoteConfig = await Backend.fetchGlobalConfig(appConfig);
          if (JSON.stringify(remoteConfig) !== JSON.stringify(appConfig)) {
              setAppConfig(remoteConfig);
              Storage.set('appConfig', remoteConfig);
          }
      };
      fetchConfig();
  }, []);

  // --- USER DATA SYNC ---
  useEffect(() => {
      const initSync = async () => {
          // 1. Sync User Profile
          if (userProgress.isAuthenticated) {
              const syncedUser = await Backend.syncUser(userProgress);
              setUserProgress(syncedUser);
          }

          // 2. Sync Content (Modules, Materials, etc.)
          const cloudContent = await Backend.fetchAllContent();
          if (cloudContent) {
              setModules(cloudContent.modules);
              setMaterials(cloudContent.materials);
              setStreams(cloudContent.streams);
              setEvents(cloudContent.events);
              setScenarios(cloudContent.scenarios);
              
              // Update local cache
              Storage.set('courseModules', cloudContent.modules);
              Storage.set('materials', cloudContent.materials);
              Storage.set('streams', cloudContent.streams);
              Storage.set('events', cloudContent.events);
              Storage.set('scenarios', cloudContent.scenarios);
          }

          // 3. Sync Users List (for Leaderboard)
          const leaderboard = await Backend.getLeaderboard();
          setAllUsers(leaderboard);

          // 4. Fetch Notifications
          const notifs = await Backend.fetchNotifications();
          setNotifications(notifs.sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime()));
      };

      initSync();
  }, [userProgress.isAuthenticated]);

  // --- THEME & PERSISTENCE ---
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
    if (userProgress.isAuthenticated) setShowWelcome(false);
  }, [userProgress.isAuthenticated]);

  useEffect(() => {
    Storage.set('progress', userProgress);
    // Debounce save slightly to avoid hammering DB on every keystroke
    const timer = setTimeout(() => {
        if (userProgress.isAuthenticated) Backend.saveUser(userProgress);
    }, 1000);
    return () => clearTimeout(timer);
  }, [userProgress]);

  // --- ACTIONS ---

  const addToast = (type: 'success' | 'error' | 'info', message: string) => {
    const id = Date.now().toString();
    setToasts(prev => [...prev, { id, type, message }]);
    if (telegram.isAvailable) telegram.haptic(type === 'error' ? 'error' : 'success');
  };

  const removeToast = (id: string) => setToasts(prev => prev.filter(t => t.id !== id));

  const handleLogin = async (userData: any) => {
    // Optimistic Update
    const tempUser = { ...userProgress, ...userData, isAuthenticated: true };
    setUserProgress(tempUser);
    setShowWelcome(false);
    
    // Check Referral
    if (userData.isRegistration && window.Telegram?.WebApp?.initDataUnsafe?.start_param) {
        const startParam = window.Telegram.WebApp.initDataUnsafe.start_param;
        if (startParam.startsWith('ref_')) {
            const referrerUsername = startParam.replace('ref_', '');
            const referrer = allUsers.find(u => u.telegramUsername?.toLowerCase() === referrerUsername.toLowerCase());
            
            if (referrer) {
                const result = XPService.addReferral(referrer);
                // Save Referrer Update
                Backend.saveUser(result.user);
                telegram.showAlert(`Вас пригласил ${referrer.name}. Бонус начислен!`, 'Referral');
            }
        }
    }
    addToast('success', 'С возвращением, боец!');
  };

  const handleLogout = () => {
    setUserProgress({ ...DEFAULT_USER });
    setActiveTab(Tab.HOME);
    setShowWelcome(true);
  };

  const handleUpdateUser = (data: Partial<UserProgress>) => setUserProgress(prev => ({ ...prev, ...data }));

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

  // --- CONTENT UPDATES (ADMIN) ---
  const updateModules = (newModules: Module[]) => { setModules(newModules); Backend.saveCollection('modules', newModules); };
  const updateMaterials = (newMats: Material[]) => { setMaterials(newMats); Backend.saveCollection('materials', newMats); };
  const updateStreams = (newStreams: Stream[]) => { setStreams(newStreams); Backend.saveCollection('streams', newStreams); };
  const updateEvents = (newEvents: CalendarEvent[]) => { setEvents(newEvents); Backend.saveCollection('events', newEvents); };
  const updateScenarios = (newScenarios: ArenaScenario[]) => { setScenarios(newScenarios); Backend.saveCollection('scenarios', newScenarios); };
  const updateConfig = (newConfig: AppConfig) => { setAppConfig(newConfig); Backend.saveGlobalConfig(newConfig); };

  if (!userProgress.isAuthenticated) {
    if (showWelcome) return <Welcome onStart={() => setShowWelcome(false)} />;
    return <Auth onLogin={handleLogin} existingUsers={allUsers} />;
  }

  return (
    <div className="flex flex-col h-[100dvh] bg-body text-text-primary transition-colors duration-300 overflow-hidden">
      
      <SystemHealthAgent config={appConfig.systemAgent} />

      <div className="fixed top-[var(--safe-top)] left-4 right-4 z-[200] flex flex-col gap-2 pointer-events-none">
        {toasts.map(t => <Toast key={t.id} toast={t} onRemove={removeToast} />)}
      </div>

      <main className="flex-1 overflow-y-auto no-scrollbar scroll-smooth">
        {activeLesson ? (
           <LessonView 
             lesson={activeLesson}
             isCompleted={userProgress.completedLessonIds.includes(activeLesson.id)}
             onComplete={handleCompleteLesson}
             onBack={() => setSelectedLessonId(null)}
             parentModule={activeModule}
             userProgress={userProgress}
             onUpdateUser={handleUpdateUser}
           />
        ) : (
           <>
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
                 />
              )}
              
              {activeTab === Tab.ARENA && <SalesArena />}
              
              {activeTab === Tab.NOTEBOOK && (
                 <NotebookView 
                    entries={userProgress.notebook} 
                    onUpdate={(e) => handleUpdateUser({ notebook: e })} 
                    onBack={() => setActiveTab(Tab.HOME)} 
                    onXPEarned={handleXPEarned}
                 />
              )}

              {activeTab === Tab.MATERIALS && (
                  <MaterialsView materials={materials} onBack={() => setActiveTab(Tab.HOME)} />
              )}

              {activeTab === Tab.STREAMS && (
                  <StreamsView 
                    streams={streams} 
                    onBack={() => setActiveTab(Tab.HOME)} 
                    userProgress={userProgress}
                    onUpdateUser={handleUpdateUser}
                  />
              )}

              {activeTab === Tab.PROFILE && (
                 <Profile 
                    userProgress={userProgress} 
                    onLogout={handleLogout} 
                    allUsers={allUsers}
                    onUpdateUser={handleUpdateUser}
                    events={events}
                 />
              )}

              {activeTab === Tab.CURATOR_DASHBOARD && userProgress.role !== 'STUDENT' && (
                  <CuratorDashboard 
                      users={allUsers}
                      modules={modules}
                  />
              )}

              {activeTab === Tab.ADMIN_DASHBOARD && userProgress.role === 'ADMIN' && (
                  <AdminDashboard 
                    config={appConfig}
                    onUpdateConfig={updateConfig}
                    modules={modules}
                    onUpdateModules={updateModules}
                    materials={materials}
                    onUpdateMaterials={updateMaterials}
                    streams={streams}
                    onUpdateStreams={updateStreams}
                    events={events}
                    onUpdateEvents={updateEvents}
                    scenarios={scenarios}
                    onUpdateScenarios={updateScenarios}
                    users={allUsers}
                    onUpdateUsers={(u) => { setAllUsers(u); Storage.set('allUsers', u); }}
                    currentUser={userProgress}
                    onUpdateCurrentUser={handleUpdateUser}
                    activeSubTab={adminSubTab}
                    addToast={addToast}
                  />
              )}
           </>
        )}
      </main>

      <SmartNav 
        activeTab={activeTab} 
        setActiveTab={setActiveTab} 
        role={userProgress.role} 
        adminSubTab={adminSubTab}
        setAdminSubTab={setAdminSubTab}
        isLessonActive={!!selectedLessonId}
        onExitLesson={() => setSelectedLessonId(null)}
      />
    </div>
  );
};

export default App;
