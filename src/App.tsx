import React, { useState, useEffect, useRef, useCallback, useMemo, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';
import { Tab, UserProgress, Lesson, AppConfig, Module, Material, Stream, CalendarEvent, ArenaScenario, AppNotification, Habit, Goal, SmartNavAction } from './types';
import { HomeDashboard } from './components/HomeDashboard';
import { SmartNav } from './components/SmartNav';
import { Storage } from './services/storage';
import { telegram } from './services/telegramService';
import { Toast, ToastMessage } from './components/Toast';
import { SCENARIOS } from './components/SalesArena';
import { NotebookView } from './components/NotebookView';
import { MaterialsView } from './components/MaterialsView';
import { ModuleList } from './components/ModuleList';
import { Backend } from './services/backendService';
import { XPService } from './services/xpService';

const Profile = React.lazy(() => import('./components/Profile').then(m => ({ default: m.Profile })));
const LessonView = React.lazy(() => import('./components/LessonView').then(m => ({ default: m.LessonView })));
const AdminDashboard = React.lazy(() => import('./components/AdminDashboard').then(m => ({ default: m.AdminDashboard })));
const SalesArena = React.lazy(() => import('./components/SalesArena').then(m => ({ default: m.SalesArena })));
const HabitTracker = React.lazy(() => import('./components/HabitTracker').then(m => ({ default: m.HabitTracker })));
const VideoHub = React.lazy(() => import('./components/VideoHub').then(m => ({ default: m.VideoHub })));

const LoadingFallback = () => (
  <div className="flex items-center justify-center min-h-[60vh]">
    <div className="w-8 h-8 border-2 border-[#6C5DD3] border-t-transparent rounded-full animate-spin"></div>
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
    airtablePat: import.meta.env.VITE_AIRTABLE_PAT || '',
    airtableBaseId: import.meta.env.VITE_AIRTABLE_BASE_ID || '',
    airtableTableName: 'Users'
  },
  features: { enableRealTimeSync: true, autoApproveHomework: false, maintenanceMode: false, allowStudentChat: true, publicLeaderboard: true },
  aiConfig: { activeProvider: 'GOOGLE_GEMINI', apiKeys: {}, modelOverrides: {} },
  systemAgent: { enabled: false, autoFix: false, monitoringInterval: 20000, sensitivity: 'LOW', autonomyLevel: 'PASSIVE' }
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
  notifications: { pushEnabled: false, telegramSync: false, deadlineReminders: true, chatNotifications: true },
  notebook: [],
  habits: [],
  goals: [],
  stats: XPService.getInitStats()
};

// Route <-> Tab mapping
const TAB_ROUTES: Record<Tab, string> = {
  [Tab.HOME]: '/',
  [Tab.MODULES]: '/modules',
  [Tab.MATERIALS]: '/materials',
  [Tab.RATING]: '/rating',
  [Tab.ARENA]: '/arena',
  [Tab.STREAMS]: '/streams',
  [Tab.NOTEBOOK]: '/notebook',
  [Tab.HABITS]: '/habits',
  [Tab.PROFILE]: '/profile',
  [Tab.ADMIN_DASHBOARD]: '/admin',
};

const ROUTE_TABS: Record<string, Tab> = Object.fromEntries(
  Object.entries(TAB_ROUTES).map(([tab, route]) => [route, tab as Tab])
);

