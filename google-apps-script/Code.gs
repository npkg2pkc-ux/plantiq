/**
 * ===========================================
 * NPK WEBAPP - GOOGLE APPS SCRIPT BACKEND
 * ===========================================
 *
 * CARA SETUP:
 * 1. Buka Google Sheets baru
 * 2. Buka Extensions > Apps Script
 * 3. Copy semua code ini ke editor
 * 4. PENTING: Klik "Project Settings" (gear icon)
 * 5. Centang "Show appsscript.json manifest file in editor"
 * 6. Buka file appsscript.json dan ganti dengan:
 *    {
 *      "timeZone": "Asia/Jakarta",
 *      "dependencies": {},
 *      "exceptionLogging": "STACKDRIVER",
 *      "runtimeVersion": "V8",
 *      "oauthScopes": [
 *        "https://www.googleapis.com/auth/spreadsheets",
 *        "https://www.googleapis.com/auth/drive",
 *        "https://www.googleapis.com/auth/script.external_request"
 *      ]
 *    }
 * 7. Jalankan fungsi "authorizeScript" dari menu untuk meminta izin
 * 8. Deploy > New deployment > Web app
 * 9. Execute as: Me, Who has access: Anyone
 * 10. Copy URL deployment dan paste ke VITE_API_URL di .env
 *
 * STRUKTUR SHEETS YANG DIBUTUHKAN:
 * - users
 * - sessions
 * - produksi_npk, produksi_npk_NPK1
 * - produksi_blending, produksi_blending_NPK1
 * - produksi_npk_mini, produksi_npk_mini_NPK1
 * - timesheet_forklift, timesheet_forklift_NPK1
 * - timesheet_loader, timesheet_loader_NPK1
 * - downtime, downtime_NPK1
 * - workrequest, workrequest_NPK1
 * - bahanbaku, bahanbaku_NPK1
 * - vibrasi, vibrasi_NPK1
 * - gatepass, gatepass_NPK1
 * - perta, perta_NPK1
 * - trouble_record, trouble_record_NPK1
 * - dokumentasi_foto, dokumentasi_foto_NPK1
 * - kop, kop_NPK1
 * - rekap_bbm, rekap_bbm_NPK1
 * - pemantauan_bahan_baku, pemantauan_bahan_baku_NPK1
 * - akun
 * - rkap
 * - approval_requests
 * - monthly_notes
 * - notifications
 * - chat_messages
 * - active_users
 */

// ============================================
// AUTHORIZATION - JALANKAN INI PERTAMA KALI
// ============================================

/**
 * Fungsi untuk memicu otorisasi Drive dan Spreadsheet
 * JALANKAN FUNGSI INI PERTAMA KALI dari editor Apps Script!
 * Klik Run > authorizeScript
 */
function authorizeScript() {
  // Trigger Spreadsheet authorization
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  Logger.log("Spreadsheet ID: " + ss.getId());

  // Trigger Drive authorization
  const rootFolder = DriveApp.getRootFolder();
  Logger.log("Drive Root Folder: " + rootFolder.getName());

  // Test create folder
  const testFolder = getOrCreateFolder("Dokumentasi Foto", rootFolder);
  Logger.log("Test Folder Created: " + testFolder.getName());
  Logger.log("Folder URL: " + testFolder.getUrl());

  Logger.log("=== OTORISASI BERHASIL! ===");
  Logger.log("Sekarang Anda bisa deploy ulang web app.");
}

// ============================================
// KONFIGURASI
// ============================================

const SPREADSHEET_ID = SpreadsheetApp.getActiveSpreadsheet().getId();

