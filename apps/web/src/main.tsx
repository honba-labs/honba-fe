import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { createBrowserRouter, RouterProvider, Navigate } from 'react-router-dom';
import { QueryClientProvider } from '@tanstack/react-query';

import { AppLayout } from './app-shell/AppLayout';
import { PortfolioView } from './features/portfolio/PortfolioView';
import { MarketsView } from './features/markets/MarketsView';
import { TradeView } from './features/trade/TradeView';
import { WalletView } from './features/wallet/WalletView';
import { WorkbenchView } from './features/workbench/WorkbenchView';
import { SettingsView } from './features/settings/SettingsView';
import { createQueryClient } from './core/api/query';
import './styles/theme.css';
import './styles/base.css';

const queryClient = createQueryClient();

const router = createBrowserRouter([
  {
    path: '/',
    element: <AppLayout />,
    children: [
      { index: true, element: <PortfolioView /> },
      { path: 'portfolio', element: <PortfolioView /> },
      { path: 'markets', element: <MarketsView /> },
      { path: 'screener', element: <MarketsView /> },
      { path: 'trade', element: <TradeView /> },
      { path: 'wallet', element: <WalletView /> },
      { path: 'workbench', element: <WorkbenchView /> },
      { path: 'algodesigner', element: <WorkbenchView /> },
      { path: 'settings', element: <SettingsView /> },
      { path: '*', element: <Navigate to="/" replace /> },
    ],
  },
]);

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>
  </StrictMode>
);
