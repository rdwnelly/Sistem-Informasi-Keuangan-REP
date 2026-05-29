"use client";
import { useState, useEffect, useCallback } from "react";
import {
  collection,
  getDocs,
  doc,
  setDoc,
  query,
  where,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import {
  Calculator,
  Printer,
  CheckCircle2,
  RefreshCw,
  AlertCircle,
  Save,
  X,
  Plus,
} from "lucide-react";

export default function RekapanGajiPage() {
  const [dataRekapan, setDataRekapan] = useState([]);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState({ type: "", message: "" });

  const dateNow = new Date();
  const [bulan, setBulan] = useState(dateNow.getMonth() + 1);
  const [tahun, setTahun] = useState(dateNow.getFullYear());

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [activeKaryawan, setActiveKaryawan] = useState(null);
  const [dataCetakList, setDataCetakList] = useState([]);

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

  // PERBAIKAN FUNGSI TERBILANG (Anti "Nol Ribu")
  const terbilangHelper = (angka) => {
    const bilangan = [
      "",
      "Satu",
      "Dua",
      "Tiga",
      "Empat",
      "Lima",
      "Enam",
      "Tujuh",
      "Delapan",
      "Sembilan",
      "Sepuluh",
      "Sebelas",
    ];
    if (angka < 12) return " " + bilangan[angka];
    if (angka < 20) return terbilangHelper(angka - 10) + " Belas";
    if (angka < 100)
      return (
        terbilangHelper(Math.floor(angka / 10)) +
        " Puluh" +
        terbilangHelper(angka % 10)
      );
    if (angka < 200) return " Seratus" + terbilangHelper(angka - 100);
    if (angka < 1000)
      return (
        terbilangHelper(Math.floor(angka / 100)) +
        " Ratus" +
        terbilangHelper(angka % 100)
      );
    if (angka < 2000) return " Seribu" + terbilangHelper(angka - 1000);
    if (angka < 1000000)
      return (
        terbilangHelper(Math.floor(angka / 1000)) +
        " Ribu" +
        terbilangHelper(angka % 1000)
      );
    if (angka < 1000000000)
      return (
        terbilangHelper(Math.floor(angka / 1000000)) +
        " Juta" +
        terbilangHelper(angka % 1000000)
      );
    return "";
  };

  const terbilang = (angka) => {
    if (angka === 0) return "Nol";
    return terbilangHelper(angka).trim().replace(/\s+/g, " "); // Menghapus spasi ganda
  };

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const qKaryawan = query(
        collection(db, "karyawan"),
        where("statusAktif", "==", true),
      );
      const snapKaryawan = await getDocs(qKaryawan);
      const listKaryawan = [];
      snapKaryawan.forEach((doc) =>
        listKaryawan.push({ id: doc.id, ...doc.data() }),
      );

      const qPanjar = query(collection(db, "panjar"));
      const snapPanjar = await getDocs(qPanjar);
      const rekapPanjar = {};
      snapPanjar.forEach((doc) => {
        const p = doc.data();
        const pDate = new Date(p.tanggal);
        if (pDate.getMonth() + 1 === bulan && pDate.getFullYear() === tahun) {
          rekapPanjar[p.karyawanId] =
            (rekapPanjar[p.karyawanId] || 0) + p.nominal;
        }
      });

      const qGaji = query(
        collection(db, "gaji_bulanan"),
        where("periodeBulan", "==", bulan),
        where("periodeTahun", "==", tahun),
      );
      const snapGaji = await getDocs(qGaji);
      const mapGajiTersimpan = {};
      snapGaji.forEach((doc) => {
        mapGajiTersimpan[doc.data().idKaryawan] = doc.data();
      });

      const hasilGabungan = listKaryawan.map((karyawan) => {
        const tersimpan = mapGajiTersimpan[karyawan.id];
        const totalPanjarBulanIni = rekapPanjar[karyawan.id] || 0;

        if (tersimpan) {
          return {
            ...tersimpan,
            panjar: totalPanjarBulanIni,
            namaKaryawan: karyawan.nama,
            hariHadir: tersimpan.hariHadir || 28,
          };
        }

        return {
          idKaryawan: karyawan.id,
          namaKaryawan: karyawan.nama,
          jabatan: karyawan.jabatan || "KARYAWAN",
          hariHadir: 28,
          gajiPokok: karyawan.gajiPokok,
          lembur: 0,
          thr: 0,
          homestay: 0,
          dendaKostum: 0,
          izin: 0,
          kasbonLama: 0,
          panjar: totalPanjarBulanIni,
          tidakHadir: 0,
          isSaved: false,
        };
      });

      hasilGabungan.sort((a, b) =>
        a.namaKaryawan.localeCompare(b.namaKaryawan),
      );
      setDataRekapan(hasilGabungan);
    } catch (error) {
      console.error("Error fetching data:", error);
      setStatus({
        type: "error",
        message: "Gagal memuat sistem kalkulasi gaji.",
      });
    } finally {
      setLoading(false);
    }
  }, [bulan, tahun]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const hitungPemasukan = (data) =>
    (Number(data.gajiPokok) || 0) +
    (Number(data.lembur) || 0) +
    (Number(data.thr) || 0) +
    (Number(data.homestay) || 0);
  const hitungPotongan = (data) =>
    (Number(data.dendaKostum) || 0) +
    (Number(data.izin) || 0) +
    (Number(data.kasbonLama) || 0) +
    (Number(data.panjar) || 0) +
    (Number(data.tidakHadir) || 0);
  const hitungNetGaji = (data) => hitungPemasukan(data) - hitungPotongan(data);

  const openModalKalkulator = (karyawan) => {
    setActiveKaryawan({
      ...karyawan,
      tidakHadir: karyawan.tidakHadir || 0,
      kasbonLama: karyawan.kasbonLama || 0,
      dendaKostum: karyawan.dendaKostum || 0,
      panjar: karyawan.panjar || 0,
      lembur: karyawan.lembur || 0,
      thr: karyawan.thr || 0,
      homestay: karyawan.homestay || 0,
    });
    setIsModalOpen(true);
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setActiveKaryawan((prev) => {
      const updated = { ...prev, [name]: Number(value) };
      
      if (name === "hariHadir") {
        const hari = Number(value);
        if (hari < 28) {
          const potonganPerHari = updated.gajiPokok / 28;
          updated.tidakHadir = Math.round(potonganPerHari * (28 - hari));
        } else {
          updated.tidakHadir = 0;
        }
      }
      
      return updated;
    });
  };

  const handleSimpanRekapan = async (e) => {
    e.preventDefault();
    setStatus({ type: "info", message: "Menyimpan rekapan ke database..." });

    try {
      const docId = `${tahun}_${bulan}_${activeKaryawan.idKaryawan}`;
      const dataToSave = {
        ...activeKaryawan,
        periodeBulan: bulan,
        periodeTahun: tahun,
        netGaji: hitungNetGaji(activeKaryawan),
        isSaved: true,
      };
      await setDoc(doc(db, "gaji_bulanan", docId), dataToSave);
      setStatus({
        type: "success",
        message: "Rekapan gaji berhasil disimpan!",
      });
      setIsModalOpen(false);
      fetchData();
    } catch (error) {
      setStatus({ type: "error", message: "Gagal menyimpan rekapan." });
    }
    setTimeout(() => setStatus({ type: "", message: "" }), 3000);
  };

  const handleCetakSlip = (data) => {
    setDataCetakList([data]);
    setTimeout(() => window.print(), 500);
  };

  const handleCetakSemua = () => {
    const savedData = dataRekapan.filter((d) => d.isSaved);
    if (savedData.length === 0) {
      alert("Belum ada data gaji yang disimpan di bulan ini!");
      return;
    }
    setDataCetakList(savedData);
    setTimeout(() => window.print(), 500);
  };

  const formatRupiah = (angka) =>
    new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      minimumFractionDigits: 0,
    }).format(angka);
  const formatAngkaSaja = (angka) =>
    new Intl.NumberFormat("id-ID").format(angka);

  return (
    <div className="max-w-6xl mx-auto pb-12 print:mx-0 print:pb-0">
      {/* ================================================================= */}
      {/* ================== BAGIAN UI WEB (TIDAK TERCETAK) ================== */}
      <div className="print:hidden">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end mb-8 gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              Rekapan & Slip Gaji
            </h1>
            <p className="text-gray-500 mt-1">
              Kalkulator akhir bulan dan penerbitan slip gaji PDF.
            </p>
          </div>
          <button
            onClick={handleCetakSemua}
            className="flex items-center gap-2 bg-gray-800 hover:bg-gray-900 text-white px-5 py-2.5 rounded-lg text-sm font-bold transition-colors shadow-sm"
          >
            <Printer className="w-4 h-4" /> Cetak Semua Slip
          </button>
        </div>

        <div className="bg-white p-5 rounded-xl border border-gray-100 shadow-sm mb-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="flex items-center gap-2 text-gray-700 font-medium">
            <Calculator className="w-5 h-5 text-blue-600" />
            <span>Kalkulasi Periode:</span>
          </div>
          <div className="flex items-center gap-3">
            <select
              value={bulan}
              onChange={(e) => setBulan(Number(e.target.value))}
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm bg-gray-50 font-bold outline-none"
            >
              {namaBulan.map((nama, idx) => (
                <option key={idx} value={idx + 1}>
                  {nama}
                </option>
              ))}
            </select>
            <select
              value={tahun}
              onChange={(e) => setTahun(Number(e.target.value))}
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm bg-gray-50 font-bold outline-none"
            >
              {[2024, 2025, 2026, 2027].map((thn) => (
                <option key={thn} value={thn}>
                  {thn}
                </option>
              ))}
            </select>
          </div>
        </div>

        {status.message && (
          <div
            className={`p-4 rounded-lg mb-6 flex items-center gap-3 border ${
              status.type === "error"
                ? "bg-red-50 border-red-200 text-red-700"
                : "bg-green-50 border-green-200 text-green-700"
            }`}
          >
            <CheckCircle2 className="w-5 h-5 shrink-0" />
            <span className="text-sm font-medium">{status.message}</span>
          </div>
        )}

        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs whitespace-nowrap">
              <thead className="bg-gray-800 text-white font-medium">
                <tr>
                  <th className="px-4 py-4 rounded-tl-xl">NAMA KARYAWAN</th>
                  <th className="px-4 py-4 text-center">ABSEN</th>
                  <th className="px-4 py-4 text-right">GAJI POKOK</th>
                  <th className="px-4 py-4 text-right text-red-300">
                    TIDAK HADIR
                  </th>
                  <th className="px-4 py-4 text-right text-red-300">KASBON</th>
                  <th className="px-4 py-4 text-right text-red-300">
                    TERLAMBAT
                  </th>
                  <th className="px-4 py-4 text-right">PANJAR</th>
                  <th className="px-4 py-4 text-right">LEMBUR</th>
                  <th className="px-4 py-4 text-right">BONUS</th>
                  <th className="px-4 py-4 text-right text-red-300">
                    TOTAL POTONGAN
                  </th>
                  <th className="px-4 py-4 text-right font-bold text-green-300">
                    NET GAJI
                  </th>
                  <th className="px-4 py-4 text-center rounded-tr-xl">AKSI</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {loading ? (
                  <tr>
                    <td colSpan={12} className="px-6 py-12 text-center">
                      <RefreshCw className="w-6 h-6 text-blue-500 animate-spin mx-auto" />
                    </td>
                  </tr>
                ) : dataRekapan.length === 0 ? (
                  <tr>
                    <td
                      colSpan={12}
                      className="px-6 py-8 text-center text-gray-500"
                    >
                      Tidak ada data karyawan aktif.
                    </td>
                  </tr>
                ) : (
                  dataRekapan.map((data) => {
                    const lemburVal = Number(data.lembur) || 0;
                    const bonusVal =
                      (Number(data.thr) || 0) + (Number(data.homestay) || 0);
                    const totalBonus = lemburVal + bonusVal;
                    const totalPotonganKhusus = hitungPotongan(data);
                    const netGaji = hitungNetGaji(data);
                    return (
                      <tr
                        key={data.idKaryawan}
                        className={`hover:bg-blue-50/50 transition-colors ${data.isSaved ? "bg-green-50/30" : ""}`}
                      >
                        <td className="px-4 py-4 font-bold text-gray-900">
                          {data.namaKaryawan}
                          {data.isSaved && (
                            <span className="ml-2 inline-block px-2 py-0.5 bg-green-100 text-green-700 text-[9px] rounded-full">
                              TERSIMPAN
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-4 text-center font-medium text-gray-600">
                          {data.hariHadir} Hr
                        </td>
                        <td className="px-4 py-4 text-right text-gray-700">
                          {formatRupiah(data.gajiPokok)}
                        </td>
                        <td className="px-4 py-4 text-right text-red-600">
                          {formatRupiah(Number(data.tidakHadir) || 0)}
                        </td>
                        <td className="px-4 py-4 text-right text-red-600">
                          {formatRupiah(Number(data.kasbonLama) || 0)}
                        </td>
                        <td className="px-4 py-4 text-right text-red-600">
                          {formatRupiah(Number(data.dendaKostum) || 0)}
                        </td>
                        <td className="px-4 py-4 text-right text-amber-600 font-medium">
                          {formatRupiah(Number(data.panjar) || 0)}
                        </td>
                        <td className="px-4 py-4 text-right text-blue-600">
                          {formatRupiah(lemburVal)}
                        </td>
                        <td className="px-4 py-4 text-right text-blue-600">
                          {formatRupiah(bonusVal)}
                        </td>
                        <td className="px-4 py-4 text-right text-red-600">
                          {formatRupiah(totalPotonganKhusus)}
                        </td>
                        <td className="px-4 py-4 text-right font-bold text-green-700 text-sm">
                          {formatRupiah(netGaji)}
                        </td>
                        <td className="px-4 py-4 text-center flex items-center justify-center gap-2">
                          <button
                            onClick={() => openModalKalkulator(data)}
                            className="px-3 py-1.5 bg-blue-100 hover:bg-blue-200 text-blue-700 rounded text-xs font-bold transition-colors"
                          >
                            Kalkulasi
                          </button>

                          <button
                            onClick={() => handleCetakSlip(data)}
                            disabled={!data.isSaved}
                            className="px-3 py-1.5 bg-gray-200 hover:bg-gray-300 text-gray-800 rounded text-xs font-bold transition-colors disabled:opacity-30 flex items-center gap-1 border border-gray-300"
                          >
                            <Printer className="w-3 h-3" /> Cetak
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {isModalOpen && activeKaryawan && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div
            className="fixed inset-0 bg-black/40"
            onClick={() => setIsModalOpen(false)}
          />
          <form
            onSubmit={handleSimpanRekapan}
            className="relative bg-white rounded-lg p-6 w-full max-w-lg shadow-lg z-10"
          >
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-bold">
                Kalkulasi Gaji - {activeKaryawan.namaKaryawan}
              </h3>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="text-gray-500"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <label className="text-sm">
                <div className="text-xs text-gray-600 font-bold text-blue-600">Hari Hadir (Hari)</div>
                <input
                  name="hariHadir"
                  type="number"
                  value={activeKaryawan.hariHadir || 0}
                  onChange={handleInputChange}
                  className="mt-1 w-full border border-blue-300 rounded-md px-3 py-2 text-sm bg-blue-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <div className="text-[10px] text-gray-400 mt-0.5">Potongan otomatis jika &lt; 28 hari</div>
              </label>

              <label className="text-sm">
                <div className="text-xs text-gray-600">Tidak Hadir (Rp)</div>
                <input
                  name="tidakHadir"
                  type="number"
                  value={activeKaryawan.tidakHadir || 0}
                  onChange={handleInputChange}
                  className="mt-1 w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                />
              </label>

              <label className="text-sm">
                <div className="text-xs text-gray-600">Lembur (Rp)</div>
                <input
                  name="lembur"
                  type="number"
                  value={activeKaryawan.lembur || 0}
                  onChange={handleInputChange}
                  className="mt-1 w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                />
              </label>

              <label className="text-sm">
                <div className="text-xs text-gray-600">Bonus THR (Rp)</div>
                <input
                  name="thr"
                  type="number"
                  value={activeKaryawan.thr || 0}
                  onChange={handleInputChange}
                  className="mt-1 w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                />
              </label>

              <label className="text-sm">
                <div className="text-xs text-gray-600">Bonus Homestay (Rp)</div>
                <input
                  name="homestay"
                  type="number"
                  value={activeKaryawan.homestay || 0}
                  onChange={handleInputChange}
                  className="mt-1 w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                />
              </label>

              <label className="text-sm">
                <div className="text-xs text-gray-600">Kasbon (Rp)</div>
                <input
                  name="kasbonLama"
                  type="number"
                  value={activeKaryawan.kasbonLama || 0}
                  onChange={handleInputChange}
                  className="mt-1 w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                />
              </label>

              <label className="text-sm">
                <div className="text-xs text-gray-600">Terlambat / Kostum (Rp)</div>
                <input
                  name="dendaKostum"
                  type="number"
                  value={activeKaryawan.dendaKostum || 0}
                  onChange={handleInputChange}
                  className="mt-1 w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                />
              </label>

              <label className="text-sm">
                <div className="text-xs text-gray-600">Panjar (Rp)</div>
                <input
                  name="panjar"
                  type="number"
                  value={activeKaryawan.panjar || 0}
                  onChange={handleInputChange}
                  className="mt-1 w-full border border-gray-300 rounded-md px-3 py-2 text-sm bg-gray-50 text-gray-500"
                  readOnly
                  title="Panjar dihitung otomatis dari data Panjar"
                />
              </label>

              <div className="text-sm col-span-2 mt-2 pt-4 border-t border-gray-100 flex justify-between items-center">
                <div className="text-xs text-gray-600 uppercase font-bold">Net Gaji (Preview)</div>
                <div className="text-lg font-bold text-green-700">
                  {formatRupiah(hitungNetGaji(activeKaryawan))}
                </div>
              </div>
            </div>

            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-md text-sm"
              >
                Batal
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md text-sm font-bold"
              >
                <Save className="inline-block w-4 h-4 mr-2 -mt-0.5" /> Simpan
              </button>
            </div>
          </form>
        </div>
      )}

      {/* CETAK AREA (print only) */}
      <div className="hidden print:block font-sans text-black bg-white w-full">
        {dataCetakList.map((cetakData, idx) => {
          const totalBonus =
            Number(cetakData.lembur) +
            Number(cetakData.thr) +
            Number(cetakData.homestay);
          const gajiBruto = Number(cetakData.gajiPokok) + totalBonus;
          const potonganList = [
            { label: "PANJAR", value: Number(cetakData.panjar) || 0 },
            { label: "TIDAK HADIR", value: Number(cetakData.tidakHadir) || 0 },
            { label: "KASBON", value: Number(cetakData.kasbonLama) || 0 },
            { label: "TERLAMBAT", value: Number(cetakData.dendaKostum) || 0 },
          ];
          const totalPotong = potonganList.reduce((s, p) => s + p.value, 0);
          const netGajiCetak = gajiBruto - totalPotong;
          const todayDate = new Date();
          return (
            <div key={idx} className="slip-container w-full pt-4 pb-8 px-4">
              <div className="flex items-center justify-between mb-2">
                <div className="w-36">
                  {/* Placeholder logo area */}
                  <img
                    src="/logo.jpg"
                    alt="logo"
                    className="w-28"
                    onError={(e) => {
                      e.target.style.display = "none";
                    }}
                  />
                </div>
                <div className="flex-1 text-center">
                  <h2 className="text-2xl font-bold tracking-tight">
                    SLIP GAJI BULAN{" "}
                    {namaBulan[cetakData.periodeBulan - 1] ||
                      namaBulan[bulan - 1]}{" "}
                    {cetakData.periodeTahun || tahun}
                  </h2>
                </div>
                <div className="w-36" />
              </div>

              <hr className="border-t-2 border-black mb-4" />

              <p className="mb-4">
                Yang Bertanda Tangan Dibawah ini Menerangkan Bahwa :
              </p>

              <table className="w-full mb-4 text-base">
                <tbody>
                  <tr>
                    <td className="w-28 font-semibold">NAMA</td>
                    <td className="w-3">:</td>
                    <td className="font-medium">
                      {cetakData.namaKaryawan || "-"}
                    </td>
                  </tr>
                  <tr>
                    <td className="font-semibold">JABATAN</td>
                    <td>:</td>
                    <td className="font-medium">
                      {cetakData.jabatan || "KARYAWAN"}
                    </td>
                  </tr>
                  <tr>
                    <td className="font-semibold">KET. ABSEN</td>
                    <td>:</td>
                    <td className="font-medium">{cetakData.hariHadir} HARI</td>
                  </tr>
                </tbody>
              </table>

              <div className="border border-black mb-2">
                <div className="bg-white/90 px-3 py-2 font-bold uppercase">
                  PENERIMAAN
                </div>
                <div className="px-3 py-3">
                  <table className="w-full text-base">
                    <tbody>
                      <tr>
                        <td className="w-44">GAJI POKOK</td>
                        <td className="w-3">:</td>
                        <td className="text-right font-medium">
                          Rp {formatAngkaSaja(Number(cetakData.gajiPokok) || 0)}
                        </td>
                      </tr>
                      <tr>
                        <td>LEMBUR</td>
                        <td>:</td>
                        <td className="text-right">
                          Rp {formatAngkaSaja(Number(cetakData.lembur) || 0)}
                        </td>
                      </tr>
                      <tr>
                        <td>BONUS</td>
                        <td>:</td>
                        <td className="text-right">
                          Rp{" "}
                          {formatAngkaSaja(
                            Number(cetakData.thr || 0) +
                              Number(cetakData.homestay || 0),
                          )}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
                <div className="border-t border-black px-3 py-2 flex justify-between font-bold text-lg">
                  <div>GAJI BRUTO</div>
                  <div>Rp {formatAngkaSaja(gajiBruto)}</div>
                </div>
              </div>

              <div className="border border-black mb-4">
                <div className="bg-white/90 px-3 py-2 font-bold uppercase">
                  SUB.POTONGAN
                </div>
                <div className="px-3 py-3">
                  <table className="w-full text-sm">
                    <tbody>
                      {potonganList.map((p) => (
                        <tr key={p.label}>
                          <td className="w-44">{p.label}</td>
                          <td className="w-3">:</td>
                          <td className="text-right">
                            Rp {formatAngkaSaja(p.value)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="border-t border-black px-3 py-2 flex justify-between font-bold text-lg">
                  <div>TOTAL POTONGAN</div>
                  <div>Rp {formatAngkaSaja(totalPotong)}</div>
                </div>
              </div>

              <div className="flex justify-between items-start mb-8">
                <div>
                  <div className="font-bold">TOTAL BERSIH</div>
                  <div className="text-lg font-bold">
                    Rp {formatAngkaSaja(netGajiCetak)}
                  </div>
                </div>
                <div className="italic max-w-xs">
                  TERBILANG : {terbilang(netGajiCetak)} Rupiah
                </div>
              </div>

              <div className="flex justify-end mt-12 text-right">
                <div className="w-64 text-center">
                  <div className="mb-8">
                    {todayDate.getDate()} {namaBulan[todayDate.getMonth()]}{" "}
                    {todayDate.getFullYear()}
                  </div>
                  <div className="text-lg font-bold">MITSI WANMA</div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <style jsx global>{`
        @media print {
          @page {
            size: portrait;
            margin: 1.5cm;
          }
          body {
            background-color: white !important;
            margin: 0 !important;
            padding: 0 !important;
            -webkit-print-color-adjust: exact;
          }
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
          aside,
          nav,
          header {
            display: none !important;
          }
          .print\\:hidden {
            display: none !important;
          }
          .slip-container {
            page-break-after: always;
            width: 100% !important;
            max-width: 100% !important;
            padding: 10px 0;
          }
          .slip-container:last-child {
            page-break-after: auto;
          }
        }
      `}</style>
    </div>
  );
}
