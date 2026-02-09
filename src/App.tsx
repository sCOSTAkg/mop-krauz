import React, { Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useOutletContext } from 'react-router-dom';
import { MainLayout } from './layouts/MainLayout';
import {
  HomePage,
  ArenaPage,
  HabitsPage,
  NotebookPage,
  MaterialsPage,
  StreamsPage,
  ModulesPage,
  ProfilePage,
  AdminPage,
} from './pages';

const Loading = () => (
  <div className="flex items-center justify-center min-h-[60vh]">
    <div className="w-8 h-8 border-2 border-[#6C5DD3] border-t-transparent rounded-full animate-spin"></div>
  </div>
);

// Type-safe outlet context hook
export function useAppContext() {
  return useOutletContext<any>();
}

const App: React.FC = () => (
  <BrowserRouter>
    <Suspense fallback={<Loading />}>
      <Routes>
        <Route element={<MainLayout />}>
          <Route index element={<HomePage />} />
          <Route path="/arena" element={<ArenaPage />} />
          <Route path="/habits" element={<HabitsPage />} />
          <Route path="/notebook" element={<NotebookPage />} />
          <Route path="/materials" element={<MaterialsPage />} />
          <Route path="/streams" element={<StreamsPage />} />
          <Route path="/modules" element={<ModulesPage />} />
          <Route path="/profile" element={<ProfilePage />} />
          <Route path="/admin" element={<AdminPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </Suspense>
  </BrowserRouter>
);

export default App;
