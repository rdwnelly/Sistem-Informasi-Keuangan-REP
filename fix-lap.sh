sed -i '' -e 's/namaAkun\.toUpperCase().includes("KAS")/(trx.akunDebit?.nama?.toUpperCase().includes("KAS") || trx.akunKredit?.nama?.toUpperCase().includes("KAS"))/g' app/laporan-keuangan/page.js
