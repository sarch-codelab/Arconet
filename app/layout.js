import "./globals.css";
import localFont from "next/font/local";
import ThemeToggle from "./theme-toggle";
import { CartProvider } from "./cart-context";
import CartDrawer from "./cart-drawer";
import PageTransition from "./page-transition";
import AppToaster from "./toaster";
import DocumentPreview from "./document-preview";
import ThemeInit from "./theme-init";
import { ContactProvider } from "./contact-provider";
import { CONTACT_EMAIL, CONTACT_PHONE, CONTACT_PHONE_HREF } from "@/lib/contact";

export const metadata = {
  metadataBase: new URL(process.env.APP_ORIGIN || "https://arconethn.com"),
  applicationName: "Arconet",
  appleWebApp: {
    capable: true,
    title: "Arconet",
    statusBarStyle: "default",
  },
  title: {
    default: "Arconet | Fibra óptica y telecomunicaciones en Honduras",
    template: "%s | Arconet",
  },
  description:
    "Arconet diseña e instala soluciones de fibra óptica, CATV y telecomunicaciones en San Pedro Sula y toda Honduras. Conectividad que acerca.",
  keywords: [
    "Arconet",
    "fibra óptica",
    "CATV",
    "telecomunicaciones",
    "Honduras",
    "San Pedro Sula",
    "redes",
    "internet",
  ],
  openGraph: {
    type: "website",
    locale: "es_HN",
    url: process.env.APP_ORIGIN || "https://arconethn.com",
    siteName: "Arconet",
    title: "Arconet | Fibra óptica y telecomunicaciones en Honduras",
    description:
      "Soluciones de fibra óptica, CATV y telecomunicaciones en San Pedro Sula y toda Honduras. Conectividad que acerca.",
    images: [
      {
        url: "/arconet.png",
        width: 2172,
        height: 362,
        alt: "Arconet",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Arconet | Fibra óptica y telecomunicaciones en Honduras",
    description:
      "Soluciones de fibra óptica, CATV y telecomunicaciones en San Pedro Sula y toda Honduras.",
    images: ["/arconet.png"],
  },
  manifest: "/manifest.webmanifest",
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#1544b5",
};

const inter = localFont({
  src: "./fonts/inter-latin-wght-normal.woff2",
  weight: "100 900",
  display: "swap",
  variable: "--font-body",
});

const orbitron = localFont({
  src: "./fonts/orbitron-latin-wght-normal.woff2",
  weight: "400 900",
  display: "swap",
  variable: "--font-display",
});

const exo2 = localFont({
  src: [
    { path: "./fonts/exo-2-latin-wght-normal.woff2", weight: "100 900", style: "normal" },
    { path: "./fonts/exo-2-latin-wght-italic.woff2", weight: "100 900", style: "italic" },
  ],
  display: "swap",
  variable: "--font-heading",
});

export default function RootLayout({ children }) {
  return (
    <html
      lang="es"
      suppressHydrationWarning
      className={`${inter.variable} ${orbitron.variable} ${exo2.variable}`}
    >
      <head>
        <link rel="preload" as="image" href="/arconet.png" />
      </head>
      <body>
        <ContactProvider contact={{ email: CONTACT_EMAIL, phone: CONTACT_PHONE, phoneHref: CONTACT_PHONE_HREF }}>
          <CartProvider>
            <ThemeInit />
            {children}
            <ThemeToggle />
            <CartDrawer />
            <PageTransition />
            <AppToaster />
            <DocumentPreview />
          </CartProvider>
        </ContactProvider>
      </body>
    </html>
  );
}
