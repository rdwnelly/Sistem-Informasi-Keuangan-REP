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
  });

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
      [name]: name === "gajiPokok" ? Number(value) : value.toUpperCase(), // Nama selalu kapital
    }));
  };

  const openModalAdd = () => {
    setFormData({ nama: "", jabatan: "Karyawan", gajiPokok: 2100000 });
    setIsEditing(false);
    setIsModalOpen(true);
  };

  const openModalEdit = (karyawan) => {
    setFormData({
      nama: karyawan.nama,
      jabatan: karyawan.jabatan,
      gajiPokok: karyawan.gajiPokok,
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

      {/* TABEL DATA KARYAWAN */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="p-5 border-b border-gray-100 flex items-center gap-3 bg-gray-50">
          <Users className="w-5 h-5 text-gray-500" />
          <h2 className="text-lg font-bold text-papua-primary">
            Daftar Karyawan Aktif & Nonaktif
          </h2>
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
              ) : karyawanList.length === 0 ? (
                <tr>
                  <td
                    colSpan="6"
                    className="px-6 py-8 text-center text-gray-500"
                  >
                    Belum ada data karyawan. Silakan tambah baru.
                  </td>
                </tr>
              ) : (
                karyawanList.map((karyawan, index) => (
                  <tr
                    key={karyawan.id}
                    className={`hover:bg-gray-50 transition-colors ${!karyawan.statusAktif ? "opacity-60 bg-gray-50" : ""}`}
                  >
                    <td className="px-6 py-4 text-center text-gray-400">
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
                      <span
                        className={`px-3 py-1 text-xs font-bold rounded-full border ${karyawan.statusAktif ? "bg-papua-green/10 text-papua-green border-papua-green/30" : "bg-papua-red/10 text-papua-red border-papua-red/30"}`}
                      >
                        {karyawan.statusAktif ? "AKTIF" : "NONAKTIF"}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-center flex items-center justify-center gap-2">
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
                        className={`p-2 border rounded-lg transition-colors ${karyawan.statusAktif ? "text-gray-400 hover:text-papua-red hover:bg-papua-red/10 border-gray-200" : "text-gray-400 hover:text-papua-green hover:bg-papua-green/10 border-gray-200"}`}
                        title={
                          karyawan.statusAktif
                            ? "Nonaktifkan Karyawan"
                            : "Aktifkan Karyawan"
                        }
                      >
                        {karyawan.statusAktif ? (
                          <UserX className="w-4 h-4" />
                        ) : (
                          <UserCheck className="w-4 h-4" />
                        )}
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
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden">
            <div className="flex justify-between items-center p-5 border-b border-gray-100 bg-gray-50">
              <h2 className="text-lg font-bold text-papua-primary">
                {isEditing ? "Edit Data Karyawan" : "Tambah Karyawan Baru"}
              </h2>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-5">
              <div className="space-y-2">
                <label className="text-sm font-semibold text-gray-700">
                  Nama Lengkap (Sesuai KTP/Buku Rekening)
                </label>
                <input
                  type="text"
                  name="nama"
                  required
                  value={formData.nama}
                  onChange={handleInputChange}
                  placeholder="Contoh: ROSELINA MAYOR"
                  className="w-full border border-gray-300 rounded-lg px-4 py-2.5 outline-none focus:ring-2 focus:ring-papua-primary uppercase"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-semibold text-gray-700">
                  Jabatan / Posisi
                </label>
                <input
                  type="text"
                  name="jabatan"
                  required
                  value={formData.jabatan}
                  onChange={handleInputChange}
                  placeholder="Contoh: Karyawan"
                  className="w-full border border-gray-300 rounded-lg px-4 py-2.5 outline-none focus:ring-2 focus:ring-papua-primary"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-semibold text-gray-700">
                  Standar Gaji Pokok (Rp)
                </label>
                <input
                  type="number"
                  name="gajiPokok"
                  required
                  min="0"
                  value={formData.gajiPokok}
                  onChange={handleInputChange}
                  className="w-full border border-gray-300 rounded-lg px-4 py-2.5 outline-none focus:ring-2 focus:ring-papua-primary"
                />
              </div>

              <div className="pt-4 flex gap-3">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1 px-4 py-2.5 border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition-colors"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2.5 bg-papua-primary text-white rounded-lg font-bold hover:bg-papua-primary transition-colors shadow-sm"
                >
                  {isEditing ? "Simpan Perubahan" : "Simpan Karyawan"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
