'use client';
import { useState } from 'react';
import Sidebar from '@/components/Sidebar';
import { AuthProvider, useAuth } from '@/context/AuthContext';
import { usePathname } from 'next/navigation';
import { Menu } from 'lucide-react'; // Menambahkan icon Hamburger

function LayoutWrapper({ children }) {
  const pathname = usePathname();
  const { user } = useAuth();
  // State untuk mengontrol buka/tutup Sidebar di mode Mobile
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Jangan tampilkan navigasi di halaman login
  if (pathname === '/login') {
    return <main className="min-h-screen bg-gray-50">{children}</main>;
  }

  // Jika belum login, jangan render antarmuka utama
  if (!user) return null;

  return (
    <div className="flex min-h-screen bg-gray-50 overflow-hidden">
      
      {/* Overlay Gelap: Muncul di HP saat menu samping terbuka, klik untuk menutup */}
      {isMobileMenuOpen && (
        <div 
          className="fixed inset-0 bg-gray-900/50 z-40 md:hidden transition-opacity"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar Component: Kita kirim state melalui props */}
      <Sidebar isOpen={isMobileMenuOpen} setIsOpen={setIsMobileMenuOpen} />

      {/* Konten Utama: ml-0 di HP (full), ml-64 di desktop (menyisakan ruang sidebar) */}
      <div className="flex-1 flex flex-col md:ml-64 min-h-screen w-full transition-all duration-300 ease-in-out">
        
        {/* Header Khusus Mobile (Disembunyikan di Desktop) */}
        <header className="bg-white border-b border-gray-200 p-4 flex items-center justify-between md:hidden sticky top-0 z-30 shadow-sm">
          <div className="flex items-center gap-2">
            <span className="font-bold text-gray-900 text-lg">SIK-REP</span>
          </div>
          <button 
            onClick={() => setIsMobileMenuOpen(true)}
            className="p-2 bg-gray-50 rounded-lg text-gray-600 hover:bg-gray-100 hover:text-gray-900 transition-colors"
          >
            <Menu className="w-6 h-6" />
          </button>
        </header>

        {/* Area Render Halaman: Padding dikecilkan (p-4) untuk HP, dibesarkan (md:p-8) untuk desktop */}
        <main className="flex-1 p-4 md:p-8 overflow-x-hidden w-full max-w-[100vw]">
          {children}
        </main>

      </div>
    </div>
  );
}

export default function ClientLayout({ children }) {
  return (
    <AuthProvider>
      <LayoutWrapper>{children}</LayoutWrapper>
    </AuthProvider>
  );
}