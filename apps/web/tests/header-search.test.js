/** @jest-environment jsdom */
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { Header } from '../src/components/layout/header';
const mockPush = jest.fn();
jest.mock('next/navigation', () => ({ useRouter: () => ({ push: mockPush }) }));
test('la búsqueda visible abre formulario, navega y cierra', () => {
  render(<Header isDemo />);
  fireEvent.click(screen.getByRole('button', { name: 'Buscar productos' }));
  fireEvent.change(screen.getByRole('searchbox', { name: 'Buscar productos' }), { target: { value: 'ají amarillo' } });
  fireEvent.click(screen.getByRole('button', { name: 'Buscar', exact: true }));
  expect(mockPush).toHaveBeenCalledWith('/tienda?search=aj%C3%AD%20amarillo');
  expect(screen.queryByRole('dialog', { name: 'Buscar productos' })).toBeNull();
  expect(screen.queryByRole('link', { name: 'Ofertas' })).toBeNull();
});
