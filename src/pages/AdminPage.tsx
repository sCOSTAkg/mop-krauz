import React, { Suspense } from 'react';
import { Navigate } from 'react-router-dom';
import { useAppContext } from '../App';

const AdminDashboard = React.lazy(() => import('../components/AdminDashboard').then(m => ({ default: m.AdminDashboard })));

const Loading = () => (
  <div className="flex items-center justify-center min-h-[60vh]">
    <div className="w-8 h-8 border-2 border-[#6C5DD3] border-t-transparent rounded-full animate-spin"></div>
  </div>
);

export const AdminPage = () => {
  const ctx = useAppContext();
  if (ctx.userProgress.role !== 'ADMIN') return <Navigate to="/" replace />;
  return (
    <Suspense fallback={<Loading />}>
      <AdminDashboard
        config={ctx.appConfig}
        onUpdateConfig={ctx.handleUpdateConfig}
        modules={ctx.modules}
        onUpdateModules={ctx.handleUpdateModules}
        materials={ctx.materials}
        onUpdateMaterials={ctx.handleUpdateMaterials}
        streams={ctx.streams}
        onUpdateStreams={ctx.handleUpdateStreams}
        events={ctx.events}
        onUpdateEvents={ctx.handleUpdateEvents}
        scenarios={ctx.scenarios}
        onUpdateScenarios={ctx.handleUpdateScenarios}
        users={ctx.allUsers}
        onUpdateUsers={ctx.handleUpdateAllUsers}
        currentUser={ctx.userProgress}
        activeSubTab={ctx.adminSubTab}
        onSendBroadcast={ctx.handleSendBroadcast}
        notifications={ctx.notifications}
        onClearNotifications={ctx.handleClearNotifications}
        addToast={ctx.addToast}
      />
    </Suspense>
  );
};
