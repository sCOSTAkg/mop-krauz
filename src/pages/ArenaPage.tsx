import React, { Suspense } from 'react';
import { useAppContext } from '../App';

const SalesArena = React.lazy(() => import('../components/SalesArena').then(m => ({ default: m.SalesArena })));

const Loading = () => (
  <div className="flex items-center justify-center min-h-[60vh]">
    <div className="w-8 h-8 border-2 border-[#6C5DD3] border-t-transparent rounded-full animate-spin"></div>
  </div>
);

export const ArenaPage = () => {
  const ctx = useAppContext();
  return (
    <Suspense fallback={<Loading />}>
      <SalesArena userProgress={ctx.userProgress} />
    </Suspense>
  );
};
