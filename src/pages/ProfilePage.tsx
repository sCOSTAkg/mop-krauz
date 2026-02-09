import React, { Suspense } from 'react';
import { useAppContext } from '../App';
import { Tab } from '../types';

const Profile = React.lazy(() => import('../components/Profile').then(m => ({ default: m.Profile })));

const Loading = () => (
  <div className="flex items-center justify-center min-h-[60vh]">
    <div className="w-8 h-8 border-2 border-[#6C5DD3] border-t-transparent rounded-full animate-spin"></div>
  </div>
);

export const ProfilePage = () => {
  const ctx = useAppContext();
  return (
    <Suspense fallback={<Loading />}>
      <Profile
        userProgress={ctx.userProgress}
        onLogout={ctx.handleLogout}
        allUsers={ctx.allUsers}
        onUpdateUser={ctx.handleUpdateUser}
        events={ctx.events}
        onLogin={ctx.handleLogin}
        onNavigate={ctx.setActiveTab}
        setNavAction={ctx.setNavAction}
        modules={ctx.modules}
      />
    </Suspense>
  );
};
