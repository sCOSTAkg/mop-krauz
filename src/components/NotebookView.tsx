
import React, { useState, useEffect, useMemo } from 'react';
import { NotebookEntry, SmartNavAction } from '../types';
import { telegram } from '../services/telegramService';
import { XPService, XP_RULES } from '../services/xpService';

interface NotebookViewProps {
  entries: NotebookEntry[];
  onUpdate: (entries: NotebookEntry[]) => void;
  onBack: () => void;
  onXPEarned: (amount: number) => void;
  setNavAction?: (action: SmartNavAction | null) => void;
}

type NoteTab = 'IDEA' | 'GRATITUDE';

export const NotebookView: React.FC<NotebookViewProps> = ({ entries, onUpdate, onXPEarned, setNavAction }) => {
  const [activeTab, setActiveTab] = useState<NoteTab>('IDEA');
  const [inputText, setInputText] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [showSearch, setShowSearch] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState('');
  const inputRef = React.useRef<HTMLInputElement>(null);

  // Filter by tab + search
  const filteredEntries = useMemo(() => {
    let filtered = entries.filter(e =>
      activeTab === 'IDEA' ? (e.type === 'IDEA' || e.type === 'NOTE') : e.type === 'GRATITUDE'
    );
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter(e => e.text.toLowerCase().includes(q));
    }
    // Pinned first (isChecked = pinned), then by date desc
    return filtered.sort((a, b) => {
      if (a.isChecked !== b.isChecked) return a.isChecked ? -1 : 1;
      return new Date(b.date).getTime() - new Date(a.date).getTime();
    });
  }, [entries, activeTab, searchQuery]);

  // Entry counts
  const ideaCount = entries.filter(e => e.type === 'IDEA' || e.type === 'NOTE').length;
  const gratitudeCount = entries.filter(e => e.type === 'GRATITUDE').length;

  // SmartNav
  useEffect(() => {
    if (!setNavAction) return;
    if (inputText.trim()) {
      setNavAction({ label: 'СОХРАНИТЬ ЗАПИСЬ', onClick: addEntry, variant: 'success', icon: '💾' });
    } else {
      setNavAction({ label: 'НАПИСАТЬ ЗАМЕТКУ', onClick: () => { inputRef.current?.focus(); telegram.haptic('selection'); }, variant: 'primary', icon: '✏️' });
    }
    return () => { setNavAction(null); };
  }, [inputText, activeTab]);

  const addEntry = () => {
    if (!inputText.trim()) return;
    telegram.haptic('success');
    const type = activeTab === 'GRATITUDE' ? 'GRATITUDE' : 'IDEA';
    const newEntry: NotebookEntry = {
      id: Date.now().toString(),
      text: inputText,
      isChecked: false, // not pinned by default
      type,
      date: new Date().toISOString()
    };
    onUpdate([...entries, newEntry]);
    const xp = XPService.calculateNotebookXP(type);
    if (xp > 0) onXPEarned(xp);
    setInputText('');
  };

  const deleteEntry = (id: string) => {
    telegram.haptic('warning');
    onUpdate(entries.filter(e => e.id !== id));
  };

  const togglePin = (id: string) => {
    telegram.haptic('selection');
    onUpdate(entries.map(e => e.id === id ? { ...e, isChecked: !e.isChecked } : e));
  };

  const startEdit = (entry: NotebookEntry) => {
    setEditingId(entry.id);
    setEditText(entry.text);
    telegram.haptic('selection');
  };

  const saveEdit = () => {
    if (!editText.trim() || !editingId) return;
    onUpdate(entries.map(e => e.id === editingId ? { ...e, text: editText } : e));
    setEditingId(null);
    setEditText('');
    telegram.haptic('success');
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditText('');
  };

  return (
    <div className="px-6 pt-10 pb-32 max-w-2xl mx-auto space-y-6 animate-fade-in">
       <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold text-text-primary">Блокнот</h1>
            <button
              onClick={() => { setShowSearch(!showSearch); if (showSearch) setSearchQuery(''); }}
              className={`w-10 h-10 rounded-xl flex items-center justify-center border transition-all ${showSearch ? 'bg-[#6C5DD3] text-white border-[#6C5DD3]' : 'bg-surface border-border-color text-text-secondary'}`}
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><circle cx="11" cy="11" r="8"/><path strokeLinecap="round" d="m21 21-4.35-4.35"/></svg>
            </button>
       </div>

       {/* Search bar */}
       {showSearch && (
         <div className="animate-slide-up">
           <input
             value={searchQuery}
             onChange={e => setSearchQuery(e.target.value)}
             placeholder="Поиск по записям..."
             className="w-full bg-surface border border-border-color rounded-xl px-4 py-3 text-sm text-text-primary focus:border-[#6C5DD3] outline-none transition-all"
             autoFocus
           />
         </div>
       )}

       {/* Tabs with counts */}
       <div className="bg-card p-1 rounded-xl border border-border-color flex">
            {[
                { id: 'IDEA' as NoteTab, label: 'Заметки / Инсайты', icon: '💡', count: ideaCount },
                { id: 'GRATITUDE' as NoteTab, label: 'Благодарности', icon: '🙏', count: gratitudeCount },
            ].map(tab => (
                <button 
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`flex-1 py-2.5 rounded-lg text-xs font-medium transition-all ${
                        activeTab === tab.id 
                        ? 'bg-[#6C5DD3] text-white' 
                        : 'text-text-secondary'
                    }`}
                >
                    <span>{tab.icon} {tab.label}</span>
                    {tab.count > 0 && (
                      <span className={`ml-1.5 text-[9px] px-1.5 py-0.5 rounded-full ${activeTab === tab.id ? 'bg-white/20' : 'bg-body'}`}>
                        {tab.count}
                      </span>
                    )}
                </button>
            ))}
       </div>

       {/* Quick Add */}
       <div className="flex gap-3">
            <input 
                ref={inputRef}
                value={inputText}
                onChange={e => setInputText(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && addEntry()}
                placeholder={`Новая запись (${activeTab === 'GRATITUDE' ? 'Кому/Чему благодарен?' : 'Мысль, инсайт, задача...'})`}
                className="w-full bg-surface border border-border-color rounded-xl px-4 py-3 text-sm text-text-primary focus:border-[#6C5DD3] outline-none transition-all"
            />
       </div>

       {/* List */}
       <div className="space-y-3">
            {filteredEntries.length === 0 ? (
                <div className="text-center py-20 opacity-30">
                    <p className="text-text-secondary text-xs font-medium">
                        {searchQuery ? 'Ничего не найдено' : activeTab === 'GRATITUDE' ? 'Запиши первую благодарность' : 'Записей пока нет'}
                    </p>
                </div>
            ) : (
                filteredEntries.map((item, i) => (
                    <div 
                        key={item.id} 
                        className={`bg-surface p-4 rounded-xl border flex items-start gap-3 animate-slide-up group transition-all ${
                          item.isChecked ? 'border-[#6C5DD3]/30 bg-[#6C5DD3]/5' : 'border-border-color'
                        }`}
                        style={{ animationDelay: `${i*0.03}s` }}
                    >
                        {/* Pin indicator */}
                        <button 
                          onClick={() => togglePin(item.id)}
                          className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm flex-shrink-0 transition-all ${
                            item.isChecked 
                              ? 'bg-[#6C5DD3]/20 text-[#6C5DD3]' 
                              : 'bg-body text-text-secondary opacity-40 group-hover:opacity-100'
                          }`}
                          title={item.isChecked ? 'Открепить' : 'Закрепить'}
                        >
                          {item.isChecked ? '📌' : (item.type === 'GRATITUDE' ? '🙏' : '📝')}
                        </button>

                        <div className="flex-1 min-w-0">
                            {editingId === item.id ? (
                              <div className="flex gap-2">
                                <input
                                  value={editText}
                                  onChange={e => setEditText(e.target.value)}
                                  onKeyDown={e => { if (e.key === 'Enter') saveEdit(); if (e.key === 'Escape') cancelEdit(); }}
                                  className="w-full bg-body border border-[#6C5DD3] rounded-lg px-3 py-2 text-sm text-text-primary outline-none"
                                  autoFocus
                                />
                                <button onClick={saveEdit} className="px-3 py-2 bg-[#6C5DD3] text-white rounded-lg text-xs font-semibold">✓</button>
                                <button onClick={cancelEdit} className="px-3 py-2 bg-body border border-border-color rounded-lg text-xs text-text-secondary">✕</button>
                              </div>
                            ) : (
                              <>
                                <p className="text-sm font-medium text-text-primary leading-snug break-words cursor-pointer" onClick={() => startEdit(item)}>
                                    {item.text}
                                </p>
                                <p className="text-[9px] text-text-secondary mt-1">
                                    {new Date(item.date).toLocaleDateString('ru-RU')} • {new Date(item.date).toLocaleTimeString('ru-RU', {hour: '2-digit', minute:'2-digit'})}
                                </p>
                              </>
                            )}
                        </div>

                        {editingId !== item.id && (
                          <button 
                            onClick={() => deleteEntry(item.id)} 
                            className="w-8 h-8 flex items-center justify-center text-text-secondary opacity-0 group-hover:opacity-100 hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-all"
                          >✕</button>
                        )}
                    </div>
                ))
            )}
       </div>
    </div>
  );
};
