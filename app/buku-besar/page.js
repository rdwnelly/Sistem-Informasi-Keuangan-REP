"use client";
import { useState, useEffect, useCallback } from "react";
import { collection, getDocs, query, orderBy } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { exportToCSV } from "@/lib/export";
import Link from "next/link";
import {
  Wallet,
  RefreshCw,
  Layers,
  Download,
  ExternalLink,
  Printer,
} from "lucide-react";

export default function BukuBesarPage() {
  const [akunData, setAkunData] = useState([]);
  const [loading, setLoading] = useState(true);
  const getCurrentMonthStr = () => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
  };
  const [filterBulan, setFilterBulan] = useState(getCurrentMonthStr());

  // FUNGSI UTAMA: Mengambil dan Menghitung Saldo Secara Dinamis dari Jurnal
  const fetchBukuBesarDinamis = useCallback(async () => {
    setLoading(true);
    try {
      // 1. Ambil Kerangka Semua Akun (dari koleksi 'akun')
      const akunSnap = await getDocs(collection(db, "akun"));
      const mapAkun = {};

      akunSnap.forEach((doc) => {
        const data = doc.data();
        // Set saldo awal perhitungan menjadi 0
        mapAkun[data.nama] = { id: doc.id, ...data, calculatedSaldo: 0 };
      });

      // 2. Ambil Seluruh Riwayat Transaksi (dari koleksi 'jurnal')
      const qJurnal = query(
        collection(db, "jurnal"),
        orderBy("timestamp", "asc"),
      );
      const jurnalSnap = await getDocs(qJurnal);

      // 3. Kalkulasi Real-Time (Agregasi)
      // Sistem akan membaca setiap baris jurnal dan menambahkan/mengurangkan saldo
      jurnalSnap.forEach((doc) => {
        const trx = doc.data();
        
        if (filterBulan && (!trx.tanggal || !trx.tanggal.startsWith(filterBulan))) {
          return; // skip if doesn't match selected month
        }

        const nominal = Number(trx.nominal) || 0;

        // Proses Sisi Debit (Kas Bertambah, Biaya Bertambah)
        if (trx.akunDebit && mapAkun[trx.akunDebit.nama]) {
          const namaAkun = trx.akunDebit.nama;
          const tipe = mapAkun[namaAkun].tipe;
          if (["Aset", "Biaya"].includes(tipe) || namaAkun.toUpperCase().includes("KAS")) {
            mapAkun[namaAkun].calculatedSaldo += nominal; // Normal Balance Debit
          } else {
            mapAkun[namaAkun].calculatedSaldo -= nominal; // Mengurangi Kredit
          }
        }

        // Proses Sisi Kredit (Pendapatan Bertambah, Hutang Bertambah)
        if (trx.akunKredit && mapAkun[trx.akunKredit.nama]) {
          const namaAkun = trx.akunKredit.nama;
          const tipe = mapAkun[namaAkun].tipe;
          if (["Aset", "Biaya"].includes(tipe) || namaAkun.toUpperCase().includes("KAS")) {
            mapAkun[namaAkun].calculatedSaldo -= nominal; // Mengurangi Debit
          } else {
            mapAkun[namaAkun].calculatedSaldo += nominal; // Normal Balance Kredit
          }
        }
      });

      // 4. Ubah format dari Object (Map) kembali menjadi Array untuk dirender ke tabel
      const listAkunFinal = Object.values(mapAkun);
      setAkunData(listAkunFinal);
    } catch (error) {
      console.error("Gagal melakukan agregasi Buku Besar:", error);
    } finally {
      setLoading(false);
    }
  }, [filterBulan]);

  useEffect(() => {
    fetchBukuBesarDinamis();
  }, [fetchBukuBesarDinamis]);

  const formatRupiah = (angka) => {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      minimumFractionDigits: 0,
    }).format(angka);
  };

  // Mengelompokkan data berdasarkan tipe akun agar rapi di UI
  const groupedAkun = akunData.reduce((acc, curr) => {
    if (!acc[curr.tipe]) acc[curr.tipe] = [];
    acc[curr.tipe].push(curr);
    return acc;
  }, {});

  // Urutan render sesuai standar Laporan Keuangan Yayasan
  const orderTipe = ["Aset", "Hutang", "Modal", "Pendapatan", "Biaya"];

  const handleExportCSV = () => {
    const dataEkspor = [];
    orderTipe.forEach((tipe) => {
      const daftarAkun = groupedAkun[tipe];
      if (daftarAkun && daftarAkun.length > 0) {
        let subtotal = 0;
        daftarAkun.forEach((akun) => {
          dataEkspor.push({
            "Kelompok Akun": tipe,
            "Nama Akun": akun.nama,
            "Saldo Akhir (Real-Time)": akun.calculatedSaldo || 0,
          });
          subtotal += akun.calculatedSaldo || 0;
        });
        dataEkspor.push({
          "Kelompok Akun": `TOTAL ${tipe.toUpperCase()}`,
          "Nama Akun": "",
          "Saldo Akhir (Real-Time)": subtotal,
        });
        dataEkspor.push({
          "Kelompok Akun": "",
          "Nama Akun": "",
          "Saldo Akhir (Real-Time)": "",
        });
      }
    });

    const tanggalHariIni = new Date().toISOString().split("T")[0];
    exportToCSV(dataEkspor, `Buku_Besar_REP_${tanggalHariIni}`);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="max-w-6xl mx-auto pb-12">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-8 gap-4 print:hidden">
        <div>
          <h1 className="text-2xl font-bold text-papua-primary">Buku Besar</h1>
          <p className="text-gray-500 mt-1">
            Laporan keselarasan saldo dihitung langsung dari riwayat Jurnal
            Utama.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
          <input
            type="month"
            value={filterBulan}
            onChange={(e) => setFilterBulan(e.target.value)}
            className="flex-1 sm:flex-none border border-gray-300 rounded-lg px-4 py-2 text-sm focus:ring-2 focus:ring-papua-primary focus:border-papua-primary outline-none"
          />

          <button
            onClick={fetchBukuBesarDinamis}
            disabled={loading}
            className="flex-1 sm:flex-none flex items-center justify-center gap-2 bg-white hover:bg-gray-50 text-gray-700 px-4 py-2 rounded-lg text-sm font-medium transition-colors border border-gray-200 shadow-sm disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
            Sinkronisasi Ulang
          </button>

          <button
            onClick={handleExportCSV}
            disabled={loading || akunData.length === 0}
            className="flex-1 sm:flex-none flex items-center justify-center gap-2 bg-papua-green hover:bg-papua-green text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors shadow-sm disabled:opacity-50"
          >
            <Download className="w-4 h-4" />
            Ekspor CSV
          </button>

          <button
            onClick={handlePrint}
            disabled={loading || akunData.length === 0}
            className="flex-1 sm:flex-none flex items-center justify-center gap-2 bg-gray-800 hover:bg-gray-900 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors shadow-sm disabled:opacity-50"
          >
            <Printer className="w-4 h-4" />
            Cetak Laporan
          </button>
        </div>
      </div>

      {/* Header Print-Only */}
      <div className="hidden print:block mb-8 text-center border-b pb-4">
        <h1 className="text-2xl font-bold text-papua-primary uppercase">Laporan Buku Besar</h1>
        <p className="text-gray-600">Yayasan Rumah Etnik Papua (REP)</p>
        <p className="text-gray-500 text-sm mt-1">
          Periode: {filterBulan ? filterBulan : "Seluruh Waktu"}
        </p>
      </div>

      {loading && akunData.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-64 bg-white rounded-xl border border-gray-100 shadow-sm">
          <RefreshCw className="w-8 h-8 text-papua-accent animate-spin mb-4" />
          <p className="text-gray-500 font-medium">
            Melakukan kalkulasi Buku Besar...
          </p>
        </div>
      ) : (
        <div className="space-y-8">
          {orderTipe.map((tipe) => {
            const daftarAkun = groupedAkun[tipe];
            if (!daftarAkun || daftarAkun.length === 0) return null;

            // Pastikan kita menjumlahkan atribut baru 'calculatedSaldo'
            const totalKategori = daftarAkun.reduce(
              (sum, akun) => sum + (akun.calculatedSaldo || 0),
              0,
            );

            return (
              <div
                key={tipe}
                className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden"
              >
                <div className="bg-gray-50 px-6 py-4 border-b border-gray-100 flex justify-between items-center">
                  <div className="flex items-center gap-2">
                    <Layers className="w-5 h-5 text-papua-primary" />
                    <h2 className="text-lg font-bold text-gray-800 uppercase tracking-wide">
                      {tipe}
                    </h2>
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead className="bg-white text-gray-500 font-medium border-b border-gray-100">
                      <tr>
                        <th className="px-6 py-3 w-16 text-center">No</th>
                        <th className="px-6 py-3">Nama Akun (Klik rincian)</th>
                        <th className="px-6 py-3 text-right">
                          Saldo Aktual (Rp)
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {daftarAkun.map((akun, index) => (
                        <tr
                          key={akun.id}
                          className="hover:bg-papua-accent/10/50 transition-colors group"
                        >
                          <td className="px-6 py-4 text-center text-gray-400">
                            {index + 1}
                          </td>
                          <td className="px-6 py-4 font-medium">
                            <Link
                              href={`/buku-besar/${akun.id}`}
                              className="flex items-center gap-2 text-gray-700 group-hover:text-papua-primary transition-colors"
                            >
                              <Wallet className="w-4 h-4 text-gray-300 group-hover:text-blue-400" />
                              <span className="group-hover:underline">
                                {akun.nama}
                              </span>
                              <ExternalLink className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                            </Link>
                          </td>
                          {/* Render nilai kalkulasi terbaru */}
                          <td
                            className={`px-6 py-4 text-right font-semibold ${akun.calculatedSaldo < 0 ? "text-papua-red" : "text-papua-primary"}`}
                          >
                            {formatRupiah(akun.calculatedSaldo)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot className="bg-gray-50/80 border-t border-gray-100">
                      <tr>
                        <td
                          colSpan="2"
                          className="px-6 py-4 text-right font-bold text-gray-700"
                        >
                          Total {tipe}
                        </td>
                        <td className="px-6 py-4 text-right font-bold text-papua-primary text-base">
                          {formatRupiah(totalKategori)}
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Tambahan CSS khusus untuk Print */}
      <style jsx global>{`
        @media print {
          body { background-color: white; }
          aside, nav { display: none !important; }
          main { margin: 0 !important; padding: 0 !important; width: 100% !important; }
          .print\\:hidden { display: none !important; }
          .print\\:block { display: block !important; }
        }
      `}</style>
    </div>
  );
}
