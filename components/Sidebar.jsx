'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { useEffect } from 'react';
import { 
  LayoutDashboard, 
  BookOpen, 
  Wallet, 
  Store, 
  Coffee, 
  Shirt, 
  Home,
  Settings,
  LogOut,
  X // Tambahkan ikon silang (close)
} from 'lucide-react';

export default function Sidebar({ isOpen, setIsOpen }) {
  const pathname = usePathname();
  const { logout } = useAuth();

  // Otomatis menutup sidebar di HP setiap kali user mengklik menu/berpindah halaman
  useEffect(() => {
    if (setIsOpen) setIsOpen(false);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  const menuItems = [
    { name: 'Dashboard Utama', path: '/', icon: LayoutDashboard },
    { name: 'Jurnal Umum', path: '/jurnal', icon: BookOpen },
    { name: 'Buku Besar', path: '/buku-besar', icon: Wallet },
    { name: 'Laba Rugi', path: '/laba-rugi', icon: BookOpen },
    { name: 'Neraca Saldo', path: '/neraca', icon: BookOpen },
  ];

  const unitUsaha = [
    { name: 'Yaswar Cafe', path: '/unit/cafe', icon: Coffee },
    { name: 'Toko Sovenir', path: '/unit/sovenir', icon: Store },
    { name: 'Penyewaan Kostum', path: '/unit/kostum', icon: Shirt },
    { name: 'Homestay REP', path: '/unit/homestay', icon: Home },
    { name: 'Kios', path: '/unit/kios', icon: Store },
  ];

  const baseClass = "flex items-center gap-3 px-4 py-3 rounded-lg transition-colors text-sm font-medium ";

  return (
    <aside 
      className={`
        w-64 bg-white border-r border-gray-100 h-screen fixed left-0 top-0 flex flex-col z-50
        transform transition-transform duration-300 ease-in-out shadow-xl md:shadow-none
        ${isOpen ? 'translate-x-0' : '-translate-x-full'} 
        md:translate-x-0
      `}
    >
      <div className="p-6 border-b border-gray-100 flex justify-between items-center">
        <div>
          <h1 className="text-xl font-bold text-gray-800 tracking-tight">SIK-REP</h1>
          <p className="text-xs text-gray-500 mt-1">Yayasan Rumah Etnik Papua</p>
        </div>
        
        {/* Tombol Tutup Sidebar Khusus Layar HP */}
        <button 
          onClick={() => setIsOpen(false)} 
          className="md:hidden p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-700 rounded-lg transition-colors"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto py-4 px-3 space-y-6 scrollbar-hide">
        <div>
          <p className="px-4 text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Akuntansi</p>
          <ul className="space-y-1">
            {menuItems.map((item) => {
              const isActive = pathname === item.path;
              return (
                <li key={item.name}>
                  <Link href={item.path} className={baseClass + (isActive ? "bg-blue-50 text-blue-700" : "text-gray-600 hover:bg-gray-50 hover:text-gray-900")}>
                    <item.icon className="w-5 h-5" />
                    {item.name}
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>

        <div>
          <p className="px-4 text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Unit Usaha</p>
          <ul className="space-y-1">
            {unitUsaha.map((item) => {
              const isActive = pathname === item.path;
              return (
                <li key={item.name}>
                  <Link href={item.path} className={baseClass + (isActive ? "bg-blue-50 text-blue-700" : "text-gray-600 hover:bg-gray-50 hover:text-gray-900")}>
                    <item.icon className="w-5 h-5" />
                    {item.name}
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      </div>

      <div className="p-4 border-t border-gray-100">
        <Link href="/pengaturan" className={baseClass + "text-gray-600 hover:bg-gray-50 hover:text-gray-900"}>
          <Settings className="w-5 h-5" />
          Pengaturan Sistem
        </Link>
        <button 
          onClick={logout} 
          className="w-full mt-2 flex items-center gap-3 px-4 py-3 rounded-lg transition-colors text-sm font-medium text-red-600 hover:bg-red-50"
        >
          <LogOut className="w-5 h-5" />
          Keluar Sistem
        </button>
      </div>
    </aside>
  );
}