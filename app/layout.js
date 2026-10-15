import "./globals.css";

export const metadata = {
  title: "Arconet",
  description: "Arconet",
};

export default function RootLayout({ children }) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  );
}
