import { db } from "@/lib/firebase";
import {
  doc,
  collection,
  runTransaction,
  serverTimestamp,
} from "firebase/firestore";

/**
 * ============================================================================
 * FUNGSI 1: TAMBAH JURNAL (DOUBLE-ENTRY BOOKKEEPING)
 * ============================================================================
 * Mencatat transaksi rutin REP (contoh: Kas bertambah, Pendapatan Yaswar Cafe bertambah).
 * Sistem akan memvalidasi dan memastikan persamaan akuntansi tetap seimbang.
 */
export const tambahJurnalDoubleEntry = async (
  tanggal,
  keterangan,
  akunDebitId,
  akunKreditId,
  nominal,
) => {
  try {
    await runTransaction(db, async (transaction) => {
      const debitRef = doc(db, "akun", akunDebitId);
      const kreditRef = doc(db, "akun", akunKreditId);

      const debitDoc = await transaction.get(debitRef);
      const kreditDoc = await transaction.get(kreditRef);

      // Validasi ketat dengan pesan error spesifik
      if (!debitDoc.exists()) {
        throw new Error(
          `Sistem menemukan error: Akun Debit dengan ID '${akunDebitId}' tidak terdaftar di database. Silakan klik tombol 'Setup Akun' terlebih dahulu.`,
        );
      }
      if (!kreditDoc.exists()) {
        throw new Error(
          `Sistem menemukan error: Akun Kredit dengan ID '${akunKreditId}' tidak terdaftar di database. Silakan klik tombol 'Setup Akun' terlebih dahulu.`,
        );
      }

      const debitData = debitDoc.data();
      const kreditData = kreditDoc.data();

      // Kalkulasi Normal Balance (Aset & Biaya bertambah di Debit, sisanya di Kredit)
      let saldoDebitBaru = debitData.saldo || 0;
      if (["Aset", "Biaya"].includes(debitData.tipe) || debitData.nama.toUpperCase().includes("KAS")) {
        saldoDebitBaru += nominal;
      } else {
        saldoDebitBaru -= nominal;
      }

      let saldoKreditBaru = kreditData.saldo || 0;
      if (["Hutang", "Modal", "Pendapatan"].includes(kreditData.tipe)) {
        saldoKreditBaru += nominal;
      } else {
        saldoKreditBaru -= nominal;
      }

      // Eksekusi update saldo secara atomik
      transaction.update(debitRef, { saldo: saldoDebitBaru });
      transaction.update(kreditRef, { saldo: saldoKreditBaru });

      // Catat ke riwayat Jurnal
      const jurnalRef = doc(collection(db, "jurnal"));
      transaction.set(jurnalRef, {
        tanggal,
        keterangan,
        nominal,
        akunDebit: { id: akunDebitId, nama: debitData.nama },
        akunKredit: { id: akunKreditId, nama: kreditData.nama },
        isSingleEntry: false,
        timestamp: serverTimestamp(),
      });
    });

    return {
      success: true,
      message: "Transaksi berhasil dicatat dan Buku Besar telah diperbarui.",
    };
  } catch (error) {
    console.error("Gagal menambah jurnal: ", error);
    return { success: false, message: error.message };
  }
};

/**
 * ============================================================================
 * FUNGSI 2: INPUT SALDO AWAL (SINGLE-ENTRY)
 * ============================================================================
 * Khusus untuk memasukkan sisa saldo awal KAS/Aset tanpa memerlukan akun
 * penyeimbang (Bypass Double-Entry).
 */
export const setSaldoAwalSingleEntry = async (
  tanggal,
  keterangan,
  akunId,
  jenis,
  nominal,
) => {
  try {
    await runTransaction(db, async (transaction) => {
      const akunRef = doc(db, "akun", akunId);
      const akunDoc = await transaction.get(akunRef);

      if (!akunDoc.exists()) {
        throw new Error(
          `Sistem menemukan error: Akun dengan ID '${akunId}' tidak ditemukan di database.`,
        );
      }

      const akunData = akunDoc.data();
      let saldoBaru = akunData.saldo || 0;

      // Logika mutasi saldo sepihak
      if (["Aset", "Biaya"].includes(akunData.tipe) || dataAkun?.nama?.toUpperCase().includes("KAS") || akunData?.nama?.toUpperCase().includes("KAS")) {
        saldoBaru =
          jenis === "debit" ? saldoBaru + nominal : saldoBaru - nominal;
      } else {
        saldoBaru =
          jenis === "kredit" ? saldoBaru + nominal : saldoBaru - nominal;
      }

      // Eksekusi pembaruan saldo
      transaction.update(akunRef, { saldo: saldoBaru });

      // Catat ke jurnal sebagai Single-Entry (salah satu sisi di-set null)
      const jurnalRef = doc(collection(db, "jurnal"));
      transaction.set(jurnalRef, {
        tanggal,
        keterangan,
        nominal,
        akunDebit:
          jenis === "debit" ? { id: akunId, nama: akunData.nama } : null,
        akunKredit:
          jenis === "kredit" ? { id: akunId, nama: akunData.nama } : null,
        isSingleEntry: true,
        timestamp: serverTimestamp(),
      });
    });

    return {
      success: true,
      message: "Saldo awal berhasil disimpan (Metode Single-Entry).",
    };
  } catch (error) {
    console.error("Gagal menyimpan saldo awal: ", error);
    return { success: false, message: error.message };
  }
};

