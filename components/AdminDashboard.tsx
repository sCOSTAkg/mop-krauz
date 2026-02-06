
import React, { useState } from 'react';
import { createClient } from '@supabase/supabase-js';
import { AppConfig, Module, UserProgress, UserRole, Material, Stream, Lesson, HomeworkType, ArenaScenario, CalendarEvent, EventType, AIProviderId } from '../types';
import { AIService } from '../services/aiService';
import { Button } from './Button';
import { telegram } from '../services/telegramService';

// --- UI COMPONENTS ---
  
const InputGroup = ({ label, children, className = '' }: { label: string, children?: React.ReactNode, className?: string }) => (
    <div className={`space-y-1.5 w-full ${className}`}>
        <label className="text-[9px] font-black text-white/40 uppercase tracking-widest pl-1">{label}</label>
        {children}
    </div>
);

const StyledInput = (props: React.InputHTMLAttributes<HTMLInputElement>) => (
    <input 
        {...props} 
        className={`w-full bg-[#0F1115] border border-white/10 rounded-xl px-4 py-3 text-sm font-bold text-white focus:border-[#6C5DD3] focus:bg-[#14161B] outline-none transition-all placeholder:text-white/20 ${props.className}`} 
    />
);

const StyledSelect = (props: React.SelectHTMLAttributes<HTMLSelectElement>) => (
    <div className="relative">
        <select 
            {...props} 
            className={`w-full appearance-none bg-[#0F1115] border border-white/10 rounded-xl px-4 py-3 text-sm font-bold text-white focus:border-[#6C5DD3] focus:bg-[#14161B] outline-none transition-all ${props.className}`} 
        >
            {props.children}
        </select>
        <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-white/40 text-xs">▼</div>
    </div>
);

const StyledTextarea = (props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) => (
    <textarea 
        {...props} 
        className={`w-full bg-[#0F1115] border border-white/10 rounded-xl px-4 py-3 text-sm font-medium text-white focus:border-[#6C5DD3] focus:bg-[#14161B] outline-none transition-all placeholder:text-white/20 resize-y min-h-[80px] custom-scrollbar ${props.className}`} 
    />
);

