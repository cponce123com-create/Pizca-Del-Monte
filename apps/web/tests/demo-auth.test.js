import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import LoginPage from '../src/app/(auth)/login/page';
import RegisterPage from '../src/app/(auth)/register/page';
jest.mock('../src/app/(auth)/login/LoginClient', () => () => { throw new Error('login no debe cargarse en demo'); });
jest.mock('../src/app/(auth)/register/RegisterClient', () => () => { throw new Error('registro no debe cargarse en demo'); });
test.each([LoginPage, RegisterPage])('las cuentas muestran aviso sin cargar formularios en demo', Page => {
  process.env.DEMO_MODE = 'true';
  const html = renderToStaticMarkup(<Page />);
  expect(html).toContain('Las cuentas no están disponibles en la demostración');
  expect(html).not.toContain('Google');
  expect(html).not.toContain('Facebook');
  delete process.env.DEMO_MODE;
});
