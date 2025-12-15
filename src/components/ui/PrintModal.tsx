import { useState, useRef, useEffect } from "react";
import { X, Printer, Calendar } from "lucide-react";
import { getCurrentDate } from "@/lib/utils";

interface SignatureField {
  role: string;
  label: string;
}

interface PrintColumn {
  key: string;
  header: string;
  render?: (value: unknown, item: Record<string, unknown>) => string | number;
  align?: "left" | "center" | "right";
  width?: string;
}

interface PrintModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  data: Record<string, unknown>[];
  columns: PrintColumn[];
  signatures: SignatureField[];
  filters?: {
    kategori?: { options: { value: string; label: string }[]; label: string };
    forklift?: { options: { value: string; label: string }[]; label: string };
    shift?: { options: { value: string; label: string }[]; label: string };
  };
  summaryRows?: {
    label: string;
    getValue: (data: Record<string, unknown>[]) => string | number;
  }[];
  plant?: string;
}

const PrintModal = ({
  isOpen,
  onClose,
  title,
  data,
  columns,
  signatures,
  filters,
  summaryRows,
  plant,
}: PrintModalProps) => {
  const printRef = useRef<HTMLDivElement>(null);
  const [startDate, setStartDate] = useState(getCurrentDate());
  const [endDate, setEndDate] = useState(getCurrentDate());
  const [selectedKategori, setSelectedKategori] = useState("ALL");
  const [selectedForklift, setSelectedForklift] = useState("ALL");
  const [selectedShift, setSelectedShift] = useState("ALL");
  
  // Signature form states
  const [signatureData, setSignatureData] = useState<Record<string, { jabatan: string; nama: string; noBadge: string }>>({});

  useEffect(() => {
    // Initialize signature data
    const initial: Record<string, { jabatan: string; nama: string; noBadge: string }> = {};
    signatures.forEach(sig => {
      initial[sig.role] = { jabatan: "", nama: "", noBadge: "" };
    });
    setSignatureData(initial);
  }, [signatures]);

  if (!isOpen) return null;

  // Filter data by date range and other filters
  const filteredData = data.filter(item => {
    const itemDate = new Date(item.tanggal as string);
    const start = new Date(startDate);
    const end = new Date(endDate);
    end.setHours(23, 59, 59, 999);
    
    if (itemDate < start || itemDate > end) return false;
    
    if (filters?.kategori && selectedKategori !== "ALL") {
      if (item.kategori !== selectedKategori) return false;
    }
    if (filters?.forklift && selectedForklift !== "ALL") {
      if (item.forklift !== selectedForklift) return false;
    }
    if (filters?.shift && selectedShift !== "ALL") {
      if (item.shift !== selectedShift) return false;
    }
    
    return true;
  }).sort((a, b) => new Date(a.tanggal as string).getTime() - new Date(b.tanggal as string).getTime());

  const formatCurrentDate = () => {
    const months = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];
    const now = new Date();
    return `${now.getDate()} ${months[now.getMonth()]} ${now.getFullYear()}`;
  };

  const formatPeriode = () => {
    const months = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];
    const start = new Date(startDate);
    const end = new Date(endDate);
    return `${start.getDate()} ${months[start.getMonth()]} ${start.getFullYear()} - ${end.getDate()} ${months[end.getMonth()]} ${end.getFullYear()}`;
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
        <title>${title}</title>
        <style>
          @page {
            size: A4;
            margin: 10mm;
          }
          * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
          }
          body {
            font-family: Arial, sans-serif;
            font-size: 9pt;
            line-height: 1.3;
            color: #000;
          }
          .print-container {
            width: 100%;
            max-width: 190mm;
            margin: 0 auto;
          }
          .header {
            text-align: center;
            margin-bottom: 8px;
            border-bottom: 2px solid #000;
            padding-bottom: 8px;
          }
          .header h1 {
            font-size: 14pt;
            font-weight: bold;
            margin-bottom: 2px;
          }
          .header .subtitle {
            font-size: 10pt;
            color: #333;
          }
          .header .periode {
            font-size: 9pt;
            margin-top: 4px;
          }
          .filter-info {
            font-size: 8pt;
            color: #555;
            margin-bottom: 8px;
            text-align: center;
          }
          table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 10px;
            font-size: 8pt;
          }
          th, td {
            border: 1px solid #000;
            padding: 3px 4px;
            text-align: left;
          }
          th {
            background-color: #f0f0f0;
            font-weight: bold;
            text-align: center;
          }
          td.number {
            text-align: right;
          }
          td.center {
            text-align: center;
          }
          .summary-row {
            font-weight: bold;
            background-color: #f5f5f5;
          }
          .footer {
            margin-top: 10px;
            text-align: right;
            font-size: 9pt;
          }
          .signatures {
            display: flex;
            justify-content: space-around;
            margin-top: 15px;
            gap: 10px;
          }
          .signature-box {
            text-align: center;
            min-width: 120px;
            flex: 1;
          }
          .signature-box .label {
            font-weight: bold;
            margin-bottom: 50px;
            font-size: 9pt;
          }
          .signature-box .line {
            border-bottom: 1px solid #000;
            margin-bottom: 3px;
            min-height: 15px;
          }
          .signature-box .info {
            font-size: 8pt;
            margin-top: 2px;
          }
          .signature-box .info-label {
            font-size: 7pt;
            color: #666;
          }
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
    }, 250);
  };

  const updateSignature = (role: string, field: string, value: string) => {
    setSignatureData(prev => ({
      ...prev,
      [role]: { ...prev[role], [field]: value }
    }));
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b">
          <h2 className="text-lg font-bold text-dark-900">Cetak {title}</h2>
          <button onClick={onClose} className="p-2 hover:bg-dark-100 rounded-lg">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Settings */}
        <div className="p-4 border-b bg-dark-50 space-y-4">
          {/* Date Range */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-dark-700 mb-1">
                <Calendar className="inline h-4 w-4 mr-1" />
                Tanggal Mulai
              </label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full px-3 py-2 border border-dark-200 rounded-lg focus:ring-2 focus:ring-primary-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-dark-700 mb-1">
                <Calendar className="inline h-4 w-4 mr-1" />
                Tanggal Akhir
              </label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full px-3 py-2 border border-dark-200 rounded-lg focus:ring-2 focus:ring-primary-500"
              />
            </div>
          </div>

          {/* Additional Filters */}
          {(filters?.kategori || filters?.forklift || filters?.shift) && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {filters?.kategori && (
                <div>
                  <label className="block text-sm font-medium text-dark-700 mb-1">
                    {filters.kategori.label}
                  </label>
                  <select
                    value={selectedKategori}
                    onChange={(e) => setSelectedKategori(e.target.value)}
                    className="w-full px-3 py-2 border border-dark-200 rounded-lg focus:ring-2 focus:ring-primary-500"
                  >
                    <option value="ALL">Semua</option>
                    {filters.kategori.options.map(opt => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </select>
                </div>
              )}
              {filters?.forklift && (
                <div>
                  <label className="block text-sm font-medium text-dark-700 mb-1">
                    {filters.forklift.label}
                  </label>
                  <select
                    value={selectedForklift}
                    onChange={(e) => setSelectedForklift(e.target.value)}
                    className="w-full px-3 py-2 border border-dark-200 rounded-lg focus:ring-2 focus:ring-primary-500"
                  >
                    <option value="ALL">Semua</option>
                    {filters.forklift.options.map(opt => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </select>
                </div>
              )}
              {filters?.shift && (
                <div>
                  <label className="block text-sm font-medium text-dark-700 mb-1">
                    {filters.shift.label}
                  </label>
                  <select
                    value={selectedShift}
                    onChange={(e) => setSelectedShift(e.target.value)}
                    className="w-full px-3 py-2 border border-dark-200 rounded-lg focus:ring-2 focus:ring-primary-500"
                  >
                    <option value="ALL">Semua</option>
                    {filters.shift.options.map(opt => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </select>
                </div>
              )}
            </div>
          )}

          {/* Signature Fields */}
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-dark-700">Data Tanda Tangan</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {signatures.map(sig => (
                <div key={sig.role} className="p-3 bg-white rounded-lg border border-dark-200">
                  <h4 className="text-xs font-semibold text-dark-600 mb-2">{sig.label}</h4>
                  <div className="space-y-2">
                    <input
                      type="text"
                      placeholder="Jabatan"
                      value={signatureData[sig.role]?.jabatan || ""}
                      onChange={(e) => updateSignature(sig.role, "jabatan", e.target.value)}
                      className="w-full px-2 py-1 text-sm border border-dark-200 rounded focus:ring-1 focus:ring-primary-500"
                    />
                    <input
                      type="text"
                      placeholder="Nama"
                      value={signatureData[sig.role]?.nama || ""}
                      onChange={(e) => updateSignature(sig.role, "nama", e.target.value)}
                      className="w-full px-2 py-1 text-sm border border-dark-200 rounded focus:ring-1 focus:ring-primary-500"
                    />
                    {sig.role !== "operator" && (
                      <input
                        type="text"
                        placeholder="No. Badge"
                        value={signatureData[sig.role]?.noBadge || ""}
                        onChange={(e) => updateSignature(sig.role, "noBadge", e.target.value)}
                        className="w-full px-2 py-1 text-sm border border-dark-200 rounded focus:ring-1 focus:ring-primary-500"
                      />
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="flex items-center justify-between">
            <p className="text-sm text-dark-500">
              {filteredData.length} data ditemukan
            </p>
            <button
              onClick={handlePrint}
              disabled={filteredData.length === 0}
              className="flex items-center gap-2 px-4 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Printer className="h-4 w-4" />
              Cetak
            </button>
          </div>
        </div>

        {/* Preview */}
        <div className="flex-1 overflow-auto p-4 bg-gray-100">
          <div ref={printRef} className="bg-white p-6 shadow-lg mx-auto" style={{ maxWidth: "210mm", minHeight: "297mm" }}>
            <div className="print-container">
              {/* Header */}
              <div className="header">
                <h1>{title}</h1>
                {plant && <div className="subtitle">{plant}</div>}
                <div className="periode">Periode: {formatPeriode()}</div>
              </div>

              {/* Filter Info */}
              {(selectedKategori !== "ALL" || selectedForklift !== "ALL" || selectedShift !== "ALL") && (
                <div className="filter-info">
                  {selectedKategori !== "ALL" && <span>Kategori: {selectedKategori} | </span>}
                  {selectedForklift !== "ALL" && <span>Forklift: {selectedForklift} | </span>}
                  {selectedShift !== "ALL" && <span>Shift: {selectedShift}</span>}
                </div>
              )}

              {/* Table */}
              <table>
                <thead>
                  <tr>
                    <th style={{ width: "30px" }}>No</th>
                    {columns.map(col => (
                      <th key={col.key} style={{ width: col.width }}>{col.header}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filteredData.map((item, idx) => (
                    <tr key={idx}>
                      <td className="center">{idx + 1}</td>
                      {columns.map(col => {
                        const value = col.render 
                          ? col.render(item[col.key], item)
                          : item[col.key];
                        return (
                          <td 
                            key={col.key} 
                            className={col.align === "right" ? "number" : col.align === "center" ? "center" : ""}
                          >
                            {value as React.ReactNode}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                  {/* Summary Rows */}
                  {summaryRows && summaryRows.map((row, idx) => (
                    <tr key={`summary-${idx}`} className="summary-row">
                      <td colSpan={columns.length} style={{ textAlign: "right", paddingRight: "10px" }}>
                        {row.label}
                      </td>
                      <td className="number">{row.getValue(filteredData)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* Footer */}
              <div className="footer">
                Cikampek, {formatCurrentDate()}
              </div>

              {/* Signatures */}
              <div className="signatures">
                {signatures.map(sig => (
                  <div key={sig.role} className="signature-box">
                    <div className="label">{sig.label}</div>
                    <div className="line">{signatureData[sig.role]?.nama || ""}</div>
                    {sig.role !== "operator" ? (
                      <>
                        <div className="info">{signatureData[sig.role]?.jabatan || "(Jabatan)"}</div>
                        <div className="info">Badge: {signatureData[sig.role]?.noBadge || "___________"}</div>
                      </>
                    ) : (
                      <div className="info-label">Operator Loader</div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PrintModal;
