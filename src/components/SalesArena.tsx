
import React, { useState, useRef, useEffect } from 'react';
import { ArenaScenario, ChatMessage, UserProgress } from '../types';
import { createArenaSession, sendMessageToGemini, evaluateArenaBattle, getArenaHint } from '../services/geminiService';
import { Storage } from '../services/storage';
import { telegram } from '../services/telegramService';
import { Chat } from '@google/genai';

export const SCENARIOS: ArenaScenario[] = [
    {
        id: 's1',
        title: 'Продай ручку',
        difficulty: 'Easy',
        clientRole: 'Скептичный предприниматель, у которого уже есть дорогая ручка Parker. Он торопится.',
        objective: 'Убедить клиента рассмотреть твою ручку как запасной вариант или подарок.',
        initialMessage: 'Молодой человек, у меня встреча через 2 минуты. Что у вас?'
    },
    {
        id: 's2',
        title: 'Отработка "Дорого"',
        difficulty: 'Medium',
        clientRole: 'Экономный закупщик, который ищет самое дешевое решение. Не видит ценности в качестве.',
        objective: 'Обосновать высокую цену через долгосрочную выгоду.',
        initialMessage: 'Я видел ваше предложение. Цены космос. У конкурентов на 30% дешевле.'
    },
    {
        id: 's3',
        title: 'Холодный звонок',
        difficulty: 'Hard',
        clientRole: 'Раздраженный директор, которого постоянно отвлекают звонками. Хочет бросить трубку.',
        objective: 'Зацепить внимание за 30 секунд и назначить встречу.',
        initialMessage: 'Алло? Кто это? Откуда у вас мой номер?'
    }
];

interface SalesArenaProps {
    userProgress?: UserProgress;
}

