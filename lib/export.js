/**
 * Fungsi modular untuk mengekspor data array JSON menjadi file CSV.
 * @param {Array} data - Data array of objects yang akan diekspor.
 * @param {String} filename - Nama file yang akan diunduh (tanpa ekstensi .csv).
 */
export const exportToCSV = (data, filename) => {
  if (!data || !data.length) {
    alert("Tidak ada data untuk diekspor.");
    return;
  }

  // 1. Ambil nama kolom (header) dari object keys data pertama
  const headers = Object.keys(data[0]);

  // 2. Petakan data menjadi string dengan pemisah koma (,)
  const csvRows = [
    headers.join(','), // Baris pertama adalah Header
    ...data.map(row => 
      headers.map(fieldName => {
        let value = row[fieldName] === null || row[fieldName] === undefined ? '' : row[fieldName];
        // Jika value mengandung koma, bungkus dengan tanda kutip ganda agar tidak merusak format CSV
        value = String(value).replace(/"/g, '""');
        return `"${value}"`;
      }).join(',')
    )
  ];

  // 3. Gabungkan seluruh baris dengan karakter baris baru (\n)
  const csvString = csvRows.join('\n');

  // 4. Buat objek Blob untuk file CSV
  const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
  
  // 5. Buat elemen link sementara (<a>) untuk memicu proses unduh di browser
  const link = document.createElement("a");
  const url = URL.createObjectURL(blob);
  
  link.setAttribute("href", url);
  link.setAttribute("download", `${filename}.csv`);
  link.style.visibility = 'hidden';
  
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};