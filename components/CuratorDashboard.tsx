
import React, { useMemo } from 'react';
import { UserProgress, Module } from '../types';
import { Button } from './Button';

interface CuratorDashboardProps {
  users: UserProgress[];
  modules: Module[];
}

export const CuratorDashboard: React.FC<CuratorDashboardProps> = ({ users, modules }) => {
  // Filter for students only and sort by XP (descending)
  const students = useMemo(() => 
    users.filter(u => u.role === 'STUDENT').sort((a, b) => b.xp - a.xp), 
  [users]);

  // Calculate total possible lessons to determine progress percentage
  const totalLessons = useMemo(() => 
    modules.reduce((acc, m) => acc + m.lessons.length, 0), 
  [modules]);

  return (
    <div className="p-6 bg-slate-50 dark:bg-[#050505] min-h-full pb-32 max-w-2xl mx-auto transition-colors duration-300">
      <header className="mb-8 relative overflow-hidden bg-white dark:bg-[#14161B] p-6 rounded-[2.5rem] border border-slate-100 dark:border-white/5 shadow-xl shadow-slate-200/50 dark:shadow-none animate-slide-up">
        {/* Decorative Background Elements */}
        <div className="absolute top-0 right-0 w-40 h-40 bg-[#6C5DD3]/10 rounded-full blur-[50px] -mr-10 -mt-10 pointer-events-none"></div>
        <div className="absolute bottom-0 left-0 w-24 h-24 bg-purple-400/10 rounded-full blur-[30px] -ml-8 -mb-8 pointer-events-none"></div>

        <div className="relative z-10">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-[#6C5DD3]/5 text-[#6C5DD3] border border-[#6C5DD3]/10 rounded-full text-[10px] font-black tracking-widest uppercase mb-4 backdrop-blur-sm">
            <span className="w-1.5 h-1.5 rounded-full bg-[#6C5DD3] animate-pulse"></span>
            Панель Куратора
          </div>
          
          <h1 className="text-4xl font-black text-slate-900 dark:text-white mb-2 tracking-tight leading-[1.1]">
            Мониторинг <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#6C5DD3] to-purple-400">Бойцов</span>
          </h1>
          
          <p className="text-slate-500 dark:text-white/50 font-medium text-sm mt-2 max-w-[80%] leading-relaxed">
            Под вашим командованием: <span className="text-slate-900 dark:text-white font-bold">{students.length} курсантов</span>.
          </p>
        </div>
      </header>

      <div className="space-y-4 animate-slide-up" style={{ animationDelay: '0.1s' }}>
        {students.map((student) => {
            const completedCount = student.completedLessonIds?.length || 0;
            const progressPercent = totalLessons > 0 ? Math.round((completedCount / totalLessons) * 100) : 0;
            
            return (
                <div key={student.telegramId || student.name} className="bg-white dark:bg-[#14161B] p-5 rounded-[2rem] border border-slate-100 dark:border-white/5 shadow-sm hover:shadow-md transition-all">
                    <div className="flex items-center gap-4 mb-4">
                        <img 
                            src={student.avatarUrl || `https://ui-avatars.com/api/?name=${student.name}`} 
                            className="w-12 h-12 rounded-full bg-slate-100 object-cover border-2 border-white dark:border-[#1F2128]" 
                        />
                        <div>
                            <h3 className="font-bold text-slate-900 dark:text-white text-lg leading-tight">{student.name}</h3>
                            <div className="flex items-center gap-2 mt-1">
                                <span className="text-[10px] font-black uppercase text-slate-400 dark:text-white/30 tracking-wider">Lvl {student.level}</span>
                                <span className="w-1 h-1 bg-slate-300 rounded-full"></span>
                                <span className="text-[10px] font-black text-[#6C5DD3]">{student.xp} XP</span>
                            </div>
                        </div>
                        <div className="ml-auto text-right">
                            <span className="text-2xl font-black text-[#6C5DD3]">{progressPercent}%</span>
                        </div>
                    </div>
                    
                    {/* Progress Bar */}
                    <div className="h-2 w-full bg-slate-100 dark:bg-white/5 rounded-full overflow-hidden mb-3">
                        <div className="h-full bg-[#6C5DD3] rounded-full" style={{ width: `${progressPercent}%` }}></div>
                    </div>
                    
                    <div className="flex justify-between items-center">
                         <div className="px-3 py-1 rounded-lg bg-slate-50 dark:bg-white/5 border border-slate-100 dark:border-white/5 text-[10px] font-bold text-slate-500 dark:text-white/50">
                             Уроков пройдено: {completedCount}/{totalLessons}
                         </div>
                         {student.telegramUsername && (
                             <a 
                                href={`https://t.me/${student.telegramUsername}`} 
                                target="_blank" 
                                rel="noreferrer"
                                className="text-[10px] font-bold text-[#6C5DD3] hover:underline"
                             >
                                 Написать @{student.telegramUsername}
                             </a>
                         )}
                    </div>
                </div>
            );
        })}
        
        {students.length === 0 && (
            <div className="text-center py-16 opacity-50 border-2 border-dashed border-slate-200 dark:border-white/10 rounded-[2rem]">
                <div className="text-3xl mb-2">🔭</div>
                <p className="text-slate-400 dark:text-white/40 font-bold uppercase text-xs tracking-widest">Нет студентов в базе</p>
            </div>
        )}
      </div>
    </div>
  );
};
