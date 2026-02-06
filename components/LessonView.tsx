
import React, { useState, useRef, useEffect } from 'react';
import ReactPlayer from 'react-player';
import ReactMarkdown from 'react-markdown';
import { Lesson, Module, UserProgress } from '../types';
import { checkHomeworkWithAI } from '../services/geminiService';
import { telegram } from '../services/telegramService';
import { XPService, XP_RULES } from '../services/xpService';
import { Button } from './Button';

// Fix for TypeScript error where ReactPlayer props are not recognized correctly
const VideoPlayer = ReactPlayer as unknown as React.ComponentType<any>;

// Helper to extract text from React children to detect prefixes
const extractTextFromNodes = (node: React.ReactNode): string => {
  if (!node) return '';
  if (typeof node === 'string') return node;
  if (Array.isArray(node)) return node.map(extractTextFromNodes).join('');
  if (React.isValidElement(node) && node.props.children) return extractTextFromNodes(node.props.children);
  return '';
};

interface LessonViewProps {
  lesson: Lesson;
  isCompleted: boolean;
  onComplete: (lessonId: string, xpBonus: number) => void;
  onBack: () => void;
  parentModule?: Module | null;
  userProgress: UserProgress;
  onUpdateUser: (data: Partial<UserProgress>) => void;
  onUpdateLesson?: (updatedLesson: Lesson) => void;
}

