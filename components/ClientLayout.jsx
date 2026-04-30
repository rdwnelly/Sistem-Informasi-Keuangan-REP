'use client';
import Sidebar from '@/components/Sidebar';
import { AuthProvider, useAuth } from '@/context/AuthContext';
import { usePathname } from 'next/navigation';

function LayoutWrapper({ children }) {
  const pathname = usePathname();
  const { user } = useAuth();

  // Jangan tampilkan sidebar di halaman login
  if (pathname === '/login') {
    return <main className="min-h-screen bg-gray-50">{children}</main>;
  }

  // Jika belum login, jangan render antarmuka utama (AuthContext akan menangani redirect)
  if (!user) return null;

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <main className="flex-1 ml-64 p-8">
        {children}
      </main>
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