// Sheet headers configuration
const SHEET_HEADERS = {
  users: [
    "id",
    "username",
    "password",
    "nama",
    "namaLengkap",
    "email",
    "role",
    "status",
    "plant",
    "lastLogin",
    "createdAt",
    "updatedAt",
  ],
  dokumentasi_foto: [
    "id",
    "tanggal",
    "judul",
    "keterangan",
    "fileId",
    "fileUrl",
    "folderId",
    "folderUrl",
    "uploadBy",
    "plant",
    "createdAt",
  ],
  sessions: [
    "id",
    "username",
    "deviceId",
    "browser",
    "createdAt",
    "lastActivity",
  ],
  produksi_npk: [
    "id",
    "tanggal",
    "shiftMalamOnspek",
    "shiftMalamOffspek",
    "shiftPagiOnspek",
    "shiftPagiOffspek",
    "shiftSoreOnspek",
    "shiftSoreOffspek",
    "totalOnspek",
    "totalOffspek",
    "total",
  ],
  produksi_blending: ["id", "tanggal", "kategori", "formula", "tonase"],
  produksi_npk_mini: ["id", "tanggal", "formulasi", "tonase"],
  timesheet_forklift: [
    "id",
    "tanggal",
    "forklift",
    "deskripsiTemuan",
    "jamOff",
    "jamStart",
    "jamGrounded",
    "jamOperasi",
    "keterangan",
  ],
  timesheet_loader: [
    "id",
    "tanggal",
    "shift",
    "deskripsiTemuan",
    "jamOff",
    "jamStart",
    "jamGrounded",
    "jamOperasi",
    "keterangan",
  ],
  downtime: [
    "id",
    "tanggal",
    "item",
    "deskripsi",
    "jamOff",
    "jamStart",
    "downtime",
  ],
  workrequest: [
    "id",
    "tanggal",
    "nomorWR",
    "item",
    "area",
    "eksekutor",
    "include",
    "keterangan",
  ],
  bahanbaku: [
    "id",
    "tanggal",
    "namaBarang",
    "namaBarangLainnya",
    "jumlah",
    "satuan",
    "keterangan",
  ],
  vibrasi: [
    "id",
    "tanggal",
    "namaEquipment",
    "posisiPengukuran",
    "pointPengukuran",
    "nilaiVibrasi",
    "status",
    "keterangan",
  ],
  gatepass: [
    "id",
    "tanggal",
    "nomorGatePass",
    "noPolisi",
    "pemilikBarang",
    "namaPembawa",
    "mengetahui",
    "deskripsiBarang",
    "alasanKeluar",
  ],
  perta: [
    "id",
    "tanggal",
    "nomorPerta",
    "shift",
    "jenisBBM",
    "deskripsi",
    "volumeAwal",
    "volumePengisian",
    "volumePemakaian",
    "volumeAkhir",
    "keterangan",
    "status",
  ],
  perbaikan_tahunan: [
    "id",
    "tanggalMulai",
    "tanggalSelesai",
    "jumlahHari",
    "items",
  ],
  trouble_record: [
    "id",
    "nomorBerkas",
    "tanggal",
    "tanggalKejadian",
    "shift",
    "waktuKejadian",
    "kodePeralatan",
    "area",
    "pic",
    "deskripsiMasalah",
    "penyebab",
    "tindakan",
    "targetSelesai",
    "keterangan",
    "status",
    "tanggalSelesai",
    "catatanPenyelesaian",
  ],
  akun: [
    "id",
    "noBadge",
    "nama",
    "jabatan",
    "passwordESS",
    "passwordPismart",
    "passwordDOF",
    "tanggalUpdate",
  ],
  rkap: [
    "id",
    "tahun",
    "plant",
    "januari",
    "februari",
    "maret",
    "april",
    "mei",
    "juni",
    "juli",
    "agustus",
    "september",
    "oktober",
    "november",
    "desember",
    "total",
  ],
  approval_requests: [
    "id",
    "requestBy",
    "requestByName",
    "requestDate",
    "action",
    "sheetType",
    "dataId",
    "dataPreview",
    "reason",
    "status",
    "reviewBy",
    "reviewDate",
    "reviewNotes",
    "requesterPlant",
  ],
  monthly_notes: [
    "id",
    "bulan",
    "tahun",
    "plant",
    "catatan",
    "updatedBy",
    "updatedAt",
  ],
  notifications: [
    "id",
    "message",
    "timestamp",
    "read",
    "fromUser",
    "fromPlant",
    "toUser",
  ],
  chat_messages: ["id", "sender", "role", "message", "timestamp"],
  active_users: [
    "id",
    "username",
    "namaLengkap",
    "role",
    "plant",
    "lastActive",
    "status",
  ],
  rekap_bbm: [
    "id",
    "tanggal",
    "namaAlatBerat",
    "pengajuanSolar",
    "realisasiPengisian",
    "keterangan",
  ],
  pemantauan_bahan_baku: [
    "id",
    "tanggal",
    "bahanBaku",
    "stockAwal",
    "bahanBakuIn",
    "bahanBakuOut",
    "stockAkhir",
  ],
  kop: [
    "id",
    "tanggal",
    "jenisOperasi",
    // Personel per shift (JSON)
    "shiftMalam",
    "shiftPagi",
    "shiftSore",
    // Steam input per shift (JSON: {awal, akhir})
    "steamMalam",
    "steamPagi",
    "steamSore",
    // Gas input per shift (JSON: {awal, akhir})
    "gasMalam",
    "gasPagi",
    "gasSore",
    // Kurs Dollar
    "kursDollar",
    // Dryer Parameters (JSON)
    "dryerTempProdukOut",
    // Produk NPK Parameters (JSON)
    "produkN",
    "produkP",
    "produkK",
    "produkMoisture",
    "produkKekerasan",
    "produkTimbangan",
    "produkTonase",
  ],
};

// ============================================
// MAIN HANDLERS (GET & POST)
// ============================================

function doGet(e) {
  return handleRequest(e);
}

function doPost(e) {
  return handleRequest(e);
}

