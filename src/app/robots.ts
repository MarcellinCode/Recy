import { MetadataRoute } from 'next'
 
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: [
        '/admin',
        '/city-os',
        '/dashboard',
        '/api',
        '/chat',
        '/missions',
        '/notifications',
        '/reservations',
        '/wallet',
        '/mes-dechets',
        '/profil'
      ],
    },
    sitemap: 'https://www.cleanzone.com/sitemap.xml',
  }
}
