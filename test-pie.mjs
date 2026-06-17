import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, query, orderBy } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function test() {
  try {
    const akunSnap = await getDocs(collection(db, "akun"));
    const mapAkun = {};
    akunSnap.forEach((doc) => {
      const data = doc.data();
      mapAkun[data.nama] = data.tipe;
    });

    const distribusiPendapatan = {
      "Yaswar Cafe": 0,
      "Toko Sovenir": 0,
      "Penyewaan Kostum": 0,
      "Kios REP": 0,
      "Jasa Fotografer": 0,
      "Lain-lain": 0,
    };

    const qJurnal = query(collection(db, "jurnal"), orderBy("timestamp", "asc"));
    const jurnalSnap = await getDocs(qJurnal);

    jurnalSnap.forEach((doc) => {
      const trx = doc.data();
      const nominal = Number(trx.nominal) || 0;
      const kreditNama = trx.akunKredit?.nama;

      if (mapAkun[kreditNama] === "Pendapatan") {
        if (kreditNama.includes("Yaswar Cafe"))
          distribusiPendapatan["Yaswar Cafe"] += nominal;
        else if (kreditNama.includes("Sovenir"))
          distribusiPendapatan["Toko Sovenir"] += nominal;
        else if (kreditNama.includes("Kostum"))
          distribusiPendapatan["Penyewaan Kostum"] += nominal;
        else if (kreditNama.includes("Kios"))
          distribusiPendapatan["Kios REP"] += nominal;
        else if (kreditNama.includes("Fotografer"))
          distribusiPendapatan["Jasa Fotografer"] += nominal;
        else distribusiPendapatan["Lain-lain"] += nominal;
      }
    });

    console.log(distribusiPendapatan);
  } catch (err) {
    console.error("Error:", err.message);
  }
}
test();
