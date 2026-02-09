
import React from 'react';
import { Module } from '../types';
import { UniversalVideoPlayer } from './UniversalVideoPlayer';

interface ModuleCardProps {
  module: Module;
  onClick: () => void;
  isLocked?: boolean;
}

export const ModuleCard: React.FC<ModuleCardProps> = ({ module, onClick, isLocked = false }) => {
  const getCategoryColor = (category: string) => {
    const colors: Record<string, string> = {
      'SALES': 'from-red-500 to-orange-500',
      'PSYCHOLOGY': 'from-purple-500 to-pink-500',
      'TACTICS': 'from-blue-500 to-cyan-500',
      'GENERAL': 'from-green-500 to-teal-500'
    };
    return colors[category] || 'from-gray-500 to-gray-700';
  };

  return (
    <div
      onClick={!isLocked ? onClick : undefined}
      className={`relative group rounded-2xl overflow-hidden backdrop-blur-xl transition-all duration-300 
        ${isLocked ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:scale-[1.02] hover:shadow-md'}`}
    >
      {/* Background gradient */}
      <div className={`absolute inset-0 bg-gradient-to-br ${getCategoryColor(module.category)} opacity-20`} />

      {/* Image */}
      {module.imageUrl && (
        <div className="relative h-48 overflow-hidden">
          <img
            src={module.imageUrl}
            alt={module.title}
            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent" />
        </div>
      )}

      {/* Content */}
      <div className="relative p-6 bg-card/80 backdrop-blur">
        <div className="flex items-start justify-between mb-3">
          <h3 className="text-xl font-bold text-text-primary line-clamp-2">{module.title}</h3>
          {isLocked && (
            <svg className="w-6 h-6 text-yellow-500 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
              <path d="M10 2a5 5 0 00-5 5v2a2 2 0 00-2 2v5a2 2 0 002 2h10a2 2 0 002-2v-5a2 2 0 00-2-2H7V7a3 3 0 015.905-.75 1 1 0 001.937-.5A5.002 5.002 0 0010 2z" />
            </svg>
          )}
        </div>

        <p className="text-text-secondary text-sm mb-4 line-clamp-3">{module.description}</p>

        <div className="flex items-center justify-between">
          <span className="text-xs font-medium px-3 py-1 rounded-full bg-spartan-purple/20 text-spartan-purple">
            {module.category}
          </span>
          <span className="text-xs text-text-secondary">
            Уровень {module.minLevel}+
          </span>
        </div>

        {/* Progress indicator if lessons exist */}
        {module.lessons && module.lessons.length > 0 && (
          <div className="mt-4 pt-4 border-t border-border-color">
            <div className="text-xs text-text-secondary mb-2">
              {module.lessons.length} уроков
            </div>
          </div>
        )}
      </div>

      {/* Video preview on hover */}
      {module.videoUrl && !isLocked && (
        <div className="absolute inset-0 bg-black/90 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center">
          <UniversalVideoPlayer
            url={module.videoUrl}
            controls={false}
            className="w-full h-full"
          />
        </div>
      )}
    </div>
  );
};
