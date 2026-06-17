import fs from 'fs';
const data = fs.readFileSync('app/piutang/page.js', 'utf8');
const match = data.match(/\/\/ Mutasi Saldo Piutang(.*?)\/\/ Cari transaksi di mana Piutang berada di posisi KREDIT/s);
console.log(match ? match[0] : "Not found");
