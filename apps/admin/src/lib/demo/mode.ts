export function isAdminDemo() {
  return !process.env.DATABASE_URL && process.env.ADMIN_DEMO_MODE !== 'false';
}
