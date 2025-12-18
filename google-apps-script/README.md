# Google Apps Script Setup untuk NPK Webapp

## 📋 Langkah-langkah Setup

### 1. Buat Google Spreadsheet Baru

1. Buka [Google Sheets](https://sheets.google.com)
2. Buat spreadsheet baru
3. Beri nama: `NPK Webapp Database`

### 2. Setup Apps Script

1. Di Google Sheets, klik **Extensions > Apps Script**
2. Hapus semua kode default
3. Copy semua isi file `Code.gs` ke editor
4. Simpan (Ctrl+S atau File > Save)

### 3. ⚠️ PENTING: Setup OAuth Scopes untuk Google Drive

Fitur upload foto memerlukan izin akses Google Drive. Ikuti langkah berikut:

1. Di Apps Script editor, klik **⚙️ Project Settings** (icon gear di sidebar kiri)
2. Centang ✅ **Show "appsscript.json" manifest file in editor**
3. Kembali ke editor, akan muncul file `appsscript.json`
4. Ganti isi file tersebut dengan:

```json
{
  "timeZone": "Asia/Jakarta",
  "dependencies": {},
  "exceptionLogging": "STACKDRIVER",
  "runtimeVersion": "V8",
  "oauthScopes": [
    "https://www.googleapis.com/auth/spreadsheets",
    "https://www.googleapis.com/auth/drive",
    "https://www.googleapis.com/auth/script.external_request"
  ],
  "webapp": {
    "executeAs": "USER_DEPLOYING",
    "access": "ANYONE_ANONYMOUS"
  }
}
```

5. Simpan file (Ctrl+S)

### 4. Jalankan Otorisasi

1. Di Apps Script editor, pilih fungsi **`authorizeScript`** dari dropdown
2. Klik **Run** (▶️)
3. Akan muncul popup "Authorization required"
4. Klik **Review permissions**
5. Pilih akun Google Anda
6. Jika muncul "Google hasn't verified this app", klik **Advanced** → **Go to NPK Webapp (unsafe)**
7. Klik **Allow** untuk memberikan izin:
   - Google Sheets
   - Google Drive
8. Cek di Log (View > Logs) pastikan muncul "OTORISASI BERHASIL!"

### 5. Jalankan Inisialisasi

1. Pilih fungsi `initializeAllSheets` dari dropdown
2. Klik **Run** (▶️)
3. Ulangi untuk fungsi `createDefaultAdmin`

### 6. Deploy sebagai Web App

1. Klik **Deploy > New deployment**
2. Pilih type: **Web app**
3. Konfigurasi:
   - Description: `NPK Webapp API v1`
   - Execute as: **Me**
   - Who has access: **Anyone**
4. Klik **Deploy**
5. **COPY URL deployment** yang muncul

### 7. Setup Environment Variable

1. Buat file `.env` di root project webapp:

```env
VITE_API_URL=https://script.google.com/macros/s/YOUR_DEPLOYMENT_ID/exec
```

2. Ganti `YOUR_DEPLOYMENT_ID` dengan URL dari langkah 6

---

## 🔄 Update Deployment (Jika ada perubahan kode)

Jika Anda mengubah Code.gs, perlu deploy ulang:

1. Klik **Deploy > Manage deployments**
2. Klik **✏️ Edit** pada deployment yang ada
3. Pilih **New version**
4. Klik **Deploy**

---

## 📊 Struktur Sheets

Script akan otomatis membuat sheets berikut:

### Data Produksi

| Sheet Name             | Keterangan         |
| ---------------------- | ------------------ |
| produksi_npk           | Data produksi NPK2 |
| produksi_npk_NPK1      | Data produksi NPK1 |
| produksi_blending      | Data blending NPK2 |
| produksi_blending_NPK1 | Data blending NPK1 |
| produksi_npk_mini      | Data NPK mini NPK2 |
| produksi_npk_mini_NPK1 | Data NPK mini NPK1 |

### Data Operasional

| Sheet Name                  | Keterangan         |
| --------------------------- | ------------------ |
| timesheet_forklift / \_NPK1 | Timesheet forklift |
| timesheet_loader / \_NPK1   | Timesheet loader   |
| downtime / \_NPK1           | Data downtime      |
| workrequest / \_NPK1        | Work request       |
| bahanbaku / \_NPK1          | Data bahan baku    |
| vibrasi / \_NPK1            | Data vibrasi       |
| gatepass / \_NPK1           | Gate pass          |
| perta / \_NPK1              | Data Perta/BBM     |
| trouble_record / \_NPK1     | Trouble record     |
| dokumentasi_foto / \_NPK1   | Dokumentasi foto   |

### Data Master

| Sheet Name        | Keterangan        |
| ----------------- | ----------------- |
| users             | Data user/akun    |
| sessions          | Session login     |
| akun              | Password storage  |
| rkap              | Target RKAP       |
| approval_requests | Approval requests |
| monthly_notes     | Catatan bulanan   |
| notifications     | Notifikasi        |
| chat_messages     | Pesan chat        |

---

## 🔐 Akun Default

Setelah menjalankan `createDefaultAdmin`:

- **Username:** `admin`
- **Password:** `admin123`

⚠️ **PENTING:** Segera ganti password default setelah login!

---

## ❓ Troubleshooting

### Error: "Anda tidak memiliki izin untuk memanggil DriveApp"

**Solusi:**

1. Pastikan sudah menambahkan OAuth scope di `appsscript.json`
2. Jalankan fungsi `authorizeScript` dan berikan izin
3. Deploy ulang web app (buat version baru)

---

## 🔄 API Endpoints

### GET Request

```
?action=read&sheet=<sheetName>
?action=checkSession&sessionId=<sessionId>
```

### POST Request

```json
// Create
{
  "action": "create",
  "sheet": "produksi_npk",
  "data": { ... }
}

// Update
{
  "action": "update",
  "sheet": "produksi_npk",
  "data": { "id": "xxx", ... }
}

// Delete
{
  "action": "delete",
  "sheet": "produksi_npk",
  "data": { "id": "xxx" }
}

// Login
{
  "action": "login",
  "data": { "username": "admin", "password": "xxx" }
}
```

---

## 🛠️ Troubleshooting

### Error CORS

- Pastikan "Who has access" diset ke "Anyone"
- Coba re-deploy dengan deployment baru

### Error Permission

- Jalankan fungsi manual sekali dari Apps Script editor
- Berikan izin yang diminta

### Data Tidak Muncul

- Cek apakah sheet sudah dibuat dengan header
- Jalankan `initializeAllSheets` lagi

### Update Deployment

Jika ada perubahan kode:

1. Apps Script editor > Deploy > Manage deployments
2. Edit deployment yang ada
3. Pilih "New version"
4. Deploy

---

## 📝 Custom Menu

Setelah setup, akan ada menu **🔧 NPK Webapp** di Google Sheets dengan opsi:

- Initialize All Sheets
- Create Default Admin
- Create Sample RKAP
- Test Read Users

---

## ⚡ Tips Performa

1. **Batch Operations**: Gunakan operasi batch jika perlu insert banyak data
2. **Caching**: Data di-cache di frontend untuk mengurangi request
3. **Quota**: Google Apps Script punya quota harian, monitor usage

---

## 🔒 Keamanan

1. Ganti password default segera
2. Untuk production, pertimbangkan:
   - Hash password dengan library seperti SHA-256
   - Validasi input lebih ketat
   - Rate limiting
   - Logging aktivitas
