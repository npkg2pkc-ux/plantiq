/**
 * ===========================================
 * NPK WEBAPP - GOOGLE APPS SCRIPT BACKEND
 * ===========================================
 *
 * CARA SETUP:
 * 1. Buka Google Sheets baru
 * 2. Buka Extensions > Apps Script
 * 3. Copy semua code ini ke editor
 * 4. Deploy > New deployment > Web app
 * 5. Execute as: Me, Who has access: Anyone
 * 6. Copy URL deployment dan paste ke VITE_API_URL di .env
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
 * - akun
 * - rkap
 * - approval_requests
 * - monthly_notes
 * - notifications
 * - chat_messages
 */

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

    const result = rows
      .map((row) => {
        const obj = {};
        headers.forEach((header, index) => {
          let value = row[index];
          // Convert date objects to ISO string
          if (value instanceof Date) {
            value = Utilities.formatDate(
              value,
              Session.getScriptTimeZone(),
              "yyyy-MM-dd"
            );
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
    "akun",
    "rkap",
    "approval_requests",
    "monthly_notes",
    "notifications",
    "chat_messages",
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
    .addItem("Test Read Users", "testRead")
    .addToUi();
}
