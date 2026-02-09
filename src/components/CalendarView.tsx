
import React, { useState } from 'react';
import { CalendarEvent, EventType } from '../types';
import { MOCK_EVENTS } from '../constants';
import { telegram } from '../services/telegramService';
import { Storage } from '../services/storage';

interface CalendarViewProps {
    externalEvents?: CalendarEvent[];
    onUpdateEvents?: (events: CalendarEvent[]) => void;
}

const getDaysInMonth = (year: number, month: number) => new Date(year, month + 1, 0).getDate();
const getFirstDayOfMonth = (year: number, month: number) => { let day = new Date(year, month, 1).getDay(); return day === 0 ? 6 : day - 1; };
const formatTime = (date: Date | string) => { const d = typeof date === 'string' ? new Date(date) : date; return d.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' }); };

const generateICS = (events: CalendarEvent[]) => {
    let ics = "BEGIN:VCALENDAR\nVERSION:2.0\nPRODID:-//SalesPro//SpartanCalendar//EN\n";
    events.forEach(evt => {
        const d = new Date(evt.date);
        const start = d.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
        const endD = new Date(d.getTime() + (evt.durationMinutes || 60) * 60000);
        const end = endD.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
        ics += `BEGIN:VEVENT\nUID:${evt.id}@salespro.app\nDTSTAMP:${start}\nDTSTART:${start}\nDTEND:${end}\nSUMMARY:${evt.title}\nDESCRIPTION:${evt.description}\nEND:VEVENT\n`;
    });
    return ics + "END:VCALENDAR";
};

const monthNames = ['Январь','Февраль','Март','Апрель','Май','Июнь','Июль','Август','Сентябрь','Октябрь','Ноябрь','Декабрь'];

const EVENT_TYPE_CONFIG: Record<EventType, { color: string; bg: string; icon: string; label: string }> = {
    [EventType.WEBINAR]: { color: 'text-[#6C5DD3]', bg: 'bg-[#6C5DD3]', icon: '📹', label: 'Вебинар' },
    [EventType.HOMEWORK]: { color: 'text-[#D4AF37]', bg: 'bg-[#D4AF37]', icon: '⚡', label: 'Дедлайн' },
    [EventType.OTHER]: { color: 'text-text-secondary', bg: 'bg-text-secondary', icon: '📝', label: 'Другое' },
};

export const CalendarView: React.FC<CalendarViewProps> = ({ externalEvents, onUpdateEvents }) => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(new Date());
  const [filterType, setFilterType] = useState<EventType | 'ALL'>('ALL');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<CalendarEvent | null>(null);
  const [formTitle, setFormTitle] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formType, setFormType] = useState<EventType>(EventType.OTHER);
  const [formTime, setFormTime] = useState('12:00');
  const [formDuration, setFormDuration] = useState('60');

  const [storedEvents] = useState<CalendarEvent[]>(() => Storage.get<CalendarEvent[]>('events', MOCK_EVENTS));
  const allEvents = externalEvents && externalEvents.length > 0 ? externalEvents : storedEvents;

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const daysInMonth = getDaysInMonth(year, month);
  const firstDay = getFirstDayOfMonth(year, month);
  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);
  const blanks = Array.from({ length: firstDay }, (_, i) => i);

  const getEventsForDay = (day: number) => allEvents.filter(e => {
    const d = typeof e.date === 'string' ? new Date(e.date) : e.date;
    return d.getDate() === day && d.getMonth() === month && d.getFullYear() === year;
  });

  const selectedEvents = selectedDate
    ? allEvents.filter(e => {
        const d = typeof e.date === 'string' ? new Date(e.date) : e.date;
        return d.getDate() === selectedDate.getDate() && d.getMonth() === selectedDate.getMonth() && d.getFullYear() === selectedDate.getFullYear();
      }).filter(e => filterType === 'ALL' || e.type === filterType)
    : [];

  const handleExport = () => {
    telegram.haptic('success');
    const blob = new Blob([generateICS(allEvents)], { type: 'text/calendar;charset=utf-8' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a'); link.href = url; link.setAttribute('download', 'spartan_schedule.ics');
    document.body.appendChild(link); link.click(); document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  };

  const openCreate = () => {
    setEditingEvent(null); setFormTitle(''); setFormDescription(''); setFormType(EventType.OTHER); setFormTime('12:00'); setFormDuration('60');
    setIsModalOpen(true); telegram.haptic('selection');
  };

  const openEdit = (event: CalendarEvent) => {
    setEditingEvent(event); setFormTitle(event.title); setFormDescription(event.description); setFormType(event.type);
    const d = new Date(event.date);
    setFormTime(`${d.getHours().toString().padStart(2,'0')}:${d.getMinutes().toString().padStart(2,'0')}`);
    setFormDuration((event.durationMinutes || 60).toString());
    setIsModalOpen(true); telegram.haptic('selection');
  };

  const handleSave = () => {
    if (!formTitle.trim() || !selectedDate) { telegram.haptic('error'); return; }
    const [h, m] = formTime.split(':').map(Number);
    const eventDate = new Date(selectedDate); eventDate.setHours(h, m, 0, 0);

    if (editingEvent) {
      onUpdateEvents?.(allEvents.map(e => e.id === editingEvent.id
        ? { ...e, title: formTitle, description: formDescription, type: formType, date: eventDate, durationMinutes: parseInt(formDuration) }
        : e));
    } else {
      onUpdateEvents?.([...allEvents, {
        id: `evt-${Date.now()}`, title: formTitle, description: formDescription,
        type: formType, date: eventDate, durationMinutes: parseInt(formDuration),
      }]);
    }
    setIsModalOpen(false); telegram.haptic('success');
  };

  const handleDelete = (id: string) => { if (confirm('Удалить событие?')) { onUpdateEvents?.(allEvents.filter(e => e.id !== id)); telegram.haptic('warning'); } };

  return (
    <div className="flex flex-col h-full animate-fade-in text-text-primary">
        {/* Header */}
        <div className="flex justify-between items-center mb-4">
            <div className="flex items-center gap-2">
              <span className="px-3 py-1 bg-[#34C759]/10 text-[#34C759] text-[10px] font-medium rounded-full border border-[#34C759]/20">Sync Active</span>
              <span className="text-[10px] text-text-secondary font-medium">{allEvents.length} событий</span>
            </div>
            <div className="flex gap-2">
              {onUpdateEvents && (
                <button onClick={openCreate} className="flex items-center gap-1.5 text-[11px] font-semibold text-white bg-[#6C5DD3] px-3 py-1.5 rounded-full hover:bg-[#6C5DD3]/90 transition-colors">
                    <span>+</span><span>Событие</span>
                </button>
              )}
              <button onClick={handleExport} className="flex items-center gap-1.5 text-[11px] font-semibold text-[#6C5DD3] bg-[#6C5DD3]/10 px-3 py-1.5 rounded-full hover:bg-[#6C5DD3]/20 transition-colors">
                  <span>📅</span><span>Экспорт</span>
              </button>
            </div>
        </div>

        {/* Calendar Grid */}
        <div className="p-5 rounded-2xl mb-4 border bg-card border-border-color shadow-sm">
            <div className="flex items-center justify-between mb-5">
                <button onClick={() => setCurrentDate(new Date(year, month - 1, 1))} className="p-3 text-text-secondary hover:text-[#6C5DD3] transition-colors">←</button>
                <span className="text-sm font-semibold text-text-primary">{monthNames[month]} {year}</span>
                <button onClick={() => setCurrentDate(new Date(year, month + 1, 1))} className="p-3 text-text-secondary hover:text-[#6C5DD3] transition-colors">→</button>
            </div>
            <div className="grid grid-cols-7 gap-1 mb-2 text-center text-text-secondary text-[10px] font-medium opacity-60">
                {['Пн','Вт','Ср','Чт','Пт','Сб','Вс'].map(d => <div key={d}>{d}</div>)}
            </div>
            <div className="grid grid-cols-7 gap-1">
            {blanks.map(x => <div key={`b-${x}`} className="aspect-square" />)}
            {days.map(day => {
                const dayEvents = getEventsForDay(day);
                const isSelected = selectedDate?.getDate() === day && selectedDate?.getMonth() === month;
                const isToday = new Date().getDate() === day && new Date().getMonth() === month && new Date().getFullYear() === year;
                return (
                <div key={day} onClick={() => { setSelectedDate(new Date(year, month, day)); telegram.haptic('selection'); }}
                    className={`aspect-square rounded-xl flex flex-col items-center justify-center relative cursor-pointer transition-all
                    ${isSelected ? 'bg-[#6C5DD3] text-white shadow-md shadow-[#6C5DD3]/30 scale-105 z-10' : 'hover:bg-body'}
                    ${isToday && !isSelected ? 'border-2 border-[#D4AF37] text-[#D4AF37]' : ''}`}>
                    <span className="text-xs font-semibold">{day}</span>
                    <div className="flex gap-0.5 mt-1 h-1">
                        {dayEvents.slice(0, 3).map(ev => (<div key={ev.id} className={`w-1 h-1 rounded-full ${EVENT_TYPE_CONFIG[ev.type]?.bg || 'bg-text-secondary'}`} />))}
                    </div>
                </div>
                );
            })}
            </div>
        </div>

        {/* Filter Pills */}
        <div className="flex gap-2 mb-3 overflow-x-auto no-scrollbar px-1">
          <button onClick={() => setFilterType('ALL')} className={`px-3 py-1.5 rounded-full text-[10px] font-semibold border transition-all whitespace-nowrap ${filterType === 'ALL' ? 'bg-[#6C5DD3] text-white border-[#6C5DD3]' : 'bg-card border-border-color text-text-secondary'}`}>Все</button>
          {Object.entries(EVENT_TYPE_CONFIG).map(([type, cfg]) => (
            <button key={type} onClick={() => setFilterType(type as EventType)} className={`px-3 py-1.5 rounded-full text-[10px] font-semibold border transition-all whitespace-nowrap ${filterType === type ? `${cfg.bg} text-white border-transparent` : 'bg-card border-border-color text-text-secondary'}`}>
              {cfg.icon} {cfg.label}
            </button>
          ))}
        </div>

        {/* Events List */}
        <div className="space-y-3 px-1">
            {selectedEvents.length === 0 ? (
                <div className="text-center py-8 rounded-2xl border-2 border-dashed border-border-color text-text-secondary">
                    <p className="font-medium text-xs">Событий нет</p>
                    {onUpdateEvents && <button onClick={openCreate} className="mt-2 text-[10px] text-[#6C5DD3] font-semibold">+ Создать</button>}
                </div>
            ) : (
                selectedEvents.map(event => {
                    const cfg = EVENT_TYPE_CONFIG[event.type] || EVENT_TYPE_CONFIG[EventType.OTHER];
                    return (
                    <div key={event.id} className="p-4 rounded-2xl flex items-center gap-4 border transition-all active:scale-[0.98] bg-card border-border-color shadow-sm group">
                        <div className={`w-11 h-11 rounded-xl ${cfg.bg} flex items-center justify-center text-white text-lg`}>{cfg.icon}</div>
                        <div className="flex-1 min-w-0">
                            <div className="flex justify-between items-start">
                                <h4 className="font-semibold text-sm text-text-primary leading-tight cursor-pointer" onClick={() => openEdit(event)}>{event.title}</h4>
                                <span className="text-[10px] font-medium px-2 py-0.5 rounded-lg bg-body text-text-secondary ml-2 shrink-0">{formatTime(event.date)}</span>
                            </div>
                            <div className="flex items-center gap-2 mt-1">
                                <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded ${event.type === EventType.WEBINAR ? 'bg-[#6C5DD3]/10 text-[#6C5DD3]' : event.type === EventType.HOMEWORK ? 'bg-[#D4AF37]/10 text-[#D4AF37]' : 'bg-body text-text-secondary'}`}>{cfg.label}</span>
                                <p className="text-[10px] font-medium truncate text-text-secondary">{event.description}</p>
                            </div>
                        </div>
                        {onUpdateEvents && <button onClick={() => handleDelete(event.id)} className="text-text-secondary opacity-0 group-hover:opacity-100 hover:text-[#FF3B30] transition-opacity text-xs">✕</button>}
                    </div>
                )})
            )}
        </div>

        {/* Create/Edit Modal */}
        {isModalOpen && (
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xl flex items-end sm:items-center justify-center animate-fade-in">
            <div className="w-full sm:max-w-sm bg-card rounded-t-2xl sm:rounded-2xl p-8 pb-12 border-t border-border-color shadow-sm animate-slide-up">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-semibold text-text-primary">{editingEvent ? 'Редактировать' : 'Новое событие'}</h3>
                <button onClick={() => setIsModalOpen(false)} className="w-8 h-8 rounded-full bg-body flex items-center justify-center text-text-secondary">✕</button>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="text-xs font-semibold text-text-secondary ml-2 mb-1 block">Название</label>
                  <input value={formTitle} onChange={e => setFormTitle(e.target.value)} placeholder="Вебинар по продажам" className="w-full bg-body border border-border-color p-4 rounded-2xl text-text-primary font-semibold outline-none focus:border-[#6C5DD3] transition-colors" autoFocus />
                </div>
                <div>
                  <label className="text-xs font-semibold text-text-secondary ml-2 mb-1 block">Описание</label>
                  <input value={formDescription} onChange={e => setFormDescription(e.target.value)} placeholder="Детали..." className="w-full bg-body border border-border-color p-4 rounded-2xl text-xs text-text-primary outline-none focus:border-[#6C5DD3] transition-colors" />
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="text-xs font-semibold text-text-secondary ml-2 mb-1 block">Тип</label>
                    <select value={formType} onChange={e => setFormType(e.target.value as EventType)} className="w-full bg-body border border-border-color p-3 rounded-2xl text-text-primary text-xs font-semibold outline-none h-[50px]">
                      {Object.entries(EVENT_TYPE_CONFIG).map(([key, cfg]) => (<option key={key} value={key}>{cfg.icon} {cfg.label}</option>))}
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-text-secondary ml-2 mb-1 block">Время</label>
                    <input type="time" value={formTime} onChange={e => setFormTime(e.target.value)} className="w-full bg-body border border-border-color p-3 rounded-2xl text-text-primary text-xs font-semibold outline-none h-[50px]" />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-text-secondary ml-2 mb-1 block">Мин.</label>
                    <input type="number" value={formDuration} onChange={e => setFormDuration(e.target.value)} className="w-full bg-body border border-border-color p-3 rounded-2xl text-text-primary text-xs font-semibold outline-none h-[50px]" />
                  </div>
                </div>
                <div className="flex items-center gap-2 text-[10px] text-text-secondary">
                  <span>📅</span>
                  <span>Дата: {selectedDate?.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' })}</span>
                </div>
                <button onClick={handleSave} className="w-full py-4 bg-[#6C5DD3] text-white rounded-2xl font-semibold text-sm shadow-sm active:scale-[0.98] transition-all">
                  {editingEvent ? 'Сохранить' : 'Создать'}
                </button>
              </div>
            </div>
          </div>
        )}
    </div>
  );
};
