import type { Metadata } from "next";
import { NavigationWrapper } from "@/components/layout/NavigationWrapper";
import "./globals.css";
import { ToastProvider } from "@/components/ui/toast";

const inter = {
  variable: "font-sans",
};

// --- SHIELD: Immunize against intrusive browser extensions ---
if (typeof globalThis.window !== 'undefined') {
  (globalThis.window as any).watchRouteChange = (globalThis.window as any).watchRouteChange || function() {};
  const originalDefine = customElements.define;
  customElements.define = function(name: string, constructor: any, options?: any) {
    if (name.includes('chat-one') || name.includes('search-side')) {
      console.warn('🛡️ RecyCla Shield: Blocked intrusive extension element:', name);
      return;
    }
    return originalDefine.call(this, name, constructor, options);
  };
}
// -------------------------------------------------------------

export const metadata: Metadata = {
  metadataBase: new URL("https://www.cleanzone.tech"),
  title: {
    default: "CleanZone - Recyclage Intelligent & Valorisation des Déchets en Afrique",
    template: "%s | CleanZone"
  },
  description: "CleanZone (CityCline, CityClean) est la plateforme leader en Côte d'Ivoire pour transformer vos déchets en ressources. Marketplace de collecte, suivi d'impact écologique à Abidjan et partout en Afrique. Gagnez de l'argent en recyclant.",
  manifest: "/manifest.json",
  alternates: {
    canonical: '/',
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  keywords: [
    "CleanZone", 
    "CleanZone", 
    "CityCline", 
    "City Cline", 
    "CityClean", 
    "recyclage Côte d'Ivoire", 
    "gestion déchets Abidjan", 
    "écologie Afrique", 
    "marketplace recyclage", 
    "économie circulaire Afrique", 
    "valorisation déchets",
    "gagner argent recyclage"
  ],
  authors: [{ name: "CleanZone Team" }],
  openGraph: {
    title: "CleanZone - L'Intelligence Urbaine au service du tri en Afrique",
    description: "Vendez vos déchets recyclables à Abidjan, trouvez des points de collecte et suivez votre impact écologique avec CleanZone (CityCline).",
    url: "https://www.cleanzone.tech",
    siteName: "CleanZone",
    images: [
      {
        url: "/logo.png",
        width: 1200,
        height: 630,
        alt: "CleanZone - Intelligence Urbaine",
      },
    ],
    locale: "fr_FR",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "CleanZone (CityCline) - Valorisez vos déchets en Côte d'Ivoire",
    description: "La plateforme citoyenne pour un monde plus propre et plus rentable en Afrique de l'Ouest.",
    images: ["/logo.png"],
  },
  icons: {
    icon: [
      { url: "/logo.png", sizes: "32x32", type: "image/png" },
      { url: "/logo.png", sizes: "192x192", type: "image/png" }
    ],
    shortcut: ["/logo.png"],
    apple: [
      { url: "/logo.png", sizes: "180x180", type: "image/png" }
    ],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr" suppressHydrationWarning>
      <body className={`${inter.variable} font-sans antialiased`}>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify([
              {
                "@context": "https://schema.org",
                "@type": "WebSite",
                "name": "CleanZone",
                "url": "https://www.cleanzone.tech",
                "potentialAction": {
                  "@type": "SearchAction",
                  "target": "https://www.cleanzone.tech/marketplace?search={search_term_string}",
                  "query-input": "required name=search_term_string"
                }
              },
              {
                "@context": "https://schema.org",
                "@type": "Organization",
                "name": "CleanZone",
                "url": "https://www.cleanzone.tech",
                "logo": "https://www.cleanzone.tech/logo.png",
                "description": "Plateforme d'intelligence urbaine pour la gestion et la valorisation des déchets recyclables.",
                "sameAs": [
                  "https://twitter.com/cleanzone",
                  "https://linkedin.com/company/cleanzone"
                ]
              }
            ])
          }}
        />
        <ToastProvider />
        <NavigationWrapper>
            {children}
        </NavigationWrapper>
      </body>
    </html>
  );
}
