
import React, { useState, useEffect } from 'react';
import { Habit, Goal, SmartNavAction } from '../types';
import { telegram } from '../services/telegramService';
import { XPService } from '../services/xpService';

interface HabitTrackerProps {
    habits: Habit[];
    goals: Goal[];
    onUpdateHabits: (newHabits: Habit[]) => void;
    onUpdateGoals: (newGoals: Goal[]) => void;
    onXPEarned: (amount: number) => void;
    onBack: () => void;
    setNavAction?: (action: SmartNavAction | null) => void;
}

type TabType = 'HABITS' | 'GOALS';

export const HabitTracker: React.FC<HabitTrackerProps> = ({ 
    habits, goals, onUpdateHabits, onUpdateGoals, onXPEarned, onBack, setNavAction 
}) => {
    const [activeTab, setActiveTab] = useState<TabType>('HABITS');
    const [isModalOpen, setIsModalOpen] = useState(false);
    
    // --- EDIT STATE ---
    const [editingId, setEditingId] = useState<string | null>(null);
    
    // --- FORM STATE ---
    const [formTitle, setFormTitle] = useState('');
    const [formDescription, setFormDescription] = useState('');
    const [formIcon, setFormIcon] = useState('🔥');
    
    // Goal Specific
    const [formTarget, setFormTarget] = useState('');
    const [formUnit, setFormUnit] = useState('₽');

    const today = new Date().toISOString().split('T')[0];

    // --- ICONS SELECTOR ---
    const AVAILABLE_ICONS = ['🔥', '💧', '💪', '📚', '🧘', '💰', '🧠', '🥦', '🏃', '💤'];

    // --- SMART NAV INTEGRATION ---
    useEffect(() => {
        if (!setNavAction) return;

        if (isModalOpen) {
            setNavAction({
                label: editingId ? 'СОХРАНИТЬ' : 'СОЗДАТЬ',
                onClick: handleSave,
                variant: 'success',
                icon: '💾'
            });
        } else {
            setNavAction({
                label: activeTab === 'HABITS' ? 'НОВАЯ ПРИВЫЧКА' : 'НОВАЯ ЦЕЛЬ',
                onClick: () => openModal(),
                variant: 'primary',
                icon: '+'
            });
        }

        return () => { setNavAction(null); };
    }, [activeTab, isModalOpen, formTitle, formTarget, formUnit, formIcon, formDescription, editingId]);

    // --- LOGIC ---

    const openModal = (item?: Habit | Goal) => {
        if (item) {
            // Edit Mode
            setEditingId(item.id);
            setFormTitle(item.title);
            if ('description' in item) setFormDescription(item.description || '');
            if ('icon' in item) setFormIcon(item.icon);
            if ('targetValue' in item) setFormTarget(item.targetValue.toString());
            if ('unit' in item) setFormUnit(item.unit);
        } else {
            // Create Mode
            setEditingId(null);
            setFormTitle('');
            setFormDescription('');
            setFormIcon('🔥');
            setFormTarget('');
            setFormUnit('₽');
        }
        setIsModalOpen(true);
        telegram.haptic('selection');
    };

    const closeModal = () => {
        setIsModalOpen(false);
        setEditingId(null);
    };

    const handleSave = () => {
        if (!formTitle.trim()) {
            telegram.haptic('error');
            return;
        }

        if (activeTab === 'HABITS') {
            if (editingId) {
                // Update Habit
                const updated = habits.map(h => h.id === editingId ? { ...h, title: formTitle, description: formDescription, icon: formIcon } : h);
                onUpdateHabits(updated);
            } else {
                // Create Habit
                const newHabit: Habit = {
                    id: Date.now().toString(),
                    title: formTitle,
                    description: formDescription,
                    streak: 0,
                    completedDates: [],
                    targetDaysPerWeek: 7,
                    icon: formIcon
                };
                onUpdateHabits([...habits, newHabit]);
            }
        } else {
            // Goals
            if (!formTarget) { telegram.haptic('error'); return; }
            
            if (editingId) {
                // Update Goal
                const updated = goals.map(g => g.id === editingId ? { ...g, title: formTitle, targetValue: parseFloat(formTarget), unit: formUnit } : g);
                onUpdateGoals(updated);
            } else {
                // Create Goal
                const newGoal: Goal = {
                    id: Date.now().toString(),
                    title: formTitle,
                    currentValue: 0,
                    targetValue: parseFloat(formTarget),
                    unit: formUnit,
                    isCompleted: false,
                    colorStart: '#6C5DD3',
                    colorEnd: '#FFAB7B'
                };
                onUpdateGoals([...goals, newGoal]);
            }
        }
        closeModal();
        telegram.haptic('success');
    };

    const toggleHabit = (habitId: string, date: string) => {
        telegram.haptic('selection');
        const updated = habits.map(h => {
            if (h.id === habitId) {
                const isCompleted = h.completedDates.includes(date);
                let newDates = isCompleted 
                    ? h.completedDates.filter(d => d !== date)
                    : [...h.completedDates, date];
                
                // Recalculate Streak
                newDates.sort((a, b) => new Date(b).getTime() - new Date(a).getTime());
                let streak = 0;
                let checkDate = new Date();
                
                if (newDates.includes(today)) {
                    streak = 1;
                    checkDate.setDate(checkDate.getDate() - 1);
                } else {
                    checkDate.setDate(checkDate.getDate() - 1);
                }

                while (true) {
                    const iso = checkDate.toISOString().split('T')[0];
                    if (newDates.includes(iso)) {
                        streak++;
                        checkDate.setDate(checkDate.getDate() - 1);
                    } else {
                        break;
                    }
                }

                if (!isCompleted) telegram.haptic('success');
                return { ...h, completedDates: newDates, streak };
            }
            return h;
        });
        onUpdateHabits(updated);
    };

    const deleteItem = (id: string) => {
        if(confirm('Удалить элемент?')) {
            if (activeTab === 'HABITS') {
                onUpdateHabits(habits.filter(h => h.id !== id));
            } else {
                onUpdateGoals(goals.filter(g => g.id !== id));
            }
            telegram.haptic('warning');
        }
    };
    
    const resetHabitProgress = () => {
        if (!editingId || activeTab !== 'HABITS') return;
        
        if(confirm('Сбросить стрик и историю выполнения? Это действие нельзя отменить.')) {
            const updated = habits.map(h => h.id === editingId ? { ...h, streak: 0, completedDates: [] } : h);
            onUpdateHabits(updated);
            telegram.haptic('warning');
            closeModal();
        }
    };

    const updateGoalProgress = (id: string, amount: number) => {
        const updated = goals.map(g => {
            if (g.id === id) {
                const newValue = Math.min(g.targetValue, Math.max(0, g.currentValue + amount));
                const wasCompleted = g.isCompleted;
                const isNowCompleted = newValue >= g.targetValue;
                
                if (!wasCompleted && isNowCompleted) {
                    telegram.haptic('success');
                    telegram.showAlert(`Цель "${g.title}" достигнута!`, 'Поздравляем');
                    // Award XP
                    const result = XPService.achieveGoal({ goals: [], xp: 0 } as any); // Mock user for XP calc
                    onXPEarned(result.xp);
                } else if (amount > 0) {
                    telegram.haptic('light');
                }

                return { ...g, currentValue: newValue, isCompleted: isNowCompleted };
            }
            return g;
        });
        onUpdateGoals(updated);
    };

    // Calendar Days Generator
    const getCalendarDays = () => {
        const days = [];
        for (let i = -4; i <= 2; i++) {
            const d = new Date();
            d.setDate(d.getDate() + i);
            days.push(d);
        }
        return days;
    };
    const calendarDays = getCalendarDays();

    return (
        <div className="flex flex-col h-full bg-[#0F1115] text-white animate-fade-in relative">
            {/* Header */}
            <div className="px-6 pt-[calc(var(--safe-top)+10px)] pb-4 flex items-center justify-between bg-[#0F1115]/90 backdrop-blur-md sticky top-0 z-20 border-b border-white/5">
                <button onClick={onBack} className="w-10 h-10 rounded-2xl bg-white/5 flex items-center justify-center active:scale-90 transition-transform">
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
                </button>
                <div className="flex bg-[#1F2128] p-1 rounded-xl">
                    <button 
                        onClick={() => setActiveTab('HABITS')}
                        className={`px-4 py-2 text-[9px] font-black uppercase tracking-widest rounded-lg transition-all ${activeTab === 'HABITS' ? 'bg-[#6C5DD3] text-white shadow-lg' : 'text-white/40'}`}
                    >
                        Привычки
                    </button>
                    <button 
                        onClick={() => setActiveTab('GOALS')}
                        className={`px-4 py-2 text-[9px] font-black uppercase tracking-widest rounded-lg transition-all ${activeTab === 'GOALS' ? 'bg-[#6C5DD3] text-white shadow-lg' : 'text-white/40'}`}
                    >
                        Цели
                    </button>
                </div>
                <div className="w-10"></div> 
            </div>

            <div className="p-4 pb-32 overflow-y-auto space-y-4">
                {/* --- HABITS VIEW --- */}
                {activeTab === 'HABITS' && (
                    <div className="space-y-3 animate-slide-up">
                        {/* Compact Calendar Header */}
                        <div className="bg-[#1F2128] px-2 py-3 rounded-2xl border border-white/5 flex justify-between">
                            {calendarDays.map((d, i) => {
                                const iso = d.toISOString().split('T')[0];
                                const isToday = iso === today;
                                return (
                                    <div key={i} className={`flex flex-col items-center gap-1 ${isToday ? 'opacity-100' : 'opacity-40'}`}>
                                        <span className="text-[8px] font-bold uppercase">{['Вс','Пн','Вт','Ср','Чт','Пт','Сб'][d.getDay()]}</span>
                                        <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-black border ${isToday ? 'bg-white text-black border-white' : 'border-white/20'}`}>
                                            {d.getDate()}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>

                        {habits.length === 0 && (
                            <div className="text-center py-20 opacity-30">
                                <span className="text-4xl block mb-2">🧘</span>
                                <p className="text-xs font-black uppercase tracking-widest">Список пуст</p>
                            </div>
                        )}

                        {habits.map((habit) => (
                            <div key={habit.id} className="bg-[#1F2128] border border-white/5 rounded-2xl p-3 relative group">
                                <div className="flex justify-between items-start mb-3">
                                    <div className="flex items-center gap-3 flex-1" onClick={() => openModal(habit)}>
                                        <div className="w-8 h-8 rounded-lg bg-[#2C2F36] flex items-center justify-center text-base shadow-inner">
                                            {habit.icon}
                                        </div>
                                        <div>
                                            <h3 className="font-bold text-xs text-white leading-tight">{habit.title}</h3>
                                            {habit.description && <p className="text-[9px] text-white/40 line-clamp-1">{habit.description}</p>}
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <div className="flex items-center gap-1 text-[9px] font-bold uppercase tracking-wide bg-black/20 px-2 py-1 rounded-lg">
                                            <span className={`${habit.streak > 0 ? 'text-orange-500' : 'text-white/30'}`}>🔥</span> 
                                            <span className="text-white/60">{habit.streak}</span>
                                        </div>
                                        <button onClick={() => deleteItem(habit.id)} className="text-white/10 hover:text-red-500 px-1">✕</button>
                                    </div>
                                </div>

                                {/* Interaction Row */}
                                <div className="flex justify-between items-center bg-black/20 rounded-xl p-1.5">
                                    {calendarDays.map((d, i) => {
                                        const iso = d.toISOString().split('T')[0];
                                        const isDone = habit.completedDates.includes(iso);
                                        const isFuture = d > new Date();
                                        
                                        if (iso === today) {
                                            return (
                                                <button 
                                                    key={i}
                                                    onClick={() => toggleHabit(habit.id, today)}
                                                    className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all shadow-lg ${isDone ? 'bg-[#00B050] text-white' : 'bg-white/10 hover:bg-white/20 border border-white/10'}`}
                                                >
                                                    {isDone ? '✓' : ''}
                                                </button>
                                            );
                                        }
                                        return (
                                            <div key={i} className={`w-1.5 h-1.5 rounded-full mx-auto ${isFuture ? 'bg-white/5' : isDone ? 'bg-[#00B050]' : 'bg-red-500/20'}`}></div>
                                        );
                                    })}
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {/* --- GOALS VIEW --- */}
                {activeTab === 'GOALS' && (
                    <div className="space-y-3 animate-slide-up">
                        {goals.length === 0 && (
                            <div className="text-center py-20 opacity-30">
                                <span className="text-4xl block mb-2">🎯</span>
                                <p className="text-xs font-black uppercase tracking-widest">Целей нет</p>
                            </div>
                        )}

                        {goals.map((goal) => {
                            const percent = Math.min(100, Math.round((goal.currentValue / goal.targetValue) * 100));
                            const step = goal.targetValue > 1000 ? 100 : goal.targetValue > 100 ? 10 : 1;

                            return (
                                <div key={goal.id} className="bg-[#1F2128] border border-white/5 rounded-2xl p-4 relative overflow-hidden">
                                    {/* Progress Background */}
                                    <div className="absolute bottom-0 left-0 h-1 w-full bg-white/5">
                                        <div 
                                            className="h-full transition-all duration-1000 ease-out"
                                            style={{ 
                                                width: `${percent}%`,
                                                background: `linear-gradient(to right, ${goal.colorStart || '#6C5DD3'}, ${goal.colorEnd || '#FFAB7B'})` 
                                            }}
                                        ></div>
                                    </div>

                                    <div className="flex justify-between items-start mb-3">
                                        <div onClick={() => openModal(goal)} className="cursor-pointer">
                                            <div className="flex items-center gap-2 mb-0.5">
                                                <h3 className="font-black text-sm text-white">{goal.title}</h3>
                                                {goal.isCompleted && <span className="text-sm animate-bounce">🏆</span>}
                                            </div>
                                            <p className="text-[9px] font-bold text-white/40 uppercase tracking-widest">
                                                {goal.currentValue.toLocaleString()} / {goal.targetValue.toLocaleString()} {goal.unit}
                                            </p>
                                        </div>
                                        <div className="text-right flex flex-col items-end">
                                            <span className="text-lg font-black text-white">{percent}%</span>
                                            <button onClick={() => deleteItem(goal.id)} className="text-white/10 hover:text-red-500 text-xs mt-1">✕</button>
                                        </div>
                                    </div>

                                    {/* Controls */}
                                    {!goal.isCompleted && (
                                        <div className="flex gap-2">
                                            <button 
                                                onClick={() => updateGoalProgress(goal.id, step)}
                                                className="flex-1 py-2 bg-white/5 hover:bg-white/10 rounded-lg text-[10px] font-black border border-white/5 active:scale-95 transition-all"
                                            >
                                                +{step} {goal.unit}
                                            </button>
                                            <button 
                                                onClick={() => updateGoalProgress(goal.id, step * 5)}
                                                className="flex-1 py-2 bg-white/5 hover:bg-white/10 rounded-lg text-[10px] font-black border border-white/5 active:scale-95 transition-all"
                                            >
                                                +{step * 5} {goal.unit}
                                            </button>
                                        </div>
                                    )}
                                    
                                    {goal.isCompleted && (
                                        <div className="py-2 bg-[#00B050]/20 text-[#00B050] text-center rounded-lg text-[10px] font-black uppercase tracking-widest border border-[#00B050]/20">
                                            Цель Достигнута
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* ADD/EDIT MODAL */}
            {isModalOpen && (
                <div className="absolute inset-0 z-50 bg-black/80 backdrop-blur-md flex items-end sm:items-center justify-center animate-fade-in pb-20">
                    <div className="w-full sm:max-w-sm bg-[#1F2128] rounded-t-[2.5rem] sm:rounded-[2.5rem] p-6 pb-10 border-t border-white/10 shadow-2xl animate-slide-up">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-lg font-black uppercase tracking-wide">
                                {editingId ? 'Редактировать' : 'Новая'} {activeTab === 'HABITS' ? 'Привычка' : 'Цель'}
                            </h3>
                            <button onClick={closeModal} className="text-white/40 hover:text-white text-xl">✕</button>
                        </div>

                        <div className="space-y-4">
                            <input 
                                value={formTitle}
                                onChange={e => setFormTitle(e.target.value)}
                                placeholder="Название..."
                                className="w-full bg-black/20 border border-white/10 p-4 rounded-xl text-white font-bold outline-none focus:border-[#6C5DD3]"
                                autoFocus
                            />

                            {activeTab === 'HABITS' && (
                                <>
                                    <input 
                                        value={formDescription}
                                        onChange={e => setFormDescription(e.target.value)}
                                        placeholder="Описание (опционально)"
                                        className="w-full bg-black/20 border border-white/10 p-4 rounded-xl text-xs text-white/80 outline-none focus:border-[#6C5DD3]"
                                    />
                                    <div>
                                        <label className="text-[10px] font-bold text-white/40 uppercase mb-2 block">Иконка</label>
                                        <div className="flex gap-2 overflow-x-auto pb-2 no-scrollbar">
                                            {AVAILABLE_ICONS.map(icon => (
                                                <button 
                                                    key={icon}
                                                    onClick={() => setFormIcon(icon)}
                                                    className={`w-10 h-10 rounded-xl flex-shrink-0 flex items-center justify-center text-xl border transition-all ${formIcon === icon ? 'bg-[#6C5DD3] border-[#6C5DD3]' : 'bg-white/5 border-white/10'}`}
                                                >
                                                    {icon}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                    
                                    {/* RESET STREAK BUTTON (ONLY WHEN EDITING) */}
                                    {editingId && (
                                        <button 
                                            onClick={resetHabitProgress}
                                            className="w-full py-3 mt-4 bg-red-500/10 text-red-500 rounded-xl font-black uppercase text-[10px] tracking-widest border border-red-500/20 hover:bg-red-500/20 transition-all"
                                        >
                                            Сбросить прогресс (Стрик)
                                        </button>
                                    )}
                                </>
                            )}

                            {activeTab === 'GOALS' && (
                                <div className="flex gap-3">
                                    <input 
                                        type="number"
                                        value={formTarget}
                                        onChange={e => setFormTarget(e.target.value)}
                                        placeholder="Цель (число)"
                                        className="flex-1 bg-black/20 border border-white/10 p-4 rounded-xl text-white font-bold outline-none focus:border-[#6C5DD3]"
                                    />
                                    <select 
                                        value={formUnit}
                                        onChange={e => setFormUnit(e.target.value)}
                                        className="w-20 bg-black/20 border border-white/10 p-4 rounded-xl text-white font-bold outline-none"
                                    >
                                        <option value="₽">₽</option>
                                        <option value="$">$</option>
                                        <option value="km">км</option>
                                        <option value="kg">кг</option>
                                        <option value="#">шт</option>
                                    </select>
                                </div>
                            )}
                            
                            <p className="text-center text-white/30 text-[10px] font-bold uppercase tracking-widest mt-4">
                                Нажмите "Сохранить" внизу
                            </p>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
