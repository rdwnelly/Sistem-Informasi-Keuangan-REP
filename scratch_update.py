import re

with open("app/pengaturan/page.js", "r") as f:
    content = f.read()

content = content.replace(
    "import {\n  Settings,\n  AlertTriangle,\n  Trash2,\n  CheckCircle2,\n  X,\n  ShieldAlert,\n} from \"lucide-react\";",
    "import {\n  Settings,\n  AlertTriangle,\n  Trash2,\n  CheckCircle2,\n  X,\n  ShieldAlert,\n  Calendar,\n} from \"lucide-react\";"
)

content = content.replace(
    "  const [isDeleting, setIsDeleting] = useState(false);\n  const [status, setStatus] = useState({ type: \"\", message: \"\" });\n\n  // Kalimat validasi mutlak yang harus diketik user\n  const REQUIRED_CONFIRM_TEXT = \"SAYA YAKIN HAPUS DATA REP\";",
    "  const [isDeleting, setIsDeleting] = useState(false);\n  const [status, setStatus] = useState({ type: \"\", message: \"\" });\n\n  // State untuk Hapus Bulanan\n  const [isBulanModalOpen, setIsBulanModalOpen] = useState(false);\n  const [confirmTextBulan, setConfirmTextBulan] = useState(\"\");\n  const [bulanHapus, setBulanHapus] = useState(new Date().getMonth() + 1);\n  const [tahunHapus, setTahunHapus] = useState(new Date().getFullYear());\n  const [hapusJurnal, setHapusJurnal] = useState(true);\n  const [hapusPanjar, setHapusPanjar] = useState(true);\n  const [hapusGaji, setHapusGaji] = useState(true);\n\n  // Kalimat validasi mutlak yang harus diketik user\n  const REQUIRED_CONFIRM_TEXT = \"SAYA YAKIN HAPUS DATA REP\";\n  const REQUIRED_CONFIRM_TEXT_BULAN = \"HAPUS DATA BULAN INI\";"
)

func1 = """  const handleOpenBulanModal = () => {
    setConfirmTextBulan("");
    setStatus({ type: "", message: "" });
    setIsBulanModalOpen(true);
  };

  const executeDeleteBulanData = async () => {
    if (confirmTextBulan !== REQUIRED_CONFIRM_TEXT_BULAN) return;

    setIsDeleting(true);
    setStatus({
      type: "info",
      message: "Memproses penghapusan data bulanan...",
    });

    try {
      const targetCollections = [];
      if (hapusJurnal) targetCollections.push("jurnal");
      if (hapusPanjar) targetCollections.push("panjar");
      if (hapusGaji) targetCollections.push("gaji_bulanan");

      if (targetCollections.length === 0) {
        setStatus({ type: "error", message: "Pilih minimal satu jenis data untuk dihapus." });
        setIsDeleting(false);
        return;
      }

      const batch = writeBatch(db);
      let totalDeleted = 0;

      for (const colName of targetCollections) {
        const querySnapshot = await getDocs(collection(db, colName));
        querySnapshot.forEach((doc) => {
          const data = doc.data();
          let docDate = null;

          if (data.tanggal) {
            docDate = new Date(data.tanggal);
          } else if (data.timestamp) {
            docDate = data.timestamp.toDate();
          } else if (data.bulan && data.tahun) {
             if (Number(data.bulan) === bulanHapus && Number(data.tahun) === tahunHapus) {
                batch.delete(doc.ref);
                totalDeleted++;
                return;
             }
          }

          if (docDate && !isNaN(docDate)) {
            if (docDate.getMonth() + 1 === bulanHapus && docDate.getFullYear() === tahunHapus) {
              batch.delete(doc.ref);
              totalDeleted++;
            }
          }
        });
      }

      await batch.commit();

      setStatus({
        type: "success",
        message: `Berhasil! Total ${totalDeleted} dokumen dari bulan ${bulanHapus}/${tahunHapus} telah dihapus.`,
      });
      setIsBulanModalOpen(false);
    } catch (error) {
      console.error("Error menghapus data bulanan:", error);
      setStatus({
        type: "error",
        message: "Gagal menghapus data bulanan. Periksa koneksi internet Anda.",
      });
    } finally {
      setIsDeleting(false);
      setTimeout(() => setStatus({ type: "", message: "" }), 5000);
    }
  };

  const executeDeleteAllData = async () => {"""

