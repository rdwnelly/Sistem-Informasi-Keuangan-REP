"use client";
import { useState } from "react";
import {
  Printer,
  FileText,
  TrendingUp,
  Scale,
  BookOpen,
  Building2,
} from "lucide-react";

export default function LaporanKeuanganSAKPage() {
  const [activeTab, setActiveTab] = useState("labarugi");

  // Periode laporan (dapat dipilih oleh user)
  const monthNames = [
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

  const now = new Date();
  const defaultMonth = now.getMonth();
  const defaultYear = now.getFullYear();

  const [selectedMonth, setSelectedMonth] = useState(defaultMonth);
  const [selectedYear, setSelectedYear] = useState(defaultYear);
  // Bandingkan (compare) -- user dapat memilih bulan bandingan manual
  const [compareEnabled, setCompareEnabled] = useState(false);
  const [selectedCompareMonth, setSelectedCompareMonth] = useState(
    defaultMonth === 0 ? 11 : defaultMonth - 1,
  );
  const [selectedCompareYear, setSelectedCompareYear] = useState(
    defaultMonth === 0 ? defaultYear - 1 : defaultYear,
  );
  const [periodeSekarang, setPeriodeSekarang] = useState(
    `${monthNames[defaultMonth]} ${defaultYear}`,
  );
  const [periodeLalu, setPeriodeLalu] = useState(() => {
    const prev = new Date(defaultYear, defaultMonth - 1);
    return `${monthNames[prev.getMonth()]} ${prev.getFullYear()}`;
  });

  const applyPeriode = () => {
    const cur = new Date(selectedYear, selectedMonth);
    let comp;
    if (compareEnabled) {
      comp = new Date(selectedCompareYear, selectedCompareMonth);
    } else {
      comp = new Date(selectedYear, selectedMonth - 1);
    }

    setPeriodeSekarang(`${monthNames[cur.getMonth()]} ${cur.getFullYear()}`);
    setPeriodeLalu(`${monthNames[comp.getMonth()]} ${comp.getFullYear()}`);
    // TODO: trigger data reload based on periode when backend available
  };

  // --- MOCK DATA (Struktur disesuaikan dengan Akun REP & Format SAK EMKM) ---
  // Dalam implementasi nyata, data ini dihitung (dijumlahkan) dari Firestore koleksi 'jurnal' berdasarkan rentang tanggal.

  const dataLabaRugi = {
    pendapatan: [
      { nama: "Pendapatan Kostum + Masuk", current: 15500000, past: 12000000 },
      { nama: "Pendapatan Toko Sovenir", current: 8200000, past: 7500000 },
      { nama: "Pendapatan Yaswar Cafe", current: 21000000, past: 18500000 },
      { nama: "Pendapatan Kios", current: 4500000, past: 4200000 },
      { nama: "Pendapatan Homestay", current: 12000000, past: 10000000 },
      { nama: "Pendapatan Jasa Fotografer", current: 3000000, past: 2500000 },
    ],
    beban: [
      { nama: "Biaya Gaji Karyawan", current: 18500000, past: 18500000 },
      { nama: "Biaya Cafe (Bahan Baku)", current: 8500000, past: 7200000 },
      { nama: "Biaya Toko & Kios", current: 4200000, past: 3800000 },
      { nama: "Biaya Listrik & Wifi", current: 1500000, past: 1500000 },
      { nama: "Biaya Transportasi & Driver", current: 2100000, past: 1800000 },
      { nama: "Biaya Perlengkapan & Kostum", current: 3500000, past: 2100000 },
      { nama: "Biaya Makan Karyawan", current: 4000000, past: 3800000 },
      { nama: "Biaya Reparasi & Lain-lain", current: 1200000, past: 900000 },
    ],
    pajak: { current: 0, past: 0 }, // Asumsi EMKM / Yayasan Sosial belum ditarik PPh Badan spesifik di periode ini
  };

  const dataNeraca = {
    asetLancar: [
      { nama: "KAS (Tunai & Bank)", current: 45000000, past: 38500000 },
      { nama: "Piutang Usaha & Karyawan", current: 5200000, past: 6500000 },
      { nama: "Persediaan Toko & Cafe", current: 18500000, past: 15000000 },
    ],
    asetTetap: [
      { nama: "Tanah & Bangunan", current: 350000000, past: 350000000 },
      { nama: "Inventaris & Peralatan", current: 45000000, past: 45000000 },
    ],
    liabilitas: [
      {
        nama: "Hutang Dagang (Jayapura, dll)",
        current: 8500000,
        past: 12000000,
      },
      { nama: "Hutang Bank (BRI, Mandiri)", current: 25000000, past: 27500000 },
      {
        nama: "Hutang Individu (Rahmad, Abraham)",
        current: 15000000,
        past: 15000000,
      },
    ],
    ekuitas: [
      { nama: "Modal Pemilik", current: 386500000, past: 386500000 },
      { nama: "Saldo Laba (Defisit)", current: 28700000, past: 14000000 },
    ],
  };

  const dataPerubahanModal = {
    modalAwal: { current: 400500000, past: 390000000 },
    labaBersih: { current: 14700000, past: 10500000 },
    prive: { current: 0, past: 0 },
    modalAkhir: { current: 415200000, past: 400500000 },
  };

  // --- HELPER KALKULASI ---
  const sumCurrent = (arr) => arr.reduce((acc, curr) => acc + curr.current, 0);
  const sumPast = (arr) => arr.reduce((acc, curr) => acc + curr.past, 0);
  const formatRp = (angka) =>
    new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      minimumFractionDigits: 0,
    }).format(angka);

  // Perhitungan Subtotal Laba Rugi
  const totalPendapatan = {
    current: sumCurrent(dataLabaRugi.pendapatan),
    past: sumPast(dataLabaRugi.pendapatan),
  };
  const totalBeban = {
    current: sumCurrent(dataLabaRugi.beban),
    past: sumPast(dataLabaRugi.beban),
  };
  const labaSebelumPajak = {
    current: totalPendapatan.current - totalBeban.current,
    past: totalPendapatan.past - totalBeban.past,
  };

  // Perhitungan Subtotal Neraca
  const totalAsetLancar = {
    current: sumCurrent(dataNeraca.asetLancar),
    past: sumPast(dataNeraca.asetLancar),
  };
  const totalAsetTetap = {
    current: sumCurrent(dataNeraca.asetTetap),
    past: sumPast(dataNeraca.asetTetap),
  };
  const totalAset = {
    current: totalAsetLancar.current + totalAsetTetap.current,
    past: totalAsetLancar.past + totalAsetTetap.past,
  };

  const totalLiabilitas = {
    current: sumCurrent(dataNeraca.liabilitas),
    past: sumPast(dataNeraca.liabilitas),
  };
  const totalEkuitas = {
    current: sumCurrent(dataNeraca.ekuitas),
    past: sumPast(dataNeraca.ekuitas),
  };
  const totalLiabilitasEkuitas = {
    current: totalLiabilitas.current + totalEkuitas.current,
    past: totalLiabilitas.past + totalEkuitas.past,
  };

  const handleCetak = () => {
    window.print();
  };

  return (
    <div className="max-w-6xl mx-auto pb-12 print:mx-0 print:pb-0 print:max-w-full">
      {/* HEADER WEB (Sembunyi saat cetak) */}
      <div className="print:hidden flex flex-col sm:flex-row justify-between items-start sm:items-end mb-8 gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Laporan Keuangan SAK EMKM
          </h1>
          <p className="text-gray-500 mt-1">
            Laporan komparatif standar akuntansi untuk Yayasan Rumah Etnik
            Papua.
          </p>
        </div>
        <div className="flex items-center gap-3">
          {/* Month picker */}
          <div className="flex items-center gap-2 bg-gray-50 border border-gray-200 px-3 py-2 rounded-lg">
            <div className="flex items-center gap-2">
              <label className="text-xs text-gray-500">Periode</label>
              <select
                aria-label="Bulan"
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(Number(e.target.value))}
                className="text-sm bg-transparent outline-none"
              >
                {monthNames.map((m, i) => (
                  <option key={m} value={i}>
                    {m}
                  </option>
                ))}
              </select>
              <select
                aria-label="Tahun"
                value={selectedYear}
                onChange={(e) => setSelectedYear(Number(e.target.value))}
                className="text-sm bg-transparent outline-none"
              >
                {Array.from({ length: 6 }).map((_, idx) => {
                  const y = defaultYear - 5 + idx + 1;
                  return (
                    <option key={y} value={y}>
                      {y}
                    </option>
                  );
                })}
              </select>
            </div>

            <div className="flex items-center gap-2 border-l border-gray-200 pl-3">
              <input
                id="compareToggle"
                type="checkbox"
                checked={compareEnabled}
                onChange={(e) => setCompareEnabled(e.target.checked)}
                className="w-4 h-4"
              />
              <label htmlFor="compareToggle" className="text-sm">
                Bandingkan dengan
              </label>

              {compareEnabled && (
                <>
                  <select
                    aria-label="Bulan Bandingan"
                    value={selectedCompareMonth}
                    onChange={(e) =>
                      setSelectedCompareMonth(Number(e.target.value))
                    }
                    className="text-sm bg-transparent outline-none"
                  >
                    {monthNames.map((m, i) => (
                      <option key={m} value={i}>
                        {m}
                      </option>
                    ))}
                  </select>
                  <select
                    aria-label="Tahun Bandingan"
                    value={selectedCompareYear}
                    onChange={(e) =>
                      setSelectedCompareYear(Number(e.target.value))
                    }
                    className="text-sm bg-transparent outline-none"
                  >
                    {Array.from({ length: 6 }).map((_, idx) => {
                      const y = defaultYear - 5 + idx + 1;
                      return (
                        <option key={y} value={y}>
                          {y}
                        </option>
                      );
                    })}
                  </select>
                </>
              )}
            </div>

            <button
              onClick={applyPeriode}
              className="ml-3 bg-blue-600 text-white px-3 py-1 rounded text-sm"
            >
              Terapkan
            </button>
          </div>

          <button
            onClick={handleCetak}
            className="flex items-center gap-2 bg-gray-900 hover:bg-black text-white px-5 py-2.5 rounded-lg text-sm font-bold transition-colors shadow-sm"
          >
            <Printer className="w-4 h-4" /> Cetak Buku Laporan
          </button>
        </div>
      </div>

      {/* TABS NAVIGASI (Sembunyi saat cetak) */}
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

      {/* AREA KERTAS CETAK */}
      <div className="bg-white print:bg-transparent rounded-xl shadow-sm print:shadow-none p-8 print:p-0 border border-gray-100 print:border-none min-h-[800px] text-gray-900">
        {/* ========================================================================= */}
        {/* 1. LAPORAN LABA RUGI */}
        {/* ========================================================================= */}
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
            <p className="text-sm font-semibold uppercase">
              PERIODE BULAN {periodeSekarang} DAN {periodeLalu}
            </p>
          </div>

          <table className="w-full text-[13px] border-collapse">
            <thead>
              <tr className="border-y-2 border-black">
                <th className="py-2 text-left w-1/2 uppercase font-bold">
                  Keterangan
                </th>
                <th className="py-2 text-right w-1/4 uppercase font-bold px-2">
                  {periodeSekarang}
                </th>
                <th className="py-2 text-right w-1/4 uppercase font-bold px-2">
                  {periodeLalu}
                </th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td colSpan="3" className="py-2 font-black uppercase underline">
                  PENDAPATAN:
                </td>
              </tr>
              {dataLabaRugi.pendapatan.map((item, idx) => (
                <tr key={idx}>
                  <td className="py-1 pl-4">{item.nama}</td>
                  <td className="py-1 text-right px-2">
                    {formatRp(item.current)}
                  </td>
                  <td className="py-1 text-right px-2">
                    {formatRp(item.past)}
                  </td>
                </tr>
              ))}
              <tr className="border-y border-gray-400 bg-gray-50">
                <td className="py-2 font-bold uppercase">JUMLAH PENDAPATAN</td>
                <td className="py-2 text-right font-bold px-2">
                  {formatRp(totalPendapatan.current)}
                </td>
                <td className="py-2 text-right font-bold px-2">
                  {formatRp(totalPendapatan.past)}
                </td>
              </tr>

              <tr>
                <td
                  colSpan="3"
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
                  <td className="py-1 text-right px-2">
                    {formatRp(item.past)}
                  </td>
                </tr>
              ))}
              <tr className="border-y border-gray-400 bg-gray-50">
                <td className="py-2 font-bold uppercase">JUMLAH BEBAN</td>
                <td className="py-2 text-right font-bold px-2">
                  {formatRp(totalBeban.current)}
                </td>
                <td className="py-2 text-right font-bold px-2">
                  {formatRp(totalBeban.past)}
                </td>
              </tr>

              <tr className="border-t-2 border-black">
                <td className="py-3 font-bold uppercase">LABA SEBELUM PAJAK</td>
                <td className="py-3 text-right font-bold px-2">
                  {formatRp(labaSebelumPajak.current)}
                </td>
                <td className="py-3 text-right font-bold px-2">
                  {formatRp(labaSebelumPajak.past)}
                </td>
              </tr>
              <tr>
                <td className="py-1 font-bold uppercase">
                  Beban Pajak Penghasilan
                </td>
                <td className="py-1 text-right px-2">
                  {formatRp(dataLabaRugi.pajak.current)}
                </td>
                <td className="py-1 text-right px-2">
                  {formatRp(dataLabaRugi.pajak.past)}
                </td>
              </tr>
              <tr className="border-y-4 border-double border-black bg-gray-100">
                <td className="py-3 font-black uppercase">
                  LABA (RUGI) SETELAH PAJAK PENGHASILAN
                </td>
                <td className="py-3 text-right font-black px-2">
                  {formatRp(
                    labaSebelumPajak.current - dataLabaRugi.pajak.current,
                  )}
                </td>
                <td className="py-3 text-right font-black px-2">
                  {formatRp(labaSebelumPajak.past - dataLabaRugi.pajak.past)}
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* ========================================================================= */}
        {/* 2. LAPORAN POSISI KEUANGAN (NERACA) */}
        {/* ========================================================================= */}
        <div
          className={`${activeTab === "neraca" ? "block" : "hidden"} print:block print:page-break-after-always mb-12`}
        >
          <div className="text-center mb-8 border-b-2 border-black pb-4">
            <h1 className="text-xl font-black uppercase tracking-widest">
              YAYASAN RUMAH ETNIK PAPUA
            </h1>
            <h2 className="text-lg font-bold uppercase mt-1">
              NERACA (LAPORAN POSISI KEUANGAN)
            </h2>
            <p className="text-sm font-semibold uppercase">
              PERIODE BULAN {periodeSekarang} DAN {periodeLalu}
            </p>
          </div>

          <table className="w-full text-[13px] border-collapse">
            <thead>
              <tr className="border-y-2 border-black">
                <th className="py-2 text-left w-1/2 uppercase font-bold">
                  ASET
                </th>
                <th className="py-2 text-right w-1/4 uppercase font-bold px-2">
                  {periodeSekarang}
                </th>
                <th className="py-2 text-right w-1/4 uppercase font-bold px-2">
                  {periodeLalu}
                </th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td colSpan="3" className="py-2 font-black uppercase underline">
                  ASET LANCAR
                </td>
              </tr>
              {dataNeraca.asetLancar.map((item, idx) => (
                <tr key={idx}>
                  <td className="py-1 pl-4">{item.nama}</td>
                  <td className="py-1 text-right px-2">
                    {formatRp(item.current)}
                  </td>
                  <td className="py-1 text-right px-2">
                    {formatRp(item.past)}
                  </td>
                </tr>
              ))}
              <tr className="border-y border-gray-400 bg-gray-50">
                <td className="py-2 font-bold uppercase">JUMLAH ASET LANCAR</td>
                <td className="py-2 text-right font-bold px-2">
                  {formatRp(totalAsetLancar.current)}
                </td>
                <td className="py-2 text-right font-bold px-2">
                  {formatRp(totalAsetLancar.past)}
                </td>
              </tr>

              <tr>
                <td
                  colSpan="3"
                  className="py-2 font-black uppercase underline pt-4"
                >
                  ASET TETAP
                </td>
              </tr>
              {dataNeraca.asetTetap.map((item, idx) => (
                <tr key={idx}>
                  <td className="py-1 pl-4">{item.nama}</td>
                  <td className="py-1 text-right px-2">
                    {formatRp(item.current)}
                  </td>
                  <td className="py-1 text-right px-2">
                    {formatRp(item.past)}
                  </td>
                </tr>
              ))}
              <tr className="border-y border-gray-400 bg-gray-50">
                <td className="py-2 font-bold uppercase">JUMLAH ASET TETAP</td>
                <td className="py-2 text-right font-bold px-2">
                  {formatRp(totalAsetTetap.current)}
                </td>
                <td className="py-2 text-right font-bold px-2">
                  {formatRp(totalAsetTetap.past)}
                </td>
              </tr>
              <tr className="border-y-4 border-double border-black bg-gray-100">
                <td className="py-3 font-black uppercase">TOTAL ASET</td>
                <td className="py-3 text-right font-black px-2">
                  {formatRp(totalAset.current)}
                </td>
                <td className="py-3 text-right font-black px-2">
                  {formatRp(totalAset.past)}
                </td>
              </tr>

              {/* LIABILITAS DAN EKUITAS */}
              <tr className="border-y-2 border-black mt-8">
                <th className="py-2 pt-6 text-left w-1/2 uppercase font-bold">
                  LIABILITAS
                </th>
                <th className="py-2 pt-6 text-right w-1/4 uppercase font-bold px-2"></th>
                <th className="py-2 pt-6 text-right w-1/4 uppercase font-bold px-2"></th>
              </tr>
              {dataNeraca.liabilitas.map((item, idx) => (
                <tr key={idx}>
                  <td className="py-1 pl-4">{item.nama}</td>
                  <td className="py-1 text-right px-2">
                    {formatRp(item.current)}
                  </td>
                  <td className="py-1 text-right px-2">
                    {formatRp(item.past)}
                  </td>
                </tr>
              ))}
              <tr className="border-y border-gray-400 bg-gray-50">
                <td className="py-2 font-bold uppercase">JUMLAH LIABILITAS</td>
                <td className="py-2 text-right font-bold px-2">
                  {formatRp(totalLiabilitas.current)}
                </td>
                <td className="py-2 text-right font-bold px-2">
                  {formatRp(totalLiabilitas.past)}
                </td>
              </tr>

              <tr>
                <td colSpan="3" className="py-2 font-black uppercase pt-4">
                  EKUITAS
                </td>
              </tr>
              {dataNeraca.ekuitas.map((item, idx) => (
                <tr key={idx}>
                  <td className="py-1 pl-4">{item.nama}</td>
                  <td className="py-1 text-right px-2">
                    {formatRp(item.current)}
                  </td>
                  <td className="py-1 text-right px-2">
                    {formatRp(item.past)}
                  </td>
                </tr>
              ))}
              <tr className="border-y border-gray-400 bg-gray-50">
                <td className="py-2 font-bold uppercase">JUMLAH EKUITAS</td>
                <td className="py-2 text-right font-bold px-2">
                  {formatRp(totalEkuitas.current)}
                </td>
                <td className="py-2 text-right font-bold px-2">
                  {formatRp(totalEkuitas.past)}
                </td>
              </tr>
              <tr className="border-y-4 border-double border-black bg-gray-100">
                <td className="py-3 font-black uppercase">
                  JUMLAH LIABILITAS DAN EKUITAS
                </td>
                <td className="py-3 text-right font-black px-2">
                  {formatRp(totalLiabilitasEkuitas.current)}
                </td>
                <td className="py-3 text-right font-black px-2">
                  {formatRp(totalLiabilitasEkuitas.past)}
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* ========================================================================= */}
        {/* 3. LAPORAN PERUBAHAN MODAL (EKUITAS) */}
        {/* ========================================================================= */}
        <div
          className={`${activeTab === "perubahanmodal" ? "block" : "hidden"} print:block print:page-break-after-always mb-12`}
        >
          <div className="text-center mb-8 border-b-2 border-black pb-4">
            <h1 className="text-xl font-black uppercase tracking-widest">
              YAYASAN RUMAH ETNIK PAPUA
            </h1>
            <h2 className="text-lg font-bold uppercase mt-1">
              LAPORAN PERUBAHAN MODAL
            </h2>
            <p className="text-sm font-semibold uppercase">
              PERIODE BULAN {periodeSekarang} DAN {periodeLalu}
            </p>
          </div>

          <table className="w-full text-[14px] border-collapse">
            <thead>
              <tr className="border-y-2 border-black">
                <th className="py-3 text-left w-1/2 uppercase font-bold">
                  Keterangan
                </th>
                <th className="py-3 text-right w-1/4 uppercase font-bold px-2">
                  {periodeSekarang}
                </th>
                <th className="py-3 text-right w-1/4 uppercase font-bold px-2">
                  {periodeLalu}
                </th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="py-3 font-bold uppercase">MODAL AWAL</td>
                <td className="py-3 text-right px-2">
                  {formatRp(dataPerubahanModal.modalAwal.current)}
                </td>
                <td className="py-3 text-right px-2">
                  {formatRp(dataPerubahanModal.modalAwal.past)}
                </td>
              </tr>
              <tr>
                <td className="py-3 font-medium">Laba (Rugi) Bersih</td>
                <td className="py-3 text-right px-2">
                  {formatRp(dataPerubahanModal.labaBersih.current)}
                </td>
                <td className="py-3 text-right px-2">
                  {formatRp(dataPerubahanModal.labaBersih.past)}
                </td>
              </tr>
              <tr className="border-y border-gray-400 bg-gray-50">
                <td className="py-3 font-bold uppercase">SUB. TOTAL</td>
                <td className="py-3 text-right font-bold px-2">
                  {formatRp(
                    dataPerubahanModal.modalAwal.current +
                      dataPerubahanModal.labaBersih.current,
                  )}
                </td>
                <td className="py-3 text-right font-bold px-2">
                  {formatRp(
                    dataPerubahanModal.modalAwal.past +
                      dataPerubahanModal.labaBersih.past,
                  )}
                </td>
              </tr>
              <tr>
                <td className="py-3 font-medium">Prive (Penarikan Modal)</td>
                <td className="py-3 text-right px-2 text-red-600">
                  ({formatRp(dataPerubahanModal.prive.current)})
                </td>
                <td className="py-3 text-right px-2 text-red-600">
                  ({formatRp(dataPerubahanModal.prive.past)})
                </td>
              </tr>
              <tr className="border-y-4 border-double border-black bg-gray-100">
                <td className="py-4 font-black uppercase">MODAL AKHIR</td>
                <td className="py-4 text-right font-black px-2">
                  {formatRp(dataPerubahanModal.modalAkhir.current)}
                </td>
                <td className="py-4 text-right font-black px-2">
                  {formatRp(dataPerubahanModal.modalAkhir.past)}
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* ========================================================================= */}
        {/* 4. CATATAN ATAS LAPORAN KEUANGAN (CALK) */}
        {/* ========================================================================= */}
        <div
          className={`${activeTab === "calk" ? "block" : "hidden"} print:block text-[13px] leading-relaxed text-justify mb-12`}
        >
          <div className="text-center mb-8 border-b-2 border-black pb-4">
            <h1 className="text-xl font-black uppercase tracking-widest">
              YAYASAN RUMAH ETNIK PAPUA
            </h1>
            <h2 className="text-lg font-bold uppercase mt-1">
              CATATAN ATAS LAPORAN KEUANGAN
            </h2>
            <p className="text-sm font-semibold uppercase">
              UNTUK PERIODE YANG BERAKHIR {periodeSekarang}
            </p>
          </div>

          <div className="space-y-6">
            <section>
              <h3 className="font-bold text-[14px] uppercase mb-1">1. UMUM</h3>
              <p>
                Yayasan Rumah Etnik Papua (REP) didirikan pada tanggal 21 Juni
                2021 dan disahkan berdasarkan SK Kemenkumham No:
                AHU-0003448.AH.01.04.Tahun 2026. Yayasan ini berkedudukan di Jl.
                Klamono Km. 21, Kab. Sorong, Papua Barat Daya. Kegiatan utama
                Yayasan berfokus pada pelestarian budaya dan pengelolaan
                pariwisata terpadu, yang terdiri dari berbagai unit usaha yakni:
                Yaswar Cafe, Homestay, Museum Budaya, Kios, Toko Sovenir, dan
                Penyewaan Kostum Adat. Manajemen diketuai oleh Bpk. Fricky
                Mosche Burdam dengan Pengelola Utama Ibu Mitshi Wanma.
              </p>
            </section>

            <section>
              <h3 className="font-bold text-[14px] uppercase mb-1">
                2. PERNYATAAN KEPATUHAN STANDAR AKUNTANSI
              </h3>
              <p>
                Laporan keuangan disusun berdasarkan Standar Akuntansi Keuangan
                Entitas Mikro, Kecil, dan Menengah (SAK EMKM) yang diterbitkan
                oleh Ikatan Akuntan Indonesia (IAI). Format penyajian neraca,
                laporan laba rugi, dan perubahan ekuitas telah disesuaikan agar
                relevan dengan karakteristik aktivitas nirlaba dan operasional
                unit usaha yayasan, dengan mengedepankan prinsip transparansi
                (keterbandingan bulan berjalan dan bulan sebelumnya).
              </p>
            </section>

            <section>
              <h3 className="font-bold text-[14px] uppercase mb-1">
                3. KEBIJAKAN AKUNTANSI YANG PENTING
              </h3>
              <ul className="list-disc pl-5 space-y-1 mt-1">
                <li>
                  <strong>Dasar Penyusunan:</strong> Laporan keuangan disusun
                  berdasarkan asumsi kelangsungan usaha (going concern) dan
                  disajikan dalam mata uang Rupiah (IDR). Pencatatan dilakukan
                  menggunakan konsep <em>Double-Entry Bookkeeping</em> melalui
                  Sistem Informasi Keuangan (SIK-REP).
                </li>
                <li>
                  <strong>Aset Lancar & KAS:</strong> KAS mencakup kas tunai di
                  tangan dan kas di bank yang tidak dibatasi penggunaannya.
                  Piutang usaha (Nikel Wanma, Mitshi Wanma, Rose Mayor,
                  Christian Wanma) dicatat sebesar nilai yang diharapkan dapat
                  direalisasikan.
                </li>
                <li>
                  <strong>Persediaan:</strong> Terdiri dari Persediaan Toko
                  Sovenir dan Bahan Baku Cafe, dicatat menggunakan metode harga
                  perolehan.
                </li>
                <li>
                  <strong>Aset Tetap:</strong> Terdiri dari Tanah dan Bangunan
                  (Tanah milik Abraham Fricky yang dihibahkan/digunakan untuk
                  yayasan) serta peralatan inventaris. Aset diakui sebesar biaya
                  perolehan awal.
                </li>
                <li>
                  <strong>Pengakuan Pendapatan dan Beban:</strong> Pendapatan
                  dari berbagai unit usaha diakui saat jasa/barang diserahkan
                  (basis akrual modifikasi). Beban diakui pada saat terjadinya.
                </li>
              </ul>
            </section>

            <section>
              <h3 className="font-bold text-[14px] uppercase mb-1">
                4. PENJELASAN POS-POS LAPORAN KEUANGAN
              </h3>
              <p>
                Rincian utang dan piutang periode berjalan mencerminkan komitmen
                antar pihak terkait operasional. Hutang meliputi Hutang Dagang
                Jayapura, Hutang Bank BRI & Mandiri, dan Hutang Individu (Rahmad
                Husain & Tanah Abraham Fricky). Modal Pemilik merupakan
                akumulasi modal awal pendirian dan donasi bersih yang
                diinvestasikan kembali untuk ekspansi layanan budaya REP.
              </p>
            </section>
          </div>

          {/* Tanda Tangan CALK */}
          <div className="flex justify-between mt-20 text-center font-bold">
            <div className="w-64">
              <p className="mb-24">
                Dibuat Oleh, <br />
                Sistem Informasi Keuangan (SIK-REP)
              </p>
              <p className="text-sm border-b border-black">RIDWAN ELLY</p>
              <p className="text-xs">IT / Pengembang Sistem</p>
            </div>
            <div className="w-64">
              <p className="mb-24">
                Menyetujui, <br />
                Pengelola Yayasan
              </p>
              <p className="text-sm border-b border-black">MITSHI WANMA</p>
              <p className="text-xs">Pendiri / Manajer Operasional</p>
            </div>
          </div>
        </div>
      </div>

      <style jsx global>{`
        @media print {
          @page {
            size: A4 portrait;
            margin: 1.5cm;
          }
          body {
            background-color: white !important;
            margin: 0 !important;
            padding: 0 !important;
            -webkit-print-color-adjust: exact;
            color: black;
          }

          /* Menyembunyikan sidebar navigasi jika ada */
          aside,
          nav,
          header {
            display: none !important;
          }
          .print\\:hidden {
            display: none !important;
          }

          /* Mereset layout main agar mengisi 100% halaman */
          html,
          body,
          #__next,
          main,
          div {
            margin-left: 0 !important;
            margin-right: 0 !important;
          }
          [class*="ml-"] {
            margin-left: 0 !important;
          }

          .print\\:block {
            display: block !important;
          }
          .print\\:page-break-after-always {
            page-break-after: always;
          }

          table th,
          table td {
            border-color: black !important;
          }
        }
      `}</style>
    </div>
  );
}
