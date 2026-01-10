// Site configuration
// Uses environment variable, defaults to true in production
// Set NEXT_PUBLIC_COMING_SOON=false in .env.local to see full site locally
export const COMING_SOON_MODE = process.env.NEXT_PUBLIC_COMING_SOON !== 'false';
