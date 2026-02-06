
import React, { useState, useRef, useEffect } from 'react';
import { ArenaScenario, ChatMessage } from '../types';
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

export const SalesArena: React.FC = () => {
    const [scenarios] = useState<ArenaScenario[]>(() => Storage.get<ArenaScenario[]>('scenarios', SCENARIOS));
    const [activeScenario, setActiveScenario] = useState<ArenaScenario | null>(null);
    const [chatSession, setChatSession] = useState<Chat | null>(null);
    const [history, setHistory] = useState<ChatMessage[]>([]);
    const [inputText, setInputText] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [battleResult, setBattleResult] = useState<string | null>(null);
    const [isEvaluating, setIsEvaluating] = useState(false);
    const [typingHint, setTypingHint] = useState<string | null>(null);
    
    const messagesEndRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [history, isLoading]);

    const startScenario = (scenario: ArenaScenario) => {
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
    };

    const handleSend = async () => {
        if (!inputText.trim() || !chatSession) return;
        const userMsg: ChatMessage = {
            id: Date.now().toString(),
            role: 'user',
            text: inputText,
            timestamp: new Date().toISOString()
        };
        const updatedHistory = [...history, userMsg];
        setHistory(updatedHistory);
        setInputText('');
        setIsLoading(true);
        telegram.haptic('light');

        const responseText = await sendMessageToGemini(chatSession, userMsg.text);
        setHistory([...updatedHistory, {
            id: (Date.now() + 1).toString(),
            role: 'model',
            text: responseText,
            timestamp: new Date().toISOString()
        }]);
        setIsLoading(false);
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
            <div className="p-6 pb-32 animate-fade-in max-w-2xl mx-auto space-y-8">
                <div className="pt-4">
                    <span className="text-[#6C5DD3] text-[10px] font-black uppercase tracking-[0.3em] mb-2 block">Training Ground</span>
                    <h1 className="text-4xl font-black text-text-primary tracking-tighter">АРЕНА <br/><span className="text-text-secondary opacity-30">СИМУЛЯЦИЙ</span></h1>
                </div>

                <div className="grid gap-4">
                    {scenarios.map(sc => (
                        <button 
                            key={sc.id} 
                            onClick={() => startScenario(sc)}
                            className="bg-surface border border-border-color rounded-[2.5rem] p-6 text-left group transition-all active:scale-[0.98] relative overflow-hidden shadow-sm"
                        >
                            <div className="absolute top-0 right-0 p-6 text-5xl opacity-5 grayscale group-hover:grayscale-0 group-hover:opacity-20 transition-all group-hover:scale-110">⚔️</div>
                            <div className="flex justify-between items-start mb-4">
                                <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest ${
                                    sc.difficulty === 'Easy' ? 'bg-green-500/10 text-green-500' :
                                    sc.difficulty === 'Medium' ? 'bg-orange-500/10 text-orange-500' : 'bg-red-500/10 text-red-500'
                                }`}>
                                    {sc.difficulty}
                                </span>
                            </div>
                            <h3 className="text-xl font-black text-text-primary mb-2 tracking-tight group-hover:text-[#6C5DD3] transition-colors">{sc.title}</h3>
                            <p className="text-text-secondary text-xs leading-relaxed font-medium line-clamp-2">{sc.objective}</p>
                        </button>
                    ))}
                </div>
            </div>
        );
    }

    return (
        <div className="flex flex-col h-screen bg-[#0F1115] text-white overflow-hidden animate-fade-in">
            {/* Simulation Header */}
            <div className="px-6 pt-[calc(var(--safe-top)+10px)] pb-4 flex items-center justify-between bg-black/40 backdrop-blur-xl border-b border-white/5 relative z-20">
                <button onClick={() => setActiveScenario(null)} className="w-10 h-10 rounded-2xl bg-white/5 flex items-center justify-center">
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
                </button>
                <div className="text-center">
                    <p className="text-[#6C5DD3] text-[8px] font-black uppercase tracking-widest animate-pulse">Live Simulation</p>
                    <h2 className="text-xs font-black uppercase">{activeScenario.title}</h2>
                </div>
                <button onClick={finishBattle} className="px-4 py-2 bg-red-500 text-white text-[9px] font-black uppercase rounded-xl shadow-lg shadow-red-500/20">Завершить</button>
            </div>

            {/* Battle Feed */}
            <div className="flex-1 overflow-y-auto px-6 py-8 space-y-6 custom-scrollbar relative">
                <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-5 pointer-events-none"></div>
                
                {history.map((msg, i) => (
                    <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} animate-slide-up`} style={{ animationDelay: `${i*0.1}s` }}>
                        <div className={`max-w-[85%] p-5 rounded-[2rem] text-sm font-medium leading-relaxed shadow-xl ${
                            msg.role === 'user' 
                                ? 'bg-[#6C5DD3] text-white rounded-tr-sm' 
                                : 'bg-white/5 border border-white/10 text-white rounded-tl-sm backdrop-blur-md'
                        }`}>
                            {msg.text}
                        </div>
                    </div>
                ))}
                {isLoading && (
                    <div className="flex justify-start">
                        <div className="bg-white/5 border border-white/10 p-4 rounded-2xl rounded-tl-sm animate-pulse">
                            <div className="flex gap-1">
                                <div className="w-1 h-1 bg-white/40 rounded-full animate-bounce"></div>
                                <div className="w-1 h-1 bg-white/40 rounded-full animate-bounce delay-100"></div>
                                <div className="w-1 h-1 bg-white/40 rounded-full animate-bounce delay-200"></div>
                            </div>
                        </div>
                    </div>
                )}
                <div ref={messagesEndRef} />
            </div>

            {/* Input Area */}
            <div className="p-6 bg-black/60 backdrop-blur-2xl border-t border-white/5 relative z-20">
                <div className="max-w-2xl mx-auto flex gap-3">
                    <input 
                        value={inputText}
                        onChange={e => setInputText(e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && handleSend()}
                        placeholder="Ваша реплика..."
                        className="flex-1 bg-white/5 border border-white/10 rounded-2xl px-5 py-4 text-sm font-bold focus:border-[#6C5DD3] outline-none transition-all"
                    />
                    <button onClick={handleSend} className="w-14 h-14 bg-[#6C5DD3] rounded-2xl flex items-center justify-center shadow-lg shadow-[#6C5DD3]/20 active:scale-95 transition-all">
                        <svg className="w-6 h-6 rotate-90" fill="currentColor" viewBox="0 0 24 24"><path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/></svg>
                    </button>
                </div>
            </div>

            {/* Evaluation Modal */}
            {(isEvaluating || battleResult) && (
                <div className="fixed inset-0 z-[100] bg-black/90 backdrop-blur-xl flex items-center justify-center p-6 animate-fade-in">
                    <div className="bg-[#1F2128] border border-white/10 rounded-[3rem] p-8 w-full max-w-sm shadow-2xl relative overflow-hidden">
                        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-[#6C5DD3] to-[#FFAB7B]"></div>
                        {isEvaluating ? (
                            <div className="text-center py-10 space-y-4">
                                <div className="w-16 h-16 border-4 border-[#6C5DD3] border-t-transparent rounded-full animate-spin mx-auto"></div>
                                <p className="text-xs font-black uppercase tracking-widest text-[#6C5DD3]">Анализ тактики боя...</p>
                            </div>
                        ) : (
                            <div className="animate-scale-in">
                                <h3 className="text-2xl font-black text-white mb-6 uppercase tracking-tight">Вердикт</h3>
                                <div className="bg-white/5 rounded-2xl p-5 mb-8 text-sm text-white/80 leading-relaxed max-h-[40vh] overflow-y-auto custom-scrollbar italic font-medium">
                                    {battleResult}
                                </div>
                                <button onClick={() => setActiveScenario(null)} className="w-full py-4 bg-white text-black rounded-2xl font-black uppercase text-xs tracking-widest">В строй</button>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};
