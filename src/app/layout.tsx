import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import "./globals.css";
import { ESCUELA_CONFIG } from "@/lib/config";
import { Providers } from "@/components/providers";

const geistSans = localFont({
  src: "./fonts/GeistVF.woff",
  variable: "--font-geist-sans",
  weight: "100 900",
});
const geistMono = localFont({
  src: "./fonts/GeistMonoVF.woff",
  variable: "--font-geist-mono",
  weight: "100 900",
});

const description = "Estudia Secundaria o Preparatoria desde casa. Certificado oficial SEP. Convenio con sindicatos IMSS y Ferrocarrileros. 100% en línea."

export const viewport: Viewport = {
  // Fondo real del sitio (tema claro): landing blanca, auth bg-white y
  // dashboards con theme="light" (#F8FAFB). El #0B0D11 anterior era herencia
  // de la plantilla oscura y pintaba negra la barra del navegador en movil.
  themeColor: "#F8FAFB",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
}

export const metadata: Metadata = {
  title: {
    default: `${ESCUELA_CONFIG.nombre} | Tu Prepa en 6 meses`,
    template: `%s | ${ESCUELA_CONFIG.nombre}`,
  },
  description,
  icons: {
    // Generado desde public/logo.png (recortado y centrado sobre blanco).
    // src/app/favicon.ico lo sirve el App Router en /favicon.ico.
    icon: "/favicon.ico",
    shortcut: "/favicon.ico",
  },
  openGraph: {
    title: ESCUELA_CONFIG.nombre,
    description,
    type: "website",
    locale: "es_MX",
    siteName: ESCUELA_CONFIG.nombre,
  },
  twitter: {
    card: "summary",
    title: ESCUELA_CONFIG.nombre,
    description,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  );
}
