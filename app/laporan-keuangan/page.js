"use client";
import { useState, useEffect, useCallback } from "react";
import { collection, getDocs, query } from "firebase/firestore";
import { db } from "@/lib/firebase";
import {
  Printer,
  FileText,
  TrendingUp,
  Scale,
  BookOpen,
  Building2,
  RefreshCw,
} from "lucide-react";

export default function LaporanKeuanganSAKPage() {
  const [activeTab, setActiveTab] = useState("labarugi");
  const [loading, setLoading] = useState(true);

  // State Data Dinamis dari Firebase
  const [dataLabaRugi, setDataLabaRugi] = useState({
    pendapatan: [],
    beban: [],
    pajak: { current: 0, past: 0 },
  });
  const [dataNeraca, setDataNeraca] = useState({
    asetLancar: [],
    asetTetap: [],
    liabilitas: [],
    ekuitas: [],
  });
  const [dataPerubahanModal, setDataPerubahanModal] = useState({
    modalAwal: { current: 0, past: 0 },
    labaBersih: { current: 0, past: 0 },
    prive: { current: 0, past: 0 },
    modalAkhir: { current: 0, past: 0 },
  });

  const periodeSekarang = "PERIODE BERJALAN";
  const periodeLalu = "PERIODE LALU";

  // Fungsi untuk menarik data dari Jurnal Umum
  const fetchLaporanData = useCallback(async () => {
    setLoading(true);
    try {
      // 1. Panggil seluruh data Jurnal
      const q = query(collection(db, "jurnal"));
      const snapshot = await getDocs(q);

      let totalPendapatanCafe = 0,
        totalPendapatanKostum = 0,
        totalPendapatanSovenir = 0;
      let totalBebanGaji = 0,
        totalBebanOperasional = 0;
      let totalKas = 0,
        totalPiutang = 0,
        totalHutang = 0,
        modalAwal = 386500000; // Asumsi Modal Awal Statis

      // 2. Lakukan Agregasi (Penjumlahan Saldo)
      snapshot.forEach((doc) => {
        const trx = doc.data();
        const nominal = Number(trx.nominal) || 0;
        const akun = trx.akunKredit || trx.akunDebit; // Disesuaikan dengan struktur DB Anda

        // Mapping Sederhana (Contoh Logika Engine Akuntansi)
        if (akun?.includes("Pendapatan Yaswar Cafe"))
          totalPendapatanCafe += nominal;
        if (akun?.includes("Pendapatan Kostum"))
          totalPendapatanKostum += nominal;
        if (akun?.includes("Pendapatan Toko Sovenir"))
          totalPendapatanSovenir += nominal;

        if (akun?.includes("Biaya Gaji")) totalBebanGaji += nominal;
        if (akun?.includes("Biaya") && !akun?.includes("Gaji"))
          totalBebanOperasional += nominal;

        if (trx.akunDebit === "KAS") totalKas += nominal;
        if (trx.akunKredit === "KAS") totalKas -= nominal;

        if (trx.akunDebit?.includes("Piutang")) totalPiutang += nominal;
        if (trx.akunKredit?.includes("Piutang")) totalPiutang -= nominal;

        if (trx.akunKredit?.includes("Hutang")) totalHutang += nominal;
        if (trx.akunDebit?.includes("Hutang")) totalHutang -= nominal;
      });

      // 3. Masukkan Hasil Hitungan ke dalam State Laporan
      setDataLabaRugi({
        pendapatan: [
          {
            nama: "Pendapatan Yaswar Cafe",
            current: totalPendapatanCafe,
            past: 0,
          },
          {
            nama: "Pendapatan Kostum + Masuk",
            current: totalPendapatanKostum,
            past: 0,
          },
          {
            nama: "Pendapatan Toko Sovenir",
            current: totalPendapatanSovenir,
            past: 0,
          },
        ],
        beban: [
          { nama: "Biaya Gaji Karyawan", current: totalBebanGaji, past: 0 },
          {
            nama: "Biaya Operasional Lainnya",
            current: totalBebanOperasional,
            past: 0,
          },
        ],
        pajak: { current: 0, past: 0 },
      });

      const labaBersihCurrent =
        totalPendapatanCafe +
        totalPendapatanKostum +
        totalPendapatanSovenir -
        (totalBebanGaji + totalBebanOperasional);

      setDataNeraca({
        asetLancar: [
          { nama: "KAS (Tunai & Bank)", current: totalKas, past: 0 },
          { nama: "Piutang Usaha & Karyawan", current: totalPiutang, past: 0 },
        ],
        asetTetap: [
          {
            nama: "Aset Tetap (Tanah/Bangunan)",
            current: 350000000,
            past: 350000000,
          },
        ],
        liabilitas: [
          {
            nama: "Total Hutang (Bank & Dagang)",
            current: totalHutang,
            past: 0,
          },
        ],
        ekuitas: [
          { nama: "Modal Pemilik", current: modalAwal, past: modalAwal },
          { nama: "Saldo Laba (Defisit)", current: labaBersihCurrent, past: 0 },
        ],
      });

      setDataPerubahanModal({
        modalAwal: { current: modalAwal, past: modalAwal },
        labaBersih: { current: labaBersihCurrent, past: 0 },
        prive: { current: 0, past: 0 },
        modalAkhir: { current: modalAwal + labaBersihCurrent, past: modalAwal },
      });
    } catch (error) {
      console.error("Gagal memuat data laporan:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchLaporanData();
  }, [fetchLaporanData]);

  const sumCurrent = (arr) => arr.reduce((acc, curr) => acc + curr.current, 0);
  const formatRp = (angka) =>
    new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      minimumFractionDigits: 0,
    }).format(angka);

  // Hitungan Dinamis Subtotal
  const totalPendapatan = sumCurrent(dataLabaRugi.pendapatan);
  const totalBeban = sumCurrent(dataLabaRugi.beban);
  const labaSebelumPajak = totalPendapatan - totalBeban;

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <RefreshCw className="w-8 h-8 text-blue-500 animate-spin" />
      </div>
    );
  }

  // ... (SISA KODE RENDER HTML/JSX SAMA SEPERTI SEBELUMNYA) ...
  // Anda dapat menyimpan elemen HTML <div> <table> dari kode Laporan Keuangan sebelumnya di sini.
  // Pastikan memanggil formatRp(item.current) di dalam tabel.

  return (
    <div className="max-w-6xl mx-auto pb-12 print:mx-0 print:pb-0 print:max-w-full">
      <div className="print:hidden flex flex-col sm:flex-row justify-between items-start sm:items-end mb-8 gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Laporan Keuangan SAK EMKM
          </h1>
          <p className="text-gray-500 mt-1">
            Laporan komparatif standar akuntansi (Live Data).
          </p>
        </div>
        <button
          onClick={() => window.print()}
          className="flex items-center gap-2 bg-gray-900 hover:bg-black text-white px-5 py-2.5 rounded-lg text-sm font-bold transition-colors shadow-sm"
        >
          <Printer className="w-4 h-4" /> Cetak Buku Laporan
        </button>
      </div>

      {/* TABS NAVIGASI */}
      <div className="print:hidden flex flex-wrap border-b border-gray-200 mb-8 bg-white rounded-t-xl px-2 pt-2">
        {[
          { id: "labarugi", label: "Laba Rugi", icon: TrendingUp },
          { id: "neraca", label: "Posisi Keuangan (Neraca)", icon: Scale },
          { id: "perubahanmodal", label: "Perubahan Ekuitas", icon: Building2 },
          { id: "calk", label: "C A L K", icon: BookOpen },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-6 py-3 border-b-2 text-sm font-bold transition-colors ${activeTab === tab.id ? "border-blue-600 text-blue-600 bg-blue-50/50" : "border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50"}`}
          >
            <tab.icon className="w-4 h-4" /> {tab.label}
          </button>
        ))}
      </div>

      <div className="bg-white print:bg-transparent rounded-xl shadow-sm print:shadow-none p-8 print:p-0 border border-gray-100 print:border-none min-h-[800px] text-gray-900">
        {/* TABEL LABA RUGI */}
        <div
          className={`${activeTab === "labarugi" ? "block" : "hidden"} print:block print:page-break-after-always mb-12`}
        >
          <div className="text-center mb-8 border-b-2 border-black pb-4">
            <h1 className="text-xl font-black uppercase tracking-widest">
              YAYASAN RUMAH ETNIK PAPUA
            </h1>
            <h2 className="text-lg font-bold uppercase mt-1">
              LAPORAN LABA RUGI
            </h2>
            <p className="text-sm font-semibold uppercase">{periodeSekarang}</p>
          </div>
          <table className="w-full text-[13px] border-collapse">
            <thead>
              <tr className="border-y-2 border-black">
                <th className="py-2 text-left w-1/2 uppercase font-bold">
                  Keterangan
                </th>
                <th className="py-2 text-right w-1/4 uppercase font-bold px-2">
                  Saldo Berjalan
                </th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td colSpan="2" className="py-2 font-black uppercase underline">
                  PENDAPATAN:
                </td>
              </tr>
              {dataLabaRugi.pendapatan.map((item, idx) => (
                <tr key={idx}>
                  <td className="py-1 pl-4">{item.nama}</td>
                  <td className="py-1 text-right px-2">
                    {formatRp(item.current)}
                  </td>
                </tr>
              ))}
              <tr className="border-y border-gray-400 bg-gray-50">
                <td className="py-2 font-bold uppercase">JUMLAH PENDAPATAN</td>
                <td className="py-2 text-right font-bold px-2">
                  {formatRp(totalPendapatan)}
                </td>
              </tr>
              <tr>
                <td
                  colSpan="2"
                  className="py-2 font-black uppercase underline pt-4"
                >
                  BEBAN:
                </td>
              </tr>
              {dataLabaRugi.beban.map((item, idx) => (
                <tr key={idx}>
                  <td className="py-1 pl-4">{item.nama}</td>
                  <td className="py-1 text-right px-2">
                    {formatRp(item.current)}
                  </td>
                </tr>
              ))}
              <tr className="border-y border-gray-400 bg-gray-50">
                <td className="py-2 font-bold uppercase">JUMLAH BEBAN</td>
                <td className="py-2 text-right font-bold px-2">
                  {formatRp(totalBeban)}
                </td>
              </tr>
              <tr className="border-y-4 border-double border-black bg-gray-100">
                <td className="py-3 font-black uppercase">
                  LABA (RUGI) BERSIH
                </td>
                <td className="py-3 text-right font-black px-2">
                  {formatRp(labaSebelumPajak)}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
