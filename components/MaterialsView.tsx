
import React from 'react';
import { Material } from '../types';

interface MaterialsViewProps {
  materials: Material[];
  onBack: () => void;
}

export const MaterialsView: React.FC<MaterialsViewProps> = ({ materials }) => {
  return (
    <div className="px-6 pt-10 pb-32 max-w-2xl mx-auto space-y-8 animate-fade-in">
          <div>
                <span className="text-[#6C5DD3] text-[10px] font-black uppercase tracking-[0.3em] mb-2 block">Knowledge Base</span>
                <h1 className="text-4xl font-black text-text-primary tracking-tighter">БАЗА <br/><span className="text-text-secondary opacity-30">АРСЕНАЛА</span></h1>
          </div>

          <div className="grid gap-4">
              {materials.map((mat, i) => (
                  <a 
                    key={mat.id} 
                    href={mat.url}
                    target="_blank"
                    rel="noreferrer"
                    className="bg-surface rounded-[2.5rem] p-6 border border-border-color flex items-center gap-5 group transition-all active:scale-[0.98] shadow-sm animate-slide-up"
                    style={{ animationDelay: `${i * 0.1}s` }}
                  >
                      <div className={`w-14 h-14 rounded-2xl flex items-center justify-center text-2xl flex-shrink-0 relative overflow-hidden bg-body border border-border-color`}>
                          <div className={`absolute inset-0 opacity-10 ${mat.type === 'PDF' ? 'bg-red-500' : mat.type === 'VIDEO' ? 'bg-blue-500' : 'bg-green-500'}`}></div>
                          <span className="relative z-10">{mat.type === 'PDF' ? '📄' : mat.type === 'VIDEO' ? '🎥' : '🔗'}</span>
                      </div>
                      <div className="flex-1 min-w-0">
                          <h3 className="text-md font-black text-text-primary mb-1 truncate group-hover:text-[#6C5DD3] transition-colors">{mat.title}</h3>
                          <p className="text-text-secondary text-[10px] font-bold uppercase tracking-wide leading-tight line-clamp-2">{mat.description}</p>
                      </div>
                      <div className="w-8 h-8 rounded-full bg-body border border-border-color flex items-center justify-center text-text-secondary group-hover:bg-[#6C5DD3] group-hover:text-white transition-all">
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M9 5l7 7-7 7" /></svg>
                      </div>
                  </a>
              ))}
              {materials.length === 0 && (
                  <div className="text-center py-20 opacity-30">
                      <p className="text-text-secondary text-xs font-black uppercase tracking-widest">База пуста</p>
                  </div>
              )}
          </div>
    </div>
  );
};
