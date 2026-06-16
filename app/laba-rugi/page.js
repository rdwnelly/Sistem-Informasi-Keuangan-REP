"use client";
import { useState, useEffect, useCallback } from "react";
import { collection, getDocs, query, orderBy } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { exportToCSV } from "@/lib/export";
import {
  Printer,
  Download,
  RefreshCw,
  Filter,
  TrendingUp,
  TrendingDown,
  Info,
  CheckCircle2,
} from "lucide-react";

export default function LabaRugiPage() {
  const [dataPendapatan, setDataPendapatan] = useState([]);
  const [dataBiaya, setDataBiaya] = useState([]);
  const [totalPendapatan, setTotalPendapatan] = useState(0);
  const [totalBiaya, setTotalBiaya] = useState(0);
  const [loading, setLoading] = useState(true);

  const dateNow = new Date();
  // PERBAIKAN: Default diubah menjadi 'bulanan' agar setiap bulan data kosong (mulai buku baru)
  const [filterTipe, setFilterTipe] = useState("bulanan");
  const [bulan, setBulan] = useState(dateNow.getMonth() + 1);
  const [tahun, setTahun] = useState(dateNow.getFullYear());

  const namaBulan = [
    "JANUARI",
    "FEBRUARI",
    "MARET",
    "APRIL",
    "MEI",
    "JUNI",
    "JULI",
    "AGUSTUS",
    "SEPTEMBER",
    "OKTOBER",
    "NOVEMBER",
    "DESEMBER",
  ];

  let periodeText = "SEMUA WAKTU (KUMULATIF)";
  if (filterTipe === "bulanan")
    periodeText = `${namaBulan[bulan - 1]} ${tahun}`;
  if (filterTipe === "tahunan") periodeText = `TAHUN ${tahun}`;

  const fetchLabaRugiDinamis = useCallback(async () => {
    setLoading(true);
    try {
      const akunSnap = await getDocs(collection(db, "akun"));
      const mapAkun = {};
      akunSnap.forEach((doc) => {
        const data = doc.data();
        if (["Pendapatan", "Biaya"].includes(data.tipe)) {
          mapAkun[doc.id] = { id: doc.id, ...data, calculatedSaldo: 0 };
        }
      });

      const qJurnal = query(
        collection(db, "jurnal"),
        orderBy("timestamp", "asc"),
      );
      const jurnalSnap = await getDocs(qJurnal);

      jurnalSnap.forEach((doc) => {
        const trx = doc.data();
        const nominal = Number(trx.nominal) || 0;

        const trxDate = new Date(trx.tanggal);
        const trxMonth = trxDate.getMonth() + 1;
        const trxYear = trxDate.getFullYear();

        if (filterTipe === "bulanan") {
          if (trxMonth !== bulan || trxYear !== tahun) return;
        } else if (filterTipe === "tahunan") {
          if (trxYear !== tahun) return;
        }

        if (trx.akunDebit && trx.akunDebit.id && mapAkun[trx.akunDebit.id]) {
          const idAkun = trx.akunDebit.id;
          if (mapAkun[idAkun].tipe === "Biaya")
            mapAkun[idAkun].calculatedSaldo += nominal;
          if (mapAkun[idAkun].tipe === "Pendapatan")
            mapAkun[idAkun].calculatedSaldo -= nominal;
        }

        if (trx.akunKredit && trx.akunKredit.id && mapAkun[trx.akunKredit.id]) {
          const idAkun = trx.akunKredit.id;
          if (mapAkun[idAkun].tipe === "Pendapatan")
            mapAkun[idAkun].calculatedSaldo += nominal;
          if (mapAkun[idAkun].tipe === "Biaya")
            mapAkun[idAkun].calculatedSaldo -= nominal;
        }
      });

      const listPendapatan = [];
      const listBiaya = [];
      let tPendapatan = 0;
      let tBiaya = 0;

      Object.values(mapAkun).forEach((akun) => {
        if (akun.calculatedSaldo === 0) return;

        if (akun.tipe === "Pendapatan") {
          listPendapatan.push(akun);
          tPendapatan += akun.calculatedSaldo;
        } else if (akun.tipe === "Biaya") {
          listBiaya.push(akun);
          tBiaya += akun.calculatedSaldo;
        }
      });

      listPendapatan.sort((a, b) => a.nama.localeCompare(b.nama));
      listBiaya.sort((a, b) => a.nama.localeCompare(b.nama));

      setDataPendapatan(listPendapatan);
      setDataBiaya(listBiaya);
      setTotalPendapatan(tPendapatan);
      setTotalBiaya(tBiaya);
    } catch (error) {
      console.error("Gagal memuat Laporan Laba Rugi:", error);
    } finally {
      setLoading(false);
    }
  }, [filterTipe, bulan, tahun]);

  useEffect(() => {
    fetchLabaRugiDinamis();
  }, [fetchLabaRugiDinamis]);

  const formatRupiah = (angka) =>
    new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      minimumFractionDigits: 0,
    }).format(angka);

  const labaBersih = totalPendapatan - totalBiaya;
  const isLaba = labaBersih >= 0;

  const handlePrint = () => window.print();

  return (
    <div className="max-w-4xl mx-auto pb-12">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end mb-6 gap-4 print:hidden">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Laporan Laba Rugi
          </h1>
          <p className="text-gray-500 mt-1">
            Laporan kinerja finansial aktual dihitung dari riwayat Jurnal Utama.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={handlePrint}
            disabled={loading}
            className="flex items-center gap-2 bg-gray-800 hover:bg-gray-900 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors shadow-sm disabled:opacity-50"
          >
            <Printer className="w-4 h-4" /> Cetak Laporan
          </button>
        </div>
      </div>

      {/* Kontrol Filter Periode */}
      <div className="bg-white p-5 rounded-xl border border-gray-100 shadow-sm mb-6 print:hidden">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2 text-gray-700 font-medium">
            <Filter className="w-5 h-5 text-blue-600" />
            <span className="text-sm">Periode Laporan:</span>
          </div>

          <div className="flex items-center gap-3">
            <select
              value={filterTipe}
              onChange={(e) => setFilterTipe(e.target.value)}
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm bg-gray-50 outline-none focus:ring-2 focus:ring-blue-500 font-semibold text-blue-700"
            >
              <option value="semua">Semua Waktu (Kumulatif)</option>
              <option value="bulanan">Per Bulan Terpilih</option>
              <option value="tahunan">Per Tahun Terpilih</option>
            </select>
            {filterTipe === "bulanan" && (
              <select
                value={bulan}
                onChange={(e) => setBulan(Number(e.target.value))}
                className="border border-gray-300 rounded-lg px-3 py-2 text-sm bg-gray-50 outline-none focus:ring-2 focus:ring-blue-500"
              >
                {namaBulan.map((nama, idx) => (
                  <option key={idx} value={idx + 1}>
                    {nama}
                  </option>
                ))}
              </select>
            )}
            {(filterTipe === "bulanan" || filterTipe === "tahunan") && (
              <select
                value={tahun}
                onChange={(e) => setTahun(Number(e.target.value))}
                className="border border-gray-300 rounded-lg px-3 py-2 text-sm bg-gray-50 outline-none focus:ring-2 focus:ring-blue-500"
              >
                {[2024, 2025, 2026, 2027].map((thn) => (
                  <option key={thn} value={thn}>
                    {thn}
                  </option>
                ))}
              </select>
            )}
          </div>
        </div>

        {filterTipe === "semua" && (
          <div className="mt-4 pt-3 border-t border-gray-100 flex gap-2 text-xs text-green-700 bg-green-50 p-3 rounded-lg">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <p>
              Sistem sedang menampilkan mode <b>Semua Waktu</b>. Angka
              Pendapatan dan Biaya di bawah ini dijamin 100% selaras dengan
              saldo akhir di halaman Buku Besar dan Neraca Saldo.
            </p>
          </div>
        )}
        {filterTipe === "bulanan" && (
          <div className="mt-4 pt-3 border-t border-gray-100 flex gap-2 text-xs text-blue-600 bg-blue-50 p-3 rounded-lg">
            <Info className="w-4 h-4 shrink-0" />
            <p>
              Anda sedang melihat laporan khusus{" "}
              <b>Bulan {namaBulan[bulan - 1]}</b>. Angka ini mungkin lebih kecil
              dari Neraca Saldo karena tidak menyertakan bulan sebelumnya.
            </p>
          </div>
        )}
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center h-64 bg-white rounded-xl border border-gray-100 shadow-sm print:hidden">
          <RefreshCw className="w-8 h-8 text-blue-500 animate-spin mb-4" />
          <p className="text-gray-500 font-medium">
            Menyesuaikan kalkulasi Laba Rugi...
          </p>
        </div>
      ) : (
        /* KERTAS LAPORAN RESMI */
        <div className="bg-white border border-gray-300 shadow-sm overflow-hidden print:shadow-none print:border-none print:m-0">
          <div className="bg-gray-800 text-white text-center py-6 px-6 print:bg-white print:text-black print:border-b-2 print:border-black">
            <h2 className="text-xl font-bold uppercase tracking-widest">
              YAYASAN RUMAH ETNIK PAPUA
            </h2>
            <h3 className="text-lg font-semibold uppercase tracking-wider mt-1">
              Laporan Laba Rugi
            </h3>
            <p className="text-sm font-medium mt-1">PERIODE {periodeText}</p>
          </div>

          <div className="p-8 print:p-0 print:pt-6">
            {/* PENDAPATAN */}
            <div className="mb-8">
              <h4 className="text-base font-bold text-gray-900 border-b-2 border-gray-300 pb-2 mb-4">
                PENDAPATAN OPERASIONAL
              </h4>
              <div className="space-y-3">
                {dataPendapatan.length > 0 ? (
                  dataPendapatan.map((akun) => (
                    <div
                      key={akun.id}
                      className="flex justify-between items-center px-2"
                    >
                      <span className="text-gray-700 font-medium">
                        {akun.nama}
                      </span>
                      <span className="font-semibold text-gray-900">
                        {formatRupiah(akun.calculatedSaldo)}
                      </span>
                    </div>
                  ))
                ) : (
                  <p className="text-gray-500 italic px-2 text-sm">
                    Tidak ada aktivitas pendapatan pada periode ini.
                  </p>
                )}
              </div>
              <div className="flex justify-between items-center px-2 mt-4 pt-3 border-t border-gray-200 bg-gray-50 p-2 rounded">
                <span className="font-bold text-gray-900">
                  Total Pendapatan
                </span>
                <span className="font-bold text-green-700 text-base">
                  {formatRupiah(totalPendapatan)}
                </span>
              </div>
            </div>

            {/* BIAYA */}
            <div className="mb-8">
              <h4 className="text-base font-bold text-gray-900 border-b-2 border-gray-300 pb-2 mb-4">
                BIAYA OPERASIONAL
              </h4>
              <div className="space-y-3">
                {dataBiaya.length > 0 ? (
                  dataBiaya.map((akun) => (
                    <div
                      key={akun.id}
                      className="flex justify-between items-center px-2"
                    >
                      <span className="text-gray-700 font-medium">
                        {akun.nama}
                      </span>
                      <span className="font-semibold text-gray-900">
                        {formatRupiah(akun.calculatedSaldo)}
                      </span>
                    </div>
                  ))
                ) : (
                  <p className="text-gray-500 italic px-2 text-sm">
                    Tidak ada aktivitas biaya pada periode ini.
                  </p>
                )}
              </div>
              <div className="flex justify-between items-center px-2 mt-4 pt-3 border-t border-gray-200 bg-gray-50 p-2 rounded">
                <span className="font-bold text-gray-900">
                  Total Biaya Operasional
                </span>
                <span className="font-bold text-red-700 text-base">
                  {formatRupiah(totalBiaya)}
                </span>
              </div>
            </div>

            {/* LABA / RUGI */}
            <div
              className={`mt-10 p-5 rounded-xl border-2 flex items-center justify-between print:rounded-none print:border-black ${isLaba ? "bg-green-50 border-green-200" : "bg-red-50 border-red-200"}`}
            >
              <div className="flex items-center gap-3">
                {isLaba ? (
                  <TrendingUp className="w-8 h-8 text-green-600 print:hidden" />
                ) : (
                  <TrendingDown className="w-8 h-8 text-red-600 print:hidden" />
                )}
                <div>
                  <h3
                    className={`text-sm font-bold uppercase tracking-widest ${isLaba ? "text-green-800" : "text-red-800"} print:text-black`}
                  >
                    {isLaba
                      ? "LABA BERSIH (NET PROFIT)"
                      : "RUGI BERSIH (NET LOSS)"}
                  </h3>
                  <p className="text-xs text-gray-600 mt-1 print:hidden">
                    Hasil akhir akumulasi Pendapatan dikurangi Biaya.
                  </p>
                </div>
              </div>
              <div
                className={`text-2xl font-black ${isLaba ? "text-green-700" : "text-red-700"} print:text-black`}
              >
                {formatRupiah(labaBersih)}
              </div>
            </div>
          </div>
        </div>
      )}
      <style jsx global>{`
        @media print {
          body {
            background-color: white !important;
            color: black !important;
          }
          aside,
          nav,
          header {
            display: none !important;
          }
          main {
            margin: 0 !important;
            padding: 0 !important;
            width: 100% !important;
            max-width: 100% !important;
          }
        }
      `}</style>
    </div>
  );
}
