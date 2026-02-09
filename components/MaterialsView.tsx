
import React from 'react';
import { Material, UserProgress } from '../types';
import { telegram } from '../services/telegramService';

interface MaterialsViewProps {
  materials: Material[];
  onBack: () => void;
  userProgress: UserProgress; // Added prop
}

export const MaterialsView: React.FC<MaterialsViewProps> = React.memo(({ materials, userProgress }: MaterialsViewProps) => {
  const isAuthenticated = userProgress.isAuthenticated;

  const handleMaterialClick = (e: React.MouseEvent, mat: Material) => {
      if (!isAuthenticated) {
          e.preventDefault();
          telegram.haptic('error');
          telegram.showAlert('Материалы доступны только авторизованным бойцам.', 'Доступ закрыт');
      }
  };

  return (
    <div className="px-4 pt-6 pb-28 max-w-2xl mx-auto space-y-6 animate-fade-in">
          <div>
                <h1 className="text-2xl font-bold text-text-primary">Материалы</h1>
                <p className="text-sm text-text-secondary mt-1">Полезные ресурсы и документы</p>
          </div>

          <div className="grid gap-3">
              {materials.map((mat) => (
                  <a
                    key={mat.id}
                    href={isAuthenticated ? mat.url : '#'}
                    onClick={(e) => handleMaterialClick(e, mat)}
                    target={isAuthenticated ? "_blank" : "_self"}
                    rel="noreferrer"
                    className={`
                        bg-card rounded-2xl p-4 border border-border-color flex items-center gap-4 group transition-all shadow-sm
                        ${!isAuthenticated ? 'opacity-60 grayscale cursor-not-allowed' : 'active:scale-[0.98] hover:shadow-md'}
                    `}
                  >
                      {!isAuthenticated && (
                          <div className="absolute inset-0 flex items-center justify-center bg-black/10 z-20 backdrop-blur-[2px] rounded-2xl">
                              <span className="text-xl">🔒</span>
                          </div>
                      )}

                      <div className="w-11 h-11 rounded-xl flex items-center justify-center text-xl flex-shrink-0 bg-body border border-border-color">
                          {mat.type === 'PDF' ? '📄' : mat.type === 'VIDEO' ? '🎥' : '🔗'}
                      </div>
                      <div className="flex-1 min-w-0">
                          <h3 className="text-sm font-semibold text-text-primary mb-0.5 truncate group-hover:text-[#6C5DD3] transition-colors">{mat.title}</h3>
                          <p className="text-text-secondary text-xs leading-tight line-clamp-2">{mat.description}</p>
                      </div>
                      <svg className="w-4 h-4 text-text-secondary flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                  </a>
              ))}
              {materials.length === 0 && (
                  <div className="text-center py-16">
                      <div className="w-14 h-14 rounded-2xl bg-[#6C5DD3]/10 flex items-center justify-center text-2xl mb-3 mx-auto">📚</div>
                      <p className="text-text-secondary text-sm font-medium">База пуста</p>
                  </div>
              )}
          </div>
    </div>
  );
});
