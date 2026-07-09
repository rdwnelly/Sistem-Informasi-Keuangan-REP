"use client";
import { useState } from "react";
import Sidebar from "@/components/Sidebar";
import { AuthProvider, useAuth } from "@/context/AuthContext";
import { usePathname } from "next/navigation";
import { Menu } from "lucide-react"; // Menambahkan icon Hamburger
import { useEffect } from "react";

function LayoutWrapper({ children }) {
  const pathname = usePathname();
  const { user, loading } = useAuth();
  // State untuk mengontrol buka/tutup Sidebar di mode Mobile
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [showInstallSuccess, setShowInstallSuccess] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const handleBeforeInstallPrompt = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };

    const handleAppInstalled = () => {
      setDeferredPrompt(null);
      setShowInstallSuccess(true);
      setTimeout(() => setShowInstallSuccess(false), 3000);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    window.addEventListener("appinstalled", handleAppInstalled);

    return () => {
      window.removeEventListener(
        "beforeinstallprompt",
        handleBeforeInstallPrompt,
      );
      window.removeEventListener("appinstalled", handleAppInstalled);
    };
  }, []);

  // Jangan tampilkan navigasi di halaman login
  if (pathname === "/login") {
    return <main className="min-h-screen bg-papua-bg">{children}</main>;
  }

  // Tampilkan loading state saat mengecek auth
  if (loading) {
    return (
      <main className="min-h-screen bg-papua-bg flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-papua-accent/20 border-t-papua-accent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-papua-primary font-medium">Memuat...</p>
        </div>
      </main>
    );
  }

  // Jika belum login, jangan render antarmuka utama (akan di-redirect oleh AuthContext)
  if (!user) return null;

  return (
    <div className="flex min-h-screen bg-papua-bg">
      {/* Overlay Gelap: Muncul di HP saat menu samping terbuka, klik untuk menutup */}
      {isMobileMenuOpen && (
        <div
          className="fixed inset-0 bg-papua-primary-dark/60 backdrop-blur-sm z-40 md:hidden transition-opacity"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar Component: Kita kirim state melalui props */}
      <Sidebar isOpen={isMobileMenuOpen} setIsOpen={setIsMobileMenuOpen} />

      {/* Konten Utama: ml-0 di HP (full), ml-64 di desktop (menyisakan ruang sidebar) */}
      <div className="flex-1 flex flex-col md:ml-64 min-h-screen w-full transition-all duration-300 ease-in-out relative">
        {/* Decorative subtle top border/motif */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-papua-pattern opacity-30 pointer-events-none"></div>
        
        {/* Header Khusus Mobile (Disembunyikan di Desktop) */}
        <header className="bg-papua-bg border-b border-papua-primary/10 p-3 flex items-center justify-between md:hidden sticky top-0 z-30 shadow-sm relative">
          <div className="absolute inset-0 bg-papua-pattern opacity-5 pointer-events-none mix-blend-overlay"></div>
          <div className="flex items-center gap-3 relative z-10">
            <img
              src="/logo.jpg"
              alt="REP Logo"
              className="w-8 h-8 rounded-md object-cover border border-papua-primary/20"
            />
            <span className="font-serif font-bold text-papua-primary text-sm truncate max-w-[160px]">
              Sistem Informasi Keuangan
            </span>
          </div>
          <div className="flex items-center gap-2 relative z-10">
            {deferredPrompt && (
              <button
                onClick={async () => {
                  try {
                    deferredPrompt.prompt();
                    const choice = await deferredPrompt.userChoice;
                    if (choice && choice.outcome === "accepted") {
                      setShowInstallSuccess(true);
                      setTimeout(() => setShowInstallSuccess(false), 3000);
                    }
                    setDeferredPrompt(null);
                  } catch (err) {
                    console.warn("PWA install prompt error:", err);
                  }
                }}
                className="px-3 py-1.5 bg-papua-accent/20 text-papua-primary rounded-md text-sm font-medium hover:bg-papua-accent transition-colors"
              >
                Install
              </button>
            )}

            <button
              onClick={() => setIsMobileMenuOpen(true)}
              className="p-2 bg-white rounded-lg text-papua-primary border border-papua-primary/10 hover:bg-papua-primary/5 transition-colors shadow-sm focus-ring"
            >
              <Menu className="w-6 h-6" />
            </button>
          </div>
        </header>

        {showInstallSuccess && (
          <div className="fixed right-4 top-16 z-50 bg-papua-green text-white px-4 py-2 rounded shadow-md border border-papua-green-light">
            Aplikasi berhasil diinstal
          </div>
        )}

        {/* Area Render Halaman: Padding responsif dan izinkan overflow-x untuk tabel lebar */}
        <main className="flex-1 px-4 sm:px-6 md:px-8 py-4 md:py-6 w-full max-w-full overflow-x-hidden relative z-10">
          {children}
        </main>
      </div>
    </div>
  );
}

export default function ClientLayout({ children }) {
  useEffect(() => {
    if (
      typeof window === "undefined" ||
      process.env.NODE_ENV !== "production" ||
      !("serviceWorker" in navigator)
    )
      return;

    // Register service worker only in production environment.
    const swUrl = "/sw.js";
    navigator.serviceWorker
      .register(swUrl)
      .then((reg) => {
        console.log("Service worker registered:", reg.scope);
      })
      .catch((err) => {
        console.warn("Service worker registration failed:", err);
      });
  }, []);

  return (
    <AuthProvider>
      <LayoutWrapper>{children}</LayoutWrapper>
    </AuthProvider>
  );
}
