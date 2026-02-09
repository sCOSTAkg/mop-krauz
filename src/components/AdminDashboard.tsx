
import React, { useState, useMemo, useCallback } from 'react';
import { AppConfig, Module, UserProgress, Material, Stream, CalendarEvent, ArenaScenario, AppNotification, Lesson, UserRole, HomeworkType, AIProviderId, EventType, ModuleCategory } from '../types';
import { Button } from './Button';
import { telegram } from '../services/telegramService';
import { Logger } from '../services/logger';
import { Avatar } from '../utils/avatar';
import { airtableService } from '../services/airtableService';
import { Backend } from '../services/backendService';

// ─── TYPES ──────────────────────────────────────────────────────
interface AdminDashboardProps {
  config: AppConfig;
  onUpdateConfig: (c: AppConfig) => void;
  modules: Module[];
  onUpdateModules: (m: Module[]) => void;
  materials: Material[];
  onUpdateMaterials: (m: Material[]) => void;
  streams: Stream[];
  onUpdateStreams: (s: Stream[]) => void;
  events: CalendarEvent[];
  onUpdateEvents: (e: CalendarEvent[]) => void;
  scenarios: ArenaScenario[];
  onUpdateScenarios: (s: ArenaScenario[]) => void;
  users: UserProgress[];
  onUpdateUsers: (u: UserProgress[]) => void;
  currentUser: UserProgress;
  activeSubTab: 'OVERVIEW' | 'COURSE' | 'MATERIALS' | 'STREAMS' | 'USERS' | 'SETTINGS' | 'ARENA' | 'CALENDAR';
  onSendBroadcast: (n: AppNotification) => void;
  notifications: AppNotification[];
  onClearNotifications: () => void;
  addToast: (type: 'success' | 'error' | 'info', message: string, link?: string) => void;
}