function handleRequest(e) {
  try {
    // Handle CORS
    const output = ContentService.createTextOutput();
    output.setMimeType(ContentService.MimeType.JSON);

    let result;

    // GET request with parameters
    if (e.parameter && e.parameter.action) {
      const action = e.parameter.action;

      switch (action) {
        case "read":
          result = readSheet(e.parameter.sheet);
          break;
        case "checkSession":
          result = checkSession(e.parameter.sessionId);
          break;
        case "getExchangeRate":
          result = getExchangeRate();
          break;
        default:
          result = { success: false, error: "Unknown action" };
      }
    }
    // POST request with body
    else if (e.postData) {
      const body = JSON.parse(e.postData.contents);
      const action = body.action;

      switch (action) {
        case "create":
          result = createRecord(body.sheet, body.data);
          break;
        case "update":
          result = updateRecord(body.sheet, body.data);
          break;
        case "delete":
          result = deleteRecord(body.sheet, body.data);
          break;
        case "login":
          result = loginUser(body.data);
          break;
        case "createSession":
          result = createSession(body.data);
          break;
        case "deleteSession":
          result = deleteSession(body.data);
          break;
        case "uploadPhoto":
          result = uploadPhotoToGoogleDrive(body.data);
          break;
        case "deletePhoto":
          result = deletePhotoFromGoogleDrive(body.data);
          break;
        default:
          result = { success: false, error: "Unknown action" };
      }
    } else {
      result = { success: false, error: "No action specified" };
    }

    output.setContent(JSON.stringify(result));
    return output;
  } catch (error) {
    const output = ContentService.createTextOutput();
    output.setMimeType(ContentService.MimeType.JSON);
    output.setContent(
      JSON.stringify({ success: false, error: error.toString() })
    );
    return output;
  }
}

// ============================================
// CRUD OPERATIONS
// ============================================

/**
 * Read all data from a sheet
 */
function readSheet(sheetName) {
  try {
    const sheet = getOrCreateSheet(sheetName);
    const data = sheet.getDataRange().getValues();

    if (data.length <= 1) {
      return { success: true, data: [] };
    }

    const headers = data[0];
    const rows = data.slice(1);

    // Columns that should be formatted as time (HH:mm)
    const timeColumns = [
      "jamOff",
      "jamStart",
      "jamMulai",
      "jamSelesai",
      "waktuMulai",
      "waktuSelesai",
    ];
    // Columns that should be formatted as date (yyyy-MM-dd)
    const dateColumns = [
      "tanggal",
      "createdAt",
      "updatedAt",
      "lastLogin",
      "lastActivity",
      "tglMasuk",
      "tglKeluar",
    ];

    const result = rows
      .map((row) => {
        const obj = {};
        headers.forEach((header, index) => {
          let value = row[index];

          // Handle Date objects
          if (value instanceof Date) {
            // Check if this is a time column
            if (timeColumns.includes(header)) {
              // Format as time HH:mm
              value = Utilities.formatDate(
                value,
                Session.getScriptTimeZone(),
                "HH:mm"
              );
            } else if (dateColumns.includes(header)) {
              // Format as date yyyy-MM-dd
              value = Utilities.formatDate(
                value,
                Session.getScriptTimeZone(),
                "yyyy-MM-dd"
              );
            } else {
              // For other date columns, check if it has meaningful time
              const hours = value.getHours();
              const minutes = value.getMinutes();
              const year = value.getFullYear();

              // If year is 1899 or 1900, it's likely a time-only value from Excel/Sheets
              if (year === 1899 || year === 1900) {
                value = Utilities.formatDate(
                  value,
                  Session.getScriptTimeZone(),
                  "HH:mm"
                );
              } else if (hours === 0 && minutes === 0) {
                // If time is midnight, probably just a date
                value = Utilities.formatDate(
                  value,
                  Session.getScriptTimeZone(),
                  "yyyy-MM-dd"
                );
              } else {
                // Has both date and time
                value = Utilities.formatDate(
                  value,
                  Session.getScriptTimeZone(),
                  "yyyy-MM-dd HH:mm"
                );
              }
            }
          }
          // Handle numbers that might be time values (0.0 - 1.0 range from Excel)
          else if (typeof value === "number" && timeColumns.includes(header)) {
            if (value > 0 && value < 1) {
              // Convert Excel serial time to HH:mm
              const totalMinutes = Math.round(value * 24 * 60);
              const hours = Math.floor(totalMinutes / 60) % 24;
              const minutes = totalMinutes % 60;
              value =
                String(hours).padStart(2, "0") +
                ":" +
                String(minutes).padStart(2, "0");
            }
          }

          obj[header] = value;
        });
        return obj;
      })
      .filter((row) => row.id); // Filter out empty rows

    return { success: true, data: result };
  } catch (error) {
    return { success: false, error: error.toString() };
  }
}

/**
 * Create a new record
 */
function createRecord(sheetName, data) {
  try {
    const sheet = getOrCreateSheet(sheetName);
    const headers = sheet
      .getRange(1, 1, 1, sheet.getLastColumn())
      .getValues()[0];

    // Generate ID if not provided
    if (!data.id) {
      data.id = generateId();
    }

    // Prepare row data
    const rowData = headers.map((header) => {
      let value = data[header];
      if (value === undefined || value === null) {
        value = "";
      }
      return value;
    });

    // Append row
    sheet.appendRow(rowData);

    return { success: true, data: data };
  } catch (error) {
    return { success: false, error: error.toString() };
  }
}

/**
 * Update an existing record
 */