export const SalesArena: React.FC<SalesArenaProps> = ({ userProgress }) => {
    const [scenarios] = useState<ArenaScenario[]>(() => Storage.get<ArenaScenario[]>('scenarios', SCENARIOS));
    const [activeScenario, setActiveScenario] = useState<ArenaScenario | null>(null);
    const [chatSession, setChatSession] = useState<Chat | null>(null);
    const [history, setHistory] = useState<ChatMessage[]>([]);
    const [inputText, setInputText] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [battleResult, setBattleResult] = useState<string | null>(null);
    const [isEvaluating, setIsEvaluating] = useState(false);

    // Hint State
    const [hint, setHint] = useState<string | null>(null);
    const [isHintLoading, setIsHintLoading] = useState(false);

    const messagesEndRef = useRef<HTMLDivElement>(null);
    const isAuthenticated = userProgress?.isAuthenticated;

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [history, isLoading, hint]);

    const startScenario = (scenario: ArenaScenario) => {
        if (!isAuthenticated) {
            telegram.haptic('error');
            telegram.showAlert('Доступ к симулятору разрешен только авторизованным агентам.', 'Доступ Запрещен');
            return;
        }
        telegram.haptic('medium');
        setActiveScenario(scenario);
        const session = createArenaSession(scenario.clientRole, scenario.objective);
        setChatSession(session);
        setHistory([{
            id: 'init',
            role: 'model',
            text: scenario.initialMessage,
            timestamp: new Date().toISOString()
        }]);
        setBattleResult(null);
        setHint(null);
    };

    const handleSend = async () => {
        if (!inputText.trim() || !chatSession) return;
        const userMsg: ChatMessage = {
            id: Date.now().toString(),
            role: 'user',
            text: inputText,
            timestamp: new Date().toISOString()
        };

        // Optimistic Update
        setHistory(prev => [...prev, userMsg]);
        setInputText('');
        setHint(null);
        setIsLoading(true);
        telegram.haptic('light');

        const responseText = await sendMessageToGemini(chatSession, userMsg.text);

        setHistory(prev => [...prev, {
            id: (Date.now() + 1).toString(),
            role: 'model',
            text: responseText,
            timestamp: new Date().toISOString()
        }]);
        setIsLoading(false);
    };

    const handleGetHint = async () => {
        if (!activeScenario || isHintLoading) return;

        setIsHintLoading(true);
        telegram.haptic('selection');

        // Find last client message
        const lastClientMsg = [...history].reverse().find(m => m.role === 'model')?.text || '';

        const hintText = await getArenaHint(
            activeScenario.clientRole,
            activeScenario.objective,
            lastClientMsg,
            inputText // Pass what user has typed so far
        );

        setHint(hintText || 'Действуй по ситуации, боец!');
        setIsHintLoading(false);
        telegram.haptic('medium');
    };

    const finishBattle = async () => {
        setIsEvaluating(true);
        telegram.haptic('heavy');
        const result = await evaluateArenaBattle(history.map(m => ({role: m.role, text: m.text})), activeScenario!.objective);
        setBattleResult(result);
        setIsEvaluating(false);
    };

    if (!activeScenario) {
        return (
            <div className="px-4 pt-6 pb-28 animate-fade-in max-w-2xl mx-auto space-y-6">
                <div>
                    <h1 className="text-2xl font-bold text-text-primary">Арена симуляций</h1>
                    <p className="text-sm text-text-secondary mt-1">Тренируйте навыки продаж</p>
                </div>

                {!isAuthenticated && (
                    <div className="bg-card border border-border-color p-4 rounded-2xl flex items-center gap-4">
                        <div className="w-10 h-10 rounded-xl bg-[#FF9500]/10 flex items-center justify-center text-lg">🔒</div>
                        <div>
                            <h3 className="text-text-primary font-semibold text-sm">Демо-режим</h3>
                            <p className="text-text-secondary text-xs">Войдите в профиль, чтобы начать бой.</p>
                        </div>
                    </div>
                )}

                <div className="grid gap-3">
                    {scenarios.map(sc => (
                        <button
                            key={sc.id}
                            onClick={() => startScenario(sc)}
                            className="bg-card border border-border-color rounded-2xl p-4 text-left group transition-all active:scale-[0.98] shadow-sm hover:shadow-md"
                        >
                            <div className="flex justify-between items-start mb-3">
                                <span className={`px-2.5 py-1 rounded-lg text-xs font-medium ${
                                    sc.difficulty === 'Easy' ? 'bg-[#34C759]/10 text-[#34C759]' :
                                    sc.difficulty === 'Medium' ? 'bg-[#FF9500]/10 text-[#FF9500]' : 'bg-[#FF3B30]/10 text-[#FF3B30]'
                                }`}>
                                    {sc.difficulty === 'Easy' ? 'Легко' : sc.difficulty === 'Medium' ? 'Средне' : 'Сложно'}
                                </span>
                                {!isAuthenticated && <span className="text-xs">🔒</span>}
                            </div>
                            <h3 className="text-lg font-semibold text-text-primary mb-1.5 group-hover:text-[#6C5DD3] transition-colors">{sc.title}</h3>
                            <p className="text-text-secondary text-xs leading-relaxed line-clamp-2">{sc.objective}</p>
                        </button>
                    ))}
                </div>
            </div>
        );
    }

    return (
        <div className="flex flex-col h-screen bg-body text-text-primary overflow-hidden animate-fade-in">
            {/* Simulation Header */}
            <div className="px-4 pt-[calc(var(--safe-top)+8px)] pb-3 flex items-center justify-between bg-surface/90 backdrop-blur-md border-b border-border-color relative z-20">
                <button onClick={() => setActiveScenario(null)} className="w-9 h-9 rounded-xl bg-body flex items-center justify-center">
                    <svg className="w-5 h-5 text-text-secondary" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
                </button>
                <div className="text-center">
                    <p className="text-[#6C5DD3] text-xs font-medium">Симуляция</p>
                    <h2 className="text-sm font-semibold text-text-primary">{activeScenario.title}</h2>
                </div>
                <button onClick={finishBattle} className="px-3.5 py-2 bg-[#FF3B30] text-white text-xs font-semibold rounded-xl">Завершить</button>
            </div>

            {/* Battle Feed */}
            <div className="flex-1 overflow-y-auto px-4 py-6 space-y-4 custom-scrollbar">
                {history.map((msg) => (
                    <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} animate-fade-in`}>
                        <div className={`max-w-[85%] px-4 py-3 rounded-2xl text-sm leading-relaxed ${
                            msg.role === 'user'
                                ? 'bg-[#6C5DD3] text-white rounded-tr-md'
                                : 'bg-card border border-border-color text-text-primary rounded-tl-md'
                        }`}>
                            {msg.text}
                        </div>
                    </div>
                ))}

                {isLoading && (
                    <div className="flex justify-start">
                        <div className="bg-card border border-border-color px-4 py-3 rounded-2xl rounded-tl-md">
                            <div className="flex gap-1.5">
                                <div className="w-1.5 h-1.5 bg-text-secondary rounded-full animate-bounce"></div>
                                <div className="w-1.5 h-1.5 bg-text-secondary rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                                <div className="w-1.5 h-1.5 bg-text-secondary rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                            </div>
                        </div>
                    </div>
                )}

                {hint && (
                    <div className="flex justify-center animate-fade-in">
                        <div className="bg-[#FF9500]/10 border border-[#FF9500]/20 text-[#FF9500] px-4 py-2.5 rounded-2xl text-xs font-medium flex items-center gap-2 max-w-[90%]">
                            <span>💡</span>
                            {hint}
                        </div>
                    </div>
                )}

                <div ref={messagesEndRef} />
            </div>

            {/* Input Area */}
            <div className="px-4 py-3 bg-surface border-t border-border-color relative z-20">
                <div className="max-w-2xl mx-auto flex gap-2.5">
                    <button
                        onClick={handleGetHint}
                        disabled={isHintLoading}
                        className="w-12 h-12 rounded-xl bg-body border border-border-color flex items-center justify-center text-lg active:scale-95 transition-all disabled:opacity-50"
                    >
                        {isHintLoading ? <div className="w-4 h-4 border-2 border-text-secondary border-t-[#6C5DD3] rounded-full animate-spin"></div> : '💡'}
                    </button>

                    <input
                        value={inputText}
                        onChange={e => setInputText(e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && handleSend()}
                        placeholder="Ваша реплика..."
                        className="flex-1 bg-body border border-border-color rounded-xl px-4 py-3 text-sm font-medium focus:border-[#6C5DD3] outline-none transition-all placeholder:text-text-secondary"
                    />
                    <button onClick={handleSend} className="w-12 h-12 bg-[#6C5DD3] rounded-xl flex items-center justify-center active:scale-95 transition-all">
                        <svg className="w-5 h-5 text-white rotate-90" fill="currentColor" viewBox="0 0 24 24"><path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/></svg>
                    </button>
                </div>
            </div>

            {/* Evaluation Modal */}
            {(isEvaluating || battleResult) && (
                <div className="fixed inset-0 z-[100] bg-black/40 backdrop-blur-sm flex items-center justify-center p-6 animate-fade-in">
                    <div className="bg-card border border-border-color rounded-2xl p-6 w-full max-w-sm shadow-sm">
                        {isEvaluating ? (
                            <div className="text-center py-8 space-y-4">
                                <div className="w-12 h-12 border-3 border-[#6C5DD3] border-t-transparent rounded-full animate-spin mx-auto"></div>
                                <p className="text-sm font-medium text-[#6C5DD3]">Анализ тактики...</p>
                            </div>
                        ) : (
                            <div className="animate-fade-in">
                                <h3 className="text-xl font-bold text-text-primary mb-4">Вердикт</h3>
                                <div className="bg-body rounded-xl p-4 mb-6 text-sm text-text-secondary leading-relaxed max-h-[40vh] overflow-y-auto custom-scrollbar">
                                    {battleResult}
                                </div>
                                <button onClick={() => setActiveScenario(null)} className="w-full py-3.5 bg-[#6C5DD3] text-white rounded-xl font-semibold text-sm">Вернуться</button>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};
