import React, { useState } from 'react';
import { AppConfig, Module, UserProgress, Material, Stream, CalendarEvent, ArenaScenario, AppNotification, Lesson, UserRole, HomeworkType, AIProviderId } from '../types';
import { Button } from './Button';
import { telegram } from '../services/telegramService';

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
  activeSubTab: 'OVERVIEW' | 'COURSE' | 'MATERIALS' | 'STREAMS' | 'USERS' | 'SETTINGS' | 'ARENA' | 'NEURAL_CORE';
  onSendBroadcast: (notif: AppNotification) => void;
  notifications: AppNotification[];
  onClearNotifications: () => void;
  addToast: (type: 'success' | 'error' | 'info', message: string, link?: string) => void;
}

// Markdown Helper Component
const MarkdownToolbar = ({ onInsert }: { onInsert: (tag: string, placeholder?: string) => void }) => (
    <div className="flex gap-2 mb-2 overflow-x-auto no-scrollbar pb-1">
        <button onClick={() => onInsert('**', 'bold')} className="px-2 py-1 bg-white/5 rounded text-[10px] hover:bg-white/10 border border-white/5 font-bold">B</button>
        <button onClick={() => onInsert('*', 'italic')} className="px-2 py-1 bg-white/5 rounded text-[10px] hover:bg-white/10 border border-white/5 italic">I</button>
        <button onClick={() => onInsert('\n# ', 'Header')} className="px-2 py-1 bg-white/5 rounded text-[10px] hover:bg-white/10 border border-white/5">H1</button>
        <button onClick={() => onInsert('\n## ', 'Header')} className="px-2 py-1 bg-white/5 rounded text-[10px] hover:bg-white/10 border border-white/5">H2</button>
        <button onClick={() => onInsert('[', 'Link](url)')} className="px-2 py-1 bg-white/5 rounded text-[10px] hover:bg-white/10 border border-white/5">🔗</button>
        <button onClick={() => onInsert('\n- ', 'List Item')} className="px-2 py-1 bg-white/5 rounded text-[10px] hover:bg-white/10 border border-white/5">List</button>
        <button onClick={() => onInsert('`', 'code')} className="px-2 py-1 bg-white/5 rounded text-[10px] hover:bg-white/10 border border-white/5 font-mono">Code</button>
    </div>
);

const StatCard = ({ icon, label, value }: { icon: string; label: string; value: number | string }) => (
  <div className="bg-surface border border-border-color p-5 rounded-[2rem] flex items-center gap-4 shadow-sm hover:border-[#6C5DD3] transition-colors group">
    <div className="w-12 h-12 rounded-2xl bg-body flex items-center justify-center text-2xl shadow-inner group-hover:scale-110 transition-transform">
      {icon}
    </div>
    <div>
      <h3 className="text-2xl font-black text-text-primary leading-none mb-1">{value}</h3>
      <p className="text-[10px] font-bold text-text-secondary uppercase tracking-widest">{label}</p>
    </div>
  </div>
);