function updateRecord(sheetName, data) {
  try {
    if (!data.id) {
      return { success: false, error: "ID is required for update" };
    }

    const sheet = getOrCreateSheet(sheetName);
    const allData = sheet.getDataRange().getValues();
    const headers = allData[0];
    const idIndex = headers.indexOf("id");

    if (idIndex === -1) {
      return { success: false, error: "ID column not found" };
    }

    // Find row with matching ID
    let rowIndex = -1;
    for (let i = 1; i < allData.length; i++) {
      if (allData[i][idIndex] === data.id) {
        rowIndex = i + 1; // +1 because sheet rows are 1-indexed
        break;
      }
    }

    if (rowIndex === -1) {
      return { success: false, error: "Record not found" };
    }

    // Update row
    const rowData = headers.map((header) => {
      if (data.hasOwnProperty(header)) {
        return data[header] === undefined || data[header] === null
          ? ""
          : data[header];
      }
      return allData[rowIndex - 1][headers.indexOf(header)];
    });

    sheet.getRange(rowIndex, 1, 1, rowData.length).setValues([rowData]);

    return { success: true, data: data };
  } catch (error) {
    return { success: false, error: error.toString() };
  }
}

/**
 * Delete a record
 */
function deleteRecord(sheetName, data) {
  try {
    if (!data.id) {
      return { success: false, error: "ID is required for delete" };
    }

    const sheet = getOrCreateSheet(sheetName);
    const allData = sheet.getDataRange().getValues();
    const headers = allData[0];
    const idIndex = headers.indexOf("id");

    if (idIndex === -1) {
      return { success: false, error: "ID column not found" };
    }

    // Find row with matching ID
    let rowIndex = -1;
    for (let i = 1; i < allData.length; i++) {
      if (allData[i][idIndex] === data.id) {
        rowIndex = i + 1;
        break;
      }
    }

    if (rowIndex === -1) {
      return { success: false, error: "Record not found" };
    }

    // Delete row
    sheet.deleteRow(rowIndex);

    return { success: true, data: true };
  } catch (error) {
    return { success: false, error: error.toString() };
  }
}

// ============================================
// AUTHENTICATION
// ============================================

/**
 * Login user with username and password
 */
function loginUser(data) {
  try {
    const { username, password } = data;

    if (!username || !password) {
      return { success: false, error: "Username dan password harus diisi" };
    }

    const sheet = getOrCreateSheet("users");
    const allData = sheet.getDataRange().getValues();

    if (allData.length <= 1) {
      return { success: false, error: "User tidak ditemukan" };
    }

    const headers = allData[0];
    const usernameIndex = headers.indexOf("username");
    const passwordIndex = headers.indexOf("password");
    const statusIndex = headers.indexOf("status");

    // Normalize input - trim whitespace and convert to string
    const inputUsername = String(username).trim();
    const inputPassword = String(password).trim();

    // Find user
    for (let i = 1; i < allData.length; i++) {
      // Convert stored values to string for comparison (handles numeric usernames)
      const storedUsername = String(allData[i][usernameIndex]).trim();
      const storedPassword = String(allData[i][passwordIndex]).trim();
      const storedStatus = String(allData[i][statusIndex]).trim().toLowerCase();

      if (storedUsername === inputUsername) {
        // Check password (Note: In production, use hashed passwords!)
        if (storedPassword === inputPassword) {
          // Check if user is active
          if (storedStatus !== "active") {
            return {
              success: false,
              error: "Akun tidak aktif. Hubungi admin.",
            };
          }

          // Build user object
          const user = {};
          headers.forEach((header, index) => {
            if (header !== "password") {
              let value = allData[i][index];
              // Convert date objects to ISO string
              if (value instanceof Date) {
                value = Utilities.formatDate(
                  value,
                  Session.getScriptTimeZone(),
                  "yyyy-MM-dd HH:mm:ss"
                );
              }
              user[header] = value;
            }
          });

          // Update last login
          const lastLoginIndex = headers.indexOf("lastLogin");
          if (lastLoginIndex !== -1) {
            sheet
              .getRange(i + 1, lastLoginIndex + 1)
              .setValue(new Date().toISOString());
          }

          return {
            success: true,
            data: {
              user: user,
              session: { id: generateId() },
            },
          };
        } else {
          return { success: false, error: "Username atau password salah" };
        }
      }
    }

    return { success: false, error: "Username atau password salah" };
  } catch (error) {
    return { success: false, error: error.toString() };
  }
}

/**
 * Create a new session
 */
function createSession(data) {
  try {
    const sessionId = generateId();
    const sessionData = {
      id: sessionId,
      username: data.username,
      deviceId: data.deviceId,
      browser: data.browser,
      createdAt: new Date().toISOString(),
      lastActivity: new Date().toISOString(),
    };

    const result = createRecord("sessions", sessionData);

    if (result.success) {
      return { success: true, data: { sessionId: sessionId } };
    }
    return result;
  } catch (error) {
    return { success: false, error: error.toString() };
  }
}

/**
 * Check if session is valid
 */
