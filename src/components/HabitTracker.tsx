
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Habit, Goal, SmartNavAction } from '../types';
import { telegram } from '../services/telegramService';


interface HabitTrackerProps {
    habits: Habit[];
    goals: Goal[];
    onUpdateHabits: (newHabits: Habit[]) => void;
    onUpdateGoals: (newGoals: Goal[]) => void;
    onXPEarned: (amount: number) => void;
    onBack: () => void;
    setNavAction?: (action: SmartNavAction | null) => void;
    isAuthenticated?: boolean;
}

type TabType = 'HABITS' | 'GOALS';

const calculateStreak = (completedDates: string[]): number => {
    if (!completedDates.length) return 0;
    const sorted = [...completedDates].sort().reverse();
    const today = new Date(); today.setHours(0,0,0,0);
    const yesterday = new Date(today); yesterday.setDate(yesterday.getDate() - 1);
    const todayStr = today.toISOString().split('T')[0];
    const yesterdayStr = yesterday.toISOString().split('T')[0];
    if (sorted[0] !== todayStr && sorted[0] !== yesterdayStr) return 0;
    let streak = 0;
    let checkDate = new Date(sorted[0]);
    for (const dateStr of sorted) {
        const expected = checkDate.toISOString().split('T')[0];
        if (dateStr === expected) { streak++; checkDate.setDate(checkDate.getDate() - 1); }
        else if (dateStr < expected) break;
    }
    return streak;
};

const getLast30Days = (): string[] => {
    const days: string[] = [];
    for (let i = 29; i >= 0; i--) { const d = new Date(); d.setDate(d.getDate() - i); days.push(d.toISOString().split('T')[0]); }
    return days;
};

const getWeeklyRate = (completedDates: string[]): number => {
    const weekAgo = new Date(); weekAgo.setDate(weekAgo.getDate() - 7);
    const weekStr = weekAgo.toISOString().split('T')[0];
    return Math.round((completedDates.filter(d => d >= weekStr).length / 7) * 100);
};

const AVAILABLE_ICONS = ['🔥','💧','💪','📚','🧘','💰','🐔','🥦','🏃','💤','🎯','🚀','⭐','💎'];

