for file in app/buku-besar/page.js app/neraca/page.js app/laporan-keuangan/page.js app/buku-besar/\[id\]/page.js lib/firestore.js; do
  sed -i '' -e 's/\["Aset", "Biaya"\].includes(tipe)/\["Aset", "Biaya"\].includes(tipe) || namaAkun.toUpperCase().includes("KAS")/g' "$file" 2>/dev/null || true
  sed -i '' -e 's/\["Aset", "Biaya"\].includes(debitData.tipe)/\["Aset", "Biaya"\].includes(debitData.tipe) || debitData.nama.toUpperCase().includes("KAS")/g' "$file" 2>/dev/null || true
  sed -i '' -e 's/\["Aset", "Biaya"\].includes(kreditData.tipe)/\["Aset", "Biaya"\].includes(kreditData.tipe) || kreditData.nama.toUpperCase().includes("KAS")/g' "$file" 2>/dev/null || true
  sed -i '' -e 's/\["Aset", "Biaya"\].includes(akunData.tipe)/\["Aset", "Biaya"\].includes(akunData.tipe) || dataAkun?.nama?.toUpperCase().includes("KAS") || akunData?.nama?.toUpperCase().includes("KAS")/g' "$file" 2>/dev/null || true
  sed -i '' -e 's/\["Aset", "Biaya"\].includes(akun.tipe)/\["Aset", "Biaya"\].includes(akun.tipe) || akun.nama.toUpperCase().includes("KAS")/g' "$file" 2>/dev/null || true
done
