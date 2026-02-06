
import React, { useState, useRef, useEffect } from 'react';
import ReactPlayer from 'react-player';
import ReactMarkdown from 'react-markdown';
import { Lesson, Module } from '../types';
import { checkHomeworkWithAI } from '../services/geminiService';
import { telegram } from '../services/telegramService';

// Fix for TypeScript error where ReactPlayer props are not recognized correctly
const VideoPlayer = ReactPlayer as unknown as React.ComponentType<any>;

// Utility to format time (mm:ss)
const formatDuration = (seconds: number) => {
  if (isNaN(seconds)) return "00:00";
  const date = new Date(seconds * 1000);
  const hh = date.getUTCHours();
  const mm = date.getUTCMinutes();
  const ss = date.getUTCSeconds().toString().padStart(2, '0');
  if (hh) {
    return `${hh}:${mm.toString().padStart(2, '0')}:${ss}`;
  }
  return `${mm}:${ss}`;
};

interface LessonViewProps {
  lesson: Lesson;
  isCompleted: boolean;
  onComplete: (lessonId: string) => void;
  onBack: () => void;
  parentModule?: Module | null;
}

export const LessonView: React.FC<LessonViewProps> = ({ 
  lesson, 
  isCompleted, 
  onComplete, 
  onBack, 
  parentModule 
}) => {
  const [inputText, setInputText] = useState('');
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  
  // Video Player State
  const playerRef = useRef<any>(null);
  const [playing, setPlaying] = useState(false);
  const [played, setPlayed] = useState(0);
  const [duration, setDuration] = useState(0);
  const [seeking, setSeeking] = useState(false);
  const [showControls, setShowControls] = useState(false);
  const controlsTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    return () => {
        if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
    };
  }, []);

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
        onComplete(lesson.id);
        setFeedback(result.feedback);
        telegram.haptic('success');
    } else {
        setFeedback(result.feedback);
        telegram.haptic('error');
    }
  };

  // Video Handlers
  const handlePlayPause = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    setPlaying(!playing);
  };

  const handleSeekChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setPlayed(parseFloat(e.target.value));
  };

  const handleSeekMouseDown = () => {
    setSeeking(true);
  };

  const handleSeekMouseUp = (e: React.MouseEvent<HTMLInputElement>) => {
    setSeeking(false);
    playerRef.current?.seekTo(parseFloat((e.target as HTMLInputElement).value));
  };

  const handleProgress = (state: { played: number }) => {
    if (!seeking) {
      setPlayed(state.played);
    }
  };

  const handleMouseMove = () => {
    setShowControls(true);
    if (controlsTimeoutRef.current) {
        clearTimeout(controlsTimeoutRef.current);
    }
    controlsTimeoutRef.current = setTimeout(() => {
        if (playing) {
            setShowControls(false);
        }
    }, 2500);
  };

  const videoUrl = lesson.videoUrl || parentModule?.videoUrl;
  const hasVideo = !!videoUrl;
  
  const isSubmitDisabled = isSubmitting || (lesson.homeworkType === 'TEXT' ? !inputText.trim() : !selectedFile);

  return (
    <div className="flex flex-col min-h-screen pb-32 w-full animate-slide-in bg-body text-text-primary transition-colors duration-300">
      {/* HEADER */}
      <div className="sticky top-0 z-40 px-5 pt-[calc(var(--safe-top)+10px)] pb-4 flex items-center justify-between bg-body/80 backdrop-blur-xl border-b border-border-color shadow-sm transition-all">
        <button onClick={onBack} className="w-10 h-10 rounded-full bg-surface border border-border-color flex items-center justify-center text-text-primary hover:bg-black/5 dark:hover:bg-white/10 transition-colors active:scale-95">
           <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-5 h-5">
             <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
           </svg>
        </button>
        <div className="flex flex-col items-center">
             <span className="text-[10px] font-black uppercase tracking-widest text-[#6C5DD3]">Урок</span>
             <span className="text-xs font-bold text-text-primary max-w-[200px] truncate">{lesson.title}</span>
        </div>
        <div className="w-10"></div>
      </div>

      <div className="px-5 max-w-2xl mx-auto w-full pt-6">
        {/* VIDEO PLAYER */}
        {hasVideo && (
            <div 
                className="relative mb-8 group animate-fade-in bg-black rounded-[2rem] overflow-hidden shadow-2xl aspect-video isolate transform transition-transform"
                onMouseMove={handleMouseMove}
                onMouseLeave={() => playing && setShowControls(false)}
                onClick={handleMouseMove}
            >
                {/* Background Glow */}
                <div className="absolute inset-0 bg-[#6C5DD3] blur-[100px] opacity-20 pointer-events-none -z-10"></div>

                {/* Player Wrapper */}
                <div className="absolute inset-0 z-0">
                    <VideoPlayer 
                        ref={playerRef}
                        className="react-player" 
                        url={videoUrl} 
                        width="100%" 
                        height="100%" 
                        playing={playing}
                        controls={false}
                        light={true}
                        playIcon={
                            <div className="absolute inset-0 flex items-center justify-center bg-black/30 group-hover:bg-black/40 transition-colors cursor-pointer z-10">
                                <div className="relative w-20 h-20 flex items-center justify-center">
                                    <div className="absolute inset-0 bg-[#6C5DD3] rounded-full blur-md opacity-50 animate-pulse"></div>
                                    <div className="relative w-16 h-16 bg-white/10 backdrop-blur-md border border-white/40 rounded-full flex items-center justify-center pl-1 text-white shadow-2xl transition-transform transform group-hover:scale-110">
                                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-8 h-8"><path fillRule="evenodd" d="M4.5 5.653c0-1.426 1.529-2.33 2.779-1.643l11.54 6.348c1.295.712 1.295 2.573 0 3.285L7.28 19.991c-1.25.687-2.779-.217-2.779-1.643V5.653z" clipRule="evenodd" /></svg>
                                    </div>
                                </div>
                            </div>
                        }
                        onPlay={() => setPlaying(true)}
                        onPause={() => setPlaying(false)}
                        onProgress={handleProgress}
                        onDuration={setDuration}
                        onEnded={() => setPlaying(false)}
                        config={{
                            youtube: {
                            playerVars: { showinfo: 0, controls: 0, modestbranding: 1, rel: 0, playsinline: 1 }
                            }
                        }}
                    />
                </div>

                {/* Custom Controls Overlay */}
                <div 
                    className={`absolute inset-0 z-20 flex flex-col justify-end bg-gradient-to-t from-black/90 via-black/20 to-transparent transition-opacity duration-300 pointer-events-none ${showControls || !playing ? 'opacity-100' : 'opacity-0'}`}
                >
                    <div className="p-6 pb-8 space-y-4 pointer-events-auto">
                        {/* Progress Bar */}
                        <div className="flex items-center gap-4">
                            <span className="text-[10px] font-bold font-mono text-white/80 w-10">{formatDuration(played * duration)}</span>
                            <div className="relative flex-1 h-1.5 bg-white/20 rounded-full group/slider cursor-pointer">
                                <input 
                                    type="range"
                                    min={0}
                                    max={0.999999}
                                    step="any"
                                    value={played}
                                    onMouseDown={handleSeekMouseDown}
                                    onChange={handleSeekChange}
                                    onMouseUp={handleSeekMouseUp}
                                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-30"
                                />
                                <div 
                                    className="absolute top-0 left-0 h-full bg-[#6C5DD3] rounded-full transition-all duration-100" 
                                    style={{ width: `${played * 100}%` }}
                                >
                                    <div className="absolute right-0 top-1/2 -translate-y-1/2 w-3 h-3 bg-white rounded-full shadow-lg scale-0 group-hover/slider:scale-100 transition-transform"></div>
                                </div>
                            </div>
                            <span className="text-[10px] font-bold font-mono text-white/80 w-10 text-right">{formatDuration(duration)}</span>
                        </div>

                        {/* Controls */}
                        <div className="flex items-center justify-center gap-8">
                            <button onClick={() => playerRef.current?.seekTo(played - 0.1)} className="text-white/60 hover:text-white transition-colors active:scale-90">
                                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6"><path d="M9.195 18.44c1.25.713 2.805-.19 2.805-1.629v-2.87l3.195 1.841c1.25.714 2.805-.19 2.805-1.629v-8.31c0-1.44-1.555-2.343-2.805-1.629l-7.108 4.097c-1.25.714-1.25 2.543 0 3.257l3.108 1.793v2.457c0 1.44-1.555 2.343-2.805 1.628l-7.108-4.097a1.875 1.875 0 010-3.257l6.805-3.923a.75.75 0 00-.75-1.3L3.795 9.12a3.375 3.375 0 000 5.86l7.996 4.609c.75.432 1.696.066 1.696-.803v-2.03c0-.869-.955-1.41-1.696-.983l-2.596 1.497z" /></svg>
                            </button>
                            
                            <button 
                                onClick={handlePlayPause} 
                                className="w-14 h-14 bg-white text-black rounded-full flex items-center justify-center hover:scale-105 active:scale-95 transition-all shadow-[0_0_20px_rgba(255,255,255,0.3)]"
                            >
                                {playing ? (
                                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6"><path fillRule="evenodd" d="M6.75 5.25a.75.75 0 01.75-.75H9a.75.75 0 01.75.75v13.5a.75.75 0 01-.75.75H7.5a.75.75 0 01-.75-.75V5.25zm7.5 0A.75.75 0 0115 4.5h1.5a.75.75 0 01.75.75v13.5a.75.75 0 01-.75.75H15a.75.75 0 01-.75-.75V5.25z" clipRule="evenodd" /></svg>
                                ) : (
                                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6 ml-1"><path fillRule="evenodd" d="M4.5 5.653c0-1.426 1.529-2.33 2.779-1.643l11.54 6.348c1.295.712 1.295 2.573 0 3.285L7.28 19.991c-1.25.687-2.779-.217-2.779-1.643V5.653z" clipRule="evenodd" /></svg>
                                )}
                            </button>

                            <button onClick={() => playerRef.current?.seekTo(played + 0.1)} className="text-white/60 hover:text-white transition-colors active:scale-90">
                                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6"><path d="M14.805 18.44a1.875 1.875 0 002.805-1.629v-2.87l3.195 1.841c1.25.714 2.805-.19 2.805-1.629v-8.31c0-1.44-1.555-2.343-2.805-1.629l-7.108 4.097c-1.25.714-1.25 2.543 0 3.257l3.108 1.793v2.457c0 1.44-1.555 2.343-2.805 1.628l-7.108-4.097a1.875 1.875 0 00-3.257 0l-6.805 3.923a.75.75 0 11-.75-1.3l7.996-4.609a3.375 3.375 0 015.062 0l7.996 4.609c.75.432 1.696.066 1.696-.803v-2.03c0-.869-.955-1.41-1.696-.983l-2.596 1.497z" /></svg>
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        )}

        {/* CONTENT CARD */}
        <div className="bg-surface p-6 md:p-8 rounded-[2.5rem] border border-border-color mb-8 relative overflow-hidden shadow-lg transition-colors">
            <div className="flex items-center gap-3 mb-5">
               <span className="bg-[#6C5DD3]/10 text-[#6C5DD3] border border-[#6C5DD3]/20 text-[10px] font-black px-3 py-1 rounded-full uppercase tracking-wider">
                 +{lesson.xpReward} XP
               </span>
               {isCompleted && <span className="text-green-500 text-[10px] font-black uppercase tracking-wider flex items-center gap-1 bg-green-500/10 px-2 py-1 rounded-full border border-green-500/10">
                   ✓ Выполнено
               </span>}
            </div>

            <h2 className="text-3xl font-black text-text-primary mb-6 leading-tight tracking-tight">{lesson.title}</h2>
            
            <div className="markdown-content">
                <ReactMarkdown
                    components={{
                        h1: (props) => <h1 className="text-2xl font-black mt-8 mb-4 text-[#6C5DD3] leading-tight" {...props} />,
                        h2: (props) => <h2 className="text-xl font-bold mt-6 mb-3 text-text-primary border-l-4 border-[#6C5DD3] pl-3" {...props} />,
                        h3: (props) => <h3 className="text-lg font-bold mt-5 mb-2 text-text-primary" {...props} />,
                        p: (props) => <p className="mb-4 leading-relaxed text-text-secondary font-medium" {...props} />,
                        ul: (props) => <ul className="list-disc pl-5 mb-6 space-y-2 text-text-secondary marker:text-[#6C5DD3]" {...props} />,
                        ol: (props) => <ol className="list-decimal pl-5 mb-6 space-y-2 text-text-secondary marker:text-[#6C5DD3] font-bold" {...props} />,
                        li: (props) => <li className="pl-1" {...props} />,
                        blockquote: (props) => (
                            <div className="relative my-8 group">
                                <div className="absolute -left-2 top-0 bottom-0 w-1 bg-[#6C5DD3] rounded-full opacity-50"></div>
                                <blockquote className="pl-6 italic text-text-primary font-medium text-lg leading-relaxed opacity-90" {...props} />
                                <div className="absolute top-[-10px] left-2 text-4xl text-[#6C5DD3] opacity-20 font-serif">"</div>
                            </div>
                        ),
                        code: (props) => <code className="bg-black/10 dark:bg-white/10 px-1.5 py-0.5 rounded text-xs font-mono text-[#6C5DD3] font-bold" {...props} />,
                        pre: (props) => (
                            <div className="relative group my-6">
                                <div className="absolute -inset-1 bg-gradient-to-r from-[#6C5DD3] to-transparent opacity-10 rounded-2xl blur-sm"></div>
                                <pre className="relative bg-[#0F1115] p-5 rounded-2xl overflow-x-auto text-sm border border-white/5 shadow-inner custom-scrollbar" {...props} />
                                <div className="absolute top-2 right-4 text-[9px] font-black uppercase text-white/20 tracking-widest">Script</div>
                            </div>
                        ),
                        a: (props) => <a className="text-[#6C5DD3] underline underline-offset-4 decoration-2 decoration-[#6C5DD3]/30 hover:decoration-[#6C5DD3] transition-all font-bold" {...props} />,
                        strong: (props) => <strong className="font-bold text-text-primary" {...props} />,
                        em: (props) => <em className="text-[#6C5DD3] not-italic font-bold" {...props} />,
                        hr: (props) => <hr className="my-8 border-t-2 border-border-color border-dashed" {...props} />,
                    }}
                >
                    {lesson.content}
                </ReactMarkdown>
            </div>
        </div>

        {/* HOMEWORK SECTION */}
        {!isCompleted ? (
            <div className="relative rounded-[2.5rem] overflow-hidden shadow-2xl ring-1 ring-border-color group bg-[#14161B]">
                {/* Diagonal Stripe Decor */}
                <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: 'linear-gradient(45deg, #fff 25%, transparent 25%, transparent 50%, #fff 50%, #fff 75%, transparent 75%, transparent)', backgroundSize: '20px 20px' }}></div>

                <div className="relative z-10 p-6 md:p-8 text-white">
                    <div className="flex items-center gap-4 mb-6">
                        <div className="w-14 h-14 rounded-2xl bg-[#6C5DD3] flex items-center justify-center text-2xl shadow-lg shadow-[#6C5DD3]/30 text-white">
                            {lesson.homeworkType === 'VIDEO' ? '📹' : lesson.homeworkType === 'PHOTO' ? '📸' : lesson.homeworkType === 'FILE' ? '📄' : '✍️'}
                        </div>
                        <div>
                            <h3 className="font-black text-xl leading-tight text-white tracking-tight">Боевая задача</h3>
                            <p className="text-[#6C5DD3] text-[10px] font-black uppercase tracking-widest mt-1">Отчет командованию</p>
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
                         <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent translate-x-[-100%] group-hover/btn:animate-[shimmer_1.5s_infinite]"></div>
                    </button>
                    <style>{`@keyframes shimmer { 100% { transform: translateX(100%); } }`}</style>
                </div>
            </div>
        ) : (
            <div className="bg-green-500/10 rounded-[2.5rem] p-10 text-center border border-green-500/20 mb-8 animate-slide-up shadow-lg">
                <div className="w-20 h-20 bg-green-500 text-white rounded-full flex items-center justify-center text-4xl mx-auto mb-6 shadow-[0_0_40px_rgba(34,197,94,0.4)] animate-bounce">✓</div>
                <p className="text-green-500 font-black text-2xl uppercase tracking-tighter mb-2">Принято</p>
                <p className="text-text-secondary text-sm font-medium">Задание зачтено штабом.</p>
                {feedback && <div className="mt-6 bg-green-500/10 p-4 rounded-xl inline-block max-w-sm"><p className="text-green-600 text-sm leading-relaxed font-medium">"{feedback}"</p></div>}
            </div>
        )}
      </div>
    </div>
  );
};
