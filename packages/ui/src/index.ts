// UI Components - Shared component library
// Re-export all components from the web app for use in admin and other packages

// This package serves as a central export point for shared UI components
// Actual implementations live in apps/web/src/components/ui and apps/admin/src/components/ui
// This allows for consistent design system across all apps

export * from './utils';

export { cn } from './utils';