import "./globals.css";
import { Inter, Orbitron, Exo_2 } from "next/font/google";
import ThemeToggle from "./theme-toggle";
import { CartProvider } from "./cart-context";
import CartDrawer from "./cart-drawer";
import PageTransition from "./page-transition";
import AppToaster from "./toaster";

export const metadata = {
  title: "Arconet",
  description: "Arconet",
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

const themeScript = `(function(){try{var k='arconet-theme';var s=localStorage.getItem(k);var h=new Date().getHours();var t=(s==='light'||s==='dark')?s:((h>=18||h<6)?'dark':'light');document.documentElement.setAttribute('data-theme',t);document.documentElement.style.colorScheme=t;}catch(e){}})();`;

const bootScript = `(function(){try{var n=performance.getEntriesByType&&performance.getEntriesByType('navigation')[0];if(n&&n.type==='prerender')return;var r=document.documentElement;r.setAttribute('data-boot','cover');setTimeout(function(){r.setAttribute('data-boot','reveal');},700);setTimeout(function(){r.removeAttribute('data-boot');},1500);}catch(e){}})();`;

export default function RootLayout({ children }) {
  return (
    <html
      lang="es"
      suppressHydrationWarning
      className={`${inter.variable} ${orbitron.variable} ${exo2.variable}`}
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
        <script dangerouslySetInnerHTML={{ __html: bootScript }} />
        <link rel="preload" as="image" href="/arconet.png" />
      </head>
      <body>
        <CartProvider>
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
