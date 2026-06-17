import fs from 'fs';
const data = fs.readFileSync('lib/firestore.js', 'utf8');
console.log(data.match(/setSaldoAwalSingleEntry = async \((.*?)\) => \{(.*?)\}\;/s)[0]);
