/** @jest-environment jsdom */
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { ProductCatalogClient } from '../src/app/(app)/tienda/ProductCatalogClient';
const mockRouter = { push: jest.fn(), replace: jest.fn() };
jest.mock('next/navigation', () => ({ useRouter: () => mockRouter, useSearchParams: () => new URLSearchParams() }));
test('muestra un error recuperable si falla la carga', async () => {
  global.fetch = jest.fn().mockRejectedValueOnce(new Error('falló')).mockResolvedValue({ ok: true, json: async () => ({ products: [], pagination: { page: 1, limit: 12, total: 0, totalPages: 0, hasNext: false, hasPrev: false } }) });
  render(<ProductCatalogClient initialParams={{}} />);
  expect(await screen.findByRole('alert')).toBeTruthy();
  fireEvent.click(screen.getByRole('button', { name: 'Reintentar' }));
  expect(await screen.findByText('No se encontraron productos')).toBeTruthy();
  expect(screen.queryByRole('alert')).toBeNull();
});