export const HabitTracker: React.FC<HabitTrackerProps> = ({ habits, goals, onUpdateHabits, onUpdateGoals, onXPEarned, onBack, setNavAction, isAuthenticated }) => {
    const [activeTab, setActiveTab] = useState<TabType>('HABITS');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [formTitle, setFormTitle] = useState('');
    const [formDescription, setFormDescription] = useState('');
    const [formIcon, setFormIcon] = useState('🔥');
    const [formTarget, setFormTarget] = useState('');
    const [formUnit, setFormUnit] = useState('₽');
    const [expandedHabit, setExpandedHabit] = useState<string | null>(null);

    const today = new Date().toISOString().split('T')[0];
    const last30 = useMemo(() => getLast30Days(), [today]);

    useEffect(() => {
        if (!setNavAction) return;
        if (isAuthenticated) {
            if (isModalOpen) {
                setNavAction({ label: editingId ? 'СОХРАНИТЬ' : 'СОЗДАТЬ', onClick: handleSave, variant: 'success', icon: '💾' });
            } else {
                setNavAction({ label: activeTab === 'HABITS' ? 'НОВАЯ ПРИВЫЧКА' : 'НОВАЯ ЦЕЛЬ', onClick: () => openModal(), variant: 'primary', icon: '+' });
            }
        } else { setNavAction(null); }
        return () => { setNavAction(null); };
    }, [activeTab, isModalOpen, formTitle, formTarget, formUnit, formIcon, formDescription, editingId, isAuthenticated]);

    const openModal = useCallback((item?: Habit | Goal) => {
        if (item) {
            setEditingId(item.id); setFormTitle(item.title);
            if ('description' in item) setFormDescription(item.description || '');
            if ('icon' in item) setFormIcon(item.icon);
            if ('targetValue' in item) setFormTarget(item.targetValue.toString());
            if ('unit' in item) setFormUnit(item.unit);
        } else { setEditingId(null); setFormTitle(''); setFormDescription(''); setFormIcon('🔥'); setFormTarget(''); setFormUnit('₽'); }
        setIsModalOpen(true); telegram.haptic('selection');
    }, []);

    const closeModal = useCallback(() => { setIsModalOpen(false); setEditingId(null); }, []);

    const handleSave = useCallback(() => {
        if (!formTitle.trim()) { telegram.haptic('error'); return; }
        if (activeTab === 'HABITS') {
            if (editingId) { onUpdateHabits(habits.map(h => h.id === editingId ? { ...h, title: formTitle, description: formDescription, icon: formIcon } : h)); }
            else { onUpdateHabits([...habits, { id: Date.now().toString(), title: formTitle, description: formDescription, streak: 0, completedDates: [], targetDaysPerWeek: 7, icon: formIcon }]); }
        } else {
            if (!formTarget) { telegram.haptic('error'); return; }
            if (editingId) { onUpdateGoals(goals.map(g => g.id === editingId ? { ...g, title: formTitle, targetValue: parseFloat(formTarget), unit: formUnit } : g)); }
            else { onUpdateGoals([...goals, { id: Date.now().toString(), title: formTitle, currentValue: 0, targetValue: parseFloat(formTarget), unit: formUnit, isCompleted: false, colorStart: '#6C5DD3', colorEnd: '#FFAB7B' }]); }
        }
        closeModal(); telegram.haptic('success');
    }, [activeTab, editingId, formTitle, formDescription, formIcon, formTarget, formUnit, habits, goals]);

    const toggleHabit = useCallback((habitId: string, date: string) => {
        telegram.haptic('selection');
        onUpdateHabits(habits.map(h => {
            if (h.id !== habitId) return h;
            const isCompleted = h.completedDates.includes(date);
            const newDates = isCompleted ? h.completedDates.filter(d => d !== date) : [...h.completedDates, date];
            if (!isCompleted) {
                const newStreak = calculateStreak(newDates);
                if (newStreak > 0 && newStreak % 7 === 0) { telegram.showAlert(`🔥 ${newStreak} дней подряд! ${h.title}`, 'ДОСТИЖЕНИЕ'); onXPEarned(newStreak >= 30 ? 300 : 100); }
            }
            return { ...h, completedDates: newDates, streak: calculateStreak(newDates) };
        }));
    }, [habits, onXPEarned]);

    const deleteItem = useCallback((id: string) => {
        if (confirm('Удалить элемент?')) {
            activeTab === 'HABITS' ? onUpdateHabits(habits.filter(h => h.id !== id)) : onUpdateGoals(goals.filter(g => g.id !== id));
            telegram.haptic('warning');
        }
    }, [activeTab, habits, goals]);

    const updateGoalProgress = useCallback((id: string, amount: number) => {
        onUpdateGoals(goals.map(g => {
            if (g.id !== id) return g;
            const newValue = Math.min(g.targetValue, Math.max(0, g.currentValue + amount));
            const isNowCompleted = newValue >= g.targetValue;
            if (!g.isCompleted && isNowCompleted) { telegram.haptic('success'); telegram.showAlert(`🏆 ЦЕЛЬ ДОСТИГНУТА: ${g.title}`, 'ЛЕГЕНДА'); onXPEarned(500); }
            else if (amount > 0) telegram.haptic('light');
            return { ...g, currentValue: newValue, isCompleted: isNowCompleted };
        }));
    }, [goals, onXPEarned]);

    if (!isAuthenticated) {
        return (
            <div className="flex flex-col h-full bg-body text-text-primary animate-fade-in relative p-6">
                <button onClick={onBack} className="w-10 h-10 rounded-2xl bg-card border border-border-color flex items-center justify-center text-text-primary mb-6">
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
                </button>
                <div className="text-center mb-8">
                    <h2 className="text-3xl font-bold tracking-tight">Трекер привычек</h2>
                    <p className="text-text-secondary text-sm mt-2">Развивай полезные привычки и ставь амбициозные цели.</p>
                </div>
                <div className="relative overflow-hidden rounded-2xl border border-border-color bg-card h-[300px]">
                    <div className="absolute inset-0 z-10 bg-body/20 backdrop-blur-sm flex flex-col items-center justify-center p-6 text-center">
                        <div className="w-16 h-16 bg-[#6C5DD3] rounded-full flex items-center justify-center text-3xl mb-4">🔒</div>
                        <h3 className="text-xl font-semibold mb-2">Доступ закрыт</h3>
                        <p className="text-text-secondary text-sm mb-6">Авторизуйтесь, чтобы отслеживать прогресс.</p>
                        <button onClick={onBack} className="px-6 py-3 bg-[#6C5DD3] text-white rounded-xl font-semibold text-sm">Войти в профиль</button>
                    </div>
                    <div className="p-4 space-y-3 opacity-30 pointer-events-none filter blur-sm">
                        <div className="bg-body h-20 rounded-2xl w-full" /><div className="bg-body h-20 rounded-2xl w-full" />
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="flex flex-col h-full bg-body text-text-primary animate-fade-in relative">
            <div className="px-6 pt-[calc(var(--safe-top)+10px)] pb-4 flex items-center justify-between bg-body/90 backdrop-blur-md sticky top-0 z-20 border-b border-border-color">
                <button onClick={onBack} className="w-10 h-10 rounded-2xl bg-card border border-border-color flex items-center justify-center active:scale-90 transition-transform text-text-primary">
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
                </button>
                <div className="flex bg-card p-1 rounded-xl border border-border-color">
                    {(['HABITS','GOALS'] as TabType[]).map(tab => (
                        <button key={tab} onClick={() => setActiveTab(tab)} className={`px-4 py-2 text-sm font-semibold rounded-lg transition-all ${activeTab === tab ? 'bg-[#6C5DD3] text-white shadow-sm' : 'text-text-secondary'}`}>
                            {tab === 'HABITS' ? 'Привычки' : 'Цели'}
                        </button>
                    ))}
                </div>
                <button onClick={() => openModal()} className="w-10 h-10 rounded-2xl bg-[#6C5DD3] text-white flex items-center justify-center active:scale-90 transition-transform shadow-sm">
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" /></svg>
                </button>
            </div>

            <div className="p-4 pb-40 overflow-y-auto space-y-4 custom-scrollbar">
                {activeTab === 'HABITS' && (
                    <div className="space-y-4 animate-slide-up">
                        {habits.length === 0 && <div className="text-center py-20 opacity-40"><span className="text-6xl block mb-4 grayscale">🧘</span><p className="text-sm font-semibold text-text-secondary">Дисциплина начинается здесь</p></div>}
                        {habits.map((habit) => {
                            const streak = calculateStreak(habit.completedDates);
                            const weekRate = getWeeklyRate(habit.completedDates);
                            const isExpanded = expandedHabit === habit.id;
                            const isDoneToday = habit.completedDates.includes(today);
                            return (
                                <div key={habit.id} className="bg-card border border-border-color rounded-2xl overflow-hidden relative group shadow-sm transition-all hover:shadow-md">
                                    <div className="p-4 flex items-center gap-4">
                                        <button onClick={() => toggleHabit(habit.id, today)}
                                            className={`w-12 h-12 rounded-xl flex items-center justify-center text-2xl flex-shrink-0 transition-all duration-300 ${isDoneToday ? 'bg-[#34C759] text-white shadow-md shadow-[#34C759]/30 scale-110' : 'bg-body border border-border-color hover:border-[#6C5DD3] active:scale-95'}`}>
                                            {isDoneToday ? '✓' : habit.icon}
                                        </button>
                                        <div className="flex-1 min-w-0 cursor-pointer" onClick={() => setExpandedHabit(isExpanded ? null : habit.id)}>
                                            <h3 className={`font-semibold text-sm leading-tight transition-colors ${isDoneToday ? 'text-[#34C759]' : 'text-text-primary'}`}>{habit.title}</h3>
                                            {habit.description && <p className="text-xs text-text-secondary line-clamp-1 mt-0.5">{habit.description}</p>}
                                        </div>
                                        <div className="flex flex-col items-end gap-1">
                                            {streak > 0 && <div className="flex items-center gap-1 text-xs font-semibold bg-orange-500/10 text-orange-500 px-2 py-1 rounded-lg border border-orange-500/20"><span>🔥</span><span>{streak}д</span></div>}
                                            <span className="text-[10px] text-text-secondary font-medium">{weekRate}% / нед</span>
                                        </div>
                                    </div>
                                    {isExpanded && (
                                        <div className="px-4 pb-4 animate-slide-up">
                                            <div className="bg-body rounded-xl p-3 border border-border-color">
                                                <div className="flex justify-between items-center mb-2">
                                                    <span className="text-[10px] font-semibold text-text-secondary uppercase tracking-wider">30 дней</span>
                                                    <span className="text-[10px] font-medium text-text-secondary">{habit.completedDates.filter(d => d >= last30[0]).length}/30</span>
                                                </div>
                                                <div className="grid grid-cols-10 gap-1">
                                                    {last30.map(day => {
                                                        const done = habit.completedDates.includes(day);
                                                        const isT = day === today;
                                                        const isF = day > today;
                                                        return (
                                                            <button key={day} onClick={() => !isF && toggleHabit(habit.id, day)} disabled={isF}
                                                                className={`aspect-square rounded-md transition-all text-[8px] font-bold flex items-center justify-center ${isF ? 'bg-border-color/30 cursor-default' : done ? 'bg-[#34C759] text-white shadow-sm' : isT ? 'bg-[#6C5DD3]/20 border border-[#6C5DD3] text-[#6C5DD3]' : 'bg-body border border-border-color/50 hover:border-[#6C5DD3]/50'}`}
                                                                title={day}>{new Date(day).getDate()}</button>
                                                        );
                                                    })}
                                                </div>
                                            </div>
                                            <div className="flex gap-2 mt-3">
                                                <button onClick={() => openModal(habit)} className="flex-1 py-2.5 bg-body rounded-xl text-xs font-semibold border border-border-color text-text-primary active:scale-95 transition-all">✏️ Изменить</button>
                                                <button onClick={() => deleteItem(habit.id)} className="py-2.5 px-4 bg-[#FF3B30]/10 rounded-xl text-xs font-semibold text-[#FF3B30] border border-[#FF3B30]/20 active:scale-95 transition-all">Удалить</button>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                )}

                {activeTab === 'GOALS' && (
                    <div className="space-y-4 animate-slide-up">
                        {goals.length === 0 && <div className="text-center py-20 opacity-40"><span className="text-6xl block mb-4 grayscale">🎯</span><p className="text-sm font-semibold text-text-secondary">Цели не заданы</p></div>}
                        <div className="grid gap-4">
                            {goals.map(goal => {
                                const percent = Math.min(100, Math.round((goal.currentValue / goal.targetValue) * 100));
                                const step = goal.targetValue > 1000 ? 1000 : goal.targetValue > 100 ? 100 : 1;
                                return (
                                    <div key={goal.id} className="bg-card border border-border-color rounded-2xl p-5 relative overflow-hidden shadow-sm group">
                                        <div className="absolute bottom-0 left-0 h-1 w-full bg-body"><div className="h-full transition-all duration-1000 ease-out rounded-full" style={{ width: `${percent}%`, background: goal.isCompleted ? '#34C759' : 'linear-gradient(90deg, #6C5DD3, #FFAB7B)' }} /></div>
                                        <div className="flex justify-between items-start mb-5">
                                            <div onClick={() => openModal(goal)} className="cursor-pointer flex-1">
                                                <div className="flex items-center gap-2 mb-1"><h3 className="font-semibold text-lg text-text-primary">{goal.title}</h3>{goal.isCompleted && <span className="text-lg">🏆</span>}</div>
                                                <p className="text-xs font-semibold text-text-secondary">{goal.currentValue.toLocaleString()} / {goal.targetValue.toLocaleString()} {goal.unit}</p>
                                            </div>
                                            <span className="text-3xl font-bold text-[#6C5DD3]">{percent}%</span>
                                        </div>
                                        {!goal.isCompleted ? (
                                            <div className="flex gap-3">
                                                <button onClick={() => updateGoalProgress(goal.id, step)} className="flex-1 py-3 bg-body hover:bg-black/5 dark:hover:bg-white/5 rounded-xl text-xs font-semibold border border-border-color active:scale-95 transition-all text-text-primary">+{step.toLocaleString()} {goal.unit}</button>
                                                <button onClick={() => updateGoalProgress(goal.id, step * 5)} className="flex-1 py-3 bg-body hover:bg-black/5 dark:hover:bg-white/5 rounded-xl text-xs font-semibold border border-border-color active:scale-95 transition-all text-text-primary">+{(step * 5).toLocaleString()} {goal.unit}</button>
                                            </div>
                                        ) : (
                                            <div className="py-3 bg-[#34C759]/10 text-[#34C759] text-center rounded-xl text-sm font-semibold border border-[#34C759]/20">Достигнуто</div>
                                        )}
                                        <button onClick={() => deleteItem(goal.id)} className="absolute top-4 right-4 text-text-secondary opacity-0 group-hover:opacity-100 hover:text-[#FF3B30] transition-opacity">✕</button>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}
            </div>

            {isModalOpen && (
                <div className="absolute inset-0 z-50 bg-black/60 backdrop-blur-xl flex items-end sm:items-center justify-center animate-fade-in pb-0 sm:pb-10">
                    <div className="w-full sm:max-w-sm bg-card rounded-t-2xl sm:rounded-2xl p-8 pb-12 border-t border-border-color shadow-sm animate-slide-up">
                        <div className="flex justify-between items-center mb-8">
                            <h3 className="text-xl font-semibold text-text-primary">{editingId ? 'Редактировать' : 'Создать'}</h3>
                            <button onClick={closeModal} className="w-8 h-8 rounded-full bg-body flex items-center justify-center text-text-secondary hover:text-text-primary">✕</button>
                        </div>
                        <div className="space-y-5">
                            <div className="space-y-1">
                                <label className="text-xs font-semibold text-text-secondary ml-2">Название</label>
                                <input value={formTitle} onChange={e => setFormTitle(e.target.value)} placeholder="Например: Бег по утрам" className="w-full bg-body border border-border-color p-4 rounded-2xl text-text-primary font-semibold outline-none focus:border-[#6C5DD3] transition-colors" autoFocus />
                            </div>
                            {activeTab === 'HABITS' && (<>
                                <div className="space-y-1">
                                    <label className="text-xs font-semibold text-text-secondary ml-2">Описание</label>
                                    <input value={formDescription} onChange={e => setFormDescription(e.target.value)} placeholder="Детали (опционально)" className="w-full bg-body border border-border-color p-4 rounded-2xl text-xs text-text-primary outline-none focus:border-[#6C5DD3] transition-colors" />
                                </div>
                                <div>
                                    <label className="text-xs font-semibold text-text-secondary mb-2 block ml-2">Иконка</label>
                                    <div className="flex gap-3 overflow-x-auto pb-2 no-scrollbar">
                                        {AVAILABLE_ICONS.map(icon => (<button key={icon} onClick={() => setFormIcon(icon)} className={`w-12 h-12 rounded-xl flex-shrink-0 flex items-center justify-center text-2xl border transition-all ${formIcon === icon ? 'bg-[#6C5DD3] border-[#6C5DD3] shadow-sm scale-110' : 'bg-body border-border-color'}`}>{icon}</button>))}
                                    </div>
                                </div>
                            </>)}
                            {activeTab === 'GOALS' && (
                                <div className="grid grid-cols-3 gap-3">
                                    <div className="col-span-2 space-y-1">
                                        <label className="text-xs font-semibold text-text-secondary ml-2">Цель (число)</label>
                                        <input type="number" value={formTarget} onChange={e => setFormTarget(e.target.value)} placeholder="100000" className="w-full bg-body border border-border-color p-4 rounded-2xl text-text-primary font-semibold outline-none focus:border-[#6C5DD3]" />
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-xs font-semibold text-text-secondary ml-2">Ед.изм.</label>
                                        <select value={formUnit} onChange={e => setFormUnit(e.target.value)} className="w-full bg-body border border-border-color p-4 rounded-2xl text-text-primary font-semibold outline-none h-[58px]">
                                            <option value="₽">₽</option><option value="$">$</option><option value="km">км</option><option value="kg">кг</option><option value="#">шт</option>
                                        </select>
                                    </div>
                                </div>
                            )}
                            <button onClick={handleSave} className="w-full py-4 bg-[#6C5DD3] text-white rounded-2xl font-semibold text-sm shadow-sm active:scale-[0.98] transition-all mt-2">{editingId ? 'Сохранить' : 'Создать'}</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
