"use client";
import { useState, useEffect, useCallback } from "react";
import { collection, getDocs, query, orderBy } from "firebase/firestore";
import { db } from "@/lib/firebase";
import {
  Wallet,
  TrendingUp,
  TrendingDown,
  Activity,
  RefreshCw,
  ArrowRight,
} from "lucide-react";
import Link from "next/link";

export default function Dashboard() {
  const [riwayat, setRiwayat] = useState([]);
  const [stats, setStats] = useState({
    totalKas: 0,
    pendapatanBulanIni: 0,
    biayaBulanIni: 0,
  });
  const [loading, setLoading] = useState(true);

  const fetchDashboardData = useCallback(async () => {
    setLoading(true);
    try {
      // 1. Ambil Peta Tipe Akun (Hanya untuk referensi Pendapatan/Biaya)
      const akunSnap = await getDocs(collection(db, "akun"));
      const mapAkun = {};
      akunSnap.forEach((doc) => {
        mapAkun[doc.data().nama] = doc.data().tipe;
      });

      // 2. Ambil SELURUH Riwayat Jurnal secara descending (terbaru ke terlama)
      // Kita tidak lagi menggunakan limit(10) di query agar bisa menghitung Total Kas dari awal
      const qJurnal = query(
        collection(db, "jurnal"),
        orderBy("timestamp", "desc"),
      );
      const jurnalSnap = await getDocs(qJurnal);

      const dataRiwayat = [];
      let totalKasSementara = 0;
      let totalPendapatan = 0;
      let totalBiaya = 0;

      const currentMonth = new Date().getMonth();
      const currentYear = new Date().getFullYear();

      // 3. Kalkulasi Agregasi Dinamis (Real-Time Accounting Engine)
      jurnalSnap.forEach((doc) => {
        const trx = { id: doc.id, ...doc.data() };
        dataRiwayat.push(trx); // Masukkan ke memori untuk tabel

        const nominal = Number(trx.nominal) || 0;

        // --- MENGHITUNG TOTAL KAS SECARA DINAMIS ---
        // Jika KAS ada di Debit, saldo bertambah (Normal Balance Aset)
        if (trx.akunDebit && trx.akunDebit.nama.toUpperCase().includes("KAS")) {
          totalKasSementara += nominal;
        }
        // Jika KAS ada di Kredit, saldo berkurang
        if (
          trx.akunKredit &&
          trx.akunKredit.nama.toUpperCase().includes("KAS")
        ) {
          totalKasSementara -= nominal;
        }

        // --- MENGHITUNG METRIK BULAN BERJALAN ---
        const trxDate = new Date(trx.tanggal);
        if (
          trxDate.getMonth() === currentMonth &&
          trxDate.getFullYear() === currentYear
        ) {
          // Pendapatan bertambah di sisi Kredit
          if (trx.akunKredit && mapAkun[trx.akunKredit.nama] === "Pendapatan") {
            totalPendapatan += nominal;
          }
          // Biaya bertambah di sisi Debit
          if (trx.akunDebit && mapAkun[trx.akunDebit.nama] === "Biaya") {
            totalBiaya += nominal;
          }
        }
      });

      // 4. Update State antarmuka (Potong array riwayat hanya 10 teratas untuk tabel)
      setRiwayat(dataRiwayat.slice(0, 10));
      setStats({
        totalKas: totalKasSementara,
        pendapatanBulanIni: totalPendapatan,
        biayaBulanIni: totalBiaya,
      });
    } catch (error) {
      console.error("Gagal memuat data dashboard:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  const formatRupiah = (angka) =>
    new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      minimumFractionDigits: 0,
    }).format(angka);
  const formatTanggal = (tgl) =>
    new Date(tgl).toLocaleDateString("id-ID", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });

  return (
    <div className="max-w-6xl mx-auto pb-12">
      <div className="flex justify-between items-end mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dashboard Utama</h1>
          <p className="text-gray-500 mt-1">
            Ringkasan performa keuangan Yayasan Rumah Etnik Papua.
          </p>
        </div>
        <button
          onClick={fetchDashboardData}
          disabled={loading}
          className="flex items-center gap-2 bg-white hover:bg-gray-50 text-gray-700 px-4 py-2 rounded-lg text-sm font-medium transition-colors border border-gray-200 shadow-sm disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          Segarkan Data
        </button>
      </div>

      {/* METRIK KEUANGAN */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        {/* KARTU 1: SALDO KAS */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 relative overflow-hidden">
          <div className="absolute right-0 top-0 opacity-5">
            <Wallet className="w-32 h-32 -mt-4 -mr-4" />
          </div>
          <div className="flex items-center gap-3 mb-4 relative z-10">
            <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
              <Wallet className="w-5 h-5" />
            </div>
            <h2 className="text-sm font-bold text-gray-500 uppercase tracking-wider">
              Total Kas Aktif
            </h2>
          </div>
          {loading ? (
            <div className="h-9 bg-gray-200 rounded animate-pulse w-3/4 mt-1 relative z-10"></div>
          ) : (
            <p className="text-3xl font-bold text-gray-900 relative z-10">
              {formatRupiah(stats.totalKas)}
            </p>
          )}
        </div>

        {/* KARTU 2: PENDAPATAN */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 relative overflow-hidden">
          <div className="absolute right-0 top-0 opacity-5">
            <TrendingUp className="w-32 h-32 -mt-4 -mr-4" />
          </div>
          <div className="flex items-center gap-3 mb-4 relative z-10">
            <div className="p-2 bg-emerald-50 text-emerald-600 rounded-lg">
              <TrendingUp className="w-5 h-5" />
            </div>
            <h2 className="text-sm font-bold text-gray-500 uppercase tracking-wider">
              Pendapatan Bulan Ini
            </h2>
          </div>
          {loading ? (
            <div className="h-9 bg-gray-200 rounded animate-pulse w-3/4 mt-1 relative z-10"></div>
          ) : (
            <p className="text-3xl font-bold text-gray-900 relative z-10">
              {formatRupiah(stats.pendapatanBulanIni)}
            </p>
          )}
        </div>

        {/* KARTU 3: BIAYA */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 relative overflow-hidden">
          <div className="absolute right-0 top-0 opacity-5">
            <TrendingDown className="w-32 h-32 -mt-4 -mr-4" />
          </div>
          <div className="flex items-center gap-3 mb-4 relative z-10">
            <div className="p-2 bg-red-50 text-red-600 rounded-lg">
              <TrendingDown className="w-5 h-5" />
            </div>
            <h2 className="text-sm font-bold text-gray-500 uppercase tracking-wider">
              Pengeluaran Bulan Ini
            </h2>
          </div>
          {loading ? (
            <div className="h-9 bg-gray-200 rounded animate-pulse w-3/4 mt-1 relative z-10"></div>
          ) : (
            <p className="text-3xl font-bold text-gray-900 relative z-10">
              {formatRupiah(stats.biayaBulanIni)}
            </p>
          )}
        </div>
      </div>

      {/* TABEL RIWAYAT TRANSAKSI TERBARU */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
          <div className="flex items-center gap-2">
            <Activity className="w-5 h-5 text-gray-400" />
            <h2 className="text-lg font-bold text-gray-900">
              10 Transaksi Terakhir
            </h2>
          </div>
          <Link
            href="/jurnal"
            className="text-sm font-medium text-blue-600 hover:text-blue-700 flex items-center gap-1 transition-colors"
          >
            Lihat Semua Jurnal <ArrowRight className="w-4 h-4" />
          </Link>
        </div>

        <div className="overflow-x-auto">
          {loading ? (
            <div className="flex justify-center p-12">
              <RefreshCw className="w-6 h-6 text-blue-500 animate-spin" />
            </div>
          ) : (
            <table className="w-full text-left text-sm">
              <thead className="bg-white text-gray-600 font-medium border-b border-gray-100">
                <tr>
                  <th className="px-6 py-4">Tanggal</th>
                  <th className="px-6 py-4">Keterangan</th>
                  <th className="px-6 py-4">Debit</th>
                  <th className="px-6 py-4">Kredit</th>
                  <th className="px-6 py-4 text-right">Nominal (Rp)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {riwayat.length > 0 ? (
                  riwayat.map((trx) => (
                    <tr
                      key={trx.id}
                      className="hover:bg-gray-50 transition-colors"
                    >
                      <td className="px-6 py-4 text-gray-500 whitespace-nowrap">
                        {formatTanggal(trx.tanggal)}
                      </td>
                      <td className="px-6 py-4">
                        <p className="font-medium text-gray-900">
                          {trx.keterangan}
                        </p>
                        {trx.isSingleEntry && (
                          <span className="inline-block mt-1 px-2 py-0.5 bg-indigo-100 text-indigo-700 text-[10px] font-bold rounded">
                            SINGLE-ENTRY
                          </span>
                        )}
                      </td>

                      <td className="px-6 py-4">
                        {trx.akunDebit ? (
                          <span className="bg-blue-50 text-blue-700 px-2 py-1 rounded text-xs font-medium border border-blue-100 truncate max-w-[150px] inline-block">
                            {trx.akunDebit.nama}
                          </span>
                        ) : (
                          <span className="text-gray-400 font-bold">-</span>
                        )}
                      </td>

                      <td className="px-6 py-4">
                        {trx.akunKredit ? (
                          <span className="bg-gray-100 text-gray-700 px-2 py-1 rounded text-xs font-medium border border-gray-200 truncate max-w-[150px] inline-block">
                            {trx.akunKredit.nama}
                          </span>
                        ) : (
                          <span className="text-gray-400 font-bold">-</span>
                        )}
                      </td>

                      <td className="px-6 py-4 text-right font-bold text-gray-900 whitespace-nowrap">
                        {formatRupiah(trx.nominal)}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td
                      colSpan="5"
                      className="px-6 py-12 text-center text-gray-500"
                    >
                      Belum ada aktivitas transaksi hari ini.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
