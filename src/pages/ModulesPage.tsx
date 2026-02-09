import React from 'react';
import { useAppContext } from '../App';
import { ModuleList } from '../components/ModuleList';
import { Tab } from '../types';

export const ModulesPage = () => {
  const ctx = useAppContext();
  return (
    <div className="px-4 pt-6 pb-28 max-w-2xl mx-auto space-y-6 animate-fade-in">
      <div className="flex items-center gap-3">
        <button onClick={() => ctx.setActiveTab(Tab.HOME)} className="w-10 h-10 rounded-xl bg-surface border border-border-color flex items-center justify-center active:scale-95 transition-transform">
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
        </button>
        <h1 className="text-2xl font-bold text-text-primary">Все модули</h1>
      </div>
      <ModuleList modules={ctx.modules} userProgress={ctx.userProgress} onSelectLesson={(l: any) => ctx.setSelectedLessonId(l.id)} onBack={() => ctx.setActiveTab(Tab.HOME)} />
    </div>
  );
};
