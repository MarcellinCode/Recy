export const ROUTES = {
  HOME: '/',
  MARKETPLACE: '/marketplace',
  MARKETPLACE_DETAILS: (id: string) => `/marketplace/${id}`,
  MARKETPLACE_PUBLISH: '/marketplace/publish',
  
  WALLET: '/wallet',
  PROFILE: '/profil',
  CARTE: '/carte',
  MES_DECHETS: '/mes-dechets',
  RESERVATIONS: '/reservations',
  
  CONNEXION: '/connexion',
  INSCRIPTION: '/inscription',
  
  CHAT: '/chat',
  CHAT_DETAILS: (id: string) => `/chat?wasteId=${id}`,
} as const;

export type AppRoute = typeof ROUTES[keyof typeof ROUTES] | string;