function checkSession(sessionId) {
  try {
    if (!sessionId) {
      return { success: true, data: { valid: false } };
    }

    const sheet = getOrCreateSheet("sessions");
    const allData = sheet.getDataRange().getValues();

    if (allData.length <= 1) {
      return { success: true, data: { valid: false } };
    }

    const headers = allData[0];
    const idIndex = headers.indexOf("id");
    const deviceIdIndex = headers.indexOf("deviceId");
    const browserIndex = headers.indexOf("browser");

    for (let i = 1; i < allData.length; i++) {
      if (allData[i][idIndex] === sessionId) {
        // Update last activity
        const lastActivityIndex = headers.indexOf("lastActivity");
        if (lastActivityIndex !== -1) {
          sheet
            .getRange(i + 1, lastActivityIndex + 1)
            .setValue(new Date().toISOString());
        }

        return {
          success: true,
          data: {
            valid: true,
            deviceId: allData[i][deviceIdIndex],
            browser: allData[i][browserIndex],
          },
        };
      }
    }

    return { success: true, data: { valid: false } };
  } catch (error) {
    return { success: false, error: error.toString() };
  }
}

/**
 * Delete session (logout)
 */
function deleteSession(data) {
  try {
    return deleteRecord("sessions", { id: data.sessionId });
  } catch (error) {
    return { success: false, error: error.toString() };
  }
}

// ============================================
// PHOTO DOCUMENTATION FUNCTIONS
// ============================================

/**
 * Upload photo to Google Drive
 * Data format:
 * {
 *   judul: "C2-L-001",
 *   keterangan: "Deskripsi foto",
 *   imageBase64: "base64 string",
 *   fileName: "photo.jpg",
 *   uploadBy: "username",
 *   plant: "NPK1"
 * }
 */
function uploadPhotoToGoogleDrive(data) {
  try {
    const { judul, keterangan, imageBase64, fileName, uploadBy, plant } = data;

    if (!judul || !imageBase64 || !uploadBy) {
      return {
        success: false,
        error: "Judul, foto, dan user diperlukan",
      };
    }

    // Get or create main documentation folder
    const mainFolder = getOrCreateFolder(
      "Dokumentasi Foto",
      DriveApp.getRootFolder()
    );

    // Get or create subfolder based on judul
    const subFolder = getOrCreateFolder(judul, mainFolder);

    // Decode base64 image
    const base64Data = imageBase64.split(",")[1] || imageBase64; // Remove data:image/jpeg;base64, prefix if exists
    const blob = Utilities.newBlob(
      Utilities.base64Decode(base64Data),
      "image/jpeg",
      fileName || `photo_${new Date().getTime()}.jpg`
    );

    // Upload file to Google Drive
    const file = subFolder.createFile(blob);

    // Make file accessible via link
    file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);

    // Save metadata to sheet
    const photoData = {
      id: generateId(),
      tanggal: Utilities.formatDate(
        new Date(),
        Session.getScriptTimeZone(),
        "yyyy-MM-dd"
      ),
      judul: judul,
      keterangan: keterangan || "",
      fileId: file.getId(),
      fileUrl: file.getUrl(),
      folderId: subFolder.getId(),
      folderUrl: subFolder.getUrl(),
      uploadBy: uploadBy,
      plant: plant || "",
      createdAt: new Date().toISOString(),
    };

    const sheetName =
      plant === "NPK1" ? "dokumentasi_foto_NPK1" : "dokumentasi_foto";
    const result = createRecord(sheetName, photoData);

    if (result.success) {
      return {
        success: true,
        data: {
          ...photoData,
          thumbnailUrl: `https://drive.google.com/thumbnail?id=${file.getId()}&sz=w500`,
        },
      };
    }

    return result;
  } catch (error) {
    return {
      success: false,
      error: `Upload gagal: ${error.toString()}`,
    };
  }
}

/**
 * Delete photo from Google Drive and database
 */
function deletePhotoFromGoogleDrive(data) {
  try {
    const { id, fileId, plant } = data;

    if (!id || !fileId) {
      return {
        success: false,
        error: "ID dan File ID diperlukan",
      };
    }

    // Delete file from Google Drive
    try {
      const file = DriveApp.getFileById(fileId);
      file.setTrashed(true); // Move to trash instead of permanent delete
    } catch (error) {
      Logger.log(`File not found or already deleted: ${fileId}`);
    }

    // Delete record from sheet
    const sheetName =
      plant === "NPK1" ? "dokumentasi_foto_NPK1" : "dokumentasi_foto";
    const result = deleteRecord(sheetName, { id: id });

    return result;
  } catch (error) {
    return {
      success: false,
      error: `Delete gagal: ${error.toString()}`,
    };
  }
}

/**
 * Get or create folder in Google Drive
 */
function getOrCreateFolder(folderName, parentFolder) {
  const folders = parentFolder.getFoldersByName(folderName);

  if (folders.hasNext()) {
    return folders.next();
  } else {
    return parentFolder.createFolder(folderName);
  }
}

// ============================================
// EXCHANGE RATE FUNCTIONS
// ============================================

/**
 * Get real-time USD to IDR exchange rate
 * Uses multiple free APIs as fallback
 */