content = content.replace("  const executeDeleteAllData = async () => {", func1)

ui1 = """      {/* DANGER ZONE SECTION */}
      <div className="bg-white rounded-xl border-2 border-papua-red/20 shadow-sm overflow-hidden mb-8">
        <div className="bg-papua-red/10 p-5 border-b border-papua-red/20 flex items-center gap-3">
          <ShieldAlert className="w-6 h-6 text-papua-red" />
          <h2 className="text-lg font-black text-papua-red uppercase tracking-wide">
            Danger Zone (Zona Berbahaya)
          </h2>
        </div>

        <div className="p-6 md:p-8 border-b border-gray-100">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
            <div className="max-w-xl">
              <h3 className="text-base font-bold text-papua-primary mb-2">
                Hapus Data Bulanan Tertentu
              </h3>
              <p className="text-sm text-gray-600 leading-relaxed mb-4">
                Pilih bulan dan tahun beserta jenis data yang ingin dihapus. Tindakan ini akan menghapus semua data transaksi pada bulan tersebut tanpa mengganggu bulan lainnya.
              </p>
              
              <div className="flex items-center gap-3 mb-4">
                <Calendar className="w-5 h-5 text-gray-400" />
                <select
                  value={bulanHapus}
                  onChange={(e) => setBulanHapus(Number(e.target.value))}
                  className="border border-gray-300 rounded-md px-3 py-2 text-sm bg-white outline-none focus:ring-2 focus:ring-papua-red"
                >
                  {[
                    "Januari", "Februari", "Maret", "April", "Mei", "Juni",
                    "Juli", "Agustus", "September", "Oktober", "November", "Desember",
                  ].map((nama, idx) => (
                    <option key={idx} value={idx + 1}>{nama}</option>
                  ))}
                </select>
                <select
                  value={tahunHapus}
                  onChange={(e) => setTahunHapus(Number(e.target.value))}
                  className="border border-gray-300 rounded-md px-3 py-2 text-sm bg-white outline-none focus:ring-2 focus:ring-papua-red"
                >
                  {[2024, 2025, 2026, 2027].map((thn) => (
                    <option key={thn} value={thn}>{thn}</option>
                  ))}
                </select>
              </div>

              <div className="flex flex-wrap gap-4 text-sm font-medium text-gray-700">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={hapusJurnal}
                    onChange={(e) => setHapusJurnal(e.target.checked)}
                    className="w-4 h-4 text-papua-red rounded focus:ring-papua-red"
                  />
                  Jurnal Umum
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={hapusPanjar}
                    onChange={(e) => setHapusPanjar(e.target.checked)}
                    className="w-4 h-4 text-papua-red rounded focus:ring-papua-red"
                  />
                  Panjar
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={hapusGaji}
                    onChange={(e) => setHapusGaji(e.target.checked)}
                    className="w-4 h-4 text-papua-red rounded focus:ring-papua-red"
                  />
                  Gaji Bulanan
                </label>
              </div>
            </div>

            <button
              onClick={handleOpenBulanModal}
              className="shrink-0 flex items-center gap-2 bg-white border-2 border-papua-red text-papua-red hover:bg-papua-red hover:text-white px-5 py-3 rounded-lg text-sm font-bold transition-all shadow-sm"
            >
              <Trash2 className="w-5 h-5" /> Hapus Data Bulanan
            </button>
          </div>
        </div>

        <div className="p-6 md:p-8">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
            <div className="max-w-xl">
              <h3 className="text-base font-bold text-papua-primary mb-2">
                Hapus Seluruh Data Sistem (Hard Reset)"""

