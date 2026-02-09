
import React, { useState, useRef, useEffect } from 'react';
import ReactPlayer from 'react-player';
import ReactMarkdown from 'react-markdown';
import { Lesson, Module, UserProgress, HomeworkType } from '../types';
import { checkHomeworkWithAI } from '../services/geminiService';
import { telegram } from '../services/telegramService';
import { XPService, XP_RULES } from '../services/xpService';

const VideoPlayer = ReactPlayer as unknown as React.ComponentType<any>;

interface LessonViewProps {
  lesson: Lesson;
  isCompleted: boolean;
  onComplete: (lessonId: string, xpBonus: number) => void;
  onBack: () => void;
  onNavigate: (lessonId: string) => void;
  parentModule?: Module | null;
  userProgress: UserProgress;
  onUpdateUser: (data: Partial<UserProgress>) => void;
  onUpdateLesson?: (updatedLesson: Lesson) => void;
}

const MarkdownToolbar = ({ onInsert }: { onInsert: (tag: string, placeholder?: string) => void }) => (
    <div className="flex gap-2 mb-2 overflow-x-auto no-scrollbar pb-1">
        <button onClick={() => onInsert('**', 'bold')} className="px-2.5 py-1.5 bg-body rounded-lg text-xs border border-border-color font-bold">B</button>
        <button onClick={() => onInsert('*', 'italic')} className="px-2.5 py-1.5 bg-body rounded-lg text-xs border border-border-color italic">I</button>
        <button onClick={() => onInsert('\n# ', 'Header')} className="px-2.5 py-1.5 bg-body rounded-lg text-xs border border-border-color">H1</button>
        <button onClick={() => onInsert('\n## ', 'Header')} className="px-2.5 py-1.5 bg-body rounded-lg text-xs border border-border-color">H2</button>
        <button onClick={() => onInsert('[', 'Link](url)')} className="px-2.5 py-1.5 bg-body rounded-lg text-xs border border-border-color">Link</button>
        <button onClick={() => onInsert('\n- ', 'List Item')} className="px-2.5 py-1.5 bg-body rounded-lg text-xs border border-border-color">List</button>
        <button onClick={() => onInsert('`', 'code')} className="px-2.5 py-1.5 bg-body rounded-lg text-xs border border-border-color font-mono">Code</button>
    </div>
);

