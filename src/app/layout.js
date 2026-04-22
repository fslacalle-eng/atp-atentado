import "./globals.css";

export const metadata = {
  title: "ATP Atentado — The Championships",
  description: "Liga de tenis amateur con sistema de puntos, torneos y retos",
  manifest: "/manifest.json",
  icons: {
    icon: [
      { url: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [{ url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" }],
  },
  appleWebApp: {
    capable: true,
    title: "ATP Atentado",
    statusBarStyle: "black-translucent",
  },
};

export const viewport = {
  themeColor: "#0d1b0d",
};

export default function RootLayout({ children }) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  );
}