export const LessonView: React.FC<LessonViewProps> = ({ 
  lesson, 
  isCompleted, 
  onComplete, 
  onBack, 
  parentModule,
  userProgress,
  onUpdateUser,
  onUpdateLesson
}) => {
  const [inputText, setInputText] = useState('');
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  
  // Question State
  const [questionText, setQuestionText] = useState('');
  const [isAsking, setIsAsking] = useState(false);

  // Edit Mode State (Admin)
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState({
      id: lesson.id,
      title: lesson.title,
      xpReward: lesson.xpReward,
      description: lesson.description,
      content: lesson.content,
      homeworkTask: lesson.homeworkTask,
      aiGradingInstruction: lesson.aiGradingInstruction
  });

  const fileInputRef = useRef<HTMLInputElement>(null);
  const contentTextareaRef = useRef<HTMLTextAreaElement>(null);

  // Stats for current lesson
  const questionsAskedCount = userProgress.stats?.questionsAsked?.[lesson.id] || 0;
  const questionsRemaining = XP_RULES.MAX_QUESTIONS_PER_LESSON - questionsAskedCount;

  useEffect(() => {
      setEditData({
          id: lesson.id,
          title: lesson.title,
          xpReward: lesson.xpReward,
          description: lesson.description,
          content: lesson.content,
          homeworkTask: lesson.homeworkTask,
          aiGradingInstruction: lesson.aiGradingInstruction
      });
  }, [lesson]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (lesson.homeworkType === 'FILE' && file.type !== 'application/pdf') {
          telegram.showAlert('Только файлы PDF доступны для загрузки.', 'Ошибка');
          return;
      }
      
      setFileName(file.name);
      const reader = new FileReader();
      reader.onloadend = () => {
        setSelectedFile(reader.result as string);
        telegram.haptic('selection');
      };
      reader.readAsDataURL(file);
    }
  };

  const handleAskQuestion = () => {
      if (!questionText.trim()) return;
      setIsAsking(true);
      
      setTimeout(() => {
          const result = XPService.askQuestion(userProgress, lesson.id);
          if (result.allowed) {
              onUpdateUser(result.user);
              telegram.showAlert(`Вопрос отправлен в Штаб. Начислено ${result.xp} XP.`, 'Успешно');
              setQuestionText('');
          } else {
              telegram.showAlert(result.message || 'Ошибка', 'Лимит исчерпан');
          }
          setIsAsking(false);
      }, 1000);
  };

  const handleSubmit = async () => {
    if (isSubmitting) return;
    if (lesson.homeworkType === 'TEXT' && !inputText.trim()) return;
    if ((lesson.homeworkType === 'PHOTO' || lesson.homeworkType === 'VIDEO' || lesson.homeworkType === 'FILE') && !selectedFile) return;

    setIsSubmitting(true);
    setFeedback(null);
    telegram.haptic('medium');

    const contentToSend = lesson.homeworkType === 'TEXT' ? inputText : selectedFile!;
    const result = await checkHomeworkWithAI(contentToSend, lesson.homeworkType, lesson.aiGradingInstruction);

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

  const handleSaveEdit = () => {
      if (onUpdateLesson) {
          onUpdateLesson({
              ...lesson,
              ...editData
          });
          setIsEditing(false);
          telegram.haptic('success');
      }
  };

  const insertMarkdown = (prefix: string, suffix: string = '') => {
      const textarea = contentTextareaRef.current;
      if (!textarea) return;

      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const text = editData.content;
      
      const before = text.substring(0, start);
      const selection = text.substring(start, end);
      const after = text.substring(end);

      const newText = before + prefix + selection + suffix + after;
      setEditData({...editData, content: newText});
      
      setTimeout(() => {
          textarea.focus();
          if (start === end && suffix) {
             textarea.setSelectionRange(start + prefix.length, start + prefix.length);
          } else {
             textarea.setSelectionRange(start + prefix.length, end + prefix.length);
          }
      }, 0);
  };

  const videoUrl = lesson.videoUrl || parentModule?.videoUrl;
  const hasVideo = !!videoUrl;
  
  const isSubmitDisabled = isSubmitting || (lesson.homeworkType === 'TEXT' ? !inputText.trim() : !selectedFile);
  const isAdmin = userProgress.role === 'ADMIN';

  return (
    <div className="flex flex-col min-h-screen pb-32 w-full animate-slide-in bg-body text-text-primary transition-colors duration-300">
      {/* HEADER - Glassmorphism */}
      <div className="sticky top-0 z-40 px-4 md:px-6 pt-[calc(var(--safe-top)+10px)] pb-4 flex items-center justify-between bg-body/80 backdrop-blur-xl border-b border-transparent shadow-sm">
        <button onClick={onBack} className="w-10 h-10 rounded-full bg-surface border border-border-color flex items-center justify-center text-text-primary hover:bg-border-color active:scale-95 transition-all">
           <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-5 h-5">
             <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
           </svg>
        </button>
        <div className="flex flex-col items-center">
             <span className="text-[9px] font-black uppercase tracking-[0.2em] text-[#6C5DD3] mb-0.5">Lesson Access</span>
             <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-text-primary max-w-[200px] truncate">{lesson.title}</span>
                {isAdmin && (
                    <button 
                        onClick={() => setIsEditing(!isEditing)} 
                        className={`w-5 h-5 flex items-center justify-center rounded bg-surface hover:bg-[#6C5DD3] transition-colors ${isEditing ? 'text-[#6C5DD3] bg-white/20' : 'text-slate-400'}`}
                        title="Edit Lesson"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-3 h-3">
                            <path d="M5.433 13.917l1.262-3.155A4 4 0 017.58 9.42l6.92-6.918a2.121 2.121 0 013 3l-6.92 6.918c-.383.383-.84.685-1.343.886l-3.154 1.262a.5.5 0 01-.65-.65z" />
                            <path d="M3.5 5.75c0-.69.56-1.25 1.25-1.25H10A.75.75 0 0010 3H4.75A2.75 2.75 0 002 5.75v9.5A2.75 2.75 0 004.75 18h9.5A2.75 2.75 0 0017 15.25V10a.75.75 0 00-1.5 0v5.25c0 .69-.56 1.25-1.25 1.25h-9.5c-.69 0-1.25-.56-1.25-1.25v-9.5z" />
                        </svg>
                    </button>
                )}
             </div>
        </div>
        <div className="w-10"></div>
      </div>

      <div className="px-4 md:px-6 max-w-2xl mx-auto w-full pt-6">
        
        {/* EDIT MODE PANEL */}
        {isEditing && (
            <div className="bg-[#1F2128] p-5 rounded-[2rem] border border-[#6C5DD3]/30 mb-6 space-y-4 animate-fade-in shadow-xl">
                {/* ... Edit Mode Inputs (Using simpler styles for admin) ... */}
                {/* Reusing previous logic but ensuring it matches new types if any. Keeping existing block for brevity as UI focus is student facing */}
                <div className="flex justify-between items-center mb-2">
                    <h3 className="text-white font-black uppercase text-sm">Редактирование Урока</h3>
                    <button onClick={handleSaveEdit} className="bg-green-600 hover:bg-green-500 text-white px-4 py-2 rounded-xl text-xs font-bold uppercase transition-colors">Сохранить</button>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">ID Урока</label>
                        <input 
                            value={editData.id}
                            onChange={(e) => setEditData({...editData, id: e.target.value})}
                            className="w-full bg-black/20 border border-white/10 rounded-xl p-3 text-white text-sm outline-none focus:border-[#6C5DD3]"
                        />
                    </div>
                    <div>
                        <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Награда (XP)</label>
                        <input 
                            type="number"
                            value={editData.xpReward}
                            onChange={(e) => setEditData({...editData, xpReward: parseInt(e.target.value) || 0})}
                            className="w-full bg-black/20 border border-white/10 rounded-xl p-3 text-white text-sm outline-none focus:border-[#6C5DD3]"
                        />
                    </div>
                </div>

                <div>
                    <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Название (Title)</label>
                    <input 
                        value={editData.title}
                        onChange={(e) => setEditData({...editData, title: e.target.value})}
                        className="w-full bg-black/20 border border-white/10 rounded-xl p-3 text-white text-sm outline-none focus:border-[#6C5DD3]"
                        placeholder="Название урока"
                    />
                </div>

                <div>
                    <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Описание (Видно в списке уроков)</label>
                    <input 
                        value={editData.description}
                        onChange={(e) => setEditData({...editData, description: e.target.value})}
                        className="w-full bg-black/20 border border-white/10 rounded-xl p-3 text-white text-sm outline-none focus:border-[#6C5DD3]"
                        placeholder="Краткое описание сути урока..."
                    />
                </div>

                <div>
                    <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Основной Контент (Markdown)</label>
                    
                    {/* Markdown Toolbar */}
                    <div className="flex gap-1 mb-2 bg-black/20 p-2 rounded-xl border border-white/5 overflow-x-auto no-scrollbar">
                        <button onClick={() => insertMarkdown('**', '**')} className="p-2 min-w-[32px] rounded-lg hover:bg-white/10 text-white text-xs font-bold transition-colors" title="Bold">B</button>
                        <button onClick={() => insertMarkdown('*', '*')} className="p-2 min-w-[32px] rounded-lg hover:bg-white/10 text-white text-xs italic transition-colors" title="Italic">I</button>
                        <button onClick={() => insertMarkdown('# ')} className="p-2 min-w-[32px] rounded-lg hover:bg-white/10 text-white text-xs font-bold transition-colors" title="H1">H1</button>
                        <button onClick={() => insertMarkdown('## ')} className="p-2 min-w-[32px] rounded-lg hover:bg-white/10 text-white text-xs font-bold transition-colors" title="H2">H2</button>
                        <div className="w-px bg-white/10 mx-1 h-6 self-center"></div>
                        <button onClick={() => insertMarkdown('\n- ')} className="p-2 min-w-[32px] rounded-lg hover:bg-white/10 text-white text-xs transition-colors" title="List">• List</button>
                        <button onClick={() => insertMarkdown('\n1. ')} className="p-2 min-w-[32px] rounded-lg hover:bg-white/10 text-white text-xs transition-colors" title="Numbered List">1. List</button>
                        <div className="w-px bg-white/10 mx-1 h-6 self-center"></div>
                        <button onClick={() => insertMarkdown('> ')} className="p-2 min-w-[32px] rounded-lg hover:bg-white/10 text-white text-xs transition-colors" title="Quote">""</button>
                        <button onClick={() => insertMarkdown('[', '](url)')} className="p-2 min-w-[32px] rounded-lg hover:bg-white/10 text-white text-xs transition-colors" title="Link">🔗</button>
                        <button onClick={() => insertMarkdown('`', '`')} className="p-2 min-w-[32px] rounded-lg hover:bg-white/10 text-white text-xs font-mono transition-colors" title="Code">{'<>'}</button>
                    </div>

                    <textarea 
                        ref={contentTextareaRef}
                        value={editData.content}
                        onChange={(e) => setEditData({...editData, content: e.target.value})}
                        className="w-full bg-black/20 border border-white/10 rounded-xl p-3 text-white text-sm outline-none focus:border-[#6C5DD3] h-64 font-mono text-xs"
                        placeholder="# Заголовок..."
                    />
                </div>

                <div>
                    <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Текст Задания (Виден студенту)</label>
                    <textarea 
                        value={editData.homeworkTask}
                        onChange={(e) => setEditData({...editData, homeworkTask: e.target.value})}
                        className="w-full bg-black/20 border border-white/10 rounded-xl p-3 text-white text-sm outline-none focus:border-[#6C5DD3] h-24 resize-none"
                        placeholder="Напишите, что конкретно нужно сделать студенту..."
                    />
                </div>

                <div>
                    <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Критерии проверки AI (Промпт)</label>
                    <textarea 
                        value={editData.aiGradingInstruction}
                        onChange={(e) => setEditData({...editData, aiGradingInstruction: e.target.value})}
                        className="w-full bg-black/20 border border-white/10 rounded-xl p-3 text-white text-sm outline-none focus:border-[#6C5DD3] h-32 resize-none font-mono text-xs"
                        placeholder="Инструкция для ИИ: 'Проверь, чтобы на фото был конспект... Если текст бессмысленный - отклони...'"
                    />
                </div>
            </div>
        )}

        {/* VIDEO PLAYER */}
        {hasVideo && (
            <div className="relative mb-8 group animate-fade-in bg-black rounded-[2.5rem] overflow-hidden shadow-2xl aspect-video isolate ring-1 ring-white/10 border border-white/5">
                <div className="absolute inset-0 z-0">
                    <VideoPlayer 
                        className="react-player" 
                        url={videoUrl} 
                        width="100%" 
                        height="100%" 
                        controls={true} // Enabled native controls for YouTube reliability
                        light={false} 
                        playing={false}
                        config={{
                            youtube: {
                              playerVars: { 
                                  showinfo: 0, 
                                  modestbranding: 1, 
                                  rel: 0, 
                                  origin: window.location.origin // Crucial for YouTube embedding
                              }
                            }
                        }}
                    />
                </div>
            </div>
        )}

        {/* CONTENT CARD */}
        <div className="bg-surface p-6 md:p-8 rounded-[2.5rem] border border-border-color mb-8 relative overflow-hidden shadow-lg">
            <div className="flex items-center gap-3 mb-6">
               <span className="bg-[#6C5DD3]/10 text-[#6C5DD3] border border-[#6C5DD3]/20 text-[10px] font-black px-3 py-1 rounded-full uppercase tracking-wider">
                 +{lesson.xpReward} XP
               </span>
               {isCompleted && <span className="text-green-500 text-[10px] font-black uppercase tracking-wider flex items-center gap-1 bg-green-500/10 px-2 py-1 rounded-full border border-green-500/10">
                   ✓ Completed
               </span>}
            </div>

            <h2 className="text-3xl font-black text-text-primary mb-3 leading-tight tracking-tight">{lesson.title}</h2>
            {lesson.description && <p className="text-sm font-medium text-text-secondary mb-8 border-l-2 border-[#6C5DD3] pl-4">{lesson.description}</p>}
            
            <div className="markdown-content text-text-secondary">
                <ReactMarkdown
                    components={{
                        h1: (props) => <h1 className="text-xl md:text-2xl font-black mt-8 mb-4 text-transparent bg-clip-text bg-gradient-to-r from-[#6C5DD3] to-[#8B7FD9] leading-tight" {...props} />,
                        h2: (props) => <h2 className="text-lg md:text-xl font-bold mt-6 mb-3 text-text-primary border-l-4 border-[#6C5DD3] pl-3" {...props} />,
                        h3: (props) => <h3 className="text-base md:text-lg font-bold mt-5 mb-2 text-text-primary" {...props} />,
                        p: (props) => <p className="mb-4 leading-relaxed font-medium text-sm md:text-base opacity-90" {...props} />,
                        ul: (props) => <ul className="list-disc pl-5 mb-6 space-y-2 marker:text-[#6C5DD3]" {...props} />,
                        ol: (props) => <ol className="list-decimal pl-5 mb-6 space-y-2 marker:text-[#6C5DD3] font-bold" {...props} />,
                        li: (props) => <li className="pl-1 text-sm md:text-base" {...props} />,
                        blockquote: (props) => {
                            const textContent = extractTextFromNodes(props.children).trim();
                            const lowerText = textContent.toLowerCase();
                            
                            // Check prefixes in English and Russian
                            const isNote = lowerText.startsWith('note:') || lowerText.startsWith('примечание:');
                            const isWarning = lowerText.startsWith('warning:') || lowerText.startsWith('внимание:') || lowerText.startsWith('caution:');
                            const isTip = lowerText.startsWith('tip:') || lowerText.startsWith('совет:');

                            let borderColor = 'border-[#6C5DD3]/50'; 
                            let icon = null;
                            let bgClass = '';
                            let title = null;
                            let titleColor = '#fff';

                            if (isNote) {
                                borderColor = 'border-blue-500';
                                icon = 'ℹ️';
                                bgClass = 'bg-blue-500/10';
                                title = 'Note';
                                titleColor = '#60a5fa'; // blue-400
                            } else if (isWarning) {
                                borderColor = 'border-orange-500';
                                icon = '⚠️';
                                bgClass = 'bg-orange-500/10';
                                title = 'Warning';
                                titleColor = '#fb923c'; // orange-400
                            } else if (isTip) {
                                borderColor = 'border-green-500';
                                icon = '💡';
                                bgClass = 'bg-green-500/10';
                                title = 'Tip';
                                titleColor = '#4ade80'; // green-400
                            }

                            if (isNote || isWarning || isTip) {
                                return (
                                    <div className={`my-6 rounded-2xl overflow-hidden border-l-4 ${borderColor} ${bgClass} p-5 relative`}>
                                        <div className="flex items-center gap-2 mb-2 font-black uppercase text-[10px] tracking-widest opacity-90" style={{ color: titleColor }}>
                                            <span className="text-base">{icon}</span>
                                            <span>{title}</span>
                                        </div>
                                        <div className="italic text-text-primary font-medium text-sm leading-relaxed opacity-90">
                                            {props.children}
                                        </div>
                                    </div>
                                );
                            }

                            return (
                                <div className="relative my-8 group pl-6 border-l-4 border-[#6C5DD3]/50">
                                    <blockquote className="italic text-text-primary font-medium text-base md:text-lg leading-relaxed opacity-90" {...props} />
                                </div>
                            );
                        },
                        code: (props) => <code className="bg-black/30 px-1.5 py-0.5 rounded text-xs font-mono text-[#6C5DD3] font-bold break-all border border-white/5" {...props} />,
                        a: (props) => <a className="text-[#6C5DD3] underline underline-offset-4 decoration-2 decoration-[#6C5DD3]/30 hover:decoration-[#6C5DD3] transition-all font-bold break-all" {...props} />,
                        strong: (props) => <strong className="font-bold text-text-primary" {...props} />,
                    }}
                >
                    {lesson.content}
                </ReactMarkdown>
            </div>
        </div>

        {/* QUESTIONS TO HQ */}
        <div className="bg-surface p-6 rounded-[2.5rem] border border-border-color mb-8 relative overflow-hidden shadow-lg">
             <div className="flex justify-between items-center mb-4">
                 <h3 className="text-text-primary font-bold text-lg">Вопрос в Штаб</h3>
                 <span className={`text-[10px] font-black uppercase px-2 py-1 rounded-lg ${questionsRemaining > 0 ? 'bg-green-500/20 text-green-500' : 'bg-red-500/20 text-red-500'}`}>
                     Лимит: {questionsRemaining}
                 </span>
             </div>
             <div className="flex gap-2">
                 <input 
                    value={questionText}
                    onChange={(e) => setQuestionText(e.target.value)}
                    placeholder="Ваш вопрос..."
                    disabled={questionsRemaining <= 0 || isAsking}
                    className="flex-1 bg-body border border-border-color rounded-2xl px-4 py-3 text-sm text-text-primary placeholder:text-text-secondary focus:border-[#6C5DD3] outline-none disabled:opacity-50 transition-colors"
                 />
                 <button 
                    onClick={handleAskQuestion}
                    disabled={questionsRemaining <= 0 || isAsking || !questionText.trim()}
                    className="bg-[#6C5DD3] text-white rounded-2xl w-12 flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed hover:bg-[#5b4eb5] transition-colors"
                 >
                    {isAsking ? '...' : '➤'}
                 </button>
             </div>
        </div>

        {/* HOMEWORK SECTION */}
        {!isCompleted ? (
            <div className="relative rounded-[2.5rem] overflow-hidden shadow-2xl group bg-[#16181D]">
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-[#6C5DD3] to-[#FFAB7B]"></div>
                
                <div className="relative z-10 p-8 text-white">
                    <div className="flex items-center gap-4 mb-6">
                        <div className="w-14 h-14 rounded-2xl bg-[#6C5DD3] flex items-center justify-center text-2xl shadow-lg shadow-[#6C5DD3]/30 text-white">
                            {lesson.homeworkType === 'VIDEO' ? '📹' : lesson.homeworkType === 'PHOTO' ? '📸' : lesson.homeworkType === 'FILE' ? '📄' : '✍️'}
                        </div>
                        <div>
                            <h3 className="font-black text-xl leading-tight text-white tracking-tight">Боевая задача</h3>
                            <p className="text-[#6C5DD3] text-[10px] font-black uppercase tracking-widest mt-1">
                                Награда за скорость: {XP_RULES.HOMEWORK_FAST} XP (сейчас)
                            </p>
                        </div>
                    </div>
                    
                    <div className="bg-white/5 p-5 rounded-2xl border border-white/5 mb-8 relative">
                         <div className="absolute top-0 left-0 w-1 h-full bg-[#6C5DD3] rounded-l-2xl"></div>
                         <p className="text-white/90 text-sm font-medium italic leading-relaxed pl-2">"{lesson.homeworkTask}"</p>
                    </div>
                    
                    {lesson.homeworkType === 'TEXT' ? (
                        <textarea
                            value={inputText}
                            onChange={(e) => setInputText(e.target.value)}
                            placeholder="Введите ваш отчет здесь..."
                            className="w-full bg-black/40 text-white p-5 rounded-2xl border border-white/10 focus:border-[#6C5DD3] outline-none h-48 mb-6 resize-none text-sm placeholder:text-white/20 transition-all focus:bg-black/60 focus:ring-1 focus:ring-[#6C5DD3]/50"
                        />
                    ) : (
                        <div onClick={() => fileInputRef.current?.click()} className={`w-full h-40 mb-8 border-2 border-dashed rounded-[2rem] flex flex-col items-center justify-center cursor-pointer transition-all group/upload relative overflow-hidden ${selectedFile ? 'border-green-500 bg-green-500/10' : 'border-white/10 hover:border-[#6C5DD3] bg-white/5 hover:bg-[#6C5DD3]/5'}`}>
                            <input 
                                type="file" 
                                ref={fileInputRef} 
                                onChange={handleFileChange} 
                                accept={lesson.homeworkType === 'VIDEO' ? "video/*" : lesson.homeworkType === 'FILE' ? "application/pdf" : "image/*"} 
                                className="hidden" 
                            />
                            {selectedFile ? (
                                <div className="flex flex-col items-center justify-center p-4 z-10">
                                    <span className="text-green-500 text-3xl mb-2 drop-shadow-lg">✓</span>
                                    <span className="text-green-500 font-bold text-sm text-center break-all max-w-[200px]">
                                        {lesson.homeworkType === 'FILE' && fileName ? fileName : 'Материал загружен'}
                                    </span>
                                    <span className="text-white/40 text-[9px] mt-2 uppercase tracking-widest">Нажмите чтобы изменить</span>
                                </div>
                            ) : (
                                <div className="flex flex-col items-center group-hover/upload:scale-105 transition-transform z-10">
                                    <span className="text-white/30 text-3xl mb-2 group-hover/upload:text-[#6C5DD3] transition-colors">+</span>
                                    <span className="text-white/30 text-xs uppercase font-black tracking-widest group-hover/upload:text-white transition-colors">
                                        {lesson.homeworkType === 'FILE' ? 'Загрузить PDF' : lesson.homeworkType === 'VIDEO' ? 'Загрузить видео' : 'Загрузить фото'}
                                    </span>
                                </div>
                            )}
                        </div>
                    )}
                    
                    {feedback && (
                        <div className="mb-6 p-5 bg-red-500/10 border border-red-500/20 rounded-2xl animate-fade-in backdrop-blur-md">
                            <div className="flex items-center gap-2 mb-2">
                                <span className="text-lg">👮‍♂️</span>
                                <p className="text-red-400 text-[10px] font-black uppercase tracking-widest">Вердикт Командира</p>
                            </div>
                            <p className="text-white text-sm leading-relaxed font-medium">{feedback}</p>
                        </div>
                    )}

                    <button 
                        onClick={handleSubmit} 
                        disabled={isSubmitDisabled} 
                        className="w-full py-5 bg-[#6C5DD3] text-white rounded-[1.5rem] font-black text-xs uppercase tracking-[0.2em] hover:bg-[#5b4eb5] transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-[0_10px_30px_rgba(108,93,211,0.4)] hover:shadow-[0_15px_40px_rgba(108,93,211,0.5)] active:scale-[0.98] relative overflow-hidden group/btn"
                    >
                         <span className="relative z-10">{isSubmitting ? 'АНАЛИЗ ДАННЫХ...' : 'ОТПРАВИТЬ ОТЧЕТ'}</span>
                    </button>
                </div>
            </div>
        ) : (
            <div className="bg-green-500/10 rounded-[2.5rem] p-10 text-center border border-green-500/20 mb-8 animate-slide-up shadow-lg relative overflow-hidden">
                <div className="w-24 h-24 bg-green-500 text-white rounded-full flex items-center justify-center text-5xl mx-auto mb-6 shadow-[0_0_50px_rgba(34,197,94,0.5)] animate-[bounce_1s_infinite]">✓</div>
                <p className="text-green-500 font-black text-3xl uppercase tracking-tighter mb-2 animate-scale-in">Lesson Mastered!</p>
                {feedback && <div className="mt-6 bg-green-500/10 p-4 rounded-xl inline-block max-w-sm border border-green-500/20"><p className="text-green-400 text-sm leading-relaxed font-medium">"{feedback}"</p></div>}
            </div>
        )}
      </div>
    </div>
  );
};
