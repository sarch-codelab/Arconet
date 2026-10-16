import "./globals.css";
import { Inter, Orbitron, Exo_2 } from "next/font/google";
import ThemeToggle from "./theme-toggle";

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
  variable: "--font-heading",
});

const themeScript = `(function(){try{var k='arconet-theme';var s=localStorage.getItem(k);var h=new Date().getHours();var t=(s==='light'||s==='dark')?s:((h>=18||h<6)?'dark':'light');document.documentElement.setAttribute('data-theme',t);document.documentElement.style.colorScheme=t;}catch(e){}})();`;

export default function RootLayout({ children }) {
  return (
    <html
      lang="es"
      suppressHydrationWarning
      className={`${inter.variable} ${orbitron.variable} ${exo2.variable}`}
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body>
        {children}
        <ThemeToggle />
      </body>
    </html>
  );
}
