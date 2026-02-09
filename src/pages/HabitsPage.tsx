import React, { Suspense } from 'react';
import { useAppContext } from '../App';
import { Tab } from '../types';

const HabitTracker = React.lazy(() => import('../components/HabitTracker').then(m => ({ default: m.HabitTracker })));

const Loading = () => (
  <div className="flex items-center justify-center min-h-[60vh]">
    <div className="w-8 h-8 border-2 border-[#6C5DD3] border-t-transparent rounded-full animate-spin"></div>
  </div>
);

export const HabitsPage = () => {
  const ctx = useAppContext();
  return (
    <Suspense fallback={<Loading />}>
      <HabitTracker
        habits={ctx.userProgress.habits || []}
        goals={ctx.userProgress.goals || []}
        onUpdateHabits={(h: any) => ctx.handleUpdateUser({ habits: h })}
        onUpdateGoals={(g: any) => ctx.handleUpdateUser({ goals: g })}
        onXPEarned={ctx.handleXPEarned}
        onBack={() => ctx.setActiveTab(Tab.HOME)}
        setNavAction={ctx.setNavAction}
        isAuthenticated={ctx.userProgress.isAuthenticated}
      />
    </Suspense>
  );
};
