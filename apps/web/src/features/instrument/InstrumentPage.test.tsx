// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { cleanup, render, screen, fireEvent, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { InstrumentPage } from './InstrumentPage';

afterEach(cleanup);

describe('InstrumentPage', () => {
  it('renders RELIANCE as default symbol with price, tabs and key metrics', async () => {
    render(
      <MemoryRouter initialEntries={['/instruments']}>
        <Routes>
          <Route path="/instruments" element={<InstrumentPage />} />
        </Routes>
      </MemoryRouter>
    );

    // Check header and symbol
    expect(await screen.findByText('Reliance Industries Ltd.')).toBeInTheDocument();
    expect(screen.getAllByText('RELIANCE').length).toBeGreaterThan(0);
    expect(screen.getByText('Quick Jump:')).toBeInTheDocument();

    // Check tabs
    expect(screen.getByRole('button', { name: /Overview/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Financials/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Technicals/i })).toBeInTheDocument();
  });

  it('switches symbol when clicking a quick chip', async () => {
    render(
      <MemoryRouter initialEntries={['/instruments?symbol=RELIANCE']}>
        <Routes>
          <Route path="/instruments" element={<InstrumentPage />} />
        </Routes>
      </MemoryRouter>
    );

    expect(await screen.findByText('Reliance Industries Ltd.')).toBeInTheDocument();

    // Click on TCS chip
    const tcsChips = screen.getAllByRole('button', { name: 'TCS' });
    fireEvent.click(tcsChips[0]);

    await waitFor(() => {
      expect(screen.getByText('Tata Consultancy Services Ltd.')).toBeInTheDocument();
    });
  });

  it('renders asset categories including Equities, ETFs, Bonds, Indices, MF and IPOs', async () => {
    render(
      <MemoryRouter initialEntries={['/instruments']}>
        <Routes>
          <Route path="/instruments" element={<InstrumentPage />} />
        </Routes>
      </MemoryRouter>
    );

    expect(screen.getByRole('button', { name: /Equities/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /ETFs/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Bonds & Gilts/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Indices/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Mutual Funds/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /IPOs & Listings/i })).toBeInTheDocument();
  });
});
