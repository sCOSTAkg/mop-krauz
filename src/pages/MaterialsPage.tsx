import React from 'react';
import { useAppContext } from '../App';
import { MaterialsView } from '../components/MaterialsView';
import { Tab } from '../types';

export const MaterialsPage = () => {
  const ctx = useAppContext();
  return (
    <MaterialsView
      materials={ctx.materials}
      onBack={() => ctx.setActiveTab(Tab.HOME)}
      userProgress={ctx.userProgress}
    />
  );
};
