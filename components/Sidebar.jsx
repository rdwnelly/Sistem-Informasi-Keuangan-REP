'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { 
  LayoutDashboard, 
  BookOpen, 
  Wallet, 
  Store, 
  Coffee, 
  Shirt, 
  Home,
  Settings,
  LogOut
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function Sidebar() {
  const pathname = usePathname();
  const { logout } = useAuth();

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
    <aside className="w-64 bg-white border-r border-gray-100 h-screen fixed left-0 top-0 flex flex-col">
      <div className="p-6 border-b border-gray-100">
        <h1 className="text-xl font-bold text-gray-800 tracking-tight">SIK-REP</h1>
        <p className="text-xs text-gray-500 mt-1">Yayasan Rumah Etnik Papua</p>
      </div>

      <div className="flex-1 overflow-y-auto py-4 px-3 space-y-6">
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

      <div className="p-4 border-t border-gray-100 flex flex-col gap-1">
        <Link href="/pengaturan" className={baseClass + "text-gray-600 hover:bg-gray-50 hover:text-gray-900"}>
          <Settings className="w-5 h-5" />
          Pengaturan Sistem
        </Link>
        <button 
          onClick={logout}
          className={baseClass + "w-full text-left text-red-600 hover:bg-red-50 hover:text-red-700"}
        >
          <LogOut className="w-5 h-5" />
          Keluar
        </button>
      </div>
    </aside>
  );
}