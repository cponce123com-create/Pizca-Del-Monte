import robots from '../src/app/robots';
import sitemap from '../src/app/sitemap';
import { generateMetadata } from '../src/app/layout';

jest.mock('next/font/google', () => ({ Inter: () => ({ variable: '' }), Playfair_Display: () => ({ variable: '' }), JetBrains_Mono: () => ({ variable: '' }) }));
jest.mock('../src/app/providers', () => ({ Providers: ({ children }) => children }));
beforeEach(() => { process.env.DEMO_MODE = 'true'; process.env.NEXT_PUBLIC_APP_URL = 'https://example.org'; });
afterEach(() => { delete process.env.DEMO_MODE; delete process.env.NEXT_PUBLIC_APP_URL; });
test('metadatos demo impiden indexación y seguimiento', () => { expect(generateMetadata().robots).toEqual({ index: false, follow: false }); });
test('robots bloquea todas las rutas en demo', () => { expect(robots().rules).toEqual({ userAgent: '*', disallow: '/' }); });
test('sitemap demo no publica URLs', async () => { expect(await sitemap()).toEqual([]); });
