
import React from 'react';
import { AppConfig, Module, UserProgress, Material, Stream, CalendarEvent, ArenaScenario } from '../types';
import { Button } from './Button';

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
  onUpdateCurrentUser: (user: Partial<UserProgress>) => void;
  activeSubTab: 'OVERVIEW' | 'COURSE' | 'MATERIALS' | 'STREAMS' | 'USERS' | 'SETTINGS' | 'ARENA' | 'CALENDAR' | 'NEURAL_CORE' | 'DATABASE' | 'DEPLOY';
  addToast: (type: 'success' | 'error' | 'info', message: string, link?: string) => void;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({ 
  config, 
  onUpdateConfig, 
  modules, 
  onUpdateModules, 
  materials,
  onUpdateMaterials,
  streams,
  onUpdateStreams,
  events,
  onUpdateEvents,
  scenarios,
  onUpdateScenarios,
  users, 
  onUpdateUsers,
  currentUser,
  activeSubTab,
  addToast
}) => {

  // Helper to calculate total lessons
  const totalLessons = modules.reduce((acc, m) => acc + m.lessons.length, 0);

  const renderOverview = () => (
    <div className="space-y-6 animate-fade-in">
        <div className="grid grid-cols-2 gap-4">
            <div className="bg-white dark:bg-[#14161B] p-5 rounded-[2rem] border border-slate-200 dark:border-white/5">
                <div className="text-[#6C5DD3] text-2xl mb-2">👥</div>
                <h3 className="text-3xl font-black text-slate-800 dark:text-white">{users.length}</h3>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Всего бойцов</p>
            </div>
            <div className="bg-white dark:bg-[#14161B] p-5 rounded-[2rem] border border-slate-200 dark:border-white/5">
                <div className="text-[#6C5DD3] text-2xl mb-2">📦</div>
                <h3 className="text-3xl font-black text-slate-800 dark:text-white">{modules.length}</h3>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Модулей</p>
            </div>
            <div className="bg-white dark:bg-[#14161B] p-5 rounded-[2rem] border border-slate-200 dark:border-white/5">
                <div className="text-[#6C5DD3] text-2xl mb-2">📚</div>
                <h3 className="text-3xl font-black text-slate-800 dark:text-white">{totalLessons}</h3>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Уроков</p>
            </div>
            <div className="bg-white dark:bg-[#14161B] p-5 rounded-[2rem] border border-slate-200 dark:border-white/5">
                <div className="text-[#6C5DD3] text-2xl mb-2">🤖</div>
                <h3 className="text-xl font-black text-slate-800 dark:text-white truncate">{config.aiConfig.activeProvider}</h3>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">AI Engine</p>
            </div>
        </div>
    </div>
  );

  const renderUsers = () => (
    <div className="space-y-4 animate-fade-in">
        <h2 className="text-xl font-black text-slate-900 dark:text-white mb-4">Управление составом</h2>
        <div className="space-y-3">
            {users.map((u, idx) => (
                <div key={idx} className="bg-white dark:bg-[#14161B] p-4 rounded-2xl border border-slate-200 dark:border-white/5 flex justify-between items-center">
                    <div className="flex items-center gap-3">
                        <img src={u.avatarUrl || `https://ui-avatars.com/api/?name=${u.name}`} className="w-10 h-10 rounded-full bg-slate-200 object-cover" />
                        <div>
                            <p className="font-bold text-sm text-slate-900 dark:text-white">{u.name}</p>
                            <p className="text-[10px] text-slate-500 uppercase">{u.role} • Lvl {u.level}</p>
                        </div>
                    </div>
                    <div className="flex gap-2">
                        {u.role !== 'ADMIN' && (
                            <button 
                                onClick={() => {
                                    const newRole = u.role === 'STUDENT' ? 'CURATOR' : 'STUDENT';
                                    const updatedUsers = [...users];
                                    updatedUsers[idx] = { ...u, role: newRole };
                                    onUpdateUsers(updatedUsers);
                                    addToast('info', `Роль изменена на ${newRole}`);
                                }}
                                className="px-3 py-1 bg-[#6C5DD3]/10 text-[#6C5DD3] rounded-lg text-[10px] font-bold uppercase hover:bg-[#6C5DD3]/20 transition-colors"
                            >
                                {u.role === 'STUDENT' ? 'Make Curator' : 'Demote'}
                            </button>
                        )}
                    </div>
                </div>
            ))}
        </div>
    </div>
  );

  const renderCourse = () => (
    <div className="space-y-4 animate-fade-in">
        <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-black text-slate-900 dark:text-white">Структура курса</h2>
            <Button className="!py-2 !px-4 !text-xs">+ Модуль</Button>
        </div>
        <div className="space-y-4">
            {modules.map((mod) => (
                <div key={mod.id} className="bg-white dark:bg-[#14161B] p-5 rounded-[2rem] border border-slate-200 dark:border-white/5">
                    <div className="flex justify-between items-start mb-2">
                        <h3 className="font-black text-slate-900 dark:text-white">{mod.title}</h3>
                        <span className="text-[10px] font-bold bg-slate-100 dark:bg-white/10 px-2 py-1 rounded text-slate-500">{mod.lessons.length} уроков</span>
                    </div>
                    <p className="text-xs text-slate-500 mb-4">{mod.description}</p>
                    <div className="space-y-2">
                        {mod.lessons.map(les => (
                            <div key={les.id} className="pl-4 border-l-2 border-slate-200 dark:border-white/10 text-xs py-1 text-slate-600 dark:text-slate-400">
                                {les.title}
                            </div>
                        ))}
                    </div>
                </div>
            ))}
        </div>
    </div>
  );

  const renderMaterials = () => (
    <div className="space-y-4 animate-fade-in">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-black text-slate-900 dark:text-white">База Знаний</h2>
        <Button className="!py-2 !px-4 !text-xs" onClick={() => addToast('info', 'Функция добавления в разработке')}>+ Материал</Button>
      </div>
      {materials.map(mat => (
        <div key={mat.id} className="bg-white dark:bg-[#14161B] p-4 rounded-2xl border border-slate-200 dark:border-white/5 flex justify-between items-center">
           <div>
             <h4 className="font-bold text-sm dark:text-white">{mat.title}</h4>
             <p className="text-[10px] text-slate-500 uppercase">{mat.type}</p>
           </div>
           <button className="text-red-500 text-xs font-bold uppercase" onClick={() => {
             onUpdateMaterials(materials.filter(m => m.id !== mat.id));
             addToast('success', 'Материал удален');
           }}>Delete</button>
        </div>
      ))}
    </div>
  );

  const renderStreams = () => (
    <div className="space-y-4 animate-fade-in">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-black text-slate-900 dark:text-white">Эфиры</h2>
        <Button className="!py-2 !px-4 !text-xs" onClick={() => addToast('info', 'Функция добавления в разработке')}>+ Стрим</Button>
      </div>
      {streams.map(str => (
        <div key={str.id} className="bg-white dark:bg-[#14161B] p-4 rounded-2xl border border-slate-200 dark:border-white/5 flex justify-between items-center">
           <div>
             <h4 className="font-bold text-sm dark:text-white">{str.title}</h4>
             <p className="text-[10px] text-slate-500 uppercase">{new Date(str.date).toLocaleDateString()} • {str.status}</p>
           </div>
           <button className="text-red-500 text-xs font-bold uppercase" onClick={() => {
             onUpdateStreams(streams.filter(s => s.id !== str.id));
             addToast('success', 'Стрим удален');
           }}>Delete</button>
        </div>
      ))}
    </div>
  );

  const renderScenarios = () => (
    <div className="space-y-4 animate-fade-in">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-black text-slate-900 dark:text-white">Сценарии Арены</h2>
        <Button className="!py-2 !px-4 !text-xs" onClick={() => addToast('info', 'Функция добавления в разработке')}>+ Сценарий</Button>
      </div>
      {scenarios.map(sc => (
        <div key={sc.id} className="bg-white dark:bg-[#14161B] p-4 rounded-2xl border border-slate-200 dark:border-white/5">
           <div className="flex justify-between items-start">
             <div>
                <h4 className="font-bold text-sm dark:text-white">{sc.title}</h4>
                <p className="text-[10px] text-slate-500 uppercase">{sc.difficulty} • {sc.clientRole}</p>
             </div>
             <button className="text-red-500 text-xs font-bold uppercase" onClick={() => {
               onUpdateScenarios(scenarios.filter(s => s.id !== sc.id));
               addToast('success', 'Сценарий удален');
             }}>Delete</button>
           </div>
           <p className="text-xs text-slate-500 mt-2">{sc.objective}</p>
        </div>
      ))}
    </div>
  );

  const renderSettings = () => (
    <div className="space-y-6 animate-fade-in">
        <h2 className="text-xl font-black text-slate-900 dark:text-white mb-4">Глобальные настройки</h2>
        
        <div className="bg-white dark:bg-[#14161B] p-6 rounded-[2rem] border border-slate-200 dark:border-white/5 space-y-4">
            <div>
                <label className="block text-[10px] font-black uppercase text-slate-400 mb-2">Название приложения</label>
                <input 
                    value={config.appName}
                    onChange={(e) => onUpdateConfig({...config, appName: e.target.value})}
                    className="w-full bg-slate-50 dark:bg-black/20 p-3 rounded-xl text-sm font-bold text-slate-900 dark:text-white border border-slate-200 dark:border-white/10"
                />
            </div>
            
            <div>
                <label className="block text-[10px] font-black uppercase text-slate-400 mb-2">Системная инструкция AI</label>
                <textarea 
                    value={config.systemInstruction}
                    onChange={(e) => onUpdateConfig({...config, systemInstruction: e.target.value})}
                    className="w-full bg-slate-50 dark:bg-black/20 p-3 rounded-xl text-sm font-medium text-slate-900 dark:text-white border border-slate-200 dark:border-white/10 h-32 resize-none"
                />
            </div>

            <div className="flex items-center justify-between pt-4 border-t border-slate-100 dark:border-white/5">
                <div>
                    <h4 className="font-bold text-slate-900 dark:text-white text-sm">Технические работы</h4>
                    <p className="text-[10px] text-slate-500">Включить режим обслуживания</p>
                </div>
                <div 
                    onClick={() => onUpdateConfig({...config, features: {...config.features, maintenanceMode: !config.features.maintenanceMode}})}
                    className={`w-12 h-6 rounded-full relative cursor-pointer transition-colors ${config.features.maintenanceMode ? 'bg-[#6C5DD3]' : 'bg-slate-300 dark:bg-white/10'}`}
                >
                    <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${config.features.maintenanceMode ? 'left-7' : 'left-1'}`}></div>
                </div>
            </div>
        </div>
    </div>
  );

  // Placeholder for unimplemented tabs
  const renderPlaceholder = (title: string) => (
      <div className="flex flex-col items-center justify-center py-20 text-center animate-fade-in">
          <div className="text-4xl mb-4 opacity-30">🚧</div>
          <h3 className="text-lg font-black text-slate-900 dark:text-white mb-2">{title}</h3>
          <p className="text-xs text-slate-500 uppercase tracking-widest">Раздел в разработке</p>
      </div>
  );

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#050505] pb-32 pt-[calc(var(--safe-top)+20px)] px-6 transition-colors duration-300">
        <div className="flex justify-between items-center mb-8">
            <div>
                <span className="text-[#6C5DD3] text-[10px] font-black uppercase tracking-[0.3em] mb-1 block">Command Center</span>
                <h1 className="text-3xl font-black text-slate-900 dark:text-white tracking-tighter">ПАНЕЛЬ <br/><span className="text-slate-400 dark:text-white/30">АДМИНА</span></h1>
            </div>
            <div className="w-12 h-12 bg-[#6C5DD3]/10 text-[#6C5DD3] rounded-2xl flex items-center justify-center text-2xl border border-[#6C5DD3]/20">
                🛠️
            </div>
        </div>

        {/* Content Area */}
        <div>
            {activeSubTab === 'OVERVIEW' && renderOverview()}
            {activeSubTab === 'USERS' && renderUsers()}
            {activeSubTab === 'COURSE' && renderCourse()}
            {activeSubTab === 'MATERIALS' && renderMaterials()}
            {activeSubTab === 'STREAMS' && renderStreams()}
            {activeSubTab === 'ARENA' && renderScenarios()}
            {activeSubTab === 'SETTINGS' && renderSettings()}
            
            {/* Placeholders for others */}
            {['CALENDAR', 'NEURAL_CORE', 'DATABASE', 'DEPLOY'].includes(activeSubTab) && renderPlaceholder(activeSubTab)}
        </div>
    </div>
  );
};
