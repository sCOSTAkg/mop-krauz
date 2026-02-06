
import React, { useState } from 'react';
import { NotebookEntry } from '../types';
import { telegram } from '../services/telegramService';

interface NotebookViewProps {
  entries: NotebookEntry[];
  onUpdate: (entries: NotebookEntry[]) => void;
  onBack: () => void;
}

export const NotebookView: React.FC<NotebookViewProps> = ({ entries, onUpdate }) => {
  const [activeTab, setActiveTab] = useState<'HABIT' | 'GOAL' | 'IDEA'>('HABIT');
  const [inputText, setInputText] = useState('');

  const filteredEntries = entries.filter(e => 
      activeTab === 'IDEA' ? (e.type === 'IDEA' || e.type === 'NOTE') : e.type === activeTab
  );

  const addEntry = () => {
      if (!inputText.trim()) return;
      telegram.haptic('light');
      const newEntry: NotebookEntry = {
          id: Date.now().toString(),
          text: inputText,
          isChecked: false,
          type: activeTab as any
      };
      onUpdate([...entries, newEntry]);
      setInputText('');
  };

  const toggleCheck = (id: string) => {
      telegram.haptic('selection');
      onUpdate(entries.map(e => e.id === id ? { ...e, isChecked: !e.isChecked } : e));
  };

  const deleteEntry = (id: string) => {
      onUpdate(entries.filter(e => e.id !== id));
  };

  return (
    <div className="px-6 pt-10 pb-32 max-w-2xl mx-auto space-y-8 animate-fade-in">
       <div>
            <span className="text-[#6C5DD3] text-[10px] font-black uppercase tracking-[0.3em] mb-2 block">Personal Logs</span>
            <h1 className="text-4xl font-black text-text-primary tracking-tighter">ЖУРНАЛ <br/><span className="text-text-secondary opacity-30">БОЙЦА</span></h1>
       </div>

       {/* Tabs */}
       <div className="flex bg-surface border border-border-color p-1.5 rounded-[2rem] shadow-sm">
             {[
                 { id: 'HABIT', label: 'Привычки', icon: '⚡' },
                 { id: 'GOAL', label: 'Цели', icon: '🎯' },
                 { id: 'IDEA', label: 'Заметки', icon: '💡' }
             ].map(tab => (
                 <button 
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id as any)}
                    className={`flex-1 py-3.5 rounded-2xl text-[10px] font-black uppercase tracking-wider transition-all flex items-center justify-center gap-2 ${
                        activeTab === tab.id ? 'bg-[#1F2128] text-white shadow-lg' : 'text-text-secondary hover:bg-black/5'
                    }`}
                 >
                    <span>{tab.icon}</span> {tab.label}
                 </button>
             ))}
       </div>

       {/* Quick Add */}
       <div className="flex gap-3">
            <input 
                value={inputText}
                onChange={e => setInputText(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && addEntry()}
                placeholder="Новая запись..."
                className="flex-1 bg-surface border border-border-color rounded-2xl px-5 py-4 text-sm font-bold text-text-primary focus:border-[#6C5DD3] outline-none shadow-sm transition-all"
            />
            <button onClick={addEntry} className="w-14 h-14 bg-[#6C5DD3] text-white rounded-2xl flex items-center justify-center text-2xl shadow-lg shadow-[#6C5DD3]/20 active:scale-95 transition-all">+</button>
       </div>

       {/* List */}
       <div className="space-y-3">
            {filteredEntries.map((item, i) => (
                <div 
                    key={item.id} 
                    className="bg-surface p-4 rounded-[1.5rem] border border-border-color flex items-center gap-4 animate-slide-up group transition-all"
                    style={{ animationDelay: `${i*0.05}s` }}
                >
                    <button 
                        onClick={() => toggleCheck(item.id)}
                        className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center flex-shrink-0 transition-all ${
                            item.isChecked ? 'bg-[#00B050] border-[#00B050] text-white' : 'border-border-color group-hover:border-[#6C5DD3]'
                        }`}
                    >
                        {item.isChecked && '✓'}
                    </button>
                    <span className={`flex-1 text-sm font-bold transition-all ${item.isChecked ? 'text-text-secondary line-through' : 'text-text-primary'}`}>
                        {item.text}
                    </span>
                    <button onClick={() => deleteEntry(item.id)} className="text-text-secondary opacity-0 group-hover:opacity-100 hover:text-red-500 transition-all">✕</button>
                </div>
            ))}
            {filteredEntries.length === 0 && (
                <div className="text-center py-20 opacity-30">
                    <p className="text-text-secondary text-xs font-black uppercase tracking-widest">Записей нет</p>
                </div>
            )}
       </div>
    </div>
  );
};
