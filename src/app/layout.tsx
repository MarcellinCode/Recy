import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { NavigationWrapper } from "@/components/layout/NavigationWrapper";
import "./globals.css";
import { ToastProvider } from "@/components/ui/toast";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL("https://www.citicline.com"),
  title: {
    default: "CITICLINE - Valorisez vos déchets recyclables & Gagnez de l'argent",
    template: "%s | CITICLINE"
  },
  description: "Rejoignez l'intelligence urbaine. CITICLINE transforme vos déchets en ressources. Marketplace de collecte, suivi d'impact écologique et paiements sécurisés.",
  manifest: "/manifest.json",
  keywords: ["recyclage", "écologie", "déchets", "marketplace", "économie circulaire", "CITICLINE", "city clean"],
  authors: [{ name: "CITICLINE Team" }],
  openGraph: {
    title: "CITICLINE - L'Intelligence Urbaine au service du tri",
    description: "Vendez vos déchets recyclables, trouvez des points de collecte et suivez votre impact sur l'environnement.",
    url: "https://www.citicline.com",
    siteName: "CITICLINE",
    images: [
      {
        url: "/logo.png",
        width: 1200,
        height: 630,
        alt: "CITICLINE Logo",
      },
    ],
    locale: "fr_FR",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "CITICLINE - Valorisez vos déchets",
    description: "La plateforme citoyenne pour un monde plus propre et plus rentable.",
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
        <ToastProvider />
        <NavigationWrapper>
            {children}
        </NavigationWrapper>
      </body>
    </html>
  );
}
