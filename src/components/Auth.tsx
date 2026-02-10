
import React, { useState, useRef, useEffect } from 'react';
import { generateSpartanAvatar } from '../services/geminiService';
import { telegram } from '../services/telegramService';
import { Button } from './Button';
import { UserProgress, UserDossier } from '../types';
import { Backend } from '../services/backendService';

interface AuthProps {
  onLogin: (data: any) => void;
  existingUsers?: UserProgress[];
}

type AuthStep = 'CHECKING' | 'AUTH_FORM' | 'IDENTITY' | 'DOSSIER' | 'SCANNING' | 'FINALIZING';

export const Auth: React.FC<AuthProps> = ({ onLogin, existingUsers = [] }) => {
  const [step, setStep] = useState<AuthStep>('CHECKING');
  const [isRegisterMode, setIsRegisterMode] = useState(false);

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');

  // Identity Data
  const [realName, setRealName] = useState('');
  const [selectedImage, setSelectedImage] = useState<string | null>(null);

  // Dossier Data (Split into parts for UX)
  const [dossierStep, setDossierStep] = useState<number>(0); // 0: Bio, 1: Social, 2: Goals
  const [dossier, setDossier] = useState<UserDossier>({
      height: '',
      weight: '',
      birthDate: '',
      location: '',
      livingSituation: 'ALONE',
      workExperience: '',
      incomeGoal: '',
      courseExpectations: '',
      courseGoals: '',
      motivation: ''
  });

  const defaultArmorStyle = 'Classic Bronze';

  const [errors, setErrors] = useState<{[key: string]: string}>({});
  const [isShake, setIsShake] = useState(false);
  const [loadingText, setLoadingText] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dossierContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const initAuth = async () => {
        if (telegram.isAvailable && telegram.user) {
            const tgUser = telegram.user;
            const tgId = tgUser.id.toString();
            setLoadingText('Автоматическая идентификация...');
            await new Promise(r => setTimeout(r, 600));

            let user = existingUsers.find(u => u.telegramId === tgId);
            if (!user && tgUser.username) {
                 user = existingUsers.find(u => u.telegramUsername?.toLowerCase() === tgUser.username?.toLowerCase());
            }
            if (!user) {
                const checkUser = await Backend.syncUser({ telegramId: tgId, name: '' } as UserProgress);
                if (checkUser.name) user = checkUser;
            }

            if (user) {
                telegram.haptic('success');
                onLogin({
                    ...user,
                    telegramId: tgId,
                    isAuthenticated: true,
                    isRegistration: false
                });
            } else {
                telegram.haptic('light');
                const combinedName = `${tgUser.first_name} ${tgUser.last_name || ''}`.trim();
                setRealName(combinedName);
                setUsername(tgUser.username || `user_${tgId}`);
                setIsRegisterMode(true);
                setStep('IDENTITY');
            }
        } else {
            setStep('AUTH_FORM');
            if (telegram.user?.username) setUsername(telegram.user.username);
        }
    };
    initAuth();
  }, []);

  useEffect(() => {
      // Scroll to top when dossier step changes
      if (step === 'DOSSIER') {
          dossierContainerRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
      }
  }, [dossierStep, step]);

  const handleError = (field: string, msg: string) => {
    setErrors(prev => ({ ...prev, [field]: msg }));
    setIsShake(true);
    telegram.haptic('error');
    setTimeout(() => setIsShake(false), 500);
  };

  const updateDossier = (field: keyof UserDossier, value: string) => {
      setDossier(prev => ({ ...prev, [field]: value }));
  };

  const handleUsernameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const val = e.target.value.replace(/[^a-zA-Z0-9_@]/g, '');
      setUsername(val);
      if (errors.username) setErrors(prev => ({ ...prev, username: '' }));
  };

  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      setPassword(e.target.value);
      if (errors.password) setErrors(prev => ({ ...prev, password: '' }));
  };

  const handleAuthSubmit = () => {
    setErrors({});
    const cleanUsername = username.trim().replace('@', '');
    const cleanPassword = password.trim();
    let hasError = false;

    // Username Validation
    if (!cleanUsername) {
        handleError('username', 'Введите Username');
        hasError = true;
    } else if (cleanUsername.length < 3) {
        handleError('username', 'Минимум 3 символа');
        hasError = true;
    }

    // Password Validation
    if (!cleanPassword) {
        handleError('password', 'Введите пароль');
        hasError = true;
    } else if (cleanPassword.length < 4) {
        handleError('password', 'Пароль слишком короткий (мин. 4)');
        hasError = true;
    }

    if (hasError) return;

    // Admin login: credentials should be validated server-side via environment variable
    const adminPassword = import.meta.env.VITE_ADMIN_PASSWORD || '';
    if (adminPassword && cleanUsername === 'admin' && cleanPassword === adminPassword) {
        telegram.haptic('success');
        onLogin({
            role: 'ADMIN',
            name: 'Commander',
            telegramUsername: 'admin',
            isRegistration: false,
            avatarUrl: 'https://ui-avatars.com/api/?name=Admin&background=1F2128&color=fff',
            armorStyle: 'Golden God'
        });
        return;
    }

    if (isRegisterMode) {
        const userExists = existingUsers.some(u => u.telegramUsername?.toLowerCase() === cleanUsername.toLowerCase());
        if (userExists) { handleError('username', 'Пользователь уже существует'); return; }

        telegram.haptic('light');
        setStep('IDENTITY');
    } else {
        const user = existingUsers.find(u => u.telegramUsername?.toLowerCase() === cleanUsername.toLowerCase());
        if (!user) { handleError('username', 'Пользователь не найден'); return; }
        if (user.password && user.password !== cleanPassword) { handleError('password', 'Неверный пароль'); return; }

        telegram.haptic('success');
        onLogin({ ...user, isRegistration: false });
    }
  };

  const handleIdentitySubmit = () => {
    if (!realName.trim()) { handleError('name', 'Введите имя'); return; }
    if (!selectedImage) { handleError('photo', 'Загрузите фото'); return; }

    setStep('DOSSIER'); // Move to Questionaire instead of scanning
    setDossierStep(0);
    telegram.haptic('success');
  };

  const handleDossierNext = () => {
      // Validation for Step 0 (Bio)
      if (dossierStep === 0) {
          if (!dossier.height) { handleError('height', 'Укажите рост'); return; }
          if (!dossier.weight) { handleError('weight', 'Укажите вес'); return; }
          if (!dossier.birthDate) { handleError('birthDate', 'Укажите дату рождения'); return; }
          if (!dossier.location) { handleError('location', 'Укажите город'); return; }
          setDossierStep(1);
          telegram.haptic('selection');
      }
      // Validation for Step 1 (Background & Goals)
      else if (dossierStep === 1) {
          if (!dossier.workExperience) { handleError('workExperience', 'Заполните опыт'); return; }
          if (!dossier.incomeGoal) { handleError('incomeGoal', 'Укажите цель'); return; }

          setDossierStep(2);
          telegram.haptic('selection');
      }
      // Validation for Step 2 (Motivation - Final)
      else {
          if (!dossier.courseGoals) { handleError('courseGoals', 'Заполните поле'); return; }
          if (!dossier.motivation) { handleError('motivation', 'Заполните поле'); return; }

          setStep('SCANNING');
          setLoadingText('Анализ данных...');
          setTimeout(() => {
              telegram.haptic('medium');
              handleFinalize();
          }, 2000);
      }
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) { handleError('photo', 'Макс. размер 5MB'); return; }
      const reader = new FileReader();
      reader.onloadend = () => {
          setSelectedImage(reader.result as string);
          setErrors(prev => ({...prev, photo: ''}));
          telegram.haptic('selection');
      };
      reader.readAsDataURL(file);
    }
  };

  const handleFinalize = async () => {
    setStep('FINALIZING');
    const loadingMessages = ['Генерация аватара...', 'Сохранение профиля...', 'Почти готово...'];
    let msgIdx = 0;
    const interval = setInterval(() => {
        setLoadingText(loadingMessages[msgIdx % loadingMessages.length]);
        msgIdx++;
    }, 1500);

    try {
        const base64Data = selectedImage!.split(',')[1];
        const avatarUrl = await generateSpartanAvatar(base64Data, 1, defaultArmorStyle);
        clearInterval(interval);
        telegram.haptic('success');

        const cleanUsername = username.trim().replace('@', '');
        const inviteLink = `https://t.me/SalesProBot?start=ref_${cleanUsername}`;
        const tgId = telegram.user?.id.toString();

        const newUser: any = {
            role: 'STUDENT',
            name: realName,
            telegramUsername: cleanUsername,
            telegramId: tgId,
            password: password.trim() || 'tg_auth',
            originalPhoto: base64Data,
            avatarUrl,
            armorStyle: defaultArmorStyle,
            inviteLink: inviteLink,
            dossier: dossier,
            isRegistration: true
        };

        await Backend.saveUser(newUser);
        onLogin(newUser);

    } catch (e) {
        clearInterval(interval);
        handleError('global', 'Ошибка сети. Попробуйте еще раз.');
        setStep('IDENTITY'); // Go back to start if failed
    }
  };

  const renderChecking = () => (
      <div className="flex flex-col items-center justify-center py-20 animate-fade-in">
           <div className="w-12 h-12 border-3 border-[#6C5DD3] border-t-transparent rounded-full animate-spin mb-4"></div>
           <p className="text-text-secondary font-medium text-sm">{loadingText || 'Поиск профиля...'}</p>
      </div>
  );

  const renderAuthForm = () => (
    <div className={`w-full max-w-sm mx-auto animate-fade-in ${isShake ? 'animate-shake' : ''}`}>
       <div className="mb-8 text-center">
           <div className="w-14 h-14 bg-[#6C5DD3]/10 rounded-2xl flex items-center justify-center text-2xl mb-4 mx-auto">
               🛡️
           </div>
           <h2 className="text-2xl font-bold text-text-primary mb-2">Вход</h2>
           <p className="text-text-secondary text-sm">Войдите для доступа к курсу и сохранения прогресса.</p>
       </div>

       <div className="bg-body p-1 rounded-xl flex relative mb-6 border border-border-color">
          <div
             className={`absolute top-1 bottom-1 w-[calc(50%-4px)] bg-[#6C5DD3] rounded-lg transition-all duration-300 ease-[cubic-bezier(0.25,1,0.5,1)] ${isRegisterMode ? 'left-[calc(50%+2px)]' : 'left-1'}`}
          ></div>
          <button
             onClick={() => { setIsRegisterMode(false); setErrors({}); }}
             className={`flex-1 py-2.5 text-xs font-semibold relative z-10 transition-colors ${!isRegisterMode ? 'text-white' : 'text-text-secondary'}`}
          >
             Вход
          </button>
          <button
             onClick={() => { setIsRegisterMode(true); setErrors({}); }}
             className={`flex-1 py-2.5 text-xs font-semibold relative z-10 transition-colors ${isRegisterMode ? 'text-white' : 'text-text-secondary'}`}
          >
             Регистрация
          </button>
       </div>

       <div className="space-y-4">
           <div className="space-y-1.5">
               <label className="text-xs font-medium text-text-secondary ml-1">Telegram Username</label>
               <div className={`flex items-center bg-body border ${errors.username ? 'border-[#FF3B30]' : 'border-border-color focus-within:border-[#6C5DD3]'} rounded-xl px-4 transition-colors`}>
                   <span className="text-text-secondary">@</span>
                   <input
                     value={username}
                     onChange={handleUsernameChange}
                     className="w-full bg-transparent py-3.5 pl-2 text-text-primary font-medium outline-none placeholder:text-text-secondary"
                     placeholder="username"
                   />
               </div>
           </div>

           <div className="space-y-1.5">
               <label className="text-xs font-medium text-text-secondary ml-1">Пароль</label>
               <div className={`flex items-center bg-body border ${errors.password ? 'border-[#FF3B30]' : 'border-border-color focus-within:border-[#6C5DD3]'} rounded-xl px-4 transition-colors`}>
                   <span className="text-text-secondary">🔒</span>
                   <input
                     type="password"
                     value={password}
                     onChange={handlePasswordChange}
                     className="w-full bg-transparent py-3.5 pl-2 text-text-primary font-medium outline-none placeholder:text-text-secondary"
                     placeholder="••••••••"
                   />
               </div>
           </div>

           {(errors.username || errors.password) && (
               <p className="text-[#FF3B30] text-xs font-medium text-center animate-fade-in">{errors.username || errors.password}</p>
           )}

           <Button
                onClick={handleAuthSubmit}
                fullWidth
                className="!mt-6 !py-3.5 !rounded-xl !bg-[#6C5DD3] !text-white"
           >
              {isRegisterMode ? 'Далее' : 'Войти'}
           </Button>
       </div>
    </div>
  );

  const renderIdentity = () => (
      <div className={`w-full max-w-sm mx-auto animate-fade-in ${isShake ? 'animate-shake' : ''}`}>
           <div className="mb-6 text-center">
              <div className="w-12 h-12 bg-[#6C5DD3]/10 text-[#6C5DD3] rounded-2xl flex items-center justify-center text-xl mx-auto mb-3">
                 🪪
              </div>
              <h2 className="text-xl font-bold text-text-primary">Личные данные</h2>
              <p className="text-text-secondary text-sm mt-1">
                 Этап 1: Идентификация
              </p>
          </div>

          <div className="space-y-5">
              <div className="space-y-1.5">
                  <label className="text-xs font-medium text-text-secondary ml-1">ФИО / Позывной</label>
                  <input
                    value={realName}
                    onChange={e => setRealName(e.target.value)}
                    className={`w-full bg-body border ${errors.name ? 'border-[#FF3B30]' : 'border-border-color focus:border-[#6C5DD3]'} rounded-xl py-3.5 px-4 text-text-primary font-medium outline-none transition-colors`}
                    placeholder="Имя Фамилия"
                  />
              </div>

              <div className="space-y-1.5">
                  <label className="text-xs font-medium text-text-secondary ml-1">Фото профиля</label>
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    className={`
                        w-full h-36 rounded-2xl bg-body border-2 border-dashed flex flex-col items-center justify-center cursor-pointer transition-all group relative overflow-hidden
                        ${errors.photo ? 'border-[#FF3B30]' : 'border-border-color hover:border-[#6C5DD3] hover:bg-[#6C5DD3]/5'}
                    `}
                  >
                      {selectedImage ? (
                          <img src={selectedImage} className="absolute inset-0 w-full h-full object-cover opacity-80" />
                      ) : (
                          <>
                              <div className="w-10 h-10 bg-card rounded-full flex items-center justify-center text-xl mb-2 group-hover:scale-110 transition-transform">📸</div>
                              <span className="text-xs font-medium text-text-secondary">Загрузить фото</span>
                          </>
                      )}
                      <input type="file" ref={fileInputRef} onChange={handleFileChange} accept="image/*" className="hidden" />
                  </div>
              </div>
          </div>

          <div className="flex gap-3 mt-8">
              {(!telegram.isAvailable || !telegram.user) && (
                  <button onClick={() => setStep('AUTH_FORM')} className="w-12 h-12 flex items-center justify-center rounded-xl bg-body text-text-secondary hover:text-text-primary transition-colors border border-border-color">
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
                  </button>
              )}
              <Button onClick={handleIdentitySubmit} fullWidth className="!rounded-xl !bg-[#6C5DD3] !text-white">
                  Далее
              </Button>
          </div>
      </div>
  );

  const renderDossier = () => (
      <div className={`w-full max-w-sm mx-auto animate-fade-in flex flex-col h-[70vh] ${isShake ? 'animate-shake' : ''}`}>
           <div className="flex-shrink-0 mb-5 text-center">
              <div className="flex justify-center gap-2 mb-4">
                  {[0, 1, 2].map(i => (
                      <div key={i} className={`h-1 rounded-full transition-all duration-300 ${i <= dossierStep ? 'w-8 bg-[#6C5DD3]' : 'w-4 bg-border-color'}`}></div>
                  ))}
              </div>
              <h2 className="text-lg font-bold text-text-primary">
                  {dossierStep === 0 ? 'Физические данные' : dossierStep === 1 ? 'Опыт и цели' : 'Мотивация'}
              </h2>
          </div>

          <div ref={dossierContainerRef} className="flex-1 overflow-y-auto custom-scrollbar pr-1 pb-4">
              {/* STEP 0: BIOMETRICS & LOCATION */}
              {dossierStep === 0 && (
                  <div className="space-y-4 animate-fade-in">
                       <div className="grid grid-cols-2 gap-3">
                           <div className="space-y-1.5">
                               <label className="text-xs font-medium text-text-secondary ml-1">Рост (см)</label>
                               <input
                                   type="number"
                                   value={dossier.height} onChange={e => updateDossier('height', e.target.value)}
                                   className={`w-full bg-body border ${errors.height ? 'border-[#FF3B30]' : 'border-border-color focus:border-[#6C5DD3]'} rounded-xl py-3 px-4 text-text-primary font-medium outline-none`}
                                   placeholder="180"
                               />
                           </div>
                           <div className="space-y-1.5">
                               <label className="text-xs font-medium text-text-secondary ml-1">Вес (кг)</label>
                               <input
                                   type="number"
                                   value={dossier.weight} onChange={e => updateDossier('weight', e.target.value)}
                                   className={`w-full bg-body border ${errors.weight ? 'border-[#FF3B30]' : 'border-border-color focus:border-[#6C5DD3]'} rounded-xl py-3 px-4 text-text-primary font-medium outline-none`}
                                   placeholder="75"
                               />
                           </div>
                       </div>

                       <div className="space-y-1.5">
                           <label className="text-xs font-medium text-text-secondary ml-1">Дата рождения</label>
                           <input
                               type="date"
                               value={dossier.birthDate} onChange={e => updateDossier('birthDate', e.target.value)}
                               className={`w-full bg-body border ${errors.birthDate ? 'border-[#FF3B30]' : 'border-border-color focus:border-[#6C5DD3]'} rounded-xl py-3 px-4 text-text-primary font-medium outline-none`}
                           />
                       </div>

                       <div className="space-y-1.5">
                           <label className="text-xs font-medium text-text-secondary ml-1">Город проживания</label>
                           <input
                               value={dossier.location} onChange={e => updateDossier('location', e.target.value)}
                               className={`w-full bg-body border ${errors.location ? 'border-[#FF3B30]' : 'border-border-color focus:border-[#6C5DD3]'} rounded-xl py-3 px-4 text-text-primary font-medium outline-none`}
                               placeholder="Москва"
                           />
                       </div>

                       <div className="space-y-1.5">
                           <label className="text-xs font-medium text-text-secondary ml-1">Условия проживания</label>
                           <select
                               value={dossier.livingSituation} onChange={e => updateDossier('livingSituation', e.target.value as any)}
                               className="w-full bg-body border border-border-color focus:border-[#6C5DD3] rounded-xl py-3 px-4 text-text-primary font-medium outline-none appearance-none"
                           >
                               <option value="ALONE">Живу один</option>
                               <option value="PARENTS">С родителями</option>
                               <option value="DORM">Общежитие</option>
                               <option value="FAMILY">С семьей/партнером</option>
                           </select>
                       </div>
                  </div>
              )}

              {/* STEP 1: EXPERIENCE & MONEY */}
              {dossierStep === 1 && (
                  <div className="space-y-4 animate-fade-in">
                       <div className="space-y-1.5">
                           <label className="text-xs font-medium text-text-secondary ml-1">Опыт работы (кратко)</label>
                           <textarea
                               value={dossier.workExperience} onChange={e => updateDossier('workExperience', e.target.value)}
                               className={`w-full bg-body border ${errors.workExperience ? 'border-[#FF3B30]' : 'border-border-color focus:border-[#6C5DD3]'} rounded-xl py-3 px-4 text-text-primary font-medium outline-none resize-none h-24`}
                               placeholder="Менеджер 2 года..."
                           />
                       </div>

                       <div className="space-y-1.5">
                           <label className="text-xs font-medium text-text-secondary ml-1">Желаемый доход (в месяц)</label>
                           <input
                               value={dossier.incomeGoal} onChange={e => updateDossier('incomeGoal', e.target.value)}
                               className={`w-full bg-body border ${errors.incomeGoal ? 'border-[#FF3B30]' : 'border-border-color focus:border-[#6C5DD3]'} rounded-xl py-3 px-4 text-text-primary font-medium outline-none`}
                               placeholder="100 000 руб."
                           />
                       </div>

                       <div className="space-y-1.5">
                           <label className="text-xs font-medium text-text-secondary ml-1">Ожидания от курса</label>
                           <textarea
                               value={dossier.courseExpectations} onChange={e => updateDossier('courseExpectations', e.target.value)}
                               className="w-full bg-body border border-border-color focus:border-[#6C5DD3] rounded-xl py-3 px-4 text-text-primary font-medium outline-none resize-none h-24"
                               placeholder="Жесткая дисциплина, практика..."
                           />
                       </div>
                  </div>
              )}

              {/* STEP 2: GOALS & MOTIVATION */}
              {dossierStep === 2 && (
                   <div className="space-y-4 animate-fade-in">
                       <div className="space-y-1.5">
                           <label className="text-xs font-medium text-text-secondary ml-1">Что хочешь получить на выходе?</label>
                           <textarea
                               value={dossier.courseGoals} onChange={e => updateDossier('courseGoals', e.target.value)}
                               className={`w-full bg-body border ${errors.courseGoals ? 'border-[#FF3B30]' : 'border-border-color focus:border-[#6C5DD3]'} rounded-xl py-3 px-4 text-text-primary font-medium outline-none resize-none h-24`}
                               placeholder="Навык продаж, уверенность..."
                           />
                       </div>

                       <div className="space-y-1.5">
                           <label className="text-xs font-medium text-text-secondary ml-1">Почему записался на курс?</label>
                           <textarea
                               value={dossier.motivation} onChange={e => updateDossier('motivation', e.target.value)}
                               className={`w-full bg-body border ${errors.motivation ? 'border-[#FF3B30]' : 'border-border-color focus:border-[#6C5DD3]'} rounded-xl py-3 px-4 text-text-primary font-medium outline-none resize-none h-32`}
                               placeholder="Хочу изменить жизнь..."
                           />
                       </div>
                   </div>
              )}
          </div>

          <div className="flex gap-3 mt-4 flex-shrink-0">
               <button onClick={() => dossierStep > 0 ? setDossierStep(dossierStep - 1) : setStep('IDENTITY')} className="w-12 h-12 flex items-center justify-center rounded-xl bg-body text-text-secondary hover:text-text-primary transition-colors border border-border-color">
                   <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
               </button>
               <Button onClick={handleDossierNext} fullWidth className="!rounded-xl !bg-[#6C5DD3] !text-white">
                   {dossierStep === 2 ? 'Завершить' : 'Далее'}
               </Button>
          </div>
      </div>
  );

  const renderScanning = () => (
      <div className="flex flex-col items-center justify-center w-full py-10 animate-fade-in">
           <div className="relative w-32 h-32 mb-6">
                {selectedImage && (
                    <img src={selectedImage} className="w-full h-full object-cover rounded-full opacity-60" />
                )}
                <div className="absolute inset-0 rounded-full border-3 border-[#6C5DD3] border-t-transparent animate-spin"></div>
           </div>
           <h3 className="text-base font-semibold text-text-primary mb-1">{loadingText}</h3>
           <p className="text-text-secondary text-xs">Пожалуйста, подождите</p>
      </div>
  );

  const renderFinalizing = () => (
    <div className="flex flex-col items-center justify-center w-full py-20 animate-fade-in">
        <div className="w-16 h-16 mb-6">
             <svg className="animate-spin text-[#6C5DD3] w-full h-full" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
             </svg>
        </div>
        <h3 className="text-base font-semibold text-text-primary mb-1">{loadingText}</h3>
        <p className="text-text-secondary text-xs">Создание профиля...</p>
    </div>
  );

  return (
    <div className="w-full h-full min-h-[calc(100vh-140px)] flex flex-col items-center justify-center p-4">
         {step === 'CHECKING' && renderChecking()}
         {step === 'AUTH_FORM' && renderAuthForm()}
         {step === 'IDENTITY' && renderIdentity()}
         {step === 'DOSSIER' && renderDossier()}
         {step === 'SCANNING' && renderScanning()}
         {step === 'FINALIZING' && renderFinalizing()}
    </div>
  );
};
