import { MetadataRoute } from 'next'
 
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: ['/admin/', '/dashboard/', '/profil/', '/chat/', '/wallet/'],
    },
    sitemap: 'https://www.citicline.com/sitemap.xml',
  }
}
