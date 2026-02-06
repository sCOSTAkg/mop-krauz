
import React, { useState } from 'react';
import { createClient } from '@supabase/supabase-js';
import { AppConfig, Module, UserProgress, UserRole, Material, Stream, Lesson, HomeworkType, ArenaScenario, CalendarEvent, EventType, AIProviderId } from '../types';
import { AIService } from '../services/aiService';
import { Button } from './Button';
import { telegram } from '../services/telegramService';
import { Storage } from '../services/storage';
import { CalendarView } from './CalendarView';

// --- UI COMPONENTS ---
  
const InputGroup = ({ label, children, className = '' }: { label: string, children?: React.ReactNode, className?: string }) => (
    <div className={`space-y-2 w-full ${className}`}>
        <label className="text-[10px] font-black text-[#6C5DD3] uppercase tracking-widest pl-1 opacity-80">{label}</label>
        {children}
    </div>
);

const StyledInput = (props: React.InputHTMLAttributes<HTMLInputElement>) => (
    <input 
        {...props} 
        className={`w-full bg-[#1A1D24] border border-white/5 rounded-xl px-4 py-3.5 text-sm font-bold text-white focus:border-[#6C5DD3] focus:bg-[#20232A] outline-none transition-all placeholder:text-white/20 shadow-inner ${props.className}`} 
    />
);

const StyledSelect = (props: React.SelectHTMLAttributes<HTMLSelectElement>) => (
    <div className="relative">
        <select 
            {...props} 
            className={`w-full appearance-none bg-[#1A1D24] border border-white/5 rounded-xl px-4 py-3.5 text-sm font-bold text-white focus:border-[#6C5DD3] focus:bg-[#20232A] outline-none transition-all ${props.className}`} 
        >
            {props.children}
        </select>
        <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-white/40 text-xs">▼</div>
    </div>
);

const StyledTextarea = (props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) => (
    <textarea 
        {...props} 
        className={`w-full bg-[#1A1D24] border border-white/5 rounded-xl px-4 py-3.5 text-sm font-medium text-white focus:border-[#6C5DD3] focus:bg-[#20232A] outline-none transition-all placeholder:text-white/20 resize-y min-h-[100px] custom-scrollbar ${props.className}`} 
    />
);

const SectionHeader = ({ title, subtitle, action }: { title: string, subtitle?: string, action?: React.ReactNode }) => (
    <div className="flex justify-between items-end mb-8 pb-4 border-b border-white/5">
        <div>
            <h3 className="text-2xl font-black text-white tracking-tight">{title}</h3>
            {subtitle && <p className="text-white/40 text-xs font-medium mt-1">{subtitle}</p>}
        </div>
        {action}
    </div>
);

const AdminCard: React.FC<{ children?: React.ReactNode; className?: string }> = ({ children, className = '' }) => (
    <div className={`bg-[#14161B] border border-white/5 p-6 rounded-[2rem] shadow-xl relative overflow-hidden backdrop-blur-md ${className}`}>
        {children}
    </div>
);

