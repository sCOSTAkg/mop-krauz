
import React, { useState } from 'react';
import { AppConfig, Module, UserProgress, Material, Stream, CalendarEvent, ArenaScenario, EventType, AppNotification, Lesson, UserRole, AIProviderId } from '../types';
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
  activeSubTab: 'OVERVIEW' | 'COURSE' | 'MATERIALS' | 'STREAMS' | 'USERS' | 'SETTINGS' | 'ARENA' | 'CALENDAR' | 'NEURAL_CORE' | 'DATABASE' | 'DEPLOY';
  onSendBroadcast: (notif: AppNotification) => void;
  notifications: AppNotification[];
  onClearNotifications: () => void;
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
  activeSubTab, onSendBroadcast, notifications, onClearNotifications, addToast
}) => {

  // --- LOCAL STATE FOR MODALS ---
  const [editingUser, setEditingUser] = useState<UserProgress | null>(null);
  const [editingModuleId, setEditingModuleId] = useState<string | null>(null);
  const [editingLesson, setEditingLesson] = useState<{moduleId: string, lesson: Lesson} | null>(null);

  // --- LOCAL STATE FOR NOTIFICATIONS ---
  const [notifTitle, setNotifTitle] = useState('');
  const [notifMsg, setNotifMsg] = useState('');
  const [notifType, setNotifType] = useState<AppNotification['type']>('INFO');

  // --- HELPER FOR MARKDOWN EDITOR ---
  const handleMarkdownInsert = (prefix: string, suffix: string, placeholder: string = 'text') => {
      if (!editingLesson) return;
      
      const textarea = document.getElementById('markdown-editor-area') as HTMLTextAreaElement;
      if (!textarea) return;

      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const text = editingLesson.lesson.content;
      
      const before = text.substring(0, start);
      const selection = text.substring(start, end) || placeholder;
      const after = text.substring(end, text.length);

      const newText = `${before}${prefix}${selection}${suffix}${after}`;
      
      setEditingLesson({
          ...editingLesson,
          lesson: { ...editingLesson.lesson, content: newText }
      });
      
      // Restore focus (timeout needed for React render cycle)
      setTimeout(() => {
          textarea.focus();
          textarea.setSelectionRange(start + prefix.length, start + prefix.length + selection.length);
      }, 0);
  };

  const handleImageInsert = () => {
      const url = prompt('Введите URL изображения:', 'https://');
      if (url) {
          handleMarkdownInsert('![Alt text](', url + ')', '');
      }
  };

  const handleLinkInsert = () => {
      const url = prompt('Введите URL ссылки:', 'https://');
      if (url) {
          handleMarkdownInsert('[', `](${url})`, 'Текст ссылки');
      }
  };

  // --- USERS MANAGEMENT ---
  const renderUsers = () => {
      const handleUserSave = (u: UserProgress) => {
          const updated = users.map(user => user.telegramId === u.telegramId ? u : user);
          onUpdateUsers(updated);
          setEditingUser(null);
          addToast('success', 'Профиль обновлен');
      };

      const deleteUser = (id: string) => {
          if(confirm('Удалить пользователя безвозвратно?')) {
              onUpdateUsers(users.filter(u => u.telegramId !== id));
              addToast('success', 'Пользователь удален');
          }
      };

      return (
        <div className="space-y-4 pb-20 animate-fade-in">
            {/* User Edit Modal */}
            {editingUser && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
                    <div className="bg-[#1F2128] w-full max-w-md rounded-[2rem] p-6 border border-white/10 space-y-4 shadow-2xl">
                        <h3 className="text-xl font-black text-white uppercase">Редактирование</h3>
                        <div>
                            <label className="text-[10px] uppercase text-gray-500 font-bold">Имя</label>
                            <input value={editingUser.name} onChange={e => setEditingUser({...editingUser, name: e.target.value})} className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-white outline-none focus:border-[#6C5DD3]" />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="text-[10px] uppercase text-gray-500 font-bold">XP</label>
                                <input type="number" value={editingUser.xp} onChange={e => setEditingUser({...editingUser, xp: parseInt(e.target.value)})} className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-white outline-none focus:border-[#6C5DD3]" />
                            </div>
                            <div>
                                <label className="text-[10px] uppercase text-gray-500 font-bold">Уровень</label>
                                <input type="number" value={editingUser.level} onChange={e => setEditingUser({...editingUser, level: parseInt(e.target.value)})} className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-white outline-none focus:border-[#6C5DD3]" />
                            </div>
                        </div>
                        <div>
                            <label className="text-[10px] uppercase text-gray-500 font-bold">Роль</label>
                            <select value={editingUser.role} onChange={e => setEditingUser({...editingUser, role: e.target.value as UserRole})} className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-white outline-none focus:border-[#6C5DD3]">
                                <option value="STUDENT">Студент</option>
                                <option value="ADMIN">Админ</option>
                            </select>
                        </div>
                        <div className="flex gap-2 pt-2">
                            <Button onClick={() => setEditingUser(null)} variant="ghost" fullWidth>Отмена</Button>
                            <Button onClick={() => handleUserSave(editingUser)} fullWidth>Сохранить</Button>
                        </div>
                    </div>
                </div>
            )}

            <h2 className="text-xl font-black uppercase text-slate-900 dark:text-white">Личный состав ({users.length})</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
                {users.map((u, idx) => (
                    <div key={idx} className="bg-white dark:bg-[#14161B] p-4 rounded-2xl border border-slate-200 dark:border-white/5 flex justify-between items-center group hover:border-[#6C5DD3]/30 transition-all shadow-sm">
                        <div className="flex items-center gap-3">
                            <img src={u.avatarUrl || `https://ui-avatars.com/api/?name=${u.name}`} className="w-10 h-10 rounded-full bg-slate-200 object-cover" />
                            <div>
                                <p className="font-bold text-sm text-slate-900 dark:text-white">{u.name}</p>
                                <p className="text-[10px] text-slate-500 uppercase font-bold">{u.role} • Lvl {u.level} • {u.xp} XP</p>
                            </div>
                        </div>
                        <div className="flex gap-2">
                            <button onClick={() => setEditingUser(u)} className="px-3 py-1.5 bg-slate-100 dark:bg-white/5 text-slate-600 dark:text-white rounded-lg text-[10px] font-bold uppercase hover:bg-[#6C5DD3] hover:text-white transition-colors">Edit</button>
                            <button onClick={() => deleteUser(u.telegramId!)} className="px-3 py-1.5 bg-red-500/10 text-red-500 rounded-lg text-[10px] font-bold uppercase hover:bg-red-500 hover:text-white transition-colors">✕</button>
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
          addToast('success', 'Модуль создан');
      };

      const updateModule = (id: string, field: keyof Module, value: any) => {
          onUpdateModules(modules.map(m => m.id === id ? { ...m, [field]: value } : m));
      };

      const deleteModule = (id: string) => {
          if(confirm('Удалить модуль и все входящие в него уроки? Это действие нельзя отменить.')) {
              onUpdateModules(modules.filter(m => m.id !== id));
              addToast('info', 'Модуль удален');
          }
      };

      const saveLesson = () => {
          if (!editingLesson) return;
          const { moduleId, lesson } = editingLesson;
          const modIndex = modules.findIndex(m => m.id === moduleId);
          if (modIndex === -1) return;
          const updatedModules = [...modules];
          const lessonIndex = updatedModules[modIndex].lessons.findIndex(l => l.id === lesson.id);
          if (lessonIndex >= 0) { updatedModules[modIndex].lessons[lessonIndex] = lesson; } 
          else { updatedModules[modIndex].lessons.push(lesson); }
          onUpdateModules(updatedModules);
          setEditingLesson(null);
          addToast('success', 'Урок сохранен');
      };

      const createLesson = (moduleId: string) => {
          setEditingLesson({
              moduleId,
              lesson: {
                  id: `les-${Date.now()}`,
                  title: 'Новый Урок',
                  description: '',
                  content: '# Заголовок\nКонтент урока...',
                  xpReward: 100,
                  homeworkType: 'TEXT',
                  homeworkTask: 'Задание...',
                  aiGradingInstruction: 'Критерии...'
              }
          });
      };

      const deleteLesson = (moduleId: string, lessonId: string) => {
          if(!confirm('Удалить урок?')) return;
          const updatedModules = modules.map(m => {
              if (m.id !== moduleId) return m;
              return { ...m, lessons: m.lessons.filter(l => l.id !== lessonId) };
          });
          onUpdateModules(updatedModules);
          addToast('info', 'Урок удален');
      };

      return (
          <div className="space-y-6 pb-20 animate-fade-in">
              {/* Lesson Edit Modal */}
              {editingLesson && (
                  <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
                      <div className="bg-[#1F2128] w-full max-w-2xl max-h-[90vh] overflow-y-auto custom-scrollbar rounded-[2rem] p-6 border border-white/10 space-y-4 shadow-2xl">
                          <h3 className="text-xl font-black text-white uppercase">Редактор Урока</h3>
                          <div>
                              <label className="text-[10px] uppercase text-gray-500 font-bold">Название</label>
                              <input value={editingLesson.lesson.title} onChange={e => setEditingLesson({...editingLesson, lesson: {...editingLesson.lesson, title: e.target.value}})} className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-white outline-none focus:border-[#6C5DD3]" />
                          </div>
                          <div className="grid grid-cols-2 gap-4">
                              <div>
                                  <label className="text-[10px] uppercase text-gray-500 font-bold">Тип ДЗ</label>
                                  <select value={editingLesson.lesson.homeworkType} onChange={e => setEditingLesson({...editingLesson, lesson: {...editingLesson.lesson, homeworkType: e.target.value as any}})} className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-white outline-none focus:border-[#6C5DD3]">
                                      <option value="TEXT">Текст</option>
                                      <option value="PHOTO">Фото</option>
                                      <option value="VIDEO">Видео</option>
                                      <option value="FILE">Файл (PDF)</option>
                                  </select>
                              </div>
                              <div>
                                  <label className="text-[10px] uppercase text-gray-500 font-bold">Награда (XP)</label>
                                  <input type="number" value={editingLesson.lesson.xpReward} onChange={e => setEditingLesson({...editingLesson, lesson: {...editingLesson.lesson, xpReward: parseInt(e.target.value)}})} className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-white outline-none focus:border-[#6C5DD3]" />
                              </div>
                          </div>
                          <div>
                              <label className="text-[10px] uppercase text-gray-500 font-bold">Видео URL</label>
                              <input value={editingLesson.lesson.videoUrl || ''} onChange={e => setEditingLesson({...editingLesson, lesson: {...editingLesson.lesson, videoUrl: e.target.value}})} className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-white outline-none focus:border-[#6C5DD3]" placeholder="https://..." />
                          </div>
                          
                          {/* Rich Markdown Editor */}
                          <div>
                              <label className="text-[10px] uppercase text-gray-500 font-bold mb-2 block">Контент (Markdown Editor)</label>
                              
                              {/* Toolbar */}
                              <div className="flex gap-1 mb-2 overflow-x-auto pb-1">
                                  <button onClick={() => handleMarkdownInsert('**', '**', 'bold')} className="p-2 bg-white/5 hover:bg-white/10 rounded-lg text-white font-bold min-w-[32px]" title="Bold">B</button>
                                  <button onClick={() => handleMarkdownInsert('*', '*', 'italic')} className="p-2 bg-white/5 hover:bg-white/10 rounded-lg text-white italic min-w-[32px]" title="Italic">I</button>
                                  <button onClick={() => handleMarkdownInsert('# ', '\n', 'Header 1')} className="p-2 bg-white/5 hover:bg-white/10 rounded-lg text-white font-bold min-w-[32px]" title="H1">H1</button>
                                  <button onClick={() => handleMarkdownInsert('## ', '\n', 'Header 2')} className="p-2 bg-white/5 hover:bg-white/10 rounded-lg text-white font-bold min-w-[32px]" title="H2">H2</button>
                                  <button onClick={() => handleMarkdownInsert('> ', '\n', 'Quote')} className="p-2 bg-white/5 hover:bg-white/10 rounded-lg text-white min-w-[32px]" title="Quote">❝</button>
                                  <button onClick={() => handleMarkdownInsert('- ', '\n', 'List Item')} className="p-2 bg-white/5 hover:bg-white/10 rounded-lg text-white min-w-[32px]" title="List">≣</button>
                                  <button onClick={handleLinkInsert} className="p-2 bg-white/5 hover:bg-white/10 rounded-lg text-white min-w-[32px]" title="Link">🔗</button>
                                  <button onClick={handleImageInsert} className="p-2 bg-white/5 hover:bg-white/10 rounded-lg text-white min-w-[32px]" title="Image">🖼️</button>
                                  <button onClick={() => handleMarkdownInsert('`', '`', 'code')} className="p-2 bg-white/5 hover:bg-white/10 rounded-lg text-white font-mono min-w-[32px]" title="Code">{`<>`}</button>
                              </div>

                              <textarea 
                                id="markdown-editor-area"
                                value={editingLesson.lesson.content} 
                                onChange={e => setEditingLesson({...editingLesson, lesson: {...editingLesson.lesson, content: e.target.value}})} 
                                className="w-full bg-white/5 border border-white/10 rounded-xl p-4 text-white outline-none focus:border-[#6C5DD3] h-60 font-mono text-sm leading-relaxed" 
                                placeholder="Пишите контент урока здесь..."
                              />
                              <p className="text-[9px] text-slate-500 mt-1">Поддерживает Markdown. Используйте панель выше для форматирования.</p>
                          </div>

                          <div>
                              <label className="text-[10px] uppercase text-gray-500 font-bold">Задание</label>
                              <textarea value={editingLesson.lesson.homeworkTask} onChange={e => setEditingLesson({...editingLesson, lesson: {...editingLesson.lesson, homeworkTask: e.target.value}})} className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-white outline-none focus:border-[#6C5DD3] h-20" />
                          </div>
                          <div className="flex gap-2 pt-2">
                              <Button onClick={() => setEditingLesson(null)} variant="ghost" fullWidth>Отмена</Button>
                              <Button onClick={saveLesson} fullWidth>Сохранить Урок</Button>
                          </div>
                      </div>
                  </div>
              )}

              <div className="flex justify-between items-center">
                  <h2 className="text-xl font-black uppercase text-slate-900 dark:text-white">Модули ({modules.length})</h2>
                  <Button onClick={addNewModule} className="!py-2 !px-4 !text-xs">+ Модуль</Button>
              </div>

              <div className="grid grid-cols-1 gap-4">
                {modules.map(mod => (
                    <div key={mod.id} className="bg-white dark:bg-[#14161B] rounded-2xl border border-slate-200 dark:border-white/5 overflow-hidden">
                        {/* Module Header */}
                        <div className="p-4 bg-slate-50 dark:bg-white/5 flex flex-col gap-3">
                            <input 
                                value={mod.title} 
                                onChange={(e) => updateModule(mod.id, 'title', e.target.value)}
                                className="bg-transparent text-lg font-black text-slate-900 dark:text-white w-full border-b border-transparent focus:border-[#6C5DD3] outline-none placeholder-gray-500"
                                placeholder="Название модуля"
                            />
                            <input 
                                value={mod.description}
                                onChange={(e) => updateModule(mod.id, 'description', e.target.value)}
                                className="bg-transparent text-xs text-slate-500 w-full outline-none"
                                placeholder="Краткое описание"
                            />
                            <div className="flex flex-wrap justify-between items-center mt-2 gap-2">
                                <div className="flex gap-2">
                                    <input 
                                        type="number" 
                                        value={mod.minLevel}
                                        onChange={(e) => updateModule(mod.id, 'minLevel', parseInt(e.target.value))}
                                        className="w-16 bg-slate-200 dark:bg-black/20 rounded-lg px-2 py-1 text-xs font-bold text-center"
                                        placeholder="Lvl"
                                    />
                                    <select 
                                        value={mod.category}
                                        onChange={(e) => updateModule(mod.id, 'category', e.target.value)}
                                        className="bg-slate-200 dark:bg-black/20 rounded-lg px-2 py-1 text-xs font-bold"
                                    >
                                        <option value="GENERAL">General</option>
                                        <option value="SALES">Sales</option>
                                        <option value="PSYCHOLOGY">Psychology</option>
                                        <option value="TACTICS">Tactics</option>
                                    </select>
                                </div>
                                <div className="flex gap-2">
                                    <button onClick={() => setEditingModuleId(editingModuleId === mod.id ? null : mod.id)} className="text-[10px] font-bold uppercase text-[#6C5DD3] bg-[#6C5DD3]/10 px-3 py-1.5 rounded-lg hover:bg-[#6C5DD3] hover:text-white transition-all">
                                        {editingModuleId === mod.id ? 'Свернуть' : `Уроки (${mod.lessons.length})`}
                                    </button>
                                    
                                    {/* Delete Module Button */}
                                    <button 
                                        onClick={() => deleteModule(mod.id)} 
                                        className="w-8 h-8 flex items-center justify-center rounded-lg bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white transition-all"
                                        title="Удалить модуль"
                                    >
                                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
                                            <path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
                                        </svg>
                                    </button>
                                </div>
                            </div>
                        </div>

                        {/* Lessons List */}
                        {editingModuleId === mod.id && (
                            <div className="p-4 space-y-3 border-t border-slate-200 dark:border-white/5 bg-slate-100 dark:bg-black/20">
                                {mod.lessons.map(les => (
                                    <div key={les.id} className="bg-white dark:bg-[#1F2128] p-3 rounded-xl border border-slate-200 dark:border-white/5 flex justify-between items-center group">
                                        <span className="text-sm font-bold text-slate-800 dark:text-white truncate max-w-[70%]">{les.title}</span>
                                        <div className="flex gap-2">
                                            <button onClick={() => setEditingLesson({moduleId: mod.id, lesson: les})} className="text-[#6C5DD3] text-xs font-bold uppercase hover:bg-[#6C5DD3]/10 px-2 py-1 rounded">Edit</button>
                                            <button onClick={() => deleteLesson(mod.id, les.id)} className="text-red-500 text-xs font-bold uppercase hover:bg-red-500/10 px-2 py-1 rounded">✕</button>
                                        </div>
                                    </div>
                                ))}
                                <Button onClick={() => createLesson(mod.id)} fullWidth variant="secondary" className="!py-3 !text-xs border-dashed border-2 border-slate-300 dark:border-white/10 bg-transparent hover:bg-slate-200 dark:hover:bg-white/5 text-slate-500">+ Добавить урок</Button>
                            </div>
                        )}
                    </div>
                ))}
              </div>
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
              {activeSubTab === 'MATERIALS' && (
                <div>
                    <div className="flex justify-between mb-4 items-center"><h3 className="font-bold uppercase text-sm text-slate-900 dark:text-white">База Знаний</h3><Button onClick={addMat} className="!py-1 !px-3 !text-[10px]">+</Button></div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {materials.map(m => (
                            <div key={m.id} className="bg-white dark:bg-[#14161B] p-4 rounded-xl border border-slate-200 dark:border-white/5 text-xs space-y-2 relative group">
                                <div className="flex gap-2">
                                    <input value={m.title} onChange={e => updateMat(m.id, 'title', e.target.value)} className="font-bold flex-1 bg-transparent border-b border-transparent focus:border-[#6C5DD3] outline-none text-slate-900 dark:text-white" placeholder="Title" />
                                    <select value={m.type} onChange={e => updateMat(m.id, 'type', e.target.value)} className="bg-slate-100 dark:bg-white/5 rounded px-2 text-[10px] outline-none"><option value="LINK">Link</option><option value="PDF">PDF</option><option value="VIDEO">Video</option></select>
                                    <button onClick={() => onUpdateMaterials(materials.filter(x => x.id !== m.id))} className="text-red-500 hover:bg-red-500/10 px-2 rounded">✕</button>
                                </div>
                                <input value={m.url} onChange={e => updateMat(m.id, 'url', e.target.value)} className="w-full bg-slate-50 dark:bg-white/5 p-2 rounded text-slate-600 dark:text-white/60" placeholder="URL" />
                            </div>
                        ))}
                    </div>
                </div>
              )}

              {/* Streams */}
              {activeSubTab === 'STREAMS' && (
                <div>
                    <div className="flex justify-between mb-4 items-center"><h3 className="font-bold uppercase text-sm text-slate-900 dark:text-white">Эфиры</h3><Button onClick={addStream} className="!py-1 !px-3 !text-[10px]">+</Button></div>
                    <div className="space-y-3">
                        {streams.map(s => (
                            <div key={s.id} className="bg-white dark:bg-[#14161B] p-4 rounded-xl border border-slate-200 dark:border-white/5 text-xs space-y-2">
                                <div className="flex gap-2">
                                    <input value={s.title} onChange={e => updateStream(s.id, 'title', e.target.value)} className="font-bold flex-1 bg-transparent border-b border-transparent focus:border-[#6C5DD3] outline-none text-slate-900 dark:text-white" />
                                    <select value={s.status} onChange={e => updateStream(s.id, 'status', e.target.value)} className="bg-slate-100 dark:bg-white/5 rounded px-2 text-[10px] outline-none"><option value="UPCOMING">Fut</option><option value="LIVE">Live</option><option value="PAST">Rec</option></select>
                                    <button onClick={() => onUpdateStreams(streams.filter(x => x.id !== s.id))} className="text-red-500 hover:bg-red-500/10 px-2 rounded">✕</button>
                                </div>
                                <div className="grid grid-cols-2 gap-2">
                                    <input type="datetime-local" value={s.date.substring(0, 16)} onChange={e => updateStream(s.id, 'date', new Date(e.target.value).toISOString())} className="bg-slate-50 dark:bg-white/5 p-2 rounded" />
                                    <input value={s.youtubeUrl} onChange={e => updateStream(s.id, 'youtubeUrl', e.target.value)} className="bg-slate-50 dark:bg-white/5 p-2 rounded" placeholder="Stream URL" />
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
              )}

              {/* Scenarios */}
              {activeSubTab === 'ARENA' && (
                <div>
                    <div className="flex justify-between mb-4 items-center"><h3 className="font-bold uppercase text-sm text-slate-900 dark:text-white">Арена</h3><Button onClick={addScen} className="!py-1 !px-3 !text-[10px]">+</Button></div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {scenarios.map(s => (
                            <div key={s.id} className="bg-white dark:bg-[#14161B] p-4 rounded-xl border border-slate-200 dark:border-white/5 text-xs space-y-2">
                                <div className="flex gap-2">
                                    <input value={s.title} onChange={e => updateScen(s.id, 'title', e.target.value)} className="font-bold flex-1 bg-transparent border-b border-transparent focus:border-[#6C5DD3] outline-none text-slate-900 dark:text-white" />
                                    <select value={s.difficulty} onChange={e => updateScen(s.id, 'difficulty', e.target.value)} className="bg-slate-100 dark:bg-white/5 rounded px-2 text-[10px] outline-none"><option value="Easy">Ez</option><option value="Medium">Mid</option><option value="Hard">Hard</option></select>
                                    <button onClick={() => onUpdateScenarios(scenarios.filter(x => x.id !== s.id))} className="text-red-500 hover:bg-red-500/10 px-2 rounded">✕</button>
                                </div>
                                <input value={s.clientRole} onChange={e => updateScen(s.id, 'clientRole', e.target.value)} className="w-full bg-slate-50 dark:bg-white/5 p-2 rounded mb-1" placeholder="Роль клиента" />
                                <textarea value={s.objective} onChange={e => updateScen(s.id, 'objective', e.target.value)} className="w-full bg-slate-50 dark:bg-white/5 p-2 rounded h-16 resize-none" placeholder="Цель" />
                            </div>
                        ))}
                    </div>
                </div>
              )}
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
                          <input value={ev.title} onChange={e => updateEv(ev.id, 'title', e.target.value)} className="font-bold flex-1 bg-transparent text-sm text-slate-900 dark:text-white border-b border-transparent focus:border-[#6C5DD3] outline-none" />
                          <select value={ev.type} onChange={e => updateEv(ev.id, 'type', e.target.value)} className="bg-slate-100 dark:bg-white/5 rounded px-2 text-[10px] outline-none"><option value="WEBINAR">Webinar</option><option value="HOMEWORK">Deadline</option><option value="OTHER">Other</option></select>
                          <button onClick={() => onUpdateEvents(events.filter(e => e.id !== ev.id))} className="text-red-500 hover:bg-red-500/10 px-2 rounded">✕</button>
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
      // Safe access to nested properties to prevent crash
      const maintenanceMode = config?.features?.maintenanceMode || false;
      const appName = config?.appName || 'SalesPro';

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

      const safeNotifications = Array.isArray(notifications) ? notifications : [];

      return (
          <div className="space-y-8 pb-20 animate-fade-in">
              <div className="bg-white dark:bg-[#14161B] p-5 rounded-[2rem] border border-slate-200 dark:border-white/5 space-y-4">
                  <h3 className="font-black text-slate-900 dark:text-white uppercase">Отправить оповещение</h3>
                  <input value={notifTitle} onChange={e => setNotifTitle(e.target.value)} className="w-full bg-slate-50 dark:bg-black/20 p-3 rounded-xl text-sm font-bold border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white outline-none focus:border-[#6C5DD3]" placeholder="Заголовок" />
                  <textarea value={notifMsg} onChange={e => setNotifMsg(e.target.value)} className="w-full bg-slate-50 dark:bg-black/20 p-3 rounded-xl text-sm border border-slate-200 dark:border-white/10 h-24 resize-none text-slate-900 dark:text-white outline-none focus:border-[#6C5DD3]" placeholder="Сообщение для всех..." />
                  <div className="flex gap-2 flex-wrap">
                      {['INFO', 'SUCCESS', 'WARNING', 'ALERT'].map(t => (
                          <button key={t} onClick={() => setNotifType(t as any)} className={`px-3 py-1 rounded-lg text-[10px] font-black uppercase border transition-colors ${notifType === t ? 'bg-[#6C5DD3] text-white border-[#6C5DD3]' : 'border-slate-200 dark:border-white/10 text-slate-500'}`}>{t}</button>
                      ))}
                  </div>
                  <Button onClick={sendNotif} fullWidth>Отправить Всем</Button>
              </div>

              <div className="bg-white dark:bg-[#14161B] p-5 rounded-[2rem] border border-slate-200 dark:border-white/5 space-y-4">
                  <div className="flex justify-between items-center">
                      <h3 className="font-black text-slate-900 dark:text-white uppercase">История ({safeNotifications.length})</h3>
                      <button onClick={onClearNotifications} className="text-red-500 text-[10px] font-bold uppercase hover:underline">Очистить</button>
                  </div>
                  <div className="max-h-40 overflow-y-auto space-y-2 pr-1 custom-scrollbar">
                      {safeNotifications.map(n => (
                          <div key={n.id} className="p-2 border-l-2 border-slate-300 dark:border-white/20 pl-3">
                              <div className="flex justify-between">
                                <span className="text-[10px] font-bold text-slate-500">{new Date(n.date).toLocaleDateString()}</span>
                                <span className="text-[10px] uppercase font-black text-[#6C5DD3]">{n.type}</span>
                              </div>
                              <p className="text-xs text-slate-800 dark:text-white font-medium truncate">{n.title}</p>
                          </div>
                      ))}
                  </div>
              </div>

              <div className="bg-white dark:bg-[#14161B] p-5 rounded-[2rem] border border-slate-200 dark:border-white/5 space-y-4">
                  <h3 className="font-black text-slate-900 dark:text-white uppercase">Конфигурация</h3>
                  
                  {/* App Name */}
                  <div>
                      <label className="block text-[10px] font-black uppercase text-slate-400 mb-2">Название Приложения</label>
                      <input value={appName} onChange={(e) => onUpdateConfig({...config, appName: e.target.value})} className="w-full bg-slate-50 dark:bg-black/20 p-3 rounded-xl text-sm font-bold text-slate-900 dark:text-white" />
                  </div>

                  {/* System Instruction */}
                  <div>
                      <label className="block text-[10px] font-black uppercase text-slate-400 mb-2">Системная Инструкция (AI Persona)</label>
                      <textarea 
                          value={config.systemInstruction || ''} 
                          onChange={(e) => onUpdateConfig({...config, systemInstruction: e.target.value})} 
                          className="w-full bg-slate-50 dark:bg-black/20 p-3 rounded-xl text-sm font-medium text-slate-900 dark:text-white h-32 resize-none border border-transparent focus:border-[#6C5DD3] outline-none"
                          placeholder="Ты — Командир..."
                      />
                  </div>

                  {/* Primary Color */}
                  <div>
                       <label className="block text-[10px] font-black uppercase text-slate-400 mb-2">Акцентный Цвет</label>
                       <div className="flex items-center gap-3">
                          <input 
                              type="color" 
                              value={config.primaryColor || '#6C5DD3'}
                              onChange={(e) => onUpdateConfig({...config, primaryColor: e.target.value})}
                              className="h-10 w-10 rounded-lg border-none cursor-pointer bg-transparent"
                          />
                          <input 
                              type="text"
                              value={config.primaryColor || '#6C5DD3'}
                              onChange={(e) => onUpdateConfig({...config, primaryColor: e.target.value})}
                              className="flex-1 bg-slate-50 dark:bg-black/20 p-3 rounded-xl text-sm font-bold text-slate-900 dark:text-white border border-transparent focus:border-[#6C5DD3] outline-none"
                          />
                       </div>
                  </div>

                  <div className="flex items-center justify-between pt-2">
                      <span className="text-sm font-bold text-slate-900 dark:text-white">Режим обслуживания</span>
                      <div onClick={() => onUpdateConfig({...config, features: {...config.features, maintenanceMode: !maintenanceMode}})} className={`w-12 h-6 rounded-full relative cursor-pointer transition-colors ${maintenanceMode ? 'bg-[#6C5DD3]' : 'bg-slate-300 dark:bg-white/10'}`}>
                          <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${maintenanceMode ? 'left-7' : 'left-1'}`}></div>
                      </div>
                  </div>
              </div>
          </div>
      );
  };

  const renderOverview = () => {
    return (
    <div className="space-y-6 animate-fade-in">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[
                { icon: '👥', val: users.length, label: 'Бойцов' },
                { icon: '📦', val: modules.length, label: 'Модулей' },
                { icon: '📅', val: events.length, label: 'Событий' },
                { icon: '📹', val: streams.length, label: 'Эфиров' }
            ].map((stat, i) => (
                <div key={i} className="bg-white dark:bg-[#14161B] p-5 rounded-[2rem] border border-slate-200 dark:border-white/5">
                    <div className="text-[#6C5DD3] text-2xl mb-2">{stat.icon}</div>
                    <h3 className="text-3xl font-black text-slate-900 dark:text-white">{stat.val}</h3>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{stat.label}</p>
                </div>
            ))}
        </div>
        
        <div className="bg-[#6C5DD3] text-white p-6 rounded-[2.5rem] relative overflow-hidden">
            <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl -mr-16 -mt-16"></div>
            <h3 className="text-xl font-black uppercase relative z-10">Neural Core Active</h3>
            <p className="text-white/70 text-xs font-medium relative z-10 mt-1 max-w-xs">
                AI Agent is monitoring system health. Errors: {notifications.filter(n => n.type === 'ALERT').length}
            </p>
        </div>
    </div>
  )};

  // --- NEURAL CORE (MODEL SELECTION) ---

  const renderNeuralCore = () => {
      const providers: {id: AIProviderId, name: string, icon: string}[] = [
          { id: 'GOOGLE_GEMINI', name: 'Google Gemini', icon: '💎' },
          { id: 'OPENAI_GPT4', name: 'OpenAI GPT-4', icon: '🤖' },
          { id: 'ANTHROPIC_CLAUDE', name: 'Anthropic Claude', icon: '🧠' },
          { id: 'GROQ', name: 'Groq (Llama 3)', icon: '⚡' },
          { id: 'OPENROUTER', name: 'OpenRouter', icon: '🌐' },
      ];

      // Safe access to AI config
      const aiConfig = config?.aiConfig || { activeProvider: 'GOOGLE_GEMINI', apiKeys: {}, modelOverrides: {} };

      const updateAIConfig = (key: string, value: any) => {
          onUpdateConfig({
              ...config,
              aiConfig: {
                  ...aiConfig,
                  [key]: value
              }
          });
      };

      // Strict mapping for keys based on AIConfig interface
      const setKey = (field: 'google' | 'openai' | 'anthropic' | 'groq' | 'openrouter', val: string) => {
           onUpdateConfig({
              ...config,
              aiConfig: {
                  ...aiConfig,
                  apiKeys: { ...aiConfig.apiKeys, [field]: val }
              }
          });
      };

      return (
      <div className="space-y-6 animate-fade-in pb-20">
          <div className="bg-[#14161B] p-6 rounded-[2rem] border border-[#6C5DD3]/20 relative overflow-hidden">
              <div className="absolute inset-0 bg-[#6C5DD3]/5 animate-pulse"></div>
              <div className="flex justify-between items-start relative z-10">
                  <div>
                      <h2 className="text-2xl font-black text-white">AI NEURAL CORE</h2>
                      <p className="text-xs text-slate-400 mt-1">Центр управления языковыми моделями.</p>
                  </div>
                  <div className="px-3 py-1 bg-[#6C5DD3] rounded-lg text-white text-[10px] font-black uppercase tracking-widest">
                      {aiConfig.activeProvider}
                  </div>
              </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Provider Selection */}
              <div className="bg-white dark:bg-[#14161B] p-5 rounded-[2rem] border border-slate-200 dark:border-white/5">
                  <h3 className="font-bold text-slate-900 dark:text-white mb-4 uppercase text-xs tracking-widest">Выбор Модели</h3>
                  <div className="space-y-2">
                      {providers.map(p => (
                          <button
                              key={p.id}
                              onClick={() => updateAIConfig('activeProvider', p.id)}
                              className={`w-full flex items-center justify-between p-3 rounded-xl border transition-all ${
                                  aiConfig.activeProvider === p.id 
                                  ? 'bg-[#6C5DD3]/10 border-[#6C5DD3] text-[#6C5DD3]' 
                                  : 'bg-transparent border-slate-200 dark:border-white/10 text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-white/5'
                              }`}
                          >
                              <div className="flex items-center gap-3">
                                  <span className="text-xl">{p.icon}</span>
                                  <span className="text-xs font-bold uppercase">{p.name}</span>
                              </div>
                              {aiConfig.activeProvider === p.id && <div className="w-2 h-2 rounded-full bg-[#6C5DD3]"></div>}
                          </button>
                      ))}
                  </div>
              </div>

              {/* API Keys */}
              <div className="bg-white dark:bg-[#14161B] p-5 rounded-[2rem] border border-slate-200 dark:border-white/5">
                  <h3 className="font-bold text-slate-900 dark:text-white mb-4 uppercase text-xs tracking-widest">API Ключи</h3>
                  <div className="space-y-3">
                      {aiConfig.activeProvider === 'GOOGLE_GEMINI' && (
                          <div>
                              <label className="text-[9px] font-bold uppercase text-slate-400 block mb-1">Google AI Key</label>
                              <input 
                                type="password" 
                                value={aiConfig.apiKeys?.google || ''} 
                                onChange={e => setKey('google', e.target.value)}
                                className="w-full bg-slate-100 dark:bg-black/20 p-3 rounded-xl text-xs font-mono outline-none border border-transparent focus:border-[#6C5DD3]"
                                placeholder="AIza..."
                              />
                          </div>
                      )}
                      {aiConfig.activeProvider === 'OPENAI_GPT4' && (
                          <div>
                              <label className="text-[9px] font-bold uppercase text-slate-400 block mb-1">OpenAI Key</label>
                              <input 
                                type="password" 
                                value={aiConfig.apiKeys?.openai || ''} 
                                onChange={e => setKey('openai', e.target.value)}
                                className="w-full bg-slate-100 dark:bg-black/20 p-3 rounded-xl text-xs font-mono outline-none border border-transparent focus:border-[#6C5DD3]"
                                placeholder="sk-..."
                              />
                          </div>
                      )}
                      {aiConfig.activeProvider === 'ANTHROPIC_CLAUDE' && (
                          <div>
                              <label className="text-[9px] font-bold uppercase text-slate-400 block mb-1">Anthropic Key</label>
                              <input 
                                type="password" 
                                value={aiConfig.apiKeys?.anthropic || ''} 
                                onChange={e => setKey('anthropic', e.target.value)}
                                className="w-full bg-slate-100 dark:bg-black/20 p-3 rounded-xl text-xs font-mono outline-none border border-transparent focus:border-[#6C5DD3]"
                                placeholder="sk-ant..."
                              />
                          </div>
                      )}
                      {aiConfig.activeProvider === 'GROQ' && (
                          <div>
                              <label className="text-[9px] font-bold uppercase text-slate-400 block mb-1">Groq Key</label>
                              <input 
                                type="password" 
                                value={aiConfig.apiKeys?.groq || ''} 
                                onChange={e => setKey('groq', e.target.value)}
                                className="w-full bg-slate-100 dark:bg-black/20 p-3 rounded-xl text-xs font-mono outline-none border border-transparent focus:border-[#6C5DD3]"
                                placeholder="gsk_..."
                              />
                          </div>
                      )}
                      {aiConfig.activeProvider === 'OPENROUTER' && (
                          <div>
                              <label className="text-[9px] font-bold uppercase text-slate-400 block mb-1">OpenRouter Key</label>
                              <input 
                                type="password" 
                                value={aiConfig.apiKeys?.openrouter || ''} 
                                onChange={e => setKey('openrouter', e.target.value)}
                                className="w-full bg-slate-100 dark:bg-black/20 p-3 rounded-xl text-xs font-mono outline-none border border-transparent focus:border-[#6C5DD3]"
                                placeholder="sk-or..."
                              />
                          </div>
                      )}
                  </div>
              </div>
          </div>

          <div className="bg-white dark:bg-[#14161B] p-5 rounded-[2rem] border border-slate-200 dark:border-white/5">
              <h3 className="font-bold text-slate-900 dark:text-white mb-4 uppercase text-xs tracking-widest">Model Overrides (Advanced)</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                      <label className="text-[9px] font-bold uppercase text-slate-400 block mb-1">Chat Model ID</label>
                      <input 
                        value={aiConfig.modelOverrides?.chat || ''} 
                        onChange={e => onUpdateConfig({...config, aiConfig: {...aiConfig, modelOverrides: {...aiConfig.modelOverrides, chat: e.target.value}}})}
                        className="w-full bg-slate-100 dark:bg-black/20 p-3 rounded-xl text-xs font-mono outline-none border border-transparent focus:border-[#6C5DD3]"
                        placeholder="e.g. gpt-4o, claude-3-opus"
                      />
                  </div>
                  <div>
                      <label className="text-[9px] font-bold uppercase text-slate-400 block mb-1">Vision Model ID</label>
                      <input 
                        value={aiConfig.modelOverrides?.vision || ''} 
                        onChange={e => onUpdateConfig({...config, aiConfig: {...aiConfig, modelOverrides: {...aiConfig.modelOverrides, vision: e.target.value}}})}
                        className="w-full bg-slate-100 dark:bg-black/20 p-3 rounded-xl text-xs font-mono outline-none border border-transparent focus:border-[#6C5DD3]"
                        placeholder="e.g. gpt-4-vision"
                      />
                  </div>
              </div>
          </div>
      </div>
      );
  };

  const renderDatabase = () => (
      <div className="space-y-4 animate-fade-in pb-20">
          <div className="bg-[#14161B] p-6 rounded-[2rem] border border-white/5">
              <h2 className="text-xl font-black text-white mb-2">БАЗА ДАННЫХ</h2>
              <p className="text-xs text-slate-400 mb-4">Статус подключения к NeonDB.</p>
              
              <div className="bg-black/30 p-4 rounded-xl font-mono text-[10px] text-green-400 mb-4 overflow-x-auto">
                  STATUS: CONFIG LOADED<br/>
                  TYPE: NEON POSTGRESQL<br/>
                  CONNECTION: {process.env.DATABASE_URL ? 'SECURE_LINK_PRESENT' : 'MISSING'}<br/>
                  SYNC MODE: BROWSER_MOCK (Client-Side Only)<br/>
              </div>
              
              <p className="text-[10px] text-slate-500 mb-4">
                  Note: Direct SQL connection from browser is restricted by security policies. 
                  The app is using the provided connection string for configuration purposes, 
                  but strictly running in Local Storage mode for this demo environment.
              </p>

              <Button fullWidth onClick={() => addToast('info', 'Конфигурация сохранена')}>Обновить статус</Button>
          </div>
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
            {activeSubTab === 'MATERIALS' && renderContent()}
            {activeSubTab === 'STREAMS' && renderContent()}
            {activeSubTab === 'ARENA' && renderContent()}
            {activeSubTab === 'CALENDAR' && renderCalendar()}
            {activeSubTab === 'SETTINGS' && renderSettings()}
            {activeSubTab === 'NEURAL_CORE' && renderNeuralCore()}
            {activeSubTab === 'DATABASE' && renderDatabase()}
            {activeSubTab === 'DEPLOY' && (
                <div className="text-center py-20">
                    <p className="text-slate-500 font-bold uppercase tracking-widest text-xs">Deploy Status: Ready</p>
                </div>
            )}
        </div>
    </div>
  );
};
