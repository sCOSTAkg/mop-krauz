
import React, { useState } from 'react';
import { CalendarEvent, EventType } from '../types';
import { MOCK_EVENTS } from '../constants';
import { telegram } from '../services/telegramService';
import { Storage } from '../services/storage';

interface CalendarViewProps {
    externalEvents?: CalendarEvent[];
}

const getDaysInMonth = (year: number, month: number) => new Date(year, month + 1, 0).getDate();
const getFirstDayOfMonth = (year: number, month: number) => {
  let day = new Date(year, month, 1).getDay();
  return day === 0 ? 6 : day - 1;
};

const formatTime = (date: Date | string) => {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
};

// --- ICS Export Logic ---
const generateICS = (events: CalendarEvent[]) => {
    let icsContent = "BEGIN:VCALENDAR\nVERSION:2.0\nPRODID:-//SalesPro//SpartanCalendar//EN\n";

    events.forEach(evt => {
        const d = new Date(evt.date);
        const start = d.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
        const endD = new Date(d.getTime() + (evt.durationMinutes || 60) * 60000);
        const end = endD.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';

        icsContent += "BEGIN:VEVENT\n";
        icsContent += `UID:${evt.id}@salespro.app\n`;
        icsContent += `DTSTAMP:${start}\n`;
        icsContent += `DTSTART:${start}\n`;
        icsContent += `DTEND:${end}\n`;
        icsContent += `SUMMARY:⚔️ ${evt.title}\n`;
        icsContent += `DESCRIPTION:${evt.description}\n`;
        icsContent += "END:VEVENT\n";
    });

    icsContent += "END:VCALENDAR";
    return icsContent;
};

