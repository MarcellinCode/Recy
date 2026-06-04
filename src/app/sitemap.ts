import { MetadataRoute } from 'next'
import { createClient } from '@/lib/supabase-server'
 
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = 'https://www.cleanzone.com'
  
  // Base routes
  const routes = [
    {
      url: baseUrl,
      lastModified: new Date(),
      changeFrequency: 'daily' as const,
      priority: 1,
    },
    {
      url: `${baseUrl}/marketplace`,
      lastModified: new Date(),
      changeFrequency: 'always' as const,
      priority: 0.8,
    },
    {
      url: `${baseUrl}/inscription`,
      lastModified: new Date(),
      changeFrequency: 'monthly' as const,
      priority: 0.5,
    },
    {
      url: `${baseUrl}/connexion`,
      lastModified: new Date(),
      changeFrequency: 'monthly' as const,
      priority: 0.5,
    },
  ]

  try {
    const supabase = await createClient()
    const { data: mairies } = await supabase
      .from('profiles')
      .select('id')
      .eq('role', 'mairie')

    if (mairies) {
      const mairieRoutes = mairies.map((mairie) => ({
        url: `${baseUrl}/mairie/${mairie.id}`,
        lastModified: new Date(),
        changeFrequency: 'weekly' as const,
        priority: 0.7,
      }))
      return [...routes, ...mairieRoutes]
    }
  } catch (error) {
    console.error('Sitemap generation error:', error)
  }

  return routes
}
