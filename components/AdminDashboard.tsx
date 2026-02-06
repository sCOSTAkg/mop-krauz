
import React, { useState } from 'react';
import { AppConfig, Module, UserProgress, Material, Stream, CalendarEvent, ArenaScenario, EventType, AppNotification, Lesson, UserRole } from '../types';
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
  activeSubTab: 'OVERVIEW' | 'COURSE' | 'MATERIALS' | 'STREAMS' | 'USERS' | 'SETTINGS' | 'ARENA' | 'CALENDAR';
  onSendBroadcast: (notif: AppNotification) => void;
  addToast: (type: 'success' | 'error' | 'info', message: string, link?: string) => void;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({ 
  config, onUpdateConfig, 
  modules, onUpdateModules, 
  materials, onUpdateMaterials,
  streams, onUpdateStreams,
  events, onUpdateEvents,
  scenarios, onUpdateScenarios,
  users, onUpdateUsers,
  activeSubTab, onSendBroadcast, addToast
}) => {

  // --- STATE FOR EDITORS ---
  const [editingModuleId, setEditingModuleId] = useState<string | null>(null);
  
  // --- USERS MANAGEMENT ---
  const renderUsers = () => {
      const toggleRole = (u: UserProgress) => {
          const roles: UserRole[] = ['STUDENT', 'CURATOR', 'ADMIN'];
          const currentIdx = roles.indexOf(u.role);
          const nextRole = roles[(currentIdx + 1) % roles.length];
          
          const updated = users.map(user => user.telegramId === u.telegramId ? { ...user, role: nextRole } : user);
          onUpdateUsers(updated);
          addToast('success', `Роль ${u.name} изменена на ${nextRole}`);
      };

      const deleteUser = (id: string) => {
          if(confirm('Удалить пользователя? Это необратимо.')) {
              onUpdateUsers(users.filter(u => u.telegramId !== id));
              addToast('success', 'Пользователь удален');
          }
      };

      return (
        <div className="space-y-4 pb-20 animate-fade-in">
            <h2 className="text-xl font-black uppercase text-slate-900 dark:text-white">Личный состав ({users.length})</h2>
            <div className="space-y-3">
                {users.map((u, idx) => (
                    <div key={idx} className="bg-white dark:bg-[#14161B] p-4 rounded-2xl border border-slate-200 dark:border-white/5 flex justify-between items-center">
                        <div className="flex items-center gap-3">
                            <img src={u.avatarUrl || `https://ui-avatars.com/api/?name=${u.name}`} className="w-10 h-10 rounded-full bg-slate-200 object-cover" />
                            <div>
                                <p className="font-bold text-sm text-slate-900 dark:text-white">{u.name}</p>
                                <p className="text-[10px] text-slate-500 uppercase font-bold">{u.role} • Lvl {u.level}</p>
                            </div>
                        </div>
                        <div className="flex gap-2">
                            <button onClick={() => toggleRole(u)} className="px-3 py-1 bg-[#6C5DD3]/10 text-[#6C5DD3] rounded-lg text-[10px] font-bold uppercase">Role</button>
                            <button onClick={() => deleteUser(u.telegramId!)} className="px-3 py-1 bg-red-500/10 text-red-500 rounded-lg text-[10px] font-bold uppercase">✕</button>
                        </div>
                    </div>
                ))}
            </div>
        </div>
      );
  };

  // --- COURSE MANAGEMENT ---
  const renderCourse = () => {
      const addNewModule = () => {
          const newMod: Module = {
              id: `mod-${Date.now()}`,
              title: 'Новый Модуль',
              description: 'Описание модуля',
              minLevel: 1,
              category: 'GENERAL',
              imageUrl: '',
              lessons: []
          };
          onUpdateModules([...modules, newMod]);
      };

      const updateModule = (id: string, field: keyof Module, value: any) => {
          onUpdateModules(modules.map(m => m.id === id ? { ...m, [field]: value } : m));
      };

      const deleteModule = (id: string) => {
          if(confirm('Удалить модуль и все уроки?')) {
              onUpdateModules(modules.filter(m => m.id !== id));
          }
      };

      const addLesson = (moduleId: string) => {
          const newLesson: Lesson = {
              id: `les-${Date.now()}`,
              title: 'Новый Урок',
              description: 'Описание',
              content: '# Заголовок\nТекст урока...',
              xpReward: 100,
              homeworkType: 'TEXT',
              homeworkTask: 'Задание...',
              aiGradingInstruction: 'Проверь...'
          };
          const modIndex = modules.findIndex(m => m.id === moduleId);
          const updatedModules = [...modules];
          updatedModules[modIndex].lessons.push(newLesson);
          onUpdateModules(updatedModules);
      };

      const updateLesson = (moduleId: string, lessonId: string, field: keyof Lesson, value: any) => {
          const updatedModules = modules.map(m => {
              if (m.id !== moduleId) return m;
              return {
                  ...m,
                  lessons: m.lessons.map(l => l.id === lessonId ? { ...l, [field]: value } : l)
              };
          });
          onUpdateModules(updatedModules);
      };

      const deleteLesson = (moduleId: string, lessonId: string) => {
          const updatedModules = modules.map(m => {
              if (m.id !== moduleId) return m;
              return { ...m, lessons: m.lessons.filter(l => l.id !== lessonId) };
          });
          onUpdateModules(updatedModules);
      };

      return (
          <div className="space-y-6 pb-20 animate-fade-in">
              <div className="flex justify-between items-center">
                  <h2 className="text-xl font-black uppercase text-slate-900 dark:text-white">Модули ({modules.length})</h2>
                  <Button onClick={addNewModule} className="!py-2 !px-4 !text-xs">+ Модуль</Button>
              </div>

              {modules.map(mod => (
                  <div key={mod.id} className="bg-white dark:bg-[#14161B] rounded-2xl border border-slate-200 dark:border-white/5 overflow-hidden">
                      {/* Module Header */}
                      <div className="p-4 bg-slate-50 dark:bg-white/5 flex flex-col gap-3">
                          <input 
                              value={mod.title} 
                              onChange={(e) => updateModule(mod.id, 'title', e.target.value)}
                              className="bg-transparent text-lg font-black text-slate-900 dark:text-white w-full border-b border-transparent focus:border-[#6C5DD3] outline-none"
                          />
                          <textarea 
                              value={mod.description}
                              onChange={(e) => updateModule(mod.id, 'description', e.target.value)}
                              className="bg-transparent text-xs text-slate-500 w-full resize-none h-10 outline-none"
                          />
                          <div className="flex justify-between items-center mt-2">
                              <div className="flex gap-2">
                                  <input 
                                      type="number" 
                                      value={mod.minLevel}
                                      onChange={(e) => updateModule(mod.id, 'minLevel', parseInt(e.target.value))}
                                      className="w-16 bg-slate-200 dark:bg-black/20 rounded px-2 py-1 text-xs font-bold"
                                      placeholder="Lvl"
                                  />
                                  <select 
                                      value={mod.category}
                                      onChange={(e) => updateModule(mod.id, 'category', e.target.value)}
                                      className="bg-slate-200 dark:bg-black/20 rounded px-2 py-1 text-xs font-bold"
                                  >
                                      <option value="GENERAL">General</option>
                                      <option value="SALES">Sales</option>
                                      <option value="PSYCHOLOGY">Psychology</option>
                                      <option value="TACTICS">Tactics</option>
                                  </select>
                              </div>
                              <div className="flex gap-2">
                                  <button onClick={() => setEditingModuleId(editingModuleId === mod.id ? null : mod.id)} className="text-[10px] font-bold uppercase text-[#6C5DD3] bg-[#6C5DD3]/10 px-3 py-1 rounded">
                                      {editingModuleId === mod.id ? 'Скрыть уроки' : `Уроки (${mod.lessons.length})`}
                                  </button>
                                  <button onClick={() => deleteModule(mod.id)} className="text-[10px] font-bold uppercase text-red-500 bg-red-500/10 px-3 py-1 rounded">Удалить</button>
                              </div>
                          </div>
                      </div>

                      {/* Lessons List */}
                      {editingModuleId === mod.id && (
                          <div className="p-4 space-y-4 border-t border-slate-200 dark:border-white/5 bg-slate-100 dark:bg-black/20">
                              {mod.lessons.map(les => (
                                  <div key={les.id} className="bg-white dark:bg-[#1F2128] p-4 rounded-xl border border-slate-200 dark:border-white/5">
                                      <div className="flex justify-between mb-2">
                                          <input 
                                              value={les.title} 
                                              onChange={(e) => updateLesson(mod.id, les.id, 'title', e.target.value)}
                                              className="font-bold text-sm bg-transparent outline-none w-2/3"
                                          />
                                          <button onClick={() => deleteLesson(mod.id, les.id)} className="text-red-500 text-xs">✕</button>
                                      </div>
                                      <div className="grid grid-cols-2 gap-2 mb-2">
                                          <select 
                                              value={les.homeworkType}
                                              onChange={(e) => updateLesson(mod.id, les.id, 'homeworkType', e.target.value)}
                                              className="bg-slate-50 dark:bg-white/5 text-[10px] p-1 rounded"
                                          >
                                              <option value="TEXT">Text HW</option>
                                              <option value="PHOTO">Photo HW</option>
                                              <option value="VIDEO">Video HW</option>
                                              <option value="FILE">PDF HW</option>
                                          </select>
                                          <input 
                                              type="number"
                                              value={les.xpReward}
                                              onChange={(e) => updateLesson(mod.id, les.id, 'xpReward', parseInt(e.target.value))}
                                              className="bg-slate-50 dark:bg-white/5 text-[10px] p-1 rounded"
                                              placeholder="XP"
                                          />
                                      </div>
                                      <textarea 
                                          value={les.content}
                                          onChange={(e) => updateLesson(mod.id, les.id, 'content', e.target.value)}
                                          className="w-full h-20 bg-slate-50 dark:bg-white/5 rounded p-2 text-[10px] resize-none mb-2 font-mono"
                                          placeholder="Markdown content..."
                                      />
                                      <input 
                                          value={les.videoUrl || ''}
                                          onChange={(e) => updateLesson(mod.id, les.id, 'videoUrl', e.target.value)}
                                          className="w-full bg-slate-50 dark:bg-white/5 rounded p-2 text-[10px] mb-2"
                                          placeholder="Video URL (YouTube/File)"
                                      />
                                      <textarea 
                                          value={les.homeworkTask}
                                          onChange={(e) => updateLesson(mod.id, les.id, 'homeworkTask', e.target.value)}
                                          className="w-full h-10 bg-slate-50 dark:bg-white/5 rounded p-2 text-[10px] resize-none"
                                          placeholder="Задание..."
                                      />
                                  </div>
                              ))}
                              <Button onClick={() => addLesson(mod.id)} fullWidth variant="secondary" className="!py-2 !text-xs">+ Добавить урок</Button>
                          </div>
                      )}
                  </div>
              ))}
          </div>
      );
  };

  // --- CONTENT MANAGEMENT (Materials, Streams, Scenarios) ---
  const renderContent = () => {
      // Materials Logic
      const addMat = () => onUpdateMaterials([...materials, { id: Date.now().toString(), title: 'New Material', type: 'LINK', url: '', description: '' }]);
      const updateMat = (id: string, f: keyof Material, v: any) => onUpdateMaterials(materials.map(m => m.id === id ? { ...m, [f]: v } : m));
      
      // Streams Logic
      const addStream = () => onUpdateStreams([...streams, { id: Date.now().toString(), title: 'New Stream', date: new Date().toISOString(), status: 'UPCOMING', youtubeUrl: '' }]);
      const updateStream = (id: string, f: keyof Stream, v: any) => onUpdateStreams(streams.map(s => s.id === id ? { ...s, [f]: v } : s));

      // Scenario Logic
      const addScen = () => onUpdateScenarios([...scenarios, { id: Date.now().toString(), title: 'New Scenario', difficulty: 'Easy', clientRole: '', objective: '', initialMessage: '' }]);
      const updateScen = (id: string, f: keyof ArenaScenario, v: any) => onUpdateScenarios(scenarios.map(s => s.id === id ? { ...s, [f]: v } : s));

      return (
          <div className="space-y-8 pb-20 animate-fade-in">
              {/* Materials */}
              <div>
                  <div className="flex justify-between mb-2"><h3 className="font-bold uppercase text-sm">База Знаний</h3><button onClick={addMat} className="text-[#6C5DD3] text-xs font-bold">+</button></div>
                  <div className="space-y-2">
                      {materials.map(m => (
                          <div key={m.id} className="bg-white dark:bg-[#14161B] p-3 rounded-xl border border-slate-200 dark:border-white/5 text-xs space-y-2">
                              <div className="flex gap-2">
                                  <input value={m.title} onChange={e => updateMat(m.id, 'title', e.target.value)} className="font-bold flex-1 bg-transparent" placeholder="Title" />
                                  <select value={m.type} onChange={e => updateMat(m.id, 'type', e.target.value)} className="bg-transparent"><option value="LINK">Link</option><option value="PDF">PDF</option><option value="VIDEO">Video</option></select>
                                  <button onClick={() => onUpdateMaterials(materials.filter(x => x.id !== m.id))} className="text-red-500">✕</button>
                              </div>
                              <input value={m.url} onChange={e => updateMat(m.id, 'url', e.target.value)} className="w-full bg-slate-50 dark:bg-white/5 p-1 rounded" placeholder="URL" />
                          </div>
                      ))}
                  </div>
              </div>

              {/* Streams */}
              <div>
                  <div className="flex justify-between mb-2"><h3 className="font-bold uppercase text-sm">Эфиры</h3><button onClick={addStream} className="text-[#6C5DD3] text-xs font-bold">+</button></div>
                  <div className="space-y-2">
                      {streams.map(s => (
                          <div key={s.id} className="bg-white dark:bg-[#14161B] p-3 rounded-xl border border-slate-200 dark:border-white/5 text-xs space-y-2">
                              <div className="flex gap-2">
                                  <input value={s.title} onChange={e => updateStream(s.id, 'title', e.target.value)} className="font-bold flex-1 bg-transparent" />
                                  <select value={s.status} onChange={e => updateStream(s.id, 'status', e.target.value)} className="bg-transparent"><option value="UPCOMING">Upcoming</option><option value="LIVE">Live</option><option value="PAST">Past</option></select>
                                  <button onClick={() => onUpdateStreams(streams.filter(x => x.id !== s.id))} className="text-red-500">✕</button>
                              </div>
                              <input type="datetime-local" value={s.date.substring(0, 16)} onChange={e => updateStream(s.id, 'date', new Date(e.target.value).toISOString())} className="w-full bg-slate-50 dark:bg-white/5 p-1 rounded" />
                              <input value={s.youtubeUrl} onChange={e => updateStream(s.id, 'youtubeUrl', e.target.value)} className="w-full bg-slate-50 dark:bg-white/5 p-1 rounded" placeholder="Stream URL" />
                          </div>
                      ))}
                  </div>
              </div>

              {/* Scenarios */}
              <div>
                  <div className="flex justify-between mb-2"><h3 className="font-bold uppercase text-sm">Арена</h3><button onClick={addScen} className="text-[#6C5DD3] text-xs font-bold">+</button></div>
                  <div className="space-y-2">
                      {scenarios.map(s => (
                          <div key={s.id} className="bg-white dark:bg-[#14161B] p-3 rounded-xl border border-slate-200 dark:border-white/5 text-xs space-y-2">
                              <div className="flex gap-2">
                                  <input value={s.title} onChange={e => updateScen(s.id, 'title', e.target.value)} className="font-bold flex-1 bg-transparent" />
                                  <select value={s.difficulty} onChange={e => updateScen(s.id, 'difficulty', e.target.value)} className="bg-transparent"><option value="Easy">Easy</option><option value="Medium">Medium</option><option value="Hard">Hard</option></select>
                                  <button onClick={() => onUpdateScenarios(scenarios.filter(x => x.id !== s.id))} className="text-red-500">✕</button>
                              </div>
                              <input value={s.clientRole} onChange={e => updateScen(s.id, 'clientRole', e.target.value)} className="w-full bg-slate-50 dark:bg-white/5 p-1 rounded" placeholder="Роль клиента" />
                              <textarea value={s.objective} onChange={e => updateScen(s.id, 'objective', e.target.value)} className="w-full bg-slate-50 dark:bg-white/5 p-1 rounded h-10 resize-none" placeholder="Цель" />
                          </div>
                      ))}
                  </div>
              </div>
          </div>
      );
  };

  // --- SCHEDULE MANAGEMENT ---
  const renderCalendar = () => {
      const addEv = () => onUpdateEvents([...events, { id: Date.now().toString(), title: 'New Event', date: new Date().toISOString(), type: EventType.OTHER, description: '' }]);
      const updateEv = (id: string, f: keyof CalendarEvent, v: any) => onUpdateEvents(events.map(e => e.id === id ? { ...e, [f]: v } : e));

      return (
          <div className="space-y-4 pb-20 animate-fade-in">
              <div className="flex justify-between items-center"><h2 className="text-xl font-black uppercase text-slate-900 dark:text-white">Календарь</h2><Button onClick={addEv} className="!py-2 !px-4 !text-xs">+</Button></div>
              {events.map(ev => (
                  <div key={ev.id} className="bg-white dark:bg-[#14161B] p-4 rounded-xl border border-slate-200 dark:border-white/5 text-xs space-y-2">
                      <div className="flex gap-2">
                          <input value={ev.title} onChange={e => updateEv(ev.id, 'title', e.target.value)} className="font-bold flex-1 bg-transparent text-sm" />
                          <select value={ev.type} onChange={e => updateEv(ev.id, 'type', e.target.value)} className="bg-transparent"><option value="WEBINAR">Webinar</option><option value="HOMEWORK">Deadline</option><option value="OTHER">Other</option></select>
                          <button onClick={() => onUpdateEvents(events.filter(e => e.id !== ev.id))} className="text-red-500">✕</button>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                          <input type="datetime-local" value={new Date(ev.date).toISOString().slice(0, 16)} onChange={e => updateEv(ev.id, 'date', new Date(e.target.value).toISOString())} className="bg-slate-50 dark:bg-white/5 p-2 rounded" />
                          <input type="number" value={ev.durationMinutes || 60} onChange={e => updateEv(ev.id, 'durationMinutes', parseInt(e.target.value))} className="bg-slate-50 dark:bg-white/5 p-2 rounded" placeholder="Min" />
                      </div>
                      <textarea value={ev.description} onChange={e => updateEv(ev.id, 'description', e.target.value)} className="w-full bg-slate-50 dark:bg-white/5 p-2 rounded resize-none h-16" placeholder="Описание..." />
                  </div>
              ))}
          </div>
      );
  };

  // --- SYSTEM (CONFIG + NOTIFICATIONS) ---
  const renderSettings = () => {
      const [notifTitle, setNotifTitle] = useState('');
      const [notifMsg, setNotifMsg] = useState('');
      const [notifType, setNotifType] = useState<AppNotification['type']>('INFO');

      const sendNotif = () => {
          if(!notifTitle || !notifMsg) return;
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
      };

      return (
          <div className="space-y-8 pb-20 animate-fade-in">
              <div className="bg-white dark:bg-[#14161B] p-5 rounded-[2rem] border border-slate-200 dark:border-white/5 space-y-4">
                  <h3 className="font-black text-slate-900 dark:text-white uppercase">Оповещения</h3>
                  <input value={notifTitle} onChange={e => setNotifTitle(e.target.value)} className="w-full bg-slate-50 dark:bg-black/20 p-3 rounded-xl text-sm font-bold border border-slate-200 dark:border-white/10" placeholder="Заголовок" />
                  <textarea value={notifMsg} onChange={e => setNotifMsg(e.target.value)} className="w-full bg-slate-50 dark:bg-black/20 p-3 rounded-xl text-sm border border-slate-200 dark:border-white/10 h-20 resize-none" placeholder="Сообщение для всех..." />
                  <div className="flex gap-2">
                      {['INFO', 'SUCCESS', 'WARNING', 'ALERT'].map(t => (
                          <button key={t} onClick={() => setNotifType(t as any)} className={`px-3 py-1 rounded-lg text-[10px] font-black uppercase border ${notifType === t ? 'bg-[#6C5DD3] text-white border-[#6C5DD3]' : 'border-slate-200 dark:border-white/10 text-slate-500'}`}>{t}</button>
                      ))}
                  </div>
                  <Button onClick={sendNotif} fullWidth>Отправить Всем</Button>
              </div>

              <div className="bg-white dark:bg-[#14161B] p-5 rounded-[2rem] border border-slate-200 dark:border-white/5 space-y-4">
                  <h3 className="font-black text-slate-900 dark:text-white uppercase">Конфигурация</h3>
                  <div>
                      <label className="block text-[10px] font-black uppercase text-slate-400 mb-2">Название</label>
                      <input value={config.appName} onChange={(e) => onUpdateConfig({...config, appName: e.target.value})} className="w-full bg-slate-50 dark:bg-black/20 p-3 rounded-xl text-sm font-bold" />
                  </div>
                  <div className="flex items-center justify-between pt-2">
                      <span className="text-sm font-bold">Режим обслуживания</span>
                      <div onClick={() => onUpdateConfig({...config, features: {...config.features, maintenanceMode: !config.features.maintenanceMode}})} className={`w-12 h-6 rounded-full relative cursor-pointer transition-colors ${config.features.maintenanceMode ? 'bg-[#6C5DD3]' : 'bg-slate-300 dark:bg-white/10'}`}>
                          <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${config.features.maintenanceMode ? 'left-7' : 'left-1'}`}></div>
                      </div>
                  </div>
              </div>
          </div>
      );
  };

  const renderOverview = () => {
    const totalLessons = modules.reduce((acc, m) => acc + m.lessons.length, 0);
    return (
    <div className="space-y-6 animate-fade-in">
        <div className="grid grid-cols-2 gap-4">
            <div className="bg-white dark:bg-[#14161B] p-5 rounded-[2rem] border border-slate-200 dark:border-white/5">
                <div className="text-[#6C5DD3] text-2xl mb-2">👥</div>
                <h3 className="text-3xl font-black text-slate-900 dark:text-white">{users.length}</h3>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Бойцов</p>
            </div>
            <div className="bg-white dark:bg-[#14161B] p-5 rounded-[2rem] border border-slate-200 dark:border-white/5">
                <div className="text-[#6C5DD3] text-2xl mb-2">📦</div>
                <h3 className="text-3xl font-black text-slate-900 dark:text-white">{modules.length}</h3>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Модулей</p>
            </div>
            <div className="bg-white dark:bg-[#14161B] p-5 rounded-[2rem] border border-slate-200 dark:border-white/5">
                <div className="text-[#6C5DD3] text-2xl mb-2">📅</div>
                <h3 className="text-3xl font-black text-slate-900 dark:text-white">{events.length}</h3>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Событий</p>
            </div>
            <div className="bg-white dark:bg-[#14161B] p-5 rounded-[2rem] border border-slate-200 dark:border-white/5">
                <div className="text-[#6C5DD3] text-2xl mb-2">📹</div>
                <h3 className="text-3xl font-black text-slate-900 dark:text-white">{streams.length}</h3>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Эфиров</p>
            </div>
        </div>
    </div>
  )};

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
            {activeSubTab === 'MATERIALS' && renderContent()}
            {activeSubTab === 'STREAMS' && renderContent()}
            {activeSubTab === 'ARENA' && renderContent()}
            {activeSubTab === 'CALENDAR' && renderCalendar()}
            {activeSubTab === 'SETTINGS' && renderSettings()}
        </div>
    </div>
  );
};