export const CalendarView: React.FC<CalendarViewProps> = ({ externalEvents }) => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(new Date());

  // Use passed events or fall back to Storage, then Mock
  const [storedEvents] = useState<CalendarEvent[]>(() => Storage.get<CalendarEvent[]>('events', MOCK_EVENTS));
  const allEvents = externalEvents && externalEvents.length > 0 ? externalEvents : storedEvents;

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const daysInMonth = getDaysInMonth(year, month);
  const firstDay = getFirstDayOfMonth(year, month);

  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);
  const blanks = Array.from({ length: firstDay }, (_, i) => i);

  const monthNames = ['Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь', 'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь'];

  const handleExportCalendar = () => {
    telegram.haptic('success');
    const icsData = generateICS(allEvents);
    const blob = new Blob([icsData], { type: 'text/calendar;charset=utf-8' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'spartan_schedule.ics');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    // Cleanup memory
    window.URL.revokeObjectURL(url);
  };

  const getEventsForDay = (day: number) => {
    return allEvents.filter(e => {
      const d = typeof e.date === 'string' ? new Date(e.date) : e.date;
      return d.getDate() === day && d.getMonth() === month && d.getFullYear() === year;
    });
  };

  const selectedEvents = selectedDate
    ? allEvents.filter(e => {
        const d = typeof e.date === 'string' ? new Date(e.date) : e.date;
        return d.getDate() === selectedDate.getDate() && d.getMonth() === selectedDate.getMonth() && d.getFullYear() === selectedDate.getFullYear();
      })
    : [];

  const getEventTypeColor = (type: EventType) => {
    switch(type) {
      case EventType.WEBINAR: return 'bg-[#6C5DD3]';
      case EventType.HOMEWORK: return 'bg-[#D4AF37]';
      default: return 'bg-text-secondary';
    }
  };

  return (
    <div className="flex flex-col h-full animate-fade-in text-text-primary">
        {/* Sync Status Badge */}
        <div className="flex justify-between items-center mb-4">
            <span className="px-3 py-1 bg-[#34C759]/10 text-[#34C759] text-[10px] font-medium rounded-full border border-[#34C759]/20">
               Sync Active
            </span>
            <button
                onClick={handleExportCalendar}
                className="flex items-center gap-1.5 text-[11px] font-semibold text-[#6C5DD3] bg-[#6C5DD3]/10 px-3 py-1.5 rounded-full hover:bg-[#6C5DD3]/20 transition-colors"
            >
                <span>📅</span>
                <span>Экспорт (.ics)</span>
            </button>
        </div>

        {/* Calendar Card */}
        <div className="p-5 rounded-2xl mb-6 border bg-card border-border-color shadow-sm">
            <div className="flex items-center justify-between mb-5">
                <button onClick={() => setCurrentDate(new Date(year, month - 1, 1))} className="p-3 text-text-secondary hover:text-[#6C5DD3] transition-colors">←</button>
                <span className="text-sm font-semibold text-text-primary">{monthNames[month]} {year}</span>
                <button onClick={() => setCurrentDate(new Date(year, month + 1, 1))} className="p-3 text-text-secondary hover:text-[#6C5DD3] transition-colors">→</button>
            </div>

            <div className="grid grid-cols-7 gap-1 mb-2 text-center text-text-secondary text-[10px] font-medium opacity-60">
                {['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'].map(d => <div key={d}>{d}</div>)}
            </div>

            <div className="grid grid-cols-7 gap-1">
            {blanks.map(x => <div key={`blank-${x}`} className="aspect-square"></div>)}
            {days.map(day => {
                const dayEvents = getEventsForDay(day);
                const isSelected = selectedDate?.getDate() === day && selectedDate?.getMonth() === month;
                const isToday = new Date().getDate() === day && new Date().getMonth() === month && new Date().getFullYear() === year;

                return (
                <div key={day} onClick={() => { setSelectedDate(new Date(year, month, day)); telegram.haptic('selection'); }}
                    className={`aspect-square rounded-xl flex flex-col items-center justify-center relative cursor-pointer transition-all
                    ${isSelected ? 'bg-[#6C5DD3] text-white shadow-md shadow-[#6C5DD3]/30 scale-105 z-10' : 'hover:bg-body'}
                    ${isToday && !isSelected ? 'border-2 border-[#D4AF37] text-[#D4AF37]' : ''}
                    `}
                >
                    <span className="text-xs font-semibold">{day}</span>
                    <div className="flex gap-0.5 mt-1 h-1">
                        {dayEvents.map(ev => (<div key={ev.id} className={`w-1 h-1 rounded-full ${getEventTypeColor(ev.type)}`}></div>))}
                    </div>
                </div>
                );
            })}
            </div>
        </div>

        {/* Events list */}
        <div className="space-y-3 px-1">
            {selectedEvents.length === 0 ? (
                <div className="text-center py-8 rounded-2xl border-2 border-dashed border-border-color text-text-secondary">
                    <p className="font-medium text-xs">Событий нет</p>
                </div>
            ) : (
                selectedEvents.map(event => (
                    <div key={event.id} className="p-4 rounded-2xl flex items-center gap-4 border transition-transform active:scale-[0.98] bg-card border-border-color shadow-sm">
                        <div className={`w-11 h-11 rounded-xl ${getEventTypeColor(event.type)} flex items-center justify-center text-white text-lg`}>
                            {event.type === EventType.WEBINAR ? '📹' : event.type === EventType.HOMEWORK ? '⚡' : '📝'}
                        </div>
                        <div className="flex-1 min-w-0">
                            <div className="flex justify-between items-start">
                                <h4 className="font-semibold text-sm text-text-primary leading-tight">{event.title}</h4>
                                <span className="text-[10px] font-medium px-2 py-0.5 rounded-lg bg-body text-text-secondary ml-2 shrink-0">{formatTime(event.date)}</span>
                            </div>
                            <div className="flex items-center gap-2 mt-1">
                                <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded ${event.type === EventType.WEBINAR ? 'bg-[#6C5DD3]/10 text-[#6C5DD3]' : event.type === EventType.HOMEWORK ? 'bg-[#D4AF37]/10 text-[#D4AF37]' : 'bg-body text-text-secondary'}`}>
                                    {event.type === EventType.WEBINAR ? 'Вебинар' : event.type === EventType.HOMEWORK ? 'Дедлайн' : 'Другое'}
                                </span>
                                <p className="text-[10px] font-medium truncate text-text-secondary">{event.description}</p>
                            </div>
                        </div>
                    </div>
                ))
            )}
        </div>
    </div>
  );
};
