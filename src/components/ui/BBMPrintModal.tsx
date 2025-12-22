import { useState, useRef, useEffect } from "react";
import { X, Printer, Calendar, Fuel, User, Hash } from "lucide-react";
import { formatDate, formatNumber, getCurrentDate } from "@/lib/utils";
import type { RekapBBM } from "@/types";

interface BBMPrintModalProps {
  isOpen: boolean;
  onClose: () => void;
  data: RekapBBM[];
  plant: string;
}

const BBMPrintModal = ({
  isOpen,
  onClose,
  data,
  plant,
}: BBMPrintModalProps) => {
  const printRef = useRef<HTMLDivElement>(null);
  const [startDate, setStartDate] = useState(getCurrentDate());
  const [endDate, setEndDate] = useState(getCurrentDate());

  // Signature states
  const [mengetahui, setMengetahui] = useState({
    nama: "",
    noBadge: "",
    jabatan: "",
  });
  const [dibuat, setDibuat] = useState({ nama: "", noBadge: "", jabatan: "" });

  useEffect(() => {
    if (isOpen) {
      // Set default dates to current month
      const now = new Date();
      const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
      const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);
      setStartDate(firstDay.toISOString().split("T")[0]);
      setEndDate(lastDay.toISOString().split("T")[0]);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  // Filter data by date range
  const filteredData = data
    .filter((item) => {
      const itemDate = new Date(item.tanggal);
      const start = new Date(startDate);
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
      return itemDate >= start && itemDate <= end;
    })
    .sort(
      (a, b) => new Date(a.tanggal).getTime() - new Date(b.tanggal).getTime()
    );

  // Calculate totals
  const totalPengajuan = filteredData.reduce(
    (sum, item) => sum + (item.pengajuanSolar || 0),
    0
  );
  const totalRealisasi = filteredData.reduce(
    (sum, item) => sum + (item.realisasiPengisian || 0),
    0
  );
  const totalSelisih = totalRealisasi - totalPengajuan;

  const formatCurrentDate = () => {
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
    const now = new Date();
    return `${now.getDate()} ${months[now.getMonth()]} ${now.getFullYear()}`;
  };

  const formatPeriode = () => {
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
    const start = new Date(startDate);
    const end = new Date(endDate);
    return `${start.getDate()} ${
      months[start.getMonth()]
    } ${start.getFullYear()} - ${end.getDate()} ${
      months[end.getMonth()]
    } ${end.getFullYear()}`;
  };

  const handlePrint = () => {
    const printContent = printRef.current;
    if (!printContent) return;

    const printWindow = window.open("", "_blank");
    if (!printWindow) return;

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Rekap BBM Alat Berat - ${plant}</title>
        <style>
          @page {
            size: A4 portrait;
            margin: 6mm;
          }
          * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
          }
          body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            font-size: 7pt;
            line-height: 1.1;
            color: #1a1a2e;
            background: #fff;
          }
          .print-container {
            width: 100%;
            max-width: 200mm;
            padding: 3px;
          }
          
          /* Header Styles */
          .header {
            text-align: center;
            margin-bottom: 6px;
            padding-bottom: 5px;
            border-bottom: 2px solid #2563eb;
          }
          .header h1 {
            font-size: 12pt;
            font-weight: 700;
            color: #1e40af;
            text-transform: uppercase;
            letter-spacing: 1px;
            margin-bottom: 2px;
          }
          .header .plant-badge {
            display: inline-block;
            background: linear-gradient(135deg, #3b82f6, #1d4ed8);
            color: white;
            padding: 2px 10px;
            border-radius: 12px;
            font-size: 8pt;
            font-weight: 600;
            margin: 3px 0;
          }
          .header .periode {
            font-size: 8pt;
            color: #64748b;
            margin-top: 3px;
          }
          .header .periode span {
            font-weight: 600;
            color: #334155;
          }
          
          /* Table Styles */
          table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 6px;
            font-size: 6pt;
          }
          thead th {
            background: linear-gradient(180deg, #1e40af, #1e3a8a);
            color: white;
            font-weight: 600;
            padding: 3px 2px;
            text-align: center;
            border: 1px solid #1e3a8a;
            text-transform: uppercase;
            font-size: 6pt;
            letter-spacing: 0.2px;
          }
          tbody td {
            padding: 2px 3px;
            border: 1px solid #cbd5e1;
            text-align: center;
            font-size: 6pt;
          }
          tbody tr:nth-child(even) {
            background-color: #f8fafc;
          }
          tbody tr:hover {
            background-color: #e0e7ff;
          }
          .text-left {
            text-align: left !important;
          }
          .text-right {
            text-align: right !important;
          }
          .font-mono {
            font-family: 'Consolas', monospace;
          }
          
          /* Number formatting */
          .number-positive {
            color: #059669;
            font-weight: 600;
          }
          .number-negative {
            color: #dc2626;
            font-weight: 600;
          }
          
          /* Summary Row */
          .summary-row td {
            background: linear-gradient(180deg, #f59e0b, #d97706) !important;
            color: white !important;
            font-weight: 700 !important;
            border-color: #b45309 !important;
            padding: 3px 2px !important;
            font-size: 6pt !important;
          }
          
          /* Footer & Signatures */
          .footer {
            margin-top: 8px;
          }
          .print-date {
            text-align: right;
            font-size: 7pt;
            color: #64748b;
            font-style: italic;
            margin-bottom: 10px;
          }
          
          .signatures-container {
            display: flex;
            justify-content: space-between;
            margin-top: 8px;
            padding: 0 30px;
          }
          
          .signature-box {
            text-align: center;
            min-width: 140px;
          }
          
          .signature-label {
            font-size: 7pt;
            color: #64748b;
            margin-bottom: 2px;
          }
          
          .signature-jabatan {
            font-size: 7pt;
            font-weight: 600;
            color: #1e40af;
            margin-bottom: 30px;
            min-height: 12px;
          }
          
          .signature-name {
            font-size: 8pt;
            font-weight: 700;
            color: #1a1a2e;
            text-decoration: underline;
            text-underline-offset: 2px;
            margin-bottom: 1px;
            min-height: 12px;
          }
          
          .signature-badge {
            font-size: 7pt;
            color: #475569;
            font-weight: 500;
            min-height: 10px;
          }
          
          /* Summary Cards */
          .summary-cards {
            display: flex;
            justify-content: center;
            gap: 10px;
            margin-bottom: 6px;
          }
          
          .summary-card {
            background: linear-gradient(135deg, #f0f9ff, #e0f2fe);
            border: 1px solid #0ea5e9;
            border-radius: 4px;
            padding: 4px 10px;
            text-align: center;
            min-width: 90px;
          }
          
          .summary-card.pengajuan {
            background: linear-gradient(135deg, #fffbeb, #fef3c7);
            border-color: #f59e0b;
          }
          
          .summary-card.realisasi {
            background: linear-gradient(135deg, #f0fdf4, #dcfce7);
            border-color: #22c55e;
          }
          
          .summary-card.selisih-positive {
            background: linear-gradient(135deg, #f0fdf4, #dcfce7);
            border-color: #22c55e;
          }
          
          .summary-card.selisih-negative {
            background: linear-gradient(135deg, #fef2f2, #fee2e2);
            border-color: #ef4444;
          }
          
          .summary-card-label {
            font-size: 6pt;
            color: #64748b;
            text-transform: uppercase;
            letter-spacing: 0.3px;
            margin-bottom: 1px;
          }
          
          .summary-card-value {
            font-size: 9pt;
            font-weight: 700;
            color: #1e40af;
          }
          
          .summary-card.pengajuan .summary-card-value { color: #b45309; }
          .summary-card.realisasi .summary-card-value { color: #16a34a; }
          .summary-card.selisih-positive .summary-card-value { color: #16a34a; }
          .summary-card.selisih-negative .summary-card-value { color: #dc2626; }
          
          @media print {
            body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          }
        </style>
      </head>
      <body>
        ${printContent.innerHTML}
      </body>
      </html>
    `);

    printWindow.document.close();
    printWindow.focus();

    setTimeout(() => {
      printWindow.print();
      printWindow.close();
    }, 300);
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b bg-gradient-to-r from-amber-500 to-orange-500">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-white/20 rounded-lg">
              <Fuel className="h-6 w-6 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">
                Cetak Rekap BBM Alat Berat
              </h2>
              <p className="text-amber-100 text-sm">Plant {plant}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-white/20 rounded-lg transition-colors"
          >
            <X className="h-6 w-6 text-white" />
          </button>
        </div>

        {/* Settings Form */}
        <div className="p-5 border-b bg-gradient-to-b from-amber-50 to-white space-y-5">
          {/* Date Range */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="flex items-center gap-2 text-sm font-semibold text-dark-700 mb-2">
                <Calendar className="h-4 w-4 text-amber-600" />
                Tanggal Mulai
              </label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full px-4 py-2.5 border-2 border-amber-200 rounded-xl focus:ring-2 focus:ring-amber-500 focus:border-amber-500 transition-all"
              />
            </div>
            <div>
              <label className="flex items-center gap-2 text-sm font-semibold text-dark-700 mb-2">
                <Calendar className="h-4 w-4 text-amber-600" />
                Tanggal Akhir
              </label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full px-4 py-2.5 border-2 border-amber-200 rounded-xl focus:ring-2 focus:ring-amber-500 focus:border-amber-500 transition-all"
              />
            </div>
          </div>

          {/* Signature Fields */}
          <div className="space-y-4">
            <h3 className="text-sm font-bold text-dark-700 flex items-center gap-2">
              <User className="h-4 w-4 text-amber-600" />
              Data Tanda Tangan
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Mengetahui */}
              <div className="p-4 bg-white rounded-xl border-2 border-amber-200 shadow-sm">
                <h4 className="text-xs font-bold text-amber-700 mb-3 uppercase tracking-wider">
                  Mengetahui
                </h4>
                <div className="space-y-2">
                  <input
                    type="text"
                    placeholder="Jabatan"
                    value={mengetahui.jabatan}
                    onChange={(e) =>
                      setMengetahui({ ...mengetahui, jabatan: e.target.value })
                    }
                    className="w-full px-3 py-2 text-sm border border-dark-200 rounded-lg focus:ring-2 focus:ring-amber-500"
                  />
                  <input
                    type="text"
                    placeholder="Nama Lengkap"
                    value={mengetahui.nama}
                    onChange={(e) =>
                      setMengetahui({ ...mengetahui, nama: e.target.value })
                    }
                    className="w-full px-3 py-2 text-sm border border-dark-200 rounded-lg focus:ring-2 focus:ring-amber-500"
                  />
                  <div className="relative">
                    <Hash className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-dark-400" />
                    <input
                      type="text"
                      placeholder="No. Badge"
                      value={mengetahui.noBadge}
                      onChange={(e) =>
                        setMengetahui({
                          ...mengetahui,
                          noBadge: e.target.value,
                        })
                      }
                      className="w-full pl-9 pr-3 py-2 text-sm border border-dark-200 rounded-lg focus:ring-2 focus:ring-amber-500"
                    />
                  </div>
                </div>
              </div>

              {/* Dibuat Oleh */}
              <div className="p-4 bg-white rounded-xl border-2 border-amber-200 shadow-sm">
                <h4 className="text-xs font-bold text-amber-700 mb-3 uppercase tracking-wider">
                  Dibuat Oleh
                </h4>
                <div className="space-y-2">
                  <input
                    type="text"
                    placeholder="Jabatan"
                    value={dibuat.jabatan}
                    onChange={(e) =>
                      setDibuat({ ...dibuat, jabatan: e.target.value })
                    }
                    className="w-full px-3 py-2 text-sm border border-dark-200 rounded-lg focus:ring-2 focus:ring-amber-500"
                  />
                  <input
                    type="text"
                    placeholder="Nama Lengkap"
                    value={dibuat.nama}
                    onChange={(e) =>
                      setDibuat({ ...dibuat, nama: e.target.value })
                    }
                    className="w-full px-3 py-2 text-sm border border-dark-200 rounded-lg focus:ring-2 focus:ring-amber-500"
                  />
                  <div className="relative">
                    <Hash className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-dark-400" />
                    <input
                      type="text"
                      placeholder="No. Badge"
                      value={dibuat.noBadge}
                      onChange={(e) =>
                        setDibuat({ ...dibuat, noBadge: e.target.value })
                      }
                      className="w-full pl-9 pr-3 py-2 text-sm border border-dark-200 rounded-lg focus:ring-2 focus:ring-amber-500"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-between pt-2">
            <div className="flex items-center gap-2 text-sm">
              <span className="px-3 py-1.5 bg-amber-100 text-amber-800 rounded-full font-medium">
                {filteredData.length} data
              </span>
              <span className="text-dark-500">ditemukan dalam periode ini</span>
            </div>
            <button
              onClick={handlePrint}
              disabled={filteredData.length === 0}
              className="flex items-center gap-2 px-6 py-2.5 bg-gradient-to-r from-amber-500 to-orange-500 text-white rounded-xl hover:from-amber-600 hover:to-orange-600 disabled:opacity-50 disabled:cursor-not-allowed font-semibold shadow-lg shadow-amber-500/30 transition-all"
            >
              <Printer className="h-5 w-5" />
              Cetak Laporan
            </button>
          </div>
        </div>

        {/* Preview */}
        <div className="flex-1 overflow-auto p-5 bg-gray-100">
          <div
            ref={printRef}
            className="bg-white p-6 shadow-xl mx-auto rounded-lg"
            style={{ maxWidth: "210mm", minHeight: "297mm" }}
          >
            <div className="print-container">
              {/* Header */}
              <div className="header">
                <h1>LAPORAN REKAP BBM ALAT BERAT</h1>
                <div className="plant-badge">PLANT {plant}</div>
                <div className="periode">
                  Periode: <span>{formatPeriode()}</span>
                </div>
              </div>

              {/* Summary Cards */}
              <div className="summary-cards">
                <div className="summary-card pengajuan">
                  <div className="summary-card-label">Total Pengajuan</div>
                  <div className="summary-card-value">
                    {formatNumber(totalPengajuan)} L
                  </div>
                </div>
                <div className="summary-card realisasi">
                  <div className="summary-card-label">Total Realisasi</div>
                  <div className="summary-card-value">
                    {formatNumber(totalRealisasi)} L
                  </div>
                </div>
                <div
                  className={`summary-card ${
                    totalSelisih >= 0 ? "selisih-positive" : "selisih-negative"
                  }`}
                >
                  <div className="summary-card-label">Selisih</div>
                  <div className="summary-card-value">
                    {totalSelisih >= 0 ? "+" : ""}
                    {formatNumber(totalSelisih)} L
                  </div>
                </div>
              </div>

              {/* Table */}
              <table>
                <thead>
                  <tr>
                    <th style={{ width: "40px" }}>No</th>
                    <th style={{ width: "100px" }}>Tanggal</th>
                    <th>Nama Alat Berat</th>
                    <th style={{ width: "120px" }}>Pengajuan (L)</th>
                    <th style={{ width: "120px" }}>Realisasi (L)</th>
                    <th style={{ width: "100px" }}>Selisih (L)</th>
                    <th>Keterangan</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredData.map((item, idx) => {
                    const selisih =
                      (item.realisasiPengisian || 0) -
                      (item.pengajuanSolar || 0);
                    return (
                      <tr key={item.id || idx}>
                        <td>{idx + 1}</td>
                        <td>{formatDate(item.tanggal)}</td>
                        <td className="text-left">{item.namaAlatBerat}</td>
                        <td className="text-right font-mono">
                          {formatNumber(item.pengajuanSolar)}
                        </td>
                        <td className="text-right font-mono">
                          {formatNumber(item.realisasiPengisian)}
                        </td>
                        <td
                          className={`text-right font-mono ${
                            selisih >= 0 ? "number-positive" : "number-negative"
                          }`}
                        >
                          {selisih >= 0 ? "+" : ""}
                          {formatNumber(selisih)}
                        </td>
                        <td className="text-left">{item.keterangan || "-"}</td>
                      </tr>
                    );
                  })}
                  {/* Summary Row */}
                  <tr className="summary-row">
                    <td
                      colSpan={3}
                      style={{ textAlign: "center", fontWeight: "bold" }}
                    >
                      TOTAL
                    </td>
                    <td className="text-right font-mono">
                      {formatNumber(totalPengajuan)}
                    </td>
                    <td className="text-right font-mono">
                      {formatNumber(totalRealisasi)}
                    </td>
                    <td
                      className={`text-right font-mono ${
                        totalSelisih >= 0
                          ? "number-positive"
                          : "number-negative"
                      }`}
                    >
                      {totalSelisih >= 0 ? "+" : ""}
                      {formatNumber(totalSelisih)}
                    </td>
                    <td></td>
                  </tr>
                </tbody>
              </table>

              {/* Footer */}
              <div className="footer">
                <div className="print-date">
                  Cikampek, {formatCurrentDate()}
                </div>

                <div className="signatures-container">
                  <div className="signature-box">
                    <div className="signature-label">Mengetahui,</div>
                    <div className="signature-jabatan">
                      {mengetahui.jabatan || "\u00A0"}
                    </div>
                    <div className="signature-name">
                      {mengetahui.nama || "\u00A0"}
                    </div>
                    <div className="signature-badge">
                      {mengetahui.noBadge || "\u00A0"}
                    </div>
                  </div>

                  <div className="signature-box">
                    <div className="signature-label">Dibuat Oleh,</div>
                    <div className="signature-jabatan">
                      {dibuat.jabatan || "\u00A0"}
                    </div>
                    <div className="signature-name">
                      {dibuat.nama || "\u00A0"}
                    </div>
                    <div className="signature-badge">
                      {dibuat.noBadge || "\u00A0"}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BBMPrintModal;
