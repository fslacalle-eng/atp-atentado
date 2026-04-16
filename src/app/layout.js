import "./globals.css";

export const metadata = {
  title: "ATP Atentado — The Championships",
  description: "Liga de tenis amateur con sistema de puntos, torneos y retos",
};

export default function RootLayout({ children }) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  );
}