export const AdminDashboard: React.FC<AdminDashboardProps> = ({ 
  config, onUpdateConfig, 
  modules, onUpdateModules, 
  scenarios, onUpdateScenarios,
  users, onUpdateUsers,
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
  
  // Airtable Config State
  const [airtableConfig, setAirtableConfig] = useState({
      pat: config.integrations.airtablePat || '',
      baseId: config.integrations.airtableBaseId || '',
      tableName: config.integrations.airtableTableName || 'Users'
  });

  // Course Editing State
  const [expandedModuleId, setExpandedModuleId] = useState<string | null>(null);
  const [editingLessonState, setEditingLessonState] = useState<{ moduleId: string, lesson: Lesson } | null>(null);

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

  const handleDeleteModule = (id: string, e: React.MouseEvent) => {
      e.stopPropagation();
      if (confirm('Удалить модуль?')) {
          onUpdateModules(modules.filter(m => m.id !== id));
          telegram.haptic('warning');
      }
  };

  const toggleUserRole = (user: UserProgress) => {
      // Prevent changing own role
      if (user.telegramId === currentUser.telegramId || user.name === currentUser.name) {
           addToast('error', 'Нельзя изменить роль самому себе');
           telegram.haptic('error');
           return;
      }

      const newRole: UserRole = user.role === 'ADMIN' ? 'STUDENT' : 'ADMIN';
      
      // Confirmation Dialog
      if (!window.confirm(`Вы уверены, что хотите назначить пользователю ${user.name} роль ${newRole}?`)) {
          return;
      }

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

  // --- COURSE EDITING HANDLERS ---
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

  const insertMarkdown = (tag: string, placeholder: string = '') => {
      if (!editingLessonState) return;
      const textarea = document.getElementById('lessonContentEditor') as HTMLTextAreaElement;
      if (!textarea) return;

      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const text = editingLessonState.lesson.content;
      const before = text.substring(0, start);
      const after = text.substring(end, text.length);
      const selection = text.substring(start, end);

      const newContent = before + tag + (selection || placeholder) + (tag.trim().length > 1 && !tag.startsWith('\n') ? tag : '') + after;
      
      setEditingLessonState({
          ...editingLessonState,
          lesson: { ...editingLessonState.lesson, content: newContent }
      });
      
      // Focus back after state update (simplified)
      setTimeout(() => textarea.focus(), 0);
  };

  // Filter Users
  const filteredUsers = users.filter(u => 
      u.name.toLowerCase().includes(userSearchTerm.toLowerCase()) || 
      u.role.toLowerCase().includes(userSearchTerm.toLowerCase()) ||
      u.telegramUsername?.toLowerCase().includes(userSearchTerm.toLowerCase())
  );

  return (
    <div className="min-h-screen pb-40 pt-[calc(var(--safe-top)+20px)] px-6 space-y-8 animate-fade-in bg-body">
        
        {/* HEADER */}
        <div className="flex justify-between items-center">
            <div>
                <span className="text-[#6C5DD3] text-[10px] font-black uppercase tracking-[0.3em] mb-1 block">Command Center</span>
                <h1 className="text-3xl font-black text-text-primary tracking-tighter leading-none">ПАНЕЛЬ<br/><span className="opacity-30">АДМИНА</span></h1>
            </div>
            <div className="w-14 h-14 bg-[#6C5DD3]/10 text-[#6C5DD3] rounded-[2rem] flex items-center justify-center text-2xl border border-[#6C5DD3]/20 shadow-inner">
                🛠️
            </div>
        </div>

        {/* --- VIEW: OVERVIEW --- */}
        {activeSubTab === 'OVERVIEW' && (
            <div className="space-y-6 animate-slide-up">
                <div className="grid grid-cols-2 gap-4">
                    <StatCard icon="👥" label="Бойцов" value={users.length} />
                    <StatCard icon="📦" label="Модулей" value={modules.length} />
                    <StatCard icon="⚔️" label="Сценариев" value={scenarios.length} />
                    <StatCard icon="🔔" label="Уведомлений" value={notifications.length} />
                </div>
                
                <div className="bg-surface border border-border-color p-6 rounded-[2.5rem] shadow-sm space-y-4">
                    <h3 className="font-black text-xs uppercase tracking-widest text-[#6C5DD3] flex items-center gap-2">
                        <span className="animate-pulse">📡</span> Системное Оповещение
                    </h3>
                    <input value={notifTitle} onChange={e => setNotifTitle(e.target.value)} className="w-full bg-body border border-border-color p-4 rounded-2xl text-sm font-bold outline-none focus:border-[#6C5DD3] transition-all" placeholder="Заголовок" />
                    <textarea value={notifMsg} onChange={e => setNotifMsg(e.target.value)} className="w-full bg-body border border-border-color p-4 rounded-2xl text-sm h-24 resize-none outline-none focus:border-[#6C5DD3] transition-all" placeholder="Текст сообщения..." />
                    <div className="flex gap-2">
                        {['INFO', 'SUCCESS', 'WARNING', 'ALERT'].map(t => (
                            <button key={t} onClick={() => { setNotifType(t as any); telegram.haptic('selection'); }} className={`flex-1 py-2 rounded-xl text-[8px] font-black uppercase border transition-all ${notifType === t ? 'bg-[#6C5DD3] text-white border-[#6C5DD3]' : 'border-border-color text-text-secondary'}`}>{t}</button>
                        ))}
                    </div>
                    <Button onClick={sendNotif} fullWidth className="!rounded-2xl !py-4">ОТПРАВИТЬ ВСЕМ</Button>
                </div>
            </div>
        )}

        {/* --- VIEW: NEURAL CORE (AI) --- */}
        {activeSubTab === 'NEURAL_CORE' && (
            <div className="space-y-6 animate-slide-up">
                <div className="bg-[#1F2128] border border-white/10 p-6 rounded-[2.5rem] relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-purple-500/20 rounded-full blur-[40px]"></div>
                    <div className="flex items-center gap-3 mb-6 relative z-10">
                         <div className="w-10 h-10 rounded-full bg-purple-500/20 flex items-center justify-center text-purple-400 border border-purple-500/30">🧠</div>
                         <div>
                             <h3 className="text-white font-bold">Системный Промпт</h3>
                             <p className="text-white/40 text-xs">Личность Командира</p>
                         </div>
                    </div>
                    <textarea 
                        value={systemInstruction}
                        onChange={(e) => setSystemInstruction(e.target.value)}
                        className="w-full h-48 bg-black/30 border border-white/10 rounded-2xl p-4 text-white/90 text-sm leading-relaxed font-mono outline-none focus:border-purple-500 transition-colors resize-none mb-4"
                        placeholder="Ты — Командир элитного отряда..."
                    />
                </div>

                <div className="bg-surface border border-border-color p-6 rounded-[2.5rem]">
                    <h3 className="font-bold text-text-primary mb-4">Настройки Провайдера</h3>
                    
                    {/* Provider Selector */}
                    <div className="space-y-4 mb-6">
                        <label className="text-[10px] font-black uppercase text-text-secondary tracking-widest">Основная Модель</label>
                        <div className="grid grid-cols-2 gap-2">
                            {['GOOGLE_GEMINI', 'OPENAI_GPT4', 'GROQ', 'OPENROUTER'].map((p) => (
                                <button
                                    key={p}
                                    onClick={() => setSelectedProvider(p as AIProviderId)}
                                    className={`py-3 px-2 rounded-xl text-[9px] font-black uppercase border transition-all ${selectedProvider === p ? 'bg-[#6C5DD3] text-white border-[#6C5DD3]' : 'border-border-color text-text-secondary hover:bg-white/5'}`}
                                >
                                    {p.replace('_', ' ')}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* API Keys */}
                    <div className="space-y-4">
                        <label className="text-[10px] font-black uppercase text-text-secondary tracking-widest">API Ключи (Скрыто)</label>
                        
                        <div className="space-y-2">
                            <input 
                                type="password"
                                value={apiKeys.google || ''}
                                onChange={(e) => setApiKeys({...apiKeys, google: e.target.value})}
                                placeholder="Google Gemini API Key"
                                className="w-full bg-body border border-border-color p-3 rounded-xl text-xs font-mono outline-none focus:border-[#6C5DD3]"
                            />
                            <input 
                                type="password"
                                value={apiKeys.groq || ''}
                                onChange={(e) => setApiKeys({...apiKeys, groq: e.target.value})}
                                placeholder="Groq API Key"
                                className="w-full bg-body border border-border-color p-3 rounded-xl text-xs font-mono outline-none focus:border-[#6C5DD3]"
                            />
                            <input 
                                type="password"
                                value={apiKeys.openai || ''}
                                onChange={(e) => setApiKeys({...apiKeys, openai: e.target.value})}
                                placeholder="OpenAI API Key"
                                className="w-full bg-body border border-border-color p-3 rounded-xl text-xs font-mono outline-none focus:border-[#6C5DD3]"
                            />
                            <input 
                                type="password"
                                value={apiKeys.openrouter || ''}
                                onChange={(e) => setApiKeys({...apiKeys, openrouter: e.target.value})}
                                placeholder="OpenRouter API Key"
                                className="w-full bg-body border border-border-color p-3 rounded-xl text-xs font-mono outline-none focus:border-[#6C5DD3]"
                            />
                        </div>
                    </div>

                    <Button onClick={handleSaveAIConfig} fullWidth className="!mt-6 !bg-[#6C5DD3]">Сохранить Конфигурацию</Button>
                </div>
            </div>
        )}

        {/* --- VIEW: COURSE --- */}
        {activeSubTab === 'COURSE' && (
             <div className="space-y-4 animate-slide-up">
                 {modules.map((mod, i) => {
                     const isExpanded = expandedModuleId === mod.id;
                     return (
                         <div key={mod.id} className="bg-surface border border-border-color rounded-[2rem] overflow-hidden transition-all duration-300">
                             <div 
                                className="p-5 flex items-center gap-4 group cursor-pointer"
                                onClick={() => setExpandedModuleId(isExpanded ? null : mod.id)}
                             >
                                 <div className="w-12 h-12 rounded-2xl bg-body flex items-center justify-center font-black text-text-secondary text-sm border border-border-color">
                                     {i + 1}
                                 </div>
                                 <div className="flex-1 min-w-0">
                                     <h4 className="font-bold text-text-primary truncate">{mod.title}</h4>
                                     <p className="text-xs text-text-secondary">{mod.lessons.length} уроков</p>
                                 </div>
                                 <div className="flex gap-2">
                                    <button onClick={(e) => handleDeleteModule(mod.id, e)} className="w-10 h-10 rounded-full bg-red-500/10 text-red-500 flex items-center justify-center hover:bg-red-500 hover:text-white transition-all">
                                        🗑️
                                    </button>
                                    <button className={`w-10 h-10 rounded-full flex items-center justify-center transition-transform ${isExpanded ? 'rotate-180 bg-body' : 'bg-body'}`}>
                                        ▼
                                    </button>
                                 </div>
                             </div>
                             
                             {/* Lesson List within Module */}
                             {isExpanded && (
                                 <div className="bg-body/50 border-t border-border-color p-4 space-y-2">
                                     {mod.lessons.map((lesson, idx) => (
                                         <div key={lesson.id} className="flex items-center justify-between p-3 bg-surface rounded-xl border border-border-color">
                                             <div className="flex items-center gap-3 overflow-hidden">
                                                 <span className="text-[10px] font-black text-text-secondary w-4">{idx + 1}</span>
                                                 <span className="text-xs font-bold text-text-primary truncate">{lesson.title}</span>
                                             </div>
                                             <button 
                                                onClick={() => setEditingLessonState({ moduleId: mod.id, lesson })}
                                                className="px-3 py-1 bg-[#6C5DD3]/10 text-[#6C5DD3] rounded-lg text-[10px] font-black uppercase hover:bg-[#6C5DD3] hover:text-white transition-colors"
                                             >
                                                Edit
                                             </button>
                                         </div>
                                     ))}
                                     <div className="text-center pt-2">
                                         <button className="text-[10px] font-bold text-text-secondary hover:text-[#6C5DD3] uppercase tracking-widest">
                                             + Добавить урок
                                         </button>
                                     </div>
                                 </div>
                             )}
                         </div>
                     );
                 })}
                 <button className="w-full py-4 border-2 border-dashed border-border-color rounded-[2rem] text-text-secondary font-black uppercase text-xs hover:border-[#6C5DD3] hover:text-[#6C5DD3] transition-all">
                     + Добавить Модуль
                 </button>
             </div>
        )}

        {/* --- MODAL: EDIT LESSON --- */}
        {editingLessonState && (
            <div className="fixed inset-0 z-[200] bg-black/80 backdrop-blur-sm flex items-end sm:items-center justify-center sm:p-6">
                <div className="bg-[#1F2128] w-full sm:max-w-lg h-[90vh] sm:h-[85vh] rounded-t-[2.5rem] sm:rounded-[2.5rem] border border-white/10 flex flex-col shadow-2xl animate-slide-up">
                    <div className="p-6 border-b border-white/10 flex justify-between items-center bg-[#14161B] rounded-t-[2.5rem]">
                        <h3 className="text-lg font-black text-white">Редактор Урока</h3>
                        <button onClick={() => setEditingLessonState(null)} className="text-white/40 hover:text-white">✕</button>
                    </div>
                    
                    <div className="flex-1 overflow-y-auto p-6 space-y-5 custom-scrollbar">
                        {/* ... (Existing fields) ... */}
                    </div>

                    <div className="p-6 border-t border-white/10 bg-[#14161B] rounded-b-[2.5rem]">
                        <Button onClick={handleSaveLesson} fullWidth className="!bg-[#6C5DD3] hover:!bg-[#5b4eb5]">
                            СОХРАНИТЬ ИЗМЕНЕНИЯ
                        </Button>
                    </div>
                </div>
            </div>
        )}

        {/* --- VIEW: USERS --- */}
        {activeSubTab === 'USERS' && (
             <div className="space-y-4 animate-slide-up">
                 <input 
                    type="text" 
                    placeholder="Поиск по имени, роли или telegram..." 
                    value={userSearchTerm}
                    onChange={(e) => setUserSearchTerm(e.target.value)}
                    className="w-full bg-surface border border-border-color p-4 rounded-2xl text-sm outline-none focus:border-[#6C5DD3]"
                 />
                 
                 {filteredUsers.length === 0 && <p className="text-center text-text-secondary text-xs uppercase pt-4">Пользователи не найдены</p>}

                 {filteredUsers.map((user) => {
                     const isCurrentUser = user.telegramId === currentUser.telegramId || user.name === currentUser.name;
                     return (
                     <div key={user.telegramId || user.name} className={`bg-surface border border-border-color p-5 rounded-[2rem] flex items-center gap-4 ${isCurrentUser ? 'ring-2 ring-[#6C5DD3]/20 bg-[#6C5DD3]/5' : ''}`}>
                         <img src={user.avatarUrl || `https://ui-avatars.com/api/?name=${user.name}`} className="w-10 h-10 rounded-full object-cover bg-body" />
                         <div className="flex-1 min-w-0">
                             <h4 className="font-bold text-text-primary truncate flex items-center gap-2">
                                 {user.name}
                                 {isCurrentUser && <span className="text-[8px] bg-[#6C5DD3] text-white px-1.5 py-0.5 rounded uppercase tracking-widest">Вы</span>}
                             </h4>
                             <p className="text-[10px] font-black text-text-secondary uppercase">{user.role} • LVL {user.level}</p>
                         </div>
                         <button 
                            onClick={() => toggleUserRole(user)}
                            disabled={isCurrentUser}
                            className={`px-3 py-1 rounded-lg text-[9px] font-black uppercase border transition-all ${user.role === 'ADMIN' ? 'bg-[#6C5DD3] text-white border-transparent' : 'border-border-color text-text-secondary'} ${isCurrentUser ? 'opacity-50 cursor-not-allowed' : 'hover:scale-105 active:scale-95'}`}
                         >
                             {user.role}
                         </button>
                     </div>
                 )})}
             </div>
        )}

        {/* --- VIEW: ARENA --- */}
        {activeSubTab === 'ARENA' && (
             <div className="space-y-4 animate-slide-up">
                 {scenarios.map((sc, i) => (
                     <div key={sc.id} className="bg-surface border border-border-color p-5 rounded-[2rem] relative overflow-hidden">
                         <div className={`absolute top-0 left-0 w-1 h-full ${sc.difficulty === 'Hard' ? 'bg-red-500' : sc.difficulty === 'Medium' ? 'bg-orange-500' : 'bg-green-500'}`}></div>
                         <div className="flex justify-between items-start mb-2 pl-3">
                             <h4 className="font-bold text-text-primary">{sc.title}</h4>
                             <span className="text-[9px] font-black uppercase text-text-secondary bg-body px-2 py-1 rounded-lg">{sc.difficulty}</span>
                         </div>
                         <p className="text-xs text-text-secondary pl-3 line-clamp-2">{sc.objective}</p>
                     </div>
                 ))}
                 <button className="w-full py-4 bg-[#6C5DD3] text-white rounded-[2rem] font-black uppercase text-xs shadow-lg shadow-[#6C5DD3]/20">
                     Создать Симуляцию
                 </button>
             </div>
        )}
        
        {/* --- VIEW: SETTINGS --- */}
        {activeSubTab === 'SETTINGS' && (
             <div className="space-y-6 animate-slide-up">
                 <div className="bg-surface border border-border-color p-6 rounded-[2.5rem]">
                     <h3 className="font-bold text-text-primary mb-6">Конфигурация Приложения</h3>
                     
                     <div className="space-y-4 mb-6">
                         <div className="space-y-1">
                             <label className="text-[10px] font-black uppercase text-text-secondary tracking-widest">Название Проекта</label>
                             <input 
                                 value={config.appName}
                                 onChange={(e) => onUpdateConfig({...config, appName: e.target.value})}
                                 className="w-full bg-body border border-border-color p-3 rounded-xl text-xs font-bold outline-none focus:border-[#6C5DD3]"
                             />
                         </div>
                         <div className="space-y-1">
                             <label className="text-[10px] font-black uppercase text-text-secondary tracking-widest">Основной Цвет</label>
                             <div className="flex gap-2">
                                <input 
                                    type="color"
                                    value={config.primaryColor}
                                    onChange={(e) => onUpdateConfig({...config, primaryColor: e.target.value})}
                                    className="w-10 h-10 rounded-xl border-0 p-0 overflow-hidden cursor-pointer"
                                />
                                <input 
                                    value={config.primaryColor}
                                    onChange={(e) => onUpdateConfig({...config, primaryColor: e.target.value})}
                                    className="flex-1 bg-body border border-border-color p-3 rounded-xl text-xs font-mono outline-none focus:border-[#6C5DD3]"
                                />
                             </div>
                         </div>
                         {/* Welcome Video Config */}
                         <div className="space-y-1">
                             <label className="text-[10px] font-black uppercase text-text-secondary tracking-widest">Welcome Video URL</label>
                             <input 
                                 value={config.welcomeVideoUrl || ''}
                                 onChange={(e) => onUpdateConfig({...config, welcomeVideoUrl: e.target.value})}
                                 className="w-full bg-body border border-border-color p-3 rounded-xl text-xs font-mono outline-none focus:border-[#6C5DD3]"
                                 placeholder="https://youtube.com/..."
                             />
                         </div>
                         <div className="space-y-1">
                             <label className="text-[10px] font-black uppercase text-text-secondary tracking-widest">Welcome Message</label>
                             <textarea 
                                 value={config.welcomeMessage || ''}
                                 onChange={(e) => onUpdateConfig({...config, welcomeMessage: e.target.value})}
                                 className="w-full bg-body border border-border-color p-3 rounded-xl text-xs font-medium outline-none focus:border-[#6C5DD3] h-20 resize-none"
                                 placeholder="Приветствие для новичков..."
                             />
                         </div>
                     </div>
                     
                     {/* AIRTABLE CONFIG */}
                     <div className="space-y-4 mb-6 pt-6 border-t border-border-color">
                         <h4 className="text-xs font-black uppercase text-[#6C5DD3]">Airtable Sync (Optional)</h4>
                         
                         <div className="space-y-1">
                             <label className="text-[10px] font-black uppercase text-text-secondary tracking-widest">Base ID</label>
                             <input 
                                 value={airtableConfig.baseId}
                                 onChange={(e) => setAirtableConfig({...airtableConfig, baseId: e.target.value})}
                                 className="w-full bg-body border border-border-color p-3 rounded-xl text-xs font-mono outline-none focus:border-[#6C5DD3]"
                                 placeholder="app..."
                             />
                         </div>
                         <div className="space-y-1">
                             <label className="text-[10px] font-black uppercase text-text-secondary tracking-widest">Table Name</label>
                             <input 
                                 value={airtableConfig.tableName}
                                 onChange={(e) => setAirtableConfig({...airtableConfig, tableName: e.target.value})}
                                 className="w-full bg-body border border-border-color p-3 rounded-xl text-xs font-mono outline-none focus:border-[#6C5DD3]"
                                 placeholder="Users"
                             />
                         </div>
                         <div className="space-y-1">
                             <label className="text-[10px] font-black uppercase text-text-secondary tracking-widest">Personal Access Token</label>
                             <input 
                                 type="password"
                                 value={airtableConfig.pat}
                                 onChange={(e) => setAirtableConfig({...airtableConfig, pat: e.target.value})}
                                 className="w-full bg-body border border-border-color p-3 rounded-xl text-xs font-mono outline-none focus:border-[#6C5DD3]"
                                 placeholder="pat..."
                             />
                         </div>
                         <Button onClick={handleSaveAirtableConfig} fullWidth variant="secondary" className="!mt-2 !py-3">Сохранить Airtable</Button>
                     </div>

                     <div className="space-y-4">
                         <div className="flex items-center justify-between">
                             <div>
                                 <p className="font-bold text-sm">Технические работы</p>
                                 <p className="text-[10px] text-text-secondary">Блокирует доступ студентам</p>
                             </div>
                             <button 
                                onClick={() => toggleFeature('maintenanceMode')}
                                className={`w-12 h-7 rounded-full transition-colors relative ${config.features.maintenanceMode ? 'bg-[#6C5DD3]' : 'bg-gray-700'}`}
                             >
                                 <div className={`absolute top-1 w-5 h-5 bg-white rounded-full transition-transform ${config.features.maintenanceMode ? 'left-6' : 'left-1'}`}></div>
                             </button>
                         </div>

                         <div className="flex items-center justify-between">
                             <div>
                                 <p className="font-bold text-sm">Авто-проверка ДЗ</p>
                                 <p className="text-[10px] text-text-secondary">ИИ принимает решения без куратора</p>
                             </div>
                             <button 
                                onClick={() => toggleFeature('autoApproveHomework')}
                                className={`w-12 h-7 rounded-full transition-colors relative ${config.features.autoApproveHomework ? 'bg-[#6C5DD3]' : 'bg-gray-700'}`}
                             >
                                 <div className={`absolute top-1 w-5 h-5 bg-white rounded-full transition-transform ${config.features.autoApproveHomework ? 'left-6' : 'left-1'}`}></div>
                             </button>
                         </div>

                         <div className="flex items-center justify-between">
                             <div>
                                 <p className="font-bold text-sm">Публичный Рейтинг</p>
                                 <p className="text-[10px] text-text-secondary">Показывать ТОП-3 всем</p>
                             </div>
                             <button 
                                onClick={() => toggleFeature('publicLeaderboard')}
                                className={`w-12 h-7 rounded-full transition-colors relative ${config.features.publicLeaderboard ? 'bg-[#6C5DD3]' : 'bg-gray-700'}`}
                             >
                                 <div className={`absolute top-1 w-5 h-5 bg-white rounded-full transition-transform ${config.features.publicLeaderboard ? 'left-6' : 'left-1'}`}></div>
                             </button>
                         </div>
                     </div>
                 </div>

                 <div className="text-center">
                     <p className="text-[10px] text-text-secondary uppercase tracking-widest mb-2">Версия системы: 5.0.0</p>
                     <p className="text-[10px] text-text-secondary uppercase tracking-widest">Database: Neon PostgreSQL</p>
                 </div>
             </div>
        )}
    </div>
  );
};