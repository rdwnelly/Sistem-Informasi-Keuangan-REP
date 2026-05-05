"use client";
import { useState, useEffect, useCallback } from "react";
import { collection, getDocs, query, where } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { exportToCSV } from "@/lib/export";
import { Printer, Download, RefreshCw, Scale, Filter } from "lucide-react";

export default function NeracaSaldoPage() {
  const [dataNeraca, setDataNeraca] = useState([]);
  const [totalDebit, setTotalDebit] = useState(0);
  const [totalKredit, setTotalKredit] = useState(0);
  const [loading, setLoading] = useState(true);

  // State untuk Filter Periode
  const dateNow = new Date();
  const [filterTipe, setFilterTipe] = useState("bulanan"); // 'semua', 'bulanan', 'tahunan'
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

  // Menentukan label periode untuk Kop Surat
  let periodeText = "SEMUA WAKTU";
  if (filterTipe === "bulanan")
    periodeText = `${namaBulan[bulan - 1]} ${tahun}`;
  if (filterTipe === "tahunan") periodeText = `TAHUN ${tahun}`;

  const fetchNeracaSaldo = useCallback(async () => {
    setLoading(true);
    try {
      // 1. Tentukan Tanggal Batas Akhir (Cut-off Date)
      let endDateStr = "9999-12-31"; // Default untuk 'semua'
      if (filterTipe === "bulanan") {
        // Mencari hari terakhir di bulan yang dipilih
        const lastDay = new Date(tahun, bulan, 0).getDate();
        const strBulan = String(bulan).padStart(2, "0");
        endDateStr = `${tahun}-${strBulan}-${lastDay}`;
      } else if (filterTipe === "tahunan") {
        endDateStr = `${tahun}-12-31`;
      }

      // 2. Ambil Kerangka Akun Dasar
      const akunSnap = await getDocs(collection(db, "akun"));
      const mapAkun = {};
      akunSnap.forEach((doc) => {
        const a = doc.data();
        mapAkun[a.nama] = { id: doc.id, ...a, calculatedSaldo: 0 };
      });

      // 3. Ambil Jurnal hingga batas tanggal terpilih
      const jurnalRef = collection(db, "jurnal");
      // Kueri: Ambil semua transaksi yang tanggalnya <= endDateStr
      const qJurnal = query(jurnalRef, where("tanggal", "<=", endDateStr));
      const jurnalSnap = await getDocs(qJurnal);

      // 4. Kalkulasi Double-Entry secara dinamis dari Jurnal
      jurnalSnap.forEach((doc) => {
        const trx = doc.data();
        const nominal = Number(trx.nominal) || 0;
        const dName = trx.akunDebit?.nama;
        const kName = trx.akunKredit?.nama;

        // Proses Sisi Debit
        if (mapAkun[dName]) {
          const tipe = mapAkun[dName].tipe;
          if (["Aset", "Biaya"].includes(tipe)) {
            mapAkun[dName].calculatedSaldo += nominal; // Normal Balance Debit
          } else {
            mapAkun[dName].calculatedSaldo -= nominal; // Mengurangi Kredit
          }
        }

        // Proses Sisi Kredit
        if (mapAkun[kName]) {
          const tipe = mapAkun[kName].tipe;
          if (["Aset", "Biaya"].includes(tipe)) {
            mapAkun[kName].calculatedSaldo -= nominal; // Mengurangi Debit
          } else {
            mapAkun[kName].calculatedSaldo += nominal; // Normal Balance Kredit
          }
        }
      });

      // 5. Format Data untuk Tabel Neraca Saldo
      const listAkun = [];
      let tDebit = 0;
      let tKredit = 0;

      Object.values(mapAkun).forEach((akun) => {
        const saldo = akun.calculatedSaldo;

        // Sembunyikan akun yang saldonya benar-benar 0 pada periode cut-off tersebut
        if (saldo === 0) return;

        let nilaiDebit = 0;
        let nilaiKredit = 0;

        // Distribusi Saldo ke kolom D/K
        if (["Aset", "Biaya"].includes(akun.tipe)) {
          if (saldo >= 0) nilaiDebit = saldo;
          else nilaiKredit = Math.abs(saldo); // Pindah ke Kredit jika minus
        } else {
          if (saldo >= 0) nilaiKredit = saldo;
          else nilaiDebit = Math.abs(saldo); // Pindah ke Debit jika minus
        }

        let deskripsi = akun.nama.toUpperCase();
        if (akun.tipe === "Modal" && saldo < 0)
          deskripsi = `${deskripsi} (DEFISIT)`;

        listAkun.push({ ...akun, deskripsi, nilaiDebit, nilaiKredit });
        tDebit += nilaiDebit;
        tKredit += nilaiKredit;
      });

      // Pengurutan: Aset -> Hutang -> Modal -> Pendapatan -> Biaya
      const orderWeights = {
        Aset: 1,
        Hutang: 2,
        Modal: 3,
        Pendapatan: 4,
        Biaya: 5,
      };
      listAkun.sort((a, b) => {
        if (orderWeights[a.tipe] !== orderWeights[b.tipe]) {
          return orderWeights[a.tipe] - orderWeights[b.tipe];
        }
        return a.nama.localeCompare(b.nama);
      });

      setDataNeraca(listAkun);
      setTotalDebit(tDebit);
      setTotalKredit(tKredit);
    } catch (error) {
      console.error("Gagal memuat Neraca Saldo:", error);
    } finally {
      setLoading(false);
    }
  }, [filterTipe, bulan, tahun]);

  useEffect(() => {
    fetchNeracaSaldo();
  }, [fetchNeracaSaldo]);

  const formatRupiah = (angka) => {
    if (!angka || angka === 0) return "";
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      minimumFractionDigits: 0,
    }).format(angka);
  };

  const handleExportCSV = () => {
    const dataEkspor = dataNeraca.map((item) => ({
      "NO.AKUN": item.id || "",
      DESKRIPSI: item.deskripsi,
      DEBIT: item.nilaiDebit > 0 ? item.nilaiDebit : "",
      KREDIT: item.nilaiKredit > 0 ? item.nilaiKredit : "",
    }));
    dataEkspor.push({
      "NO.AKUN": "",
      DESKRIPSI: "TOTAL",
      DEBIT: totalDebit,
      KREDIT: totalKredit,
    });
    exportToCSV(
      dataEkspor,
      `Neraca_Saldo_REP_${periodeText.replace(/ /g, "_")}`,
    );
  };

  const handlePrint = () => window.print();
  const isBalanced = totalDebit === totalKredit;

  return (
    <div className="max-w-5xl mx-auto pb-12">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end mb-6 gap-4 print:hidden">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Neraca Saldo Terperinci
          </h1>
          <p className="text-gray-500 mt-1">
            Laporan keselarasan saldo akun Yayasan REP per periode.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleExportCSV}
            disabled={loading || dataNeraca.length === 0}
            className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors shadow-sm disabled:opacity-50"
          >
            <Download className="w-4 h-4" /> CSV
          </button>
          <button
            onClick={handlePrint}
            disabled={loading || dataNeraca.length === 0}
            className="flex items-center gap-2 bg-gray-800 hover:bg-gray-900 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors shadow-sm disabled:opacity-50"
          >
            <Printer className="w-4 h-4" /> Cetak
          </button>
        </div>
      </div>

      {/* Kontrol Filter Periode (Sembunyikan saat dicetak) */}
      <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm mb-6 flex flex-col sm:flex-row items-center gap-4 print:hidden">
        <div className="flex items-center gap-2 text-gray-700 font-medium w-full sm:w-auto">
          <Filter className="w-5 h-5 text-blue-600" />
          <span className="text-sm">Cut-off Periode:</span>
        </div>

        <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
          <select
            value={filterTipe}
            onChange={(e) => setFilterTipe(e.target.value)}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none bg-gray-50"
          >
            <option value="bulanan">Per Bulan</option>
            <option value="tahunan">Per Tahun</option>
            <option value="semua">Semua Waktu</option>
          </select>

          {filterTipe === "bulanan" && (
            <select
              value={bulan}
              onChange={(e) => setBulan(Number(e.target.value))}
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none bg-gray-50"
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
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none bg-gray-50"
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

      {/* Indikator Balance */}
      {!loading && (
        <div
          className={`p-4 rounded-xl mb-6 flex items-center justify-between border print:hidden ${isBalanced ? "bg-green-50 border-green-200" : "bg-red-50 border-red-200"}`}
        >
          <div className="flex items-center gap-3">
            <div
              className={`p-2 rounded-lg ${isBalanced ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}
            >
              <Scale className="w-6 h-6" />
            </div>
            <div>
              <h3
                className={`font-bold ${isBalanced ? "text-green-800" : "text-red-800"}`}
              >
                {isBalanced
                  ? "NERACA SEIMBANG (BALANCED)"
                  : "NERACA TIDAK SEIMBANG (UNBALANCED)"}
              </h3>
              <p
                className={`text-sm mt-0.5 ${isBalanced ? "text-green-600" : "text-red-600"}`}
              >
                {isBalanced
                  ? "Total Debit dan Kredit telah selaras."
                  : `Terdapat selisih sebesar ${formatRupiah(Math.abs(totalDebit - totalKredit))}.`}
              </p>
            </div>
          </div>
        </div>
      )}

      {loading ? (
        <div className="flex flex-col items-center justify-center h-64 bg-white rounded-xl border border-gray-100 shadow-sm print:hidden">
          <RefreshCw className="w-8 h-8 text-blue-500 animate-spin mb-4" />
          <p className="text-gray-500 font-medium">
            Mengkalkulasi ulang Neraca Saldo...
          </p>
        </div>
      ) : (
        /* KERTAS LAPORAN RESMI */
        <div className="bg-white border border-gray-300 shadow-sm overflow-hidden print:shadow-none print:border-none">
          <div className="bg-gray-500 text-white text-center py-4 px-6 print:bg-gray-200 print:text-black">
            <h2 className="text-lg font-bold uppercase tracking-wider">
              YAYASAN RUMAH ETNIK PAPUA
            </h2>
            <h3 className="text-base font-bold uppercase mt-1">NERACA SALDO</h3>
            <p className="text-sm font-semibold uppercase mt-1">
              PERIODE {periodeText}
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm border-collapse">
              <thead className="bg-white text-black border-b-2 border-gray-800">
                <tr>
                  <th className="px-4 py-3 font-bold border-r border-gray-300 w-24 text-center">
                    NO.AKUN
                  </th>
                  <th className="px-4 py-3 font-bold border-r border-gray-300">
                    DESKRIPSI
                  </th>
                  <th className="px-4 py-3 font-bold border-r border-gray-300 text-center w-40">
                    DEBIT
                  </th>
                  <th className="px-4 py-3 font-bold text-center w-40">
                    KREDIT
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-300">
                {dataNeraca.map((item, index) => (
                  <tr key={index} className="hover:bg-gray-50">
                    <td className="px-4 py-2 border-r border-gray-300 text-center text-gray-500"></td>
                    <td className="px-4 py-2 border-r border-gray-300 font-medium text-gray-900">
                      {item.deskripsi}
                    </td>
                    <td className="px-4 py-2 border-r border-gray-300 text-right text-gray-900">
                      {formatRupiah(item.nilaiDebit)}
                    </td>
                    <td className="px-4 py-2 text-right text-gray-900">
                      {formatRupiah(item.nilaiKredit)}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="border-t-2 border-gray-800 bg-gray-50 font-bold text-black print:bg-white">
                <tr>
                  <td
                    colSpan="2"
                    className="px-4 py-3 border-r border-gray-300 text-center uppercase"
                  >
                    TOTAL
                  </td>
                  <td className="px-4 py-3 border-r border-gray-300 text-right">
                    {formatRupiah(totalDebit)}
                  </td>
                  <td className="px-4 py-3 text-right">
                    {formatRupiah(totalKredit)}
                  </td>
                </tr>
              </tfoot>
            </table>
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
          table {
            width: 100% !important;
            border-collapse: collapse !important;
          }
          th,
          td {
            border: 1px solid #000 !important;
          }
          .print\\:bg-gray-200 {
            background-color: #e5e7eb !important;
            -webkit-print-color-adjust: exact;
          }
        }
      `}</style>
    </div>
  );
}
