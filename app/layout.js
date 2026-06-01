import "./globals.css";
import ClientLayout from "@/components/ClientLayout";

export const metadata = {
  title: "Sistem Informasi Keuangan REP | Sistem Informasi Keuangan",
  description: "Sistem Informasi Keuangan Yayasan Rumah Etnik Papua",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Sistem Informasi Keuangan REP",
  },
  formatDetection: {
    telephone: false,
  },
};

export const viewport = {
  themeColor: "#ffffff",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({ children }) {
  return (
    <html lang="id">
      <head>
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#2563eb" />
        <link rel="apple-touch-icon" href="/icons/icon-192x192.png" />
      </head>
      <body className="bg-gray-50 text-gray-900 font-sans antialiased">
        <ClientLayout>{children}</ClientLayout>
      </body>
    </html>
  );
}
