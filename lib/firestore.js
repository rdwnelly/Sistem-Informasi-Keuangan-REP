import { db } from './firebase';
import { 
  collection, 
  doc, 
  runTransaction, 
  serverTimestamp,
  getDocs 
} from 'firebase/firestore';

/**
 * Fungsi untuk mencatat Jurnal Umum dengan prinsip Double-Entry Bookkeeping.
 * Ini akan menyimpan riwayat transaksi dan otomatis mengupdate saldo akun terkait.
 * 
 * @param {string} tanggal - Format YYYY-MM-DD
 * @param {string} keterangan - Deskripsi transaksi (ex: "Pendapatan Harian Toko Sovenir")
 * @param {string} akunDebitId - ID dokumen akun yang di-debit (ex: "akun_kas")
 * @param {string} akunKreditId - ID dokumen akun yang di-kredit (ex: "akun_pendapatan_sovenir")
 * @param {number} nominal - Jumlah uang (ex: 500000)
 */
export const tambahJurnalDoubleEntry = async (tanggal, keterangan, akunDebitId, akunKreditId, nominal) => {
  try {
    await runTransaction(db, async (transaction) => {
      // 1. Ambil referensi dokumen untuk akun Debit dan Kredit
      const debitRef = doc(db, 'akun', akunDebitId);
      const kreditRef = doc(db, 'akun', akunKreditId);
      
      const debitDoc = await transaction.get(debitRef);
      const kreditDoc = await transaction.get(kreditRef);

      if (!debitDoc.exists() || !kreditDoc.exists()) {
        throw new Error("Sistem menemukan error: Salah satu atau kedua akun tidak ditemukan di database.");
      }

      // 2. Hitung saldo baru
      // Catatan Akuntansi: 
      // - Akun Aset/Biaya bertambah di Debit, berkurang di Kredit.
      // - Akun Hutang/Modal/Pendapatan bertambah di Kredit, berkurang di Debit.
      // Untuk penyederhanaan awal, kita asumsikan field 'saldo' menyimpan nilai absolut 
      // yang akan ditambah/dikurangi berdasarkan tipe akunnya.
      
      const debitData = debitDoc.data();
      const kreditData = kreditDoc.data();

      // Penyesuaian Saldo Debit (Aset/Biaya bertambah, lainnya berkurang)
      let saldoDebitBaru = debitData.saldo;
      if (['Aset', 'Biaya'].includes(debitData.tipe)) {
        saldoDebitBaru += nominal;
      } else {
        saldoDebitBaru -= nominal;
      }

      // Penyesuaian Saldo Kredit (Hutang/Modal/Pendapatan bertambah, lainnya berkurang)
      let saldoKreditBaru = kreditData.saldo;
      if (['Hutang', 'Modal', 'Pendapatan'].includes(kreditData.tipe)) {
        saldoKreditBaru += nominal;
      } else {
        saldoKreditBaru -= nominal;
      }

      // 3. Update saldo di tabel 'akun'
      transaction.update(debitRef, { saldo: saldoDebitBaru });
      transaction.update(kreditRef, { saldo: saldoKreditBaru });

      // 4. Buat record riwayat di tabel 'jurnal'
      const jurnalRef = doc(collection(db, 'jurnal'));
      transaction.set(jurnalRef, {
        tanggal: tanggal,
        keterangan: keterangan,
        akunDebit: {
          id: akunDebitId,
          nama: debitData.nama
        },
        akunKredit: {
          id: akunKreditId,
          nama: kreditData.nama
        },
        nominal: nominal,
        timestamp: serverTimestamp()
      });
    });

    return { success: true, message: "Transaksi Jurnal Umum berhasil dicatat dan Buku Besar telah diperbarui." };
  } catch (error) {
    console.error("Gagal mencatat transaksi: ", error);
    return { success: false, message: error.message };
  }
};

// Tambahkan fungsi ini di bawah fungsi tambahJurnalDoubleEntry yang sudah ada

/**
 * Fungsi untuk menghapus Jurnal Umum dan mengembalikan saldo (Reversal)
 * @param {string} jurnalId - ID dokumen jurnal yang akan dihapus
 */
export const hapusJurnalDoubleEntry = async (jurnalId) => {
  try {
    await runTransaction(db, async (transaction) => {
      // 1. Ambil data dokumen jurnal yang akan dihapus
      const jurnalRef = doc(db, 'jurnal', jurnalId);
      const jurnalDoc = await transaction.get(jurnalRef);

      if (!jurnalDoc.exists()) {
        throw new Error("Sistem menemukan error: Dokumen transaksi tidak ditemukan.");
      }

      const dataJurnal = jurnalDoc.data();
      const nominal = dataJurnal.nominal;
      const akunDebitId = dataJurnal.akunDebit.id;
      const akunKreditId = dataJurnal.akunKredit.id;

      // 2. Ambil referensi akun terkait
      const debitRef = doc(db, 'akun', akunDebitId);
      const kreditRef = doc(db, 'akun', akunKreditId);

      const debitDoc = await transaction.get(debitRef);
      const kreditDoc = await transaction.get(kreditRef);

      if (!debitDoc.exists() || !kreditDoc.exists()) {
        throw new Error("Sistem menemukan error: Akun terkait transaksi ini sudah tidak ada di database.");
      }

      const debitData = debitDoc.data();
      const kreditData = kreditDoc.data();

      // 3. Logika REVERSAL (Pemotongan kembali saldo)
      // Kebalikan dari saat menambah:
      // Aset/Biaya -> Jika dihapus, Debit berkurang.
      let saldoDebitBaru = debitData.saldo;
      if (['Aset', 'Biaya'].includes(debitData.tipe)) {
        saldoDebitBaru -= nominal;
      } else {
        saldoDebitBaru += nominal;
      }

      // Hutang/Modal/Pendapatan -> Jika dihapus, Kredit berkurang.
      let saldoKreditBaru = kreditData.saldo;
      if (['Hutang', 'Modal', 'Pendapatan'].includes(kreditData.tipe)) {
        saldoKreditBaru -= nominal;
      } else {
        saldoKreditBaru += nominal;
      }

      // 4. Update saldo kembali ke semula
      transaction.update(debitRef, { saldo: saldoDebitBaru });
      transaction.update(kreditRef, { saldo: saldoKreditBaru });

      // 5. Hapus riwayat transaksi secara permanen
      transaction.delete(jurnalRef);
    });

    return { success: true, message: "Transaksi berhasil dihapus dan saldo akun telah dikembalikan." };
  } catch (error) {
    console.error("Gagal menghapus jurnal: ", error);
    return { success: false, message: error.message };
  }
};