function getExchangeRate() {
  try {
    // Try primary API: Exchange Rate API (free tier)
    let rate = getExchangeRateFromAPI1();

    if (!rate) {
      // Fallback to secondary API
      rate = getExchangeRateFromAPI2();
    }

    if (!rate) {
      // Fallback to tertiary API
      rate = getExchangeRateFromAPI3();
    }

    if (rate) {
      return {
        success: true,
        data: {
          rate: rate,
          currency: "IDR",
          base: "USD",
          timestamp: new Date().toISOString(),
          formatted: formatCurrency(rate),
        },
      };
    }

    return {
      success: false,
      error: "Tidak dapat mengambil kurs dollar. Silakan masukkan manual.",
    };
  } catch (error) {
    return {
      success: false,
      error: `Error: ${error.toString()}`,
    };
  }
}

/**
 * Primary API: ExchangeRate-API (free tier - 1500 requests/month)
 */
function getExchangeRateFromAPI1() {
  try {
    const url = "https://api.exchangerate-api.com/v4/latest/USD";
    const response = UrlFetchApp.fetch(url, {
      muteHttpExceptions: true,
      headers: {
        Accept: "application/json",
      },
    });

    if (response.getResponseCode() === 200) {
      const data = JSON.parse(response.getContentText());
      if (data && data.rates && data.rates.IDR) {
        return Math.round(data.rates.IDR);
      }
    }
    return null;
  } catch (error) {
    Logger.log("API1 Error: " + error.toString());
    return null;
  }
}

/**
 * Secondary API: Fawaz Ahmed's Currency API (free, no key required)
 */
function getExchangeRateFromAPI2() {
  try {
    const url =
      "https://cdn.jsdelivr.net/npm/@fawazahmed0/currency-api@latest/v1/currencies/usd.json";
    const response = UrlFetchApp.fetch(url, {
      muteHttpExceptions: true,
      headers: {
        Accept: "application/json",
      },
    });

    if (response.getResponseCode() === 200) {
      const data = JSON.parse(response.getContentText());
      if (data && data.usd && data.usd.idr) {
        return Math.round(data.usd.idr);
      }
    }
    return null;
  } catch (error) {
    Logger.log("API2 Error: " + error.toString());
    return null;
  }
}

/**
 * Tertiary API: Open Exchange Rates alternative
 */
function getExchangeRateFromAPI3() {
  try {
    const url = "https://open.er-api.com/v6/latest/USD";
    const response = UrlFetchApp.fetch(url, {
      muteHttpExceptions: true,
      headers: {
        Accept: "application/json",
      },
    });

    if (response.getResponseCode() === 200) {
      const data = JSON.parse(response.getContentText());
      if (data && data.rates && data.rates.IDR) {
        return Math.round(data.rates.IDR);
      }
    }
    return null;
  } catch (error) {
    Logger.log("API3 Error: " + error.toString());
    return null;
  }
}

/**
 * Format currency to Indonesian Rupiah format
 */
function formatCurrency(amount) {
  return "Rp " + amount.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".");
}

/**
 * Test function for exchange rate
 */
function testExchangeRate() {
  const result = getExchangeRate();
  Logger.log(JSON.stringify(result, null, 2));
}

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Get or create a sheet with proper headers
 */
function getOrCreateSheet(sheetName) {
  const spreadsheet = SpreadsheetApp.openById(SPREADSHEET_ID);
  let sheet = spreadsheet.getSheetByName(sheetName);

  if (!sheet) {
    sheet = spreadsheet.insertSheet(sheetName);

    // Get headers from config or use default
    let baseSheetName = sheetName.replace("_NPK1", "");
    let headers = SHEET_HEADERS[baseSheetName];

    if (!headers) {
      headers = ["id", "createdAt", "updatedAt"];
    }

    sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
    sheet.getRange(1, 1, 1, headers.length).setFontWeight("bold");
    sheet.setFrozenRows(1);
  }

  return sheet;
}

/**
 * Generate unique ID
 */
function generateId() {
  return Utilities.getUuid();
}

/**
 * Get current timestamp
 */
function getCurrentTimestamp() {
  return new Date().toISOString();
}

// ============================================
// INITIALIZATION & SETUP
// ============================================

/**
 * Initialize all sheets with headers
 * Run this function once to set up all sheets
 */
function initializeAllSheets() {
  const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();

  // List of all sheets needed
  const allSheets = [
    "users",
    "sessions",
    "produksi_npk",
    "produksi_npk_NPK1",
    "produksi_blending",
    "produksi_blending_NPK1",
    "produksi_npk_mini",
    "produksi_npk_mini_NPK1",
    "timesheet_forklift",
    "timesheet_forklift_NPK1",
    "timesheet_loader",
    "timesheet_loader_NPK1",
    "downtime",
    "downtime_NPK1",
    "workrequest",
    "workrequest_NPK1",
    "bahanbaku",
    "bahanbaku_NPK1",
    "vibrasi",
    "vibrasi_NPK1",
    "gatepass",
    "gatepass_NPK1",
    "perta",
    "perta_NPK1",
    "perbaikan_tahunan",
    "perbaikan_tahunan_NPK1",
    "trouble_record",
    "trouble_record_NPK1",
    "dokumentasi_foto",
    "dokumentasi_foto_NPK1",
    "kop",
    "kop_NPK1",
    "rekap_bbm",
    "rekap_bbm_NPK1",
    "pemantauan_bahan_baku",
    "pemantauan_bahan_baku_NPK1",
    "akun",
    "rkap",
    "approval_requests",
    "monthly_notes",
    "notifications",
    "chat_messages",
    "active_users",
  ];

  allSheets.forEach((sheetName) => {
    getOrCreateSheet(sheetName);
  });

  Logger.log("All sheets initialized successfully!");
}

