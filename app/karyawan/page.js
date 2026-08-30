"use client";
import { useState, useEffect, useCallback } from "react";
import {
  collection,
  getDocs,
  addDoc,
  updateDoc,
  doc,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import {
  Users,
  Plus,
  Edit2,
  UserCheck,
  UserX,
  AlertCircle,
  RefreshCw,
  X,
  Eye,
  User,
  Briefcase,
  Phone,
  CreditCard,
  Calendar,
  MapPin,
  Save,
  UserPlus
} from "lucide-react";

export default function KaryawanPage() {
  const [karyawanList, setKaryawanList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState({ type: "", message: "" });

  // State untuk Modal Form
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editId, setEditId] = useState(null);
  const [formData, setFormData] = useState({
    nama: "",
    jabatan: "Karyawan",
    gajiPokok: 2100000,
    noHp: "",
    rekeningBank: "",
    tanggalLahir: "",
    alamat: "",
  });

  const [isModalDetailOpen, setIsModalDetailOpen] = useState(false);
  const [selectedKaryawan, setSelectedKaryawan] = useState(null);

  const fetchKaryawan = useCallback(async () => {
    setLoading(true);
    try {
      const querySnapshot = await getDocs(collection(db, "karyawan"));
      const data = [];
      querySnapshot.forEach((doc) => {
        data.push({ id: doc.id, ...doc.data() });
      });
      // Urutkan alfabetis
      data.sort((a, b) => a.nama.localeCompare(b.nama));
      setKaryawanList(data);
    } catch (error) {
      console.error("Error fetching karyawan:", error);
      setStatus({ type: "error", message: "Gagal memuat data karyawan." });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchKaryawan();
  }, [fetchKaryawan]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: name === "gajiPokok" ? Number(value) : (name === "nama" ? value.toUpperCase() : value),
    }));
  };

  const openModalAdd = () => {
    setFormData({ nama: "", jabatan: "Karyawan", gajiPokok: 2100000, noHp: "", rekeningBank: "", tanggalLahir: "", alamat: "" });
    setIsEditing(false);
    setIsModalOpen(true);
  };

  const openModalEdit = (karyawan) => {
    setFormData({
      nama: karyawan.nama,
      jabatan: karyawan.jabatan,
      gajiPokok: karyawan.gajiPokok,
      noHp: karyawan.noHp || "",
      rekeningBank: karyawan.rekeningBank || "",
      tanggalLahir: karyawan.tanggalLahir || "",
      alamat: karyawan.alamat || "",
    });
    setEditId(karyawan.id);
    setIsEditing(true);
    setIsModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setStatus({ type: "info", message: "Memproses data..." });

    try {
      if (isEditing) {
        const ref = doc(db, "karyawan", editId);
        await updateDoc(ref, {
          nama: formData.nama,
          jabatan: formData.jabatan,
          gajiPokok: formData.gajiPokok,
          noHp: formData.noHp,
          rekeningBank: formData.rekeningBank,
          tanggalLahir: formData.tanggalLahir,
          alamat: formData.alamat,
          updatedAt: serverTimestamp(),
        });
        setStatus({
          type: "success",
          message: "Data karyawan berhasil diperbarui!",
        });
      } else {
        await addDoc(collection(db, "karyawan"), {
          nama: formData.nama,
          jabatan: formData.jabatan,
          gajiPokok: formData.gajiPokok,
          noHp: formData.noHp,
          rekeningBank: formData.rekeningBank,
          tanggalLahir: formData.tanggalLahir,
          alamat: formData.alamat,
          statusAktif: true,
          createdAt: serverTimestamp(),
        });
        setStatus({
          type: "success",
          message: "Karyawan baru berhasil ditambahkan!",
        });
      }
      setIsModalOpen(false);
      fetchKaryawan();
    } catch (error) {
      setStatus({ type: "error", message: "Terjadi kesalahan sistem." });
    }
    setTimeout(() => setStatus({ type: "", message: "" }), 3000);
  };

  const toggleStatus = async (id, currentStatus, nama) => {
    const confirmMsg = currentStatus
      ? `Nonaktifkan ${nama}? (Tidak akan muncul di rekapan gaji bulan depan)`
      : `Aktifkan kembali ${nama}?`;

    if (!window.confirm(confirmMsg)) return;

    try {
      await updateDoc(doc(db, "karyawan", id), { statusAktif: !currentStatus });
      fetchKaryawan();
    } catch (error) {
      alert("Gagal mengubah status karyawan.");
    }
  };

  const formatRupiah = (angka) =>
    new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      minimumFractionDigits: 0,
    }).format(angka);

  const openModalDetail = (karyawan) => {
    setSelectedKaryawan(karyawan);
    setIsModalDetailOpen(true);
  };

  const karyawanAktif = karyawanList.filter((k) => k.statusAktif);
  const karyawanNonaktif = karyawanList.filter((k) => !k.statusAktif);

  return (
    <div className="max-w-5xl mx-auto pb-12 relative">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end mb-8 gap-4">
        <div>
          <h1 className="text-2xl font-bold text-papua-primary">
            Buku Induk Karyawan
          </h1>
          <p className="text-gray-500 mt-1">
            Kelola data profil dan standar gaji pokok Yayasan REP.
          </p>
        </div>
        <button
          onClick={openModalAdd}
          className="flex items-center gap-2 bg-papua-primary hover:bg-papua-primary text-white px-4 py-2.5 rounded-lg text-sm font-bold transition-colors shadow-sm"
        >
          <Plus className="w-5 h-5" /> Tambah Karyawan
        </button>
      </div>

      {status.message && (
        <div
          className={`p-4 rounded-lg mb-6 flex items-center gap-3 border ${status.type === "error" ? "bg-papua-red/10 border-papua-red/30 text-papua-red" : "bg-papua-green/10 border-papua-green/30 text-papua-green"}`}
        >
          <AlertCircle className="w-5 h-5" />
          <span className="text-sm font-medium">{status.message}</span>
        </div>
      )}

      {/* TABEL DATA KARYAWAN AKTIF */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden mb-8">
        <div className="p-5 border-b border-gray-100 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-gray-50">
          <div className="flex items-center gap-3">
            <UserCheck className="w-5 h-5 text-papua-green" />
            <div>
              <h2 className="text-lg font-bold text-papua-primary">
                Daftar Karyawan Aktif
              </h2>
              <p className="text-xs text-gray-500 mt-0.5">
                Karyawan yang saat ini aktif bekerja dan masuk dalam perhitungan gaji bulanan.
              </p>
            </div>
          </div>
          <span className="px-3 py-1 bg-papua-green/10 text-papua-green border border-papua-green/30 rounded-full text-xs font-bold shrink-0">
            {karyawanAktif.length} Karyawan Aktif
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-white text-gray-500 font-medium border-b border-gray-100">
              <tr>
                <th className="px-6 py-4 w-12 text-center">No</th>
                <th className="px-6 py-4">Nama Lengkap</th>
                <th className="px-6 py-4">Jabatan</th>
                <th className="px-6 py-4 text-right">Gaji Pokok (Rp)</th>
                <th className="px-6 py-4 text-center">Status</th>
                <th className="px-6 py-4 text-center">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {loading ? (
                <tr>
                  <td colSpan="6" className="px-6 py-12 text-center">
                    <RefreshCw className="w-6 h-6 text-papua-accent animate-spin mx-auto" />
                  </td>
                </tr>
              ) : karyawanAktif.length === 0 ? (
                <tr>
                  <td
                    colSpan="6"
                    className="px-6 py-8 text-center text-gray-500"
                  >
                    Belum ada data karyawan aktif. Silakan klik Tambah Karyawan.
                  </td>
                </tr>
              ) : (
                karyawanAktif.map((karyawan, index) => (
                  <tr
                    key={karyawan.id}
                    className="hover:bg-gray-50 transition-colors"
                  >
                    <td className="px-6 py-4 text-center text-gray-400 font-medium">
                      {index + 1}
                    </td>
                    <td className="px-6 py-4 font-bold text-papua-primary">
                      {karyawan.nama}
                    </td>
                    <td className="px-6 py-4 text-gray-600">
                      {karyawan.jabatan}
                    </td>
                    <td className="px-6 py-4 text-right font-semibold text-gray-800">
                      {formatRupiah(karyawan.gajiPokok)}
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className="px-3 py-1 text-xs font-bold rounded-full border bg-papua-green/10 text-papua-green border-papua-green/30">
                        AKTIF
                      </span>
                    </td>
                    <td className="px-6 py-4 text-center flex items-center justify-center gap-2">
                      <button
                        onClick={() => openModalDetail(karyawan)}
                        className="p-2 text-gray-400 hover:text-blue-500 bg-white border border-gray-200 hover:bg-blue-50 rounded-lg transition-colors"
                        title="Detail Karyawan"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => openModalEdit(karyawan)}
                        className="p-2 text-gray-400 hover:text-papua-primary bg-white border border-gray-200 hover:bg-papua-accent/10 rounded-lg transition-colors"
                        title="Edit Data"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() =>
                          toggleStatus(
                            karyawan.id,
                            karyawan.statusAktif,
                            karyawan.nama,
                          )
                        }
                        className="p-2 text-gray-400 hover:text-papua-red hover:bg-papua-red/10 border border-gray-200 rounded-lg transition-colors"
                        title="Nonaktifkan Karyawan"
                      >
                        <UserX className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* TABEL DATA KARYAWAN NONAKTIF */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="p-5 border-b border-gray-100 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-gray-50">
          <div className="flex items-center gap-3">
            <UserX className="w-5 h-5 text-gray-500" />
            <div>
              <h2 className="text-lg font-bold text-gray-700">
                Daftar Karyawan Nonaktif
              </h2>
              <p className="text-xs text-gray-500 mt-0.5">
                Karyawan yang telah dinonaktifkan (tidak masuk dalam rekapan gaji bulanan).
              </p>
            </div>
          </div>
          <span className="px-3 py-1 bg-gray-100 text-gray-600 border border-gray-200 rounded-full text-xs font-bold shrink-0">
            {karyawanNonaktif.length} Karyawan Nonaktif
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-white text-gray-500 font-medium border-b border-gray-100">
              <tr>
                <th className="px-6 py-4 w-12 text-center">No</th>
                <th className="px-6 py-4">Nama Lengkap</th>
                <th className="px-6 py-4">Jabatan</th>
                <th className="px-6 py-4 text-right">Gaji Pokok (Rp)</th>
                <th className="px-6 py-4 text-center">Status</th>
                <th className="px-6 py-4 text-center">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {loading ? (
                <tr>
                  <td colSpan="6" className="px-6 py-12 text-center">
                    <RefreshCw className="w-6 h-6 text-papua-accent animate-spin mx-auto" />
                  </td>
                </tr>
              ) : karyawanNonaktif.length === 0 ? (
                <tr>
                  <td
                    colSpan="6"
                    className="px-6 py-8 text-center text-gray-400 italic"
                  >
                    Tidak ada data karyawan nonaktif.
                  </td>
                </tr>
              ) : (
                karyawanNonaktif.map((karyawan, index) => (
                  <tr
                    key={karyawan.id}
                    className="hover:bg-gray-50/80 bg-gray-50/40 text-gray-500 transition-colors"
                  >
                    <td className="px-6 py-4 text-center text-gray-400 font-medium">
                      {index + 1}
                    </td>
                    <td className="px-6 py-4 font-bold text-gray-700">
                      {karyawan.nama}
                    </td>
                    <td className="px-6 py-4 text-gray-500">
                      {karyawan.jabatan}
                    </td>
                    <td className="px-6 py-4 text-right font-medium text-gray-600">
                      {formatRupiah(karyawan.gajiPokok)}
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className="px-3 py-1 text-xs font-bold rounded-full border bg-papua-red/10 text-papua-red border-papua-red/30">
                        NONAKTIF
                      </span>
                    </td>
                    <td className="px-6 py-4 text-center flex items-center justify-center gap-2">
                      <button
                        onClick={() => openModalDetail(karyawan)}
                        className="p-2 text-gray-400 hover:text-blue-500 bg-white border border-gray-200 hover:bg-blue-50 rounded-lg transition-colors"
                        title="Detail Karyawan"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => openModalEdit(karyawan)}
                        className="p-2 text-gray-400 hover:text-papua-primary bg-white border border-gray-200 hover:bg-papua-accent/10 rounded-lg transition-colors"
                        title="Edit Data"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() =>
                          toggleStatus(
                            karyawan.id,
                            karyawan.statusAktif,
                            karyawan.nama,
                          )
                        }
                        className="p-2 text-gray-400 hover:text-papua-green hover:bg-papua-green/10 border border-gray-200 rounded-lg transition-colors"
                        title="Aktifkan Kembali Karyawan"
                      >
                        <UserCheck className="w-4 h-4 text-emerald-600" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL FORM TAMBAH/EDIT */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-0">
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-sm transition-opacity"
            onClick={() => setIsModalOpen(false)}
          />
          <div className="relative bg-white rounded-2xl w-full max-w-xl shadow-2xl z-10 overflow-hidden flex flex-col max-h-[90vh]">
            <div className="bg-gradient-to-r from-papua-primary to-gray-900 px-6 py-4 flex justify-between items-center shrink-0">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-white/20 rounded-lg shadow-inner">
                  {isEditing ? <Edit2 className="w-5 h-5 text-white" /> : <UserPlus className="w-5 h-5 text-white" />}
                </div>
                <h2 className="text-lg font-bold text-white tracking-wide">
                  {isEditing ? "Edit Data Karyawan" : "Tambah Karyawan Baru"}
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="text-white/70 hover:text-white hover:bg-white/20 p-2 rounded-full transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-5">
              <div className="space-y-2">
                <label className="text-xs font-bold text-gray-700 uppercase tracking-wide">
                  Nama Lengkap
                </label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
                  <input
                    type="text"
                    name="nama"
                    required
                    value={formData.nama}
                    onChange={handleInputChange}
                    placeholder="Sesuai KTP/Buku Rekening"
                    className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl bg-gray-50 focus:bg-white outline-none focus:ring-2 focus:ring-papua-primary focus:border-papua-primary transition-all font-medium uppercase text-sm"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-gray-700 uppercase tracking-wide">
                    Jabatan / Posisi
                  </label>
                  <div className="relative">
                    <Briefcase className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
                    <input
                      type="text"
                      name="jabatan"
                      required
                      value={formData.jabatan}
                      onChange={handleInputChange}
                      placeholder="Contoh: Karyawan"
                      className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl bg-gray-50 focus:bg-white outline-none focus:ring-2 focus:ring-papua-primary focus:border-papua-primary transition-all font-medium text-sm"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold text-gray-700 uppercase tracking-wide">
                    Standar Gaji Pokok
                  </label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 font-bold text-sm pointer-events-none">Rp</span>
                    <input
                      type="number"
                      name="gajiPokok"
                      required
                      min="0"
                      value={formData.gajiPokok}
                      onChange={handleInputChange}
                      className="w-full pl-11 pr-4 py-3 border border-gray-200 rounded-xl bg-gray-50 focus:bg-white outline-none focus:ring-2 focus:ring-papua-primary focus:border-papua-primary transition-all font-medium text-sm"
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-gray-700 uppercase tracking-wide">
                    Nomor HP
                  </label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
                    <input
                      type="text"
                      name="noHp"
                      value={formData.noHp}
                      onChange={handleInputChange}
                      placeholder="Opsional (081...)"
                      className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl bg-gray-50 focus:bg-white outline-none focus:ring-2 focus:ring-papua-primary focus:border-papua-primary transition-all font-medium text-sm"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold text-gray-700 uppercase tracking-wide">
                    Tanggal Lahir
                  </label>
                  <div className="relative">
                    <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
                    <input
                      type="date"
                      name="tanggalLahir"
                      value={formData.tanggalLahir}
                      onChange={handleInputChange}
                      className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl bg-gray-50 focus:bg-white outline-none focus:ring-2 focus:ring-papua-primary focus:border-papua-primary transition-all font-medium text-sm"
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold text-gray-700 uppercase tracking-wide">
                  Rekening Bank
                </label>
                <div className="relative">
                  <CreditCard className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
                  <input
                    type="text"
                    name="rekeningBank"
                    value={formData.rekeningBank}
                    onChange={handleInputChange}
                    placeholder="Opsional (BCA - 123...)"
                    className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl bg-gray-50 focus:bg-white outline-none focus:ring-2 focus:ring-papua-primary focus:border-papua-primary transition-all font-medium text-sm"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold text-gray-700 uppercase tracking-wide">
                  Alamat Lengkap
                </label>
                <div className="relative">
                  <MapPin className="absolute left-3 top-3 w-5 h-5 text-gray-400 pointer-events-none" />
                  <textarea
                    name="alamat"
                    value={formData.alamat}
                    onChange={handleInputChange}
                    placeholder="Opsional"
                    rows={2}
                    className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl bg-gray-50 focus:bg-white outline-none focus:ring-2 focus:ring-papua-primary focus:border-papua-primary transition-all resize-none font-medium text-sm"
                  />
                </div>
              </div>

              {/* Footer Buttons */}
              <div className="pt-6 border-t border-gray-100 flex justify-end gap-3 shrink-0">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-6 py-2.5 bg-white border border-gray-200 hover:bg-gray-50 hover:border-gray-300 text-gray-700 rounded-xl text-sm font-bold transition-all shadow-sm"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 bg-papua-primary hover:bg-gray-800 text-white rounded-xl text-sm font-bold transition-all shadow-sm flex items-center gap-2 hover:-translate-y-0.5"
                >
                  <Save className="w-4 h-4" /> {isEditing ? "Simpan Perubahan" : "Simpan Karyawan"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL DETAIL KARYAWAN */}
      {isModalDetailOpen && selectedKaryawan && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden">
            <div className="flex justify-between items-center p-5 border-b border-gray-100 bg-gray-50">
              <h2 className="text-lg font-bold text-papua-primary">Detail Karyawan</h2>
              <button
                onClick={() => setIsModalDetailOpen(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <p className="text-xs text-gray-500 font-bold uppercase mb-1">Nama Lengkap</p>
                <p className="text-sm font-semibold text-gray-800">{selectedKaryawan.nama}</p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-gray-500 font-bold uppercase mb-1">Jabatan</p>
                  <p className="text-sm font-semibold text-gray-800">{selectedKaryawan.jabatan}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 font-bold uppercase mb-1">Status</p>
                  <span className={`px-2 py-0.5 text-xs font-bold rounded-full ${selectedKaryawan.statusAktif ? "bg-papua-green/10 text-papua-green" : "bg-papua-red/10 text-papua-red"}`}>
                    {selectedKaryawan.statusAktif ? "AKTIF" : "NONAKTIF"}
                  </span>
                </div>
              </div>
              <div>
                <p className="text-xs text-gray-500 font-bold uppercase mb-1">Gaji Pokok</p>
                <p className="text-sm font-semibold text-papua-primary">{formatRupiah(selectedKaryawan.gajiPokok)}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500 font-bold uppercase mb-1">Nomor HP</p>
                <p className="text-sm font-semibold text-gray-800">{selectedKaryawan.noHp || "-"}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500 font-bold uppercase mb-1">Rekening Bank</p>
                <p className="text-sm font-semibold text-gray-800">{selectedKaryawan.rekeningBank || "-"}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500 font-bold uppercase mb-1">Tanggal Lahir</p>
                <p className="text-sm font-semibold text-gray-800">
                  {selectedKaryawan.tanggalLahir ? new Date(selectedKaryawan.tanggalLahir).toLocaleDateString('id-ID', { year: 'numeric', month: 'long', day: 'numeric' }) : "-"}
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-500 font-bold uppercase mb-1">Alamat Lengkap</p>
                <p className="text-sm font-semibold text-gray-800">{selectedKaryawan.alamat || "-"}</p>
              </div>
            </div>
            <div className="p-5 border-t border-gray-100 bg-gray-50 flex justify-end">
              <button
                onClick={() => setIsModalDetailOpen(false)}
                className="px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-800 rounded-lg text-sm font-bold transition-colors"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
