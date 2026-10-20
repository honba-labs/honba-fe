import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { createBrowserRouter, RouterProvider, Navigate } from 'react-router-dom';
import { QueryClientProvider } from '@tanstack/react-query';

import { AppLayout } from './app-shell/AppLayout';
import { PortfolioView } from './features/portfolio/PortfolioView';
import { ScreenerPage } from './features/screener/ScreenerPage';
import { InstrumentPage } from './features/instrument/InstrumentPage';
import { WorkbenchView } from './features/workbench/WorkbenchView';
import { AlgoDesignerPage } from './features/algodesigner/AlgoDesignerPage';
import { StrategiesPage } from './features/strategies/StrategiesPage';
import { SimulatorView } from './features/simulator/SimulatorView';
import { TradebookView } from './features/tradebook/TradebookView';
import { MarketsView } from './features/markets/MarketsView';
import { TradeView } from './features/trade/TradeView';
import { WalletView } from './features/wallet/WalletView';
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
      { path: 'screener', element: <ScreenerPage /> },
      { path: 'instruments', element: <InstrumentPage /> },
      { path: 'instruments/:symbol', element: <InstrumentPage /> },
      { path: 'instrument', element: <InstrumentPage /> },
      { path: 'instrument/:symbol', element: <InstrumentPage /> },
      { path: 'workbench', element: <WorkbenchView /> },
      { path: 'strategy-builder', element: <AlgoDesignerPage /> },
      { path: 'strategies', element: <AlgoDesignerPage /> },
      { path: 'strategy-studio', element: <AlgoDesignerPage /> },
      { path: 'algodesigner', element: <AlgoDesignerPage /> },
      { path: 'simulator', element: <SimulatorView /> },
      { path: 'tradebook', element: <TradebookView /> },
      { path: 'markets', element: <MarketsView /> },
      { path: 'trade', element: <TradeView /> },
      { path: 'wallet', element: <WalletView /> },
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