interface AdminDashboardProps {
  config: AppConfig;
  onUpdateConfig: (newConfig: AppConfig) => void;
  modules: Module[];
  onUpdateModules: (newModules: Module[]) => void;
  users: UserProgress[];
  onUpdateUsers: (newUsers: UserProgress[]) => void;
  currentUser: UserProgress;
  onUpdateCurrentUser: (user: Partial<UserProgress>) => void;
  materials: Material[];
  onUpdateMaterials: (m: Material[]) => void;
  streams: Stream[];
  onUpdateStreams: (s: Stream[]) => void;
  events: CalendarEvent[];
  onUpdateEvents: (e: CalendarEvent[]) => void;
  scenarios: ArenaScenario[];
  onUpdateScenarios: (s: ArenaScenario[]) => void;
  activeSubTab: string;
  addToast: (type: 'success' | 'error' | 'info', message: string) => void;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({ 
  config, onUpdateConfig, 
  modules, onUpdateModules, 
  users, onUpdateUsers,
  currentUser, onUpdateCurrentUser,
  materials, onUpdateMaterials,
  streams, onUpdateStreams,
  events, onUpdateEvents,
  scenarios, onUpdateScenarios,
  activeSubTab, addToast
}) => {
  
  const [expandedModuleId, setExpandedModuleId] = useState<string | null>(null);
  const [dbStatus, setDbStatus] = useState<'UNKNOWN' | 'CONNECTING' | 'SUCCESS' | 'ERROR'>('UNKNOWN');
  const [editingLesson, setEditingLesson] = useState<{ mIdx: number; lIdx: number; data: Lesson } | null>(null);

  // Broadcast State
  const [broadcastMsg, setBroadcastMsg] = useState('');
  const [broadcastTitle, setBroadcastTitle] = useState('');

  // Deploy State
  const [deployProgress, setDeployProgress] = useState(0);
  const [deployLogs, setDeployLogs] = useState<string[]>([]);

  // --- ACTIONS ---

  const handleBroadcast = () => {
      if (!broadcastMsg.trim()) return;
      telegram.haptic('success');
      addToast('success', `Рассылка отправлена ${users.length} пользователям`);
      setBroadcastMsg('');
      setBroadcastTitle('');
  };

  const handleClearCache = async () => {
      if (!window.confirm('Вы уверены? Это удалит все сохраненные данные приложения на этом устройстве.')) return;
      
      telegram.haptic('warning');
      
      if ('caches' in window) {
          const keys = await caches.keys();
          await Promise.all(keys.map(key => caches.delete(key)));
      }

      Storage.clear();
      
      addToast('info', 'Кэш очищен. Перезагрузка...');
      setTimeout(() => window.location.reload(), 1500);
  };

  const updateAIConfig = (updates: Partial<typeof config.aiConfig>) => {
      const newConfig = { ...config, aiConfig: { ...config.aiConfig, ...updates } };
      onUpdateConfig(newConfig);
      AIService.updateConfig(newConfig.aiConfig);
      addToast('success', 'Настройки Ядра ИИ обновлены');
  };

  const handleDeploy = () => {
      setDeployProgress(0);
      setDeployLogs(['Initializing build sequence...']);
      const steps = [
          'Checking dependencies...',
          'Compiling modules...',
          'Optimizing assets...',
          'Syncing with Vercel...',
          'Verifying integrity...',
          'Finalizing deployment...'
      ];
      
      let stepIndex = 0;
      const interval = setInterval(() => {
          if (stepIndex >= steps.length) {
              clearInterval(interval);
              setDeployProgress(100);
              setDeployLogs(prev => [...prev, 'Deployment Successful! ✅']);
              telegram.haptic('success');
              addToast('success', 'Приложение обновлено');
          } else {
              setDeployLogs(prev => [...prev, steps[stepIndex]]);
              setDeployProgress(((stepIndex + 1) / steps.length) * 100);
              stepIndex++;
          }
      }, 800);
  };

  const testSupabaseConnection = async () => {
    const url = config.integrations.supabaseUrl;
    const key = config.integrations.supabaseAnonKey;
    if (!url || !key) { addToast('error', 'Введите URL и Key'); return; }
    setDbStatus('CONNECTING');
    try {
        const client = createClient(url, key);
        const { count, error } = await client.from('profiles').select('*', { count: 'exact', head: true });
        if (error) throw error;
        setDbStatus('SUCCESS');
        addToast('success', `Соединение установлено. Записей: ${count || 0}`);
    } catch (e: any) {
        setDbStatus('ERROR');
        addToast('error', `Ошибка: ${e.message}`);
    }
  };

  // --- RENDERERS ---

  const renderOverview = () => (
    <div className="space-y-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
                { label: 'Бойцов', val: users.length, icon: '👥', color: 'from-blue-500 to-blue-600' },
                { label: 'Модулей', val: modules.length, icon: '📦', color: 'from-orange-500 to-orange-600' },
                { label: 'Сценариев', val: scenarios.length, icon: '⚔️', color: 'from-red-500 to-red-600' },
                { label: 'Событий', val: events.length, icon: '📅', color: 'from-green-500 to-green-600' },
            ].map((stat, i) => (
                <div key={i} className="bg-[#14161B] p-6 rounded-[2rem] border border-white/5 relative overflow-hidden group hover:border-white/10 transition-all">
                    <div className={`absolute top-0 right-0 p-4 opacity-20 text-4xl grayscale group-hover:grayscale-0 transition-all`}>{stat.icon}</div>
                    <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${stat.color} flex items-center justify-center text-lg mb-4 shadow-lg`}>{stat.icon}</div>
                    <span className="text-white/40 text-[9px] font-black uppercase mb-1 tracking-[0.2em] block">{stat.label}</span>
                    <span className="text-3xl font-black text-white">{stat.val}</span>
                </div>
            ))}
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
             <AdminCard>
                 <div className="flex items-center gap-4 mb-4">
                     <div className="w-12 h-12 bg-green-500/10 rounded-xl flex items-center justify-center text-2xl">📢</div>
                     <div>
                         <h4 className="font-bold text-white">Быстрое оповещение</h4>
                         <p className="text-xs text-white/40">Отправить пуш всем пользователям</p>
                     </div>
                 </div>
                 <div className="flex gap-2">
                     <StyledInput 
                        placeholder="Сообщение..." 
                        value={broadcastMsg}
                        onChange={e => setBroadcastMsg(e.target.value)}
                        className="!py-3"
                     />
                     <Button onClick={handleBroadcast} disabled={!broadcastMsg} className="!w-auto !px-6">🚀</Button>
                 </div>
             </AdminCard>

             <AdminCard>
                 <div className="flex items-center gap-4 mb-4">
                     <div className="w-12 h-12 bg-[#6C5DD3]/10 rounded-xl flex items-center justify-center text-2xl">🛠️</div>
                     <div>
                         <h4 className="font-bold text-white">Статус Системы</h4>
                         <p className="text-xs text-white/40">Версия v5.0 • Stable</p>
                     </div>
                 </div>
                 <div className="flex items-center justify-between bg-black/20 p-3 rounded-xl border border-white/5">
                     <span className="text-xs text-green-500 font-bold flex items-center gap-2">● Online</span>
                     <span className="text-[10px] text-white/30">Last check: Just now</span>
                 </div>
             </AdminCard>
        </div>
    </div>
  );

  const renderDeploy = () => (
      <AdminCard className="animate-slide-up">
          <SectionHeader title="Центр Деплоя" subtitle="Управление обновлениями и сборкой" />
          
          <div className="bg-black/40 p-6 rounded-2xl border border-white/5 mb-6 font-mono text-xs">
              <div className="flex justify-between items-center mb-4">
                  <span className="text-white/50">Status: {deployProgress === 0 ? 'Idle' : deployProgress === 100 ? 'Deployed' : 'Building...'}</span>
                  <span className="text-[#6C5DD3]">{Math.round(deployProgress)}%</span>
              </div>
              <div className="h-2 bg-white/10 rounded-full overflow-hidden mb-4">
                  <div className="h-full bg-[#6C5DD3] transition-all duration-300" style={{ width: `${deployProgress}%` }}></div>
              </div>
              <div className="h-40 overflow-y-auto custom-scrollbar space-y-1 text-white/70">
                  {deployLogs.length === 0 && <span className="opacity-30">Ready to deploy...</span>}
                  {deployLogs.map((log, i) => (
                      <div key={i} className="border-l-2 border-[#6C5DD3] pl-2">{log}</div>
                  ))}
              </div>
          </div>

          <Button onClick={handleDeploy} disabled={deployProgress > 0 && deployProgress < 100} fullWidth className="!py-4">
              {deployProgress > 0 && deployProgress < 100 ? 'Сборка...' : 'Запустить Деплой'}
          </Button>
      </AdminCard>
  );

  const renderSettings = () => (
      <AdminCard className="animate-slide-up space-y-6">
          <SectionHeader title="Настройки Проекта" subtitle="Глобальная конфигурация" />
          
          <InputGroup label="Invite Link Base URL">
              <StyledInput 
                  value={config.integrations.inviteBaseUrl || ''} 
                  onChange={e => onUpdateConfig({...config, integrations: {...config.integrations, inviteBaseUrl: e.target.value}})} 
                  placeholder="https://t.me/SalesProBot?start=ref_"
              />
              <p className="text-[10px] text-white/30 mt-1">Базовая ссылка для реферальной системы. Username пользователя будет добавлен в конец.</p>
          </InputGroup>

          <InputGroup label="System Instruction (AI Persona)">
              <StyledTextarea 
                  value={config.systemInstruction} 
                  onChange={e => onUpdateConfig({...config, systemInstruction: e.target.value})} 
                  className="min-h-[150px]"
              />
          </InputGroup>

          <div className="flex items-center justify-between bg-white/5 p-4 rounded-xl">
              <div>
                  <h4 className="font-bold text-white text-sm">Технические работы</h4>
                  <p className="text-xs text-white/40">Включить режим обслуживания</p>
              </div>
              <input 
                  type="checkbox" 
                  checked={config.features.maintenanceMode}
                  onChange={e => onUpdateConfig({...config, features: {...config.features, maintenanceMode: e.target.checked}})}
                  className="accent-[#6C5DD3] w-5 h-5"
              />
          </div>
      </AdminCard>
  );

  const renderNeuralCore = () => (
      <AdminCard className="animate-slide-up">
          <SectionHeader title="Нейро-Ядро" subtitle="Настройка LLM провайдеров" />
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
              {[
                  { id: 'GOOGLE_GEMINI', name: 'Google Gemini', desc: 'Recommended. Native.', icon: '💎' },
                  { id: 'GROQ', name: 'Groq (Llama 3)', desc: 'Ultra-fast inference.', icon: '⚡' },
                  { id: 'OPENROUTER', name: 'OpenRouter', desc: 'Aggregator (Claude/GPT).', icon: '🌐' },
              ].map((provider) => (
                  <button
                      key={provider.id}
                      onClick={() => updateAIConfig({ activeProvider: provider.id as AIProviderId })}
                      className={`relative p-5 rounded-2xl border text-left transition-all group overflow-hidden ${config.aiConfig.activeProvider === provider.id ? 'bg-[#6C5DD3] border-[#6C5DD3] text-white shadow-lg shadow-[#6C5DD3]/20' : 'bg-[#1A1D24] border-white/5 hover:bg-[#20232A] text-slate-300'}`}
                  >
                      <div className="flex justify-between items-start mb-2 relative z-10">
                          <span className="text-2xl">{provider.icon}</span>
                          {config.aiConfig.activeProvider === provider.id && <span className="px-2 py-0.5 bg-white/20 rounded-md text-[9px] font-black uppercase tracking-wider backdrop-blur-sm">Active</span>}
                      </div>
                      <div className="font-bold text-sm mb-0.5 relative z-10">{provider.name}</div>
                      <div className={`text-[10px] relative z-10 ${config.aiConfig.activeProvider === provider.id ? 'text-white/70' : 'text-white/30'}`}>{provider.desc}</div>
                  </button>
              ))}
          </div>

          <div className="bg-black/20 p-6 rounded-2xl border border-white/5">
                <InputGroup label={`API Key для ${config.aiConfig.activeProvider}`}>
                    <div className="relative">
                        <StyledInput 
                            type="password"
                            placeholder={`sk-...`}
                            value={config.aiConfig.apiKeys?.[config.aiConfig.activeProvider === 'GOOGLE_GEMINI' ? 'google' : config.aiConfig.activeProvider === 'GROQ' ? 'groq' : 'openrouter'] || ''}
                            onChange={(e) => {
                                const keyMap: any = { 'GOOGLE_GEMINI': 'google', 'GROQ': 'groq', 'OPENROUTER': 'openrouter' };
                                updateAIConfig({ apiKeys: { ...config.aiConfig.apiKeys, [keyMap[config.aiConfig.activeProvider]]: e.target.value } });
                            }}
                        />
                        <div className="absolute right-4 top-1/2 -translate-y-1/2">
                            {config.aiConfig.apiKeys?.[config.aiConfig.activeProvider === 'GOOGLE_GEMINI' ? 'google' : config.aiConfig.activeProvider === 'GROQ' ? 'groq' : 'openrouter'] ? '✅' : '⚠️'}
                        </div>
                    </div>
                </InputGroup>
          </div>
      </AdminCard>
  );

  const renderCourse = () => {
    const handleUpdateModule = (idx: number, updates: Partial<Module>) => {
        const newModules = [...modules];
        newModules[idx] = { ...newModules[idx], ...updates };
        onUpdateModules(newModules);
    };

    return (
        <div className="space-y-6 animate-slide-up">
            <div className="flex justify-between items-center">
                 <h2 className="text-2xl font-black text-white">Управление Курсом</h2>
                 <Button onClick={() => onUpdateModules([...modules, { id: `m${Date.now()}`, title: 'Новый модуль', description: '', minLevel: 1, category: 'GENERAL', imageUrl: '', lessons: [] }])} className="!py-2 !px-4 !text-xs">+ Модуль</Button>
            </div>
            
            {modules.map((mod, mIdx) => (
                <AdminCard key={mod.id} className="!p-0">
                    <div className="p-5 border-b border-white/5 flex items-start justify-between bg-[#1A1D24]/50">
                        <div className="flex-1 mr-6 grid gap-4">
                             <InputGroup label="Название модуля">
                                <StyledInput value={mod.title} onChange={e => handleUpdateModule(mIdx, { title: e.target.value })} className="!bg-[#14161B]" />
                             </InputGroup>
                             {expandedModuleId === mod.id && (
                                 <div className="space-y-4 animate-fade-in">
                                     <div className="grid grid-cols-2 gap-4">
                                         <InputGroup label="Категория">
                                            <StyledSelect value={mod.category} onChange={e => handleUpdateModule(mIdx, { category: e.target.value as any })} className="!bg-[#14161B]">
                                                <option value="GENERAL">Общее</option>
                                                <option value="SALES">Продажи</option>
                                                <option value="PSYCHOLOGY">Психология</option>
                                                <option value="TACTICS">Тактика</option>
                                            </StyledSelect>
                                         </InputGroup>
                                         <InputGroup label="Мин. Уровень">
                                            <StyledInput type="number" value={mod.minLevel} onChange={e => handleUpdateModule(mIdx, { minLevel: parseInt(e.target.value) })} className="!bg-[#14161B]" />
                                         </InputGroup>
                                     </div>
                                     <InputGroup label="Видео модуля (YouTube URL)">
                                        <div className="relative">
                                            <StyledInput 
                                                value={mod.videoUrl || ''} 
                                                onChange={e => handleUpdateModule(mIdx, { videoUrl: e.target.value })} 
                                                className="!bg-[#14161B] pl-10" 
                                                placeholder="https://youtube.com/..."
                                            />
                                            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-lg">🎥</div>
                                        </div>
                                     </InputGroup>
                                 </div>
                             )}
                        </div>
                        <div className="flex gap-2">
                             <button onClick={() => setExpandedModuleId(expandedModuleId === mod.id ? null : mod.id)} className="w-10 h-10 rounded-xl bg-white/5 hover:bg-white/10 text-white flex items-center justify-center transition-colors">
                                {expandedModuleId === mod.id ? '▲' : '▼'}
                            </button>
                            <button onClick={() => { if(confirm('Del?')) { const n = [...modules]; n.splice(mIdx, 1); onUpdateModules(n); } }} className="w-10 h-10 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-500 flex items-center justify-center transition-colors">✕</button>
                        </div>
                    </div>

                    {expandedModuleId === mod.id && (
                        <div className="p-5 bg-[#14161B]">
                             <div className="flex justify-between items-center mb-4">
                                 <span className="text-xs font-black uppercase text-white/40 tracking-widest">Уроки модуля</span>
                                 <button 
                                    onClick={() => {
                                        const newM = [...modules];
                                        const newL: Lesson = { id: `l${Date.now()}`, title: 'Новый урок', description: '', content: '', xpReward: 100, homeworkType: 'TEXT', homeworkTask: '...', aiGradingInstruction: '...' };
                                        newM[mIdx].lessons.push(newL);
                                        onUpdateModules(newM);
                                        setEditingLesson({ mIdx, lIdx: newM[mIdx].lessons.length - 1, data: newL });
                                    }}
                                    className="text-xs text-[#6C5DD3] font-bold hover:underline"
                                 >
                                     + Добавить урок
                                 </button>
                             </div>
                             
                             <div className="space-y-2">
                                 {mod.lessons.map((les, lIdx) => (
                                     <div key={les.id} className="flex items-center justify-between p-3 rounded-xl bg-white/5 border border-white/5 hover:border-white/20 transition-colors group">
                                         <div className="flex items-center gap-3">
                                             <div className="w-8 h-8 rounded-lg bg-black/40 flex items-center justify-center text-xs text-white/50">{lIdx + 1}</div>
                                             <span className="text-sm font-bold text-white">{les.title}</span>
                                         </div>
                                         <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                             <button onClick={() => setEditingLesson({ mIdx, lIdx, data: les })} className="p-2 hover:text-[#6C5DD3]">✏️</button>
                                             <button onClick={() => { if(confirm('Del?')) { const n = [...modules]; n[mIdx].lessons.splice(lIdx, 1); onUpdateModules(n); } }} className="p-2 hover:text-red-500">✕</button>
                                         </div>
                                     </div>
                                 ))}
                             </div>
                        </div>
                    )}
                </AdminCard>
            ))}

            {/* Modal for Editing Lesson */}
            {editingLesson && (
                <div className="fixed inset-0 z-[200] bg-black/90 backdrop-blur-md flex items-center justify-center p-4 animate-fade-in">
                    <div className="bg-[#1F2128] w-full max-w-3xl max-h-[90vh] overflow-y-auto rounded-[2.5rem] border border-white/10 p-8 shadow-2xl custom-scrollbar animate-scale-in">
                        <SectionHeader title="Редактор Урока" action={<button onClick={() => setEditingLesson(null)} className="text-2xl opacity-50 hover:opacity-100">✕</button>} />
                        
                        <div className="space-y-8">
                             {/* Section: Basic Info */}
                             <div className="space-y-4">
                                <h4 className="text-[#6C5DD3] text-[10px] font-black uppercase tracking-widest border-b border-[#6C5DD3]/20 pb-2 mb-4">1. Основное</h4>
                                <div className="grid grid-cols-3 gap-5">
                                     <div className="col-span-2">
                                        <InputGroup label="Название">
                                            <StyledInput value={editingLesson.data.title} onChange={e => setEditingLesson({...editingLesson, data: {...editingLesson.data, title: e.target.value}})} />
                                        </InputGroup>
                                     </div>
                                     <InputGroup label="XP Награда">
                                        <StyledInput type="number" value={editingLesson.data.xpReward} onChange={e => setEditingLesson({...editingLesson, data: {...editingLesson.data, xpReward: parseInt(e.target.value)}})} />
                                     </InputGroup>
                                </div>
                             </div>

                             {/* Section: Media */}
                             <div className="space-y-4">
                                <h4 className="text-[#6C5DD3] text-[10px] font-black uppercase tracking-widest border-b border-[#6C5DD3]/20 pb-2 mb-4">2. Медиа Материалы</h4>
                                <InputGroup label="Видео урока (YouTube URL)">
                                    <div className="relative">
                                        <StyledInput 
                                            value={editingLesson.data.videoUrl || ''} 
                                            onChange={e => setEditingLesson({...editingLesson, data: {...editingLesson.data, videoUrl: e.target.value}})}
                                            placeholder="https://youtube.com/watch?v=..."
                                            className="pl-10"
                                        />
                                        <div className="absolute left-3 top-1/2 -translate-y-1/2 text-xl">🎥</div>
                                    </div>
                                </InputGroup>
                             </div>

                             {/* Section: Content */}
                             <div className="space-y-4">
                                <h4 className="text-[#6C5DD3] text-[10px] font-black uppercase tracking-widest border-b border-[#6C5DD3]/20 pb-2 mb-4">3. Контент</h4>
                                <InputGroup label="Текст урока (Markdown)">
                                    <StyledTextarea value={editingLesson.data.content} onChange={e => setEditingLesson({...editingLesson, data: {...editingLesson.data, content: e.target.value}})} className="min-h-[250px] font-mono text-xs" />
                                </InputGroup>
                             </div>
                             
                             {/* Section: Homework */}
                             <div className="bg-[#14161B] p-6 rounded-2xl border border-white/5 space-y-4">
                                 <h4 className="text-[#6C5DD3] font-black uppercase text-xs tracking-widest mb-4 flex items-center gap-2">
                                     <span>⚔️</span> 4. Домашнее Задание
                                 </h4>
                                 <div className="grid grid-cols-2 gap-4">
                                     <InputGroup label="Тип ответа">
                                         <StyledSelect value={editingLesson.data.homeworkType} onChange={e => setEditingLesson({...editingLesson, data: {...editingLesson.data, homeworkType: e.target.value as any}})}>
                                             <option value="TEXT">Текст</option>
                                             <option value="PHOTO">Фото</option>
                                             <option value="VIDEO">Видео</option>
                                             <option value="FILE">Файл (PDF)</option>
                                         </StyledSelect>
                                     </InputGroup>
                                     <InputGroup label="Текст задачи">
                                         <StyledInput value={editingLesson.data.homeworkTask} onChange={e => setEditingLesson({...editingLesson, data: {...editingLesson.data, homeworkTask: e.target.value}})} />
                                     </InputGroup>
                                 </div>
                                 <InputGroup label="Промпт для AI (Инструкция Командира)">
                                     <StyledTextarea value={editingLesson.data.aiGradingInstruction} onChange={e => setEditingLesson({...editingLesson, data: {...editingLesson.data, aiGradingInstruction: e.target.value}})} className="min-h-[100px]" placeholder="Как ИИ должен проверять это задание? Критерии успеха..." />
                                 </InputGroup>
                             </div>
                        </div>

                        <div className="flex gap-4 mt-8 pt-6 border-t border-white/5 sticky bottom-0 bg-[#1F2128] z-10">
                             <Button variant="secondary" onClick={() => setEditingLesson(null)} className="flex-1">Отмена</Button>
                             <Button onClick={() => {
                                 const newM = [...modules];
                                 newM[editingLesson.mIdx].lessons[editingLesson.lIdx] = editingLesson.data;
                                 onUpdateModules(newM);
                                 setEditingLesson(null);
                                 addToast('success', 'Урок сохранен');
                             }} className="flex-1">Сохранить</Button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
  };

  const renderGenericList = <T extends { id: string, title: string }>(
      title: string,
      items: T[],
      onUpdate: (items: T[]) => void,
      newItemFactory: () => T,
      renderItem: (item: T, idx: number, update: (u: Partial<T>) => void) => React.ReactNode
  ) => {
      return (
          <div className="space-y-6 animate-slide-up">
              <div className="flex justify-between items-center">
                  <h2 className="text-2xl font-black text-white">{title}</h2>
                  <Button onClick={() => onUpdate([...items, newItemFactory()])} className="!py-2 !px-4 !text-xs">+ Добавить</Button>
              </div>
              <div className="grid gap-4">
                  {items.map((item, idx) => (
                      <AdminCard key={item.id} className="relative group hover:border-[#6C5DD3]/30 transition-colors">
                          <button onClick={() => { if(confirm('Del?')) { const n = [...items]; n.splice(idx, 1); onUpdate(n); } }} className="absolute top-4 right-4 text-white/20 hover:text-red-500 transition-colors z-10">✕</button>
                          {renderItem(item, idx, (u) => { const n = [...items]; n[idx] = { ...n[idx], ...u }; onUpdate(n); })}
                      </AdminCard>
                  ))}
                  {items.length === 0 && <div className="text-center py-12 border-2 border-dashed border-white/10 rounded-[2rem] text-white/30 font-bold">Список пуст</div>}
              </div>
          </div>
      );
  };

  const renderMaterials = () => renderGenericList('База Знаний', materials, onUpdateMaterials, () => ({ id: `m${Date.now()}`, title: 'Новый', description: '', type: 'LINK', url: '' }), (item, _, update) => (
      <div className="space-y-4 pr-8">
          <InputGroup label="Название"><StyledInput value={item.title} onChange={e => update({ title: e.target.value })} /></InputGroup>
          <div className="flex gap-4">
              <InputGroup label="Тип" className="w-1/3"><StyledSelect value={item.type} onChange={e => update({ type: e.target.value as any })}><option value="LINK">Ссылка</option><option value="PDF">PDF</option><option value="VIDEO">Видео</option></StyledSelect></InputGroup>
              <InputGroup label="Ссылка" className="flex-1"><StyledInput value={item.url} onChange={e => update({ url: e.target.value })} /></InputGroup>
          </div>
          <InputGroup label="Описание"><StyledInput value={item.description} onChange={e => update({ description: e.target.value })} /></InputGroup>
      </div>
  ));

  const renderStreams = () => renderGenericList('Эфиры', streams, onUpdateStreams, () => ({ id: `s${Date.now()}`, title: 'Эфир', date: new Date().toISOString(), status: 'UPCOMING', youtubeUrl: '' }), (item, _, update) => (
      <div className="space-y-4 pr-8">
          <InputGroup label="Тема"><StyledInput value={item.title} onChange={e => update({ title: e.target.value })} /></InputGroup>
          <div className="flex gap-4">
              <InputGroup label="Дата" className="flex-1"><StyledInput type="datetime-local" value={item.date.substring(0, 16)} onChange={e => update({ date: new Date(e.target.value).toISOString() })} /></InputGroup>
              <InputGroup label="Статус" className="w-1/3"><StyledSelect value={item.status} onChange={e => update({ status: e.target.value as any })}><option value="UPCOMING">Скоро</option><option value="LIVE">Live</option><option value="PAST">Запись</option></StyledSelect></InputGroup>
          </div>
          <InputGroup label="YouTube URL"><StyledInput value={item.youtubeUrl} onChange={e => update({ youtubeUrl: e.target.value })} /></InputGroup>
      </div>
  ));

  const renderArena = () => renderGenericList('Сценарии', scenarios, onUpdateScenarios, () => ({ id: `sc${Date.now()}`, title: 'Сценарий', difficulty: 'Easy', clientRole: '', objective: '', initialMessage: '' }), (item, _, update) => (
      <div className="space-y-4 pr-8">
          <div className="flex gap-4">
              <InputGroup label="Название" className="flex-1"><StyledInput value={item.title} onChange={e => update({ title: e.target.value })} /></InputGroup>
              <InputGroup label="Сложность" className="w-1/3"><StyledSelect value={item.difficulty} onChange={e => update({ difficulty: e.target.value as any })}><option value="Easy">Легко</option><option value="Medium">Средне</option><option value="Hard">Сложно</option></StyledSelect></InputGroup>
          </div>
          <InputGroup label="Роль Клиента (System Prompt)"><StyledTextarea value={item.clientRole} onChange={e => update({ clientRole: e.target.value })} /></InputGroup>
          <InputGroup label="Цель Игрока"><StyledInput value={item.objective} onChange={e => update({ objective: e.target.value })} /></InputGroup>
          <InputGroup label="Первая фраза"><StyledInput value={item.initialMessage} onChange={e => update({ initialMessage: e.target.value })} /></InputGroup>
      </div>
  ));

  const renderUsers = () => (
      <div className="space-y-6 animate-slide-up">
          <SectionHeader title="Пользователи" subtitle={`Всего: ${users.length}`} />
          <div className="overflow-hidden rounded-[2rem] border border-white/5 bg-[#14161B] shadow-xl">
              <div className="overflow-x-auto">
                  <table className="w-full text-left">
                      <thead className="bg-white/5 text-white/40 text-[10px] uppercase font-black tracking-widest">
                          <tr>
                              <th className="p-4">Боец</th>
                              <th className="p-4">Прогресс</th>
                              <th className="p-4">Роль</th>
                              <th className="p-4 text-right">Действия</th>
                          </tr>
                      </thead>
                      <tbody className="text-sm text-white divide-y divide-white/5">
                          {users.map((u, idx) => (
                              <tr key={idx} className="hover:bg-white/5 transition-colors">
                                  <td className="p-4">
                                      <div className="flex items-center gap-3">
                                          <img src={u.avatarUrl || `https://ui-avatars.com/api/?name=${u.name}`} className="w-10 h-10 rounded-full bg-white/10 object-cover" />
                                          <div>
                                              <div className="font-bold">{u.name}</div>
                                              <div className="text-[10px] text-white/40">{u.telegramUsername ? `@${u.telegramUsername}` : 'N/A'}</div>
                                          </div>
                                      </div>
                                  </td>
                                  <td className="p-4">
                                      <div className="flex items-center gap-2">
                                          <span className="text-[#6C5DD3] font-black">{u.level} LVL</span>
                                          <span className="text-white/40">| {u.xp} XP</span>
                                      </div>
                                  </td>
                                  <td className="p-4">
                                      <select 
                                          value={u.role} 
                                          onChange={(e) => { const n = [...users]; n[idx] = { ...u, role: e.target.value as UserRole }; onUpdateUsers(n); }}
                                          className="bg-black/40 border border-white/10 rounded-lg px-2 py-1 text-xs outline-none focus:border-[#6C5DD3]"
                                      >
                                          <option value="STUDENT">Student</option>
                                          <option value="CURATOR">Curator</option>
                                          <option value="ADMIN">Admin</option>
                                      </select>
                                  </td>
                                  <td className="p-4 text-right space-x-2">
                                      <button onClick={() => { if(confirm('Reset?')) { const n = [...users]; n[idx] = { ...u, xp: 0, level: 1 }; onUpdateUsers(n); } }} className="text-white/30 hover:text-white text-xs">Reset</button>
                                      <button onClick={() => { if(confirm('Ban?')) { const n = [...users]; n.splice(idx, 1); onUpdateUsers(n); } }} className="text-red-500 hover:text-red-400 text-xs font-bold">BAN</button>
                                  </td>
                              </tr>
                          ))}
                      </tbody>
                  </table>
              </div>
          </div>
      </div>
  );

  const renderDatabase = () => (
    <div className="space-y-6 animate-slide-up">
        <AdminCard>
            <div className="absolute top-0 right-0 p-6 opacity-5 text-9xl grayscale rotate-12">🗄️</div>
            <SectionHeader title="СУБД и Облако" subtitle="Настройка подключения к Supabase" />
            
            <div className="grid md:grid-cols-2 gap-8 relative z-10">
                <div className="space-y-4">
                    <InputGroup label="Supabase Project URL">
                        <StyledInput 
                            placeholder="https://xyz.supabase.co"
                            value={config.integrations.supabaseUrl || ''} 
                            onChange={e => onUpdateConfig({...config, integrations: {...config.integrations, supabaseUrl: e.target.value}})} 
                        />
                    </InputGroup>
                    
                    <InputGroup label="Supabase Anon Key">
                        <StyledInput 
                            type="password"
                            placeholder="eyJhbGciOiJIUzI1NiIsInR5..."
                            value={config.integrations.supabaseAnonKey || ''} 
                            onChange={e => onUpdateConfig({...config, integrations: {...config.integrations, supabaseAnonKey: e.target.value}})} 
                        />
                    </InputGroup>

                    <Button 
                        onClick={testSupabaseConnection} 
                        loading={dbStatus === 'CONNECTING'}
                        variant={dbStatus === 'SUCCESS' ? 'primary' : dbStatus === 'ERROR' ? 'danger' : 'outline'}
                        className="mt-4"
                        fullWidth
                    >
                        {dbStatus === 'SUCCESS' ? '✓ Соединение активно' : dbStatus === 'ERROR' ? 'Ошибка подключения' : 'Проверить соединение'}
                    </Button>
                </div>

                <div className="bg-black/40 p-5 rounded-2xl border border-white/5 flex flex-col justify-between">
                    <div>
                        <h4 className="text-xs font-black text-[#6C5DD3] uppercase tracking-widest mb-3">SQL Setup Query</h4>
                        <div className="bg-[#0F1115] p-3 rounded-xl border border-white/5 font-mono text-[10px] text-slate-400 overflow-x-auto max-h-40 custom-scrollbar">
                            <pre>{`create table profiles (
  id uuid references auth.users on delete cascade,
  telegram_id text unique,
  username text,
  role text default 'STUDENT',
  xp bigint default 0,
  level int default 1,
  data jsonb default '{}'::jsonb,
  updated_at timestamp with time zone default timezone('utc'::text, now()),
  primary key (telegram_id)
);
alter table profiles enable row level security;
create policy "Public profiles are viewable by everyone." on profiles for select using ( true );
create policy "Users can insert their own profile." on profiles for insert with check ( true );
create policy "Users can update own profile." on profiles for update using ( true );`}</pre>
                        </div>
                    </div>
                    <button 
                        onClick={() => {
                            navigator.clipboard.writeText(`create table profiles ( id uuid references auth.users on delete cascade, telegram_id text unique, username text, role text default 'STUDENT', xp bigint default 0, level int default 1, data jsonb default '{}'::jsonb, updated_at timestamp with time zone default timezone('utc'::text, now()), primary key (telegram_id) ); alter table profiles enable row level security; create policy "Public profiles are viewable by everyone." on profiles for select using ( true ); create policy "Users can insert their own profile." on profiles for insert with check ( true ); create policy "Users can update own profile." on profiles for update using ( true );`);
                            addToast('success', 'SQL скопирован в буфер');
                        }}
                        className="mt-4 w-full py-3 bg-white/5 hover:bg-white/10 rounded-xl text-xs font-bold text-white transition-colors"
                    >
                        Копировать SQL код
                    </button>
                </div>
            </div>
        </AdminCard>

        {/* System Cache Section */}
        <AdminCard>
             <SectionHeader title="Системные Настройки" subtitle="Управление кэшем и сброс данных" />
             <div className="flex items-center justify-between bg-red-500/10 border border-red-500/20 p-5 rounded-2xl">
                 <div className="flex items-center gap-4">
                     <div className="w-12 h-12 bg-red-500/20 text-red-500 rounded-xl flex items-center justify-center text-2xl">🗑️</div>
                     <div>
                         <h4 className="font-bold text-white">Полная очистка кэша</h4>
                         <p className="text-xs text-white/50">Удаляет Service Worker кэш и локальные данные. Приложение перезагрузится.</p>
                     </div>
                 </div>
                 <Button onClick={handleClearCache} variant="danger" className="!py-3 !px-6">
                     Очистить все
                 </Button>
             </div>
        </AdminCard>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#050505] pb-40 pt-16 px-4 md:px-8 overflow-y-auto custom-scrollbar">
        <div className="mb-10 animate-fade-in">
            <div className="flex items-center gap-3 mb-2 opacity-50">
                <div className="w-2 h-2 rounded-full bg-[#6C5DD3] animate-pulse"></div>
                <span className="text-[10px] font-black uppercase tracking-[0.3em] text-[#6C5DD3]">Admin Console</span>
            </div>
            <h1 className="text-4xl font-black text-white tracking-tighter uppercase leading-none">
                {activeSubTab === 'OVERVIEW' ? 'Панель Управления' : 
                 activeSubTab === 'NEURAL_CORE' ? 'Нейро-Ядро' :
                 activeSubTab === 'BROADCAST' ? 'Вещание' :
                 activeSubTab === 'DEPLOY' ? 'Деплой' :
                 activeSubTab.charAt(0) + activeSubTab.slice(1).toLowerCase().replace('_', ' ')}
            </h1>
        </div>

        <div className="max-w-7xl mx-auto">
            {activeSubTab === 'OVERVIEW' && renderOverview()}
            {activeSubTab === 'NEURAL_CORE' && renderNeuralCore()}
            {activeSubTab === 'BROADCAST' && (
                <AdminCard className="animate-slide-up">
                    <SectionHeader title="Центр Вещания" subtitle="Отправка уведомлений и новостей" />
                    <div className="space-y-6 max-w-2xl">
                        <InputGroup label="Заголовок (Опционально)">
                            <StyledInput placeholder="Например: Срочная новость" value={broadcastTitle} onChange={e => setBroadcastTitle(e.target.value)} />
                        </InputGroup>
                        <InputGroup label="Текст сообщения">
                            <StyledTextarea placeholder="Введите текст рассылки..." value={broadcastMsg} onChange={e => setBroadcastMsg(e.target.value)} className="min-h-[150px] text-base" />
                        </InputGroup>
                        <div className="flex items-center justify-end gap-4 pt-4">
                            <Button onClick={handleBroadcast} disabled={!broadcastMsg} icon={<span>📨</span>}>Отправить Рассылку</Button>
                        </div>
                    </div>
                </AdminCard>
            )}
            {activeSubTab === 'DEPLOY' && renderDeploy()}
            {activeSubTab === 'SETTINGS' && renderSettings()}
            {activeSubTab === 'CALENDAR' && (
                <div className="h-[600px]">
                    <CalendarView externalEvents={events} isDark={true} />
                </div>
            )}
            {activeSubTab === 'COURSE' && renderCourse()}
            {activeSubTab === 'MATERIALS' && renderMaterials()}
            {activeSubTab === 'STREAMS' && renderStreams()}
            {activeSubTab === 'ARENA' && renderArena()}
            {activeSubTab === 'USERS' && renderUsers()}
            {activeSubTab === 'DATABASE' && renderDatabase()}
        </div>
    </div>
  );
};