content = content.replace("""      {/* DANGER ZONE SECTION */}
      <div className="bg-white rounded-xl border-2 border-papua-red/20 shadow-sm overflow-hidden">
        <div className="bg-papua-red/10 p-5 border-b border-papua-red/20 flex items-center gap-3">
          <ShieldAlert className="w-6 h-6 text-papua-red" />
          <h2 className="text-lg font-black text-papua-red uppercase tracking-wide">
            Danger Zone (Zona Berbahaya)
          </h2>
        </div>

        <div className="p-6 md:p-8">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
            <div className="max-w-xl">
              <h3 className="text-base font-bold text-papua-primary mb-2">
                Hapus Seluruh Data Sistem (Hard Reset)""", ui1)

modal1 = """      {/* MODAL KONFIRMASI HAPUS BULANAN */}
      {isBulanModalOpen && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden transform transition-all">
            <div className="bg-papua-red p-6 flex flex-col items-center text-center relative">
              <button
                onClick={() => setIsBulanModalOpen(false)}
                className="absolute top-4 right-4 text-papua-red/30 hover:text-white transition-colors"
                disabled={isDeleting}
              >
                <X className="w-6 h-6" />
              </button>
              <div className="bg-white/20 p-3 rounded-full mb-3">
                <AlertTriangle className="w-10 h-10 text-white" />
              </div>
              <h2 className="text-xl font-black text-white uppercase tracking-wider">
                Peringatan Hapus Bulanan
              </h2>
            </div>

            <div className="p-6 space-y-5 bg-gray-50">
              <p className="text-sm text-gray-700 text-center font-medium leading-relaxed">
                Anda akan menghapus data yang dipilih untuk bulan{" "}
                <span className="font-black text-papua-red">{bulanHapus}/{tahunHapus}</span> secara permanen.
              </p>

              {status.type === "error" && (
                <div className="p-3 bg-papua-red/20 text-papua-red text-xs font-bold rounded border border-papua-red/30 text-center">
                  {status.message}
                </div>
              )}

              <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-inner">
                <label className="block text-xs font-bold text-gray-600 mb-2 text-center uppercase">
                  Untuk melanjutkan, ketik kalimat di bawah ini:
                </label>
                <div className="text-center font-mono font-bold text-papua-red bg-papua-red/10 py-2 border border-papua-red/20 rounded mb-3 select-none">
                  {REQUIRED_CONFIRM_TEXT_BULAN}
                </div>
                <input
                  type="text"
                  value={confirmTextBulan}
                  onChange={(e) => setConfirmTextBulan(e.target.value)}
                  placeholder="Ketik persis seperti kalimat di atas..."
                  className="w-full border-2 border-gray-300 rounded-lg px-4 py-3 outline-none focus:border-papua-red/100 focus:ring-2 focus:ring-papua-red/30 transition-all font-mono text-sm text-center"
                  autoComplete="off"
                  disabled={isDeleting}
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsBulanModalOpen(false)}
                  disabled={isDeleting}
                  className="flex-1 px-4 py-3 border-2 border-gray-300 text-gray-700 rounded-lg font-bold hover:bg-gray-100 transition-colors disabled:opacity-50"
                >
                  Batal
                </button>
                <button
                  onClick={executeDeleteBulanData}
                  disabled={confirmTextBulan !== REQUIRED_CONFIRM_TEXT_BULAN || isDeleting}
                  className="flex-1 flex justify-center items-center gap-2 px-4 py-3 bg-papua-red text-white rounded-lg font-bold hover:bg-papua-red transition-colors disabled:opacity-30 disabled:hover:bg-papua-red shadow-lg"
                >
                  {isDeleting ? "Menghapus..." : "Hapus Data Bulan Ini"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL KONFIRMASI KEAMANAN LAPIS GANDA */}
      {isModalOpen && ("""

content = content.replace("""      {/* MODAL KONFIRMASI KEAMANAN LAPIS GANDA */}
      {isModalOpen && (""", modal1)

with open("app/pengaturan/page.js", "w") as f:
    f.write(content)
