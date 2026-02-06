
import React from 'react';
import { Button } from './Button';

interface WelcomeProps {
  onStart: () => void;
}

export const Welcome: React.FC<WelcomeProps> = ({ onStart }) => {
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#050505] relative overflow-hidden flex flex-col justify-between py-10 px-6 transition-colors duration-300">
      {/* Background Effects */}
      <div className="absolute top-[-20%] left-[-20%] w-[140%] h-[60%] bg-[#4A3D8D] blur-[120px] opacity-10 dark:opacity-30 pointer-events-none rounded-full"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-[80%] h-[40%] bg-[#FFAB7B] blur-[100px] opacity-10 pointer-events-none rounded-full"></div>
      
      {/* Grid Pattern */}
      <div className="absolute inset-0 opacity-[0.03] dark:opacity-[0.03] pointer-events-none" style={{ backgroundImage: 'linear-gradient(currentColor 1px, transparent 1px), linear-gradient(90deg, currentColor 1px, transparent 1px)', backgroundSize: '40px 40px', color: 'inherit' }}></div>

      {/* Hero Section */}
      <div className="relative z-10 pt-10 animate-slide-up">
        <div className="w-16 h-16 bg-white dark:bg-[#1F2128] rounded-2xl flex items-center justify-center border border-slate-200 dark:border-white/10 shadow-2xl mb-8">
            <span className="text-3xl">🛡️</span>
        </div>
        
        <h1 className="text-5xl font-black text-slate-900 dark:text-white leading-[0.9] tracking-tighter mb-4">
          SALES<br />
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#6C5DD3] to-[#FFAB7B]">ELITE</span>
        </h1>
        <p className="text-slate-500 dark:text-slate-400 text-sm font-medium leading-relaxed max-w-[80%]">
          Курс подготовки бойцов коммерческого фронта. Закалка характера, психология влияния и AI-наставничество.
        </p>
      </div>

      {/* Features */}
      <div className="relative z-10 space-y-6 my-8 animate-slide-up delay-100">
         {[
             { title: 'AI Командир', desc: 'Персональный разбор диалогов 24/7', icon: '🤖' },
             { title: 'Боевая Арена', desc: 'Симуляции переговоров с клиентами', icon: '⚔️' },
             { title: 'Ранг и XP', desc: 'Прокачка от новобранца до легенды', icon: '🏆' },
         ].map((feat, i) => (
             <div key={i} className="flex items-center gap-4 group">
                 <div className="w-12 h-12 rounded-full bg-slate-200 dark:bg-white/5 flex items-center justify-center text-xl group-hover:bg-[#6C5DD3]/20 group-hover:scale-110 transition-all duration-300">
                     {feat.icon}
                 </div>
                 <div>
                     <h3 className="text-slate-900 dark:text-white font-bold text-sm uppercase tracking-wide">{feat.title}</h3>
                     <p className="text-slate-500 dark:text-slate-500 text-xs">{feat.desc}</p>
                 </div>
             </div>
         ))}
      </div>

      {/* CTA */}
      <div className="relative z-10 animate-slide-up delay-200">
        <Button 
            onClick={onStart} 
            fullWidth 
            className="!py-5 !text-sm !rounded-[1.5rem] !bg-slate-900 !text-white dark:!bg-white dark:!text-black hover:!bg-slate-800 dark:hover:!bg-slate-200 shadow-[0_0_40px_rgba(0,0,0,0.1)] dark:shadow-[0_0_40px_rgba(255,255,255,0.1)] relative overflow-hidden"
        >
            <span className="relative z-10 font-black tracking-widest uppercase">Вступить в ряды</span>
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent translate-x-[-100%] animate-[shimmer_2s_infinite]"></div>
        </Button>
        <p className="text-center text-slate-400 dark:text-slate-600 text-[9px] font-bold uppercase tracking-[0.2em] mt-4">
            Project 300 Spartans v4.5
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
