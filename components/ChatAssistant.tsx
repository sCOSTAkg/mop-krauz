
import React, { useState, useEffect, useRef } from 'react';
import { ChatMessage } from '../types';
import { createChatSession, sendMessageToGemini } from '../services/geminiService';
import { Chat } from '@google/genai';

interface ChatAssistantProps {
  history: ChatMessage[];
  onUpdateHistory: (newHistory: ChatMessage[]) => void;
  systemInstruction: string;
}

export const ChatAssistant: React.FC<ChatAssistantProps> = ({ history, onUpdateHistory, systemInstruction }) => {
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [chatSession, setChatSession] = useState<Chat | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!chatSession) {
        const session = createChatSession(systemInstruction);
        setChatSession(session);
    }
    if (history.length === 0) {
      const initialMsg: ChatMessage = { id: 'welcome', role: 'model', text: 'Привет, боец! Я твой AI-командир. Готов к разбору полетов?', timestamp: new Date().toISOString() };
      onUpdateHistory([initialMsg]);
    }
  }, [systemInstruction, chatSession, history.length, onUpdateHistory]);

  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [history, isLoading]);

  const handleSend = async () => {
    if (!inputText.trim() || !chatSession) return;
    const userMsg: ChatMessage = { id: Date.now().toString(), role: 'user', text: inputText, timestamp: new Date().toISOString() };
    const updatedHistory = [...history, userMsg];
    onUpdateHistory(updatedHistory);
    setInputText('');
    setIsLoading(true);
    const responseText = await sendMessageToGemini(chatSession, userMsg.text);
    const modelMsg: ChatMessage = { id: (Date.now() + 1).toString(), role: 'model', text: responseText, timestamp: new Date().toISOString() };
    onUpdateHistory([...updatedHistory, modelMsg]);
    setIsLoading(false);
  };

  return (
    <div className="flex flex-col h-full bg-[#F2F4F6] max-w-2xl mx-auto w-full animate-fade-in min-h-screen">
      {/* Header */}
      <div className="px-6 py-6 flex items-center justify-between sticky top-0 z-10 bg-[#F2F4F6]/90 backdrop-blur-sm">
        <div>
           <h1 className="text-2xl font-black text-[#1A1A1A]">Штаб</h1>
           <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest">AI Commander</p>
        </div>
        <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center shadow-soft text-xl">🫡</div>
      </div>

      {/* Chat Area */}
      <div className="flex-1 overflow-y-auto px-5 py-4 space-y-6 pb-32">
        {history.map((msg) => (
          <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} animate-slide-in`}>
            {msg.role === 'model' && (
                <div className="w-8 h-8 rounded-full bg-[#1A1A1A] flex-shrink-0 mr-3 flex items-center justify-center text-white text-[10px]">CMD</div>
            )}
            <div className={`max-w-[85%] p-5 text-sm font-medium leading-relaxed shadow-sm ${
                msg.role === 'user' 
                  ? 'bg-[#1A1A1A] text-white rounded-[20px] rounded-tr-sm' 
                  : 'bg-white text-[#1A1A1A] rounded-[20px] rounded-tl-sm'
              }`}>
              {msg.text}
            </div>
          </div>
        ))}
        {isLoading && (
          <div className="flex justify-start animate-fade-in">
             <div className="w-8 h-8 rounded-full bg-[#1A1A1A] mr-3"></div>
             <div className="bg-white px-6 py-4 rounded-[20px] rounded-tl-sm shadow-sm flex gap-1.5 items-center">
                 <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce"></span>
                 <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce delay-100"></span>
                 <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce delay-200"></span>
             </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="p-5 fixed bottom-24 left-0 right-0 max-w-2xl mx-auto z-20">
        <div className="bg-white p-2 rounded-[2rem] shadow-soft flex items-center gap-2 pr-2">
          <input
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
            placeholder="Запросить инструктаж..."
            className="flex-1 bg-transparent text-[#1A1A1A] p-4 pl-6 focus:outline-none placeholder:text-slate-400 text-sm font-bold"
          />
          <button onClick={handleSend} disabled={!inputText.trim() || isLoading} className="w-12 h-12 bg-[#1A1A1A] rounded-full text-white flex items-center justify-center hover:scale-105 transition-transform disabled:opacity-30">
            ↑
          </button>
        </div>
      </div>
    </div>
  );
};
