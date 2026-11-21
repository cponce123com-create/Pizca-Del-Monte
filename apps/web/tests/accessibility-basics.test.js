import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import AppLayout from '../src/app/(app)/layout';
jest.mock('../src/components/layout/header', () => ({ Header: () => <header /> }));
jest.mock('../src/components/layout/footer', () => ({ Footer: () => <footer /> }));
test('el enlace para saltar apunta al contenido principal', () => {
  process.env.DEMO_MODE = 'true';
  const html = renderToStaticMarkup(<AppLayout>contenido</AppLayout>);
  expect(html).toContain('href="#contenido"'); expect(html).toContain('id="contenido"');
  delete process.env.DEMO_MODE;
});