// ─── HELPERS ────────────────────────────────────────────────────
const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
const isoStr = (d?: Date | string) => { if (!d) return ''; return d instanceof Date ? d.toISOString() : d; };
const getYTThumb = (url?: string) => {
  if (!url) return null;
  const m = url.match(/(?:youtu\.be\/|v=|embed\/)([^#&?]{11})/);
  return m ? `https://img.youtube.com/vi/${m[1]}/mqdefault.jpg` : null;
};
const moveItem = <T,>(arr: T[], i: number, dir: -1 | 1): T[] => {
  const j = i + dir;
  if (j < 0 || j >= arr.length) return arr;
  const a = [...arr]; [a[i], a[j]] = [a[j], a[i]]; return a;
};

// ─── STYLE CONSTANTS ────────────────────────────────────────────
const cl = {
  card: 'bg-surface border border-border-color rounded-2xl',
  cardH: 'bg-surface border border-border-color rounded-2xl hover:border-[#6C5DD3] transition-colors',
  input: 'w-full bg-body border border-border-color p-3 rounded-xl text-sm outline-none focus:border-[#6C5DD3] transition-colors',
  inputMono: 'w-full bg-body border border-border-color p-3 rounded-xl text-xs font-mono outline-none focus:border-[#6C5DD3] transition-colors',
  textarea: 'w-full bg-body border border-border-color p-3 rounded-xl text-sm outline-none focus:border-[#6C5DD3] h-20 resize-none transition-colors',
  label: 'text-[9px] font-bold text-text-secondary uppercase ml-1 block mb-1',
  sectionTitle: 'font-bold text-xs uppercase tracking-wide text-[#6C5DD3]',
  accent: '#6C5DD3',
  green: '#34C759',
  btnDanger: 'text-red-500 hover:bg-red-500/10',
  btnEdit: 'text-[#6C5DD3] hover:bg-[#6C5DD3]/10',
};

// ─── REUSABLE PRIMITIVES ────────────────────────────────────────

const Modal: React.FC<{ title: string; onClose: () => void; wide?: boolean; children: React.ReactNode }> = ({ title, onClose, wide, children }) => (
  <div className="fixed inset-0 z-[999] flex items-end sm:items-center justify-center animate-fade-in" onClick={onClose}>
    <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
    <div
      onClick={e => e.stopPropagation()}
      className={`relative bg-surface border border-border-color rounded-t-3xl sm:rounded-2xl w-full ${wide ? 'sm:max-w-2xl' : 'sm:max-w-md'} max-h-[85vh] overflow-y-auto p-6 space-y-4 animate-slide-up shadow-2xl`}
    >
      <div className="flex items-center justify-between mb-2">
        <h3 className="font-bold text-sm text-text-primary">{title}</h3>
        <button onClick={onClose} className="w-8 h-8 rounded-lg bg-body flex items-center justify-center text-text-secondary hover:text-red-500 transition-colors">✕</button>
      </div>
      {children}
    </div>
  </div>
);

const StatCard = ({ icon, label, value }: { icon: string; label: string; value: number | string }) => (
  <div className={`${cl.card} p-5 flex items-center gap-4 shadow-sm hover:border-[${cl.accent}] transition-colors group`}>
    <div className="w-12 h-12 rounded-2xl bg-body flex items-center justify-center text-2xl shadow-sm group-hover:scale-110 transition-transform">{icon}</div>
    <div>
      <h3 className="text-2xl font-bold text-text-primary leading-none mb-1">{value}</h3>
      <p className="text-[10px] font-bold text-text-secondary uppercase tracking-wide">{label}</p>
    </div>
  </div>
);

const SearchBar = ({ value, onChange, placeholder }: { value: string; onChange: (v: string) => void; placeholder: string }) => (
  <div className="relative">
    <input value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} className={`${cl.input} pl-10 !p-4 !rounded-2xl`} />
    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-text-secondary text-sm">🔍</span>
    {value && <button onClick={() => onChange('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-text-secondary hover:text-red-400 text-xs">✕</button>}
  </div>
);

const Toggle = ({ label, value, onChange }: { label: string; value: boolean; onChange: () => void }) => (
  <div className="flex items-center justify-between py-1">
    <span className="text-sm font-bold text-text-primary capitalize">{label}</span>
    <button onClick={onChange} className={`w-12 h-6 rounded-full p-1 transition-colors ${value ? `bg-[${cl.accent}]` : 'bg-body border border-border-color'}`}>
      <div className={`w-4 h-4 bg-surface rounded-full shadow-sm transform transition-transform ${value ? 'translate-x-6' : ''}`} />
    </button>
  </div>
);

const EmptyState = ({ icon, text }: { icon: string; text: string }) => (
  <div className="flex flex-col items-center justify-center py-12 opacity-50">
    <span className="text-4xl mb-3">{icon}</span>
    <p className="text-sm text-text-secondary">{text}</p>
  </div>
);

const MoveButtons = ({ onUp, onDown, disableUp, disableDown }: { onUp: () => void; onDown: () => void; disableUp?: boolean; disableDown?: boolean }) => (
  <div className="flex flex-col gap-0.5">
    <button disabled={disableUp} onClick={onUp} className="text-[10px] text-text-secondary hover:text-text-primary disabled:opacity-20 transition-opacity">▲</button>
    <button disabled={disableDown} onClick={onDown} className="text-[10px] text-text-secondary hover:text-text-primary disabled:opacity-20 transition-opacity">▼</button>
  </div>
);

const MarkdownToolbar = ({ onInsert }: { onInsert: (tag: string, placeholder?: string) => void }) => (
  <div className="flex gap-2 mb-2 overflow-x-auto no-scrollbar pb-1">
    <button onClick={() => onInsert('**', 'bold')} className="px-2 py-1 bg-body rounded text-[10px] hover:bg-surface border border-border-color font-bold">B</button>
    <button onClick={() => onInsert('*', 'italic')} className="px-2 py-1 bg-body rounded text-[10px] hover:bg-surface border border-border-color italic">I</button>
    <button onClick={() => onInsert('\n# ', 'Header')} className="px-2 py-1 bg-body rounded text-[10px] hover:bg-surface border border-border-color">H1</button>
    <button onClick={() => onInsert('\n## ', 'Header')} className="px-2 py-1 bg-body rounded text-[10px] hover:bg-surface border border-border-color">H2</button>
    <button onClick={() => onInsert('[', 'Link](url)')} className="px-2 py-1 bg-body rounded text-[10px] hover:bg-surface border border-border-color">🔗</button>
    <button onClick={() => onInsert('\n- ', 'List Item')} className="px-2 py-1 bg-body rounded text-[10px] hover:bg-surface border border-border-color">List</button>
    <button onClick={() => onInsert('`', 'code')} className="px-2 py-1 bg-body rounded text-[10px] hover:bg-surface border border-border-color font-mono">Code</button>
  </div>
);

// ─── CONFIRM HOOK ───────────────────────────────────────────────
const useConfirm = () => {
  const confirm = useCallback((msg: string, fn: () => void) => {
    if (window.confirm(msg)) fn();
  }, []);
  return confirm;
};

// ─── MAIN COMPONENT ─────────────────────────────────────────────
export const AdminDashboard: React.FC<AdminDashboardProps> = ({
  config, onUpdateConfig,
  modules, onUpdateModules,
  materials, onUpdateMaterials,
  scenarios, onUpdateScenarios,
  users, onUpdateUsers,
  streams, onUpdateStreams,
  events, onUpdateEvents,
  currentUser, activeSubTab,
  onSendBroadcast, notifications, onClearNotifications,
  addToast
}) => {
  // ─── LOCAL STATE ────────────────────────────────────────────
  const [notifTitle, setNotifTitle] = useState('');
  const [notifMsg, setNotifMsg] = useState('');
  const [notifType, setNotifType] = useState<AppNotification['type']>('INFO');
  const [userSearchTerm, setUserSearchTerm] = useState('');
  const [courseSearchTerm, setCourseSearchTerm] = useState('');

  // Config state
  const [systemInstruction, setSystemInstruction] = useState(config.systemInstruction);
  const [selectedProvider, setSelectedProvider] = useState<AIProviderId>(config.aiConfig?.activeProvider || 'GOOGLE_GEMINI');
  const [apiKeys, setApiKeys] = useState(config.aiConfig?.apiKeys || {});
  const [welcomeConfig, setWelcomeConfig] = useState({ videoUrl: config.welcomeVideoUrl || '', message: config.welcomeMessage || '' });
  const [airtableConfig, setAirtableConfig] = useState({
    pat: config.integrations.airtablePat || '',
    baseId: config.integrations.airtableBaseId || '',
    tableName: config.integrations.airtableTableName || 'Users',
    modulesTable: 'Modules',
    lessonsTable: 'Lessons',
    materialsTable: 'Materials',
    streamsTable: 'Streams',
    scenariosTable: 'Scenarios',
    eventsTable: 'Events',
    notificationsTable: 'Notifications',
    configTable: 'Config',
  });

  // Sync state
  const [syncStatus, setSyncStatus] = useState<'idle' | 'checking' | 'syncing' | 'success' | 'error'>('idle');
  const [syncHealth, setSyncHealth] = useState<{ airtable: boolean; configured: boolean; timestamp: string } | null>(null);
  const [syncLog, setSyncLog] = useState<string[]>([]);
  const [lastSyncTime, setLastSyncTime] = useState<string | null>(null);

  // Course editing
  const [expandedModuleId, setExpandedModuleId] = useState<string | null>(null);

  // Modal states — null = closed
  const [editingLesson, setEditingLesson] = useState<{ moduleId: string; lesson: Lesson } | null>(null);
  const [editingModule, setEditingModule] = useState<Partial<Module> & { _isNew?: boolean } | null>(null);
  const [editingMaterial, setEditingMaterial] = useState<Partial<Material> & { _isNew?: boolean } | null>(null);
  const [editingScenario, setEditingScenario] = useState<Partial<ArenaScenario> & { _isNew?: boolean } | null>(null);
  const [editingStream, setEditingStream] = useState<Partial<Stream> & { _isNew?: boolean } | null>(null);
  const [editingEvent, setEditingEvent] = useState<Partial<CalendarEvent> & { _isNew?: boolean } | null>(null);
  const [editingUser, setEditingUser] = useState<UserProgress | null>(null);

  const cfm = useConfirm();

  // ─── FILTERED LISTS ─────────────────────────────────────────
  const filteredUsers = useMemo(() => users.filter(u =>
    (u.name || '').toLowerCase().includes(userSearchTerm.toLowerCase()) ||
    (u.role || '').toLowerCase().includes(userSearchTerm.toLowerCase()) ||
    u.telegramUsername?.toLowerCase().includes(userSearchTerm.toLowerCase())
  ), [users, userSearchTerm]);

  const filteredModules = useMemo(() => modules.filter(m =>
    !courseSearchTerm || m.title.toLowerCase().includes(courseSearchTerm.toLowerCase()) || m.category.toLowerCase().includes(courseSearchTerm.toLowerCase())
  ), [modules, courseSearchTerm]);

  // ─── HANDLERS ───────────────────────────────────────────────
  const sendNotif = () => {
    if (!notifTitle || !notifMsg) return;
    telegram.haptic('success');
    onSendBroadcast({ id: uid(), title: notifTitle, message: notifMsg, type: notifType, date: new Date().toISOString(), targetRole: 'ALL' });
    setNotifTitle(''); setNotifMsg('');
    addToast('success', 'Отправлено');
  };

  const handleClearLogs = () => { Logger.clear(); telegram.haptic('success'); addToast('info', 'Логи очищены'); };

  // --- Config saves ---
  const handleSaveAIConfig = () => {
    onUpdateConfig({ ...config, systemInstruction, aiConfig: { ...config.aiConfig, activeProvider: selectedProvider, apiKeys: { ...config.aiConfig.apiKeys, ...apiKeys } } });
    telegram.haptic('success'); addToast('success', 'AI конфигурация сохранена');
  };
  const handleSaveWelcomeConfig = () => {
    onUpdateConfig({ ...config, welcomeVideoUrl: welcomeConfig.videoUrl, welcomeMessage: welcomeConfig.message });
    telegram.haptic('success'); addToast('success', 'Экран приветствия обновлен');
  };
  const handleSaveAirtableConfig = () => {
    onUpdateConfig({ ...config, integrations: { ...config.integrations, airtablePat: airtableConfig.pat, airtableBaseId: airtableConfig.baseId, airtableTableName: airtableConfig.tableName } });
    // Update the live service instance
    airtableService.updateConfig(airtableConfig.pat, airtableConfig.baseId);
    telegram.haptic('success'); addToast('success', 'Airtable обновлен');
  };

  // --- Sync handlers ---
  const addSyncLog = (msg: string) => setSyncLog(prev => [...prev.slice(-19), `[${new Date().toLocaleTimeString()}] ${msg}`]);

  const handleHealthCheck = async () => {
    setSyncStatus('checking');
    addSyncLog('Проверка подключения...');
    try {
      const health = await Backend.healthCheck();
      setSyncHealth(health);
      setSyncStatus(health.airtable ? 'success' : 'error');
      addSyncLog(health.airtable ? '✅ Airtable доступен' : '❌ Airtable недоступен');
      if (!health.configured) addSyncLog('⚠️ PAT или Base ID не заданы');
    } catch (e) {
      setSyncStatus('error');
      addSyncLog(`❌ Ошибка: ${e}`);
    }
  };

  const handleFullSync = async () => {
    setSyncStatus('syncing');
    addSyncLog('🔄 Запуск полной синхронизации...');
    try {
      // Push all local data to Airtable
      addSyncLog(`📦 Модули: ${modules.length}...`);
      await Backend.saveCollection('modules', modules);
      addSyncLog(`📎 Материалы: ${materials.length}...`);
      await Backend.saveCollection('materials', materials);
      addSyncLog(`📡 Эфиры: ${streams.length}...`);
      await Backend.saveCollection('streams', streams);
      addSyncLog(`📅 События: ${events.length}...`);
      await Backend.saveCollection('events', events);
      addSyncLog(`⚔️ Сценарии: ${scenarios.length}...`);
      await Backend.saveCollection('scenarios', scenarios);
      addSyncLog(`⚙️ Конфигурация...`);
      await Backend.saveGlobalConfig(config);
      
      setLastSyncTime(new Date().toLocaleString());
      setSyncStatus('success');
      addSyncLog('✅ Полная синхронизация завершена');
      telegram.haptic('success');
      addToast('success', 'Все данные синхронизированы с Airtable');
    } catch (e) {
      setSyncStatus('error');
      addSyncLog(`❌ Ошибка синхронизации: ${e}`);
      addToast('error', 'Ошибка синхронизации');
    }
  };

  const handlePullFromAirtable = async () => {
    setSyncStatus('syncing');
    addSyncLog('⬇️ Загрузка данных из Airtable...');
    try {
      const content = await Backend.fetchAllContent();
      if (content) {
        if (content.modules.length > 0) { onUpdateModules(content.modules); addSyncLog(`📦 Модули: ${content.modules.length}`); }
        if (content.materials.length > 0) { onUpdateMaterials(content.materials); addSyncLog(`📎 Материалы: ${content.materials.length}`); }
        if (content.streams.length > 0) { onUpdateStreams(content.streams); addSyncLog(`📡 Эфиры: ${content.streams.length}`); }
        if (content.events.length > 0) { onUpdateEvents(content.events); addSyncLog(`📅 События: ${content.events.length}`); }
        if (content.scenarios.length > 0) { onUpdateScenarios(content.scenarios); addSyncLog(`⚔️ Сценарии: ${content.scenarios.length}`); }
      }
      setLastSyncTime(new Date().toLocaleString());
      setSyncStatus('success');
      addSyncLog('✅ Данные загружены из Airtable');
      telegram.haptic('success');
      addToast('success', 'Данные обновлены из Airtable');
    } catch (e) {
      setSyncStatus('error');
      addSyncLog(`❌ Ошибка загрузки: ${e}`);
      addToast('error', 'Ошибка загрузки');
    }
  };

  const handleClearSyncCache = () => {
    airtableService.clearCache();
    addSyncLog('🧹 Кэш Airtable очищен');
    addToast('info', 'Кэш очищен');
  };
  const toggleFeature = (key: keyof AppConfig['features']) => {
    onUpdateConfig({ ...config, features: { ...config.features, [key]: !config.features[key] } });
    telegram.haptic('medium');
  };

  // --- Module CRUD ---
  const saveModule = () => {
    if (!editingModule?.title) return;
    const mod: Module = {
      id: editingModule.id || uid(),
      title: editingModule.title,
      description: editingModule.description || '',
      minLevel: editingModule.minLevel || 0,
      category: editingModule.category || 'GENERAL',
      lessons: editingModule.lessons || [],
      imageUrl: editingModule.imageUrl || '',
      videoUrl: editingModule.videoUrl,
      pdfUrl: editingModule.pdfUrl,
    };
    if (editingModule._isNew) {
      onUpdateModules([...modules, mod]);
    } else {
      onUpdateModules(modules.map(m => m.id === mod.id ? mod : m));
    }
    setEditingModule(null);
    telegram.haptic('success'); addToast('success', 'Модуль сохранен');
  };
  const deleteModule = (id: string) => cfm('Удалить модуль и все его уроки?', () => { onUpdateModules(modules.filter(m => m.id !== id)); addToast('info', 'Модуль удален'); });

  // --- Lesson CRUD ---
  const saveLesson = () => {
    if (!editingLesson) return;
    const { moduleId, lesson } = editingLesson;
    const mod = modules.find(m => m.id === moduleId);
    if (!mod) return;
    const exists = mod.lessons.some(l => l.id === lesson.id);
    const updatedLessons = exists ? mod.lessons.map(l => l.id === lesson.id ? lesson : l) : [...mod.lessons, lesson];
    onUpdateModules(modules.map(m => m.id === moduleId ? { ...m, lessons: updatedLessons } : m));
    setEditingLesson(null);
    telegram.haptic('success'); addToast('success', 'Урок сохранен');
  };
  const deleteLesson = (moduleId: string, lessonId: string) => cfm('Удалить урок?', () => {
    onUpdateModules(modules.map(m => m.id === moduleId ? { ...m, lessons: m.lessons.filter(l => l.id !== lessonId) } : m));
    addToast('info', 'Урок удален');
  });
  const addNewLesson = (moduleId: string) => {
    setEditingLesson({ moduleId, lesson: { id: uid(), title: '', description: '', content: '', xpReward: 10, homeworkType: 'TEXT', homeworkTask: '', aiGradingInstruction: '' } });
  };

  // --- Material CRUD ---
  const saveMaterial = () => {
    if (!editingMaterial?.title) return;
    const mat: Material = { id: editingMaterial.id || uid(), title: editingMaterial.title, description: editingMaterial.description || '', type: editingMaterial.type || 'LINK', url: editingMaterial.url || '' };
    if (editingMaterial._isNew) {
      onUpdateMaterials([...materials, mat]);
    } else {
      onUpdateMaterials(materials.map(m => m.id === mat.id ? mat : m));
    }
    setEditingMaterial(null);
    telegram.haptic('success'); addToast('success', 'Материал сохранен');
  };
  const deleteMaterial = (id: string) => cfm('Удалить материал?', () => { onUpdateMaterials(materials.filter(m => m.id !== id)); addToast('info', 'Материал удален'); });

  // --- Arena CRUD ---
  const saveScenario = () => {
    if (!editingScenario?.title || !editingScenario.clientRole) return;
    const sc: ArenaScenario = { id: editingScenario.id || uid(), title: editingScenario.title, difficulty: editingScenario.difficulty || 'Easy', clientRole: editingScenario.clientRole, objective: editingScenario.objective || '', initialMessage: editingScenario.initialMessage || '' };
    if (editingScenario._isNew) {
      onUpdateScenarios([...scenarios, sc]);
    } else {
      onUpdateScenarios(scenarios.map(s => s.id === sc.id ? sc : s));
    }
    setEditingScenario(null);
    telegram.haptic('success'); addToast('success', 'Сценарий сохранен');
  };
  const deleteScenario = (id: string) => cfm('Удалить сценарий?', () => { onUpdateScenarios(scenarios.filter(s => s.id !== id)); addToast('info', 'Сценарий удален'); });

  // --- Stream CRUD ---
  const saveStream = () => {
    if (!editingStream?.title) return;
    const st: Stream = { id: editingStream.id || uid(), title: editingStream.title, date: editingStream.date || new Date().toISOString(), youtubeUrl: editingStream.youtubeUrl || '', status: editingStream.status || 'UPCOMING' };
    if (editingStream._isNew) {
      onUpdateStreams([...streams, st]);
    } else {
      onUpdateStreams(streams.map(s => s.id === st.id ? st : s));
    }
    setEditingStream(null);
    telegram.haptic('success'); addToast('success', 'Эфир сохранен');
  };
  const deleteStream = (id: string) => cfm('Удалить эфир?', () => { onUpdateStreams(streams.filter(s => s.id !== id)); addToast('info', 'Эфир удален'); });

  // --- Event CRUD ---
  const saveEvent = () => {
    if (!editingEvent?.title) return;
    const ev: CalendarEvent = { id: editingEvent.id || uid(), title: editingEvent.title, description: editingEvent.description || '', date: editingEvent.date || new Date().toISOString(), type: editingEvent.type || EventType.OTHER, durationMinutes: editingEvent.durationMinutes || 60 };
    if (editingEvent._isNew) {
      onUpdateEvents([...events, ev]);
    } else {
      onUpdateEvents(events.map(e => e.id === ev.id ? ev : e));
    }
    setEditingEvent(null);
    telegram.haptic('success'); addToast('success', 'Событие сохранено');
  };
  const deleteEvent = (id: string) => cfm('Удалить событие?', () => { onUpdateEvents(events.filter(e => e.id !== id)); addToast('info', 'Событие удалено'); });

  // --- User management ---
  const toggleUserRole = (user: UserProgress) => {
    if (user.telegramId === currentUser.telegramId || user.name === currentUser.name) {
      addToast('error', 'Нельзя изменить роль самому себе'); telegram.haptic('error'); return;
    }
    const newRole: UserRole = user.role === 'ADMIN' ? 'STUDENT' : 'ADMIN';
    cfm(`Назначить ${user.name} роль ${newRole}?`, () => {
      onUpdateUsers(users.map(u => (u.telegramId === user.telegramId && u.name === user.name) ? { ...u, role: newRole } : u));
      telegram.haptic('selection'); addToast('info', `${user.name} → ${newRole}`);
    });
  };

  const handleUpdateModuleDetails = (moduleId: string, updates: Partial<Module>) => {
    onUpdateModules(modules.map(m => m.id === moduleId ? { ...m, ...updates } : m));
  };

  // ─── RENDER ─────────────────────────────────────────────────
  return (
    <div className="min-h-screen pb-40 pt-[calc(var(--safe-top)+20px)] px-6 space-y-8 animate-fade-in bg-body">
      {/* HEADER */}
      <div className="flex justify-between items-center">
        <div>
          <span className="text-[#6C5DD3] text-[10px] font-bold uppercase tracking-wide mb-1 block">Command Center</span>
          <h1 className="text-2xl font-bold text-text-primary leading-none">ПАНЕЛЬ<br/><span className="opacity-30">АДМИНА</span></h1>
        </div>
        <div className="w-14 h-14 bg-[#6C5DD3]/10 text-[#6C5DD3] rounded-2xl flex items-center justify-center text-2xl border border-[#6C5DD3]/20 shadow-sm">🛠️</div>
      </div>

      {/* ═══════ OVERVIEW ═══════ */}
      {activeSubTab === 'OVERVIEW' && (
        <div className="space-y-6 animate-slide-up">
          <div className="grid grid-cols-2 gap-4">
            <StatCard icon="👥" label="Бойцов" value={users.length} />
            <StatCard icon="📦" label="Модулей" value={modules.length} />
            <StatCard icon="📚" label="Уроков" value={modules.reduce((a, m) => a + m.lessons.length, 0)} />
            <StatCard icon="⚔️" label="Сценариев" value={scenarios.length} />
            <StatCard icon="📎" label="Материалов" value={materials.length} />
            <StatCard icon="📡" label="Эфиров" value={streams.length} />
            <StatCard icon="📅" label="Событий" value={events.length} />
            <StatCard icon="🔔" label="Уведомлений" value={notifications.length} />
          </div>

          <div className="flex gap-3">
            <button onClick={handleClearLogs} className="flex-1 py-4 rounded-2xl bg-card border border-border-color text-text-secondary text-xs font-medium hover:bg-surface active:scale-95 transition-all flex items-center justify-center gap-2">
              <span>🗑️</span> Очистить Логи
            </button>
            <button onClick={onClearNotifications} className="flex-1 py-4 rounded-2xl bg-card border border-border-color text-text-secondary text-xs font-medium hover:bg-surface active:scale-95 transition-all flex items-center justify-center gap-2">
              <span>🔕</span> Сбросить Уведомления
            </button>
          </div>

          {/* Broadcast */}
          <div className={`${cl.card} p-6 shadow-sm space-y-4`}>
            <h3 className={`${cl.sectionTitle} flex items-center gap-2`}><span className="animate-pulse">📡</span> Системное Оповещение</h3>
            <input value={notifTitle} onChange={e => setNotifTitle(e.target.value)} className={`${cl.input} !p-4 !rounded-2xl font-bold`} placeholder="Заголовок" />
            <textarea value={notifMsg} onChange={e => setNotifMsg(e.target.value)} className={`${cl.input} !p-4 !rounded-2xl !h-24 resize-none`} placeholder="Текст сообщения..." />
            <div className="flex gap-2">
              {(['INFO', 'SUCCESS', 'WARNING', 'ALERT'] as const).map(t => (
                <button key={t} onClick={() => { setNotifType(t); telegram.haptic('selection'); }} className={`flex-1 py-2 rounded-xl text-[8px] font-bold uppercase border transition-all ${notifType === t ? 'bg-[#6C5DD3] text-white border-[#6C5DD3]' : 'border-border-color text-text-secondary'}`}>{t}</button>
              ))}
            </div>
            <Button onClick={sendNotif} fullWidth className="!rounded-2xl !py-4">ОТПРАВИТЬ ВСЕМ</Button>
          </div>
        </div>
      )}

      {/* ═══════ COURSE ═══════ */}
      {activeSubTab === 'COURSE' && (
        <div className="space-y-4 animate-slide-up">
          <div className="flex gap-2">
            <div className="flex-1"><SearchBar value={courseSearchTerm} onChange={setCourseSearchTerm} placeholder="Поиск модуля..." /></div>
            <button onClick={() => setEditingModule({ _isNew: true, lessons: [], category: 'GENERAL' })} className="px-4 rounded-2xl bg-[#6C5DD3] text-white text-xs font-bold active:scale-95 transition-transform whitespace-nowrap">+ Модуль</button>
          </div>

          {filteredModules.length === 0 && <EmptyState icon="📦" text="Модули не найдены" />}

          {filteredModules.map((mod, i) => {
            const isExpanded = expandedModuleId === mod.id;
            const previewThumb = getYTThumb(mod.videoUrl) || (mod.imageUrl || null);
            const completedCount = mod.lessons.filter(l => currentUser.completedLessonIds?.includes(l.id)).length;
            const progress = mod.lessons.length > 0 ? Math.round((completedCount / mod.lessons.length) * 100) : 0;

            return (
              <div key={mod.id} className={`${cl.card} overflow-hidden transition-all duration-300`}>
                {/* Module header */}
                <div className="p-4 flex items-center gap-3 cursor-pointer active:bg-body/50 transition-colors" onClick={() => setExpandedModuleId(isExpanded ? null : mod.id)}>
                  <MoveButtons
                    onUp={() => { onUpdateModules(moveItem(modules, i, -1)); }}
                    onDown={() => { onUpdateModules(moveItem(modules, i, 1)); }}
                    disableUp={i === 0}
                    disableDown={i === modules.length - 1}
                  />
                  <div className="w-11 h-11 rounded-xl bg-body flex items-center justify-center font-bold text-text-secondary text-sm border border-border-color overflow-hidden flex-shrink-0">
                    {previewThumb ? <img src={previewThumb} className="w-full h-full object-cover" alt="" /> : (i + 1)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="font-bold text-text-primary text-sm truncate">{mod.title}</h4>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-[10px] text-text-secondary">{mod.lessons.length} уроков</span>
                      <span className="text-[10px] text-text-secondary">•</span>
                      <span className={`text-[10px] text-[${cl.accent}] font-medium`}>{mod.category}</span>
                      {progress > 0 && <span className={`text-[10px] text-[${cl.green}] font-medium`}>{progress}%</span>}
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <button onClick={e => { e.stopPropagation(); setEditingModule({ ...mod }); }} className={`p-2 rounded-lg text-sm ${cl.btnEdit}`}>✎</button>
                    <button onClick={e => { e.stopPropagation(); deleteModule(mod.id); }} className={`p-2 rounded-lg text-sm ${cl.btnDanger}`}>✕</button>
                  </div>
                  <svg className={`w-4 h-4 text-text-secondary transition-transform duration-300 flex-shrink-0 ${isExpanded ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                </div>

                {/* Expanded: Lessons */}
                <div className={`transition-all duration-300 overflow-hidden ${isExpanded ? 'max-h-[5000px] opacity-100' : 'max-h-0 opacity-0'}`}>
                  <div className="border-t border-border-color p-4 space-y-2 bg-body/30">
                    <div className="flex items-center justify-between mb-2">
                      <h5 className="text-[10px] font-bold uppercase tracking-wide text-text-secondary ml-1">Уроки ({mod.lessons.length})</h5>
                      <button onClick={() => addNewLesson(mod.id)} className="text-[10px] font-bold text-[#6C5DD3] hover:underline">+ Добавить урок</button>
                    </div>
                    {mod.lessons.map((lesson, idx) => {
                      const isDone = currentUser.completedLessonIds?.includes(lesson.id);
                      return (
                        <div key={lesson.id} className={`flex items-center gap-3 p-3 rounded-xl border transition-all ${isDone ? 'bg-[#34C759]/5 border-[#34C759]/20' : 'bg-surface border-border-color'}`}>
                          <MoveButtons
                            onUp={() => { const newLessons = moveItem(mod.lessons, idx, -1); handleUpdateModuleDetails(mod.id, { lessons: newLessons }); }}
                            onDown={() => { const newLessons = moveItem(mod.lessons, idx, 1); handleUpdateModuleDetails(mod.id, { lessons: newLessons }); }}
                            disableUp={idx === 0}
                            disableDown={idx === mod.lessons.length - 1}
                          />
                          <div className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold flex-shrink-0 ${isDone ? 'bg-[#34C759] text-white' : 'bg-body text-text-secondary border border-border-color'}`}>
                            {isDone ? '✓' : (idx + 1)}
                          </div>
                          <div className="flex-1 min-w-0">
                            <h4 className="text-xs font-semibold text-text-primary truncate">{lesson.title}</h4>
                            <div className="flex items-center gap-2 mt-0.5">
                              <span className="text-[9px] text-text-secondary">+{lesson.xpReward} XP</span>
                              <span className="text-[9px] text-text-secondary">{lesson.homeworkType}</span>
                              {lesson.videoUrl && <span className="text-[9px] text-text-secondary">🎥</span>}
                            </div>
                          </div>
                          <button onClick={() => setEditingLesson({ moduleId: mod.id, lesson: { ...lesson } })} className={`px-3 py-1.5 rounded-lg bg-[#6C5DD3]/10 text-[#6C5DD3] text-[10px] font-bold uppercase active:scale-95 transition-transform`}>Edit</button>
                          <button onClick={() => deleteLesson(mod.id, lesson.id)} className={`p-1.5 rounded-lg text-sm ${cl.btnDanger}`}>✕</button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ═══════ MATERIALS ═══════ */}
      {activeSubTab === 'MATERIALS' && (
        <div className="space-y-4 animate-slide-up">
          <div className="flex justify-between items-center">
            <h3 className={cl.sectionTitle}>Материалы ({materials.length})</h3>
            <button onClick={() => setEditingMaterial({ _isNew: true, type: 'LINK' })} className="px-4 py-2 rounded-xl bg-[#6C5DD3] text-white text-xs font-bold active:scale-95 transition-transform">+ Добавить</button>
          </div>

          {materials.length === 0 && <EmptyState icon="📎" text="Нет материалов" />}

          {materials.map((mat, i) => (
            <div key={mat.id} className={`${cl.cardH} p-4 flex items-center gap-3`}>
              <MoveButtons
                onUp={() => onUpdateMaterials(moveItem(materials, i, -1))}
                onDown={() => onUpdateMaterials(moveItem(materials, i, 1))}
                disableUp={i === 0} disableDown={i === materials.length - 1}
              />
              <div className="w-10 h-10 rounded-xl bg-body flex items-center justify-center text-lg border border-border-color flex-shrink-0">
                {mat.type === 'PDF' ? '📄' : mat.type === 'VIDEO' ? '🎥' : '🔗'}
              </div>
              <div className="flex-1 min-w-0">
                <h4 className="font-bold text-sm text-text-primary truncate">{mat.title}</h4>
                <p className="text-[10px] text-text-secondary truncate">{mat.description || mat.url}</p>
              </div>
              <span className="text-[9px] font-bold uppercase text-text-secondary bg-body px-2 py-1 rounded-lg flex-shrink-0">{mat.type}</span>
              <button onClick={() => setEditingMaterial({ ...mat })} className={`p-2 rounded-lg text-sm ${cl.btnEdit}`}>✎</button>
              <button onClick={() => deleteMaterial(mat.id)} className={`p-2 rounded-lg text-sm ${cl.btnDanger}`}>✕</button>
            </div>
          ))}
        </div>
      )}

      {/* ═══════ ARENA ═══════ */}
      {activeSubTab === 'ARENA' && (
        <div className="space-y-4 animate-slide-up">
          <div className="flex justify-between items-center">
            <h3 className={cl.sectionTitle}>Сценарии Арены ({scenarios.length})</h3>
            <button onClick={() => setEditingScenario({ _isNew: true, difficulty: 'Easy' })} className="px-4 py-2 rounded-xl bg-[#6C5DD3] text-white text-xs font-bold active:scale-95 transition-transform">+ Сценарий</button>
          </div>

          {scenarios.length === 0 && <EmptyState icon="⚔️" text="Нет сценариев" />}

          {scenarios.map(sc => (
            <div key={sc.id} className={`${cl.card} p-5 relative overflow-hidden group`}>
              <div className={`absolute top-0 left-0 w-1 h-full ${sc.difficulty === 'Hard' ? 'bg-red-500' : sc.difficulty === 'Medium' ? 'bg-orange-500' : 'bg-green-500'}`} />
              <div className="flex justify-between items-start mb-2 pl-3">
                <h4 className="font-bold text-text-primary">{sc.title}</h4>
                <div className="flex gap-2 items-center">
                  <span className="text-[9px] font-bold uppercase text-text-secondary bg-body px-2 py-1 rounded-lg">{sc.difficulty}</span>
                  <button onClick={() => setEditingScenario({ ...sc })} className={`p-1 rounded-lg text-sm ${cl.btnEdit}`}>✎</button>
                  <button onClick={() => deleteScenario(sc.id)} className={`p-1 rounded-lg text-sm ${cl.btnDanger}`}>✕</button>
                </div>
              </div>
              <p className="text-xs text-text-secondary pl-3 line-clamp-2">{sc.objective}</p>
              <p className="text-[10px] text-text-secondary pl-3 mt-1 italic">Роль: {sc.clientRole}</p>
            </div>
          ))}
        </div>
      )}

      {/* ═══════ STREAMS & CALENDAR ═══════ */}
      {(activeSubTab === 'STREAMS' || activeSubTab === 'CALENDAR') && (
        <div className="space-y-8 animate-slide-up">
          {/* Streams */}
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h3 className={cl.sectionTitle}>Эфиры ({streams.length})</h3>
              <button onClick={() => setEditingStream({ _isNew: true, status: 'UPCOMING' })} className="px-4 py-2 rounded-xl bg-[#6C5DD3] text-white text-xs font-bold active:scale-95 transition-transform">+ Эфир</button>
            </div>
            {streams.length === 0 && <EmptyState icon="📡" text="Нет эфиров" />}
            {streams.map(s => (
              <div key={s.id} className={`${cl.cardH} p-4 flex items-center justify-between`}>
                <div className="flex-1 min-w-0">
                  <h4 className="font-bold text-sm text-text-primary truncate">{s.title}</h4>
                  <p className="text-[10px] text-text-secondary">{new Date(s.date).toLocaleString()} • <span className={s.status === 'LIVE' ? 'text-red-500 font-bold animate-pulse' : ''}>{s.status}</span></p>
                </div>
                <div className="flex gap-1">
                  <button onClick={() => setEditingStream({ ...s })} className={`p-2 rounded-lg text-sm ${cl.btnEdit}`}>✎</button>
                  <button onClick={() => deleteStream(s.id)} className={`p-2 rounded-lg text-sm ${cl.btnDanger}`}>✕</button>
                </div>
              </div>
            ))}
          </div>

          {/* Events */}
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h3 className={cl.sectionTitle}>События ({events.length})</h3>
              <button onClick={() => setEditingEvent({ _isNew: true, type: EventType.OTHER })} className="px-4 py-2 rounded-xl bg-[#6C5DD3] text-white text-xs font-bold active:scale-95 transition-transform">+ Событие</button>
            </div>
            {events.length === 0 && <EmptyState icon="📅" text="Нет событий" />}
            {events.map(ev => (
              <div key={ev.id} className={`${cl.cardH} p-4 flex items-center justify-between`}>
                <div className="flex-1 min-w-0">
                  <h4 className="font-bold text-sm text-text-primary truncate">{ev.title}</h4>
                  <p className="text-[10px] text-text-secondary">{new Date(isoStr(ev.date)).toLocaleString()} • {ev.type} • {ev.durationMinutes || 60} мин</p>
                </div>
                <div className="flex gap-1">
                  <button onClick={() => setEditingEvent({ ...ev })} className={`p-2 rounded-lg text-sm ${cl.btnEdit}`}>✎</button>
                  <button onClick={() => deleteEvent(ev.id)} className={`p-2 rounded-lg text-sm ${cl.btnDanger}`}>✕</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ═══════ USERS ═══════ */}
      {activeSubTab === 'USERS' && (
        <div className="space-y-4 animate-slide-up">
          <SearchBar value={userSearchTerm} onChange={setUserSearchTerm} placeholder="Поиск бойца..." />
          <p className="text-[10px] text-text-secondary ml-1">Найдено: {filteredUsers.length} из {users.length}</p>
          {filteredUsers.length === 0 && <EmptyState icon="👥" text="Никого не найдено" />}
          {filteredUsers.map(user => (
            <div key={user.telegramId || user.name} className={`${cl.cardH} p-4 flex items-center justify-between group`}>
              <div className="flex items-center gap-3 flex-1 min-w-0">
                <div className="w-10 h-10 rounded-full bg-body overflow-hidden flex-shrink-0">
                  <Avatar src={user.avatarUrl} name={user.name} size="w-full h-full" />
                </div>
                <div className="min-w-0">
                  <h4 className="font-bold text-text-primary text-sm truncate">{user.name}</h4>
                  <div className="flex gap-2 items-center">
                    <span className={`text-[9px] font-bold uppercase ${user.role === 'ADMIN' ? 'text-[#6C5DD3]' : 'text-text-secondary'}`}>{user.role}</span>
                    <span className="text-[9px] text-text-secondary">XP: {user.xp}</span>
                    <span className="text-[9px] text-text-secondary">Lv.{user.level}</span>
                    {user.telegramUsername && <span className="text-[9px] text-text-secondary">@{user.telegramUsername}</span>}
                  </div>
                </div>
              </div>
              <div className="flex gap-2 items-center">
                <button onClick={() => setEditingUser(user)} className={`p-2 rounded-lg text-sm ${cl.btnEdit}`}>👁</button>
                <button onClick={() => toggleUserRole(user)} className="px-3 py-1.5 rounded-lg bg-body text-[9px] font-bold uppercase border border-border-color hover:border-[#6C5DD3] transition-colors">
                  {user.role === 'ADMIN' ? 'Demote' : 'Promote'}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ═══════ SETTINGS ═══════ */}
      {activeSubTab === 'SETTINGS' && (
        <div className="space-y-6 animate-slide-up">
          {/* Feature Toggles */}
          <div className={`${cl.card} p-6 space-y-3`}>
            <h3 className={cl.sectionTitle}>Системные Настройки</h3>
            {Object.entries(config.features).map(([key, value]) => (
              <Toggle key={key} label={key.replace(/([A-Z])/g, ' $1')} value={value as boolean} onChange={() => toggleFeature(key as keyof AppConfig['features'])} />
            ))}
          </div>

          {/* Welcome Screen */}
          <div className={`${cl.card} p-6 space-y-4`}>
            <h3 className={`${cl.sectionTitle} flex items-center gap-2`}><span>👋</span> Экран Приветствия</h3>
            <div>
              <label className={cl.label}>Ссылка на видео (YouTube/MP4)</label>
              <input value={welcomeConfig.videoUrl} onChange={e => setWelcomeConfig({ ...welcomeConfig, videoUrl: e.target.value })} placeholder="https://youtube.com/..." className={cl.inputMono} />
            </div>
            <div>
              <label className={cl.label}>Приветственное сообщение</label>
              <textarea value={welcomeConfig.message} onChange={e => setWelcomeConfig({ ...welcomeConfig, message: e.target.value })} placeholder="Текст под видео..." className={cl.textarea} />
            </div>
            <Button onClick={handleSaveWelcomeConfig} fullWidth className="!rounded-xl">Сохранить Экран</Button>
          </div>

          {/* AI Configuration */}
          <div className={`${cl.card} p-6 space-y-4`}>
            <h3 className={cl.sectionTitle}>AI Configuration</h3>
            <select value={selectedProvider} onChange={e => setSelectedProvider(e.target.value as AIProviderId)} className={cl.input}>
              <option value="GOOGLE_GEMINI">Google Gemini</option>
              <option value="OPENAI_GPT4">OpenAI GPT-4</option>
              <option value="ANTHROPIC_CLAUDE">Anthropic Claude</option>
              <option value="GROQ">Groq (Llama 3)</option>
              <option value="OPENROUTER">OpenRouter</option>
            </select>
            <div className="space-y-2">
              {([['google', 'Google Gemini API Key'], ['openai', 'OpenAI API Key'], ['anthropic', 'Anthropic API Key'], ['groq', 'Groq API Key'], ['openrouter', 'OpenRouter API Key']] as const).map(([k, ph]) => (
                <input key={k} type="password" value={(apiKeys as any)[k] || ''} onChange={e => setApiKeys({ ...apiKeys, [k]: e.target.value })} placeholder={ph} className={`${cl.input} !text-xs`} />
              ))}
            </div>
            <div>
              <label className={cl.label}>System Instruction</label>
              <textarea value={systemInstruction} onChange={e => setSystemInstruction(e.target.value)} className={`${cl.textarea} !h-24`} placeholder="System Instruction..." />
            </div>
            <Button onClick={handleSaveAIConfig} fullWidth className="!rounded-xl">Сохранить AI Config</Button>
          </div>

          {/* ═══ SYNC & AIRTABLE DASHBOARD ═══ */}
          <div className={`${cl.card} p-6 space-y-5`}>
            <div className="flex items-center justify-between">
              <h3 className={`${cl.sectionTitle} flex items-center gap-2`}><span>🔄</span> Синхронизация & Airtable</h3>
              {syncHealth && (
                <div className={`flex items-center gap-2 px-3 py-1 rounded-full text-[10px] font-bold uppercase ${syncHealth.airtable ? 'bg-[#34C759]/10 text-[#34C759]' : 'bg-red-500/10 text-red-500'}`}>
                  <div className={`w-2 h-2 rounded-full ${syncHealth.airtable ? 'bg-[#34C759] animate-pulse' : 'bg-red-500'}`} />
                  {syncHealth.airtable ? 'Online' : 'Offline'}
                </div>
              )}
            </div>

            {/* Connection Status Card */}
            <div className="bg-body rounded-xl p-4 border border-border-color space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-text-primary">Статус подключения</span>
                <button
                  onClick={handleHealthCheck}
                  disabled={syncStatus === 'checking'}
                  className={`px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase transition-all active:scale-95 ${syncStatus === 'checking' ? 'bg-body text-text-secondary' : 'bg-[#6C5DD3]/10 text-[#6C5DD3] hover:bg-[#6C5DD3]/20'}`}
                >
                  {syncStatus === 'checking' ? '⏳ Проверка...' : '🏥 Health Check'}
                </button>
              </div>
              
              {syncHealth && (
                <div className="grid grid-cols-2 gap-2">
                  <div className={`p-3 rounded-lg border ${syncHealth.configured ? 'border-[#34C759]/30 bg-[#34C759]/5' : 'border-red-500/30 bg-red-500/5'}`}>
                    <p className="text-[9px] font-bold text-text-secondary uppercase">Конфигурация</p>
                    <p className={`text-sm font-bold ${syncHealth.configured ? 'text-[#34C759]' : 'text-red-500'}`}>{syncHealth.configured ? '✓ OK' : '✕ Нет'}</p>
                  </div>
                  <div className={`p-3 rounded-lg border ${syncHealth.airtable ? 'border-[#34C759]/30 bg-[#34C759]/5' : 'border-red-500/30 bg-red-500/5'}`}>
                    <p className="text-[9px] font-bold text-text-secondary uppercase">Airtable API</p>
                    <p className={`text-sm font-bold ${syncHealth.airtable ? 'text-[#34C759]' : 'text-red-500'}`}>{syncHealth.airtable ? '✓ Доступен' : '✕ Ошибка'}</p>
                  </div>
                </div>
              )}

              {lastSyncTime && (
                <p className="text-[10px] text-text-secondary">Последняя синхронизация: <span className="font-bold text-text-primary">{lastSyncTime}</span></p>
              )}
            </div>

            {/* Sync Actions */}
            <div className="space-y-2">
              <p className={cl.label}>Операции синхронизации</p>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={handlePullFromAirtable}
                  disabled={syncStatus === 'syncing'}
                  className={`p-4 rounded-xl border border-border-color text-center transition-all active:scale-95 hover:border-[#6C5DD3] ${syncStatus === 'syncing' ? 'opacity-50' : ''}`}
                >
                  <span className="text-2xl block mb-1">⬇️</span>
                  <span className="text-[10px] font-bold uppercase text-text-primary block">Pull</span>
                  <span className="text-[8px] text-text-secondary">Airtable → Local</span>
                </button>
                <button
                  onClick={handleFullSync}
                  disabled={syncStatus === 'syncing'}
                  className={`p-4 rounded-xl border border-border-color text-center transition-all active:scale-95 hover:border-[#6C5DD3] ${syncStatus === 'syncing' ? 'opacity-50' : ''}`}
                >
                  <span className="text-2xl block mb-1">⬆️</span>
                  <span className="text-[10px] font-bold uppercase text-text-primary block">Push</span>
                  <span className="text-[8px] text-text-secondary">Local → Airtable</span>
                </button>
              </div>
              <button
                onClick={handleClearSyncCache}
                className="w-full p-3 rounded-xl border border-border-color text-xs font-medium text-text-secondary hover:border-red-500/50 hover:text-red-500 transition-all active:scale-95 flex items-center justify-center gap-2"
              >
                <span>🧹</span> Очистить кэш Airtable
              </button>
            </div>

            {/* Data Summary */}
            <div className="bg-body rounded-xl p-4 border border-border-color">
              <p className={cl.label}>Локальные данные</p>
              <div className="grid grid-cols-3 gap-2 mt-2">
                {[
                  ['📦', 'Модули', modules.length],
                  ['📚', 'Уроки', modules.reduce((a, m) => a + m.lessons.length, 0)],
                  ['📎', 'Материалы', materials.length],
                  ['📡', 'Эфиры', streams.length],
                  ['⚔️', 'Сценарии', scenarios.length],
                  ['📅', 'События', events.length],
                ].map(([icon, label, count]) => (
                  <div key={label as string} className="text-center p-2 rounded-lg border border-border-color">
                    <span className="text-lg">{icon}</span>
                    <p className="text-xs font-bold text-text-primary">{count}</p>
                    <p className="text-[8px] text-text-secondary uppercase">{label}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Sync Log */}
            {syncLog.length > 0 && (
              <div className="bg-body rounded-xl p-4 border border-border-color">
                <div className="flex items-center justify-between mb-2">
                  <p className={cl.label}>Лог синхронизации</p>
                  <button onClick={() => setSyncLog([])} className="text-[9px] text-text-secondary hover:text-red-500">Очистить</button>
                </div>
                <div className="max-h-40 overflow-y-auto space-y-1 no-scrollbar">
                  {syncLog.map((line, i) => (
                    <p key={i} className="text-[10px] font-mono text-text-secondary leading-relaxed">{line}</p>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Airtable Credentials */}
          <div className={`${cl.card} p-6 space-y-4`}>
            <h3 className={`${cl.sectionTitle} flex items-center gap-2`}><span>🔑</span> Airtable Credentials</h3>
            <div>
              <label className={cl.label}>Personal Access Token (PAT)</label>
              <input type="password" value={airtableConfig.pat} onChange={e => setAirtableConfig({ ...airtableConfig, pat: e.target.value })} placeholder="pat..." className={cl.inputMono} />
            </div>
            <div>
              <label className={cl.label}>Base ID</label>
              <input value={airtableConfig.baseId} onChange={e => setAirtableConfig({ ...airtableConfig, baseId: e.target.value })} placeholder="app..." className={cl.inputMono} />
            </div>
            <div>
              <label className={cl.label}>Users Table</label>
              <input value={airtableConfig.tableName} onChange={e => setAirtableConfig({ ...airtableConfig, tableName: e.target.value })} placeholder="Users" className={cl.input} />
            </div>
            <Button onClick={handleSaveAirtableConfig} fullWidth className="!rounded-xl">Сохранить & Подключить</Button>
          </div>

          {/* Table Names Config */}
          <div className={`${cl.card} p-6 space-y-4`}>
            <h3 className={`${cl.sectionTitle} flex items-center gap-2`}><span>📋</span> Названия таблиц Airtable</h3>
            <p className="text-[10px] text-text-secondary -mt-2">Имена таблиц в базе Airtable. Измените если ваши таблицы названы иначе.</p>
            <div className="grid grid-cols-2 gap-3">
              {([
                ['modulesTable', 'Modules', '📦'],
                ['lessonsTable', 'Lessons', '📚'],
                ['materialsTable', 'Materials', '📎'],
                ['streamsTable', 'Streams', '📡'],
                ['scenariosTable', 'Scenarios', '⚔️'],
                ['eventsTable', 'Events', '📅'],
                ['notificationsTable', 'Notifications', '🔔'],
                ['configTable', 'Config', '⚙️'],
              ] as const).map(([key, placeholder, icon]) => (
                <div key={key}>
                  <label className={cl.label}>{icon} {placeholder}</label>
                  <input
                    value={(airtableConfig as any)[key] || ''}
                    onChange={e => setAirtableConfig({ ...airtableConfig, [key]: e.target.value })}
                    placeholder={placeholder}
                    className={`${cl.input} !text-xs`}
                  />
                </div>
              ))}
            </div>
            <p className="text-[9px] text-text-secondary italic mt-1">⚠️ Изменения вступят в силу после перезапуска приложения (требуются env-переменные VITE_AIRTABLE_*_TABLE)</p>
          </div>

          {/* Sync Architecture Info */}
          <div className={`${cl.card} p-6 space-y-3`}>
            <h3 className={`${cl.sectionTitle} flex items-center gap-2`}><span>ℹ️</span> Как работает синхронизация</h3>
            <div className="space-y-2 text-xs text-text-secondary">
              <div className="flex gap-3 items-start">
                <span className="text-lg mt-0.5">💾</span>
                <div>
                  <p className="font-bold text-text-primary">Offline-First</p>
                  <p>Все данные сначала сохраняются в localStorage. Airtable синхронизируется фоново.</p>
                </div>
              </div>
              <div className="flex gap-3 items-start">
                <span className="text-lg mt-0.5">🔄</span>
                <div>
                  <p className="font-bold text-text-primary">Авто-синхронизация</p>
                  <p>Каждые 2 минуты + мгновенно при возврате на вкладку. После изменений — ускоренный цикл 30 сек.</p>
                </div>
              </div>
              <div className="flex gap-3 items-start">
                <span className="text-lg mt-0.5">⚡</span>
                <div>
                  <p className="font-bold text-text-primary">Rate Limiting</p>
                  <p>4 запроса/сек, 3 параллельных. Автоматический retry при 429 ошибках.</p>
                </div>
              </div>
              <div className="flex gap-3 items-start">
                <span className="text-lg mt-0.5">🗑️</span>
                <div>
                  <p className="font-bold text-text-primary">Diff Sync</p>
                  <p>При Push удалённые локально записи удаляются и в Airtable. Без дубликатов и призраков.</p>
                </div>
              </div>
              <div className="flex gap-3 items-start">
                <span className="text-lg mt-0.5">📄</span>
                <div>
                  <p className="font-bold text-text-primary">Пагинация</p>
                  <p>Автоматическая загрузка всех записей даже при 100+ в таблице.</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════ */}
      {/*                     MODALS                             */}
      {/* ═══════════════════════════════════════════════════════ */}

      {/* --- Module Modal --- */}
      {editingModule && (
        <Modal title={editingModule._isNew ? 'Новый Модуль' : 'Редактировать Модуль'} onClose={() => setEditingModule(null)}>
          <div className="space-y-3">
            <div><label className={cl.label}>Название</label><input value={editingModule.title || ''} onChange={e => setEditingModule({ ...editingModule, title: e.target.value })} className={cl.input} placeholder="Название модуля" /></div>
            <div><label className={cl.label}>Описание</label><textarea value={editingModule.description || ''} onChange={e => setEditingModule({ ...editingModule, description: e.target.value })} className={cl.textarea} placeholder="Описание" /></div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className={cl.label}>Категория</label>
                <select value={editingModule.category || 'GENERAL'} onChange={e => setEditingModule({ ...editingModule, category: e.target.value as ModuleCategory })} className={cl.input}>
                  <option value="GENERAL">General</option>
                  <option value="SALES">Sales</option>
                  <option value="PSYCHOLOGY">Psychology</option>
                  <option value="TACTICS">Tactics</option>
                </select>
              </div>
              <div><label className={cl.label}>Min Level</label><input type="number" value={editingModule.minLevel || 0} onChange={e => setEditingModule({ ...editingModule, minLevel: +e.target.value })} className={cl.input} /></div>
            </div>
            <div><label className={cl.label}>Image URL</label><input value={editingModule.imageUrl || ''} onChange={e => setEditingModule({ ...editingModule, imageUrl: e.target.value })} className={cl.inputMono} placeholder="https://..." /></div>
            <div><label className={cl.label}>Video URL</label><input value={editingModule.videoUrl || ''} onChange={e => setEditingModule({ ...editingModule, videoUrl: e.target.value })} className={cl.inputMono} placeholder="YouTube URL" /></div>
          </div>
          <Button onClick={saveModule} fullWidth className="!rounded-xl !mt-4">{editingModule._isNew ? 'Создать' : 'Обновить'}</Button>
        </Modal>
      )}

      {/* --- Lesson Modal --- */}
      {editingLesson && (
        <Modal title={editingLesson.lesson.title ? `Редактировать: ${editingLesson.lesson.title}` : 'Новый Урок'} onClose={() => setEditingLesson(null)} wide>
          <div className="space-y-3">
            <div><label className={cl.label}>Название</label><input value={editingLesson.lesson.title} onChange={e => setEditingLesson({ ...editingLesson, lesson: { ...editingLesson.lesson, title: e.target.value } })} className={cl.input} placeholder="Название урока" /></div>
            <div><label className={cl.label}>Описание</label><textarea value={editingLesson.lesson.description} onChange={e => setEditingLesson({ ...editingLesson, lesson: { ...editingLesson.lesson, description: e.target.value } })} className={cl.textarea} placeholder="Краткое описание" /></div>
            <div>
              <label className={cl.label}>Контент (Markdown)</label>
              <MarkdownToolbar onInsert={(tag, ph) => {
                const val = editingLesson.lesson.content;
                setEditingLesson({ ...editingLesson, lesson: { ...editingLesson.lesson, content: val + tag + (ph || '') + tag } });
              }} />
              <textarea value={editingLesson.lesson.content} onChange={e => setEditingLesson({ ...editingLesson, lesson: { ...editingLesson.lesson, content: e.target.value } })} className={`${cl.textarea} !h-40 font-mono !text-xs`} placeholder="# Заголовок\n\nТекст урока..." />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div><label className={cl.label}>XP Reward</label><input type="number" value={editingLesson.lesson.xpReward} onChange={e => setEditingLesson({ ...editingLesson, lesson: { ...editingLesson.lesson, xpReward: +e.target.value } })} className={cl.input} /></div>
              <div>
                <label className={cl.label}>Тип ДЗ</label>
                <select value={editingLesson.lesson.homeworkType} onChange={e => setEditingLesson({ ...editingLesson, lesson: { ...editingLesson.lesson, homeworkType: e.target.value as HomeworkType } })} className={cl.input}>
                  <option value="TEXT">Text</option>
                  <option value="PHOTO">Photo</option>
                  <option value="VIDEO">Video</option>
                  <option value="FILE">File</option>
                </select>
              </div>
            </div>
            <div><label className={cl.label}>Задание для ДЗ</label><textarea value={editingLesson.lesson.homeworkTask} onChange={e => setEditingLesson({ ...editingLesson, lesson: { ...editingLesson.lesson, homeworkTask: e.target.value } })} className={cl.textarea} placeholder="Описание домашнего задания..." /></div>
            <div><label className={cl.label}>AI Grading Instruction</label><textarea value={editingLesson.lesson.aiGradingInstruction} onChange={e => setEditingLesson({ ...editingLesson, lesson: { ...editingLesson.lesson, aiGradingInstruction: e.target.value } })} className={`${cl.textarea} font-mono !text-xs`} placeholder="Инструкция для ИИ по проверке..." /></div>
            <div><label className={cl.label}>Video URL</label><input value={editingLesson.lesson.videoUrl || ''} onChange={e => setEditingLesson({ ...editingLesson, lesson: { ...editingLesson.lesson, videoUrl: e.target.value } })} className={cl.inputMono} placeholder="YouTube URL" /></div>
          </div>
          <Button onClick={saveLesson} fullWidth className="!rounded-xl !mt-4">Сохранить Урок</Button>
        </Modal>
      )}

      {/* --- Material Modal --- */}
      {editingMaterial && (
        <Modal title={editingMaterial._isNew ? 'Новый Материал' : 'Редактировать Материал'} onClose={() => setEditingMaterial(null)}>
          <div className="space-y-3">
            <div><label className={cl.label}>Название</label><input value={editingMaterial.title || ''} onChange={e => setEditingMaterial({ ...editingMaterial, title: e.target.value })} className={cl.input} placeholder="Название" /></div>
            <div><label className={cl.label}>Описание</label><textarea value={editingMaterial.description || ''} onChange={e => setEditingMaterial({ ...editingMaterial, description: e.target.value })} className={cl.textarea} placeholder="Описание" /></div>
            <div>
              <label className={cl.label}>Тип</label>
              <select value={editingMaterial.type || 'LINK'} onChange={e => setEditingMaterial({ ...editingMaterial, type: e.target.value as Material['type'] })} className={cl.input}>
                <option value="PDF">PDF</option>
                <option value="VIDEO">Video</option>
                <option value="LINK">Link</option>
              </select>
            </div>
            <div><label className={cl.label}>URL</label><input value={editingMaterial.url || ''} onChange={e => setEditingMaterial({ ...editingMaterial, url: e.target.value })} className={cl.inputMono} placeholder="https://..." /></div>
          </div>
          <Button onClick={saveMaterial} fullWidth className="!rounded-xl !mt-4">{editingMaterial._isNew ? 'Создать' : 'Обновить'}</Button>
        </Modal>
      )}

      {/* --- Scenario Modal --- */}
      {editingScenario && (
        <Modal title={editingScenario._isNew ? 'Новый Сценарий' : 'Редактировать Сценарий'} onClose={() => setEditingScenario(null)}>
          <div className="space-y-3">
            <div><label className={cl.label}>Название</label><input value={editingScenario.title || ''} onChange={e => setEditingScenario({ ...editingScenario, title: e.target.value })} className={cl.input} placeholder="Название" /></div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className={cl.label}>Сложность</label>
                <select value={editingScenario.difficulty || 'Easy'} onChange={e => setEditingScenario({ ...editingScenario, difficulty: e.target.value as any })} className={cl.input}>
                  <option value="Easy">Easy</option>
                  <option value="Medium">Medium</option>
                  <option value="Hard">Hard</option>
                </select>
              </div>
              <div><label className={cl.label}>Роль клиента</label><input value={editingScenario.clientRole || ''} onChange={e => setEditingScenario({ ...editingScenario, clientRole: e.target.value })} className={cl.input} placeholder="Скептик" /></div>
            </div>
            <div><label className={cl.label}>Цель</label><textarea value={editingScenario.objective || ''} onChange={e => setEditingScenario({ ...editingScenario, objective: e.target.value })} className={cl.textarea} placeholder="Цель сценария..." /></div>
            <div><label className={cl.label}>Первая фраза клиента</label><textarea value={editingScenario.initialMessage || ''} onChange={e => setEditingScenario({ ...editingScenario, initialMessage: e.target.value })} className={cl.textarea} placeholder="Первая фраза..." /></div>
          </div>
          <Button onClick={saveScenario} fullWidth className="!rounded-xl !mt-4">{editingScenario._isNew ? 'Создать' : 'Обновить'}</Button>
        </Modal>
      )}

      {/* --- Stream Modal --- */}
      {editingStream && (
        <Modal title={editingStream._isNew ? 'Новый Эфир' : 'Редактировать Эфир'} onClose={() => setEditingStream(null)}>
          <div className="space-y-3">
            <div><label className={cl.label}>Название</label><input value={editingStream.title || ''} onChange={e => setEditingStream({ ...editingStream, title: e.target.value })} className={cl.input} placeholder="Название эфира" /></div>
            <div className="grid grid-cols-2 gap-2">
              <div><label className={cl.label}>Дата и время</label><input type="datetime-local" value={isoStr(editingStream.date).substring(0, 16)} onChange={e => setEditingStream({ ...editingStream, date: e.target.value })} className={cl.input} /></div>
              <div>
                <label className={cl.label}>Статус</label>
                <select value={editingStream.status || 'UPCOMING'} onChange={e => setEditingStream({ ...editingStream, status: e.target.value as any })} className={cl.input}>
                  <option value="UPCOMING">Upcoming</option>
                  <option value="LIVE">Live</option>
                  <option value="PAST">Past</option>
                </select>
              </div>
            </div>
            <div><label className={cl.label}>YouTube URL</label><input value={editingStream.youtubeUrl || ''} onChange={e => setEditingStream({ ...editingStream, youtubeUrl: e.target.value })} className={cl.inputMono} placeholder="https://youtube.com/..." /></div>
          </div>
          <Button onClick={saveStream} fullWidth className="!rounded-xl !mt-4">{editingStream._isNew ? 'Создать' : 'Обновить'}</Button>
        </Modal>
      )}

      {/* --- Event Modal --- */}
      {editingEvent && (
        <Modal title={editingEvent._isNew ? 'Новое Событие' : 'Редактировать Событие'} onClose={() => setEditingEvent(null)}>
          <div className="space-y-3">
            <div><label className={cl.label}>Название</label><input value={editingEvent.title || ''} onChange={e => setEditingEvent({ ...editingEvent, title: e.target.value })} className={cl.input} placeholder="Название" /></div>
            <div><label className={cl.label}>Описание</label><textarea value={editingEvent.description || ''} onChange={e => setEditingEvent({ ...editingEvent, description: e.target.value })} className={cl.textarea} placeholder="Описание события..." /></div>
            <div className="grid grid-cols-2 gap-2">
              <div><label className={cl.label}>Дата</label><input type="datetime-local" value={isoStr(editingEvent.date).substring(0, 16)} onChange={e => setEditingEvent({ ...editingEvent, date: e.target.value })} className={cl.input} /></div>
              <div>
                <label className={cl.label}>Тип</label>
                <select value={editingEvent.type || EventType.OTHER} onChange={e => setEditingEvent({ ...editingEvent, type: e.target.value as EventType })} className={cl.input}>
                  <option value={EventType.HOMEWORK}>Homework</option>
                  <option value={EventType.WEBINAR}>Webinar</option>
                  <option value={EventType.OTHER}>Other</option>
                </select>
              </div>
            </div>
            <div><label className={cl.label}>Длительность (мин)</label><input type="number" value={editingEvent.durationMinutes || 60} onChange={e => setEditingEvent({ ...editingEvent, durationMinutes: +e.target.value })} className={cl.input} /></div>
          </div>
          <Button onClick={saveEvent} fullWidth className="!rounded-xl !mt-4">{editingEvent._isNew ? 'Создать' : 'Обновить'}</Button>
        </Modal>
      )}

      {/* --- User Detail Modal --- */}
      {editingUser && (
        <Modal title={`Профиль: ${editingUser.name}`} onClose={() => setEditingUser(null)}>
          <div className="space-y-3">
            <div className="flex items-center gap-4 pb-3 border-b border-border-color">
              <div className="w-16 h-16 rounded-full bg-body overflow-hidden flex-shrink-0">
                <Avatar src={editingUser.avatarUrl} name={editingUser.name} size="w-full h-full" />
              </div>
              <div>
                <h4 className="font-bold text-text-primary text-lg">{editingUser.name}</h4>
                <div className="flex gap-3 text-[10px] text-text-secondary">
                  <span className="font-bold">{editingUser.role}</span>
                  <span>XP: {editingUser.xp}</span>
                  <span>Level: {editingUser.level}</span>
                </div>
                {editingUser.telegramUsername && <p className="text-[10px] text-[#6C5DD3]">@{editingUser.telegramUsername}</p>}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className={`${cl.card} p-3`}>
                <p className={cl.label}>Пройдено уроков</p>
                <p className="font-bold text-text-primary text-lg">{editingUser.completedLessonIds?.length || 0}</p>
              </div>
              <div className={`${cl.card} p-3`}>
                <p className={cl.label}>Сдано ДЗ</p>
                <p className="font-bold text-text-primary text-lg">{editingUser.submittedHomeworks?.length || 0}</p>
              </div>
              <div className={`${cl.card} p-3`}>
                <p className={cl.label}>Привычки</p>
                <p className="font-bold text-text-primary text-lg">{editingUser.habits?.length || 0}</p>
              </div>
              <div className={`${cl.card} p-3`}>
                <p className={cl.label}>Цели</p>
                <p className="font-bold text-text-primary text-lg">{editingUser.goals?.length || 0}</p>
              </div>
            </div>
            {editingUser.dossier && (
              <div className={`${cl.card} p-4 space-y-1`}>
                <h5 className={cl.label}>Досье</h5>
                {Object.entries(editingUser.dossier).filter(([, v]) => v).map(([k, v]) => (
                  <p key={k} className="text-xs text-text-secondary"><span className="font-medium text-text-primary capitalize">{k.replace(/([A-Z])/g, ' $1')}: </span>{v}</p>
                ))}
              </div>
            )}
            {editingUser.instagram && <p className="text-xs text-text-secondary">Instagram: <span className="text-[#6C5DD3]">{editingUser.instagram}</span></p>}
            {editingUser.aboutMe && <p className="text-xs text-text-secondary italic">{editingUser.aboutMe}</p>}
          </div>
        </Modal>
      )}
    </div>
  );
};