const AppShell: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const activeTab = ROUTE_TABS[location.pathname] || Tab.HOME;

  const [adminSubTab, setAdminSubTab] = useState<'OVERVIEW' | 'COURSE' | 'MATERIALS' | 'STREAMS' | 'USERS' | 'SETTINGS' | 'ARENA' | 'CALENDAR'>('OVERVIEW');
  const [selectedLessonId, setSelectedLessonId] = useState<string | null>(null);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const [navAction, setNavAction] = useState<SmartNavAction | null>(null);

  const [appConfig, setAppConfig] = useState<AppConfig>(() => Storage.get<AppConfig>('appConfig', DEFAULT_CONFIG));
  const [modules, setModules] = useState<Module[]>(() => Storage.get<Module[]>('courseModules', []));
  const [materials, setMaterials] = useState<Material[]>(() => Storage.get<Material[]>('materials', []));
  const [streams, setStreams] = useState<Stream[]>(() => Storage.get<Stream[]>('streams', []));
  const [events, setEvents] = useState<CalendarEvent[]>(() => Storage.get<CalendarEvent[]>('events', []));
  const [scenarios, setScenarios] = useState<ArenaScenario[]>(() => Storage.get<ArenaScenario[]>('scenarios', SCENARIOS));
  const [allUsers, setAllUsers] = useState<UserProgress[]>(() => Storage.get<UserProgress[]>('allUsers', []));
  const [userProgress, setUserProgress] = useState<UserProgress>(() => Storage.get<UserProgress>('progress', DEFAULT_USER));
  const [notifications, setNotifications] = useState<AppNotification[]>(() => Storage.get<AppNotification[]>('local_notifications', []));

  const userProgressRef = useRef(userProgress);
  userProgressRef.current = userProgress;
  const syncingRef = useRef(false);

  const activeLesson = useMemo(() =>
    selectedLessonId ? modules.flatMap(m => m.lessons).find(l => l.id === selectedLessonId) : null,
    [selectedLessonId, modules]
  );
  const activeModule = useMemo(() =>
    activeLesson ? modules.find(m => m.lessons.some(l => l.id === activeLesson.id)) : null,
    [activeLesson, modules]
  );

  // Router-aware tab setter
  const setActiveTab = useCallback((tab: Tab) => {
    const route = TAB_ROUTES[tab] || '/';
    navigate(route);
  }, [navigate]);

  useEffect(() => {
    const envPat = import.meta.env.VITE_AIRTABLE_PAT;
    const envBaseId = import.meta.env.VITE_AIRTABLE_BASE_ID;
    if (envPat || envBaseId) {
      setAppConfig(prev => ({
        ...prev,
        integrations: { ...prev.integrations, airtablePat: envPat || prev.integrations.airtablePat, airtableBaseId: envBaseId || prev.integrations.airtableBaseId }
      }));
    }
  }, []);

  useEffect(() => { setNavAction(null); }, [activeTab, selectedLessonId]);

  const syncData = useCallback(async () => {
    if (syncingRef.current) return;
    syncingRef.current = true;
    try {
      const content = await Backend.fetchAllContent();
      if (content) {
        if (content.modules.length > 0) setModules(content.modules);
        if (content.materials.length > 0) setMaterials(content.materials);
        if (content.streams.length > 0) setStreams(content.streams);
        if (content.events.length > 0) setEvents(content.events);
        if (content.scenarios.length > 0) setScenarios(content.scenarios);
      }
      const rawNotifs = await Backend.fetchNotifications();
      if (rawNotifs.length > 0) {
        const user = userProgressRef.current;
        const myNotifs = rawNotifs.filter(n => {
          if (n.targetUserId && n.targetUserId !== user.telegramId) return false;
          if (n.targetRole && n.targetRole !== 'ALL' && n.targetRole !== user.role) return false;
          return true;
        });
        setNotifications(myNotifs);
      }
      const remoteUsers = await Backend.getLeaderboard();
      if (remoteUsers.length > 0) setAllUsers(remoteUsers);
      const currentUser = userProgressRef.current;
      if (currentUser.isAuthenticated) {
        const freshUser = await Backend.syncUser(currentUser);
        if (freshUser.xp !== currentUser.xp || freshUser.level !== currentUser.level || freshUser.role !== currentUser.role) {
          setUserProgress(prev => ({ ...prev, xp: freshUser.xp, level: freshUser.level, role: freshUser.role }));
        }
      }
    } catch (error) {
      console.error('Sync failed:', error);
    } finally {
      syncingRef.current = false;
    }
  }, []);

  useEffect(() => {
    syncData();
    const interval = setInterval(syncData, 120000);
    return () => clearInterval(interval);
  }, [syncData]);

  useEffect(() => {
    const root = document.documentElement;
    const themeMeta = document.querySelector('meta[name="theme-color"]');
    if (userProgress.theme === 'DARK') {
      root.classList.add('dark');
      telegram.setBackgroundColor('#000000');
      telegram.setHeaderColor('#000000');
      themeMeta?.setAttribute('content', '#000000');
    } else {
      root.classList.remove('dark');
      telegram.setBackgroundColor('#F2F2F7');
      telegram.setHeaderColor('#F2F2F7');
      themeMeta?.setAttribute('content', '#F2F2F7');
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
    if (link.startsWith('http')) { window.open(link, '_blank'); }
    else if (Object.values(Tab).includes(link as Tab)) { setActiveTab(link as Tab); }
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

  const handleLogout = () => { setUserProgress({ ...DEFAULT_USER }); navigate('/'); };
  const handleUpdateUser = (data: Partial<UserProgress>) => setUserProgress(prev => ({ ...prev, ...data }));
  const handleUpdateModules = (m: Module[]) => { setModules(m); Backend.saveCollection('modules', m); };
  const handleUpdateMaterials = (m: Material[]) => { setMaterials(m); Backend.saveCollection('materials', m); };
  const handleUpdateStreams = (s: Stream[]) => { setStreams(s); Backend.saveCollection('streams', s); };
  const handleUpdateEvents = (e: CalendarEvent[]) => { setEvents(e); Backend.saveCollection('events', e); };
  const handleUpdateScenarios = (s: ArenaScenario[]) => { setScenarios(s); Backend.saveCollection('scenarios', s); };
  const handleUpdateConfig = (c: AppConfig) => { setAppConfig(c); Backend.saveGlobalConfig(c); };
  const handleUpdateAllUsers = (u: UserProgress[]) => { setAllUsers(u); Storage.set('allUsers', u); };
  const handleSendBroadcast = (n: AppNotification) => {
    Backend.sendBroadcast(n);
    setNotifications(prev => [n, ...prev]);
    addToast('success', 'Оповещение отправлено');
  };
  const handleClearNotifications = () => {
    Storage.set('local_notifications', []);
    setNotifications([]);
    Backend.saveCollection('notifications', []);
    addToast('info', 'История очищена');
  };
  const handleUpdateLesson = (updatedLesson: Lesson) => {
    const updated = modules.map(m => m.lessons.some(l => l.id === updatedLesson.id)
      ? { ...m, lessons: m.lessons.map(l => l.id === updatedLesson.id ? updatedLesson : l) } : m);
    setModules(updated);
    Backend.saveCollection('modules', updated);
    addToast('success', 'Урок обновлен');
  };
  const handleCompleteLesson = (lessonId: string, xpBonus: number) => {
    const newXp = userProgress.xp + xpBonus;
    setUserProgress(prev => ({ ...prev, xp: newXp, level: Math.floor(newXp / 1000) + 1, completedLessonIds: [...prev.completedLessonIds, lessonId] }));
    addToast('success', `Урок пройден! +${xpBonus} XP`);
    setSelectedLessonId(null);
  };
  const handleXPEarned = (amount: number) => {
    setUserProgress(prev => { const newXp = prev.xp + amount; return { ...prev, xp: newXp, level: Math.floor(newXp / 1000) + 1 }; });
    addToast('success', `+${amount} XP`);
  };

  return (
    <div className="flex flex-col h-[100dvh] bg-body text-text-primary transition-colors duration-300 overflow-hidden relative">
      <div className="fixed top-[var(--safe-top)] left-4 right-4 z-[200] flex flex-col gap-2 pointer-events-none">
        {toasts.map(t => <Toast key={t.id} toast={t} onRemove={removeToast} onClick={() => handleNavigate(t.link)} />)}
      </div>
      <main className="flex-1 overflow-y-auto no-scrollbar scroll-smooth relative z-10">
        <Suspense fallback={<LoadingFallback />}>
          {activeLesson ? (
            <div className="animate-slide-up min-h-full bg-body relative z-10">
              <LessonView lesson={activeLesson} isCompleted={userProgress.completedLessonIds.includes(activeLesson.id)}
                onComplete={handleCompleteLesson} onBack={() => setSelectedLessonId(null)}
                onNavigate={(id) => setSelectedLessonId(id)} parentModule={activeModule}
                userProgress={userProgress} onUpdateUser={handleUpdateUser} onUpdateLesson={handleUpdateLesson} />
            </div>
          ) : (
            <div key={activeTab} className="animate-fade-in min-h-full relative z-10">
              <Routes>
                <Route path="/" element={
                  <HomeDashboard onNavigate={setActiveTab} userProgress={userProgress} onProfileClick={() => setActiveTab(Tab.PROFILE)}
                    modules={modules} materials={materials} streams={streams} scenarios={scenarios}
                    onSelectLesson={(l) => setSelectedLessonId(l.id)} onUpdateUser={handleUpdateUser}
                    allUsers={allUsers} notifications={notifications} appConfig={appConfig} />
                } />
                <Route path="/arena" element={<SalesArena userProgress={userProgress} />} />
                <Route path="/habits" element={
                  <HabitTracker habits={userProgress.habits || []} goals={userProgress.goals || []}
                    onUpdateHabits={(h) => handleUpdateUser({ habits: h })} onUpdateGoals={(g) => handleUpdateUser({ goals: g })}
                    onXPEarned={handleXPEarned} onBack={() => setActiveTab(Tab.HOME)} setNavAction={setNavAction}
                    isAuthenticated={userProgress.isAuthenticated} />
                } />
                <Route path="/notebook" element={
                  <NotebookView entries={userProgress.notebook} onUpdate={(e) => handleUpdateUser({ notebook: e })}
                    onBack={() => setActiveTab(Tab.HOME)} onXPEarned={handleXPEarned} setNavAction={setNavAction} />
                } />
                <Route path="/materials" element={<MaterialsView materials={materials} onBack={() => setActiveTab(Tab.HOME)} userProgress={userProgress} />} />
                <Route path="/streams" element={
                  <VideoHub streams={streams} onBack={() => setActiveTab(Tab.HOME)} userProgress={userProgress}
                    onUpdateUser={handleUpdateUser} setNavAction={setNavAction} />
                } />
                <Route path="/modules" element={
                  <div className="px-4 pt-6 pb-28 max-w-2xl mx-auto space-y-6 animate-fade-in">
                    <div className="flex items-center gap-3">
                      <button onClick={() => setActiveTab(Tab.HOME)} className="w-10 h-10 rounded-xl bg-surface border border-border-color flex items-center justify-center active:scale-95 transition-transform">
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
                      </button>
                      <h1 className="text-2xl font-bold text-text-primary">Все модули</h1>
                    </div>
                    <ModuleList modules={modules} userProgress={userProgress} onSelectLesson={(l) => setSelectedLessonId(l.id)} onBack={() => setActiveTab(Tab.HOME)} />
                  </div>
                } />
                <Route path="/profile" element={
                  <Profile userProgress={userProgress} onLogout={handleLogout} allUsers={allUsers}
                    onUpdateUser={handleUpdateUser} events={events} onLogin={handleLogin}
                    onNavigate={setActiveTab} setNavAction={setNavAction} />
                } />
                <Route path="/admin" element={
                  userProgress.role === 'ADMIN' ? (
                    <AdminDashboard config={appConfig} onUpdateConfig={handleUpdateConfig}
                      modules={modules} onUpdateModules={handleUpdateModules}
                      materials={materials} onUpdateMaterials={handleUpdateMaterials}
                      streams={streams} onUpdateStreams={handleUpdateStreams}
                      events={events} onUpdateEvents={handleUpdateEvents}
                      scenarios={scenarios} onUpdateScenarios={handleUpdateScenarios}
                      users={allUsers} onUpdateUsers={handleUpdateAllUsers}
                      currentUser={userProgress} activeSubTab={adminSubTab}
                      onSendBroadcast={handleSendBroadcast} notifications={notifications}
                      onClearNotifications={handleClearNotifications} addToast={addToast} />
                  ) : <Navigate to="/" replace />
                } />
                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            </div>
          )}
        </Suspense>
      </main>
      <SmartNav activeTab={activeTab} setActiveTab={setActiveTab} role={userProgress.role}
        adminSubTab={adminSubTab} setAdminSubTab={(t) => setAdminSubTab(t as any)}
        isLessonActive={!!selectedLessonId} onExitLesson={() => setSelectedLessonId(null)}
        notifications={notifications} onClearNotifications={handleClearNotifications} action={navAction} />
    </div>
  );
};

const App: React.FC = () => (
  <BrowserRouter>
    <AppShell />
  </BrowserRouter>
);

export default App;
