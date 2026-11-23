/** @jest-environment jsdom */
import React from 'react';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { LiveSearch } from '../src/components/layout/live-search';

const mockPush = jest.fn();
jest.mock('next/navigation', () => ({ useRouter: () => ({ push: mockPush }) }));
jest.mock('../src/components/products/demo-product-image', () => ({
  DemoProductImage: ({ name }) => React.createElement('span', { role: 'img', 'aria-label': name }),
}));

beforeEach(() => {
  mockPush.mockClear();
  global.fetch = jest.fn().mockResolvedValue({
    ok: true,
    json: async () => ({
      products: [{
        id: 'demo-3',
        slug: 'aji-charapita',
        name: 'Ají Charapita',
        formattedPrice: 'S/ 35.00',
        categories: [{ name: 'Especias' }],
        primaryImage: null,
      }],
      pagination: { total: 1 },
      isDemo: true,
    }),
  });
});

afterEach(() => { jest.restoreAllMocks(); });

test('desde la primera letra consulta y muestra sugerencias que llevan a una ficha real', async () => {
  const onClose = jest.fn();
  render(React.createElement(LiveSearch, { onClose }));
  const search = screen.getByRole('combobox', { name: /buscar productos del catálogo/i });
  fireEvent.change(search, { target: { value: 'a' } });
  await waitFor(() => expect(global.fetch).toHaveBeenCalledTimes(1));
  expect(global.fetch.mock.calls[0][0]).toContain('search=a');
  expect(global.fetch.mock.calls[0][0]).toContain('limit=6');
  const suggestion = await screen.findByRole('option', { name: /ají charapita/i });
  expect(screen.getByText('S/ 35.00')).toBeTruthy();
  fireEvent.click(suggestion);
  expect(mockPush).toHaveBeenCalledWith('/producto/aji-charapita');
  expect(onClose).toHaveBeenCalledTimes(1);
});

test('Enter abre la lista filtrada y Escape cierra el buscador', async () => {
  const onClose = jest.fn();
  render(React.createElement(LiveSearch, { onClose }));
  const search = screen.getByRole('combobox');
  fireEvent.change(search, { target: { value: 'sal' } });
  fireEvent.keyDown(search, { key: 'Enter' });
  expect(mockPush).toHaveBeenCalledWith('/tienda?search=sal');
  fireEvent.keyDown(document, { key: 'Escape' });
  expect(onClose).toHaveBeenCalled();
});

test('no consulta el servidor si el usuario no ha escrito', async () => {
  render(React.createElement(LiveSearch, { onClose: jest.fn() }));
  expect(screen.getByText(/Escribe una letra/i)).toBeTruthy();
  expect(global.fetch).not.toHaveBeenCalled();
});