/**
 * Create default admin user
 * Run this once after initialization
 */
function createDefaultAdmin() {
  const adminData = {
    id: generateId(),
    username: "admin",
    password: "admin123", // GANTI PASSWORD INI!
    nama: "Administrator",
    namaLengkap: "System Administrator",
    email: "admin@example.com",
    role: "admin",
    status: "active",
    plant: "ALL",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  const result = createRecord("users", adminData);

  if (result.success) {
    Logger.log("Default admin created successfully!");
    Logger.log("Username: admin");
    Logger.log("Password: admin123 (GANTI SEGERA!)");
  } else {
    Logger.log("Failed to create admin: " + result.error);
  }
}

/**
 * Create sample RKAP data
 */
function createSampleRKAP() {
  const months = [
    "Januari",
    "Februari",
    "Maret",
    "April",
    "Mei",
    "Juni",
    "Juli",
    "Agustus",
    "September",
    "Oktober",
    "November",
    "Desember",
  ];
  const year = new Date().getFullYear();

  months.forEach((bulan, index) => {
    // NPK2 RKAP
    createRecord("rkap", {
      id: generateId(),
      bulan: bulan,
      tahun: year,
      produk: "NPK Granul",
      targetRKAP: 10000 + Math.floor(Math.random() * 5000),
      targetProduksi: 10000 + Math.floor(Math.random() * 5000),
      satuan: "Ton",
      plant: "NPK2",
    });

    // NPK1 RKAP
    createRecord("rkap", {
      id: generateId(),
      bulan: bulan,
      tahun: year,
      produk: "NPK Granul",
      targetRKAP: 8000 + Math.floor(Math.random() * 4000),
      targetProduksi: 8000 + Math.floor(Math.random() * 4000),
      satuan: "Ton",
      plant: "NPK1",
    });
  });

  Logger.log("Sample RKAP data created!");
}

// ============================================
// UTILITY FUNCTIONS FOR TESTING
// ============================================

/**
 * Test read function
 */
function testRead() {
  const result = readSheet("users");
  Logger.log(JSON.stringify(result, null, 2));
}

/**
 * Test create function
 */
function testCreate() {
  const result = createRecord("produksi_npk", {
    tanggal: "2024-01-15",
    shiftMalamOnspek: 100,
    shiftMalamOffspek: 5,
    shiftPagiOnspek: 120,
    shiftPagiOffspek: 3,
    shiftSoreOnspek: 110,
    shiftSoreOffspek: 2,
  });
  Logger.log(JSON.stringify(result, null, 2));
}

/**
 * Clear all data in a sheet (except headers)
 */
function clearSheetData(sheetName) {
  const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = spreadsheet.getSheetByName(sheetName);

  if (sheet && sheet.getLastRow() > 1) {
    sheet.deleteRows(2, sheet.getLastRow() - 1);
    Logger.log("Cleared data from " + sheetName);
  }
}

// ============================================
// FILL EMPTY IDs FOR MANUAL INPUT
// ============================================

/**
 * Fill empty IDs in rekap_bbm sheets (both NPK1 and NPK2)
 * Run this function after manually inputting data without IDs
 */
function fillEmptyIdsRekapBBM() {
  const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  const sheetNames = ["rekap_bbm", "rekap_bbm_NPK1"];
  let totalFilled = 0;

  sheetNames.forEach((sheetName) => {
    const sheet = spreadsheet.getSheetByName(sheetName);
    if (!sheet) {
      Logger.log("Sheet " + sheetName + " not found");
      return;
    }

    const lastRow = sheet.getLastRow();
    if (lastRow <= 1) {
      Logger.log("No data in " + sheetName);
      return;
    }

    // Get all data starting from row 2 (skip header)
    const dataRange = sheet.getRange(2, 1, lastRow - 1, 1); // Column A (id)
    const ids = dataRange.getValues();

    let filledCount = 0;
    for (let i = 0; i < ids.length; i++) {
      if (!ids[i][0] || ids[i][0] === "") {
        // Generate new ID and set it
        const newId = generateId();
        sheet.getRange(i + 2, 1).setValue(newId);
        filledCount++;
      }
    }

    Logger.log("Filled " + filledCount + " empty IDs in " + sheetName);
    totalFilled += filledCount;
  });

  Logger.log("=== Total IDs filled: " + totalFilled + " ===");
  SpreadsheetApp.getActiveSpreadsheet().toast(
    "Berhasil mengisi " + totalFilled + " ID kosong di rekap_bbm!",
    "✅ Selesai",
    5
  );
}

/**
 * Fill empty IDs in any specified sheet
 * @param {string} sheetName - Name of the sheet to fill IDs
 */
function fillEmptyIdsInSheet(sheetName) {
  const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = spreadsheet.getSheetByName(sheetName);

  if (!sheet) {
    Logger.log("Sheet " + sheetName + " not found");
    return 0;
  }

  const lastRow = sheet.getLastRow();
  if (lastRow <= 1) {
    Logger.log("No data in " + sheetName);
    return 0;
  }

  // Get all data starting from row 2 (skip header)
  const dataRange = sheet.getRange(2, 1, lastRow - 1, 1); // Column A (id)
  const ids = dataRange.getValues();

  let filledCount = 0;
  for (let i = 0; i < ids.length; i++) {
    if (!ids[i][0] || ids[i][0] === "") {
      // Generate new ID and set it
      const newId = generateId();
      sheet.getRange(i + 2, 1).setValue(newId);
      filledCount++;
    }
  }

  Logger.log("Filled " + filledCount + " empty IDs in " + sheetName);
  return filledCount;
}

/**
 * Fill empty IDs in ALL data sheets
 * Useful for bulk manual data entry
 */
function fillEmptyIdsAllSheets() {
  const allDataSheets = [
    "rekap_bbm",
    "rekap_bbm_NPK1",
    "pemantauan_bahan_baku",
    "pemantauan_bahan_baku_NPK1",
    "produksi_npk",
    "produksi_npk_NPK1",
    "produksi_blending",
    "produksi_blending_NPK1",
    "produksi_npk_mini",
    "produksi_npk_mini_NPK1",
    "timesheet_forklift",
    "timesheet_forklift_NPK1",
    "timesheet_loader",
    "timesheet_loader_NPK1",
    "downtime",
    "downtime_NPK1",
    "workrequest",
    "workrequest_NPK1",
    "bahanbaku",
    "bahanbaku_NPK1",
    "vibrasi",
    "vibrasi_NPK1",
    "gatepass",
    "gatepass_NPK1",
    "perta",
    "perta_NPK1",
    "trouble_record",
    "trouble_record_NPK1",
    "dokumentasi_foto",
    "dokumentasi_foto_NPK1",
    "kop",
    "kop_NPK1",
    "perbaikan_tahunan",
    "perbaikan_tahunan_NPK1",
  ];

  let totalFilled = 0;
  allDataSheets.forEach((sheetName) => {
    totalFilled += fillEmptyIdsInSheet(sheetName);
  });

  Logger.log("=== Total IDs filled across all sheets: " + totalFilled + " ===");
  SpreadsheetApp.getActiveSpreadsheet().toast(
    "Berhasil mengisi " + totalFilled + " ID kosong di semua sheet!",
    "✅ Selesai",
    5
  );
}

// ============================================
// MENU FOR SPREADSHEET
// ============================================

/**
 * Add custom menu to spreadsheet
 */
function onOpen() {
  const ui = SpreadsheetApp.getUi();
  ui.createMenu("🔧 NPK Webapp")
    .addItem("Initialize All Sheets", "initializeAllSheets")
    .addItem("Create Default Admin", "createDefaultAdmin")
    .addItem("Create Sample RKAP", "createSampleRKAP")
    .addSeparator()
    .addItem("🔑 Fill Empty IDs - Rekap BBM", "fillEmptyIdsRekapBBM")
    .addItem("🔑 Fill Empty IDs - All Sheets", "fillEmptyIdsAllSheets")
    .addItem("🔑 Fill Empty IDs - Pemantauan BB", "fillEmptyIdsPemantauanBB")
    .addSeparator()
    .addItem("Test Read Users", "testRead")
    .addToUi();
}

/**
 * Fill empty IDs in pemantauan_bahan_baku sheets
 */
function fillEmptyIdsPemantauanBB() {
  const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  const sheetNames = ["pemantauan_bahan_baku", "pemantauan_bahan_baku_NPK1"];
  let totalFilled = 0;

  sheetNames.forEach((sheetName) => {
    const sheet = spreadsheet.getSheetByName(sheetName);
    if (!sheet) {
      Logger.log("Sheet " + sheetName + " not found");
      return;
    }

    const lastRow = sheet.getLastRow();
    if (lastRow <= 1) {
      Logger.log("No data in " + sheetName);
      return;
    }

    // Get all data starting from row 2 (skip header)
    const dataRange = sheet.getRange(2, 1, lastRow - 1, 1); // Column A (id)
    const ids = dataRange.getValues();

    let filledCount = 0;
    for (let i = 0; i < ids.length; i++) {
      if (!ids[i][0] || ids[i][0] === "") {
        // Generate new ID and set it
        const newId = generateId();
        sheet.getRange(i + 2, 1).setValue(newId);
        filledCount++;
      }
    }

    Logger.log("Filled " + filledCount + " empty IDs in " + sheetName);
    totalFilled += filledCount;
  });

  Logger.log("=== Total IDs filled: " + totalFilled + " ===");
  SpreadsheetApp.getActiveSpreadsheet().toast(
    "Berhasil mengisi " + totalFilled + " ID kosong di pemantauan_bahan_baku!",
    "✅ Selesai",
    5
  );
}
