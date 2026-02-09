import React, { Suspense } from 'react';
import { useAppContext } from '../App';
import { HomeDashboard } from '../components/HomeDashboard';
import { Tab } from '../types';

const LessonView = React.lazy(() => import('../components/LessonView').then(m => ({ default: m.LessonView })));

const Loading = () => (
  <div className="flex items-center justify-center min-h-[60vh]">
    <div className="w-8 h-8 border-2 border-[#6C5DD3] border-t-transparent rounded-full animate-spin"></div>
  </div>
);

export const HomePage = () => {
  const ctx = useAppContext();
  if (ctx.activeLesson) {
    return (
      <Suspense fallback={<Loading />}>
        <div className="animate-slide-up min-h-full bg-body relative z-10">
          <LessonView
            lesson={ctx.activeLesson}
            isCompleted={ctx.userProgress.completedLessonIds.includes(ctx.activeLesson.id)}
            onComplete={ctx.handleCompleteLesson}
            onBack={() => ctx.setSelectedLessonId(null)}
            onNavigate={(id: string) => ctx.setSelectedLessonId(id)}
            parentModule={ctx.activeModule}
            userProgress={ctx.userProgress}
            onUpdateUser={ctx.handleUpdateUser}
            onUpdateLesson={ctx.handleUpdateLesson}
          />
        </div>
      </Suspense>
    );
  }
  return (
    <HomeDashboard
      onNavigate={ctx.setActiveTab}
      userProgress={ctx.userProgress}
      onProfileClick={() => ctx.setActiveTab(Tab.PROFILE)}
      modules={ctx.modules}
      materials={ctx.materials}
      streams={ctx.streams}
      scenarios={ctx.scenarios}
      onSelectLesson={(l: any) => ctx.setSelectedLessonId(l.id)}
      onUpdateUser={ctx.handleUpdateUser}
      allUsers={ctx.allUsers}
      notifications={ctx.notifications}
      appConfig={ctx.appConfig}
    />
  );
};
