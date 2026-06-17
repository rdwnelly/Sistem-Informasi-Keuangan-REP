import { initializeApp } from 'firebase/app';
import { getFirestore, doc, getDoc } from 'firebase/firestore';

const firebaseConfig = {
  // Mock config or just use the local file data
};

// We don't need real firebase to test the static KATEGORI_AKUN
import fs from 'fs';
const data = fs.readFileSync('app/jurnal/page.js', 'utf8');
const match = data.match(/const KATEGORI_AKUN = (\[.*?\]);/s);
if (match) {
  const categories = eval(match[1]);
  const kasCategory = categories.find(c => c.akun.includes("KAS"));
  console.log("KAS is in category:", kasCategory ? kasCategory.tipe : "Not found");
} else {
  console.log("Could not parse KATEGORI_AKUN");
}