const SectionHeader = ({ title, action }: { title: string, action?: React.ReactNode }) => (
    <div className="flex justify-between items-end mb-6 border-b border-white/5 pb-4">
        <h3 className="text-xl font-black text-white">{title}</h3>
        {action}
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

  activeSubTab: 'OVERVIEW' | 'COURSE' | 'MATERIALS' | 'STREAMS' | 'USERS' | 'SETTINGS' | 'ARENA' | 'CALENDAR' | 'NEURAL_CORE' | 'DATABASE' | 'DEPLOY';
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
  
  // State for Lesson Editing Modal
  const [editingLesson, setEditingLesson] = useState<{ mIdx: number; lIdx: number; data: Lesson } | null>(null);

  // --- AI HELPERS ---
  const updateAIConfig = (updates: Partial<typeof config.aiConfig>) => {
      const newConfig = { ...config, aiConfig: { ...config.aiConfig, ...updates } };
      onUpdateConfig(newConfig);
      AIService.updateConfig(newConfig.aiConfig);
      addToast('success', 'Настройки Ядра ИИ обновлены');
  };

  const updateAgentConfig = (updates: Partial<typeof config.systemAgent>) => {
      const newConfig = { ...config, systemAgent: { ...config.systemAgent, ...updates } };
      onUpdateConfig(newConfig);
      addToast('success', 'Агент системы перенастроен');
  };

  const getKeyName = (provider: string) => {
      if (provider === 'OPENAI_GPT4') return 'openai';
      if (provider === 'ANTHROPIC_CLAUDE') return 'anthropic';
      if (provider === 'GROQ') return 'groq';
      if (provider === 'OPENROUTER') return 'openrouter';
      return 'google';
  };

  // --- DB HELPERS ---
  const testSupabaseConnection = async () => {
    const url = config.integrations.supabaseUrl;
    const key = config.integrations.supabaseAnonKey;

    if (!url || !key) {
        addToast('error', 'Введите URL и Key');
        return;
    }

    setDbStatus('CONNECTING');
    try {
        const client = createClient(url, key);
        // Try a lightweight query
        const { count, error } = await client.from('profiles').select('*', { count: 'exact', head: true });
        
        if (error) throw error;
        
        setDbStatus('SUCCESS');
        addToast('success', `Соединение установлено. Найдено записей: ${count || 0}`);
    } catch (e: any) {
        setDbStatus('ERROR');
        addToast('error', `Ошибка: ${e.message}`);
    }
  };

  // --- RENDERERS ---

  const renderOverview = () => (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
            { label: 'Бойцов', val: users.length, icon: '👥', color: 'text-blue-400' },
            { label: 'Модулей', val: modules.length, icon: '📦', color: 'text-[#FFAB7B]' },
            { label: 'Сценариев', val: scenarios.length, icon: '⚔️', color: 'text-red-400' },
            { label: 'Событий', val: events.length, icon: '📅', color: 'text-green-400' },
        ].map((stat, i) => (
            <div key={i} className="glass-panel p-6 rounded-[2rem] flex flex-col items-center justify-center relative overflow-hidden group border border-white/5 bg-[#14161B]">
                <div className={`absolute top-0 right-0 p-4 opacity-10 text-4xl group-hover:scale-125 transition-transform ${stat.color}`}>{stat.icon}</div>
                <span className="text-white/30 text-[9px] font-black uppercase mb-2 tracking-[0.2em]">{stat.label}</span>
                <span className="text-4xl font-black text-white">{stat.val}</span>
            </div>
        ))}
        
        {/* Agent Status Card */}
        <div className="col-span-2 glass-panel p-6 rounded-[2rem] border border-[#6C5DD3]/30 bg-[#14161B] relative overflow-hidden flex items-center justify-between">
            <div className="absolute inset-0 bg-gradient-to-r from-[#6C5DD3]/10 to-transparent"></div>
            <div>
                <span className="text-[#6C5DD3] text-[9px] font-black uppercase tracking-[0.2em] mb-2 block">System Watcher</span>
                <h3 className="text-2xl font-black text-white">{config.systemAgent.enabled ? 'ACTIVE' : 'DISABLED'}</h3>
                <p className="text-white/40 text-xs mt-1">{config.systemAgent.autoFix ? 'Auto-Repair Enabled' : 'Monitoring Only'}</p>
            </div>
            <div className={`w-12 h-12 rounded-full border-4 flex items-center justify-center text-xl ${config.systemAgent.enabled ? 'border-green-500 text-green-500 animate-pulse' : 'border-slate-700 text-slate-700'}`}>
                👁️
            </div>
        </div>
    </div>
  );

  const renderDatabase = () => (
    <div className="space-y-6 animate-slide-up">
        <div className="bg-[#14161B] border border-white/10 p-6 rounded-[2rem] relative overflow-hidden">
            <div className="absolute top-0 right-0 p-6 opacity-5 text-8xl grayscale">🗄️</div>
            <SectionHeader title="СУБД и Облако" />
            
            <div className="mb-6 p-4 rounded-xl bg-blue-500/10 border border-blue-500/20">
                <p className="text-blue-200 text-xs leading-relaxed">
                    Для синхронизации прогресса пользователей между устройствами используется <strong>Supabase (PostgreSQL)</strong>.
                    Введите учетные данные проекта ниже.
                </p>
            </div>

            <div className="space-y-4 max-w-xl">
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
            </div>

            <div className="flex items-center gap-4 mt-8 pt-6 border-t border-white/5">
                <Button 
                    onClick={testSupabaseConnection} 
                    loading={dbStatus === 'CONNECTING'}
                    variant={dbStatus === 'SUCCESS' ? 'primary' : dbStatus === 'ERROR' ? 'danger' : 'secondary'}
                >
                    {dbStatus === 'SUCCESS' ? '✓ Соединение активно' : dbStatus === 'ERROR' ? 'Ошибка подключения' : 'Проверить соединение'}
                </Button>
                
                {dbStatus === 'SUCCESS' && (
                     <span className="text-green-500 text-xs font-bold animate-fade-in">Готово к работе</span>
                )}
            </div>
        </div>

        <div className="bg-[#14161B] border border-white/10 p-6 rounded-[2rem]">
            <SectionHeader title="Схема данных (SQL)" />
            <p className="text-white/40 text-xs mb-4">Выполните этот SQL запрос в SQL Editor вашей Supabase панели, чтобы создать необходимые таблицы.</p>
            
            <div className="bg-black/40 p-4 rounded-xl border border-white/5 font-mono text-[10px] text-slate-300 overflow-x-auto">
                <pre>{`
-- Создание таблицы профилей
create table profiles (
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

-- Настройка RLS (Row Level Security)
alter table profiles enable row level security;
create policy "Public profiles are viewable by everyone." on profiles for select using ( true );
create policy "Users can insert their own profile." on profiles for insert with check ( true );
create policy "Users can update own profile." on profiles for update using ( true );
                `}</pre>
            </div>
             <button 
                onClick={() => {
                    navigator.clipboard.writeText(`create table profiles ( id uuid references auth.users on delete cascade, telegram_id text unique, username text, role text default 'STUDENT', xp bigint default 0, level int default 1, data jsonb default '{}'::jsonb, updated_at timestamp with time zone default timezone('utc'::text, now()), primary key (telegram_id) ); alter table profiles enable row level security; create policy "Public profiles are viewable by everyone." on profiles for select using ( true ); create policy "Users can insert their own profile." on profiles for insert with check ( true ); create policy "Users can update own profile." on profiles for update using ( true );`);
                    addToast('success', 'SQL скопирован в буфер');
                }}
                className="mt-3 text-xs text-[#6C5DD3] hover:text-white transition-colors font-bold uppercase tracking-wide"
            >
                Копировать SQL
            </button>
        </div>
    </div>
  );

  const renderNeuralCore = () => (
      <div className="space-y-8 animate-slide-up">
          <div className="bg-[#14161B] border border-white/10 p-6 rounded-[2rem]">
              <h3 className="text-xl font-black text-white mb-6 flex items-center gap-2">
                  <span className="text-[#6C5DD3]">🧠</span> 
                  Основной Мозг (LLM Provider)
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                  {[
                      { id: 'GOOGLE_GEMINI', name: 'Google Gemini', desc: 'Recommended. Native integration.', icon: '💎' },
                      { id: 'GROQ', name: 'Groq (Fast)', desc: 'Lightning fast inference (Llama 3).', icon: '⚡' },
                      { id: 'OPENROUTER', name: 'OpenRouter', desc: 'Access to Claude, GPT-4, etc.', icon: '🌐' },
                      { id: 'OPENAI_GPT4', name: 'OpenAI GPT-4o', desc: 'Powerful but slower.', icon: '🟢' },
                      { id: 'ANTHROPIC_CLAUDE', name: 'Claude 3.5 Sonnet', desc: 'Best for reasoning.', icon: '🟠' }
                  ].map((provider) => (
                      <button
                          key={provider.id}
                          onClick={() => updateAIConfig({ activeProvider: provider.id as AIProviderId })}
                          className={`relative p-5 rounded-2xl border text-left transition-all group overflow-hidden ${config.aiConfig.activeProvider === provider.id ? 'bg-[#6C5DD3] border-[#6C5DD3] text-white shadow-lg shadow-[#6C5DD3]/20' : 'bg-white/5 border-white/5 hover:bg-white/10 text-slate-300'}`}
                      >
                          <div className="flex justify-between items-start mb-3 relative z-10">
                              <span className="text-3xl filter drop-shadow-md">{provider.icon}</span>
                              {config.aiConfig.activeProvider === provider.id && <span className="px-2 py-0.5 bg-white/20 rounded-md text-[9px] font-black uppercase tracking-wider backdrop-blur-sm">Active</span>}
                          </div>
                          <div className="font-bold text-sm mb-1 relative z-10">{provider.name}</div>
                          <div className={`text-[10px] relative z-10 ${config.aiConfig.activeProvider === provider.id ? 'text-white/70' : 'text-white/30'}`}>{provider.desc}</div>
                          
                          {/* Background Glow for active */}
                          {config.aiConfig.activeProvider === provider.id && (
                              <div className="absolute -right-4 -bottom-4 w-24 h-24 bg-white/10 rounded-full blur-2xl pointer-events-none"></div>
                          )}
                      </button>
                  ))}
              </div>

              <div className="mt-6 bg-black/20 p-5 rounded-2xl border border-white/5">
                   <div className="flex items-center gap-2 mb-3">
                       <span className="text-[#6C5DD3]">🔑</span>
                       <span className="text-xs font-black uppercase tracking-widest text-white/50">
                           API Key configuration
                       </span>
                   </div>
                   <InputGroup label={`Ключ доступа для ${config.aiConfig.activeProvider}`}>
                       <div className="relative">
                           <StyledInput 
                               type="password"
                               placeholder={`Введите ключ для ${config.aiConfig.activeProvider}...`}
                               value={config.aiConfig.apiKeys?.[getKeyName(config.aiConfig.activeProvider)] || ''}
                               onChange={(e) => {
                                   const keyName = getKeyName(config.aiConfig.activeProvider);
                                   updateAIConfig({ apiKeys: { ...config.aiConfig.apiKeys, [keyName]: e.target.value } });
                               }}
                               className="pr-10 !bg-[#050505] !border-white/10 focus:!border-[#6C5DD3]"
                           />
                           <div className="absolute right-3 top-1/2 -translate-y-1/2 text-lg">
                               {config.aiConfig.apiKeys?.[getKeyName(config.aiConfig.activeProvider)] ? '✅' : '⚠️'}
                           </div>
                       </div>
                       <p className="text-[10px] text-white/30 mt-2">
                           Ключ сохраняется локально и используется для запросов к {config.aiConfig.activeProvider}.
                       </p>
                   </InputGroup>
              </div>
          </div>

          <div className="bg-[#14161B] border border-white/10 p-6 rounded-[2rem] relative overflow-hidden">
               <div className="absolute top-0 right-0 p-6 opacity-5 text-8xl grayscale">🛡️</div>
               <h3 className="text-xl font-black text-white mb-6 flex items-center gap-2 relative z-10">
                  <span className="text-green-500">🛡️</span> 
                  Системный Агент (Watcher)
              </h3>
              
              <div className="flex items-center justify-between mb-6 bg-white/5 p-4 rounded-2xl">
                  <div>
                      <h4 className="font-bold text-white text-sm">Активный Мониторинг</h4>
                      <p className="text-white/40 text-xs">Агент следит за ошибками и кэшем в реальном времени</p>
                  </div>
                  <button 
                      onClick={() => updateAgentConfig({ enabled: !config.systemAgent.enabled })}
                      className={`w-14 h-8 rounded-full p-1 transition-colors ${config.systemAgent.enabled ? 'bg-green-500' : 'bg-white/10'}`}
                  >
                      <div className={`w-6 h-6 bg-white rounded-full shadow-md transition-transform ${config.systemAgent.enabled ? 'translate-x-6' : ''}`}></div>
                  </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 relative z-10">
                   <div className="space-y-4">
                       <h4 className="text-xs font-black uppercase text-white/50 tracking-widest">Протоколы лечения</h4>
                       <label className="flex items-center gap-3 p-3 bg-white/5 rounded-xl cursor-pointer hover:bg-white/10 transition-colors">
                           <input 
                                type="checkbox" 
                                checked={config.systemAgent.autoFix} 
                                onChange={(e) => updateAgentConfig({ autoFix: e.target.checked })}
                                className="w-5 h-5 accent-[#6C5DD3]"
                           />
                           <div>
                               <div className="font-bold text-white text-sm">Авто-исправление (Auto-Fix)</div>
                               <div className="text-white/30 text-[10px]">Самостоятельно перезагружать модули при сбое</div>
                           </div>
                       </label>
                   </div>
                   
                   <div className="space-y-4">
                       <h4 className="text-xs font-black uppercase text-white/50 tracking-widest">Чувствительность</h4>
                       <div className="flex bg-white/5 p-1 rounded-xl">
                           {['LOW', 'HIGH'].map((level) => (
                               <button 
                                  key={level}
                                  onClick={() => updateAgentConfig({ sensitivity: level as any })}
                                  className={`flex-1 py-2 rounded-lg text-[10px] font-black uppercase transition-all ${config.systemAgent.sensitivity === level ? 'bg-[#6C5DD3] text-white shadow-lg' : 'text-white/40 hover:text-white'}`}
                               >
                                   {level}
                               </button>
                           ))}
                       </div>
                   </div>
              </div>
          </div>
      </div>
  );

  const renderDeploy = () => (
    <div className="space-y-6 animate-slide-up">
        <div className="bg-[#14161B] border border-white/10 p-6 rounded-[2rem] relative overflow-hidden">
             <div className="absolute top-0 right-0 p-6 opacity-5 text-8xl grayscale">🚀</div>
             <SectionHeader title="Deployment Center" />
             
             <div className="grid grid-cols-1 gap-6">
                 {/* Vercel Deploy Button */}
                 <div className="bg-black/40 border border-white/10 p-6 rounded-2xl relative overflow-hidden group">
                     <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full blur-2xl group-hover:bg-white/10 transition-colors pointer-events-none"></div>
                     
                     <div className="relative z-10">
                         <h4 className="text-xl font-black text-white mb-2">Vercel Deployment</h4>
                         <p className="text-white/60 text-sm mb-6 max-w-md">
                             Автоматический деплой через Vercel. Лучшее решение для React приложений.
                             Поддерживает CI/CD, HTTPS и глобальный CDN.
                         </p>
                         
                         <a 
                            href="https://vercel.com/new" 
                            target="_blank" 
                            rel="noreferrer"
                            className="inline-flex items-center gap-3 bg-white text-black px-6 py-3 rounded-xl font-black uppercase tracking-widest text-xs hover:scale-105 transition-transform"
                         >
                             <svg className="w-4 h-4" viewBox="0 0 1155 1000" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M577.344 0L1154.69 1000H0L577.344 0Z" fill="black"/></svg>
                             Deploy to Vercel
                         </a>
                     </div>
                 </div>

                 {/* Env Vars Helper */}
                 <div className="bg-[#14161B] border border-white/10 p-6 rounded-2xl">
                     <h4 className="text-sm font-bold text-white mb-4 flex items-center gap-2">
                         <span className="text-[#6C5DD3]">🔑</span>
                         Environment Variables
                     </h4>
                     <p className="text-xs text-white/40 mb-4">Добавьте эти переменные в настройках проекта Vercel:</p>
                     
                     <div className="space-y-3">
                         <div className="bg-black/50 p-3 rounded-lg border border-white/5 flex justify-between items-center group">
                             <code className="text-[#FFAB7B] text-xs font-mono">API_KEY</code>
                             <span className="text-[10px] text-white/20">Gemini API Key</span>
                         </div>
                         <div className="bg-black/50 p-3 rounded-lg border border-white/5 flex justify-between items-center group">
                             <code className="text-[#6C5DD3] text-xs font-mono">SUPABASE_URL</code>
                             <span className="text-[10px] text-white/20">DB Connection</span>
                         </div>
                         <div className="bg-black/50 p-3 rounded-lg border border-white/5 flex justify-between items-center group">
                             <code className="text-[#6C5DD3] text-xs font-mono">SUPABASE_ANON_KEY</code>
                             <span className="text-[10px] text-white/20">DB Key</span>
                         </div>
                     </div>
                 </div>
             </div>
        </div>
    </div>
  );

  // --- CRUD RENDERERS ---

  const renderCourse = () => {
    const handleAddModule = () => {
        const newMod: Module = {
            id: `m${Date.now()}`,
            title: 'Новый модуль',
            description: 'Описание модуля...',
            minLevel: 1,
            category: 'GENERAL',
            imageUrl: '',
            lessons: []
        };
        onUpdateModules([...modules, newMod]);
    };

    const handleUpdateModule = (idx: number, updates: Partial<Module>) => {
        const newModules = [...modules];
        newModules[idx] = { ...newModules[idx], ...updates };
        onUpdateModules(newModules);
    };

    const handleDeleteModule = (idx: number) => {
        if (confirm('Удалить модуль?')) {
            const newModules = [...modules];
            newModules.splice(idx, 1);
            onUpdateModules(newModules);
        }
    };

    const handleAddLesson = (modIdx: number) => {
        const newLesson: Lesson = {
            id: `l${Date.now()}`,
            title: 'Новый урок',
            description: '',
            content: '',
            xpReward: 100,
            homeworkType: 'TEXT',
            homeworkTask: 'Задача...',
            aiGradingInstruction: 'Критерии...'
        };
        const newModules = [...modules];
        newModules[modIdx].lessons.push(newLesson);
        onUpdateModules(newModules);
        // Automatically open edit modal for new lesson
        setEditingLesson({ mIdx: modIdx, lIdx: newModules[modIdx].lessons.length - 1, data: newLesson });
    };

    const handleDeleteLesson = (modIdx: number, lessIdx: number) => {
        if (confirm('Удалить урок?')) {
            const newModules = [...modules];
            newModules[modIdx].lessons.splice(lessIdx, 1);
            onUpdateModules(newModules);
        }
    };

    const handleSaveLesson = () => {
        if (!editingLesson) return;
        const newModules = [...modules];
        newModules[editingLesson.mIdx].lessons[editingLesson.lIdx] = editingLesson.data;
        onUpdateModules(newModules);
        setEditingLesson(null);
        addToast('success', 'Урок успешно обновлен');
    };

    const updateEditingLesson = (updates: Partial<Lesson>) => {
        if (!editingLesson) return;
        setEditingLesson({ ...editingLesson, data: { ...editingLesson.data, ...updates } });
    };

    return (
        <div className="space-y-6">
            <SectionHeader 
                title="Управление Курсом" 
                action={<Button onClick={handleAddModule} className="!py-2 !px-4 !text-xs">+ Модуль</Button>} 
            />
            {modules.map((mod, mIdx) => (
                <div key={mod.id} className="glass-panel p-4 rounded-[1.5rem] border border-white/5">
                    <div className="flex justify-between items-start mb-4">
                        <div className="flex-1 space-y-2 mr-4">
                            <InputGroup label="Название модуля">
                                <StyledInput value={mod.title} onChange={e => handleUpdateModule(mIdx, { title: e.target.value })} />
                            </InputGroup>
                            <InputGroup label="Описание">
                                <StyledInput value={mod.description} onChange={e => handleUpdateModule(mIdx, { description: e.target.value })} />
                            </InputGroup>
                            <div className="flex gap-2">
                                <InputGroup label="Категория">
                                    <StyledSelect value={mod.category} onChange={e => handleUpdateModule(mIdx, { category: e.target.value as any })}>
                                        <option value="GENERAL">Общее</option>
                                        <option value="SALES">Продажи</option>
                                        <option value="PSYCHOLOGY">Психология</option>
                                        <option value="TACTICS">Тактика</option>
                                    </StyledSelect>
                                </InputGroup>
                                <InputGroup label="Мин. Уровень">
                                    <StyledInput type="number" value={mod.minLevel} onChange={e => handleUpdateModule(mIdx, { minLevel: parseInt(e.target.value) })} />
                                </InputGroup>
                            </div>
                        </div>
                        <div className="flex flex-col gap-2">
                            <button onClick={() => setExpandedModuleId(expandedModuleId === mod.id ? null : mod.id)} className="w-8 h-8 rounded-lg bg-white/5 hover:bg-white/10 text-white flex items-center justify-center transition-colors">
                                {expandedModuleId === mod.id ? '▲' : '▼'}
                            </button>
                            <button onClick={() => handleDeleteModule(mIdx)} className="w-8 h-8 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-500 flex items-center justify-center transition-colors">✕</button>
                        </div>
                    </div>

                    {expandedModuleId === mod.id && (
                        <div className="pl-4 border-l-2 border-white/5 space-y-4 mt-4 animate-fade-in">
                            <div className="flex items-center justify-between">
                                <span className="text-xs font-bold text-white/50 uppercase">Уроки ({mod.lessons.length})</span>
                                <button onClick={() => handleAddLesson(mIdx)} className="text-xs text-[#6C5DD3] hover:text-white transition-colors font-bold">+ Добавить урок</button>
                            </div>
                            {mod.lessons.map((lesson, lIdx) => (
                                <div key={lesson.id} className="bg-white/5 p-4 rounded-xl flex items-center justify-between group hover:bg-white/10 transition-colors">
                                    <div className="flex-1 mr-4">
                                        <h4 className="font-bold text-white text-sm">{lesson.title || 'Новый урок'}</h4>
                                        <p className="text-xs text-white/40 truncate">{lesson.description || 'Нет описания'}</p>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <button 
                                            onClick={() => setEditingLesson({ mIdx, lIdx, data: lesson })}
                                            className="p-2 rounded-lg bg-[#6C5DD3]/10 text-[#6C5DD3] hover:bg-[#6C5DD3] hover:text-white transition-colors"
                                            title="Редактировать"
                                        >
                                            ✏️
                                        </button>
                                        <button 
                                            onClick={() => handleDeleteLesson(mIdx, lIdx)} 
                                            className="p-2 rounded-lg bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white transition-colors"
                                            title="Удалить"
                                        >
                                            ✕
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            ))}

            {/* EDIT LESSON MODAL */}
            {editingLesson && (
                <div className="fixed inset-0 z-[200] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
                    <div className="bg-[#1F2128] w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-[2rem] border border-white/10 p-6 shadow-2xl custom-scrollbar animate-scale-in">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-xl font-black text-white">Редактирование Урока</h3>
                            <button onClick={() => setEditingLesson(null)} className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center text-white">✕</button>
                        </div>
                        
                        <div className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <InputGroup label="Название">
                                    <StyledInput value={editingLesson.data.title} onChange={e => updateEditingLesson({ title: e.target.value })} />
                                </InputGroup>
                                <InputGroup label="Награда XP">
                                    <StyledInput type="number" value={editingLesson.data.xpReward} onChange={e => updateEditingLesson({ xpReward: parseInt(e.target.value) })} />
                                </InputGroup>
                            </div>

                            <InputGroup label="Описание (Кратко)">
                                <StyledInput value={editingLesson.data.description} onChange={e => updateEditingLesson({ description: e.target.value })} />
                            </InputGroup>

                            <InputGroup label="Видео URL (YouTube/File)">
                                <StyledInput value={editingLesson.data.videoUrl || ''} onChange={e => updateEditingLesson({ videoUrl: e.target.value })} placeholder="https://..." />
                            </InputGroup>

                            <InputGroup label="Контент (Markdown поддерживается)">
                                <StyledTextarea 
                                    value={editingLesson.data.content} 
                                    onChange={e => updateEditingLesson({ content: e.target.value })} 
                                    className="min-h-[150px] font-mono text-xs"
                                />
                            </InputGroup>

                            <div className="bg-black/20 p-4 rounded-xl border border-white/5 space-y-4">
                                <h4 className="text-xs font-black uppercase text-[#6C5DD3] tracking-widest">Блок Домашнего Задания</h4>
                                
                                <InputGroup label="Тип задания">
                                    <StyledSelect value={editingLesson.data.homeworkType} onChange={e => updateEditingLesson({ homeworkType: e.target.value as any })}>
                                        <option value="TEXT">Текст</option>
                                        <option value="PHOTO">Фото</option>
                                        <option value="VIDEO">Видео</option>
                                        <option value="FILE">Файл (PDF)</option>
                                    </StyledSelect>
                                </InputGroup>

                                <InputGroup label="Текст задания для ученика">
                                    <StyledInput value={editingLesson.data.homeworkTask} onChange={e => updateEditingLesson({ homeworkTask: e.target.value })} />
                                </InputGroup>

                                <InputGroup label="Инструкция для AI проверки (System Prompt)">
                                    <StyledTextarea 
                                        value={editingLesson.data.aiGradingInstruction} 
                                        onChange={e => updateEditingLesson({ aiGradingInstruction: e.target.value })} 
                                        className="min-h-[100px] text-xs"
                                        placeholder="Инструкция для нейросети: на что обращать внимание при проверке..."
                                    />
                                </InputGroup>
                            </div>
                        </div>

                        <div className="flex gap-3 mt-8">
                            <Button onClick={() => setEditingLesson(null)} variant="secondary" className="flex-1">Отмена</Button>
                            <Button onClick={handleSaveLesson} className="flex-1">Сохранить</Button>
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
      const handleAdd = () => onUpdate([...items, newItemFactory()]);
      const handleDelete = (idx: number) => {
          if (confirm('Удалить элемент?')) {
              const newItems = [...items];
              newItems.splice(idx, 1);
              onUpdate(newItems);
          }
      };
      const handleItemUpdate = (idx: number, updates: Partial<T>) => {
          const newItems = [...items];
          newItems[idx] = { ...newItems[idx], ...updates };
          onUpdate(newItems);
      };

      return (
          <div className="space-y-6">
              <SectionHeader 
                  title={title} 
                  action={<Button onClick={handleAdd} className="!py-2 !px-4 !text-xs">+ Добавить</Button>} 
              />
              <div className="grid grid-cols-1 gap-4">
                  {items.map((item, idx) => (
                      <div key={item.id} className="glass-panel p-4 rounded-[1.5rem] border border-white/5 relative group">
                          <button onClick={() => handleDelete(idx)} className="absolute top-4 right-4 w-8 h-8 bg-red-500/10 text-red-500 rounded-lg flex items-center justify-center hover:bg-red-500 hover:text-white transition-colors z-10">✕</button>
                          {renderItem(item, idx, (u) => handleItemUpdate(idx, u))}
                      </div>
                  ))}
                  {items.length === 0 && <div className="text-center text-white/20 py-10 border-2 border-dashed border-white/5 rounded-3xl">Список пуст</div>}
              </div>
          </div>
      );
  };

  const renderMaterials = () => renderGenericList(
      'База Знаний',
      materials,
      onUpdateMaterials,
      () => ({ id: `mat${Date.now()}`, title: 'Новый материал', description: '', type: 'LINK', url: '' }),
      (item, _, update) => (
          <div className="space-y-3 pr-10">
              <InputGroup label="Заголовок">
                  <StyledInput value={item.title} onChange={e => update({ title: e.target.value })} />
              </InputGroup>
              <div className="flex gap-2">
                  <InputGroup label="Тип" className="w-1/3">
                      <StyledSelect value={item.type} onChange={e => update({ type: e.target.value as any })}>
                          <option value="LINK">Ссылка</option>
                          <option value="PDF">PDF</option>
                          <option value="VIDEO">Видео</option>
                      </StyledSelect>
                  </InputGroup>
                  <InputGroup label="URL / Ссылка" className="flex-1">
                      <StyledInput value={item.url} onChange={e => update({ url: e.target.value })} />
                  </InputGroup>
              </div>
              <InputGroup label="Описание">
                  <StyledInput value={item.description} onChange={e => update({ description: e.target.value })} />
              </InputGroup>
          </div>
      )
  );

  const renderStreams = () => renderGenericList(
      'Эфиры и Записи',
      streams,
      onUpdateStreams,
      () => ({ id: `str${Date.now()}`, title: 'Новый эфир', date: new Date().toISOString(), status: 'UPCOMING', youtubeUrl: '' }),
      (item, _, update) => (
          <div className="space-y-3 pr-10">
              <InputGroup label="Название эфира">
                  <StyledInput value={item.title} onChange={e => update({ title: e.target.value })} />
              </InputGroup>
              <div className="flex gap-2">
                  <InputGroup label="Дата и время" className="flex-1">
                      <StyledInput type="datetime-local" value={item.date.substring(0, 16)} onChange={e => update({ date: new Date(e.target.value).toISOString() })} />
                  </InputGroup>
                  <InputGroup label="Статус" className="w-1/3">
                      <StyledSelect value={item.status} onChange={e => update({ status: e.target.value as any })}>
                          <option value="UPCOMING">Будущий</option>
                          <option value="LIVE">Live</option>
                          <option value="PAST">Запись</option>
                      </StyledSelect>
                  </InputGroup>
              </div>
              <InputGroup label="Ссылка (Youtube/Webinar)">
                  <StyledInput value={item.youtubeUrl} onChange={e => update({ youtubeUrl: e.target.value })} />
              </InputGroup>
          </div>
      )
  );

  const renderArena = () => renderGenericList(
      'Сценарии Арены',
      scenarios,
      onUpdateScenarios,
      () => ({ id: `scn${Date.now()}`, title: 'Новый сценарий', difficulty: 'Easy', clientRole: 'Роль клиента...', objective: 'Цель...', initialMessage: 'Приветствие...' }),
      (item, _, update) => (
          <div className="space-y-3 pr-10">
              <div className="flex gap-2">
                  <InputGroup label="Название" className="flex-1">
                      <StyledInput value={item.title} onChange={e => update({ title: e.target.value })} />
                  </InputGroup>
                  <InputGroup label="Сложность" className="w-1/3">
                      <StyledSelect value={item.difficulty} onChange={e => update({ difficulty: e.target.value as any })}>
                          <option value="Easy">Легко</option>
                          <option value="Medium">Средне</option>
                          <option value="Hard">Сложно</option>
                      </StyledSelect>
                  </InputGroup>
              </div>
              <InputGroup label="Роль клиента (Промпт)">
                  <StyledTextarea value={item.clientRole} onChange={e => update({ clientRole: e.target.value })} />
              </InputGroup>
              <InputGroup label="Цель игрока">
                  <StyledInput value={item.objective} onChange={e => update({ objective: e.target.value })} />
              </InputGroup>
              <InputGroup label="Первая фраза клиента">
                  <StyledInput value={item.initialMessage} onChange={e => update({ initialMessage: e.target.value })} />
              </InputGroup>
          </div>
      )
  );

  const renderCalendar = () => renderGenericList(
      'Календарь Событий',
      events,
      onUpdateEvents,
      () => ({ id: `evt${Date.now()}`, title: 'Событие', description: '', date: new Date().toISOString(), type: EventType.OTHER }),
      (item, _, update) => (
          <div className="space-y-3 pr-10">
              <InputGroup label="Заголовок">
                  <StyledInput value={item.title} onChange={e => update({ title: e.target.value })} />
              </InputGroup>
              <div className="flex gap-2">
                  <InputGroup label="Дата" className="flex-1">
                      <StyledInput type="datetime-local" value={typeof item.date === 'string' ? item.date.substring(0, 16) : new Date(item.date).toISOString().substring(0, 16)} onChange={e => update({ date: new Date(e.target.value).toISOString() })} />
                  </InputGroup>
                  <InputGroup label="Тип" className="w-1/3">
                      <StyledSelect value={item.type} onChange={e => update({ type: e.target.value as any })}>
                          <option value="WEBINAR">Вебинар</option>
                          <option value="HOMEWORK">Дедлайн</option>
                          <option value="OTHER">Другое</option>
                      </StyledSelect>
                  </InputGroup>
              </div>
              <InputGroup label="Описание">
                  <StyledInput value={item.description} onChange={e => update({ description: e.target.value })} />
              </InputGroup>
          </div>
      )
  );

  const renderUsers = () => (
      <div className="space-y-6">
          <SectionHeader title="Управление Персоналом" />
          <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                  <thead>
                      <tr className="text-white/40 text-[10px] uppercase border-b border-white/10">
                          <th className="p-3">User</th>
                          <th className="p-3">Role</th>
                          <th className="p-3 text-right">Actions</th>
                      </tr>
                  </thead>
                  <tbody className="text-sm text-white">
                      {users.map((u, idx) => (
                          <tr key={idx} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                              <td className="p-3 flex items-center gap-3">
                                  <div className="w-8 h-8 rounded-full bg-white/10 overflow-hidden">
                                      <img src={u.avatarUrl || `https://ui-avatars.com/api/?name=${u.name}`} className="w-full h-full object-cover" />
                                  </div>
                                  <div>
                                      <div className="font-bold">{u.name}</div>
                                      <div className="text-[10px] text-white/50">{u.telegramUsername ? `@${u.telegramUsername}` : 'No TG'}</div>
                                  </div>
                              </td>
                              <td className="p-3">
                                  <select 
                                      value={u.role} 
                                      onChange={(e) => {
                                          const newUsers = [...users];
                                          newUsers[idx] = { ...u, role: e.target.value as UserRole };
                                          onUpdateUsers(newUsers);
                                      }}
                                      className="bg-black/20 border border-white/10 rounded-lg px-2 py-1 text-xs outline-none focus:border-[#6C5DD3]"
                                  >
                                      <option value="STUDENT">Student</option>
                                      <option value="CURATOR">Curator</option>
                                      <option value="ADMIN">Admin</option>
                                  </select>
                              </td>
                              <td className="p-3">
                                  <span className="text-right">
                                      <button onClick={() => {
                                          if(confirm('Сбросить прогресс пользователя?')) {
                                              const newUsers = [...users];
                                              newUsers[idx] = { ...u, xp: 0, level: 1, completedLessonIds: [] };
                                              onUpdateUsers(newUsers);
                                          }
                                      }} className="text-white/40 hover:text-white text-xs mr-2">Reset</button>
                                      <button onClick={() => {
                                           if(confirm('Удалить пользователя из базы?')) {
                                               const newUsers = [...users];
                                               newUsers.splice(idx, 1);
                                               onUpdateUsers(newUsers);
                                           }
                                      }} className="text-red-500 hover:text-red-400 text-xs">Ban</button>
                                  </span>
                              </td>
                          </tr>
                      ))}
                  </tbody>
              </table>
          </div>
      </div>
  );

  return (
    <div className="min-h-screen bg-[#050505] pb-40 pt-16 px-4 md:px-6 overflow-y-auto custom-scrollbar">
        <div className="mb-8 text-center animate-slide-up">
            <h1 className="text-2xl md:text-3xl font-black text-white tracking-tighter uppercase">
                {activeSubTab === 'OVERVIEW' ? 'Панель управления' : activeSubTab.replace('_', ' ')}
            </h1>
            <p className="text-[#6C5DD3] text-[9px] font-black uppercase tracking-[0.3em] mt-1 opacity-60">System Admin v4.5</p>
        </div>

        <div className="space-y-6 animate-slide-up" style={{ animationDelay: '0.1s' }}>
            {activeSubTab === 'OVERVIEW' && renderOverview()}
            {activeSubTab === 'NEURAL_CORE' && renderNeuralCore()}
            {activeSubTab === 'COURSE' && renderCourse()}
            {activeSubTab === 'MATERIALS' && renderMaterials()}
            {activeSubTab === 'STREAMS' && renderStreams()}
            {activeSubTab === 'ARENA' && renderArena()}
            {activeSubTab === 'CALENDAR' && renderCalendar()}
            {activeSubTab === 'USERS' && renderUsers()}
            {activeSubTab === 'DATABASE' && renderDatabase()}
            {activeSubTab === 'DEPLOY' && renderDeploy()}
            
            {activeSubTab === 'SETTINGS' && (
                <div className="glass-panel p-6 rounded-[2rem] border border-white/5 space-y-6">
                    <SectionHeader title="Глобальные настройки" />
                    <InputGroup label="Название приложения">
                        <StyledInput value={config.appName} onChange={e => onUpdateConfig({...config, appName: e.target.value})} />
                    </InputGroup>
                    <InputGroup label="System Instruction (Global AI Persona)">
                        <StyledTextarea value={config.systemInstruction} onChange={e => onUpdateConfig({...config, systemInstruction: e.target.value})} className="h-60" />
                    </InputGroup>
                    <InputGroup label="CRM Webhook URL">
                         <StyledInput value={config.integrations?.crmWebhookUrl || ''} onChange={e => onUpdateConfig({...config, integrations: {...config.integrations, crmWebhookUrl: e.target.value}})} placeholder="https://..." />
                    </InputGroup>
                    
                    <div className="pt-6 border-t border-white/5">
                        <SectionHeader title="Внешний вид" />
                        
                        <div className="bg-[#14161B] p-6 rounded-[2.5rem] border border-white/5 group relative overflow-hidden">
                            {/* Decorative background for the settings block */}
                            <div className="absolute top-0 right-0 w-32 h-32 bg-[#6C5DD3]/5 rounded-full blur-3xl pointer-events-none transition-opacity group-hover:opacity-20 opacity-0"></div>

                            <div className="flex flex-col sm:flex-row items-center justify-between gap-6">
                                <div className="flex items-center gap-4">
                                    <div className="w-14 h-14 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-3xl shadow-inner relative overflow-hidden group/icon">
                                        <div className="absolute inset-0 bg-[#6C5DD3]/10 opacity-0 group-hover/icon:opacity-100 transition-opacity"></div>
                                        {currentUser.theme === 'DARK' ? '🌙' : '☀️'}
                                    </div>
                                    <div>
                                        <h4 className="font-black text-white text-lg tracking-tight">Тема интерфейса</h4>
                                        <p className="text-white/40 text-xs font-bold uppercase tracking-widest mt-0.5">Визуальный режим системы</p>
                                    </div>
                                </div>

                                {/* PREMIUM THEME TOGGLE REIMAGINED */}
                                <button 
                                    onClick={() => {
                                        onUpdateCurrentUser({ theme: currentUser.theme === 'DARK' ? 'LIGHT' : 'DARK' });
                                        telegram.haptic('selection');
                                    }}
                                    className={`
                                        relative w-28 h-12 rounded-full p-1 cursor-pointer transition-all duration-700 ease-[cubic-bezier(0.23,1,0.32,1)] shadow-2xl border border-white/10 group/toggle overflow-hidden
                                        ${currentUser.theme === 'DARK' 
                                            ? 'bg-[#0f172a]' // Night Sky
                                            : 'bg-gradient-to-b from-[#4facfe] to-[#00f2fe]' // Day Sky
                                        }
                                    `}
                                >
                                    {/* STARS (Visible in DARK) */}
                                    <div className={`absolute inset-0 transition-opacity duration-700 ${currentUser.theme === 'DARK' ? 'opacity-100' : 'opacity-0'}`}>
                                        <div className="absolute top-2 left-6 w-0.5 h-0.5 bg-white rounded-full animate-pulse"></div>
                                        <div className="absolute top-5 left-10 w-1 h-1 bg-white rounded-full animate-pulse delay-75"></div>
                                        <div className="absolute bottom-3 left-4 w-0.5 h-0.5 bg-white rounded-full opacity-50"></div>
                                        <div className="absolute top-2 right-8 w-0.5 h-0.5 bg-white rounded-full animate-pulse delay-150"></div>
                                        <div className="absolute bottom-4 right-12 w-1 h-1 bg-white rounded-full animate-pulse"></div>
                                        {/* Shooting star */}
                                        <div className="absolute top-2 left-20 w-8 h-[1px] bg-gradient-to-r from-transparent via-white to-transparent -rotate-45 animate-[shooting-star_3s_infinite]"></div>
                                    </div>

                                    {/* CLOUDS (Visible in LIGHT) */}
                                    <div className={`absolute inset-0 transition-opacity duration-700 ${currentUser.theme === 'DARK' ? 'opacity-0' : 'opacity-100'}`}>
                                        <div className="absolute top-2 right-4 w-6 h-2 bg-white/40 rounded-full blur-[2px]"></div>
                                        <div className="absolute bottom-3 right-8 w-8 h-3 bg-white/30 rounded-full blur-[2px]"></div>
                                        <div className="absolute top-4 left-4 w-5 h-2 bg-white/40 rounded-full blur-[2px]"></div>
                                    </div>

                                    {/* KNOB CONTAINER */}
                                    <div className={`
                                        relative w-10 h-10 rounded-full shadow-[0_0_15px_rgba(0,0,0,0.2)] transform transition-transform duration-700 cubic-bezier(0.34, 1.56, 0.64, 1) flex items-center justify-center overflow-hidden z-10
                                        ${currentUser.theme === 'DARK' 
                                            ? 'translate-x-[4rem] bg-[#1e293b]' // Night Knob Bg
                                            : 'translate-x-0 bg-[#FDB813]' // Sun Color
                                        }
                                    `}>
                                        {/* SUN FACE (Visible in LIGHT) */}
                                        <div className={`absolute inset-0 flex items-center justify-center transition-all duration-500 ${currentUser.theme === 'DARK' ? 'opacity-0 scale-50 rotate-180' : 'opacity-100 scale-100 rotate-0'}`}>
                                             <div className="w-full h-full rounded-full bg-gradient-to-br from-[#FDB813] to-[#F59E0B] relative">
                                                 {/* Rays (pseudo) */}
                                                 <div className="absolute inset-0 rounded-full border-2 border-dashed border-white/30 animate-[spin_10s_linear_infinite]"></div>
                                             </div>
                                        </div>

                                        {/* MOON FACE (Visible in DARK) */}
                                        <div className={`absolute inset-0 flex items-center justify-center transition-all duration-500 ${currentUser.theme === 'DARK' ? 'opacity-100 scale-100 rotate-0' : 'opacity-0 scale-50 -rotate-180'}`}>
                                             <div className="w-6 h-6 rounded-full bg-transparent shadow-[inset_-8px_-4px_0px_0px_#fbbf24] rotate-[20deg]"></div>
                                             {/* Craters */}
                                             <div className="absolute top-2 right-3 w-1 h-1 bg-white/10 rounded-full"></div>
                                             <div className="absolute bottom-3 right-4 w-1.5 h-1.5 bg-white/10 rounded-full"></div>
                                        </div>
                                    </div>
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
      </div>
    );
  };
