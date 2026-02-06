
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
  lesson: propLesson, 
  isCompleted, 
  onComplete, 
  onBack, 
  parentModule,
  userProgress,
  onUpdateUser,
  onUpdateLesson
}) => {
  // Override description for lesson l1-2 as per specific content requirement
  const lesson = { ...propLesson };
  if (lesson.id === 'l1-2') {
      lesson.description = 'Кодекс Воина Продаж: Честь, дисциплина, результат. Изучи кодекс, отделяющий профессионала от рыночного торговца.';
  }

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
      description: lesson.description,
      homeworkTask: lesson.homeworkTask,
      aiGradingInstruction: lesson.aiGradingInstruction
  });

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Stats for current lesson
  const questionsAskedCount = userProgress.stats?.questionsAsked?.[lesson.id] || 0;
  const questionsRemaining = XP_RULES.MAX_QUESTIONS_PER_LESSON - questionsAskedCount;

  useEffect(() => {
      setEditData({
          description: lesson.description,
          homeworkTask: lesson.homeworkTask,
          aiGradingInstruction: lesson.aiGradingInstruction
      });
  }, [lesson.id, lesson.description, lesson.homeworkTask, lesson.aiGradingInstruction]);

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

  const videoUrl = lesson.videoUrl || parentModule?.videoUrl;
  const hasVideo = !!videoUrl;
  
  const isSubmitDisabled = isSubmitting || (lesson.homeworkType === 'TEXT' ? !inputText.trim() : !selectedFile);
  const isAdmin = userProgress.role === 'ADMIN';

  return (
    <div className="flex flex-col min-h-screen pb-32 w-full animate-slide-in bg-body text-text-primary transition-colors duration-300">
      {/* HEADER - Glassmorphism */}
      <div className="sticky top-0 z-40 px-4 md:px-6 pt-[calc(var(--safe-top)+10px)] pb-4 flex items-center justify-between bg-[#14161B]/80 backdrop-blur-xl border-b border-white/5 shadow-lg">
        <button onClick={onBack} className="w-10 h-10 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-white hover:bg-white/10 active:scale-95 transition-all">
           <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-5 h-5">
             <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
           </svg>
        </button>
        <div className="flex flex-col items-center">
             <span className="text-[9px] font-black uppercase tracking-[0.2em] text-[#6C5DD3] mb-0.5">Lesson Access</span>
             <span className="text-xs font-bold text-white max-w-[200px] truncate">{lesson.title}</span>
        </div>
        <div className="w-10 flex justify-end">
            {isAdmin && (
                <button onClick={() => setIsEditing(!isEditing)} className={`text-xs font-black uppercase ${isEditing ? 'text-[#6C5DD3]' : 'text-slate-400'}`}>
                    {isEditing ? 'Close' : 'Edit'}
                </button>
            )}
        </div>
      </div>

      <div className="px-4 md:px-6 max-w-2xl mx-auto w-full pt-6">
        
        {/* EDIT MODE PANEL */}
        {isEditing && (
            <div className="bg-[#1F2128] p-5 rounded-[2rem] border border-[#6C5DD3]/30 mb-6 space-y-4 animate-fade-in shadow-xl">
                <div className="flex justify-between items-center mb-2">
                    <h3 className="text-white font-black uppercase text-sm">Редактирование Урока</h3>
                    <button onClick={handleSaveEdit} className="bg-green-600 hover:bg-green-500 text-white px-4 py-2 rounded-xl text-xs font-bold uppercase transition-colors">Сохранить</button>
                </div>
                
                <div>
                    <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Описание (Подзаголовок)</label>
                    <input 
                        value={editData.description}
                        onChange={(e) => setEditData({...editData, description: e.target.value})}
                        className="w-full bg-black/20 border border-white/10 rounded-xl p-3 text-white text-sm outline-none focus:border-[#6C5DD3]"
                    />
                </div>

                <div>
                    <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Задание (Homework Task)</label>
                    <textarea 
                        value={editData.homeworkTask}
                        onChange={(e) => setEditData({...editData, homeworkTask: e.target.value})}
                        className="w-full bg-black/20 border border-white/10 rounded-xl p-3 text-white text-sm outline-none focus:border-[#6C5DD3] h-24 resize-none"
                    />
                </div>

                <div>
                    <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Инструкция для AI (Grading)</label>
                    <textarea 
                        value={editData.aiGradingInstruction}
                        onChange={(e) => setEditData({...editData, aiGradingInstruction: e.target.value})}
                        className="w-full bg-black/20 border border-white/10 rounded-xl p-3 text-white text-sm outline-none focus:border-[#6C5DD3] h-32 resize-none font-mono text-xs"
                        placeholder="Критерии проверки..."
                    />
                </div>
            </div>
        )}

        {/* VIDEO PLAYER */}
        {hasVideo && (
            <div className="relative mb-8 group animate-fade-in bg-black rounded-[2.5rem] overflow-hidden shadow-2xl aspect-video isolate ring-1 ring-white/10">
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
        <div className="bg-[#14161B] p-6 md:p-8 rounded-[2.5rem] border border-white/5 mb-8 relative overflow-hidden shadow-xl">
            <div className="flex items-center gap-3 mb-6">
               <span className="bg-[#6C5DD3]/10 text-[#6C5DD3] border border-[#6C5DD3]/20 text-[10px] font-black px-3 py-1 rounded-full uppercase tracking-wider">
                 +{lesson.xpReward} XP
               </span>
               {isCompleted && <span className="text-green-500 text-[10px] font-black uppercase tracking-wider flex items-center gap-1 bg-green-500/10 px-2 py-1 rounded-full border border-green-500/10">
                   ✓ Completed
               </span>}
            </div>

            <h2 className="text-3xl font-black text-white mb-3 leading-tight tracking-tight">{lesson.title}</h2>
            {lesson.description && <p className="text-sm font-medium text-slate-400 mb-8 border-l-2 border-[#6C5DD3] pl-4">{lesson.description}</p>}
            
            <div className="markdown-content text-slate-300">
                <ReactMarkdown
                    components={{
                        h1: (props) => <h1 className="text-xl md:text-2xl font-black mt-8 mb-4 text-[#6C5DD3] leading-tight" {...props} />,
                        h2: (props) => <h2 className="text-lg md:text-xl font-bold mt-6 mb-3 text-white border-l-4 border-[#6C5DD3] pl-3" {...props} />,
                        h3: (props) => <h3 className="text-base md:text-lg font-bold mt-5 mb-2 text-white" {...props} />,
                        p: (props) => <p className="mb-4 leading-relaxed font-medium text-sm md:text-base opacity-90" {...props} />,
                        ul: (props) => <ul className="list-disc pl-5 mb-6 space-y-2 marker:text-[#6C5DD3]" {...props} />,
                        ol: (props) => <ol className="list-decimal pl-5 mb-6 space-y-2 marker:text-[#6C5DD3] font-bold" {...props} />,
                        li: (props) => <li className="pl-1 text-sm md:text-base" {...props} />,
                        blockquote: (props) => (
                            <div className="relative my-8 group">
                                <div className="absolute -left-2 top-0 bottom-0 w-1 bg-[#6C5DD3] rounded-full opacity-50"></div>
                                <blockquote className="pl-6 italic text-white font-medium text-base md:text-lg leading-relaxed opacity-90" {...props} />
                            </div>
                        ),
                        code: (props) => <code className="bg-black/30 px-1.5 py-0.5 rounded text-xs font-mono text-[#6C5DD3] font-bold break-all border border-white/5" {...props} />,
                        a: (props) => <a className="text-[#6C5DD3] underline underline-offset-4 decoration-2 decoration-[#6C5DD3]/30 hover:decoration-[#6C5DD3] transition-all font-bold break-all" {...props} />,
                        strong: (props) => <strong className="font-bold text-white" {...props} />,
                    }}
                >
                    {lesson.content}
                </ReactMarkdown>
            </div>
        </div>

        {/* QUESTIONS TO HQ */}
        <div className="bg-[#14161B] p-6 rounded-[2.5rem] border border-white/5 mb-8 relative overflow-hidden shadow-lg">
             <div className="flex justify-between items-center mb-4">
                 <h3 className="text-white font-bold text-lg">Вопрос в Штаб</h3>
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
                    className="flex-1 bg-white/5 border border-white/10 rounded-2xl px-4 py-3 text-sm text-white placeholder:text-white/20 focus:border-[#6C5DD3] outline-none disabled:opacity-50"
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
            <div className="relative rounded-[2.5rem] overflow-hidden shadow-2xl ring-1 ring-white/10 group bg-[#14161B]">
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
