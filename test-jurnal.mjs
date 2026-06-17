import fs from 'fs';
const data = fs.readFileSync('app/page.js', 'utf8');
const match = data.match(/if \(trx\.akunKredit && trx\.akunKredit\.nama\.toUpperCase\(\)\.includes\("KAS"\)\) \{(.*?)\}/s);
console.log(match ? match[0] : "Not found");
