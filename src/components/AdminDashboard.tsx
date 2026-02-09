
import React, { useState } from 'react';
import { AppConfig, Module, UserProgress, Material, Stream, CalendarEvent, ArenaScenario, AppNotification, Lesson, UserRole, HomeworkType, AIProviderId, EventType } from '../types';
import { Button } from './Button';
import { telegram } from '../services/telegramService';
import { Logger } from '../services/logger';
import { Avatar } from '../utils/avatar';

interface AdminDashboardProps {
  config: AppConfig;
  onUpdateConfig: (newConfig: AppConfig) => void;
  modules: Module[];
  onUpdateModules: (newModules: Module[]) => void;
  materials: Material[];
  onUpdateMaterials: (newMaterials: Material[]) => void;
  streams: Stream[];
  onUpdateStreams: (newStreams: Stream[]) => void;
  events: CalendarEvent[];
  onUpdateEvents: (newEvents: CalendarEvent[]) => void;
  scenarios: ArenaScenario[];
  onUpdateScenarios: (newScenarios: ArenaScenario[]) => void;
  users: UserProgress[];
  onUpdateUsers: (newUsers: UserProgress[]) => void;
  currentUser: UserProgress;
  activeSubTab: 'OVERVIEW' | 'COURSE' | 'MATERIALS' | 'STREAMS' | 'USERS' | 'SETTINGS' | 'ARENA' | 'CALENDAR';
  onSendBroadcast: (notif: AppNotification) => void;
  notifications: AppNotification[];
  onClearNotifications: () => void;
  addToast: (type: 'success' | 'error' | 'info', message: string, link?: string) => void;
}

// Markdown Helper Component
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

const StatCard = ({ icon, label, value }: { icon: string; label: string; value: number | string }) => (
  <div className="bg-surface border border-border-color p-5 rounded-2xl flex items-center gap-4 shadow-sm hover:border-[#6C5DD3] transition-colors group">
    <div className="w-12 h-12 rounded-2xl bg-body flex items-center justify-center text-2xl shadow-sm group-hover:scale-110 transition-transform">
      {icon}
    </div>
    <div>
      <h3 className="text-2xl font-bold text-text-primary leading-none mb-1">{value}</h3>
      <p className="text-[10px] font-bold text-text-secondary uppercase tracking-wide">{label}</p>
    </div>
  </div>
);

// Helper to extract youtube thumb for preview
const getYouTubeThumbnail = (url?: string) => {
    if (!url) return null;
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
    const match = url.match(regExp);
    return (match && match[2].length === 11) 
      ? `https://img.youtube.com/vi/${match[2]}/mqdefault.jpg` 
      : null;
};

// Helper for date inputs to handle Date objects safely
const getISOString = (date: Date | string | undefined) => {
    if (!date) return '';
    return date instanceof Date ? date.toISOString() : date;
};

