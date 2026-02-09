
import React from 'react';
import { Button } from './Button';

interface WelcomeProps {
  onStart: () => void;
}

export const Welcome: React.FC<WelcomeProps> = ({ onStart }) => {
  return (
    <div className="min-h-screen bg-body relative overflow-hidden flex flex-col justify-between py-10 px-6 transition-colors duration-300">

      {/* --- ABSTRACT BACKGROUND --- */}
      <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
          <div className="absolute inset-0 bg-body"></div>

          {/* Gradient Orbs */}
          <div className="absolute -top-[20%] -left-[20%] w-[80%] h-[80%] bg-[#6C5DD3]/15 rounded-full filter blur-[100px] animate-blob"></div>
          <div className="absolute top-[20%] -right-[20%] w-[80%] h-[80%] bg-[#6C5DD3]/10 rounded-full filter blur-[100px] animate-blob animation-delay-2000"></div>
          <div className="absolute -bottom-[20%] left-[20%] w-[80%] h-[80%] bg-[#FFAB7B]/10 rounded-full filter blur-[100px] animate-blob animation-delay-4000"></div>
      </div>

      {/* Hero Section */}
      <div className="relative z-10 pt-10 animate-slide-up">
        <div className="w-16 h-16 bg-[#6C5DD3]/10 backdrop-blur-md rounded-2xl flex items-center justify-center border border-border-color shadow-sm mb-8 group">
            <span className="text-3xl group-hover:scale-125 transition-transform duration-500">🛡️</span>
        </div>

        <h1 className="text-5xl font-bold text-text-primary leading-[0.9] mb-6">
          МОП<br />
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#6C5DD3] via-[#8B7FD9] to-[#FFAB7B] animate-gradient-x">KRAUZ</span>
        </h1>

        <div className="flex items-center gap-3 mb-6">
            <div className="h-[1px] w-12 bg-[#6C5DD3]"></div>
            <span className="text-[#6C5DD3] font-semibold uppercase tracking-wide text-[10px]">Академия Продаж</span>
        </div>

        <p className="text-text-secondary text-sm font-medium leading-relaxed max-w-[90%] border-l-2 border-border-color pl-4">
          Элитная подготовка менеджеров. Психология влияния, жесткие переговоры и AI-наставничество.
        </p>
      </div>

      {/* Features */}
      <div className="relative z-10 space-y-4 my-8 animate-slide-up delay-100">
         {[
             { title: 'AI Командир', desc: 'Разбор диалогов 24/7', icon: '🤖', color: 'bg-blue-500' },
             { title: 'Боевая Арена', desc: 'Симуляции переговоров', icon: '⚔️', color: 'bg-red-500' },
             { title: 'Система Рангов', desc: 'Карьера от новичка до профи', icon: '🏆', color: 'bg-yellow-500' },
         ].map((feat, i) => (
             <div key={i} className="flex items-center gap-4 group p-3 rounded-2xl hover:bg-surface transition-colors border border-transparent hover:border-border-color">
                 <div className={`w-12 h-12 rounded-xl bg-card border border-border-color flex items-center justify-center text-xl relative overflow-hidden`}>
                     <div className={`absolute inset-0 opacity-20 ${feat.color} blur-lg group-hover:opacity-40 transition-opacity`}></div>
                     <span className="relative z-10">{feat.icon}</span>
                 </div>
                 <div>
                     <h3 className="text-text-primary font-bold text-sm group-hover:text-[#6C5DD3] transition-colors">{feat.title}</h3>
                     <p className="text-text-secondary text-xs">{feat.desc}</p>
                 </div>
             </div>
         ))}
      </div>

      {/* CTA */}
      <div className="relative z-10 animate-slide-up delay-200">
        <Button
            onClick={onStart}
            fullWidth
            className="!py-5 !text-sm !rounded-2xl shadow-sm relative overflow-hidden group"
        >
            <span className="relative z-10 font-bold group-hover:scale-105 transition-transform inline-block">Начать Обучение</span>
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent translate-x-[-100%] animate-[shimmer_2s_infinite]"></div>
        </Button>
        <p className="text-center text-text-secondary text-[9px] font-medium tracking-wide mt-6 opacity-60">
            Krauz Sales System v5.0
        </p>
      </div>
      
      <style>{`
        @keyframes shimmer {
            100% { transform: translateX(100%); }
        }
      `}</style>
    </div>
  );
};
