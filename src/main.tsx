import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import { AppShell } from './app-shell/shell';
import { PlaceholderRoute } from './app-shell/placeholder-route';
import './styles/base.css';

const router = createBrowserRouter([
  {
    path: '/',
    element: <AppShell />,
    children: [
      { index: true, element: <PlaceholderRoute name="Screener" /> },
      { path: 'workbench', element: <PlaceholderRoute name="Workbench" /> },
      { path: 'algodesigner', element: <PlaceholderRoute name="AlgoDesigner" /> },
      { path: 'simulator', element: <PlaceholderRoute name="Simulator" /> },
      { path: 'researcher', element: <PlaceholderRoute name="Researcher" /> },
      { path: 'portfolio', element: <PlaceholderRoute name="Portfolio" /> },
      { path: 'settings', element: <PlaceholderRoute name="Settings" /> },
    ],
  },
]);

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <RouterProvider router={router} />
  </StrictMode>
);