export const AdminDashboard: React.FC<AdminDashboardProps> = ({ 
  config, onUpdateConfig, 
  modules, onUpdateModules, 
  scenarios, onUpdateScenarios,
  users, onUpdateUsers,
  streams, onUpdateStreams,
  events, onUpdateEvents,
  currentUser,
  activeSubTab, onSendBroadcast, notifications, addToast
}) => {

  // --- LOCAL STATE FOR UI ---
  const [notifTitle, setNotifTitle] = useState('');
  const [notifMsg, setNotifMsg] = useState('');
  const [notifType, setNotifType] = useState<AppNotification['type']>('INFO');
  const [userSearchTerm, setUserSearchTerm] = useState('');
  
  // AI Config State
  const [systemInstruction, setSystemInstruction] = useState(config.systemInstruction);
  const [selectedProvider, setSelectedProvider] = useState<AIProviderId>(config.aiConfig?.activeProvider || 'GOOGLE_GEMINI');
  const [apiKeys, setApiKeys] = useState(config.aiConfig?.apiKeys || {});
  
  // Welcome Screen Config State
  const [welcomeConfig, setWelcomeConfig] = useState({
      videoUrl: config.welcomeVideoUrl || '',
      message: config.welcomeMessage || ''
  });

  // Airtable Config State
  const [airtableConfig, setAirtableConfig] = useState({
      pat: config.integrations.airtablePat || '',
      baseId: config.integrations.airtableBaseId || '',
      tableName: config.integrations.airtableTableName || 'Users'
  });

  // Course Editing State
  const [expandedModuleId, setExpandedModuleId] = useState<string | null>(null);
  const [editingLessonState, setEditingLessonState] = useState<{ moduleId: string, lesson: Lesson } | null>(null);

  // Arena Editing State
  const [editingScenario, setEditingScenario] = useState<Partial<ArenaScenario> | null>(null);

  // Streams/Events Editing State
  const [editingStream, setEditingStream] = useState<Partial<Stream> | null>(null);
  const [editingEvent, setEditingEvent] = useState<Partial<CalendarEvent> | null>(null);

  const sendNotif = () => {
      if(!notifTitle || !notifMsg) return;
      telegram.haptic('success');
      onSendBroadcast({
          id: Date.now().toString(),
          title: notifTitle,
          message: notifMsg,
          type: notifType,
          date: new Date().toISOString(),
          targetRole: 'ALL'
      });
      setNotifTitle('');
      setNotifMsg('');
      addToast('success', 'Отправлено');
  };

  const handleClearLogs = () => {
      Logger.clear();
      telegram.haptic('success');
      addToast('info', 'Логи очищены');
  };

  const handleSaveAIConfig = () => {
      onUpdateConfig({ 
          ...config, 
          systemInstruction,
          aiConfig: {
              ...config.aiConfig,
              activeProvider: selectedProvider,
              apiKeys: { ...config.aiConfig.apiKeys, ...apiKeys }
          }
      });
      telegram.haptic('success');
      addToast('success', 'Конфигурация ИИ сохранена');
  };

  const handleSaveWelcomeConfig = () => {
      onUpdateConfig({
          ...config,
          welcomeVideoUrl: welcomeConfig.videoUrl,
          welcomeMessage: welcomeConfig.message
      });
      telegram.haptic('success');
      addToast('success', 'Экран приветствия обновлен');
  };
  
  const handleSaveAirtableConfig = () => {
      onUpdateConfig({
          ...config,
          integrations: {
              ...config.integrations,
              airtablePat: airtableConfig.pat,
              airtableBaseId: airtableConfig.baseId,
              airtableTableName: airtableConfig.tableName
          }
      });
      telegram.haptic('success');
      addToast('success', 'Настройки Airtable обновлены');
  };

  const handleUpdateModuleDetails = (moduleId: string, updates: Partial<Module>) => {
      const updatedModules = modules.map(m => m.id === moduleId ? { ...m, ...updates } : m);
      onUpdateModules(updatedModules);
  };

  // --- ARENA CRUD ---
  const saveScenario = () => {
      if (!editingScenario?.title || !editingScenario.clientRole) return;
      
      const newSc = {
          id: editingScenario.id || Date.now().toString(),
          title: editingScenario.title,
          difficulty: editingScenario.difficulty || 'Easy',
          clientRole: editingScenario.clientRole,
          objective: editingScenario.objective || '',
          initialMessage: editingScenario.initialMessage || ''
      } as ArenaScenario;

      if (editingScenario.id) {
          onUpdateScenarios(scenarios.map(s => s.id === newSc.id ? newSc : s));
      } else {
          onUpdateScenarios([...scenarios, newSc]);
      }
      setEditingScenario(null);
      addToast('success', 'Сценарий сохранен');
  };

  const deleteScenario = (id: string) => {
      if(confirm('Удалить сценарий?')) {
          onUpdateScenarios(scenarios.filter(s => s.id !== id));
      }
  };

  // --- STREAMS CRUD ---
  const saveStream = () => {
      if (!editingStream?.title) return;
      const newSt = {
          id: editingStream.id || Date.now().toString(),
          title: editingStream.title,
          date: editingStream.date || new Date().toISOString(),
          youtubeUrl: editingStream.youtubeUrl || '',
          status: editingStream.status || 'UPCOMING'
      } as Stream;

      if (editingStream.id) {
          onUpdateStreams(streams.map(s => s.id === newSt.id ? newSt : s));
      } else {
          onUpdateStreams([...streams, newSt]);
      }
      setEditingStream(null);
      addToast('success', 'Эфир сохранен');
  };

  const deleteStream = (id: string) => {
      if(confirm('Удалить эфир?')) {
          onUpdateStreams(streams.filter(s => s.id !== id));
      }
  };

  // --- EVENTS CRUD ---
  const saveEvent = () => {
      if (!editingEvent?.title) return;
      const newEv = {
          id: editingEvent.id || Date.now().toString(),
          title: editingEvent.title,
          description: editingEvent.description || '',
          date: editingEvent.date || new Date().toISOString(),
          type: editingEvent.type || EventType.OTHER,
          durationMinutes: editingEvent.durationMinutes || 60
      } as CalendarEvent;

      if (editingEvent.id) {
          onUpdateEvents(events.map(e => e.id === newEv.id ? newEv : e));
      } else {
          onUpdateEvents([...events, newEv]);
      }
      setEditingEvent(null);
      addToast('success', 'Событие сохранено');
  };

  const deleteEvent = (id: string) => {
      if(confirm('Удалить событие?')) {
          onUpdateEvents(events.filter(e => e.id !== id));
      }
  };

  const toggleUserRole = (user: UserProgress) => {
      if (user.telegramId === currentUser.telegramId || user.name === currentUser.name) {
           addToast('error', 'Нельзя изменить роль самому себе');
           telegram.haptic('error');
           return;
      }
      const newRole: UserRole = user.role === 'ADMIN' ? 'STUDENT' : 'ADMIN';
      if (!window.confirm(`Вы уверены, что хотите назначить пользователю ${user.name} роль ${newRole}?`)) return;
      const updatedUsers = users.map(u => (u.telegramId === user.telegramId && u.name === user.name) ? { ...u, role: newRole } : u);
      onUpdateUsers(updatedUsers);
      telegram.haptic('selection');
      addToast('info', `Роль ${user.name} изменена на ${newRole}`);
  };
  
  const toggleFeature = (key: keyof AppConfig['features']) => {
      onUpdateConfig({
          ...config,
          features: {
              ...config.features,
              [key]: !config.features[key]
          }
      });
      telegram.haptic('medium');
  };

  const handleSaveLesson = () => {
      if (!editingLessonState) return;
      const updatedModules = modules.map(m => {
          if (m.id === editingLessonState.moduleId) {
              return {
                  ...m,
                  lessons: m.lessons.map(l => l.id === editingLessonState.lesson.id ? editingLessonState.lesson : l)
              };
          }
          return m;
      });
      onUpdateModules(updatedModules);
      setEditingLessonState(null);
      telegram.haptic('success');
      addToast('success', 'Урок сохранен');
  };

  // Filter Users (Fixed potential crash with undefined name/role)
  const filteredUsers = users.filter(u => 
      (u.name || '').toLowerCase().includes(userSearchTerm.toLowerCase()) || 
      (u.role || '').toLowerCase().includes(userSearchTerm.toLowerCase()) ||
      u.telegramUsername?.toLowerCase().includes(userSearchTerm.toLowerCase())
  );

  return (
    <div className="min-h-screen pb-40 pt-[calc(var(--safe-top)+20px)] px-6 space-y-8 animate-fade-in bg-body">
        {/* HEADER */}
        <div className="flex justify-between items-center">
            <div>
                <span className="text-[#6C5DD3] text-[10px] font-bold uppercase tracking-wide mb-1 block">Command Center</span>
                <h1 className="text-2xl font-bold text-text-primary leading-none">ПАНЕЛЬ<br/><span className="opacity-30">АДМИНА</span></h1>
            </div>
            <div className="w-14 h-14 bg-[#6C5DD3]/10 text-[#6C5DD3] rounded-2xl flex items-center justify-center text-2xl border border-[#6C5DD3]/20 shadow-sm">
                🛠️
            </div>
        </div>

        {/* --- VIEW: OVERVIEW --- */}
        {activeSubTab === 'OVERVIEW' && (
            <div className="space-y-6 animate-slide-up">
                {/* Stats */}
                <div className="grid grid-cols-2 gap-4">
                    <StatCard icon="👥" label="Бойцов" value={users.length} />
                    <StatCard icon="📦" label="Модулей" value={modules.length} />
                    <StatCard icon="⚔️" label="Сценариев" value={scenarios.length} />
                    <StatCard icon="🔔" label="Уведомлений" value={notifications.length} />
                </div>
                
                <div className="flex gap-4">
                    <button onClick={handleClearLogs} className="flex-1 py-4 rounded-[1.5rem] bg-card border border-border-color text-text-secondary text-xs font-medium hover:bg-surface active:scale-95 transition-all flex items-center justify-center gap-2">
                        <span>🗑️</span> Очистить Логи
                    </button>
                </div>

                <div className="bg-surface border border-border-color p-6 rounded-2xl shadow-sm space-y-4">
                    <h3 className="font-bold text-xs uppercase tracking-wide text-[#6C5DD3] flex items-center gap-2">
                        <span className="animate-pulse">📡</span> Системное Оповещение
                    </h3>
                    <input value={notifTitle} onChange={e => setNotifTitle(e.target.value)} className="w-full bg-body border border-border-color p-4 rounded-2xl text-sm font-bold outline-none focus:border-[#6C5DD3] transition-all" placeholder="Заголовок" />
                    <textarea value={notifMsg} onChange={e => setNotifMsg(e.target.value)} className="w-full bg-body border border-border-color p-4 rounded-2xl text-sm h-24 resize-none outline-none focus:border-[#6C5DD3] transition-all" placeholder="Текст сообщения..." />
                    <div className="flex gap-2">
                        {['INFO', 'SUCCESS', 'WARNING', 'ALERT'].map(t => (
                            <button key={t} onClick={() => { setNotifType(t as any); telegram.haptic('selection'); }} className={`flex-1 py-2 rounded-xl text-[8px] font-bold uppercase border transition-all ${notifType === t ? 'bg-[#6C5DD3] text-white border-[#6C5DD3]' : 'border-border-color text-text-secondary'}`}>{t}</button>
                        ))}
                    </div>
                    <Button onClick={sendNotif} fullWidth className="!rounded-2xl !py-4">ОТПРАВИТЬ ВСЕМ</Button>
                </div>
            </div>
        )}

        {/* --- VIEW: ARENA --- */}
        {activeSubTab === 'ARENA' && (
             <div className="space-y-4 animate-slide-up">
                 {scenarios.map((sc) => (
                     <div key={sc.id} className="bg-surface border border-border-color p-5 rounded-2xl relative overflow-hidden group">
                         <div className={`absolute top-0 left-0 w-1 h-full ${sc.difficulty === 'Hard' ? 'bg-red-500' : sc.difficulty === 'Medium' ? 'bg-orange-500' : 'bg-green-500'}`}></div>
                         <div className="flex justify-between items-start mb-2 pl-3">
                             <h4 className="font-bold text-text-primary">{sc.title}</h4>
                             <div className="flex gap-2">
                                <span className="text-[9px] font-bold uppercase text-text-secondary bg-body px-2 py-1 rounded-lg">{sc.difficulty}</span>
                                <button onClick={() => setEditingScenario(sc)} className="text-sm">✎</button>
                                <button onClick={() => deleteScenario(sc.id)} className="text-sm text-red-500">✕</button>
                             </div>
                         </div>
                         <p className="text-xs text-text-secondary pl-3 line-clamp-2">{sc.objective}</p>
                     </div>
                 ))}
                 
                 <div className="bg-surface border border-border-color p-6 rounded-2xl space-y-4 mt-6">
                     <h3 className="font-bold uppercase text-xs tracking-wide">{editingScenario?.id ? 'Редактировать' : 'Новый Сценарий'}</h3>
                     <input value={editingScenario?.title || ''} onChange={e => setEditingScenario({...editingScenario, title: e.target.value})} placeholder="Название" className="w-full bg-body p-3 rounded-xl text-sm border border-border-color outline-none focus:border-[#6C5DD3]" />
                     <div className="grid grid-cols-2 gap-2">
                         <select value={editingScenario?.difficulty || 'Easy'} onChange={e => setEditingScenario({...editingScenario, difficulty: e.target.value as any})} className="bg-body p-3 rounded-xl text-sm border border-border-color outline-none">
                             <option value="Easy">Easy</option>
                             <option value="Medium">Medium</option>
                             <option value="Hard">Hard</option>
                         </select>
                         <input value={editingScenario?.clientRole || ''} onChange={e => setEditingScenario({...editingScenario, clientRole: e.target.value})} placeholder="Роль клиента (Скептик)" className="bg-body p-3 rounded-xl text-sm border border-border-color outline-none" />
                     </div>
                     <textarea value={editingScenario?.objective || ''} onChange={e => setEditingScenario({...editingScenario, objective: e.target.value})} placeholder="Цель..." className="w-full bg-body p-3 rounded-xl text-sm border border-border-color outline-none h-20" />
                     <textarea value={editingScenario?.initialMessage || ''} onChange={e => setEditingScenario({...editingScenario, initialMessage: e.target.value})} placeholder="Первая фраза клиента..." className="w-full bg-body p-3 rounded-xl text-sm border border-border-color outline-none h-20" />
                     
                     <div className="flex gap-2">
                         <Button onClick={saveScenario} fullWidth className="!rounded-xl">{editingScenario?.id ? 'Обновить' : 'Создать'}</Button>
                         {editingScenario && <button onClick={() => setEditingScenario(null)} className="px-4 rounded-xl border border-border-color">✕</button>}
                     </div>
                 </div>
             </div>
        )}

        {/* --- VIEW: STREAMS & EVENTS --- */}
        {(activeSubTab === 'STREAMS' || activeSubTab === 'CALENDAR') && (
            <div className="space-y-8 animate-slide-up">
                {/* Streams Section */}
                <div className="space-y-4">
                    <h3 className="text-xs font-bold uppercase tracking-wide text-[#6C5DD3]">Эфиры (Streams)</h3>
                    {streams.map(s => (
                        <div key={s.id} className="bg-surface border border-border-color p-4 rounded-2xl flex items-center justify-between">
                            <div className="flex-1">
                                <h4 className="font-bold text-sm text-text-primary">{s.title}</h4>
                                <p className="text-[10px] text-text-secondary">{new Date(s.date).toLocaleString()} • {s.status}</p>
                            </div>
                            <div className="flex gap-2">
                                <button onClick={() => setEditingStream(s)} className="text-sm p-2 hover:bg-body rounded-lg">✎</button>
                                <button onClick={() => deleteStream(s.id)} className="text-sm text-red-500 p-2 hover:bg-red-500/10 rounded-lg">✕</button>
                            </div>
                        </div>
                    ))}
                    
                    {/* Add/Edit Stream */}
                    <div className="bg-surface border border-border-color p-4 rounded-2xl space-y-3">
                        <input value={editingStream?.title || ''} onChange={e => setEditingStream({...editingStream, title: e.target.value})} placeholder="Название эфира" className="w-full bg-body p-3 rounded-xl text-sm border border-border-color outline-none" />
                        <div className="flex gap-2">
                            <input type="datetime-local" value={getISOString(editingStream?.date).substring(0, 16)} onChange={e => setEditingStream({...editingStream, date: e.target.value})} className="bg-body p-3 rounded-xl text-sm border border-border-color outline-none flex-1" />
                            <select value={editingStream?.status || 'UPCOMING'} onChange={e => setEditingStream({...editingStream, status: e.target.value as any})} className="bg-body p-3 rounded-xl text-sm border border-border-color outline-none">
                                <option value="UPCOMING">Upcoming</option>
                                <option value="LIVE">Live</option>
                                <option value="PAST">Past</option>
                            </select>
                        </div>
                        <input value={editingStream?.youtubeUrl || ''} onChange={e => setEditingStream({...editingStream, youtubeUrl: e.target.value})} placeholder="YouTube URL" className="w-full bg-body p-3 rounded-xl text-sm border border-border-color outline-none" />
                        <div className="flex gap-2">
                            <Button onClick={saveStream} fullWidth className="!rounded-xl !py-3">Сохранить Эфир</Button>
                            {editingStream && <button onClick={() => setEditingStream(null)} className="px-4 rounded-xl border border-border-color">✕</button>}
                        </div>
                    </div>
                </div>

                {/* Events Section */}
                <div className="space-y-4 pt-6 border-t border-border-color">
                    <h3 className="text-xs font-bold uppercase tracking-wide text-[#6C5DD3]">Календарь (Events)</h3>
                    {events.map(ev => (
                        <div key={ev.id} className="bg-surface border border-border-color p-4 rounded-2xl flex items-center justify-between">
                            <div className="flex-1">
                                <h4 className="font-bold text-sm text-text-primary">{ev.title}</h4>
                                <p className="text-[10px] text-text-secondary">{new Date(ev.date).toLocaleDateString()} • {ev.type}</p>
                            </div>
                            <div className="flex gap-2">
                                <button onClick={() => setEditingEvent(ev)} className="text-sm p-2 hover:bg-body rounded-lg">✎</button>
                                <button onClick={() => deleteEvent(ev.id)} className="text-sm text-red-500 p-2 hover:bg-red-500/10 rounded-lg">✕</button>
                            </div>
                        </div>
                    ))}

                    {/* Add/Edit Event */}
                    <div className="bg-surface border border-border-color p-4 rounded-2xl space-y-3">
                        <input value={editingEvent?.title || ''} onChange={e => setEditingEvent({...editingEvent, title: e.target.value})} placeholder="Название события" className="w-full bg-body p-3 rounded-xl text-sm border border-border-color outline-none" />
                        <textarea value={editingEvent?.description || ''} onChange={e => setEditingEvent({...editingEvent, description: e.target.value})} placeholder="Описание" className="w-full bg-body p-3 rounded-xl text-sm border border-border-color outline-none h-16 resize-none" />
                        <div className="flex gap-2">
                            <input type="datetime-local" value={getISOString(editingEvent?.date).substring(0, 16)} onChange={e => setEditingEvent({...editingEvent, date: e.target.value})} className="bg-body p-3 rounded-xl text-sm border border-border-color outline-none flex-1" />
                            <select value={editingEvent?.type || EventType.OTHER} onChange={e => setEditingEvent({...editingEvent, type: e.target.value as any})} className="bg-body p-3 rounded-xl text-sm border border-border-color outline-none">
                                <option value={EventType.WEBINAR}>Webinar</option>
                                <option value={EventType.HOMEWORK}>Homework</option>
                                <option value={EventType.OTHER}>Other</option>
                            </select>
                        </div>
                        <div className="flex gap-2">
                            <Button onClick={saveEvent} fullWidth className="!rounded-xl !py-3">Сохранить Событие</Button>
                            {editingEvent && <button onClick={() => setEditingEvent(null)} className="px-4 rounded-xl border border-border-color">✕</button>}
                        </div>
                    </div>
                </div>
            </div>
        )}

        {/* --- VIEW: COURSE --- */}
        {activeSubTab === 'COURSE' && (
             <div className="space-y-3 animate-slide-up">
                 {modules.map((mod, i) => {
                     const isExpanded = expandedModuleId === mod.id;
                     const previewThumb = mod.imageUrl || getYouTubeThumbnail(mod.videoUrl);
                     const completedCount = mod.lessons.filter(l => currentUser.completedLessonIds?.includes(l.id)).length;
                     const progress = mod.lessons.length > 0 ? Math.round((completedCount / mod.lessons.length) * 100) : 0;

                     return (
                         <div key={mod.id} className="bg-surface border border-border-color rounded-2xl overflow-hidden transition-all duration-300">
                             {/* Module Header */}
                             <div
                                className="p-4 flex items-center gap-3 cursor-pointer active:bg-body/50 transition-colors"
                                onClick={() => setExpandedModuleId(isExpanded ? null : mod.id)}
                             >
                                 <div className="w-11 h-11 rounded-xl bg-body flex items-center justify-center font-bold text-text-secondary text-sm border border-border-color overflow-hidden flex-shrink-0">
                                     {previewThumb ? <img src={previewThumb} className="w-full h-full object-cover" /> : (i + 1)}
                                 </div>
                                 <div className="flex-1 min-w-0">
                                     <h4 className="font-bold text-text-primary text-sm truncate">{mod.title}</h4>
                                     <div className="flex items-center gap-2 mt-0.5">
                                         <span className="text-[10px] text-text-secondary">{mod.lessons.length} уроков</span>
                                         <span className="text-[10px] text-text-secondary">•</span>
                                         <span className="text-[10px] text-[#6C5DD3] font-medium">{mod.category}</span>
                                         {progress > 0 && <span className="text-[10px] text-[#34C759] font-medium">{progress}%</span>}
                                     </div>
                                 </div>
                                 <svg className={`w-4 h-4 text-text-secondary transition-transform duration-300 flex-shrink-0 ${isExpanded ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                             </div>

                             {/* Expanded: Module Editor + Lessons */}
                             <div className={`transition-all duration-300 overflow-hidden ${isExpanded ? 'max-h-[3000px] opacity-100' : 'max-h-0 opacity-0'}`}>
                                 <div className="border-t border-border-color p-4 space-y-4 bg-body/30">
                                     {/* Module fields */}
                                     <div className="grid gap-2">
                                         <input value={mod.title} onChange={(e) => handleUpdateModuleDetails(mod.id, { title: e.target.value })} className="w-full bg-body border border-border-color p-3 rounded-xl text-sm font-bold text-text-primary outline-none focus:border-[#6C5DD3]" placeholder="Название модуля" />
                                         <textarea value={mod.description} onChange={(e) => handleUpdateModuleDetails(mod.id, { description: e.target.value })} className="w-full bg-body border border-border-color p-3 rounded-xl text-xs text-text-primary outline-none focus:border-[#6C5DD3] h-14 resize-none" placeholder="Описание" />
                                         <div className="grid grid-cols-2 gap-2">
                                             <input value={mod.imageUrl || ''} onChange={(e) => handleUpdateModuleDetails(mod.id, { imageUrl: e.target.value })} className="w-full bg-body border border-border-color p-3 rounded-xl text-xs font-mono text-text-secondary outline-none focus:border-[#6C5DD3]" placeholder="Image URL" />
                                             <input value={mod.videoUrl || ''} onChange={(e) => handleUpdateModuleDetails(mod.id, { videoUrl: e.target.value })} className="w-full bg-body border border-border-color p-3 rounded-xl text-xs font-mono text-text-secondary outline-none focus:border-[#6C5DD3]" placeholder="Video URL" />
                                         </div>
                                     </div>

                                     {/* Lessons list */}
                                     <div className="space-y-1.5">
                                         <h5 className="text-[10px] font-bold uppercase tracking-wide text-text-secondary ml-1">Уроки ({mod.lessons.length})</h5>
                                         {mod.lessons.map((lesson, idx) => {
                                             const isLessonDone = currentUser.completedLessonIds?.includes(lesson.id);
                                             return (
                                                 <div key={lesson.id} className={`flex items-center gap-3 p-3 rounded-xl border transition-all ${isLessonDone ? 'bg-[#34C759]/5 border-[#34C759]/20' : 'bg-surface border-border-color'}`}>
                                                     <div className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold flex-shrink-0 ${isLessonDone ? 'bg-[#34C759] text-white' : 'bg-body text-text-secondary border border-border-color'}`}>
                                                         {isLessonDone ? '✓' : (idx + 1)}
                                                     </div>
                                                     <div className="flex-1 min-w-0">
                                                         <h4 className="text-xs font-semibold text-text-primary truncate">{lesson.title}</h4>
                                                         <div className="flex items-center gap-2 mt-0.5">
                                                             <span className="text-[9px] text-text-secondary">+{lesson.xpReward} XP</span>
                                                             <span className="text-[9px] text-text-secondary">{lesson.homeworkType}</span>
                                                             {lesson.videoUrl && <span className="text-[9px] text-text-secondary">🎥</span>}
                                                         </div>
                                                     </div>
                                                     <button
                                                         onClick={() => setEditingLessonState({ moduleId: mod.id, lesson })}
                                                         className="px-3 py-1.5 rounded-lg bg-[#6C5DD3]/10 text-[#6C5DD3] text-[10px] font-bold uppercase active:scale-95 transition-transform"
                                                     >
                                                         Edit
                                                     </button>
                                                 </div>
                                             );
                                         })}
                                     </div>
                                 </div>
                             </div>
                         </div>
                     );
                 })}
             </div>
        )}

        {/* --- VIEW: USERS (User Management) --- */}
        {activeSubTab === 'USERS' && (
            <div className="space-y-4 animate-slide-up">
                <input 
                    value={userSearchTerm}
                    onChange={e => setUserSearchTerm(e.target.value)}
                    placeholder="Поиск бойца..."
                    className="w-full bg-surface border border-border-color p-4 rounded-2xl text-sm outline-none focus:border-[#6C5DD3] transition-all"
                />
                {filteredUsers.map(user => (
                    <div key={user.telegramId} className="bg-surface border border-border-color p-4 rounded-2xl flex items-center justify-between group">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-body overflow-hidden">
                                <Avatar src={user.avatarUrl} name={user.name} size="w-full h-full" />
                            </div>
                            <div>
                                <h4 className="font-bold text-text-primary text-sm">{user.name}</h4>
                                <div className="flex gap-2 items-center">
                                    <span className="text-[9px] font-bold text-text-secondary uppercase">{user.role}</span>
                                    <span className="text-[9px] text-text-secondary">XP: {user.xp}</span>
                                </div>
                            </div>
                        </div>
                        <button onClick={() => toggleUserRole(user)} className="px-3 py-1.5 rounded-lg bg-body text-[9px] font-bold uppercase border border-border-color hover:border-[#6C5DD3] transition-colors">
                            {user.role === 'ADMIN' ? 'Demote' : 'Promote'}
                        </button>
                    </div>
                ))}
            </div>
        )}

        {/* --- VIEW: SETTINGS (Config) --- */}
        {activeSubTab === 'SETTINGS' && (
            <div className="space-y-6 animate-slide-up">
                {/* Feature Toggles */}
                <div className="bg-surface border border-border-color p-6 rounded-2xl space-y-4">
                    <h3 className="font-bold text-xs uppercase tracking-wide text-[#6C5DD3]">Системные Настройки</h3>
                    {Object.entries(config.features).map(([key, value]) => (
                        <div key={key} className="flex items-center justify-between">
                            <span className="text-sm font-bold text-text-primary capitalize">{key.replace(/([A-Z])/g, ' $1')}</span>
                            <button 
                                onClick={() => toggleFeature(key as any)}
                                className={`w-12 h-6 rounded-full p-1 transition-colors ${value ? 'bg-[#6C5DD3]' : 'bg-body border border-border-color'}`}
                            >
                                <div className={`w-4 h-4 bg-surface rounded-full shadow-sm transform transition-transform ${value ? 'translate-x-6' : ''}`} />
                            </button>
                        </div>
                    ))}
                </div>

                {/* Welcome Screen Config */}
                <div className="bg-surface border border-border-color p-6 rounded-2xl space-y-4">
                    <h3 className="font-bold text-xs uppercase tracking-wide text-[#6C5DD3] flex items-center gap-2">
                        <span>👋</span> Экран Приветствия (Welcome)
                    </h3>
                    <div className="space-y-2">
                        <label className="text-[9px] font-bold text-text-secondary uppercase ml-2">Ссылка на видео (YouTube/MP4)</label>
                        <input 
                            value={welcomeConfig.videoUrl}
                            onChange={e => setWelcomeConfig({...welcomeConfig, videoUrl: e.target.value})}
                            placeholder="https://youtube.com/..."
                            className="w-full bg-body p-3 rounded-xl text-sm border border-border-color outline-none font-mono text-[#6C5DD3]"
                        />
                    </div>
                    <div className="space-y-2">
                        <label className="text-[9px] font-bold text-text-secondary uppercase ml-2">Приветственное сообщение</label>
                        <textarea 
                            value={welcomeConfig.message}
                            onChange={e => setWelcomeConfig({...welcomeConfig, message: e.target.value})}
                            placeholder="Текст под видео..."
                            className="w-full bg-body p-3 rounded-xl text-sm border border-border-color outline-none h-24 resize-none"
                        />
                    </div>
                    <Button onClick={handleSaveWelcomeConfig} fullWidth className="!rounded-xl">Сохранить Экран</Button>
                </div>

                {/* AI Configuration */}
                <div className="bg-surface border border-border-color p-6 rounded-2xl space-y-4">
                    <h3 className="font-bold text-xs uppercase tracking-wide text-[#6C5DD3]">AI Configuration</h3>
                    <select 
                        value={selectedProvider} 
                        onChange={e => setSelectedProvider(e.target.value as AIProviderId)}
                        className="w-full bg-body p-3 rounded-xl text-sm border border-border-color outline-none"
                    >
                        <option value="GOOGLE_GEMINI">Google Gemini</option>
                        <option value="OPENAI_GPT4">OpenAI GPT-4</option>
                        <option value="ANTHROPIC_CLAUDE">Anthropic Claude</option>
                        <option value="GROQ">Groq (Llama 3)</option>
                        <option value="OPENROUTER">OpenRouter</option>
                    </select>
                    
                    <div className="space-y-2">
                        <input 
                            type="password"
                            value={apiKeys.google || ''}
                            onChange={e => setApiKeys({...apiKeys, google: e.target.value})}
                            placeholder="Google Gemini API Key"
                            className="w-full bg-body p-3 rounded-xl text-xs border border-border-color outline-none"
                        />
                        <input 
                            type="password"
                            value={apiKeys.openai || ''}
                            onChange={e => setApiKeys({...apiKeys, openai: e.target.value})}
                            placeholder="OpenAI API Key"
                            className="w-full bg-body p-3 rounded-xl text-xs border border-border-color outline-none"
                        />
                        <input 
                            type="password"
                            value={apiKeys.groq || ''}
                            onChange={e => setApiKeys({...apiKeys, groq: e.target.value})}
                            placeholder="Groq API Key"
                            className="w-full bg-body p-3 rounded-xl text-xs border border-border-color outline-none"
                        />
                        <input 
                            type="password"
                            value={apiKeys.openrouter || ''}
                            onChange={e => setApiKeys({...apiKeys, openrouter: e.target.value})}
                            placeholder="OpenRouter API Key"
                            className="w-full bg-body p-3 rounded-xl text-xs border border-border-color outline-none"
                        />
                    </div>

                    <textarea 
                        value={systemInstruction}
                        onChange={e => setSystemInstruction(e.target.value)}
                        className="w-full bg-body p-3 rounded-xl text-xs border border-border-color outline-none h-24 resize-none"
                        placeholder="System Instruction..."
                    />
                    
                    <Button onClick={handleSaveAIConfig} fullWidth className="!rounded-xl">Сохранить AI Config</Button>
                </div>

                {/* Airtable Configuration */}
                <div className="bg-surface border border-border-color p-6 rounded-2xl space-y-4">
                    <h3 className="font-bold text-xs uppercase tracking-wide text-[#6C5DD3] flex items-center gap-2">
                        <span>📊</span> CRM Integration (Airtable)
                    </h3>
                    <div className="space-y-2">
                        <input 
                            type="password"
                            value={airtableConfig.pat}
                            onChange={e => setAirtableConfig({...airtableConfig, pat: e.target.value})}
                            placeholder="Personal Access Token (PAT)"
                            className="w-full bg-body p-3 rounded-xl text-xs border border-border-color outline-none font-mono"
                        />
                        <input 
                            value={airtableConfig.baseId}
                            onChange={e => setAirtableConfig({...airtableConfig, baseId: e.target.value})}
                            placeholder="Base ID (app...)"
                            className="w-full bg-body p-3 rounded-xl text-xs border border-border-color outline-none font-mono"
                        />
                        <input 
                            value={airtableConfig.tableName}
                            onChange={e => setAirtableConfig({...airtableConfig, tableName: e.target.value})}
                            placeholder="Table Name (e.g. Users)"
                            className="w-full bg-body p-3 rounded-xl text-xs border border-border-color outline-none"
                        />
                    </div>
                    <Button onClick={handleSaveAirtableConfig} fullWidth className="!rounded-xl">Сохранить CRM</Button>
                </div>
            </div>
        )}
    </div>
  );
};
