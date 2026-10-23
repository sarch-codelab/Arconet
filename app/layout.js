import "./globals.css";
import { Inter, Orbitron, Exo_2 } from "next/font/google";
import ThemeToggle from "./theme-toggle";
import { CartProvider } from "./cart-context";
import CartDrawer from "./cart-drawer";
import PageTransition from "./page-transition";
import AppToaster from "./toaster";
import ThemeInit from "./theme-init";

export const metadata = {
  metadataBase: new URL("https://arconethn.com"),
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
    url: "https://arconethn.com",
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
  icons: {
    icon: "/icon.png",
  },
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

const inter = Inter({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-body",
});

const orbitron = Orbitron({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-display",
});

const exo2 = Exo_2({
  subsets: ["latin"],
  display: "swap",
  style: ["normal", "italic"],
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
        <CartProvider>
          <ThemeInit />
          {children}
          <ThemeToggle />
          <CartDrawer />
          <PageTransition />
          <AppToaster />
        </CartProvider>
      </body>
    </html>
  );
}
