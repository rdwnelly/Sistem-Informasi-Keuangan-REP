"use client";
import { useState, useEffect, useCallback } from "react";
import { collection, getDocs, query } from "firebase/firestore";
import { db } from "@/lib/firebase";
import {
  Printer,
  TrendingUp,
  Scale,
  Building2,
  BookOpen,
  RefreshCw,
} from "lucide-react";

export default function LaporanKeuanganSAKPage() {
  const [activeTab, setActiveTab] = useState("labarugi");
  const [loading, setLoading] = useState(true);

  // State untuk Filter Periode
  const dateNow = new Date();
  const [filterTipe, setFilterTipe] = useState("bulanan"); // 'semua', 'bulanan', 'tahunan'
  const [bulan, setBulan] = useState(dateNow.getMonth() + 1);
  const [tahun, setTahun] = useState(dateNow.getFullYear());

  const namaBulan = [
    "JANUARI", "FEBRUARI", "MARET", "APRIL", "MEI", "JUNI",
    "JULI", "AGUSTUS", "SEPTEMBER", "OKTOBER", "NOVEMBER", "DESEMBER",
  ];

  let periodeSekarang = "SEMUA WAKTU";
  if (filterTipe === "bulanan")
    periodeSekarang = `${namaBulan[bulan - 1]} ${tahun}`;
  if (filterTipe === "tahunan") periodeSekarang = `TAHUN ${tahun}`;

  // State Data Dinamis dari Firebase
  const [dataLabaRugi, setDataLabaRugi] = useState({
    pendapatan: [],
    beban: [],
  });
  const [dataNeraca, setDataNeraca] = useState({
    aset: [],
    kewajiban: [],
    ekuitasAwal: [],
  });
  const [dataPerubahanModal, setDataPerubahanModal] = useState({
    modalAwal: 0,
    labaBersih: 0,
    prive: 0,
    modalAkhir: 0,
  });

  // Fungsi untuk menarik data dari Jurnal Umum & Akun (Neraca Saldo)
  const fetchLaporanData = useCallback(async () => {
    setLoading(true);
    try {
      // 1. Ambil Kerangka Akun Dasar
      const akunSnap = await getDocs(collection(db, "akun"));
      const mapAkun = {};
      akunSnap.forEach((doc) => {
        const a = doc.data();
        mapAkun[a.nama] = { ...a, calculatedSaldo: 0 };
      });

      // 2. Ambil Jurnal
      const q = query(collection(db, "jurnal"));
      const snapshot = await getDocs(q);

      // 3. Kalkulasi Saldo
      snapshot.forEach((doc) => {
        const trx = doc.data();
        if (!trx.tanggal) return;

        const [trxYearStr, trxMonthStr] = trx.tanggal.split("-");
        const trxYear = parseInt(trxYearStr, 10);
        const trxMonth = parseInt(trxMonthStr, 10);

        if (filterTipe === "bulanan") {
          if (trxMonth !== bulan || trxYear !== tahun) return;
        } else if (filterTipe === "tahunan") {
          if (trxYear !== tahun) return;
        }

        const nominal = Number(trx.nominal) || 0;
        
        // Safely extract names since akunDebit/akunKredit might be objects or strings
        const debitName = typeof trx.akunDebit === 'object' ? (trx.akunDebit?.nama || "") : (String(trx.akunDebit || ""));
        const kreditName = typeof trx.akunKredit === 'object' ? (trx.akunKredit?.nama || "") : (String(trx.akunKredit || ""));

        // Proses Sisi Debit
        if (mapAkun[debitName]) {
          const tipe = mapAkun[debitName].tipe;
          if (["Aset", "Biaya"].includes(tipe)) {
            mapAkun[debitName].calculatedSaldo += nominal; // Normal Balance Debit
          } else {
            mapAkun[debitName].calculatedSaldo -= nominal; // Mengurangi Kredit
          }
        }

        // Proses Sisi Kredit
        if (mapAkun[kreditName]) {
          const tipe = mapAkun[kreditName].tipe;
          if (["Aset", "Biaya"].includes(tipe)) {
            mapAkun[kreditName].calculatedSaldo -= nominal; // Mengurangi Debit
          } else {
            mapAkun[kreditName].calculatedSaldo += nominal; // Normal Balance Kredit
          }
        }
      });

      // 4. Klasifikasi ke Laporan
      const pendapatan = [];
      const beban = [];
      const aset = [];
      const kewajiban = [];
      const ekuitasAwal = [];
      let prive = 0;

      let totalPendapatan = 0;
      let totalBeban = 0;
      let totalModalAwal = 0;

      Object.values(mapAkun).forEach((akun) => {
        const saldo = akun.calculatedSaldo;
        if (saldo === 0) return; // Abaikan akun dengan saldo 0

        const nilai = Math.abs(saldo);

        if (akun.tipe === "Pendapatan") {
          pendapatan.push({ nama: akun.nama, current: nilai });
          totalPendapatan += saldo;
        } else if (akun.tipe === "Biaya") {
          beban.push({ nama: akun.nama, current: nilai });
          totalBeban += saldo;
        } else if (akun.tipe === "Aset") {
          aset.push({ nama: akun.nama, current: nilai, isMinus: saldo < 0 });
        } else if (akun.tipe === "Hutang") {
          kewajiban.push({ nama: akun.nama, current: nilai, isMinus: saldo < 0 });
        } else if (akun.tipe === "Modal") {
          if (akun.nama.toLowerCase().includes("prive")) {
            prive += saldo; // Prive mengurangi modal, saldo normal harusnya debit
          } else {
            ekuitasAwal.push({ nama: akun.nama, current: nilai, isMinus: saldo < 0 });
            totalModalAwal += saldo;
          }
        }
      });

      const labaBersih = totalPendapatan - totalBeban;
      const modalAkhir = totalModalAwal + labaBersih - prive;

      setDataLabaRugi({ pendapatan, beban });
      setDataNeraca({ aset, kewajiban, ekuitasAwal });
      setDataPerubahanModal({
        modalAwal: totalModalAwal,
        labaBersih,
        prive,
        modalAkhir,
      });
    } catch (error) {
      console.error("Gagal memuat Laporan Keuangan:", error);
    } finally {
      setLoading(false);
    }
  }, [filterTipe, bulan, tahun]);

  useEffect(() => {
    fetchLaporanData();
  }, [fetchLaporanData]);

  const formatRp = (angka) =>
    new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      minimumFractionDigits: 0,
    }).format(angka || 0);

  // Subtotal Laba Rugi
  const totalPendapatan = dataLabaRugi.pendapatan.reduce((acc, curr) => acc + curr.current, 0);
  const totalBeban = dataLabaRugi.beban.reduce((acc, curr) => acc + curr.current, 0);
  const labaBersih = totalPendapatan - totalBeban;

  // Subtotal Neraca
  const totalAset = dataNeraca.aset.reduce((acc, curr) => curr.isMinus ? acc - curr.current : acc + curr.current, 0);
  const totalKewajiban = dataNeraca.kewajiban.reduce((acc, curr) => curr.isMinus ? acc - curr.current : acc + curr.current, 0);
  const totalEkuitasNeraca = dataPerubahanModal.modalAkhir;
  const totalKewajibanDanEkuitas = totalKewajiban + totalEkuitasNeraca;

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <RefreshCw className="w-8 h-8 text-blue-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto pb-12 print:mx-0 print:pb-0 print:max-w-full">
      <div className="print:hidden flex flex-col sm:flex-row justify-between items-start sm:items-end mb-8 gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Laporan Keuangan SAK EMKM
          </h1>
          <p className="text-gray-500 mt-1">
            Bersumber dari Jurnal Utama yang dipilih.
          </p>
        </div>
        
        <div className="flex flex-wrap items-center gap-3">
          <select
            value={filterTipe}
            onChange={(e) => setFilterTipe(e.target.value)}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-blue-500 focus:border-blue-500 outline-none"
          >
            <option value="semua">Semua Waktu</option>
            <option value="bulanan">Bulan Tertentu</option>
            <option value="tahunan">Tahun Tertentu</option>
          </select>

          {filterTipe === "bulanan" && (
            <select
              value={bulan}
              onChange={(e) => setBulan(Number(e.target.value))}
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-blue-500 focus:border-blue-500 outline-none"
            >
              {namaBulan.map((nama, i) => (
                <option key={i + 1} value={i + 1}>{nama}</option>
              ))}
            </select>
          )}

          {["bulanan", "tahunan"].includes(filterTipe) && (
            <input
              type="number"
              value={tahun}
              onChange={(e) => setTahun(Number(e.target.value))}
              className="w-24 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-blue-500 focus:border-blue-500 outline-none"
            />
          )}

          <button onClick={fetchLaporanData} className="flex items-center justify-center bg-white hover:bg-gray-50 text-gray-700 p-2 rounded-lg transition-colors border border-gray-200 shadow-sm" title="Sinkronisasi Data">
            <RefreshCw className={`w-5 h-5 ${loading ? "animate-spin" : ""}`} />
          </button>

          <button
            onClick={() => window.print()}
            className="flex items-center gap-2 bg-gray-900 hover:bg-black text-white px-5 py-2.5 rounded-lg text-sm font-bold transition-colors shadow-sm"
          >
            <Printer className="w-4 h-4" /> Cetak Laporan
          </button>
        </div>
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
            className={`flex items-center gap-2 px-6 py-3 border-b-2 text-sm font-bold transition-colors ${
              activeTab === tab.id
                ? "border-blue-600 text-blue-600 bg-blue-50/50"
                : "border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50"
            }`}
          >
            <tab.icon className="w-4 h-4" /> {tab.label}
          </button>
        ))}
      </div>

      <div className="bg-white print:bg-transparent rounded-xl shadow-sm print:shadow-none p-8 print:p-0 border border-gray-100 print:border-none min-h-[800px] text-gray-900">
        
        {/* TABEL LABA RUGI */}
        <div className={`${activeTab === "labarugi" ? "block" : "hidden"} print:block print:page-break-after-always mb-12`}>
          <div className="text-center mb-8 border-b-2 border-black pb-4">
            <h1 className="text-xl font-black uppercase tracking-widest">YAYASAN RUMAH ETNIK PAPUA</h1>
            <h2 className="text-lg font-bold uppercase mt-1">LAPORAN LABA RUGI</h2>
            <p className="text-sm font-semibold uppercase">{periodeSekarang}</p>
          </div>
          <table className="w-full text-[13px] border-collapse">
            <thead>
              <tr className="border-y-2 border-black">
                <th className="py-2 text-left w-1/2 uppercase font-bold">Keterangan</th>
                <th className="py-2 text-right w-1/4 uppercase font-bold px-2">Saldo Berjalan</th>
              </tr>
            </thead>
            <tbody>
              <tr><td colSpan="2" className="py-2 font-black uppercase underline">PENDAPATAN:</td></tr>
              {dataLabaRugi.pendapatan.map((item, idx) => (
                <tr key={idx}>
                  <td className="py-1 pl-4">{item.nama}</td>
                  <td className="py-1 text-right px-2">{formatRp(item.current)}</td>
                </tr>
              ))}
              <tr className="border-y border-gray-400 bg-gray-50">
                <td className="py-2 font-bold uppercase">JUMLAH PENDAPATAN</td>
                <td className="py-2 text-right font-bold px-2">{formatRp(totalPendapatan)}</td>
              </tr>

              <tr><td colSpan="2" className="py-2 font-black uppercase underline pt-4">BEBAN:</td></tr>
              {dataLabaRugi.beban.map((item, idx) => (
                <tr key={idx}>
                  <td className="py-1 pl-4">{item.nama}</td>
                  <td className="py-1 text-right px-2">{formatRp(item.current)}</td>
                </tr>
              ))}
              <tr className="border-y border-gray-400 bg-gray-50">
                <td className="py-2 font-bold uppercase">JUMLAH BEBAN</td>
                <td className="py-2 text-right font-bold px-2">{formatRp(totalBeban)}</td>
              </tr>

              <tr className="border-y-4 border-double border-black bg-gray-100">
                <td className="py-3 font-black uppercase">LABA (RUGI) BERSIH</td>
                <td className="py-3 text-right font-black px-2">{formatRp(labaBersih)}</td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* TABEL PERUBAHAN EKUITAS */}
        <div className={`${activeTab === "perubahanmodal" ? "block" : "hidden"} print:block print:page-break-after-always mb-12`}>
          <div className="text-center mb-8 border-b-2 border-black pb-4">
            <h1 className="text-xl font-black uppercase tracking-widest">YAYASAN RUMAH ETNIK PAPUA</h1>
            <h2 className="text-lg font-bold uppercase mt-1">LAPORAN PERUBAHAN EKUITAS</h2>
            <p className="text-sm font-semibold uppercase">{periodeSekarang}</p>
          </div>
          <table className="w-full text-[13px] border-collapse">
            <thead>
              <tr className="border-y-2 border-black">
                <th className="py-2 text-left w-1/2 uppercase font-bold">Keterangan</th>
                <th className="py-2 text-right w-1/4 uppercase font-bold px-2">Nilai</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="py-2 font-bold">Modal Awal</td>
                <td className="py-2 text-right px-2">{formatRp(dataPerubahanModal.modalAwal)}</td>
              </tr>
              <tr>
                <td className="py-2 font-bold">Laba (Rugi) Bersih</td>
                <td className="py-2 text-right px-2">{formatRp(dataPerubahanModal.labaBersih)}</td>
              </tr>
              <tr>
                <td className="py-2 font-bold">Prive (Penarikan)</td>
                <td className="py-2 text-right px-2">({formatRp(dataPerubahanModal.prive)})</td>
              </tr>
              <tr className="border-y-4 border-double border-black bg-gray-100">
                <td className="py-3 font-black uppercase">MODAL AKHIR</td>
                <td className="py-3 text-right font-black px-2">{formatRp(dataPerubahanModal.modalAkhir)}</td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* TABEL NERACA */}
        <div className={`${activeTab === "neraca" ? "block" : "hidden"} print:block print:page-break-after-always mb-12`}>
          <div className="text-center mb-8 border-b-2 border-black pb-4">
            <h1 className="text-xl font-black uppercase tracking-widest">YAYASAN RUMAH ETNIK PAPUA</h1>
            <h2 className="text-lg font-bold uppercase mt-1">LAPORAN POSISI KEUANGAN (NERACA)</h2>
            <p className="text-sm font-semibold uppercase">{periodeSekarang}</p>
          </div>
          <div className="flex flex-col md:flex-row gap-8">
            {/* SISI ASET */}
            <div className="flex-1">
              <h3 className="font-black uppercase border-b-2 border-black mb-2 pb-1">ASET</h3>
              <table className="w-full text-[13px] border-collapse">
                <tbody>
                  {dataNeraca.aset.map((item, idx) => (
                    <tr key={idx}>
                      <td className="py-1">{item.nama}</td>
                      <td className="py-1 text-right">{item.isMinus ? `(${formatRp(item.current)})` : formatRp(item.current)}</td>
                    </tr>
                  ))}
                  <tr className="border-t-2 border-black">
                    <td className="py-2 font-bold uppercase">TOTAL ASET</td>
                    <td className="py-2 text-right font-bold">{formatRp(totalAset)}</td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* SISI KEWAJIBAN & EKUITAS */}
            <div className="flex-1">
              <h3 className="font-black uppercase border-b-2 border-black mb-2 pb-1">KEWAJIBAN</h3>
              <table className="w-full text-[13px] border-collapse mb-6">
                <tbody>
                  {dataNeraca.kewajiban.map((item, idx) => (
                    <tr key={idx}>
                      <td className="py-1">{item.nama}</td>
                      <td className="py-1 text-right">{item.isMinus ? `(${formatRp(item.current)})` : formatRp(item.current)}</td>
                    </tr>
                  ))}
                  <tr className="border-t border-gray-400">
                    <td className="py-2 font-bold uppercase">TOTAL KEWAJIBAN</td>
                    <td className="py-2 text-right font-bold">{formatRp(totalKewajiban)}</td>
                  </tr>
                </tbody>
              </table>

              <h3 className="font-black uppercase border-b-2 border-black mb-2 pb-1">EKUITAS</h3>
              <table className="w-full text-[13px] border-collapse">
                <tbody>
                  <tr>
                    <td className="py-1">Modal Akhir</td>
                    <td className="py-1 text-right">{formatRp(totalEkuitasNeraca)}</td>
                  </tr>
                  <tr className="border-t border-gray-400">
                    <td className="py-2 font-bold uppercase">TOTAL EKUITAS</td>
                    <td className="py-2 text-right font-bold">{formatRp(totalEkuitasNeraca)}</td>
                  </tr>
                </tbody>
              </table>

              <table className="w-full text-[13px] border-collapse mt-4">
                <tbody>
                  <tr className="border-y-4 border-double border-black bg-gray-100">
                    <td className="py-2 font-bold uppercase">TOTAL KEWAJIBAN & EKUITAS</td>
                    <td className="py-2 text-right font-bold">{formatRp(totalKewajibanDanEkuitas)}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
          
          {/* Validation Info (Print Hidden) */}
          <div className="print:hidden mt-8 text-center">
            {Math.abs(totalAset - totalKewajibanDanEkuitas) < 1 ? (
              <span className="inline-block bg-green-100 text-green-800 px-4 py-2 rounded-lg font-bold">✅ Neraca Seimbang (Balanced)</span>
            ) : (
              <span className="inline-block bg-red-100 text-red-800 px-4 py-2 rounded-lg font-bold">❌ Neraca Tidak Seimbang: Selisih {formatRp(Math.abs(totalAset - totalKewajibanDanEkuitas))}</span>
            )}
          </div>
        </div>

        {/* TABEL CALK */}
        <div className={`${activeTab === "calk" ? "block" : "hidden"} print:block print:page-break-after-always mb-12`}>
          <div className="text-center mb-8 border-b-2 border-black pb-4">
            <h1 className="text-xl font-black uppercase tracking-widest">YAYASAN RUMAH ETNIK PAPUA</h1>
            <h2 className="text-lg font-bold uppercase mt-1">CATATAN ATAS LAPORAN KEUANGAN</h2>
            <p className="text-sm font-semibold uppercase">{periodeSekarang}</p>
          </div>
          <div className="space-y-4 text-[13px] leading-relaxed text-justify">
            <p><strong>1. Umum</strong><br/>Yayasan Rumah Etnik Papua menyusun Laporan Keuangan berdasarkan Standar Akuntansi Keuangan Entitas Mikro, Kecil, dan Menengah (SAK EMKM).</p>
            <p><strong>2. Kebijakan Akuntansi</strong><br/>Penyusunan laporan keuangan menggunakan dasar akrual (accrual basis) dan kelangsungan usaha (going concern).</p>
            <p><strong>3. Kas dan Setara Kas</strong><br/>Kas terdiri dari saldo tunai dan simpanan di bank yang dapat digunakan sewaktu-waktu.</p>
            <p><strong>4. Pendapatan dan Beban</strong><br/>Pendapatan diakui saat jasa/barang diserahkan. Beban diakui pada saat terjadinya.</p>
            <p>Laporan ini dihasilkan secara otomatis melalui Sistem Informasi Akuntansi Yayasan REP dan divalidasi oleh pembukuan internal.</p>
          </div>
        </div>

      </div>

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