/**
 * ============================================================================
 * FUNGSI 3: HAPUS JURNAL & REVERSAL SALDO
 * ============================================================================
 * Membatalkan transaksi. Mendukung identifikasi cerdas antara riwayat transaksi
 * Double-Entry biasa atau Single-Entry, lalu mengembalikan saldonya secara presisi.
 */
export const hapusJurnalDoubleEntry = async (jurnalId) => {
  try {
    await runTransaction(db, async (transaction) => {
      const jurnalRef = doc(db, "jurnal", jurnalId);
      const jurnalDoc = await transaction.get(jurnalRef);

      if (!jurnalDoc.exists()) {
        throw new Error(
          "Sistem menemukan error: Dokumen transaksi tidak ditemukan.",
        );
      }

      const dataJurnal = jurnalDoc.data();
      const nominal = dataJurnal.nominal;

      // ---------------------------------------------------------
      // BLOK REVERSAL: KHUSUS SINGLE-ENTRY
      // ---------------------------------------------------------
      if (dataJurnal.isSingleEntry) {
        const akunTerkait = dataJurnal.akunDebit
          ? dataJurnal.akunDebit
          : dataJurnal.akunKredit;
        const jenisPosisi = dataJurnal.akunDebit ? "debit" : "kredit";

        const akunRef = doc(db, "akun", akunTerkait.id);
        const akunDocSnap = await transaction.get(akunRef);

        if (!akunDocSnap.exists()) {
          throw new Error(
            `Sistem menemukan error: Akun dengan ID '${akunTerkait.id}' sudah tidak ada.`,
          );
        }

        const akunData = akunDocSnap.data();
        let saldoBaru = akunData.saldo || 0;

        // Pembalikan (Reversal) matematika Single-Entry
        if (["Aset", "Biaya"].includes(akunData.tipe) || dataAkun?.nama?.toUpperCase().includes("KAS") || akunData?.nama?.toUpperCase().includes("KAS")) {
          saldoBaru =
            jenisPosisi === "debit" ? saldoBaru - nominal : saldoBaru + nominal;
        } else {
          saldoBaru =
            jenisPosisi === "kredit"
              ? saldoBaru - nominal
              : saldoBaru + nominal;
        }

        transaction.update(akunRef, { saldo: saldoBaru });
        transaction.delete(jurnalRef);

        return; // Hentikan eksekusi di sini agar tidak lanjut ke bawah
      }

      // ---------------------------------------------------------
      // BLOK REVERSAL: STANDAR DOUBLE-ENTRY
      // ---------------------------------------------------------
      const akunDebitId = dataJurnal.akunDebit.id;
      const akunKreditId = dataJurnal.akunKredit.id;

      const debitRef = doc(db, "akun", akunDebitId);
      const kreditRef = doc(db, "akun", akunKreditId);

      const debitDoc = await transaction.get(debitRef);
      const kreditDoc = await transaction.get(kreditRef);

      // Validasi spesifik saat penghapusan
      if (!debitDoc.exists()) {
        throw new Error(
          `Sistem menemukan error: Akun Debit '${akunDebitId}' sudah tidak ada di database.`,
        );
      }
      if (!kreditDoc.exists()) {
        throw new Error(
          `Sistem menemukan error: Akun Kredit '${akunKreditId}' sudah tidak ada di database.`,
        );
      }

      const debitData = debitDoc.data();
      const kreditData = kreditDoc.data();

      // Kebalikan Aset/Biaya (Debit berkurang)
      let saldoDebitBaru = debitData.saldo || 0;
      if (["Aset", "Biaya"].includes(debitData.tipe) || debitData.nama.toUpperCase().includes("KAS")) {
        saldoDebitBaru -= nominal;
      } else {
        saldoDebitBaru += nominal;
      }

      // Kebalikan Hutang/Modal/Pendapatan (Kredit berkurang)
      let saldoKreditBaru = kreditData.saldo || 0;
      if (["Hutang", "Modal", "Pendapatan"].includes(kreditData.tipe)) {
        saldoKreditBaru -= nominal;
      } else {
        saldoKreditBaru += nominal;
      }

      // Eksekusi pembalikan dan penghapusan riwayat
      transaction.update(debitRef, { saldo: saldoDebitBaru });
      transaction.update(kreditRef, { saldo: saldoKreditBaru });
      transaction.delete(jurnalRef);
    });

    return {
      success: true,
      message:
        "Transaksi berhasil dibatalkan dan saldo telah dikembalikan dengan presisi.",
    };
  } catch (error) {
    console.error("Gagal membatalkan jurnal: ", error);
    return { success: false, message: error.message };
  }
};
