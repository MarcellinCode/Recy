import { AppRoute } from '../constants/routes';

/**
 * Version Web de navigateSafe (Next.js)
 * Utilise le routeur de Next.js
 */
export const navigateSafe = (router: any, route: AppRoute, params?: Record<string, string>) => {
  if (!route) return;

  try {
    if (params) {
      const url = new URL(route, window.location.origin);
      Object.entries(params).forEach(([key, value]) => {
        url.searchParams.set(key, value);
      });
      router.push(url.pathname + url.search);
    } else {
      router.push(route);
    }
  } catch (error) {
    console.error(`[Navigation Error] Vers ${route}:`, error);
  }
};
