export const ROUTES = {
  HOME: '/',
  MARKETPLACE: '/marketplace',
  MARKETPLACE_DETAILS: (id: string) => `/marketplace/${id}`,
  MARKETPLACE_PUBLISH: '/marketplace/publish',
  
  WALLET: '/wallet',
  PROFILE: '/profil',
  PROFILE_INFOS: '/profil/informations',
  PROFILE_SECURITY: '/profil/securite',
  PROFILE_SETTINGS: '/profil/parametres',
  PROFILE_HELP: '/profil/aide',
  
  ABONNEMENTS: '/abonnements',
  CARTE: '/carte',
  MES_DECHETS: '/mes-dechets',
  RESERVATIONS: '/reservations',
  
  CONNEXION: '/connexion',
  INSCRIPTION: '/inscription',
  
  CHAT: '/chat',
  CHAT_DETAILS: (id: string) => `/chat?wasteId=${id}`,
  
  NOTIFICATIONS: '/notifications',
  ESPACE: '/espace',
  FLOTTE: '/flotte',
} as const;

export type AppRoute = Extract<typeof ROUTES[keyof typeof ROUTES], string> | (string & {});
