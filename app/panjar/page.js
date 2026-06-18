"use client";
import { useState, useEffect, useCallback } from "react";
import {
  collection,
  getDocs,
  addDoc,
  deleteDoc,
  doc,
  query,
  orderBy,
  serverTimestamp,
  where,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import {
  WalletCards,
  Plus,
  AlertCircle,
  RefreshCw,
  Trash2,
  Calendar,
} from "lucide-react";

export default function PanjarPage() {
  const [karyawanList, setKaryawanList] = useState([]);
  const [panjarList, setPanjarList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState({ type: "", message: "" });

  // State Filter Waktu (Default: Bulan Berjalan)
  const [bulan, setBulan] = useState(new Date().getMonth() + 1);
  const [tahun, setTahun] = useState(new Date().getFullYear());

  const [formData, setFormData] = useState({
    karyawanId: "",
    tanggal: new Date().toISOString().split("T")[0],
    nominal: "",
  });

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      // 1. Ambil Karyawan Aktif untuk Dropdown
      const qKaryawan = query(
        collection(db, "karyawan"),
        where("statusAktif", "==", true),
      );
      const snapKaryawan = await getDocs(qKaryawan);
      const dataKaryawan = [];
      snapKaryawan.forEach((doc) =>
        dataKaryawan.push({ id: doc.id, ...doc.data() }),
      );
      dataKaryawan.sort((a, b) => a.nama.localeCompare(b.nama));
      setKaryawanList(dataKaryawan);

      // 2. Ambil Data Panjar
      const qPanjar = query(
        collection(db, "panjar"),
        orderBy("tanggal", "desc"),
      );
      const snapPanjar = await getDocs(qPanjar);
      const dataPanjar = [];
      snapPanjar.forEach((doc) => {
        const trx = { id: doc.id, ...doc.data() };
        // Filter di sisi klien berdasarkan bulan & tahun
        const trxDate = new Date(trx.tanggal);
        if (
          trxDate.getMonth() + 1 === bulan &&
          trxDate.getFullYear() === tahun
        ) {
          dataPanjar.push(trx);
        }
      });
      setPanjarList(dataPanjar);
    } catch (error) {
      console.error("Error fetching data:", error);
      setStatus({ type: "error", message: "Gagal memuat data dari database." });
    } finally {
      setLoading(false);
    }
  }, [bulan, tahun]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleInputChange = (e) =>
    setFormData({ ...formData, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.karyawanId) {
      setStatus({ type: "error", message: "Silakan pilih nama karyawan." });
      return;
    }

    setStatus({ type: "info", message: "Menyimpan panjar..." });
    const karyawanTerpilih = karyawanList.find(
      (k) => k.id === formData.karyawanId,
    );

    try {
      await addDoc(collection(db, "panjar"), {
        karyawanId: karyawanTerpilih.id,
        namaKaryawan: karyawanTerpilih.nama,
        tanggal: formData.tanggal,
        nominal: Number(formData.nominal),
        isLunas: false, // Menandakan belum dipotong dari gaji
        timestamp: serverTimestamp(),
      });

      setStatus({ type: "success", message: "Panjar berhasil dicatat!" });
      setFormData({ ...formData, nominal: "" });
      fetchData();
    } catch (error) {
      setStatus({ type: "error", message: "Gagal mencatat panjar." });
    }
    setTimeout(() => setStatus({ type: "", message: "" }), 3000);
  };

  const handleDelete = async (id, nama) => {
    if (!window.confirm(`Hapus catatan panjar untuk ${nama}?`)) return;
    try {
      await deleteDoc(doc(db, "panjar", id));
      fetchData();
    } catch (error) {
      alert("Gagal menghapus catatan panjar.");
    }
  };

  const formatRupiah = (angka) =>
    new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      minimumFractionDigits: 0,
    }).format(angka);
  const formatTanggal = (tgl) =>
    new Date(tgl).toLocaleDateString("id-ID", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });

  return (
    <div className="max-w-5xl mx-auto pb-12">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-papua-primary">
          Catatan Panjar (Kasbon)
        </h1>
        <p className="text-gray-500 mt-1">
          Pencatatan uang muka karyawan sebelum tanggal gajian.
        </p>
      </div>

      {status.message && (
        <div
          className={`p-4 rounded-lg mb-6 flex items-center gap-3 border ${status.type === "error" ? "bg-papua-red/10 border-papua-red/30 text-papua-red" : status.type === "success" ? "bg-papua-green/10 border-papua-green/30 text-papua-green" : "bg-papua-accent/10 border-papua-accent/20 text-papua-primary"}`}
        >
          <AlertCircle className="w-5 h-5 shrink-0" />
          <span className="text-sm font-medium">{status.message}</span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* FORM INPUT PANJAR */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6 lg:col-span-1 h-fit">
          <div className="flex items-center gap-2 mb-6 border-b border-gray-100 pb-4">
            <WalletCards className="w-5 h-5 text-papua-primary" />
            <h2 className="text-lg font-bold text-papua-primary">
              Input Panjar Baru
            </h2>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-2">
              <label className="text-sm font-semibold text-gray-700">
                Tanggal Pengambilan
              </label>
              <input
                type="date"
                name="tanggal"
                required
                value={formData.tanggal}
                onChange={handleInputChange}
                className="w-full border border-gray-300 rounded-lg px-4 py-2.5 outline-none focus:ring-2 focus:ring-papua-primary text-sm"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-semibold text-gray-700">
                Nama Karyawan
              </label>
              <select
                name="karyawanId"
                required
                value={formData.karyawanId}
                onChange={handleInputChange}
                className="w-full border border-gray-300 rounded-lg px-4 py-2.5 outline-none focus:ring-2 focus:ring-papua-primary text-sm bg-white"
              >
                <option value="">-- Pilih Karyawan --</option>
                {karyawanList.map((k) => (
                  <option key={k.id} value={k.id}>
                    {k.nama}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-semibold text-gray-700">
                Nominal (Rp)
              </label>
              <input
                type="number"
                name="nominal"
                required
                min="1"
                placeholder="Contoh: 100000"
                value={formData.nominal}
                onChange={handleInputChange}
                className="w-full border border-gray-300 rounded-lg px-4 py-2.5 outline-none focus:ring-2 focus:ring-papua-primary text-sm"
              />
            </div>

            <button
              type="submit"
              className="w-full flex items-center justify-center gap-2 bg-papua-primary hover:bg-papua-primary text-white px-4 py-2.5 rounded-lg text-sm font-bold transition-colors shadow-sm pt-4 mt-2"
            >
              <Plus className="w-4 h-4" /> Simpan Catatan Panjar
            </button>
          </form>
        </div>

        {/* TABEL RIWAYAT PANJAR */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm lg:col-span-2 overflow-hidden">
          <div className="p-5 border-b border-gray-100 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-gray-50">
            <h2 className="text-lg font-bold text-papua-primary">
              Riwayat Panjar Karyawan
            </h2>

            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-gray-500" />
              <select
                value={bulan}
                onChange={(e) => setBulan(Number(e.target.value))}
                className="border border-gray-300 rounded-md px-2 py-1 text-xs bg-white"
              >
                {[
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
                ].map((nama, idx) => (
                  <option key={idx} value={idx + 1}>
                    {nama}
                  </option>
                ))}
              </select>
              <select
                value={tahun}
                onChange={(e) => setTahun(Number(e.target.value))}
                className="border border-gray-300 rounded-md px-2 py-1 text-xs bg-white"
              >
                {[2024, 2025, 2026, 2027].map((thn) => (
                  <option key={thn} value={thn}>
                    {thn}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-white text-gray-500 font-medium border-b border-gray-100">
                <tr>
                  <th className="px-6 py-4">Tanggal</th>
                  <th className="px-6 py-4">Nama Karyawan</th>
                  <th className="px-6 py-4 text-right">Nominal (Rp)</th>
                  <th className="px-6 py-4 text-center">Status Pemotongan</th>
                  <th className="px-6 py-4 text-center">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {loading ? (
                  <tr>
                    <td colSpan="5" className="px-6 py-12 text-center">
                      <RefreshCw className="w-6 h-6 text-papua-accent animate-spin mx-auto" />
                    </td>
                  </tr>
                ) : panjarList.length === 0 ? (
                  <tr>
                    <td
                      colSpan="5"
                      className="px-6 py-12 text-center text-gray-500"
                    >
                      Tidak ada catatan panjar pada bulan ini.
                    </td>
                  </tr>
                ) : (
                  panjarList.map((panjar) => (
                    <tr
                      key={panjar.id}
                      className="hover:bg-gray-50 transition-colors"
                    >
                      <td className="px-6 py-4 text-gray-500 whitespace-nowrap">
                        {formatTanggal(panjar.tanggal)}
                      </td>
                      <td className="px-6 py-4 font-bold text-papua-primary">
                        {panjar.namaKaryawan}
                      </td>
                      <td className="px-6 py-4 text-right font-semibold text-gray-800">
                        {formatRupiah(panjar.nominal)}
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span
                          className={`px-2 py-1 text-[10px] font-bold rounded uppercase tracking-wider ${panjar.isLunas ? "bg-papua-green/20 text-papua-green" : "bg-amber-100 text-amber-700"}`}
                        >
                          {panjar.isLunas ? "SUDAH DIPOTONG" : "BELUM LUNAS"}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <button
                          onClick={() =>
                            handleDelete(panjar.id, panjar.namaKaryawan)
                          }
                          disabled={panjar.isLunas}
                          className="p-2 text-gray-400 hover:text-papua-red hover:bg-papua-red/10 rounded-lg transition-colors disabled:opacity-30 disabled:hover:bg-transparent"
                          title={
                            panjar.isLunas
                              ? "Tidak dapat dihapus karena sudah masuk rekapan gaji"
                              : "Hapus Panjar"
                          }
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
