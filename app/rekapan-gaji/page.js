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
  Send,
  TrendingUp,
  TrendingDown,
  Clock,
  Wallet,
  Eye
} from "lucide-react";
import html2canvas from "html2canvas-pro";
import { jsPDF } from "jspdf";

export default function RekapanGajiPage() {
  const [dataRekapan, setDataRekapan] = useState([]);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState({ type: "", message: "" });
  const [isSendingWa, setIsSendingWa] = useState(false);

  const dateNow = new Date();
  const [bulan, setBulan] = useState(dateNow.getMonth() + 1);
  const [tahun, setTahun] = useState(dateNow.getFullYear());

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [activeKaryawan, setActiveKaryawan] = useState(null);
  const [dataCetakList, setDataCetakList] = useState([]);
  const [isPreviewModalOpen, setIsPreviewModalOpen] = useState(false);
  const [previewData, setPreviewData] = useState(null);
  const [isCetakTabel, setIsCetakTabel] = useState(false);

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
      const catatanPanjarObj = {};

      snapPanjar.forEach((doc) => {
        const p = doc.data();
        const pDate = new Date(p.tanggal);
        if (pDate.getMonth() + 1 === bulan && pDate.getFullYear() === tahun) {
          rekapPanjar[p.karyawanId] = (rekapPanjar[p.karyawanId] || 0) + p.nominal;
          
          const tglStr = pDate.toLocaleDateString("id-ID", { day: '2-digit', month: '2-digit' });
          const noteText = `Panjar ${tglStr}: Rp${new Intl.NumberFormat("id-ID").format(p.nominal)}`;
          
          if (!catatanPanjarObj[p.karyawanId]) catatanPanjarObj[p.karyawanId] = [];
          catatanPanjarObj[p.karyawanId].push(noteText);
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
        const autoCatatanPanjar = catatanPanjarObj[karyawan.id] ? catatanPanjarObj[karyawan.id].join(", ") : "";

        if (tersimpan) {
          let mergedCatatan = tersimpan.catatan || "";
          if (autoCatatanPanjar && !mergedCatatan.includes("Panjar")) {
            mergedCatatan = mergedCatatan ? `${mergedCatatan} | ${autoCatatanPanjar}` : autoCatatanPanjar;
          }

          return {
            ...tersimpan,
            panjar: totalPanjarBulanIni,
            catatan: mergedCatatan,
            namaKaryawan: karyawan.nama,
            hariHadir: tersimpan.hariHadir || 28,
            noHp: karyawan.noHp || tersimpan.noHp || "",
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
          kasbonMakanan: 0,
          potonganBulanan: 0,
          panjar: totalPanjarBulanIni,
          tidakHadir: 0,
          catatan: autoCatatanPanjar,
          isSaved: false,
          noHp: karyawan.noHp || "",
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
    (Number(data.kasbonMakanan) || 0) +
    (Number(data.potonganBulanan) || 0) +
    (Number(data.panjar) || 0) +
    (Number(data.tidakHadir) || 0);
  const hitungNetGaji = (data) => hitungPemasukan(data) - hitungPotongan(data);

  const openModalKalkulator = (karyawan) => {
    setActiveKaryawan({
      ...karyawan,
      tidakHadir: karyawan.tidakHadir || 0,
      kasbonLama: karyawan.kasbonLama || 0,
      kasbonMakanan: karyawan.kasbonMakanan || 0,
      dendaKostum: karyawan.dendaKostum || 0,
      potonganBulanan: karyawan.potonganBulanan || 0,
      panjar: karyawan.panjar || 0,
      lembur: karyawan.lembur || 0,
      thr: karyawan.thr || 0,
      homestay: karyawan.homestay || 0,
      catatan: karyawan.catatan || "",
    });
    setIsModalOpen(true);
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setActiveKaryawan((prev) => {
      const updatedValue = name === "catatan" ? value : Number(value);
      const updated = { ...prev, [name]: updatedValue };
      
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
        tanggalKalkulasi: new Date().toISOString(),
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

  const handlePreviewSlip = (data) => {
    setPreviewData(data);
    setIsPreviewModalOpen(true);
  };

  const handleKirimWA = async (data) => {
    const defaultNoHp = data.noHp || "";
    const noHp = window.prompt(`Masukkan Nomor WA untuk ${data.namaKaryawan} (Contoh: 08123... / 628123...):`, defaultNoHp);
    if (!noHp) return; // User cancel

    setIsSendingWa(true);
    setStatus({ type: "success", message: "Memproses slip gaji & mengirim ke WA..." });
    try {
      // Tampilkan elemen slip-container untuk dirender (kita gunakan dataCetakList)
      setDataCetakList([data]);
      
      // Tunggu DOM update
      await new Promise((resolve) => setTimeout(resolve, 800));
      
      const slipElement = document.querySelector('.slip-container');
      if (!slipElement) throw new Error('Gagal merender slip gaji untuk PDF');

      // Manipulasi sementara agar bisa dicapture html2canvas
      const cetakArea = slipElement.parentElement;
      const originalClasses = cetakArea.className;
      cetakArea.className = "print:block font-sans text-black bg-white w-full fixed top-0 left-[-9999px] z-[-1]";

      // Buat canvas
      const canvas = await html2canvas(slipElement, { scale: 2, useCORS: true });
      
      // Kembalikan styling seperti semula
      cetakArea.className = originalClasses;
      // Bersihkan layar
      setDataCetakList([]);

      // Buat PDF
      const imgData = canvas.toDataURL('image/jpeg', 1.0);
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
      pdf.addImage(imgData, 'JPEG', 0, 0, pdfWidth, pdfHeight);
      
      const pdfBase64Data = pdf.output('datauristring');
      const base64String = pdfBase64Data.split(',')[1];
      const namaBulanArr = ["Januari","Februari","Maret","April","Mei","Juni","Juli","Agustus","September","Oktober","November","Desember"];

      // Kirim ke API Bot
      const response = await fetch('http://localhost:3001/api/kirim-slip', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nomor: noHp,
          pesan: `Halo ${data.namaKaryawan}, berikut adalah dokumen Slip Gaji Anda untuk periode ${namaBulanArr[bulan - 1]} ${tahun}. Terima kasih!`,
          fileName: `Slip_Gaji_${data.namaKaryawan.replace(/ /g, '_')}_${namaBulanArr[bulan - 1]}_${tahun}.pdf`,
          pdfBase64: base64String
        })
      });

      const result = await response.json();
      if(response.ok) {
        setStatus({ type: "success", message: `Slip gaji berhasil dikirim ke WhatsApp ${data.namaKaryawan}!` });
      } else {
        throw new Error(result.error || 'Gagal mengirim pesan dari Bot');
      }

    } catch (error) {
      console.error(error);
      setStatus({ type: "error", message: `Gagal mengirim WA: ${error.message}` });
      setDataCetakList([]); // Pastikan layar bersih jika error
    } finally {
      setIsSendingWa(false);
      setTimeout(() => setStatus({ type: "", message: "" }), 5000);
    }
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

  const totalGajiPokok = dataRekapan.reduce((acc, curr) => acc + (Number(curr.gajiPokok) || 0), 0);
  const totalTidakHadir = dataRekapan.reduce((acc, curr) => acc + (Number(curr.tidakHadir) || 0), 0);
  const totalKasbon = dataRekapan.reduce((acc, curr) => acc + (Number(curr.kasbonLama) || 0), 0);
  const totalTerlambat = dataRekapan.reduce((acc, curr) => acc + (Number(curr.dendaKostum) || 0), 0);
  const totalKasbonMakanan = dataRekapan.reduce((acc, curr) => acc + (Number(curr.kasbonMakanan) || 0), 0);
  const totalPotonganBulanan = dataRekapan.reduce((acc, curr) => acc + (Number(curr.potonganBulanan) || 0), 0);
  const totalPanjar = dataRekapan.reduce((acc, curr) => acc + (Number(curr.panjar) || 0), 0);
  const totalLembur = dataRekapan.reduce((acc, curr) => acc + (Number(curr.lembur) || 0), 0);
  const totalBonusVal = dataRekapan.reduce((acc, curr) => acc + (Number(curr.thr) || 0) + (Number(curr.homestay) || 0), 0);
  const totalPotonganKeseluruhan = dataRekapan.reduce((acc, curr) => acc + hitungPotongan(curr), 0);
  const totalNetGajiKeseluruhan = dataRekapan.reduce((acc, curr) => acc + hitungNetGaji(curr), 0);

  return (
    <div className={`w-full px-4 sm:px-6 lg:px-8 mx-auto pb-12 ${isCetakTabel ? "print:m-0 print:p-0" : "print:mx-0 print:px-0 print:pb-0"}`}>
      {/* ================================================================= */}
      {/* ================== BAGIAN UI WEB (TIDAK TERCETAK) ================== */}
      <div className={isCetakTabel ? "print:block w-full" : "print:hidden"}>
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end mb-8 gap-4 print:hidden">
          <div>
            <h1 className="text-2xl font-bold text-papua-primary">
              Rekapan & Slip Gaji
            </h1>
            <p className="text-gray-500 mt-1">
              Kalkulator akhir bulan dan penerbitan slip gaji PDF.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                setIsCetakTabel(true);
                setDataCetakList([]);
                setTimeout(() => {
                  window.print();
                  setTimeout(() => setIsCetakTabel(false), 500);
                }, 500);
              }}
              className="flex items-center gap-2 bg-papua-primary hover:bg-gray-800 text-white px-5 py-2.5 rounded-lg text-sm font-bold transition-colors shadow-sm print:hidden"
            >
              <Printer className="w-4 h-4" /> Cetak Tabel Rekapan
            </button>
            <button
              onClick={handleCetakSemua}
              className="flex items-center gap-2 bg-gray-800 hover:bg-gray-900 text-white px-5 py-2.5 rounded-lg text-sm font-bold transition-colors shadow-sm print:hidden"
            >
              <Printer className="w-4 h-4" /> Cetak Semua Slip
            </button>
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-gray-100 shadow-sm mb-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 print:hidden">
          <div className="flex items-center gap-2 text-gray-700 font-medium">
            <Calculator className="w-5 h-5 text-papua-primary" />
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
            className={`p-4 rounded-lg mb-6 flex items-center gap-3 border print:hidden ${
              status.type === "error"
                ? "bg-papua-red/10 border-papua-red/30 text-papua-red"
                : "bg-papua-green/10 border-papua-green/30 text-papua-green"
            }`}
          >
            <CheckCircle2 className="w-5 h-5 shrink-0" />
            <span className="text-sm font-medium">{status.message}</span>
          </div>
        )}

        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden print:border-none print:shadow-none print:w-full">
          <div className="overflow-x-auto print:overflow-visible">
            <table className="w-full text-left text-xs whitespace-nowrap print:text-[10px]">
              <thead className="bg-gray-800 text-white font-medium print:bg-gray-800 print:text-white">
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
                  <th className="px-4 py-4 text-right text-red-300">KASBON MAKANAN</th>
                  <th className="px-4 py-4 text-right text-red-300">POTONGAN BULANAN</th>
                  <th className="px-4 py-4 text-right">PANJAR</th>
                  <th className="px-4 py-4 text-right">LEMBUR</th>
                  <th className="px-4 py-4 text-right">BONUS</th>
                  <th className="px-4 py-4 text-right text-red-300">
                    TOTAL POTONGAN
                  </th>
                  <th className="px-4 py-4 text-right font-bold text-green-300">
                    NET GAJI
                  </th>
                  <th className="px-4 py-4 text-center rounded-tr-xl print:hidden">AKSI</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {loading ? (
                  <tr>
                    <td colSpan={14} className="px-6 py-12 text-center">
                      <RefreshCw className="w-6 h-6 text-papua-accent animate-spin mx-auto" />
                    </td>
                  </tr>
                ) : dataRekapan.length === 0 ? (
                  <tr>
                    <td
                      colSpan={14}
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
                        className={`hover:bg-papua-accent/10/50 transition-colors ${data.isSaved ? "bg-papua-green/10/30" : ""}`}
                      >
                        <td className="px-4 py-4 font-bold text-papua-primary">
                          {data.namaKaryawan}
                          {data.isSaved && (
                            <span className="ml-2 inline-block px-2 py-0.5 bg-papua-green/20 text-papua-green text-[9px] rounded-full">
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
                        <td className="px-4 py-4 text-right text-papua-red">
                          {formatRupiah(Number(data.tidakHadir) || 0)}
                        </td>
                        <td className="px-4 py-4 text-right text-papua-red">
                          {formatRupiah(Number(data.kasbonLama) || 0)}
                        </td>
                        <td className="px-4 py-4 text-right text-papua-red">
                          {formatRupiah(Number(data.dendaKostum) || 0)}
                        </td>
                        <td className="px-4 py-4 text-right text-papua-red">
                          {formatRupiah(Number(data.kasbonMakanan) || 0)}
                        </td>
                        <td className="px-4 py-4 text-right text-papua-red">
                          {formatRupiah(Number(data.potonganBulanan) || 0)}
                        </td>
                        <td className="px-4 py-4 text-right text-amber-600 font-medium">
                          {formatRupiah(Number(data.panjar) || 0)}
                        </td>
                        <td className="px-4 py-4 text-right text-papua-primary">
                          {formatRupiah(lemburVal)}
                        </td>
                        <td className="px-4 py-4 text-right text-papua-primary">
                          {formatRupiah(bonusVal)}
                        </td>
                        <td className="px-4 py-4 text-right text-papua-red">
                          {formatRupiah(totalPotonganKhusus)}
                        </td>
                        <td className="px-4 py-4 text-right font-bold text-papua-green text-sm">
                          {formatRupiah(netGaji)}
                        </td>
                        <td className="px-4 py-4 text-center flex items-center justify-center gap-2 print:hidden">
                          <button
                            onClick={() => openModalKalkulator(data)}
                            className="px-3 py-1.5 bg-blue-100 hover:bg-blue-200 text-papua-primary rounded text-xs font-bold transition-colors"
                          >
                            Kalkulasi
                          </button>

                          <button
                            onClick={() => handlePreviewSlip(data)}
                            disabled={!data.isSaved}
                            className="px-3 py-1.5 bg-purple-100 hover:bg-purple-200 text-purple-700 rounded text-xs font-bold transition-colors disabled:opacity-30 flex items-center gap-1 border border-purple-200"
                            title="Preview Slip Gaji"
                          >
                            <Eye className="w-3 h-3" /> Preview
                          </button>

                          <button
                            onClick={() => handleCetakSlip(data)}
                            disabled={!data.isSaved}
                            className="px-3 py-1.5 bg-gray-200 hover:bg-gray-300 text-gray-800 rounded text-xs font-bold transition-colors disabled:opacity-30 flex items-center gap-1 border border-gray-300"
                          >
                            <Printer className="w-3 h-3" /> Cetak
                          </button>

                          <button
                            onClick={() => handleKirimWA(data)}
                            disabled={!data.isSaved || isSendingWa}
                            className="px-3 py-1.5 bg-green-100 hover:bg-green-200 text-green-700 rounded text-xs font-bold transition-colors disabled:opacity-30 flex items-center gap-1 border border-green-300"
                          >
                            <Send className="w-3 h-3" /> {isSendingWa ? 'Mengirim...' : 'WA'}
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
                {!loading && dataRekapan.length > 0 && (
                  <tr className="bg-gray-800 text-white font-bold">
                    <td colSpan={2} className="px-4 py-4 text-center rounded-bl-xl">
                      TOTAL
                    </td>
                    <td className="px-4 py-4 text-right">
                      {formatRupiah(totalGajiPokok)}
                    </td>
                    <td className="px-4 py-4 text-right text-red-300">
                      {formatRupiah(totalTidakHadir)}
                    </td>
                    <td className="px-4 py-4 text-right text-red-300">
                      {formatRupiah(totalKasbon)}
                    </td>
                    <td className="px-4 py-4 text-right text-red-300">
                      {formatRupiah(totalTerlambat)}
                    </td>
                    <td className="px-4 py-4 text-right text-red-300">
                      {formatRupiah(totalKasbonMakanan)}
                    </td>
                    <td className="px-4 py-4 text-right text-red-300">
                      {formatRupiah(totalPotonganBulanan)}
                    </td>
                    <td className="px-4 py-4 text-right text-amber-300">
                      {formatRupiah(totalPanjar)}
                    </td>
                    <td className="px-4 py-4 text-right text-blue-300">
                      {formatRupiah(totalLembur)}
                    </td>
                    <td className="px-4 py-4 text-right text-blue-300">
                      {formatRupiah(totalBonusVal)}
                    </td>
                    <td className="px-4 py-4 text-right text-red-300">
                      {formatRupiah(totalPotonganKeseluruhan)}
                    </td>
                    <td className="px-4 py-4 text-right text-green-300">
                      {formatRupiah(totalNetGajiKeseluruhan)}
                    </td>
                    <td className="px-4 py-4 rounded-br-xl print:hidden"></td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {isModalOpen && activeKaryawan && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-0">
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-sm transition-opacity"
            onClick={() => setIsModalOpen(false)}
          />
          <form
            onSubmit={handleSimpanRekapan}
            className="relative bg-white rounded-2xl w-full max-w-2xl shadow-2xl z-10 overflow-hidden flex flex-col max-h-[90vh]"
          >
            {/* Header */}
            <div className="bg-gradient-to-r from-papua-primary to-gray-900 px-6 py-4 flex justify-between items-center shrink-0">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-white/20 rounded-lg">
                  <Calculator className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white">
                    Kalkulasi Gaji
                  </h3>
                  <p className="text-white/80 text-xs font-medium">{activeKaryawan.namaKaryawan} - {activeKaryawan.jabatan}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="text-white/70 hover:text-white hover:bg-white/20 p-2 rounded-full transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Body */}
            <div className="p-6 overflow-y-auto space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
                
                {/* PEMASUKAN SECTION */}
                <div className="space-y-4">
                  <div className="flex items-center gap-2 border-b border-gray-100 pb-2">
                    <TrendingUp className="w-4 h-4 text-papua-green" />
                    <h4 className="text-sm font-bold text-gray-700 uppercase tracking-wider">Pemasukan</h4>
                  </div>
                  
                  <div className="space-y-4">
                    <label className="block text-sm">
                      <div className="text-xs font-bold text-gray-600 mb-1">Hari Hadir (Hari)</div>
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                          <Clock className="w-4 h-4 text-gray-400" />
                        </div>
                        <input
                          name="hariHadir"
                          type="number"
                          value={activeKaryawan.hariHadir || 0}
                          onChange={handleInputChange}
                          className="pl-9 w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm bg-gray-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-papua-primary transition-all font-medium"
                        />
                      </div>
                      <div className="text-[10px] text-gray-400 mt-1">Potongan otomatis jika &lt; 28 hari</div>
                    </label>

                    <label className="block text-sm">
                      <div className="text-xs font-bold text-gray-600 mb-1">Lembur (Rp)</div>
                      <div className="relative">
                        <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-gray-500 font-medium text-sm pointer-events-none">Rp</span>
                        <input
                          name="lembur"
                          type="number"
                          value={activeKaryawan.lembur || 0}
                          onChange={handleInputChange}
                          className="pl-9 w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm bg-gray-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-papua-primary transition-all font-medium"
                        />
                      </div>
                    </label>

                    <label className="block text-sm">
                      <div className="text-xs font-bold text-gray-600 mb-1">Bonus THR (Rp)</div>
                      <div className="relative">
                        <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-gray-500 font-medium text-sm pointer-events-none">Rp</span>
                        <input
                          name="thr"
                          type="number"
                          value={activeKaryawan.thr || 0}
                          onChange={handleInputChange}
                          className="pl-9 w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm bg-gray-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-papua-primary transition-all font-medium"
                        />
                      </div>
                    </label>

                    <label className="block text-sm">
                      <div className="text-xs font-bold text-gray-600 mb-1">Bonus Homestay (Rp)</div>
                      <div className="relative">
                        <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-gray-500 font-medium text-sm pointer-events-none">Rp</span>
                        <input
                          name="homestay"
                          type="number"
                          value={activeKaryawan.homestay || 0}
                          onChange={handleInputChange}
                          className="pl-9 w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm bg-gray-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-papua-primary transition-all font-medium"
                        />
                      </div>
                    </label>
                  </div>
                </div>

                {/* POTONGAN SECTION */}
                <div className="space-y-4">
                  <div className="flex items-center gap-2 border-b border-gray-100 pb-2">
                    <TrendingDown className="w-4 h-4 text-papua-red" />
                    <h4 className="text-sm font-bold text-gray-700 uppercase tracking-wider">Potongan</h4>
                  </div>

                  <div className="space-y-4">
                    <label className="block text-sm">
                      <div className="text-xs font-bold text-gray-600 mb-1">Tidak Hadir (Rp)</div>
                      <div className="relative">
                        <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-gray-500 font-medium text-sm pointer-events-none">Rp</span>
                        <input
                          name="tidakHadir"
                          type="number"
                          value={activeKaryawan.tidakHadir || 0}
                          onChange={handleInputChange}
                          className="pl-9 w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm bg-gray-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-papua-primary transition-all font-medium"
                        />
                      </div>
                    </label>

                    <label className="block text-sm">
                      <div className="text-xs font-bold text-gray-600 mb-1">Kasbon (Rp)</div>
                      <div className="relative">
                        <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-gray-500 font-medium text-sm pointer-events-none">Rp</span>
                        <input
                          name="kasbonLama"
                          type="number"
                          value={activeKaryawan.kasbonLama || 0}
                          onChange={handleInputChange}
                          className="pl-9 w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm bg-gray-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-papua-primary transition-all font-medium"
                        />
                      </div>
                    </label>

                    <label className="block text-sm">
                      <div className="text-xs font-bold text-gray-600 mb-1">Terlambat / Kostum (Rp)</div>
                      <div className="relative">
                        <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-gray-500 font-medium text-sm pointer-events-none">Rp</span>
                        <input
                          name="dendaKostum"
                          type="number"
                          value={activeKaryawan.dendaKostum || 0}
                          onChange={handleInputChange}
                          className="pl-9 w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm bg-gray-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-papua-primary transition-all font-medium"
                        />
                      </div>
                    </label>

                    <label className="block text-sm">
                      <div className="text-xs font-bold text-gray-600 mb-1">Kasbon Makanan (Rp)</div>
                      <div className="relative">
                        <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-gray-500 font-medium text-sm pointer-events-none">Rp</span>
                        <input
                          name="kasbonMakanan"
                          type="number"
                          value={activeKaryawan.kasbonMakanan || 0}
                          onChange={handleInputChange}
                          className="pl-9 w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm bg-gray-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-papua-primary transition-all font-medium"
                        />
                      </div>
                    </label>

                    <label className="block text-sm">
                      <div className="text-xs font-bold text-gray-600 mb-1">Potongan Bulanan (Rp)</div>
                      <div className="relative">
                        <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-gray-500 font-medium text-sm pointer-events-none">Rp</span>
                        <input
                          name="potonganBulanan"
                          type="number"
                          value={activeKaryawan.potonganBulanan || 0}
                          onChange={handleInputChange}
                          className="pl-9 w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm bg-gray-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-papua-primary transition-all font-medium"
                        />
                      </div>
                    </label>

                    <label className="block text-sm">
                      <div className="text-xs font-bold text-gray-600 mb-1">Panjar (Rp)</div>
                      <div className="relative">
                        <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-gray-400 font-medium text-sm pointer-events-none">Rp</span>
                        <input
                          name="panjar"
                          type="number"
                          value={activeKaryawan.panjar || 0}
                          onChange={handleInputChange}
                          className="pl-9 w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm bg-gray-100 text-gray-500 outline-none cursor-not-allowed font-medium"
                          readOnly
                          title="Panjar dihitung otomatis dari data Panjar"
                        />
                      </div>
                    </label>
                  </div>
                </div>
              </div>

              {/* CATATAN SECTION */}
              <div className="space-y-4 pt-2">
                <label className="block text-sm">
                  <div className="text-xs font-bold text-gray-600 mb-1">Catatan (opsional)</div>
                  <textarea
                    name="catatan"
                    value={activeKaryawan.catatan || ""}
                    onChange={handleInputChange}
                    placeholder="Contoh: Pembayaran kasbon bulan lalu"
                    rows={2}
                    className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm bg-gray-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-papua-primary transition-all font-medium resize-none"
                  />
                </label>
              </div>

              {/* NET GAJI PREVIEW */}
              <div className="bg-gradient-to-r from-papua-green/10 to-transparent rounded-xl p-5 flex items-center justify-between border border-papua-green/20">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-papua-green/20 rounded-xl">
                    <Wallet className="w-6 h-6 text-papua-green" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-gray-800">Net Gaji (Preview)</h4>
                    <p className="text-xs font-medium text-gray-500 mt-0.5">Total penerimaan bersih karyawan</p>
                  </div>
                </div>
                <div className="text-2xl font-black text-papua-green tracking-tight">
                  {formatRupiah(hitungNetGaji(activeKaryawan))}
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="p-5 border-t border-gray-100 bg-gray-50/80 flex justify-end gap-3 shrink-0">
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="px-5 py-2.5 bg-white border border-gray-200 hover:bg-gray-50 hover:border-gray-300 text-gray-700 rounded-xl text-sm font-bold transition-all shadow-sm"
              >
                Batal
              </button>
              <button
                type="submit"
                className="px-5 py-2.5 bg-papua-primary hover:bg-gray-800 text-white rounded-xl text-sm font-bold transition-all shadow-sm flex items-center gap-2 hover:-translate-y-0.5"
              >
                <Save className="w-4 h-4" /> Simpan Kalkulasi
              </button>
            </div>
          </form>
        </div>
      )}

      {/* PREVIEW MODAL */}
      {isPreviewModalOpen && previewData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/60 backdrop-blur-sm print:hidden">
          <div className="bg-white rounded-2xl w-full max-w-4xl shadow-2xl overflow-hidden flex flex-col max-h-[95vh] relative">
            <div className="bg-gray-800 px-6 py-4 flex justify-between items-center shrink-0">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <Eye className="w-5 h-5 text-purple-300" /> Preview Slip Gaji
              </h3>
              <button
                onClick={() => setIsPreviewModalOpen(false)}
                className="text-white/70 hover:text-white hover:bg-white/20 p-2 rounded-full transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-4 sm:p-8 overflow-y-auto bg-gray-100 flex justify-center">
              <div className="bg-white p-4 sm:p-8 shadow-sm border border-gray-200 w-full max-w-[210mm] min-h-max sm:min-h-[297mm] text-black text-xs sm:text-sm">
                {(() => {
                  const cetakData = previewData;
                  const totalBonus = Number(cetakData.lembur) + Number(cetakData.thr) + Number(cetakData.homestay);
                  const gajiBruto = Number(cetakData.gajiPokok) + totalBonus;
                  const potonganList = [
                    { label: "Kasbon Lama", value: Number(cetakData.kasbonLama) || 0 },
                    { label: "Terlambat / Kostum", value: Number(cetakData.dendaKostum) || 0 },
                    { label: "Kasbon Makanan", value: Number(cetakData.kasbonMakanan) || 0 },
                    { label: "Potongan Bulanan", value: Number(cetakData.potonganBulanan) || 0 },
                    { label: "Panjar", value: Number(cetakData.panjar) || 0 },
                    { label: "Tidak Hadir", value: Number(cetakData.tidakHadir) || 0 },
                  ];
                  const totalPotong = potonganList.reduce((s, p) => s + p.value, 0);
                  const netGajiCetak = gajiBruto - totalPotong;
                  
                  const calculationDate = cetakData.tanggalKalkulasi ? new Date(cetakData.tanggalKalkulasi) : new Date();
                  const strCalculationDate = `${calculationDate.getDate()} ${namaBulan[calculationDate.getMonth()]} ${calculationDate.getFullYear()}`;
                  
                  const urutanKaryawan = dataRekapan.findIndex(k => k.idKaryawan === cetakData.idKaryawan) + 1;
                  const romawiBulan = ["I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "X", "XI", "XII"];
                  const strBulanRomawi = romawiBulan[(cetakData.periodeBulan || bulan) - 1];
                  const strTahun = (cetakData.periodeTahun || tahun).toString();
                  
                  return (
                    <div className="w-full pt-2 pb-4 px-2 sm:px-4">
                      <div className="flex items-center justify-between mb-4 border-b-2 border-[#8f3d1b] pb-3">
                        <div className="flex-1">
                          <h1 className="text-lg sm:text-[22px] font-bold mb-1">RUMAH ETNIK PAPUA</h1>
                          <p className="text-xs sm:text-sm mb-0.5">Aimas - Klamono KM 21, Kabupaten Sorong, Papua Barat Daya</p>
                          <p className="text-xs sm:text-sm">No. HP: 0821 9986 7918 | Email: officialrumahetnikpapua@gmail.com</p>
                        </div>
                        <div className="w-24 sm:w-36 flex justify-end hidden sm:flex">
                          <img
                            src="/logo.jpg"
                            alt="logo"
                            className="w-20 sm:w-28"
                            onError={(e) => {
                              e.target.style.display = "none";
                            }}
                          />
                        </div>
                      </div>

                      <div className="text-center mb-6">
                        <h2 className="text-xl sm:text-2xl font-bold text-[#8f3d1b]">SLIP GAJI KARYAWAN</h2>
                      </div>

                      <div className="flex justify-between mb-6 font-bold">
                        <div className="flex gap-2">
                          <span className="w-16 sm:w-20">Periode</span>
                          <span>: {namaBulan[cetakData.periodeBulan - 1] || namaBulan[bulan - 1]} {cetakData.periodeTahun || tahun}</span>
                        </div>
                        <div className="flex gap-2">
                          <span className="w-24 sm:w-28 text-right">No. Slip Gaji</span>
                          <span>: REP/SG/{strBulanRomawi}/{strTahun}/{urutanKaryawan}</span>
                        </div>
                      </div>

                      <div className="mb-6">
                        <div className="bg-[#8f3d1b] text-white font-bold px-3 py-1 inline-block mb-3 w-64 sm:w-72">
                          DATA KARYAWAN
                        </div>
                        <table className="w-full font-bold">
                          <tbody>
                            <tr>
                              <td className="w-24 sm:w-32 py-1">Nama</td>
                              <td className="w-4">:</td>
                              <td>{cetakData.namaKaryawan || "-"}</td>
                            </tr>
                            <tr>
                              <td className="py-1">Jabatan</td>
                              <td>:</td>
                              <td>{cetakData.jabatan || "KARYAWAN"}</td>
                            </tr>
                            <tr>
                              <td className="py-1">Ket. absen</td>
                              <td>:</td>
                              <td>{cetakData.hariHadir} Hari</td>
                            </tr>
                          </tbody>
                        </table>
                      </div>

                      <div className="flex flex-col sm:flex-row gap-4 sm:gap-6 mb-6">
                        <div className="flex-1">
                          <table className="w-full border-collapse border border-[#8f3d1b]">
                            <thead>
                              <tr className="bg-[#8f3d1b] text-white">
                                <th className="border border-[#8f3d1b] px-2 py-1.5 text-left font-bold">RINCIAN PENGHASILAN</th>
                                <th className="border border-[#8f3d1b] px-2 py-1.5 text-center w-24 sm:w-28 font-bold">JUMLAH</th>
                              </tr>
                            </thead>
                            <tbody>
                              <tr>
                                <td className="border border-[#8f3d1b] px-2 py-1.5">1. Gaji Pokok</td>
                                <td className="border border-[#8f3d1b] px-2 py-1.5 text-right">{formatAngkaSaja(Number(cetakData.gajiPokok) || 0)}</td>
                              </tr>
                              <tr>
                                <td className="border border-[#8f3d1b] px-2 py-1.5">2. Lembur</td>
                                <td className="border border-[#8f3d1b] px-2 py-1.5 text-right">{formatAngkaSaja(Number(cetakData.lembur) || 0)}</td>
                              </tr>
                              <tr>
                                <td className="border border-[#8f3d1b] px-2 py-1.5">3. Bonus / Insentif</td>
                                <td className="border border-[#8f3d1b] px-2 py-1.5 text-right">{formatAngkaSaja(Number(cetakData.thr || 0) + Number(cetakData.homestay || 0))}</td>
                              </tr>
                              <tr>
                                <td className="border border-[#8f3d1b] px-2 py-1.5 text-transparent">4.</td>
                                <td className="border border-[#8f3d1b] px-2 py-1.5 text-right text-transparent">0</td>
                              </tr>
                              <tr>
                                <td className="border border-[#8f3d1b] px-2 py-1.5 text-transparent">5.</td>
                                <td className="border border-[#8f3d1b] px-2 py-1.5 text-right text-transparent">0</td>
                              </tr>
                              <tr>
                                <td className="border border-[#8f3d1b] px-2 py-1.5 text-transparent">6.</td>
                                <td className="border border-[#8f3d1b] px-2 py-1.5 text-right text-transparent">0</td>
                              </tr>
                              <tr className="font-bold bg-orange-50/50">
                                <td className="border border-[#8f3d1b] px-2 py-1.5">TOTAL PENGHASILAN</td>
                                <td className="border border-[#8f3d1b] px-2 py-1.5 text-right">Rp{formatAngkaSaja(gajiBruto)}</td>
                              </tr>
                            </tbody>
                          </table>
                        </div>

                        <div className="flex-1">
                          <table className="w-full border-collapse border border-[#8f3d1b]">
                            <thead>
                              <tr className="bg-[#8f3d1b] text-white">
                                <th className="border border-[#8f3d1b] px-2 py-1.5 text-left font-bold">POTONGAN</th>
                                <th className="border border-[#8f3d1b] px-2 py-1.5 text-center w-24 sm:w-28 font-bold">JUMLAH</th>
                              </tr>
                            </thead>
                            <tbody>
                              <tr>
                                <td className="border border-[#8f3d1b] px-2 py-1.5">1. Kasbon Lama</td>
                                <td className="border border-[#8f3d1b] px-2 py-1.5 text-right">{formatAngkaSaja(Number(cetakData.kasbonLama) || 0)}</td>
                              </tr>
                              <tr>
                                <td className="border border-[#8f3d1b] px-2 py-1.5">2. Terlambat / Kostum</td>
                                <td className="border border-[#8f3d1b] px-2 py-1.5 text-right">{formatAngkaSaja(Number(cetakData.dendaKostum) || 0)}</td>
                              </tr>
                              <tr>
                                <td className="border border-[#8f3d1b] px-2 py-1.5">3. Kasbon Makanan</td>
                                <td className="border border-[#8f3d1b] px-2 py-1.5 text-right">{formatAngkaSaja(Number(cetakData.kasbonMakanan) || 0)}</td>
                              </tr>
                              <tr>
                                <td className="border border-[#8f3d1b] px-2 py-1.5">4. Potongan Bulanan</td>
                                <td className="border border-[#8f3d1b] px-2 py-1.5 text-right">{formatAngkaSaja(Number(cetakData.potonganBulanan) || 0)}</td>
                              </tr>
                              <tr>
                                <td className="border border-[#8f3d1b] px-2 py-1.5">5. Panjar</td>
                                <td className="border border-[#8f3d1b] px-2 py-1.5 text-right">{formatAngkaSaja(Number(cetakData.panjar) || 0)}</td>
                              </tr>
                              <tr>
                                <td className="border border-[#8f3d1b] px-2 py-1.5">6. Tidak Hadir</td>
                                <td className="border border-[#8f3d1b] px-2 py-1.5 text-right">{formatAngkaSaja(Number(cetakData.tidakHadir) || 0)}</td>
                              </tr>
                              <tr className="font-bold bg-orange-50/50">
                                <td className="border border-[#8f3d1b] px-2 py-1.5">TOTAL POTONGAN</td>
                                <td className="border border-[#8f3d1b] px-2 py-1.5 text-right">Rp{formatAngkaSaja(totalPotong)}</td>
                              </tr>
                            </tbody>
                          </table>
                        </div>
                      </div>

                      <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-4 text-[15px] font-bold gap-2">
                        <div className="text-[#8f3d1b] uppercase">TOTAL DITERIMA</div>
                        <div className="border border-[#8f3d1b] px-4 py-1.5 w-full sm:w-64 text-right text-[#8f3d1b]">
                          Rp{formatAngkaSaja(netGajiCetak)}
                        </div>
                      </div>

                      <div className="mb-4 flex flex-col sm:flex-row font-bold gap-2 sm:gap-0">
                        <span className="sm:mr-2">Terbilang:</span>
                        <span className="flex-1">( {terbilang(netGajiCetak)} Rupiah )</span>
                      </div>

                      <div className="flex justify-end mb-2">
                        <div className="text-center w-full sm:w-64">
                          <p>Sorong, {strCalculationDate}</p>
                          <div className="h-16"></div>
                        </div>
                      </div>

                      <div className="font-bold mt-2 flex flex-col sm:flex-row gap-2">
                        <span>Catatan :</span>
                        <span className="font-normal whitespace-pre-wrap">{cetakData.catatan || "-"}</span>
                      </div>
                    </div>
                  );
                })()}
              </div>
            </div>
          </div>
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
            { label: "Kasbon Lama", value: Number(cetakData.kasbonLama) || 0 },
            { label: "Terlambat / Kostum", value: Number(cetakData.dendaKostum) || 0 },
            { label: "Kasbon Makanan", value: Number(cetakData.kasbonMakanan) || 0 },
            { label: "Potongan Bulanan", value: Number(cetakData.potonganBulanan) || 0 },
            { label: "Panjar", value: Number(cetakData.panjar) || 0 },
            { label: "Tidak Hadir", value: Number(cetakData.tidakHadir) || 0 },
          ];
          const totalPotong = potonganList.reduce((s, p) => s + p.value, 0);
          const netGajiCetak = gajiBruto - totalPotong;
          
          const calculationDate = cetakData.tanggalKalkulasi ? new Date(cetakData.tanggalKalkulasi) : new Date();
          const strCalculationDate = `${calculationDate.getDate()} ${namaBulan[calculationDate.getMonth()]} ${calculationDate.getFullYear()}`;
          
          const urutanKaryawan = dataRekapan.findIndex(k => k.idKaryawan === cetakData.idKaryawan) + 1;
          const romawiBulan = ["I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "X", "XI", "XII"];
          const strBulanRomawi = romawiBulan[(cetakData.periodeBulan || bulan) - 1];
          const strTahun = (cetakData.periodeTahun || tahun).toString();
          
          return (
            <div key={idx} className="slip-container w-full pt-2 pb-4 px-4">
              <div className="flex items-center justify-between mb-4 border-b-2 border-[#8f3d1b] pb-3">
                <div className="flex-1">
                  <h1 className="text-[22px] font-bold mb-1">RUMAH ETNIK PAPUA</h1>
                  <p className="text-sm mb-0.5">Aimas - Klamono KM 21, Kabupaten Sorong, Papua Barat Daya</p>
                  <p className="text-sm">No. HP: 0821 9986 7918 | Email: officialrumahetnikpapua@gmail.com</p>
                </div>
                <div className="w-36 flex justify-end">
                  <img
                    src="/logo.jpg"
                    alt="logo"
                    className="w-28"
                    onError={(e) => {
                      e.target.style.display = "none";
                    }}
                  />
                </div>
              </div>

              <div className="text-center mb-6">
                <h2 className="text-2xl font-bold text-[#8f3d1b]">SLIP GAJI KARYAWAN</h2>
              </div>

              <div className="flex justify-between mb-6 text-sm font-bold">
                <div className="flex gap-2">
                  <span className="w-20">Periode</span>
                  <span>: {namaBulan[cetakData.periodeBulan - 1] || namaBulan[bulan - 1]} {cetakData.periodeTahun || tahun}</span>
                </div>
                <div className="flex gap-2">
                  <span className="w-28 text-right">No. Slip Gaji</span>
                  <span>: REP/SG/{strBulanRomawi}/{strTahun}/{urutanKaryawan}</span>
                </div>
              </div>

              <div className="mb-6 text-sm">
                <div className="bg-[#8f3d1b] text-white font-bold px-3 py-1 inline-block mb-3 w-72">
                  DATA KARYAWAN
                </div>
                <table className="w-full font-bold">
                  <tbody>
                    <tr>
                      <td className="w-32 py-1">Nama</td>
                      <td className="w-4">:</td>
                      <td>{cetakData.namaKaryawan || "-"}</td>
                    </tr>
                    <tr>
                      <td className="py-1">Jabatan</td>
                      <td>:</td>
                      <td>{cetakData.jabatan || "KARYAWAN"}</td>
                    </tr>
                    <tr>
                      <td className="py-1">Keterangan absen</td>
                      <td>:</td>
                      <td>{cetakData.hariHadir} Hari</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <div className="flex gap-6 mb-6 text-sm">
                <div className="flex-1">
                  <table className="w-full border-collapse border border-[#8f3d1b]">
                    <thead>
                      <tr className="bg-[#8f3d1b] text-white">
                        <th className="border border-[#8f3d1b] px-2 py-1.5 text-left font-bold">RINCIAN PENGHASILAN</th>
                        <th className="border border-[#8f3d1b] px-2 py-1.5 text-center w-28 font-bold">JUMLAH</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <td className="border border-[#8f3d1b] px-2 py-1.5">1. Gaji Pokok</td>
                        <td className="border border-[#8f3d1b] px-2 py-1.5 text-right">{formatAngkaSaja(Number(cetakData.gajiPokok) || 0)}</td>
                      </tr>
                      <tr>
                        <td className="border border-[#8f3d1b] px-2 py-1.5">2. Lembur</td>
                        <td className="border border-[#8f3d1b] px-2 py-1.5 text-right">{formatAngkaSaja(Number(cetakData.lembur) || 0)}</td>
                      </tr>
                      <tr>
                        <td className="border border-[#8f3d1b] px-2 py-1.5">3. Bonus / Insentif</td>
                        <td className="border border-[#8f3d1b] px-2 py-1.5 text-right">{formatAngkaSaja(Number(cetakData.thr || 0) + Number(cetakData.homestay || 0))}</td>
                      </tr>
                      <tr>
                        <td className="border border-[#8f3d1b] px-2 py-1.5 text-transparent">4.</td>
                        <td className="border border-[#8f3d1b] px-2 py-1.5 text-right text-transparent">0</td>
                      </tr>
                      <tr>
                        <td className="border border-[#8f3d1b] px-2 py-1.5 text-transparent">5.</td>
                        <td className="border border-[#8f3d1b] px-2 py-1.5 text-right text-transparent">0</td>
                      </tr>
                      <tr>
                        <td className="border border-[#8f3d1b] px-2 py-1.5 text-transparent">6.</td>
                        <td className="border border-[#8f3d1b] px-2 py-1.5 text-right text-transparent">0</td>
                      </tr>
                      <tr className="font-bold bg-orange-50/50">
                        <td className="border border-[#8f3d1b] px-2 py-1.5">TOTAL PENGHASILAN</td>
                        <td className="border border-[#8f3d1b] px-2 py-1.5 text-right">Rp{formatAngkaSaja(gajiBruto)}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                <div className="flex-1">
                  <table className="w-full border-collapse border border-[#8f3d1b]">
                    <thead>
                      <tr className="bg-[#8f3d1b] text-white">
                        <th className="border border-[#8f3d1b] px-2 py-1.5 text-left font-bold">POTONGAN</th>
                        <th className="border border-[#8f3d1b] px-2 py-1.5 text-center w-28 font-bold">JUMLAH</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <td className="border border-[#8f3d1b] px-2 py-1.5">1. Kasbon Lama</td>
                        <td className="border border-[#8f3d1b] px-2 py-1.5 text-right">{formatAngkaSaja(Number(cetakData.kasbonLama) || 0)}</td>
                      </tr>
                      <tr>
                        <td className="border border-[#8f3d1b] px-2 py-1.5">2. Terlambat / Kostum</td>
                        <td className="border border-[#8f3d1b] px-2 py-1.5 text-right">{formatAngkaSaja(Number(cetakData.dendaKostum) || 0)}</td>
                      </tr>
                      <tr>
                        <td className="border border-[#8f3d1b] px-2 py-1.5">3. Kasbon Makanan</td>
                        <td className="border border-[#8f3d1b] px-2 py-1.5 text-right">{formatAngkaSaja(Number(cetakData.kasbonMakanan) || 0)}</td>
                      </tr>
                      <tr>
                        <td className="border border-[#8f3d1b] px-2 py-1.5">4. Potongan Bulanan</td>
                        <td className="border border-[#8f3d1b] px-2 py-1.5 text-right">{formatAngkaSaja(Number(cetakData.potonganBulanan) || 0)}</td>
                      </tr>
                      <tr>
                        <td className="border border-[#8f3d1b] px-2 py-1.5">5. Panjar</td>
                        <td className="border border-[#8f3d1b] px-2 py-1.5 text-right">{formatAngkaSaja(Number(cetakData.panjar) || 0)}</td>
                      </tr>
                      <tr>
                        <td className="border border-[#8f3d1b] px-2 py-1.5">6. Tidak Hadir</td>
                        <td className="border border-[#8f3d1b] px-2 py-1.5 text-right">{formatAngkaSaja(Number(cetakData.tidakHadir) || 0)}</td>
                      </tr>
                      <tr className="font-bold bg-orange-50/50">
                        <td className="border border-[#8f3d1b] px-2 py-1.5">TOTAL POTONGAN</td>
                        <td className="border border-[#8f3d1b] px-2 py-1.5 text-right">Rp{formatAngkaSaja(totalPotong)}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="flex mb-4 text-[15px] font-bold items-center">
                <div className="text-[#8f3d1b] uppercase w-1/2">TOTAL DITERIMA</div>
                <div className="border border-[#8f3d1b] px-4 py-1.5 w-64 text-right text-[#8f3d1b]">
                  Rp{formatAngkaSaja(netGajiCetak)}
                </div>
              </div>

              <div className="mb-4 text-sm flex font-bold">
                <span className="mr-2">Terbilang:</span>
                <span className="flex-1">( {terbilang(netGajiCetak)} Rupiah )</span>
              </div>

              <div className="flex justify-end text-sm mb-2">
                <div className="text-center w-64">
                  <p>Sorong, {strCalculationDate}</p>
                  <div className="h-16"></div>
                </div>
              </div>

              <div className="text-sm font-bold mt-2 flex gap-2">
                <span>Catatan :</span>
                <span className="font-normal whitespace-pre-wrap">{cetakData.catatan || "-"}</span>
              </div>
            </div>
          );
        })}
      </div>

      <style jsx global>{`
        @media print {
          @page {
            size: ${isCetakTabel ? 'landscape' : 'portrait'};
            margin: ${isCetakTabel ? '0.5cm' : '1cm'};
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
          ${isCetakTabel ? `
          table {
            zoom: 0.65;
          }
          ` : ''}
        }
      `}</style>
    </div>
  );
}
