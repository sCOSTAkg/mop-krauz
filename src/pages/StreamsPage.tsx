import React, { Suspense } from 'react';
import { useAppContext } from '../App';
import { Tab } from '../types';

const VideoHub = React.lazy(() => import('../components/VideoHub').then(m => ({ default: m.VideoHub })));

const Loading = () => (
  <div className="flex items-center justify-center min-h-[60vh]">
    <div className="w-8 h-8 border-2 border-[#6C5DD3] border-t-transparent rounded-full animate-spin"></div>
  </div>
);

export const StreamsPage = () => {
  const ctx = useAppContext();
  return (
    <Suspense fallback={<Loading />}>
      <VideoHub
        streams={ctx.streams}
        onBack={() => ctx.setActiveTab(Tab.HOME)}
        userProgress={ctx.userProgress}
        onUpdateUser={ctx.handleUpdateUser}
        setNavAction={ctx.setNavAction}
      />
    </Suspense>
  );
};
