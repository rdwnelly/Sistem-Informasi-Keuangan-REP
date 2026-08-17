"use client";
import { useState, useEffect, useCallback } from "react";
import {
  collection,
  getDocs,
  getDoc,
  doc,
  setDoc,
  addDoc,
  updateDoc,
  deleteDoc,
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
  Eye,
  PlusCircle,
  Trash2,
  Pencil,
  Sliders
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

  // Dynamic Custom Salary Items & Standard Component Labels
  const [customKomponen, setCustomKomponen] = useState([]);
  const [isManageItemModalOpen, setIsManageItemModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("custom"); // "custom" | "standard"
  const [newNamaItem, setNewNamaItem] = useState("");
  const [newTipeItem, setNewTipeItem] = useState("pemasukan"); // "pemasukan" | "potongan"
  const [editingItem, setEditingItem] = useState(null); // { id, nama, tipe }
  const [isAddingItem, setIsAddingItem] = useState(false);

  const defaultStandardLabels = {
    lembur: "Lembur",
    thr: "Bonus THR",
    homestay: "Bonus Homestay",
    tidakHadir: "Tidak Hadir",
    kasbonLama: "Kasbon",
    dendaKostum: "Terlambat / Kostum",
    kasbonMakanan: "Kasbon Makanan",
    potonganBulanan: "Potongan Bulanan",
    panjar: "Panjar",
  };
  const [standardLabels, setStandardLabels] = useState(defaultStandardLabels);
  const [editingStandardKey, setEditingStandardKey] = useState(null);
  const [editingStandardValue, setEditingStandardValue] = useState("");

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
      // Ambil daftar komponen gaji custom
      const snapCustom = await getDocs(collection(db, "komponen_gaji_custom"));
      const listCustom = [];
      snapCustom.forEach((docSnap) => {
        listCustom.push({ id: docSnap.id, ...docSnap.data() });
      });
      setCustomKomponen(listCustom);

      // Ambil kustomisasi label komponen standar (bawaan sistem)
      const snapLabels = await getDoc(doc(db, "pengaturan_gaji", "standard_labels"));
      if (snapLabels.exists()) {
        setStandardLabels((prev) => ({ ...prev, ...snapLabels.data() }));
      }

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
            customItems: tersimpan.customItems || {},
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
          customItems: {},
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

  const handleSaveStandardLabel = async (key, val) => {
    const newName = val.trim() || defaultStandardLabels[key];
    const updated = { ...standardLabels, [key]: newName };
    setStandardLabels(updated);
    setEditingStandardKey(null);
    try {
      await setDoc(doc(db, "pengaturan_gaji", "standard_labels"), updated, { merge: true });
      setStatus({
        type: "success",
        message: `Label komponen bawaan "${newName}" berhasil diperbarui!`,
      });
    } catch (err) {
      console.error("Error saving standard label:", err);
      setStatus({ type: "error", message: "Gagal menyimpan label komponen." });
    }
    setTimeout(() => setStatus({ type: "", message: "" }), 3000);
  };

  const getSlipLists = (cetakData) => {
    const customPemasukanItems = customKomponen.filter((k) => k.tipe === "pemasukan");
    const customPotonganItems = customKomponen.filter((k) => k.tipe === "potongan");

    const incomeList = [
      { label: "1. Gaji Pokok", value: Number(cetakData.gajiPokok) || 0 },
      { label: `2. ${standardLabels.lembur || "Lembur"}`, value: Number(cetakData.lembur) || 0 },
      { label: `3. ${standardLabels.thr || "Bonus THR"} / ${standardLabels.homestay || "Homestay"}`, value: (Number(cetakData.thr) || 0) + (Number(cetakData.homestay) || 0) },
      ...customPemasukanItems.map((k, idx) => ({
        label: `${idx + 4}. ${k.nama}`,
        value: Number(cetakData.customItems?.[k.id]) || 0,
      })),
    ];

    const deductionList = [
      { label: `1. ${standardLabels.kasbonLama || "Kasbon"}`, value: Number(cetakData.kasbonLama) || 0 },
      { label: `2. ${standardLabels.dendaKostum || "Terlambat / Kostum"}`, value: Number(cetakData.dendaKostum) || 0 },
      { label: `3. ${standardLabels.kasbonMakanan || "Kasbon Makanan"}`, value: Number(cetakData.kasbonMakanan) || 0 },
      { label: `4. ${standardLabels.potonganBulanan || "Potongan Bulanan"}`, value: Number(cetakData.potonganBulanan) || 0 },
      { label: `5. ${standardLabels.panjar || "Panjar"}`, value: Number(cetakData.panjar) || 0 },
      { label: `6. ${standardLabels.tidakHadir || "Tidak Hadir"}`, value: Number(cetakData.tidakHadir) || 0 },
      ...customPotonganItems.map((k, idx) => ({
        label: `${idx + 7}. ${k.nama}`,
        value: Number(cetakData.customItems?.[k.id]) || 0,
      })),
    ];

    const totalPenghasilan = incomeList.reduce((s, p) => s + p.value, 0);
    const totalPotongan = deductionList.reduce((s, p) => s + p.value, 0);
    const netGajiCetak = totalPenghasilan - totalPotongan;

    const maxRows = Math.max(incomeList.length, deductionList.length, 6);

    return { incomeList, deductionList, totalPenghasilan, totalPotongan, netGajiCetak, maxRows };
  };

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const hitungPemasukan = useCallback(
    (data) => {
      const stdPemasukan =
        (Number(data.gajiPokok) || 0) +
        (Number(data.lembur) || 0) +
        (Number(data.thr) || 0) +
        (Number(data.homestay) || 0);

      const customPemasukan = customKomponen
        .filter((k) => k.tipe === "pemasukan")
        .reduce((acc, k) => acc + (Number(data.customItems?.[k.id]) || 0), 0);

      return stdPemasukan + customPemasukan;
    },
    [customKomponen]
  );

  const hitungPotongan = useCallback(
    (data) => {
      const stdPotongan =
        (Number(data.dendaKostum) || 0) +
        (Number(data.izin) || 0) +
        (Number(data.kasbonLama) || 0) +
        (Number(data.kasbonMakanan) || 0) +
        (Number(data.potonganBulanan) || 0) +
        (Number(data.panjar) || 0) +
        (Number(data.tidakHadir) || 0);

      const customPotongan = customKomponen
        .filter((k) => k.tipe === "potongan")
        .reduce((acc, k) => acc + (Number(data.customItems?.[k.id]) || 0), 0);

      return stdPotongan + customPotongan;
    },
    [customKomponen]
  );

  const hitungNetGaji = useCallback(
    (data) => hitungPemasukan(data) - hitungPotongan(data),
    [hitungPemasukan, hitungPotongan]
  );

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
      customItems: karyawan.customItems ? { ...karyawan.customItems } : {},
      catatan: karyawan.catatan || "",
    });
    setIsModalOpen(true);
  };

  const handleCustomItemChange = (itemId, value) => {
    setActiveKaryawan((prev) => ({
      ...prev,
      customItems: {
        ...(prev.customItems || {}),
        [itemId]: Number(value) || 0,
      },
    }));
  };

  const handleTambahCustomItem = async (e) => {
    e.preventDefault();
    if (!newNamaItem.trim()) return;

    setIsAddingItem(true);
    try {
      await addDoc(collection(db, "komponen_gaji_custom"), {
        nama: newNamaItem.trim(),
        tipe: newTipeItem,
        createdAt: new Date().toISOString(),
      });
      setNewNamaItem("");
      setStatus({
        type: "success",
        message: `Komponen gaji "${newNamaItem.trim()}" berhasil ditambahkan!`,
      });
      fetchData();
    } catch (error) {
      console.error("Error adding custom item:", error);
      setStatus({ type: "error", message: "Gagal menambahkan komponen gaji." });
    } finally {
      setIsAddingItem(false);
      setTimeout(() => setStatus({ type: "", message: "" }), 3000);
    }
  };

  const handleStartEdit = (item) => {
    setEditingItem({ id: item.id, nama: item.nama, tipe: item.tipe });
  };

  const handleUpdateCustomItem = async (e) => {
    e.preventDefault();
    if (!editingItem || !editingItem.nama.trim()) return;

    setIsAddingItem(true);
    try {
      await updateDoc(doc(db, "komponen_gaji_custom", editingItem.id), {
        nama: editingItem.nama.trim(),
        tipe: editingItem.tipe,
        updatedAt: new Date().toISOString(),
      });
      setStatus({
        type: "success",
        message: `Komponen gaji "${editingItem.nama.trim()}" berhasil diperbarui!`,
      });
      setEditingItem(null);
      fetchData();
    } catch (error) {
      console.error("Error updating custom item:", error);
      setStatus({ type: "error", message: "Gagal memperbarui komponen gaji." });
    } finally {
      setIsAddingItem(false);
      setTimeout(() => setStatus({ type: "", message: "" }), 3000);
    }
  };

  const handleHapusCustomItem = async (id, nama) => {
    if (!confirm(`Yakin ingin menghapus komponen gaji "${nama}"?`)) return;

    try {
      if (editingItem?.id === id) setEditingItem(null);
      await deleteDoc(doc(db, "komponen_gaji_custom", id));
      setStatus({
        type: "success",
        message: `Komponen gaji "${nama}" berhasil dihapus.`,
      });
      fetchData();
    } catch (error) {
      console.error("Error deleting custom item:", error);
      setStatus({ type: "error", message: "Gagal menghapus komponen gaji." });
    }
    setTimeout(() => setStatus({ type: "", message: "" }), 3000);
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
    const inputNoHp = window.prompt(
      `Masukkan Nomor WA untuk ${data.namaKaryawan} (Contoh: 08123... / 628123...):`,
      defaultNoHp
    );
    if (inputNoHp === null) return; // User cancel

    const trimmedNoHp = inputNoHp.trim();
    if (!trimmedNoHp) {
      alert("Nomor WhatsApp tidak boleh kosong!");
      return;
    }

    let cleanPhone = trimmedNoHp.replace(/\D/g, "");
    if (cleanPhone.startsWith("0")) {
      cleanPhone = "62" + cleanPhone.slice(1);
    } else if (cleanPhone.startsWith("8")) {
      cleanPhone = "62" + cleanPhone;
    }

    setIsSendingWa(true);
    setStatus({ type: "info", message: "Memproses dokumen PDF slip gaji & mengirim ke WhatsApp..." });

    try {
      const namaBulanArr = [
        "Januari", "Februari", "Maret", "April", "Mei", "Juni",
        "Juli", "Agustus", "September", "Oktober", "November", "Desember"
      ];
      const periodeStr = `${namaBulanArr[(data.periodeBulan || bulan) - 1]} ${data.periodeTahun || tahun}`;
      const { incomeList, deductionList, totalPenghasilan, totalPotongan, netGajiCetak } = getSlipLists(data);
      const fmt = (val) => new Intl.NumberFormat("id-ID").format(val);

      let msg = `*SLIP GAJI KARYAWAN*\n`;
      msg += `*RUMAH ETNIK PAPUA*\n`;
      msg += `------------------------------------------\n`;
      msg += `👤 *Nama:* ${data.namaKaryawan}\n`;
      msg += `💼 *Jabatan:* ${data.jabatan || "KARYAWAN"}\n`;
      msg += `📅 *Periode:* ${periodeStr}\n`;
      msg += `⏱️ *Hari Hadir:* ${data.hariHadir} Hari\n`;
      msg += `------------------------------------------\n\n`;

      msg += `📌 *RINCIAN PENGHASILAN:*\n`;
      incomeList.forEach((item) => {
        if (item.value > 0) {
          msg += `• ${item.label}: Rp ${fmt(item.value)}\n`;
        }
      });
      msg += `*Total Penghasilan:* Rp ${fmt(totalPenghasilan)}\n\n`;

      if (totalPotongan > 0) {
        msg += `🔻 *RINCIAN POTONGAN:*\n`;
        deductionList.forEach((item) => {
          if (item.value > 0) {
            msg += `• ${item.label}: Rp ${fmt(item.value)}\n`;
          }
        });
        msg += `*Total Potongan:* Rp ${fmt(totalPotongan)}\n\n`;
      }

      msg += `------------------------------------------\n`;
      msg += `💰 *GAJI BERSIH (NET GAJI):* *Rp ${fmt(netGajiCetak)}*\n`;
      msg += `Terbilang: _(${terbilang(netGajiCetak)} Rupiah)_\n`;
      msg += `------------------------------------------\n`;

      if (data.catatan) {
        msg += `\n📝 *Catatan:* ${data.catatan}\n`;
      }

      msg += `\n*Terima kasih atas dedikasi dan kerja keras Anda!*`;

      // 1. Render slip gaji ke PDF (dimensi presisi A4 794px x 1123px) & dapatkan base64 string
      setDataCetakList([data]);
      await new Promise((resolve) => setTimeout(resolve, 600));

      const slipElement = document.querySelector('.slip-container');
      if (!slipElement) throw new Error('Elemen slip gaji tidak ditemukan');

      const cetakArea = slipElement.parentElement;
      const originalClasses = cetakArea.className;
      cetakArea.className = "print:block font-sans text-black bg-white w-[794px] min-h-[1123px] p-6 fixed top-0 left-[-9999px] z-[-1]";

      const canvas = await html2canvas(slipElement, { scale: 2, useCORS: true });
      cetakArea.className = originalClasses;
      setDataCetakList([]);

      const imgData = canvas.toDataURL('image/jpeg', 1.0);
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pdfWidth = pdf.internal.pageSize.getWidth(); // 210
      const pdfPageHeight = pdf.internal.pageSize.getHeight(); // 297
      let pdfHeight = (canvas.height * pdfWidth) / canvas.width;
      if (pdfHeight > pdfPageHeight) pdfHeight = pdfPageHeight;

      const fileName = `Slip_Gaji_${data.namaKaryawan.replace(/\s+/g, '_')}_${namaBulanArr[(data.periodeBulan || bulan) - 1]}_${data.periodeTahun || tahun}.pdf`;
      pdf.addImage(imgData, 'JPEG', 0, 0, pdfWidth, pdfHeight);

      const pdfBase64Data = pdf.output('datauristring');
      const base64String = pdfBase64Data.split(',')[1];

      // 2. Kirim dokumen PDF langsung melalui WhatsApp terhubung
      const botResponse = await fetch('http://localhost:3001/api/kirim-slip', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': '121DW4N311y'
        },
        body: JSON.stringify({
          nomor: cleanPhone,
          pesan: msg,
          fileName: fileName,
          pdfBase64: base64String
        })
      });

      const resData = await botResponse.json();

      if (botResponse.ok && (resData.status === 'sukses' || resData.success)) {
        setStatus({
          type: "success",
          message: `Dokumen PDF Slip Gaji (${fileName}) berhasil dikirim ke WhatsApp ${data.namaKaryawan}!`,
        });
      } else {
        throw new Error(resData.error || 'Gagal mengirim pesan dari WhatsApp Bot');
      }

    } catch (error) {
      console.error("Error sending WA:", error);
      setStatus({ type: "error", message: `Gagal memproses pengiriman WA: ${error.message}` });
      setDataCetakList([]);
    } finally {
      setIsSendingWa(false);
      setTimeout(() => setStatus({ type: "", message: "" }), 6000);
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
      <div className="print:hidden">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end mb-8 gap-4">
          <div>
            <h1 className="text-2xl font-bold text-papua-primary">
              Rekapan & Slip Gaji
            </h1>
            <p className="text-gray-500 mt-1">
              Kalkulator akhir bulan dan penerbitan slip gaji PDF.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2.5">
            <button
              onClick={() => setIsManageItemModalOpen(true)}
              className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2.5 rounded-lg text-sm font-bold transition-all shadow-md hover:shadow-lg active:scale-95 cursor-pointer"
            >
              <PlusCircle className="w-4 h-4" /> Kelola Item Gaji
            </button>
            <button
              onClick={() => {
                setIsCetakTabel(true);
                setDataCetakList([]);
                setTimeout(() => {
                  window.print();
                  setTimeout(() => setIsCetakTabel(false), 500);
                }, 500);
              }}
              className="flex items-center gap-2 bg-papua-primary hover:bg-gray-800 text-white px-5 py-2.5 rounded-lg text-sm font-bold transition-colors shadow-sm"
            >
              <Printer className="w-4 h-4" /> Cetak Tabel Rekapan
            </button>
            <button
              onClick={handleCetakSemua}
              className="flex items-center gap-2 bg-gray-800 hover:bg-gray-900 text-white px-5 py-2.5 rounded-lg text-sm font-bold transition-colors shadow-sm"
            >
              <Printer className="w-4 h-4" /> Cetak Semua Slip
            </button>
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-gray-100 shadow-sm mb-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="flex items-center gap-2 text-gray-700 font-medium">
            <Calculator className="w-5 h-5 text-papua-primary" />
            <span>Kalkulasi Periode:</span>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <select
              value={bulan}
              onChange={(e) => setBulan(Number(e.target.value))}
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm bg-gray-50 font-bold outline-none cursor-pointer"
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
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm bg-gray-50 font-bold outline-none cursor-pointer"
            >
              {[2024, 2025, 2026, 2027].map((thn) => (
                <option key={thn} value={thn}>
                  {thn}
                </option>
              ))}
            </select>
            <button
              type="button"
              onClick={() => setIsManageItemModalOpen(true)}
              className="flex items-center gap-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-300 px-3.5 py-2 rounded-lg text-xs font-bold transition-all shadow-sm cursor-pointer"
              title="Kelola Item Gaji Bawaan & Custom"
            >
              <PlusCircle className="w-3.5 h-3.5" /> Kelola Item Gaji
            </button>
          </div>
        </div>

        {status.message && (
          <div
            className={`p-4 rounded-lg mb-6 flex items-center gap-3 border ${
              status.type === "error"
                ? "bg-papua-red/10 border-papua-red/30 text-papua-red"
                : "bg-papua-green/10 border-papua-green/30 text-papua-green"
            }`}
          >
            <CheckCircle2 className="w-5 h-5 shrink-0" />
            <span className="text-sm font-medium">{status.message}</span>
          </div>
        )}

        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="p-3.5 bg-gray-50 border-b border-gray-200 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
            <div className="text-xs font-bold text-gray-700 uppercase tracking-wider flex items-center gap-2">
              <span>Tabel Rekapan Gaji</span>
              <span className="bg-gray-200 text-gray-700 px-2 py-0.5 rounded-full text-[10px] font-bold">
                {dataRekapan.length} Karyawan
              </span>
            </div>
            <button
              type="button"
              onClick={() => setIsManageItemModalOpen(true)}
              className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-1.5 rounded-lg text-xs font-bold transition-all shadow-sm cursor-pointer"
            >
              <PlusCircle className="w-3.5 h-3.5" /> Kelola Item Gaji
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs whitespace-nowrap">
              <thead className="bg-gray-800 text-white font-medium">
                <tr>
                  <th className="px-4 py-4 rounded-tl-xl">NAMA KARYAWAN</th>
                  <th className="px-4 py-4 text-center">ABSEN</th>
                  <th className="px-4 py-4 text-right">GAJI POKOK</th>
                  <th className="px-4 py-4 text-right text-red-300 uppercase">
                    {standardLabels.tidakHadir || "TIDAK HADIR"}
                  </th>
                  <th className="px-4 py-4 text-right text-red-300 uppercase">
                    {standardLabels.kasbonLama || "KASBON"}
                  </th>
                  <th className="px-4 py-4 text-right text-red-300 uppercase">
                    {standardLabels.dendaKostum || "TERLAMBAT"}
                  </th>
                  <th className="px-4 py-4 text-right text-red-300 uppercase">
                    {standardLabels.kasbonMakanan || "KASBON MAKANAN"}
                  </th>
                  <th className="px-4 py-4 text-right text-red-300 uppercase">
                    {standardLabels.potonganBulanan || "POTONGAN BULANAN"}
                  </th>
                  <th className="px-4 py-4 text-right text-amber-300 uppercase">
                    {standardLabels.panjar || "PANJAR"}
                  </th>
                  {customKomponen.filter((k) => k.tipe === "potongan").map((item) => (
                    <th key={item.id} className="px-4 py-4 text-right text-red-300 uppercase">
                      {item.nama}
                    </th>
                  ))}
                  <th className="px-4 py-4 text-right uppercase">
                    {standardLabels.lembur || "LEMBUR"}
                  </th>
                  <th className="px-4 py-4 text-right uppercase">
                    {standardLabels.thr || "BONUS"}
                  </th>
                  {customKomponen.filter((k) => k.tipe === "pemasukan").map((item) => (
                    <th key={item.id} className="px-4 py-4 text-right text-blue-300 uppercase">
                      {item.nama}
                    </th>
                  ))}
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
                    <td colSpan={14 + customKomponen.length} className="px-6 py-12 text-center">
                      <RefreshCw className="w-6 h-6 text-papua-accent animate-spin mx-auto" />
                    </td>
                  </tr>
                ) : dataRekapan.length === 0 ? (
                  <tr>
                    <td
                      colSpan={14 + customKomponen.length}
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
                        {customKomponen.filter((k) => k.tipe === "potongan").map((item) => (
                          <td key={item.id} className="px-4 py-4 text-right text-papua-red font-medium">
                            {formatRupiah(Number(data.customItems?.[item.id]) || 0)}
                          </td>
                        ))}
                        <td className="px-4 py-4 text-right text-papua-primary">
                          {formatRupiah(lemburVal)}
                        </td>
                        <td className="px-4 py-4 text-right text-papua-primary">
                          {formatRupiah(bonusVal)}
                        </td>
                        {customKomponen.filter((k) => k.tipe === "pemasukan").map((item) => (
                          <td key={item.id} className="px-4 py-4 text-right text-blue-600 font-medium">
                            {formatRupiah(Number(data.customItems?.[item.id]) || 0)}
                          </td>
                        ))}
                        <td className="px-4 py-4 text-right text-papua-red">
                          {formatRupiah(totalPotonganKhusus)}
                        </td>
                        <td className="px-4 py-4 text-right font-bold text-papua-green text-sm">
                          {formatRupiah(netGaji)}
                        </td>
                        <td className="px-4 py-4 text-center flex items-center justify-center gap-2">
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
                    {customKomponen.filter((k) => k.tipe === "potongan").map((item) => {
                      const tot = dataRekapan.reduce((acc, curr) => acc + (Number(curr.customItems?.[item.id]) || 0), 0);
                      return (
                        <td key={item.id} className="px-4 py-4 text-right text-red-300">
                          {formatRupiah(tot)}
                        </td>
                      );
                    })}
                    <td className="px-4 py-4 text-right text-blue-300">
                      {formatRupiah(totalLembur)}
                    </td>
                    <td className="px-4 py-4 text-right text-blue-300">
                      {formatRupiah(totalBonusVal)}
                    </td>
                    {customKomponen.filter((k) => k.tipe === "pemasukan").map((item) => {
                      const tot = dataRekapan.reduce((acc, curr) => acc + (Number(curr.customItems?.[item.id]) || 0), 0);
                      return (
                        <td key={item.id} className="px-4 py-4 text-right text-blue-300">
                          {formatRupiah(tot)}
                        </td>
                      );
                    })}
                    <td className="px-4 py-4 text-right text-red-300">
                      {formatRupiah(totalPotonganKeseluruhan)}
                    </td>
                    <td className="px-4 py-4 text-right text-green-300">
                      {formatRupiah(totalNetGajiKeseluruhan)}
                    </td>
                    <td className="px-4 py-4 rounded-br-xl"></td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* ================================================================= */}
      {/* ====== CETAK TABEL REKAPAN - POTRET (HANYA TAMPIL SAAT PRINT) ====== */}
      {isCetakTabel && (
        <div className="hidden print:block font-sans text-black bg-white w-full cetak-tabel-potret">
          {/* Header Perusahaan */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px', borderBottom: '3px solid #8f3d1b', paddingBottom: '8px' }}>
            <div style={{ flex: 1 }}>
              <h1 style={{ fontSize: '18px', fontWeight: 'bold', marginBottom: '2px', fontFamily: 'serif' }}>RUMAH ETNIK PAPUA</h1>
              <p style={{ fontSize: '10px', marginBottom: '1px' }}>Aimas - Klamono KM 21, Kabupaten Sorong, Papua Barat Daya</p>
              <p style={{ fontSize: '10px' }}>No. HP: 0821 9986 7918 | Email: officialrumahetnikpapua@gmail.com</p>
            </div>
            <div style={{ width: '80px', display: 'flex', justifyContent: 'flex-end' }}>
              <img src="/logo.jpg" alt="logo" style={{ width: '70px' }} onError={(e) => { e.target.style.display = 'none'; }} />
            </div>
          </div>

          {/* Judul */}
          <div style={{ textAlign: 'center', marginBottom: '6px' }}>
            <h2 style={{ fontSize: '16px', fontWeight: 'bold', color: '#8f3d1b', textTransform: 'uppercase' }}>Rekapan Gaji Karyawan</h2>
            <p style={{ fontSize: '12px', fontWeight: 'bold', color: '#333' }}>Periode: {namaBulan[bulan - 1]} {tahun}</p>
          </div>

          {/* Tabel Rekapan Potret */}
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '8.5px', tableLayout: 'fixed' }}>
            <thead>
              <tr style={{ backgroundColor: '#8f3d1b', color: 'white' }}>
                <th style={{ border: '1px solid #8f3d1b', padding: '4px 3px', textAlign: 'center', width: '22px' }}>No</th>
                <th style={{ border: '1px solid #8f3d1b', padding: '4px 3px', textAlign: 'left' }}>Nama Karyawan</th>
                <th style={{ border: '1px solid #8f3d1b', padding: '4px 3px', textAlign: 'center', width: '30px' }}>Absen</th>
                <th style={{ border: '1px solid #8f3d1b', padding: '4px 3px', textAlign: 'right' }}>Gaji Pokok</th>
                <th style={{ border: '1px solid #8f3d1b', padding: '4px 3px', textAlign: 'right' }}>Lembur</th>
                <th style={{ border: '1px solid #8f3d1b', padding: '4px 3px', textAlign: 'right' }}>Bonus</th>
                {customKomponen.filter((k) => k.tipe === "pemasukan").map((item) => (
                  <th key={item.id} style={{ border: '1px solid #8f3d1b', padding: '4px 3px', textAlign: 'right' }}>{item.nama}</th>
                ))}
                <th style={{ border: '1px solid #8f3d1b', padding: '4px 3px', textAlign: 'right' }}>Tdk Hadir</th>
                <th style={{ border: '1px solid #8f3d1b', padding: '4px 3px', textAlign: 'right' }}>Kasbon</th>
                <th style={{ border: '1px solid #8f3d1b', padding: '4px 3px', textAlign: 'right' }}>Terlambat</th>
                <th style={{ border: '1px solid #8f3d1b', padding: '4px 3px', textAlign: 'right' }}>Ksb Mkn</th>
                <th style={{ border: '1px solid #8f3d1b', padding: '4px 3px', textAlign: 'right' }}>Pot. Bln</th>
                <th style={{ border: '1px solid #8f3d1b', padding: '4px 3px', textAlign: 'right' }}>Panjar</th>
                {customKomponen.filter((k) => k.tipe === "potongan").map((item) => (
                  <th key={item.id} style={{ border: '1px solid #8f3d1b', padding: '4px 3px', textAlign: 'right' }}>{item.nama}</th>
                ))}
                <th style={{ border: '1px solid #8f3d1b', padding: '4px 3px', textAlign: 'right', color: '#ffcccc' }}>Tot. Pot.</th>
                <th style={{ border: '1px solid #8f3d1b', padding: '4px 3px', textAlign: 'right', color: '#ccffcc' }}>Net Gaji</th>
              </tr>
            </thead>
            <tbody>
              {dataRekapan.map((data, idx) => {
                const lemburVal = Number(data.lembur) || 0;
                const bonusVal = (Number(data.thr) || 0) + (Number(data.homestay) || 0);
                const totalPotonganKhusus = hitungPotongan(data);
                const netGaji = hitungNetGaji(data);
                return (
                  <tr key={data.idKaryawan} style={{ backgroundColor: idx % 2 === 0 ? '#ffffff' : '#faf6f3' }}>
                    <td style={{ border: '1px solid #ccc', padding: '3px', textAlign: 'center' }}>{idx + 1}</td>
                    <td style={{ border: '1px solid #ccc', padding: '3px', fontWeight: 'bold', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{data.namaKaryawan}</td>
                    <td style={{ border: '1px solid #ccc', padding: '3px', textAlign: 'center' }}>{data.hariHadir}</td>
                    <td style={{ border: '1px solid #ccc', padding: '3px', textAlign: 'right' }}>{formatAngkaSaja(data.gajiPokok)}</td>
                    <td style={{ border: '1px solid #ccc', padding: '3px', textAlign: 'right' }}>{formatAngkaSaja(lemburVal)}</td>
                    <td style={{ border: '1px solid #ccc', padding: '3px', textAlign: 'right' }}>{formatAngkaSaja(bonusVal)}</td>
                    {customKomponen.filter((k) => k.tipe === "pemasukan").map((item) => (
                      <td key={item.id} style={{ border: '1px solid #ccc', padding: '3px', textAlign: 'right' }}>{formatAngkaSaja(Number(data.customItems?.[item.id]) || 0)}</td>
                    ))}
                    <td style={{ border: '1px solid #ccc', padding: '3px', textAlign: 'right', color: '#c62828' }}>{formatAngkaSaja(Number(data.tidakHadir) || 0)}</td>
                    <td style={{ border: '1px solid #ccc', padding: '3px', textAlign: 'right', color: '#c62828' }}>{formatAngkaSaja(Number(data.kasbonLama) || 0)}</td>
                    <td style={{ border: '1px solid #ccc', padding: '3px', textAlign: 'right', color: '#c62828' }}>{formatAngkaSaja(Number(data.dendaKostum) || 0)}</td>
                    <td style={{ border: '1px solid #ccc', padding: '3px', textAlign: 'right', color: '#c62828' }}>{formatAngkaSaja(Number(data.kasbonMakanan) || 0)}</td>
                    <td style={{ border: '1px solid #ccc', padding: '3px', textAlign: 'right', color: '#c62828' }}>{formatAngkaSaja(Number(data.potonganBulanan) || 0)}</td>
                    <td style={{ border: '1px solid #ccc', padding: '3px', textAlign: 'right', color: '#c62828' }}>{formatAngkaSaja(Number(data.panjar) || 0)}</td>
                    {customKomponen.filter((k) => k.tipe === "potongan").map((item) => (
                      <td key={item.id} style={{ border: '1px solid #ccc', padding: '3px', textAlign: 'right', color: '#c62828' }}>{formatAngkaSaja(Number(data.customItems?.[item.id]) || 0)}</td>
                    ))}
                    <td style={{ border: '1px solid #ccc', padding: '3px', textAlign: 'right', fontWeight: 'bold', color: '#c62828' }}>{formatAngkaSaja(totalPotonganKhusus)}</td>
                    <td style={{ border: '1px solid #ccc', padding: '3px', textAlign: 'right', fontWeight: 'bold', color: '#2e7d32' }}>{formatAngkaSaja(netGaji)}</td>
                  </tr>
                );
              })}
              {/* Baris TOTAL */}
              <tr style={{ backgroundColor: '#8f3d1b', color: 'white', fontWeight: 'bold' }}>
                <td colSpan={3} style={{ border: '1px solid #8f3d1b', padding: '4px 3px', textAlign: 'center' }}>TOTAL</td>
                <td style={{ border: '1px solid #8f3d1b', padding: '4px 3px', textAlign: 'right' }}>{formatAngkaSaja(totalGajiPokok)}</td>
                <td style={{ border: '1px solid #8f3d1b', padding: '4px 3px', textAlign: 'right' }}>{formatAngkaSaja(totalLembur)}</td>
                <td style={{ border: '1px solid #8f3d1b', padding: '4px 3px', textAlign: 'right' }}>{formatAngkaSaja(totalBonusVal)}</td>
                {customKomponen.filter((k) => k.tipe === "pemasukan").map((item) => {
                  const tot = dataRekapan.reduce((acc, curr) => acc + (Number(curr.customItems?.[item.id]) || 0), 0);
                  return (
                    <td key={item.id} style={{ border: '1px solid #8f3d1b', padding: '4px 3px', textAlign: 'right' }}>{formatAngkaSaja(tot)}</td>
                  );
                })}
                <td style={{ border: '1px solid #8f3d1b', padding: '4px 3px', textAlign: 'right', color: '#ffcccc' }}>{formatAngkaSaja(totalTidakHadir)}</td>
                <td style={{ border: '1px solid #8f3d1b', padding: '4px 3px', textAlign: 'right', color: '#ffcccc' }}>{formatAngkaSaja(totalKasbon)}</td>
                <td style={{ border: '1px solid #8f3d1b', padding: '4px 3px', textAlign: 'right', color: '#ffcccc' }}>{formatAngkaSaja(totalTerlambat)}</td>
                <td style={{ border: '1px solid #8f3d1b', padding: '4px 3px', textAlign: 'right', color: '#ffcccc' }}>{formatAngkaSaja(totalKasbonMakanan)}</td>
                <td style={{ border: '1px solid #8f3d1b', padding: '4px 3px', textAlign: 'right', color: '#ffcccc' }}>{formatAngkaSaja(totalPotonganBulanan)}</td>
                <td style={{ border: '1px solid #8f3d1b', padding: '4px 3px', textAlign: 'right', color: '#ffcccc' }}>{formatAngkaSaja(totalPanjar)}</td>
                {customKomponen.filter((k) => k.tipe === "potongan").map((item) => {
                  const tot = dataRekapan.reduce((acc, curr) => acc + (Number(curr.customItems?.[item.id]) || 0), 0);
                  return (
                    <td key={item.id} style={{ border: '1px solid #8f3d1b', padding: '4px 3px', textAlign: 'right', color: '#ffcccc' }}>{formatAngkaSaja(tot)}</td>
                  );
                })}
                <td style={{ border: '1px solid #8f3d1b', padding: '4px 3px', textAlign: 'right', color: '#ffcccc' }}>{formatAngkaSaja(totalPotonganKeseluruhan)}</td>
                <td style={{ border: '1px solid #8f3d1b', padding: '4px 3px', textAlign: 'right', color: '#ccffcc' }}>{formatAngkaSaja(totalNetGajiKeseluruhan)}</td>
              </tr>
            </tbody>
          </table>

          {/* Ringkasan Total */}
          <div style={{ marginTop: '12px', display: 'flex', justifyContent: 'flex-end' }}>
            <div style={{ border: '2px solid #8f3d1b', padding: '8px 16px', textAlign: 'right', minWidth: '280px' }}>
              <div style={{ fontSize: '10px', color: '#666', marginBottom: '2px' }}>Total Pengeluaran Gaji Periode {namaBulan[bulan - 1]} {tahun}</div>
              <div style={{ fontSize: '16px', fontWeight: 'bold', color: '#8f3d1b' }}>Rp{formatAngkaSaja(totalNetGajiKeseluruhan)}</div>
            </div>
          </div>

          {/* Tanda Tangan */}
          <div style={{ marginTop: '24px', display: 'flex', justifyContent: 'space-between', fontSize: '10px' }}>
            <div style={{ textAlign: 'center', width: '180px' }}>
              <p>Dibuat oleh,</p>
              <div style={{ height: '50px' }}></div>
              <p style={{ borderTop: '1px solid #333', paddingTop: '4px', fontWeight: 'bold' }}>Admin Keuangan</p>
            </div>
            <div style={{ textAlign: 'center', width: '180px' }}>
              <p>Mengetahui,</p>
              <div style={{ height: '50px' }}></div>
              <p style={{ borderTop: '1px solid #333', paddingTop: '4px', fontWeight: 'bold' }}>Pimpinan</p>
            </div>
          </div>
        </div>
      )}

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
                      <div className="text-xs font-bold text-gray-600 mb-1">{standardLabels.lembur || "Lembur"} (Rp)</div>
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
                      <div className="text-xs font-bold text-gray-600 mb-1">{standardLabels.thr || "Bonus THR"} (Rp)</div>
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
                      <div className="text-xs font-bold text-gray-600 mb-1">{standardLabels.homestay || "Bonus Homestay"} (Rp)</div>
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

                    {/* DYNAMIC CUSTOM PEMASUKAN ITEMS */}
                    {customKomponen.filter((k) => k.tipe === "pemasukan").map((item) => (
                      <label key={item.id} className="block text-sm">
                        <div className="text-xs font-bold text-emerald-700 mb-1">{item.nama} (Rp)</div>
                        <div className="relative">
                          <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-emerald-600 font-medium text-sm pointer-events-none">Rp</span>
                          <input
                            type="number"
                            value={activeKaryawan.customItems?.[item.id] || 0}
                            onChange={(e) => handleCustomItemChange(item.id, e.target.value)}
                            className="pl-9 w-full border border-emerald-200 rounded-xl px-4 py-2.5 text-sm bg-emerald-50/30 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-600 transition-all font-medium"
                          />
                        </div>
                      </label>
                    ))}
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
                      <div className="text-xs font-bold text-gray-600 mb-1">{standardLabels.tidakHadir || "Tidak Hadir"} (Rp)</div>
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
                      <div className="text-xs font-bold text-gray-600 mb-1">{standardLabels.kasbonLama || "Kasbon"} (Rp)</div>
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
                      <div className="text-xs font-bold text-gray-600 mb-1">{standardLabels.dendaKostum || "Terlambat / Kostum"} (Rp)</div>
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
                      <div className="text-xs font-bold text-gray-600 mb-1">{standardLabels.kasbonMakanan || "Kasbon Makanan"} (Rp)</div>
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
                      <div className="text-xs font-bold text-gray-600 mb-1">{standardLabels.potonganBulanan || "Potongan Bulanan"} (Rp)</div>
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
                      <div className="text-xs font-bold text-gray-600 mb-1">{standardLabels.panjar || "Panjar"} (Rp)</div>
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

                    {/* DYNAMIC CUSTOM POTONGAN ITEMS */}
                    {customKomponen.filter((k) => k.tipe === "potongan").map((item) => (
                      <label key={item.id} className="block text-sm">
                        <div className="text-xs font-bold text-red-700 mb-1">{item.nama} (Rp)</div>
                        <div className="relative">
                          <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-red-600 font-medium text-sm pointer-events-none">Rp</span>
                          <input
                            type="number"
                            value={activeKaryawan.customItems?.[item.id] || 0}
                            onChange={(e) => handleCustomItemChange(item.id, e.target.value)}
                            className="pl-9 w-full border border-red-200 rounded-xl px-4 py-2.5 text-sm bg-red-50/30 focus:bg-white focus:outline-none focus:ring-2 focus:ring-red-600 transition-all font-medium"
                          />
                        </div>
                      </label>
                    ))}
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
                  const { incomeList, deductionList, totalPenghasilan, totalPotongan, netGajiCetak, maxRows } = getSlipLists(cetakData);
                  
                  const calculationDate = cetakData.tanggalKalkulasi ? new Date(cetakData.tanggalKalkulasi) : new Date();
                  const strCalculationDate = `${calculationDate.getDate()} ${namaBulan[calculationDate.getMonth()]} ${calculationDate.getFullYear()}`;
                  
                  const urutanKaryawan = dataRekapan.findIndex(k => k.idKaryawan === cetakData.idKaryawan) + 1;
                  const romawiBulan = ["I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "X", "XI", "XII"];
                  const strBulanRomawi = romawiBulan[(cetakData.periodeBulan || bulan) - 1];
                  const strTahun = (cetakData.periodeTahun || tahun).toString();
                  
                  return (
                    <div className="w-full pt-3 pb-6 px-4 font-sans text-black">
                      {/* Header Logo & Perusahaan */}
                      <div className="flex items-center justify-between mb-5 border-b-4 border-[#8f3d1b] pb-4">
                        <div className="flex-1">
                          <h1 className="text-xl sm:text-2xl font-black mb-1 text-[#8f3d1b] tracking-wider">RUMAH ETNIK PAPUA</h1>
                          <p className="text-xs sm:text-sm font-semibold mb-0.5 text-gray-800">Aimas - Klamono KM 21, Kabupaten Sorong, Papua Barat Daya</p>
                          <p className="text-xs sm:text-sm font-semibold text-gray-800">No. HP: 0821 9986 7918 | Email: officialrumahetnikpapua@gmail.com</p>
                        </div>
                        <div className="w-28 sm:w-36 flex justify-end">
                          <img
                            src="/logo.jpg"
                            alt="logo"
                            className="w-24 sm:w-32 object-contain"
                            onError={(e) => {
                              e.target.style.display = "none";
                            }}
                          />
                        </div>
                      </div>

                      {/* Judul Slip */}
                      <div className="text-center mb-6">
                        <h2 className="text-xl sm:text-2xl font-extrabold text-[#8f3d1b] tracking-wide underline underline-offset-4 decoration-[#8f3d1b]">SLIP GAJI KARYAWAN</h2>
                      </div>

                      {/* Periode & Nomor */}
                      <div className="flex justify-between mb-6 text-xs sm:text-sm font-bold border-b border-gray-200 pb-2">
                        <div className="flex gap-2">
                          <span className="w-20 sm:w-24 text-gray-700">Periode</span>
                          <span>: {namaBulan[cetakData.periodeBulan - 1] || namaBulan[bulan - 1]} {cetakData.periodeTahun || tahun}</span>
                        </div>
                        <div className="flex gap-2">
                          <span className="w-24 sm:w-32 text-right text-gray-700">No. Slip Gaji</span>
                          <span>: REP/SG/{strBulanRomawi}/{strTahun}/{urutanKaryawan}</span>
                        </div>
                      </div>

                      {/* Data Karyawan */}
                      <div className="mb-6 text-xs sm:text-sm">
                        <div className="bg-[#8f3d1b] text-white font-extrabold px-4 py-1.5 inline-block mb-3 rounded-r-md shadow-sm w-64 sm:w-72 tracking-wide">
                          DATA KARYAWAN
                        </div>
                        <table className="w-full font-bold text-xs sm:text-sm">
                          <tbody>
                            <tr>
                              <td className="w-28 sm:w-36 py-1 text-gray-700">Nama Karyawan</td>
                              <td className="w-4">:</td>
                              <td className="text-black font-extrabold text-sm sm:text-base">{cetakData.namaKaryawan || "-"}</td>
                            </tr>
                            <tr>
                              <td className="py-1 text-gray-700">Jabatan</td>
                              <td>:</td>
                              <td className="text-black">{cetakData.jabatan || "KARYAWAN"}</td>
                            </tr>
                            <tr>
                              <td className="py-1 text-gray-700">Keterangan Absen</td>
                              <td>:</td>
                              <td className="text-black">{cetakData.hariHadir} Hari Hadir</td>
                            </tr>
                          </tbody>
                        </table>
                      </div>

                      {/* Tabel Rincian Penghasilan & Potongan */}
                      <div className="flex flex-col sm:flex-row gap-5 sm:gap-6 mb-6 text-xs sm:text-sm">
                        <div className="flex-1">
                          <table className="w-full border-collapse border-2 border-[#8f3d1b]">
                            <thead>
                              <tr className="bg-[#8f3d1b] text-white">
                                <th className="border border-[#8f3d1b] px-3 py-2 text-left font-extrabold">RINCIAN PENGHASILAN</th>
                                <th className="border border-[#8f3d1b] px-3 py-2 text-center w-28 sm:w-32 font-extrabold">JUMLAH</th>
                              </tr>
                            </thead>
                            <tbody>
                              {Array.from({ length: maxRows }).map((_, i) => {
                                const item = incomeList[i];
                                return (
                                  <tr key={i} className="hover:bg-amber-50/30">
                                    <td className="border border-[#8f3d1b] px-3 py-2 font-medium">
                                      {item ? item.label : <span className="text-transparent">{i + 1}.</span>}
                                    </td>
                                    <td className="border border-[#8f3d1b] px-3 py-2 text-right font-semibold">
                                      {item ? formatAngkaSaja(item.value) : <span className="text-transparent">0</span>}
                                    </td>
                                  </tr>
                                );
                              })}
                              <tr className="font-extrabold bg-amber-100/60 text-black">
                                <td className="border border-[#8f3d1b] px-3 py-2.5">TOTAL PENGHASILAN</td>
                                <td className="border border-[#8f3d1b] px-3 py-2.5 text-right text-[#8f3d1b] text-sm sm:text-base">Rp{formatAngkaSaja(totalPenghasilan)}</td>
                              </tr>
                            </tbody>
                          </table>
                        </div>

                        <div className="flex-1">
                          <table className="w-full border-collapse border-2 border-[#8f3d1b]">
                            <thead>
                              <tr className="bg-[#8f3d1b] text-white">
                                <th className="border border-[#8f3d1b] px-3 py-2 text-left font-extrabold">POTONGAN</th>
                                <th className="border border-[#8f3d1b] px-3 py-2 text-center w-28 sm:w-32 font-extrabold">JUMLAH</th>
                              </tr>
                            </thead>
                            <tbody>
                              {Array.from({ length: maxRows }).map((_, i) => {
                                const item = deductionList[i];
                                return (
                                  <tr key={i} className="hover:bg-amber-50/30">
                                    <td className="border border-[#8f3d1b] px-3 py-2 font-medium">
                                      {item ? item.label : <span className="text-transparent">{i + 1}.</span>}
                                    </td>
                                    <td className="border border-[#8f3d1b] px-3 py-2 text-right font-semibold">
                                      {item ? formatAngkaSaja(item.value) : <span className="text-transparent">0</span>}
                                    </td>
                                  </tr>
                                );
                              })}
                              <tr className="font-extrabold bg-amber-100/60 text-black">
                                <td className="border border-[#8f3d1b] px-3 py-2.5">TOTAL POTONGAN</td>
                                <td className="border border-[#8f3d1b] px-3 py-2.5 text-right text-red-700 text-sm sm:text-base">Rp{formatAngkaSaja(totalPotongan)}</td>
                              </tr>
                            </tbody>
                          </table>
                        </div>
                      </div>

                      {/* Total Diterima */}
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-5 text-sm sm:text-base font-extrabold gap-2">
                        <div className="text-[#8f3d1b] uppercase tracking-wider">TOTAL DITERIMA (THP)</div>
                        <div className="border-2 border-[#8f3d1b] bg-amber-50/50 px-5 py-2.5 w-full sm:w-72 text-right text-[#8f3d1b] text-base sm:text-lg font-black rounded-sm shadow-sm">
                          Rp{formatAngkaSaja(netGajiCetak)}
                        </div>
                      </div>

                      {/* Terbilang */}
                      <div className="mb-6 text-xs sm:text-sm flex flex-col sm:flex-row font-bold bg-gray-50 border border-gray-200 p-3 rounded-lg gap-1 sm:gap-0">
                        <span className="sm:mr-2 text-gray-700 shrink-0">Terbilang:</span>
                        <span className="flex-1 italic text-gray-900 font-extrabold capitalize">( {terbilang(netGajiCetak)} Rupiah )</span>
                      </div>

                      {/* Tanda Tangan & Catatan */}
                      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end text-xs sm:text-sm mb-4 gap-6">
                        <div className="font-bold text-gray-700">
                          <span>Catatan :</span>
                          <p className="font-normal whitespace-pre-wrap text-gray-600 mt-1 max-w-xs">{cetakData.catatan || "-"}</p>
                        </div>
                        <div className="text-center w-full sm:w-64">
                          <p className="font-bold">Sorong, {strCalculationDate}</p>
                          <p className="text-xs text-gray-500 font-medium mb-12">Manager / Pimpinan</p>
                          <div className="border-b border-gray-800 w-48 mx-auto"></div>
                          <p className="text-xs font-bold mt-1 text-gray-700">( Management REP )</p>
                        </div>
                      </div>
                    </div>
                  );
                })()}
              </div>
            </div>
            {/* Footer Action Preview */}
            <div className="p-4 border-t border-gray-200 bg-gray-50 flex flex-wrap justify-end gap-3 shrink-0">
              <button
                onClick={() => setIsPreviewModalOpen(false)}
                className="px-4 py-2 bg-white border border-gray-300 hover:bg-gray-100 text-gray-700 rounded-xl text-xs font-bold transition-all shadow-sm"
              >
                Tutup
              </button>
              <button
                onClick={() => handleCetakSlip(previewData)}
                className="px-4 py-2 bg-gray-800 hover:bg-gray-900 text-white rounded-xl text-xs font-bold transition-all shadow-sm flex items-center gap-1.5"
              >
                <Printer className="w-3.5 h-3.5" /> Cetak Slip
              </button>
              <button
                onClick={() => handleKirimWA(previewData)}
                disabled={isSendingWa}
                className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-xl text-xs font-bold transition-all shadow-sm flex items-center gap-1.5 disabled:opacity-50"
              >
                <Send className="w-3.5 h-3.5" /> {isSendingWa ? 'Mengirim...' : 'Kirim via WA'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CETAK AREA (print only) */}
      <div className="hidden print:block font-sans text-black bg-white w-full">
        {dataCetakList.map((cetakData, idx) => {
          const { incomeList, deductionList, totalPenghasilan, totalPotongan, netGajiCetak, maxRows } = getSlipLists(cetakData);
          
          const calculationDate = cetakData.tanggalKalkulasi ? new Date(cetakData.tanggalKalkulasi) : new Date();
          const strCalculationDate = `${calculationDate.getDate()} ${namaBulan[calculationDate.getMonth()]} ${calculationDate.getFullYear()}`;
          
          const urutanKaryawan = dataRekapan.findIndex(k => k.idKaryawan === cetakData.idKaryawan) + 1;
          const romawiBulan = ["I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "X", "XI", "XII"];
          const strBulanRomawi = romawiBulan[(cetakData.periodeBulan || bulan) - 1];
          const strTahun = (cetakData.periodeTahun || tahun).toString();
          
          return (
            <div key={idx} className="slip-container w-[794px] min-h-[1123px] p-8 mx-auto box-border font-sans text-black bg-white flex flex-col justify-between">
              {/* Header Kop Surat */}
              <div className="flex items-center justify-between mb-5 border-b-4 border-[#8f3d1b] pb-4">
                <div className="flex-1">
                  <h1 className="text-2xl font-black mb-1 text-[#8f3d1b] tracking-wider">RUMAH ETNIK PAPUA</h1>
                  <p className="text-sm font-semibold mb-0.5 text-gray-800">Aimas - Klamono KM 21, Kabupaten Sorong, Papua Barat Daya</p>
                  <p className="text-sm font-semibold text-gray-800">No. HP: 0821 9986 7918 | Email: officialrumahetnikpapua@gmail.com</p>
                </div>
                <div className="w-36 flex justify-end">
                  <img
                    src="/logo.jpg"
                    alt="logo"
                    className="w-32 object-contain"
                    onError={(e) => {
                      e.target.style.display = "none";
                    }}
                  />
                </div>
              </div>

              {/* Title */}
              <div className="text-center mb-6">
                <h2 className="text-2xl font-extrabold text-[#8f3d1b] tracking-wide underline underline-offset-4 decoration-[#8f3d1b]">SLIP GAJI KARYAWAN</h2>
              </div>

              {/* Info Periode & No. Slip */}
              <div className="flex justify-between mb-6 text-sm font-bold border-b border-gray-200 pb-2">
                <div className="flex gap-2">
                  <span className="w-24 text-gray-700">Periode</span>
                  <span>: {namaBulan[cetakData.periodeBulan - 1] || namaBulan[bulan - 1]} {cetakData.periodeTahun || tahun}</span>
                </div>
                <div className="flex gap-2">
                  <span className="w-32 text-right text-gray-700">No. Slip Gaji</span>
                  <span>: REP/SG/{strBulanRomawi}/{strTahun}/{urutanKaryawan}</span>
                </div>
              </div>

              {/* Data Karyawan */}
              <div className="mb-6 text-sm">
                <div className="bg-[#8f3d1b] text-white font-extrabold px-4 py-1.5 inline-block mb-3 rounded-r-md shadow-sm w-72 text-sm tracking-wide">
                  DATA KARYAWAN
                </div>
                <table className="w-full font-bold text-sm">
                  <tbody>
                    <tr>
                      <td className="w-36 py-1 text-gray-700">Nama Karyawan</td>
                      <td className="w-4">:</td>
                      <td className="text-black font-extrabold text-base">{cetakData.namaKaryawan || "-"}</td>
                    </tr>
                    <tr>
                      <td className="py-1 text-gray-700">Jabatan</td>
                      <td>:</td>
                      <td className="text-black">{cetakData.jabatan || "KARYAWAN"}</td>
                    </tr>
                    <tr>
                      <td className="py-1 text-gray-700">Keterangan Absen</td>
                      <td>:</td>
                      <td className="text-black">{cetakData.hariHadir} Hari Hadir</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* Tabel Rincian Penghasilan & Potongan */}
              <div className="flex gap-6 mb-6 text-sm">
                <div className="flex-1">
                  <table className="w-full border-collapse border-2 border-[#8f3d1b] text-sm">
                    <thead>
                      <tr className="bg-[#8f3d1b] text-white">
                        <th className="border border-[#8f3d1b] px-3 py-2 text-left font-extrabold">RINCIAN PENGHASILAN</th>
                        <th className="border border-[#8f3d1b] px-3 py-2 text-center w-32 font-extrabold">JUMLAH</th>
                      </tr>
                    </thead>
                    <tbody>
                      {Array.from({ length: maxRows }).map((_, i) => {
                        const item = incomeList[i];
                        return (
                          <tr key={i}>
                            <td className="border border-[#8f3d1b] px-3 py-2 font-medium">
                              {item ? item.label : <span className="text-transparent">{i + 1}.</span>}
                            </td>
                            <td className="border border-[#8f3d1b] px-3 py-2 text-right font-semibold">
                              {item ? formatAngkaSaja(item.value) : <span className="text-transparent">0</span>}
                            </td>
                          </tr>
                        );
                      })}
                      <tr className="font-extrabold bg-amber-100/60 text-black">
                        <td className="border border-[#8f3d1b] px-3 py-2.5">TOTAL PENGHASILAN</td>
                        <td className="border border-[#8f3d1b] px-3 py-2.5 text-right text-[#8f3d1b] text-base">Rp{formatAngkaSaja(totalPenghasilan)}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                <div className="flex-1">
                  <table className="w-full border-collapse border-2 border-[#8f3d1b] text-sm">
                    <thead>
                      <tr className="bg-[#8f3d1b] text-white">
                        <th className="border border-[#8f3d1b] px-3 py-2 text-left font-extrabold">POTONGAN</th>
                        <th className="border border-[#8f3d1b] px-3 py-2 text-center w-32 font-extrabold">JUMLAH</th>
                      </tr>
                    </thead>
                    <tbody>
                      {Array.from({ length: maxRows }).map((_, i) => {
                        const item = deductionList[i];
                        return (
                          <tr key={i}>
                            <td className="border border-[#8f3d1b] px-3 py-2 font-medium">
                              {item ? item.label : <span className="text-transparent">{i + 1}.</span>}
                            </td>
                            <td className="border border-[#8f3d1b] px-3 py-2 text-right font-semibold">
                              {item ? formatAngkaSaja(item.value) : <span className="text-transparent">0</span>}
                            </td>
                          </tr>
                        );
                      })}
                      <tr className="font-extrabold bg-amber-100/60 text-black">
                        <td className="border border-[#8f3d1b] px-3 py-2.5">TOTAL POTONGAN</td>
                        <td className="border border-[#8f3d1b] px-3 py-2.5 text-right text-red-700 text-base">Rp{formatAngkaSaja(totalPotongan)}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Total Diterima */}
              <div className="flex justify-between items-center mb-5 text-base font-extrabold">
                <div className="text-[#8f3d1b] uppercase tracking-wider text-base">TOTAL DITERIMA (THP)</div>
                <div className="border-2 border-[#8f3d1b] bg-amber-50/50 px-5 py-2.5 w-72 text-right text-[#8f3d1b] text-lg font-black rounded-sm shadow-sm">
                  Rp{formatAngkaSaja(netGajiCetak)}
                </div>
              </div>

              {/* Terbilang */}
              <div className="mb-6 text-sm flex font-bold bg-gray-50 border border-gray-200 p-3 rounded-lg">
                <span className="mr-2 text-gray-700 shrink-0">Terbilang:</span>
                <span className="flex-1 italic text-gray-900 font-extrabold capitalize">( {terbilang(netGajiCetak)} Rupiah )</span>
              </div>

              {/* Tanda Tangan & Catatan */}
              <div className="flex justify-between items-end text-sm mb-4 pt-2">
                <div className="text-sm font-bold text-gray-700">
                  <span>Catatan :</span>
                  <p className="font-normal whitespace-pre-wrap text-gray-600 mt-1 max-w-xs">{cetakData.catatan || "-"}</p>
                </div>
                <div className="text-center w-64">
                  <p className="font-bold">Sorong, {strCalculationDate}</p>
                  <p className="text-xs text-gray-500 font-medium mb-12">Manager / Pimpinan</p>
                  <div className="border-b border-gray-800 w-48 mx-auto"></div>
                  <p className="text-xs font-bold mt-1 text-gray-700">( Management REP )</p>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* MODAL KELOLA ITEM GAJI CUSTOM */}
      {isManageItemModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-0 print:hidden">
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-sm transition-opacity"
            onClick={() => setIsManageItemModalOpen(false)}
          />
          <div className="relative bg-white rounded-2xl w-full max-w-lg shadow-2xl z-10 overflow-hidden flex flex-col max-h-[90vh]">
            {/* Header */}
            <div className="bg-gradient-to-r from-emerald-700 to-gray-900 px-6 py-4 flex justify-between items-center shrink-0">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-white/20 rounded-lg">
                  <PlusCircle className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white">
                    Kelola Komponen Gaji Custom
                  </h3>
                  <p className="text-white/80 text-xs font-medium">
                    Tambah item pemasukan/potongan tambahan untuk tabel & slip
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsManageItemModalOpen(false)}
                className="text-white/70 hover:text-white hover:bg-white/20 p-2 rounded-full transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Tab Header Navigation */}
            <div className="flex border-b border-gray-200 bg-gray-50/80 px-6 pt-3 shrink-0 gap-2">
              <button
                type="button"
                onClick={() => { setActiveTab("custom"); setEditingItem(null); setEditingStandardKey(null); }}
                className={`pb-3 px-3 text-xs font-bold transition-all border-b-2 flex items-center gap-2 ${
                  activeTab === "custom"
                    ? "border-emerald-600 text-emerald-700 bg-white rounded-t-xl border-t border-x border-gray-200"
                    : "border-transparent text-gray-500 hover:text-gray-800"
                }`}
              >
                <PlusCircle className="w-3.5 h-3.5" /> Item Custom Tambahan ({customKomponen.length})
              </button>
              <button
                type="button"
                onClick={() => { setActiveTab("standard"); setEditingItem(null); setEditingStandardKey(null); }}
                className={`pb-3 px-3 text-xs font-bold transition-all border-b-2 flex items-center gap-2 ${
                  activeTab === "standard"
                    ? "border-emerald-600 text-emerald-700 bg-white rounded-t-xl border-t border-x border-gray-200"
                    : "border-transparent text-gray-500 hover:text-gray-800"
                }`}
              >
                <Sliders className="w-3.5 h-3.5" /> Edit Item Bawaan Sistem (9)
              </button>
            </div>

            {/* Body */}
            <div className="p-6 overflow-y-auto space-y-6">
              {activeTab === "custom" ? (
                <>
                  {/* Form Tambah / Edit Item Custom */}
                  {editingItem ? (
                    <form onSubmit={handleUpdateCustomItem} className="bg-amber-50/70 p-4 rounded-xl border border-amber-200 space-y-4 shadow-sm">
                      <div className="flex items-center justify-between">
                        <h4 className="text-xs font-bold text-amber-800 uppercase tracking-wider flex items-center gap-1.5">
                          <Pencil className="w-3.5 h-3.5" /> Edit Item Custom: <span className="underline">{editingItem.nama}</span>
                        </h4>
                        <button
                          type="button"
                          onClick={() => setEditingItem(null)}
                          className="text-xs text-gray-500 hover:text-gray-800 underline font-medium"
                        >
                          Batal Edit
                        </button>
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-gray-700 mb-1">Nama Item Komponen</label>
                        <input
                          type="text"
                          value={editingItem.nama}
                          onChange={(e) => setEditingItem({ ...editingItem, nama: e.target.value })}
                          placeholder="Contoh: Bonus Tarian, Potongan Seragam, dll."
                          className="w-full border border-gray-300 rounded-xl px-3.5 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-amber-500 font-medium"
                          required
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-gray-700 mb-1">Dampak Terhadap Gaji</label>
                        <div className="grid grid-cols-2 gap-3">
                          <button
                            type="button"
                            onClick={() => setEditingItem({ ...editingItem, tipe: "pemasukan" })}
                            className={`py-2 px-3 rounded-xl border text-xs font-bold flex items-center justify-center gap-1.5 transition-all ${
                              editingItem.tipe === "pemasukan"
                                ? "bg-emerald-600 text-white border-emerald-600 shadow-sm"
                                : "bg-white text-gray-600 border-gray-200 hover:bg-gray-50"
                            }`}
                          >
                            <TrendingUp className="w-3.5 h-3.5" /> Gaji Bertambah (+ Pemasukan)
                          </button>
                          <button
                            type="button"
                            onClick={() => setEditingItem({ ...editingItem, tipe: "potongan" })}
                            className={`py-2 px-3 rounded-xl border text-xs font-bold flex items-center justify-center gap-1.5 transition-all ${
                              editingItem.tipe === "potongan"
                                ? "bg-red-600 text-white border-red-600 shadow-sm"
                                : "bg-white text-gray-600 border-gray-200 hover:bg-gray-50"
                            }`}
                          >
                            <TrendingDown className="w-3.5 h-3.5" /> Gaji Terpotong (- Potongan)
                          </button>
                        </div>
                      </div>

                      <div className="flex gap-2">
                        <button
                          type="submit"
                          disabled={isAddingItem || !editingItem.nama.trim()}
                          className="flex-1 py-2.5 bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition-all shadow-sm flex items-center justify-center gap-2"
                        >
                          <Save className="w-4 h-4" /> {isAddingItem ? "Menyimpan..." : "Simpan Perubahan"}
                        </button>
                        <button
                          type="button"
                          onClick={() => setEditingItem(null)}
                          className="px-4 py-2.5 bg-white border border-gray-300 hover:bg-gray-100 text-gray-700 rounded-xl text-xs font-bold transition-all"
                        >
                          Batal
                        </button>
                      </div>
                    </form>
                  ) : (
                    <form onSubmit={handleTambahCustomItem} className="bg-emerald-50/60 p-4 rounded-xl border border-emerald-200/80 space-y-4">
                      <h4 className="text-xs font-bold text-emerald-800 uppercase tracking-wider">Tambah Item Komponen Baru</h4>
                      <div>
                        <label className="block text-xs font-bold text-gray-700 mb-1">Nama Item Komponen</label>
                        <input
                          type="text"
                          value={newNamaItem}
                          onChange={(e) => setNewNamaItem(e.target.value)}
                          placeholder="Contoh: Bonus Tarian, Potongan Seragam, dll."
                          className="w-full border border-gray-300 rounded-xl px-3.5 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-emerald-600 font-medium"
                          required
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-gray-700 mb-1">Dampak Terhadap Gaji</label>
                        <div className="grid grid-cols-2 gap-3">
                          <button
                            type="button"
                            onClick={() => setNewTipeItem("pemasukan")}
                            className={`py-2 px-3 rounded-xl border text-xs font-bold flex items-center justify-center gap-1.5 transition-all ${
                              newTipeItem === "pemasukan"
                                ? "bg-emerald-600 text-white border-emerald-600 shadow-sm"
                                : "bg-white text-gray-600 border-gray-200 hover:bg-gray-50"
                            }`}
                          >
                            <TrendingUp className="w-3.5 h-3.5" /> Gaji Bertambah (+ Pemasukan)
                          </button>
                          <button
                            type="button"
                            onClick={() => setNewTipeItem("potongan")}
                            className={`py-2 px-3 rounded-xl border text-xs font-bold flex items-center justify-center gap-1.5 transition-all ${
                              newTipeItem === "potongan"
                                ? "bg-red-600 text-white border-red-600 shadow-sm"
                                : "bg-white text-gray-600 border-gray-200 hover:bg-gray-50"
                            }`}
                          >
                            <TrendingDown className="w-3.5 h-3.5" /> Gaji Terpotong (- Potongan)
                          </button>
                        </div>
                      </div>

                      <button
                        type="submit"
                        disabled={isAddingItem || !newNamaItem.trim()}
                        className="w-full py-2.5 bg-emerald-700 hover:bg-emerald-800 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition-all shadow-sm flex items-center justify-center gap-2"
                      >
                        <Plus className="w-4 h-4" /> {isAddingItem ? "Menyimpan..." : "Simpan Item Komponen"}
                      </button>
                    </form>
                  )}

                  {/* Daftar Item Custom */}
                  <div className="space-y-3">
                    <h4 className="text-xs font-bold text-gray-600 uppercase tracking-wider">Daftar Komponen Custom Tersimpan ({customKomponen.length})</h4>
                    {customKomponen.length === 0 ? (
                      <p className="text-xs text-gray-400 italic py-3 text-center border border-dashed border-gray-200 rounded-xl">
                        Belum ada komponen gaji custom yang ditambahkan.
                      </p>
                    ) : (
                      <div className="divide-y divide-gray-100 border border-gray-200 rounded-xl overflow-hidden">
                        {customKomponen.map((item) => (
                          <div
                            key={item.id}
                            className={`p-3 flex items-center justify-between transition-colors ${
                              editingItem?.id === item.id ? "bg-amber-50" : "bg-white hover:bg-gray-50"
                            }`}
                          >
                            <div className="flex items-center gap-2.5">
                              <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                item.tipe === "pemasukan"
                                  ? "bg-emerald-100 text-emerald-700"
                                  : "bg-red-100 text-red-700"
                              }`}>
                                {item.tipe === "pemasukan" ? "+ Pemasukan" : "- Potongan"}
                              </span>
                              <span className="text-sm font-bold text-gray-800">{item.nama}</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <button
                                type="button"
                                onClick={() => handleStartEdit(item)}
                                className="p-1.5 text-gray-400 hover:text-amber-600 hover:bg-amber-100 rounded-lg transition-colors"
                                title="Edit Komponen"
                              >
                                <Pencil className="w-4 h-4" />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleHapusCustomItem(item.id, item.nama)}
                                className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                title="Hapus Komponen"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </>
              ) : (
                /* Tab Komponen Bawaan Sistem */
                <div className="space-y-4">
                  <div className="bg-blue-50/70 p-3.5 rounded-xl border border-blue-200 text-xs text-blue-800 space-y-1">
                    <p className="font-bold">Edit Penamaan Komponen Bawaan Sistem</p>
                    <p className="text-blue-700">Anda dapat mengubah label/nama tampilan komponen standar seperti Terlambat/Kostum, Kasbon Makanan, Potongan Bulanan, dll. Nama baru akan otomatis muncul di tabel rekapan dan slip gaji.</p>
                  </div>

                  <div className="divide-y divide-gray-100 border border-gray-200 rounded-xl overflow-hidden bg-white">
                    {[
                      { key: "lembur", labelDefault: "Lembur", tipe: "pemasukan" },
                      { key: "thr", labelDefault: "Bonus THR", tipe: "pemasukan" },
                      { key: "homestay", labelDefault: "Bonus Homestay", tipe: "pemasukan" },
                      { key: "tidakHadir", labelDefault: "Tidak Hadir", tipe: "potongan" },
                      { key: "kasbonLama", labelDefault: "Kasbon", tipe: "potongan" },
                      { key: "dendaKostum", labelDefault: "Terlambat / Kostum", tipe: "potongan" },
                      { key: "kasbonMakanan", labelDefault: "Kasbon Makanan", tipe: "potongan" },
                      { key: "potonganBulanan", labelDefault: "Potongan Bulanan", tipe: "potongan" },
                      { key: "panjar", labelDefault: "Panjar", tipe: "potongan" },
                    ].map((item) => {
                      const isEditing = editingStandardKey === item.key;
                      const activeLabel = standardLabels[item.key] || item.labelDefault;

                      return (
                        <div key={item.key} className="p-3 bg-white hover:bg-gray-50/80 transition-colors">
                          {isEditing ? (
                            <div className="space-y-2 bg-amber-50/80 p-2.5 rounded-lg border border-amber-200">
                              <div className="flex justify-between items-center text-xs">
                                <span className="font-bold text-amber-900">Ubah Nama: {item.labelDefault}</span>
                                <span className="text-[10px] text-gray-500">Default: "{item.labelDefault}"</span>
                              </div>
                              <input
                                type="text"
                                value={editingStandardValue}
                                onChange={(e) => setEditingStandardValue(e.target.value)}
                                className="w-full border border-gray-300 rounded-lg px-3 py-1.5 text-xs bg-white focus:outline-none focus:ring-2 focus:ring-amber-500 font-bold"
                              />
                              <div className="flex gap-2 justify-end pt-1">
                                <button
                                  type="button"
                                  onClick={() => handleSaveStandardLabel(item.key, item.labelDefault)}
                                  className="px-2.5 py-1 text-[10px] font-bold text-gray-600 hover:text-gray-800 bg-gray-200/70 hover:bg-gray-200 rounded"
                                >
                                  Reset Default
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setEditingStandardKey(null)}
                                  className="px-2.5 py-1 text-[10px] font-bold text-gray-600 hover:text-gray-800 bg-white border border-gray-300 rounded"
                                >
                                  Batal
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleSaveStandardLabel(item.key, editingStandardValue)}
                                  className="px-3 py-1 text-[10px] font-bold text-white bg-amber-600 hover:bg-amber-700 rounded shadow-sm"
                                >
                                  Simpan
                                </button>
                              </div>
                            </div>
                          ) : (
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2.5">
                                <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                  item.tipe === "pemasukan" ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-700"
                                }`}>
                                  {item.tipe === "pemasukan" ? "+ Pemasukan" : "- Potongan"}
                                </span>
                                <div>
                                  <span className="text-sm font-bold text-gray-800">{activeLabel}</span>
                                  {activeLabel !== item.labelDefault && (
                                    <span className="text-[10px] text-gray-400 block">(Bawaan: {item.labelDefault})</span>
                                  )}
                                </div>
                              </div>
                              <button
                                type="button"
                                onClick={() => {
                                  setEditingStandardKey(item.key);
                                  setEditingStandardValue(activeLabel);
                                }}
                                className="p-1.5 text-gray-400 hover:text-amber-600 hover:bg-amber-100 rounded-lg transition-colors flex items-center gap-1 text-xs font-bold"
                                title="Edit Nama Komponen"
                              >
                                <Pencil className="w-3.5 h-3.5" /> Edit
                              </button>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-gray-100 bg-gray-50 flex justify-end shrink-0">
              <button
                type="button"
                onClick={() => setIsManageItemModalOpen(false)}
                className="px-4 py-2 bg-white border border-gray-200 hover:bg-gray-100 text-gray-700 rounded-xl text-xs font-bold transition-all shadow-sm"
              >
                Selesai
              </button>
            </div>
          </div>
        </div>
      )}

      <style jsx global>{`
        @media print {
          @page {
            size: A4 portrait;
            margin: ${isCetakTabel ? '0.4cm 0.3cm' : '0.8cm 0.6cm'};
          }
          body {
            background-color: white !important;
            margin: 0 !important;
            padding: 0 !important;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
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
            padding: 12px 16px !important;
            box-sizing: border-box !important;
          }
          .slip-container:last-child {
            page-break-after: auto;
          }
          .cetak-tabel-potret {
            width: 100% !important;
            padding: 0 !important;
          }
          .cetak-tabel-potret table {
            width: 100% !important;
            table-layout: fixed !important;
          }
        }
      `}</style>
    </div>
  );
}
