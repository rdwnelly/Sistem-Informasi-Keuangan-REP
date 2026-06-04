"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { useEffect, useRef } from "react";
import {
  LayoutDashboard,
  BookOpen,
  Book,
  Scale,
  TrendingUp,
  Users,
  WalletCards,
  FileText,
  Coffee,
  ShoppingBag,
  Shirt,
  Home,
  Store,
  Wallet,
  Settings,
  LogOut,
  X,
} from "lucide-react";

export default function Sidebar({ isOpen, setIsOpen }) {
  const pathname = usePathname();
  const { logout } = useAuth();

  // Ref ke tombol tutup supaya dapat difokuskan saat sidebar dibuka
  const closeBtnRef = useRef(null);

  // Otomatis menutup sidebar di HP setiap kali user mengklik menu/berpindah halaman
  useEffect(() => {
    if (setIsOpen) setIsOpen(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  // Kunci scroll body dan fokuskan tombol tutup saat sidebar mobile terbuka
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (isOpen) {
      document.body.style.overflow = "hidden";
      // fokus ke tombol tutup agar keyboard users bisa langsung menutup
      closeBtnRef.current?.focus();
    } else {
      document.body.style.overflow = "";
    }

    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  const menuGroups = [
    {
      title: "AKUNTANSI & KEUANGAN",
      menus: [
        { name: "Dashboard", path: "/", icon: LayoutDashboard },
        { name: "Analitik Visual", path: "/analitik", icon: LayoutDashboard },
        { name: "Jurnal Umum", path: "/jurnal", icon: BookOpen },
        { name: "Buku Besar", path: "/buku-besar", icon: Book },
        { name: "Neraca Saldo", path: "/neraca", icon: Scale },
        { name: "Buku Piutang", path: "/piutang", icon: BookOpen },
        { name: "Laba Rugi", path: "/laba-rugi", icon: TrendingUp },
        { name: "Laporan Keuangan", path: "/laporan-keuangan", icon: Wallet },
      ],
    },
    {
      title: "SDM & PENGGAJIAN",
      menus: [
        { name: "Data Karyawan", path: "/karyawan", icon: Users },
        { name: "Catatan Panjar", path: "/panjar", icon: WalletCards },
        { name: "Rekapan & Slip Gaji", path: "/rekapan-gaji", icon: FileText },
      ],
    },
    {
      title: "UNIT USAHA",
      menus: [
        { name: "Yaswar Cafe", path: "/unit/cafe", icon: Coffee },
        { name: "Toko Sovenir", path: "/unit/sovenir", icon: ShoppingBag },
        {
          name: "Penyewaan Kostum",
          path: "/unit/kostum",
          icon: Shirt,
        },
        {
          name: "Homestay REP",
          path: "/unit/homestay",
          icon: Home,
        },
        { name: "Kios", path: "/unit/kios", icon: Store },
      ],
    },
  ];

  const baseClass =
    "flex items-center gap-3 px-4 py-3 rounded-lg transition-colors text-sm font-medium ";

  return (
    <>
      {/* Overlay for mobile when sidebar is open */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/40 z-40 md:hidden"
          onClick={() => setIsOpen && setIsOpen(false)}
          aria-hidden="true"
        />
      )}

      <aside
        role="dialog"
        aria-modal={isOpen}
        aria-hidden={!isOpen}
        className={`
          w-[min(16rem,80vw)] md:w-64 bg-white border-r border-gray-100 h-screen fixed left-0 top-0 flex flex-col z-50
          transform transition-transform duration-300 ease-in-out shadow-xl md:shadow-none
          ${isOpen ? "translate-x-0" : "-translate-x-full"} 
          md:translate-x-0
        `}
      >
        <div className="p-6 border-b border-gray-100 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <img
              src="/logo.jpg"
              alt="REP Logo"
              className="w-10 h-10 rounded-md object-cover"
            />
            <div>
              <h1 className="text-xl font-bold text-gray-800 tracking-tight">
                Sistem Informasi Keuangan REP
              </h1>
              <p className="text-xs text-gray-500 mt-1">
                Yayasan Rumah Etnik Papua
              </p>
            </div>
          </div>

          {/* Tombol Tutup Sidebar Khusus Layar HP */}
          <button
            ref={closeBtnRef}
            onClick={() => setIsOpen && setIsOpen(false)}
            aria-label="Tutup menu"
            className="md:hidden p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-700 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto py-4 px-3 space-y-6 scrollbar-hide">
          {menuGroups.map((group, index) => (
            <div key={index}>
              <p className="px-4 text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
                {group.title}
              </p>
              <ul className="space-y-1">
                {group.menus.map((item) => {
                  const isActive = pathname === item.path;
                  return (
                    <li key={item.name}>
                      <Link
                        href={item.path}
                        className={
                          baseClass +
                          (isActive
                            ? "bg-blue-50 text-blue-700"
                            : "text-gray-600 hover:bg-gray-50 hover:text-gray-900")
                        }
                      >
                        <item.icon className="w-5 h-5" />
                        {item.name}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </div>

        <div className="p-4 border-t border-gray-100">
          <Link
            href="/pengaturan"
            className={
              baseClass + "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
            }
          >
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
    </>
  );
}
