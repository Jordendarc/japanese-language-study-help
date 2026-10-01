import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { AuthProvider } from "./contexts/AuthContext";
import Navigation from "./components/Navigation";
import { SITE_DESCRIPTION, SITE_NAME, SITE_TITLE, SITE_URL } from "./utils/site";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: SITE_TITLE,
    template: `%s | ${SITE_NAME}`,
  },
  description: SITE_DESCRIPTION,
  applicationName: SITE_NAME,
  keywords: [
    "Japanese flashcards",
    "Japanese vocabulary",
    "Japanese grammar",
    "kanji dictionary",
    "JLPT N3",
    "intermediate Japanese",
    "Dekiru Nihongo",
    "Manabou Nihongo",
    "spaced repetition",
    "kanji reading test",
  ],
  openGraph: {
    type: "website",
    siteName: SITE_NAME,
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
    url: "/",
    locale: "en_US",
  },
  twitter: {
    card: "summary_large_image",
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
  },
  robots: { index: true, follow: true },
};

export const viewport: Viewport = {
  themeColor: "#14161c",
};

// Applies the saved theme before first paint so there's no flash of the wrong one.
// Keep in sync with ThemeToggle.tsx (storage key "theme", values "night" | "day").
const themeScript = `try{var t=localStorage.getItem('theme');if(t==='day'||t==='night'){document.documentElement.dataset.theme=t;if(t==='day'){var m=document.querySelector('meta[name="theme-color"]');if(m)m.setAttribute('content','#f6f1e7')}}}catch(e){}`;

const structuredData = {
  "@context": "https://schema.org",
  "@type": "WebApplication",
  name: SITE_NAME,
  url: SITE_URL,
  description: SITE_DESCRIPTION,
  applicationCategory: "EducationalApplication",
  operatingSystem: "Any",
  inLanguage: "en",
  offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    // lang="ja" makes browsers pick Japanese glyph variants for kanji that Chinese and Japanese share
    <html
      lang="ja"
      data-theme="night"
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className="min-h-full flex flex-col">
        <AuthProvider>
          <Navigation />
          {children}
        </AuthProvider>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
        />
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}
