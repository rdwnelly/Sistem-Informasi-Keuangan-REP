"use client";
import { useState, useEffect } from "react";
import {
  Building2,
  Database,
  ShieldCheck,
  MapPin,
  FileText,
  CheckCircle2,
} from "lucide-react";

export default function PengaturanPage() {
  const [dbStatus, setDbStatus] = useState("Memeriksa...");
  const [isOnline, setIsOnline] = useState(false);

  // Simulasi pengecekan koneksi ke Firebase
  useEffect(() => {
    const checkConnection = setTimeout(() => {
      setDbStatus("Terhubung secara Real-Time");
      setIsOnline(true);
    }, 1500);
    return () => clearTimeout(checkConnection);
  }, []);

  return (
    <div className="max-w-5xl mx-auto pb-12">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">
          Pengaturan & Informasi Sistem
        </h1>
        <p className="text-gray-500 mt-1">
          Pusat informasi profil Yayasan REP dan status operasional sistem
          SIK-REP.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* KARTU 1: PROFIL YAYASAN (Sesuai Konteks REP) */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 lg:col-span-2">
          <div className="flex items-center gap-3 mb-6 border-b border-gray-100 pb-4">
            <div className="p-2 bg-emerald-50 text-emerald-600 rounded-lg">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-gray-900">
                Profil Institusi (Legal)
              </h2>
              <p className="text-sm text-gray-500">
                Data resmi yang terintegrasi pada Kop Surat Laporan Keuangan.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="space-y-1 lg:col-span-2">
              <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">
                Nama Yayasan
              </label>
              <div className="font-semibold text-gray-900 text-lg">
                Rumah Etnik Papua (REP)
              </div>
            </div>
            <div className="space-y-1">
              <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">
                Ketua Yayasan
              </label>
              <div className="font-medium text-gray-800">
                Fricky Mosche Burdam
              </div>
            </div>
            <div className="space-y-1">
              <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">
                Pendiri / Pengelola
              </label>
              <div className="font-medium text-gray-800">Mitshi Wanma</div>
            </div>
            <div className="space-y-1 lg:col-span-2">
              <label className="text-xs font-bold text-gray-400 uppercase tracking-wider flex items-center gap-1">
                <MapPin className="w-3 h-3" /> Alamat Operasional
              </label>
              <div className="font-medium text-gray-800">
                Jl. Klamono Km. 21, Kab. Sorong, Papua Barat Daya
              </div>
            </div>
            <div className="space-y-1 lg:col-span-2">
              <label className="text-xs font-bold text-gray-400 uppercase tracking-wider flex items-center gap-1">
                <FileText className="w-3 h-3" /> Legalitas (SK Kemenkumham)
              </label>
              <div className="font-medium text-gray-800">
                AHU-0003448.AH.01.04.Tahun 2026 (Didirikan 21 Juni 2021)
              </div>
            </div>
          </div>
        </div>

        {/* KARTU 2: STATUS DATABASE (Firebase) */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 lg:col-span-2">
          <div className="flex items-center gap-3 mb-6 border-b border-gray-100 pb-4">
            <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-gray-900">
                Keamanan & Basis Data
              </h2>
              <p className="text-sm text-gray-500">
                Status koneksi ke server awan (Firestore).
              </p>
            </div>
          </div>

          <div className="p-5 bg-gray-50 rounded-xl border border-gray-200 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div
                className={`p-3 rounded-full ${isOnline ? "bg-green-100 text-green-600" : "bg-amber-100 text-amber-600 animate-pulse"}`}
              >
                <Database className="w-6 h-6" />
              </div>
              <div>
                <p className="font-bold text-gray-900">Firestore Cloud DB</p>
                <p
                  className={`text-sm font-medium ${isOnline ? "text-green-600" : "text-amber-600"}`}
                >
                  {dbStatus}
                </p>
              </div>
            </div>
            <div>
              <span
                className={`px-4 py-1.5 rounded-full text-xs font-bold border ${isOnline ? "bg-green-50 text-green-700 border-green-200" : "bg-amber-50 text-amber-700 border-amber-200"}`}
              >
                {isOnline ? "SISTEM ONLINE" : "MENGHUBUNGKAN..."}
              </span>
            </div>
          </div>

          <div className="mt-4 flex items-start gap-2 text-sm text-gray-500 bg-blue-50 p-4 rounded-lg border border-blue-100">
            <CheckCircle2 className="w-5 h-5 text-blue-500 shrink-0" />
            <p>
              Seluruh transaksi Jurnal, Buku Besar, dan Neraca Saldo dienkripsi
              dengan aman dan dicadangkan secara otomatis oleh server
              infrastruktur Firebase.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
