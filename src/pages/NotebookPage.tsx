import React from 'react';
import { useAppContext } from '../App';
import { NotebookView } from '../components/NotebookView';
import { Tab } from '../types';

export const NotebookPage = () => {
  const ctx = useAppContext();
  return (
    <NotebookView
      entries={ctx.userProgress.notebook}
      onUpdate={(e: any) => ctx.handleUpdateUser({ notebook: e })}
      onBack={() => ctx.setActiveTab(Tab.HOME)}
      onXPEarned={ctx.handleXPEarned}
      setNavAction={ctx.setNavAction}
    />
  );
};
