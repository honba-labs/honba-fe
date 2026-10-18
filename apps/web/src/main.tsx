import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import { UI_CORE_VERSION } from '@honba/ui-core';
import '@honba/ui-core/styles.css';
import { AppShell } from './app-shell/shell';
import { PlaceholderRoute } from './app-shell/placeholder-route';
import { ComponentDashboard } from './features/component-dashboard/component-dashboard';
import { WorkbenchPage } from './features/workbench/WorkbenchPage';
import './styles/base.css';

console.info(`@honba/ui-core ${UI_CORE_VERSION}`);

const router = createBrowserRouter([
  {
    path: '/',
    element: <AppShell />,
    children: [
      { index: true, element: <PlaceholderRoute name="Screener" /> },
      { path: 'workbench', element: <WorkbenchPage /> },
      { path: 'algodesigner', element: <PlaceholderRoute name="AlgoDesigner" /> },
      { path: 'simulator', element: <PlaceholderRoute name="Simulator" /> },
      { path: 'researcher', element: <PlaceholderRoute name="Researcher" /> },
      { path: 'portfolio', element: <PlaceholderRoute name="Portfolio" /> },
      { path: 'settings', element: <PlaceholderRoute name="Settings" /> },
      {
        path: 'components',
        handle: { title: 'Components' },
        element: <ComponentDashboard />,
      },
    ],
  },
]);

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <RouterProvider router={router} />
  </StrictMode>
);
