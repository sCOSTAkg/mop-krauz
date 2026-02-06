
import React from 'react';
import { Button } from './Button';

// Mock data for homework submissions
const PENDING_HOMEWORKS = [
  { id: '1', student: 'Иван Петров', lesson: 'Типы клиентов', date: '12:00 Сегодня', content: 'Аналитический тип: любит цифры, факты. Драйвер: ценит время, результат...' },
  { id: '2', student: 'Анна Сидорова', lesson: 'Холодные звонки', date: '09:30 Вчера', content: 'Скрипт: "Здравствуйте, Иван Иванович! Звоню по рекомендации..."' },
  { id: '3', student: 'Макс Волков', lesson: 'Работа с возражениями', date: '18:45 Вчера', content: 'На возражение "дорого" я отвечу ценностью продукта...' },
];

export const CuratorDashboard: React.FC = () => {
  return (
    <div className="p-6 bg-slate-50 min-h-full pb-32 max-w-2xl mx-auto">
      <header className="mb-8 relative overflow-hidden bg-white p-6 rounded-[2.5rem] border border-slate-100 shadow-xl shadow-slate-200/50 animate-slide-up">
        {/* Decorative Background Elements */}
        <div className="absolute top-0 right-0 w-40 h-40 bg-[#6C5DD3]/10 rounded-full blur-[50px] -mr-10 -mt-10 pointer-events-none"></div>
        <div className="absolute bottom-0 left-0 w-24 h-24 bg-purple-400/10 rounded-full blur-[30px] -ml-8 -mb-8 pointer-events-none"></div>

        <div className="relative z-10">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-[#6C5DD3]/5 text-[#6C5DD3] border border-[#6C5DD3]/10 rounded-full text-[10px] font-black tracking-widest uppercase mb-4 backdrop-blur-sm">
            <span className="w-1.5 h-1.5 rounded-full bg-[#6C5DD3] animate-pulse"></span>
            Панель Куратора
          </div>
          
          <h1 className="text-4xl font-black text-slate-900 mb-2 tracking-tight leading-[1.1]">
            Проверка <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#6C5DD3] to-purple-400">Боевых Задач</span>
          </h1>
          
          <p className="text-slate-500 font-medium text-sm mt-2 max-w-[80%] leading-relaxed">
            Внимание к деталям. <span className="text-slate-900 font-bold">{PENDING_HOMEWORKS.length} новобранца</span> ждут вашего вердикта.
          </p>
        </div>
      </header>

      <div className="space-y-6 animate-slide-up" style={{ animationDelay: '0.1s' }}>
        {PENDING_HOMEWORKS.map((hw, i) => (
          <div key={hw.id} className="bg-white p-6 rounded-[2rem] shadow-sm border border-slate-100 hover:shadow-md transition-all group">
            <div className="flex justify-between items-start mb-4">
              <div className="flex items-center gap-3">
                 <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-lg shadow-inner font-bold text-slate-500">
                    {hw.student.charAt(0)}
                 </div>
                 <div>
                    <h3 className="font-bold text-slate-900 text-lg leading-tight group-hover:text-[#6C5DD3] transition-colors">{hw.student}</h3>
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-wide">{hw.lesson}</p>
                 </div>
              </div>
              <span className="text-[10px] font-bold bg-slate-50 text-slate-400 px-2 py-1 rounded-lg border border-slate-100">{hw.date}</span>
            </div>
            
            <div className="bg-slate-50 p-5 rounded-2xl mb-5 border border-slate-100 relative">
               <div className="absolute top-4 left-4 text-2xl text-slate-200 font-serif leading-none">"</div>
               <p className="text-slate-600 italic text-sm pl-4 relative z-10 line-clamp-3">
                 {hw.content}
               </p>
            </div>

            <div className="flex gap-3">
              <Button variant="ghost" className="flex-1 text-xs uppercase tracking-wider font-bold text-slate-500 hover:bg-slate-100 rounded-xl">
                Отклонить
              </Button>
              <Button variant="primary" className="flex-1 text-xs uppercase tracking-wider font-bold bg-[#6C5DD3] hover:bg-[#5b4eb5] rounded-xl shadow-lg shadow-[#6C5DD3]/20">
                Принять отчет
              </Button>
            </div>
          </div>
        ))}

        {PENDING_HOMEWORKS.length === 0 && (
            <div className="text-center py-12 opacity-50">
                <div className="text-4xl mb-2">🎉</div>
                <p className="text-slate-400 font-bold uppercase text-xs tracking-widest">Все задачи проверены</p>
            </div>
        )}
      </div>
    </div>
  );
};