const EditSection = ({ title, isOpen, onToggle, children, icon }: any) => (
  <div className={`bg-card border ${isOpen ? 'border-[#6C5DD3]/30' : 'border-border-color'} rounded-2xl overflow-hidden transition-all duration-300`}>
    <button onClick={onToggle} className="w-full flex items-center justify-between p-4 active:bg-body/50 transition-colors">
      <div className="flex items-center gap-3">
         <div className="w-8 h-8 rounded-xl bg-body flex items-center justify-center text-lg">{icon}</div>
         <span className="text-sm font-semibold text-text-primary">{title}</span>
      </div>
      <svg className={`w-4 h-4 text-text-secondary transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
    </button>
    <div className={`transition-all duration-300 ease-in-out ${isOpen ? 'max-h-[1000px] opacity-100' : 'max-h-0 opacity-0'}`}>
        <div className="p-4 space-y-4 border-t border-border-color">{children}</div>
    </div>
  </div>
);

export const LessonView: React.FC<LessonViewProps> = ({
  lesson, isCompleted, onComplete, onBack, onNavigate,
  parentModule, userProgress, onUpdateUser, onUpdateLesson
}) => {
  const [inputText, setInputText] = useState('');
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [questionText, setQuestionText] = useState('');
  const [isAsking, setIsAsking] = useState(false);
  const [isVideoReady, setIsVideoReady] = useState(false);

  const isAdmin = userProgress.role === 'ADMIN';
  const [isEditing, setIsEditing] = useState(false);
  const [editedLesson, setEditedLesson] = useState<Lesson>(lesson);
  const [openSection, setOpenSection] = useState<'info' | 'content' | 'homework'>('content');

  const fileInputRef = useRef<HTMLInputElement>(null);
  const questionsAskedCount = userProgress.stats?.questionsAsked?.[lesson.id] || 0;
  const questionsRemaining = XP_RULES.MAX_QUESTIONS_PER_LESSON - questionsAskedCount;

  useEffect(() => {
      setEditedLesson(lesson);
      setIsVideoReady(false);
      setFeedback(null);
      setInputText('');
      setSelectedFile(null);
      const main = document.querySelector('main');
      if (main) main.scrollTop = 0;
      else window.scrollTo(0, 0);
  }, [lesson]);

  const handleAskQuestion = () => {
      if (!questionText.trim()) return;
      setIsAsking(true);
      setTimeout(() => {
          const result = XPService.askQuestion(userProgress, lesson.id);
          if (result.allowed) {
              onUpdateUser(result.user);
              telegram.showAlert(`Запрос принят. +${result.xp} XP`, 'Связь со штабом');
              setQuestionText('');
          } else {
              telegram.showAlert(result.message || 'Лимит исчерпан', 'Ошибка');
          }
          setIsAsking(false);
      }, 800);
  };

  const handleSubmit = async () => {
    if (isSubmitting) return;
    setIsSubmitting(true);
    setFeedback(null);
    telegram.haptic('medium');

    const content = lesson.homeworkType === 'TEXT' ? inputText : selectedFile!;
    const result = await checkHomeworkWithAI(content, lesson.homeworkType, lesson.aiGradingInstruction);

    setIsSubmitting(false);
    if (result.passed) {
        const processResult = XPService.processHomework(userProgress, lesson.id, false);
        onUpdateUser(processResult.user);
        onComplete(lesson.id, processResult.xp);
        setFeedback(result.feedback);
        telegram.haptic('success');
    } else {
        setFeedback(result.feedback);
        telegram.haptic('error');
    }
  };

  const handleSaveLesson = () => {
      if (onUpdateLesson) {
          onUpdateLesson(editedLesson);
          telegram.haptic('success');
          setIsEditing(false);
      }
  };

  const insertMarkdown = (tag: string, placeholder: string = '') => {
      const textarea = document.getElementById('contentEditor') as HTMLTextAreaElement;
      if (!textarea) return;
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const text = editedLesson.content;
      const before = text.substring(0, start);
      const after = text.substring(end);
      const selection = text.substring(start, end);
      const newContent = before + tag + (selection || placeholder) + (tag.trim().length > 1 && !tag.startsWith('\n') ? tag : '') + after;
      setEditedLesson({ ...editedLesson, content: newContent });
      setTimeout(() => { textarea.focus(); textarea.setSelectionRange(start + tag.length, end + tag.length); }, 0);
  };

  const videoUrl = lesson.videoUrl || parentModule?.videoUrl;
  const currentIndex = parentModule?.lessons.findIndex(l => l.id === lesson.id) ?? -1;
  const prevLesson = currentIndex > 0 ? parentModule?.lessons[currentIndex - 1] : null;
  const nextLesson = parentModule && currentIndex < parentModule.lessons.length - 1 ? parentModule.lessons[currentIndex + 1] : null;
  const totalInModule = parentModule?.lessons.length || 0;

  // --- ADMIN EDIT MODE ---
  if (isEditing && isAdmin) {
      return (
        <div className="flex flex-col min-h-screen bg-body text-text-primary">
            <div className="sticky top-0 z-50 px-4 pt-[calc(var(--safe-top)+10px)] pb-3 flex items-center justify-between bg-surface/90 backdrop-blur-md border-b border-border-color">
                <button onClick={() => setIsEditing(false)} className="px-4 py-2 rounded-xl text-sm font-medium text-[#FF3B30]">Отмена</button>
                <span className="text-sm font-semibold text-text-primary">Редактор</span>
                <button onClick={handleSaveLesson} className="px-4 py-2 rounded-xl bg-[#6C5DD3] text-sm font-semibold text-white">Сохранить</button>
            </div>
            <div className="p-4 space-y-3 pb-40 overflow-y-auto">
                <EditSection title="Основная информация" icon="📋" isOpen={openSection === 'info'} onToggle={() => setOpenSection(openSection === 'info' ? 'content' : 'info')}>
                    <div className="space-y-3">
                        <div>
                            <label className="text-xs font-medium text-text-secondary ml-1 mb-1 block">Название</label>
                            <input value={editedLesson.title} onChange={(e) => setEditedLesson({...editedLesson, title: e.target.value})} className="w-full bg-body border border-border-color p-3 rounded-xl text-sm font-medium text-text-primary outline-none focus:border-[#6C5DD3]" placeholder="Название" />
                        </div>
                        <div>
                            <label className="text-xs font-medium text-text-secondary ml-1 mb-1 block">Описание</label>
                            <textarea value={editedLesson.description} onChange={(e) => setEditedLesson({...editedLesson, description: e.target.value})} className="w-full bg-body border border-border-color p-3 rounded-xl text-sm text-text-primary outline-none focus:border-[#6C5DD3] h-20 resize-none" placeholder="Описание" />
                        </div>
                        <div>
                            <label className="text-xs font-medium text-text-secondary ml-1 mb-1 block">Видео (YouTube)</label>
                            <input value={editedLesson.videoUrl || ''} onChange={(e) => setEditedLesson({...editedLesson, videoUrl: e.target.value})} className="w-full bg-body border border-border-color p-3 rounded-xl text-sm font-mono text-[#6C5DD3] outline-none focus:border-[#6C5DD3]" placeholder="https://youtube.com/..." />
                        </div>
                    </div>
                </EditSection>
                <EditSection title="Контент (Markdown)" icon="📝" isOpen={openSection === 'content'} onToggle={() => setOpenSection(openSection === 'content' ? 'homework' : 'content')}>
                    <div className="bg-body border border-border-color rounded-xl p-2 focus-within:border-[#6C5DD3] transition-colors">
                        <MarkdownToolbar onInsert={insertMarkdown} />
                        <textarea id="contentEditor" value={editedLesson.content} onChange={(e) => setEditedLesson({...editedLesson, content: e.target.value})} className="w-full bg-transparent text-sm font-mono text-text-primary outline-none h-[60vh] leading-relaxed resize-y p-2" placeholder="# Заголовок" />
                    </div>
                </EditSection>
                <EditSection title="Домашнее задание" icon="🎯" isOpen={openSection === 'homework'} onToggle={() => setOpenSection(openSection === 'homework' ? 'info' : 'homework')}>
                    <div className="space-y-4">
                        <div>
                            <label className="text-xs font-medium text-text-secondary ml-1 mb-1 block">Формат</label>
                            <div className="grid grid-cols-4 gap-2">
                                {['TEXT', 'PHOTO', 'VIDEO', 'FILE'].map(t => (
                                    <button key={t} onClick={() => setEditedLesson({...editedLesson, homeworkType: t as HomeworkType})} className={`py-2.5 rounded-xl text-xs font-semibold border transition-all ${editedLesson.homeworkType === t ? 'bg-[#6C5DD3] text-white border-[#6C5DD3]' : 'border-border-color text-text-secondary'}`}>{t}</button>
                                ))}
                            </div>
                        </div>
                        <div>
                            <label className="text-xs font-medium text-text-secondary ml-1 mb-1 block">Задание</label>
                            <textarea value={editedLesson.homeworkTask} onChange={(e) => setEditedLesson({...editedLesson, homeworkTask: e.target.value})} className="w-full bg-body border border-border-color p-3 rounded-xl text-sm text-text-primary outline-none focus:border-[#6C5DD3] h-24 resize-none" placeholder="Описание задания..." />
                        </div>
                        <div className="p-4 rounded-xl border border-[#FF3B30]/20 bg-[#FF3B30]/5 space-y-3">
                            <label className="text-xs font-medium text-[#FF3B30] flex items-center gap-2">
                                <span className="w-2 h-2 rounded-full bg-[#FF3B30]"></span>
                                AI инструкция (скрыто от студентов)
                            </label>
                            <textarea value={editedLesson.aiGradingInstruction} onChange={(e) => setEditedLesson({...editedLesson, aiGradingInstruction: e.target.value})} className="w-full bg-body border border-[#FF3B30]/20 p-3 rounded-xl text-sm font-mono text-text-primary outline-none focus:border-[#FF3B30] h-32 resize-none" placeholder="Критерии оценки..." />
                        </div>
                        <div>
                            <label className="text-xs font-medium text-text-secondary ml-1 mb-1 block">Награда (XP)</label>
                            <input type="number" value={editedLesson.xpReward} onChange={(e) => { const val = parseInt(e.target.value); setEditedLesson({...editedLesson, xpReward: isNaN(val) ? 0 : val}); }} className="w-full bg-body border border-border-color p-3 rounded-xl text-lg font-bold text-[#6C5DD3] outline-none focus:border-[#6C5DD3] text-center" />
                        </div>
                    </div>
                </EditSection>
            </div>
        </div>
      );
  }

  // --- STUDENT VIEW ---
  return (
    <div className="flex flex-col min-h-screen bg-body">
      {/* Header */}
      <div className="sticky top-0 z-40 px-4 pt-[calc(var(--safe-top)+8px)] pb-3 bg-surface/90 backdrop-blur-md border-b border-border-color">
        <div className="flex items-center justify-between">
            <button onClick={onBack} className="w-10 h-10 rounded-xl bg-body border border-border-color flex items-center justify-center text-text-primary active:scale-95 transition-transform">
               <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
            </button>
            <div className="flex-1 text-center px-3">
                <h2 className="text-sm font-bold text-text-primary truncate">{lesson.title}</h2>
                {totalInModule > 0 && (
                    <p className="text-[10px] text-text-secondary">{currentIndex + 1} из {totalInModule} {parentModule ? `• ${parentModule.title}` : ''}</p>
                )}
            </div>
            <div className="flex items-center gap-2">
                {isAdmin && (
                    <button onClick={() => setIsEditing(true)} className="w-10 h-10 rounded-xl bg-[#6C5DD3]/10 text-[#6C5DD3] flex items-center justify-center text-sm">✎</button>
                )}
                <div className="px-3 py-1.5 rounded-lg bg-[#6C5DD3]/10 text-[#6C5DD3] text-xs font-bold">+{lesson.xpReward}</div>
            </div>
        </div>

        {/* Step indicator */}
        {totalInModule > 1 && (
            <div className="flex gap-1 mt-3">
                {parentModule?.lessons.map((l, i) => (
                    <div
                        key={l.id}
                        className={`h-1 flex-1 rounded-full transition-all duration-300 ${
                            userProgress.completedLessonIds.includes(l.id) ? 'bg-[#34C759]' :
                            l.id === lesson.id ? 'bg-[#6C5DD3]' : 'bg-body'
                        }`}
                    />
                ))}
            </div>
        )}
      </div>

      <div className="px-4 pt-4 pb-32 max-w-2xl mx-auto w-full space-y-5 animate-fade-in">

        {/* Video */}
        {videoUrl && (
            <div className="relative rounded-2xl overflow-hidden aspect-video bg-card border border-border-color shadow-sm">
                {!isVideoReady && (
                    <div className="absolute inset-0 flex items-center justify-center bg-card z-10">
                        <div className="w-8 h-8 border-2 border-border-color border-t-[#6C5DD3] rounded-full animate-spin"></div>
                    </div>
                )}
                <VideoPlayer url={videoUrl} width="100%" height="100%" controls={true} onReady={() => setIsVideoReady(true)} config={{ youtube: { playerVars: { origin: window.location.origin }}}} />
            </div>
        )}

        {lesson.description && (
            <p className="text-sm text-text-secondary leading-relaxed">{lesson.description}</p>
        )}

        {/* Content */}
        <div className="bg-card p-5 rounded-2xl border border-border-color">
            <div className="markdown-content text-text-primary">
                {lesson.content?.trim() ? (
                    <ReactMarkdown
                        components={{
                            h1: ({node, ...p}) => <h1 className="text-xl font-bold mb-4 text-text-primary" {...p} />,
                            h2: ({node, ...p}) => <h2 className="text-lg font-semibold mt-6 mb-3 text-text-primary border-l-3 border-[#6C5DD3] pl-3" {...p} />,
                            h3: ({node, ...p}) => <h3 className="text-base font-semibold mt-4 mb-2 text-text-primary" {...p} />,
                            p: ({node, ...p}) => <p className="mb-4 leading-relaxed text-text-primary/85 text-[15px]" {...p} />,
                            ul: ({node, ...p}) => <ul className="list-disc pl-5 mb-4 space-y-1.5 marker:text-[#6C5DD3]" {...p} />,
                            ol: ({node, ...p}) => <ol className="list-decimal pl-5 mb-4 space-y-1.5" {...p} />,
                            blockquote: ({node, ...p}) => <blockquote className="border-l-3 border-[#6C5DD3] bg-[#6C5DD3]/5 p-4 rounded-xl italic my-4 text-text-secondary" {...p} />,
                            code: ({node, ...p}: any) => p.inline
                                ? <code className="bg-body px-1.5 py-0.5 rounded text-[#6C5DD3] text-sm font-mono" {...p} />
                                : <code className="block bg-body p-4 rounded-xl text-sm font-mono overflow-x-auto my-4" {...p} />,
                            strong: ({node, ...p}) => <strong className="font-bold text-text-primary" {...p} />,
                        }}
                    >
                        {lesson.content}
                    </ReactMarkdown>
                ) : (
                    <div className="flex flex-col items-center justify-center py-10 text-center">
                        <div className="text-3xl mb-3 opacity-30">{'\u{1F4DD}'}</div>
                        <p className="text-text-secondary text-sm">Контент пока не добавлен</p>
                    </div>
                )}
            </div>
        </div>

        {/* Questions */}
        <div className="bg-card p-4 rounded-2xl border border-border-color space-y-3">
             <div className="flex justify-between items-center">
                 <h3 className="text-sm font-semibold text-text-primary flex items-center gap-2">
                     <span className="w-6 h-6 rounded-lg bg-body flex items-center justify-center text-xs">💬</span>
                     Вопрос
                 </h3>
                 <span className={`text-xs font-medium px-2 py-0.5 rounded-lg ${questionsRemaining > 0 ? 'bg-[#34C759]/10 text-[#34C759]' : 'bg-[#FF3B30]/10 text-[#FF3B30]'}`}>
                     {questionsRemaining}/5
                 </span>
             </div>
             <div className="flex gap-2">
                 <input value={questionText} onChange={(e) => setQuestionText(e.target.value)} placeholder="Ваш вопрос..." disabled={questionsRemaining <= 0 || isAsking}
                    className="flex-1 bg-body border border-border-color rounded-xl px-4 py-3 text-sm focus:border-[#6C5DD3] outline-none disabled:opacity-50 transition-all" />
                 <button onClick={handleAskQuestion} disabled={questionsRemaining <= 0 || isAsking || !questionText.trim()}
                    className="bg-[#6C5DD3] text-white rounded-xl w-11 h-11 flex items-center justify-center active:scale-95 transition-transform disabled:opacity-50">
                    {isAsking ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div> : <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" /></svg>}
                 </button>
             </div>
        </div>

        {/* Homework */}
        {!isCompleted ? (
            <div className="bg-card rounded-2xl border border-border-color overflow-hidden">
                <div className="p-5 space-y-4">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-[#6C5DD3]/10 flex items-center justify-center text-xl">
                            {lesson.homeworkType === 'VIDEO' ? '📹' : lesson.homeworkType === 'PHOTO' ? '📸' : lesson.homeworkType === 'FILE' ? '📎' : '✍️'}
                        </div>
                        <div>
                            <h3 className="font-semibold text-text-primary">Задание</h3>
                            <p className="text-xs text-text-secondary">Формат: {lesson.homeworkType === 'TEXT' ? 'Текст' : lesson.homeworkType} • AI проверка</p>
                        </div>
                    </div>

                    <div className="bg-body p-4 rounded-xl text-sm text-text-secondary leading-relaxed border-l-3 border-[#6C5DD3]">
                         {lesson.homeworkTask}
                    </div>

                    {lesson.homeworkType === 'TEXT' ? (
                        <textarea value={inputText} onChange={(e) => setInputText(e.target.value)} placeholder="Ваш ответ..." className="w-full bg-body text-text-primary p-4 rounded-xl border border-border-color focus:border-[#6C5DD3] outline-none h-40 resize-none text-sm transition-all" />
                    ) : (
                        <div onClick={() => fileInputRef.current?.click()} className={`w-full h-28 border-2 border-dashed rounded-xl flex flex-col items-center justify-center cursor-pointer transition-all ${selectedFile ? 'border-[#34C759] bg-[#34C759]/5' : 'border-border-color hover:border-[#6C5DD3] bg-body'}`}>
                            <input type="file" ref={fileInputRef} onChange={e => {
                                const f = e.target.files?.[0];
                                if(f) { const r = new FileReader(); r.onloadend = () => setSelectedFile(r.result as string); r.readAsDataURL(f); }
                            }} className="hidden" />
                            {selectedFile ? (
                                <><span className="text-[#34C759] text-2xl mb-1">{'\u2713'}</span><span className="text-[#34C759] font-medium text-xs">Файл загружен</span></>
                            ) : (
                                <><span className="text-text-secondary text-2xl mb-1">📤</span><span className="text-text-secondary text-xs">Нажмите для загрузки</span></>
                            )}
                        </div>
                    )}

                    {feedback && (
                        <div className="p-4 bg-[#FF3B30]/5 border border-[#FF3B30]/20 rounded-xl animate-fade-in">
                            <p className="text-text-primary text-sm leading-relaxed"><span className="font-bold text-[#FF3B30]">Обратная связь: </span>{feedback}</p>
                        </div>
                    )}
                </div>

                <button
                    onClick={handleSubmit}
                    disabled={isSubmitting || (lesson.homeworkType === 'TEXT' ? !inputText.trim() : !selectedFile)}
                    className="w-full py-4 bg-[#6C5DD3] text-white font-bold text-sm transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                >
                    {isSubmitting ? (
                        <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div> Проверка...</>
                    ) : (
                        <><span>Отправить</span><svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" /></svg></>
                    )}
                </button>
            </div>
        ) : (
            <div className="bg-[#34C759]/10 rounded-2xl p-8 text-center border border-[#34C759]/20">
                <div className="w-14 h-14 bg-[#34C759] text-white rounded-full flex items-center justify-center text-2xl mx-auto mb-4">{'\u2713'}</div>
                <h3 className="text-[#34C759] font-bold text-lg mb-1">Выполнено</h3>
                <p className="text-[#34C759]/70 text-sm">+{lesson.xpReward} XP получено</p>
            </div>
        )}

        {/* Navigation */}
        <div className="grid grid-cols-2 gap-3">
            <button
                onClick={() => { if (prevLesson) { onNavigate(prevLesson.id); telegram.haptic('selection'); } }}
                disabled={!prevLesson}
                className={`py-3.5 rounded-xl font-semibold text-sm transition-all flex items-center justify-center gap-2 ${!prevLesson ? 'opacity-30 bg-body text-text-secondary' : 'bg-card border border-border-color text-text-primary active:scale-95'}`}
            >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg> Назад
            </button>
            <button
                onClick={() => { if (nextLesson) { onNavigate(nextLesson.id); telegram.haptic('selection'); } }}
                disabled={!nextLesson}
                className={`py-3.5 rounded-xl font-semibold text-sm transition-all flex items-center justify-center gap-2 ${!nextLesson ? 'opacity-30 bg-body text-text-secondary' : 'bg-[#6C5DD3] text-white active:scale-95'}`}
            >
                Далее <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
            </button>
        </div>
      </div>
    </div>
  );
};
