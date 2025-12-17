import { useState, useEffect, useCallback } from "react";
import {
  Plus,
  Edit2,
  Trash2,
  Printer,
  Search,
  Save,
  Gauge,
  Zap,
  Flame,
  Users,
  FileText,
  Calendar,
} from "lucide-react";
import { useSaveShortcut } from "@/hooks";
import {
  Button,
  Card,
  Input,
  Select,
  Modal,
  ConfirmDialog,
  Badge,
  SuccessOverlay,
  ApprovalDialog,
} from "@/components/ui";
import { useAuthStore } from "@/stores";
import {
  formatDate,
  formatNumber,
  parseNumber,
  canAdd,
  needsApprovalForEdit,
  needsApprovalForDelete,
  isViewOnly,
  getCurrentDate,
} from "@/lib/utils";

// Interfaces
interface ShiftPersonel {
  sectionHead: string;
  operatorPanel: string;
}

interface ParameterValue {
  malam: string;
  pagi: string;
  sore: string;
}

// Energy input per shift (awal dan akhir)
interface ShiftEnergyInput {
  awal: string;
  akhir: string;
}

// Calculated energy values per shift
interface ShiftEnergyCalculated {
  selisih: number; // akhir - awal
  flowPerHour: number; // selisih / 8
  costRp: number; // calculated cost in Rupiah
}

interface KOPEntry {
  id?: string;
  tanggal: string;
  jenisOperasi: string;
  // Personel per shift
  shiftMalam: ShiftPersonel;
  shiftPagi: ShiftPersonel;
  shiftSore: ShiftPersonel;
  // Steam Input per shift (M3)
  steamMalam: ShiftEnergyInput;
  steamPagi: ShiftEnergyInput;
  steamSore: ShiftEnergyInput;
  // Gas Input per shift (Nm3)
  gasMalam: ShiftEnergyInput;
  gasPagi: ShiftEnergyInput;
  gasSore: ShiftEnergyInput;
  // Kurs Dollar (untuk perhitungan biaya)
  kursDollar: string;
  // Dryer Parameters (auto-filled)
  dryerTempProdukOut: ParameterValue;
  // Produk NPK Parameters
  produkN: ParameterValue;
  produkP: ParameterValue;
  produkK: ParameterValue;
  produkMoisture: ParameterValue;
  produkKekerasan: ParameterValue;
  produkTimbangan: ParameterValue; // auto-filled
  produkTonase: ParameterValue;
  // Meta
  _plant?: "NPK1" | "NPK2";
}

const emptyShiftPersonel: ShiftPersonel = {
  sectionHead: "",
  operatorPanel: "",
};
const emptyParameterValue: ParameterValue = { malam: "", pagi: "", sore: "" };
const emptyShiftEnergy: ShiftEnergyInput = { awal: "", akhir: "" };

const initialFormState: KOPEntry = {
  tanggal: getCurrentDate(),
  jenisOperasi: "NORMAL OPERASI",
  shiftMalam: { ...emptyShiftPersonel },
  shiftPagi: { ...emptyShiftPersonel },
  shiftSore: { ...emptyShiftPersonel },
  // Steam per shift
  steamMalam: { ...emptyShiftEnergy },
  steamPagi: { ...emptyShiftEnergy },
  steamSore: { ...emptyShiftEnergy },
  // Gas per shift
  gasMalam: { ...emptyShiftEnergy },
  gasPagi: { ...emptyShiftEnergy },
  gasSore: { ...emptyShiftEnergy },
  // Kurs Dollar (default)
  kursDollar: "16000",
  // Parameters
  dryerTempProdukOut: { ...emptyParameterValue },
  produkN: { ...emptyParameterValue },
  produkP: { ...emptyParameterValue },
  produkK: { ...emptyParameterValue },
  produkMoisture: { ...emptyParameterValue },
  produkKekerasan: { ...emptyParameterValue },
  produkTimbangan: { ...emptyParameterValue },
  produkTonase: { ...emptyParameterValue },
};

// Target values for reference
const TARGETS = {
  folwSteam: { min: 0.5, max: 2.5, unit: "M3/H", label: "0.5 - 2.5" },
  flowGas: { min: 200, max: 300, unit: "NM3/H", label: "200 - 300" },
  tempProdukOut: { min: 55, max: 70, unit: "°C", label: "55 - 70" },
  produkN: { min: 13.8, max: 16.2, unit: "%", label: "13.8 - 16.2" },
  produkP: { min: 13.8, max: 16.2, unit: "%", label: "13.8 - 16.2" },
  produkK: { min: 13.8, max: 16.2, unit: "%", label: "13.8 - 16.2" },
  moisture: { min: 0, max: 3, unit: "%", label: "Maks. 3" },
  kekerasan: { min: 1, max: 999, unit: "Kgf", label: "Min. 1" },
  timbangan: { min: 50.0, max: 50.3, unit: "Kg/Karung", label: "50.00 - 50.3" },
  tonase: { min: 110, max: 999, unit: "Ton/Shift", label: "Min 110 Ton/Shift" },
};

// ============================================
// FUNGSI PERHITUNGAN ENERGI
// ============================================

/**
 * Menghitung Flow Steam per shift
 * Formula: steam = akhir - awal, flowSteam (M3/H) = steam / 8 / 1000
 */
const calculateSteamFlow = (input: ShiftEnergyInput): ShiftEnergyCalculated => {
  const awal = parseNumber(input.awal || "0");
  const akhir = parseNumber(input.akhir || "0");
  const selisih = akhir - awal;
  const flowPerHour = selisih / 8 / 1000; // 8 jam per shift, dibagi 1000
  return { selisih, flowPerHour, costRp: 0 };
};

/**
 * Menghitung Flow Gas per shift
 * Formula: gas = akhir - awal, flowGas (Nm3/H) = gas / 8 / 1000
 */
const calculateGasFlow = (input: ShiftEnergyInput): ShiftEnergyCalculated => {
  const awal = parseNumber(input.awal || "0");
  const akhir = parseNumber(input.akhir || "0");
  const selisih = akhir - awal;
  const flowPerHour = selisih / 8 / 1000; // 8 jam per shift, dibagi 1000
  return { selisih, flowPerHour, costRp: 0 };
};

/**
 * Menghitung Total Biaya Steam per shift (Rp)
 * Formula: selisih / 1000 x 266263 Rp
 */
const calculateSteamCost = (selisihSteam: number): number => {
  return (selisihSteam / 1000) * 266263;
};

/**
 * Menghitung Total Biaya Gas per shift (Rp)
 * Formula:
 * BTU/h = gas x 0.02831 x 1043.3294
 * MMBTU/H = BTU/h / 1,000,000
 * $/h = MMBTU x 5.65
 * Rp/h = $/h x kurs dollar
 * Total Rp = Rp/h x 8 (jam per shift)
 */
const calculateGasCost = (selisihGas: number, kursDollar: number): number => {
  const btuPerH = selisihGas * 0.02831 * 1043.3294;
  const mmbtuPerH = btuPerH / 1000000;
  const dollarPerH = mmbtuPerH * 5.65;
  const rpPerH = dollarPerH * kursDollar;
  const totalRp = rpPerH * 8; // 8 jam per shift
  return totalRp;
};

/**
 * Generate random value dalam range tertentu (untuk auto-fill)
 */
const randomInRange = (
  min: number,
  max: number,
  decimals: number = 2
): string => {
  const value = Math.random() * (max - min) + min;
  return value.toFixed(decimals);
};

/**
 * Auto-fill Temperatur Produk Out (range 55-70)
 */
const autoFillTempProdukOut = (): ParameterValue => ({
  malam: randomInRange(55, 70, 1),
  pagi: randomInRange(55, 70, 1),
  sore: randomInRange(55, 70, 1),
});

/**
 * Auto-fill Timbangan (range 50.00-50.3)
 */
const autoFillTimbangan = (): ParameterValue => ({
  malam: randomInRange(50.0, 50.3, 2),
  pagi: randomInRange(50.0, 50.3, 2),
  sore: randomInRange(50.0, 50.3, 2),
});

interface KOPPageProps {
  plant: "NPK1" | "NPK2";
}

const KOPPage = ({ plant }: KOPPageProps) => {
  const { user } = useAuthStore();
  const [data, setData] = useState<KOPEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [showPrintPreview, setShowPrintPreview] = useState(false);
  const [printItem, setPrintItem] = useState<KOPEntry | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [form, setForm] = useState<KOPEntry>(initialFormState);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterMonth, setFilterMonth] = useState("");

  // Approval states
  const [showApprovalDialog, setShowApprovalDialog] = useState(false);
  const [approvalAction, setApprovalAction] = useState<"edit" | "delete">(
    "edit"
  );
  const [pendingEditItem, setPendingEditItem] = useState<KOPEntry | null>(null);

  // Calculated values state
  const [calculatedValues, setCalculatedValues] = useState({
    // Steam calculations per shift
    steamMalam: { selisih: 0, flowPerHour: 0, costRp: 0 },
    steamPagi: { selisih: 0, flowPerHour: 0, costRp: 0 },
    steamSore: { selisih: 0, flowPerHour: 0, costRp: 0 },
    // Gas calculations per shift
    gasMalam: { selisih: 0, flowPerHour: 0, costRp: 0 },
    gasPagi: { selisih: 0, flowPerHour: 0, costRp: 0 },
    gasSore: { selisih: 0, flowPerHour: 0, costRp: 0 },
    // Totals
    totalSteamRp: 0,
    totalGasRp: 0,
  });

  // Permission checks
  const userRole = user?.role || "";
  const userCanAdd = canAdd(userRole);
  const userNeedsApprovalEdit = needsApprovalForEdit(userRole);
  const userNeedsApprovalDelete = needsApprovalForDelete(userRole);
  const userIsViewOnly = isViewOnly(userRole);

  // Alt+S shortcut to save
  const triggerSave = useCallback(() => {
    if (showForm && !loading) {
      const formEl = document.querySelector("form");
      if (formEl) formEl.requestSubmit();
    }
  }, [showForm, loading]);
  useSaveShortcut(triggerSave, showForm);

  const jenisOperasiOptions = [
    { value: "NORMAL OPERASI", label: "NORMAL OPERASI" },
    { value: "ABNORMAL", label: "ABNORMAL" },
    { value: "SHUTDOWN", label: "SHUTDOWN" },
    { value: "START UP", label: "START UP" },
  ];

  // Auto-calculate energy values when form changes
  useEffect(() => {
    const kursDollar = parseNumber(form.kursDollar || "16000");

    // Calculate Steam for each shift
    const steamMalamCalc = calculateSteamFlow(
      form.steamMalam || emptyShiftEnergy
    );
    const steamPagiCalc = calculateSteamFlow(
      form.steamPagi || emptyShiftEnergy
    );
    const steamSoreCalc = calculateSteamFlow(
      form.steamSore || emptyShiftEnergy
    );

    // Calculate Gas for each shift
    const gasMalamCalc = calculateGasFlow(form.gasMalam || emptyShiftEnergy);
    const gasPagiCalc = calculateGasFlow(form.gasPagi || emptyShiftEnergy);
    const gasSoreCalc = calculateGasFlow(form.gasSore || emptyShiftEnergy);

    // Calculate costs
    steamMalamCalc.costRp = calculateSteamCost(steamMalamCalc.selisih);
    steamPagiCalc.costRp = calculateSteamCost(steamPagiCalc.selisih);
    steamSoreCalc.costRp = calculateSteamCost(steamSoreCalc.selisih);

    gasMalamCalc.costRp = calculateGasCost(gasMalamCalc.selisih, kursDollar);
    gasPagiCalc.costRp = calculateGasCost(gasPagiCalc.selisih, kursDollar);
    gasSoreCalc.costRp = calculateGasCost(gasSoreCalc.selisih, kursDollar);

    // Calculate totals
    const totalSteamRp =
      steamMalamCalc.costRp + steamPagiCalc.costRp + steamSoreCalc.costRp;
    const totalGasRp =
      gasMalamCalc.costRp + gasPagiCalc.costRp + gasSoreCalc.costRp;

    setCalculatedValues({
      steamMalam: steamMalamCalc,
      steamPagi: steamPagiCalc,
      steamSore: steamSoreCalc,
      gasMalam: gasMalamCalc,
      gasPagi: gasPagiCalc,
      gasSore: gasSoreCalc,
      totalSteamRp,
      totalGasRp,
    });
  }, [
    form.steamMalam,
    form.steamPagi,
    form.steamSore,
    form.gasMalam,
    form.gasPagi,
    form.gasSore,
    form.kursDollar,
  ]);

  // Auto-fill awal shift dari akhir shift sebelumnya (SELALU sync)
  // Steam: Pagi awal = Malam akhir
  useEffect(() => {
    if (form.steamMalam?.akhir) {
      setForm((prev) => ({
        ...prev,
        steamPagi: { ...prev.steamPagi, awal: prev.steamMalam?.akhir || "" },
      }));
    }
  }, [form.steamMalam?.akhir]);

  // Steam: Sore awal = Pagi akhir
  useEffect(() => {
    if (form.steamPagi?.akhir) {
      setForm((prev) => ({
        ...prev,
        steamSore: { ...prev.steamSore, awal: prev.steamPagi?.akhir || "" },
      }));
    }
  }, [form.steamPagi?.akhir]);

  // Gas: Pagi awal = Malam akhir
  useEffect(() => {
    if (form.gasMalam?.akhir) {
      setForm((prev) => ({
        ...prev,
        gasPagi: { ...prev.gasPagi, awal: prev.gasMalam?.akhir || "" },
      }));
    }
  }, [form.gasMalam?.akhir]);

  // Gas: Sore awal = Pagi akhir
  useEffect(() => {
    if (form.gasPagi?.akhir) {
      setForm((prev) => ({
        ...prev,
        gasSore: { ...prev.gasSore, awal: prev.gasPagi?.akhir || "" },
      }));
    }
  }, [form.gasPagi?.akhir]);

  // Handle auto-fill button for Temp & Timbangan
  const handleAutoFill = () => {
    setForm((prev) => ({
      ...prev,
      dryerTempProdukOut: autoFillTempProdukOut(),
      produkTimbangan: autoFillTimbangan(),
    }));
  };

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const { readData, SHEETS, getSheetNameByPlant } = await import(
          "@/services/api"
        );
        const sheetName = getSheetNameByPlant(SHEETS.KOP, plant);
        const result = await readData<KOPEntry>(sheetName);
        if (result.success && result.data) {
          const sortedData = result.data
            .map((item) => ({ ...item, _plant: plant }))
            .sort(
              (a, b) =>
                new Date(b.tanggal).getTime() - new Date(a.tanggal).getTime()
            );
          setData(sortedData);
        } else {
          setData([]);
        }
      } catch (error) {
        console.error("Error fetching KOP data:", error);
        setData([]);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [plant]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { createData, updateData, SHEETS, getSheetNameByPlant } =
        await import("@/services/api");
      const sheetName = getSheetNameByPlant(SHEETS.KOP, plant);

      if (editingId) {
        const dataToUpdate = { ...form, id: editingId, _plant: plant };
        const updateResult = await updateData<KOPEntry>(
          sheetName,
          dataToUpdate
        );
        if (updateResult.success) {
          setData((prev) =>
            prev.map((item) =>
              item.id === editingId
                ? { ...form, id: editingId, _plant: plant }
                : item
            )
          );
        } else {
          throw new Error(updateResult.error || "Gagal mengupdate data");
        }
      } else {
        const newData = { ...form, _plant: plant };
        const createResult = await createData<KOPEntry>(sheetName, newData);
        if (createResult.success && createResult.data) {
          const newItem: KOPEntry = { ...createResult.data, _plant: plant };
          setData((prev) => [newItem, ...prev]);
        } else {
          throw new Error(createResult.error || "Gagal menyimpan data");
        }
      }

      setShowForm(false);
      setForm(initialFormState);
      setEditingId(null);
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 2000);
    } catch (error) {
      console.error("Error saving KOP data:", error);
      alert(
        error instanceof Error
          ? error.message
          : "Terjadi kesalahan saat menyimpan data"
      );
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (item: KOPEntry) => {
    if (userNeedsApprovalEdit) {
      setPendingEditItem(item);
      setApprovalAction("edit");
      setShowApprovalDialog(true);
      return;
    }
    setForm(item);
    setEditingId(item.id || null);
    setShowForm(true);
  };

  const handleDelete = (id: string) => {
    if (userNeedsApprovalDelete) {
      const item = data.find((d) => d.id === id);
      if (item) {
        setPendingEditItem(item);
        setApprovalAction("delete");
        setShowApprovalDialog(true);
      }
      return;
    }
    setDeleteId(id);
    setShowDeleteConfirm(true);
  };

  const confirmDelete = async () => {
    if (!deleteId) return;
    setLoading(true);
    try {
      const { deleteData, SHEETS, getSheetNameByPlant } = await import(
        "@/services/api"
      );
      const sheetName = getSheetNameByPlant(SHEETS.KOP, plant);
      const deleteResult = await deleteData(sheetName, deleteId);
      if (deleteResult.success) {
        setData((prev) => prev.filter((item) => item.id !== deleteId));
        setShowDeleteConfirm(false);
        setDeleteId(null);
        setShowSuccess(true);
        setTimeout(() => setShowSuccess(false), 2000);
      } else {
        throw new Error(deleteResult.error || "Gagal menghapus data");
      }
    } catch (error) {
      console.error("Error deleting KOP data:", error);
      alert(
        error instanceof Error
          ? error.message
          : "Terjadi kesalahan saat menghapus data"
      );
    } finally {
      setLoading(false);
    }
  };

  const handleApprovalSubmit = async (reason: string) => {
    if (!pendingEditItem || !user) return;
    setLoading(true);
    try {
      const { createData, SHEETS } = await import("@/services/api");
      await createData(SHEETS.APPROVAL_REQUESTS, {
        requestedBy: user.nama || user.namaLengkap,
        requestedByRole: user.role,
        requestedByPlant: user.plant,
        actionType: approvalAction,
        targetSheet: "KOP",
        targetId: pendingEditItem.id,
        targetData: JSON.stringify(pendingEditItem),
        reason: reason,
        status: "pending",
        requestedAt: new Date().toISOString(),
      });
      alert("Permintaan approval telah dikirim ke AVP/Supervisor/Admin");
      setShowApprovalDialog(false);
      setPendingEditItem(null);
    } catch (error) {
      console.error("Error submitting approval:", error);
      alert("Gagal mengirim permintaan approval");
    } finally {
      setLoading(false);
    }
  };

  const openAddForm = () => {
    setForm({
      ...initialFormState,
      tanggal: getCurrentDate(),
      produkTimbangan: autoFillTimbangan(),
    });
    setEditingId(null);
    setShowForm(true);
  };

  const handlePrint = (item: KOPEntry) => {
    setPrintItem(item);
    setShowPrintPreview(true);
  };

  const executePrint = () => {
    if (!printItem) return;
    const printWindow = window.open("", "_blank");
    if (!printWindow) return;

    // Calculate values for print
    const kursDollar = parseNumber(printItem.kursDollar || "16000");

    // Steam calculations
    const steamMalamCalc = calculateSteamFlow(
      printItem.steamMalam || emptyShiftEnergy
    );
    const steamPagiCalc = calculateSteamFlow(
      printItem.steamPagi || emptyShiftEnergy
    );
    const steamSoreCalc = calculateSteamFlow(
      printItem.steamSore || emptyShiftEnergy
    );
    steamMalamCalc.costRp = calculateSteamCost(steamMalamCalc.selisih);
    steamPagiCalc.costRp = calculateSteamCost(steamPagiCalc.selisih);
    steamSoreCalc.costRp = calculateSteamCost(steamSoreCalc.selisih);

    // Gas calculations
    const gasMalamCalc = calculateGasFlow(
      printItem.gasMalam || emptyShiftEnergy
    );
    const gasPagiCalc = calculateGasFlow(printItem.gasPagi || emptyShiftEnergy);
    const gasSoreCalc = calculateGasFlow(printItem.gasSore || emptyShiftEnergy);
    gasMalamCalc.costRp = calculateGasCost(gasMalamCalc.selisih, kursDollar);
    gasPagiCalc.costRp = calculateGasCost(gasPagiCalc.selisih, kursDollar);
    gasSoreCalc.costRp = calculateGasCost(gasSoreCalc.selisih, kursDollar);

    const totalSteamRp =
      steamMalamCalc.costRp + steamPagiCalc.costRp + steamSoreCalc.costRp;
    const totalGasRp =
      gasMalamCalc.costRp + gasPagiCalc.costRp + gasSoreCalc.costRp;

    const totalTonase =
      parseNumber(printItem.produkTonase?.malam || "0") +
      parseNumber(printItem.produkTonase?.pagi || "0") +
      parseNumber(printItem.produkTonase?.sore || "0");

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>KOP - ${formatDate(printItem.tanggal)}</title>
        <style>
          @page { size: A4 landscape; margin: 10mm; }
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { font-family: Arial, sans-serif; font-size: 9pt; color: #000; }
          .container { width: 100%; }
          .header { display: flex; justify-content: space-between; margin-bottom: 10px; }
          .header-left { font-weight: bold; }
          .header-right { text-align: right; }
          .title { font-size: 11pt; font-weight: bold; margin-bottom: 3px; }
          .subtitle { font-size: 9pt; color: #333; }
          table { width: 100%; border-collapse: collapse; margin-bottom: 8px; }
          th, td { border: 1px solid #000; padding: 3px 5px; text-align: center; font-size: 8pt; }
          th { background-color: #f0f0f0; font-weight: bold; }
          .section-header { background-color: #e8e8e8; font-weight: bold; text-align: left !important; }
          .param-name { text-align: left !important; }
          .number { text-align: right !important; }
          .highlight-cyan { background-color: #E0F7FA; }
          .highlight-blue { background-color: #E3F2FD; }
          .highlight-orange { background-color: #FFF3E0; }
          .summary { margin-top: 15px; }
          @media print { body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <div class="header-left">
              <div class="title">KEY OPERATING PARAMETER (KOP)</div>
              <div class="subtitle">${printItem.jenisOperasi}</div>
              <div class="subtitle">PABRIK NPK GRANULAR ${
                plant === "NPK1" ? "1" : "2"
              }</div>
            </div>
            <div class="header-right">
              <div class="title">${formatDate(printItem.tanggal)}</div>
              <table style="width: auto; margin-left: auto;">
                <tr>
                  <th></th>
                  <th>23:00 - 07:00</th>
                  <th>07:00 - 15:00</th>
                  <th>15:00 - 23:00</th>
                </tr>
                <tr>
                  <td class="param-name"><strong>Section Head</strong></td>
                  <td class="highlight-cyan">${
                    printItem.shiftMalam?.sectionHead || ""
                  }</td>
                  <td class="highlight-cyan">${
                    printItem.shiftPagi?.sectionHead || ""
                  }</td>
                  <td class="highlight-cyan">${
                    printItem.shiftSore?.sectionHead || ""
                  }</td>
                </tr>
                <tr>
                  <td class="param-name"><strong>Operator Panel</strong></td>
                  <td class="highlight-cyan">${
                    printItem.shiftMalam?.operatorPanel || ""
                  }</td>
                  <td class="highlight-cyan">${
                    printItem.shiftPagi?.operatorPanel || ""
                  }</td>
                  <td class="highlight-cyan">${
                    printItem.shiftSore?.operatorPanel || ""
                  }</td>
                </tr>
              </table>
            </div>
          </div>

          <table>
            <thead>
              <tr>
                <th style="width: 30px;">NO</th>
                <th style="width: 150px;">PARAMETER</th>
                <th style="width: 80px;">INDIKATOR</th>
                <th style="width: 70px;">SATUAN</th>
                <th style="width: 90px;">TARGET</th>
                <th colspan="3">AKTUAL</th>
              </tr>
              <tr>
                <th></th>
                <th></th>
                <th></th>
                <th></th>
                <th></th>
                <th>MALAM</th>
                <th>PAGI</th>
                <th>SORE</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>1</td>
                <td class="section-header" colspan="7">Granulator</td>
              </tr>
              <tr>
                <td></td>
                <td class="param-name">1.1. Flow Steam</td>
                <td>FI</td>
                <td>M3/H</td>
                <td>${TARGETS.folwSteam.label}</td>
                <td class="highlight-blue"><strong>${steamMalamCalc.flowPerHour.toFixed(
                  2
                )}</strong></td>
                <td class="highlight-blue"><strong>${steamPagiCalc.flowPerHour.toFixed(
                  2
                )}</strong></td>
                <td class="highlight-blue"><strong>${steamSoreCalc.flowPerHour.toFixed(
                  2
                )}</strong></td>
              </tr>
              <tr>
                <td>2</td>
                <td class="section-header" colspan="7">Dryer</td>
              </tr>
              <tr>
                <td></td>
                <td class="param-name">2.1. Flow Gas</td>
                <td>FT-202</td>
                <td>NM3/H</td>
                <td>${TARGETS.flowGas.label}</td>
                <td class="highlight-orange"><strong>${gasMalamCalc.flowPerHour.toFixed(
                  2
                )}</strong></td>
                <td class="highlight-orange"><strong>${gasPagiCalc.flowPerHour.toFixed(
                  2
                )}</strong></td>
                <td class="highlight-orange"><strong>${gasSoreCalc.flowPerHour.toFixed(
                  2
                )}</strong></td>
              </tr>
              <tr>
                <td></td>
                <td class="param-name">2.2. Temperatur Produk Out</td>
                <td>Temp R-002</td>
                <td>Deg.C</td>
                <td>${TARGETS.tempProdukOut.label}</td>
                <td>${printItem.dryerTempProdukOut?.malam || ""}</td>
                <td>${printItem.dryerTempProdukOut?.pagi || ""}</td>
                <td>${printItem.dryerTempProdukOut?.sore || ""}</td>
              </tr>
              <tr>
                <td>3</td>
                <td class="section-header" colspan="7">Produk NPK (15-10-12)</td>
              </tr>
              <tr>
                <td></td>
                <td class="param-name">3.1. N</td>
                <td>Laporan LAB</td>
                <td>%</td>
                <td>${TARGETS.produkN.label}</td>
                <td>${printItem.produkN?.malam || ""}</td>
                <td>${printItem.produkN?.pagi || ""}</td>
                <td>${printItem.produkN?.sore || ""}</td>
              </tr>
              <tr>
                <td></td>
                <td class="param-name">3.2. P</td>
                <td>Laporan LAB</td>
                <td>%</td>
                <td>${TARGETS.produkP.label}</td>
                <td>${printItem.produkP?.malam || ""}</td>
                <td>${printItem.produkP?.pagi || ""}</td>
                <td>${printItem.produkP?.sore || ""}</td>
              </tr>
              <tr>
                <td></td>
                <td class="param-name">3.3. K</td>
                <td>Laporan LAB</td>
                <td>%</td>
                <td>${TARGETS.produkK.label}</td>
                <td>${printItem.produkK?.malam || ""}</td>
                <td>${printItem.produkK?.pagi || ""}</td>
                <td>${printItem.produkK?.sore || ""}</td>
              </tr>
              <tr>
                <td></td>
                <td class="param-name">3.4. Moisture (H2O)</td>
                <td>Laporan LAB</td>
                <td>%</td>
                <td>${TARGETS.moisture.label}</td>
                <td>${printItem.produkMoisture?.malam || ""}</td>
                <td>${printItem.produkMoisture?.pagi || ""}</td>
                <td>${printItem.produkMoisture?.sore || ""}</td>
              </tr>
              <tr>
                <td></td>
                <td class="param-name">3.5. Kekerasan</td>
                <td>Laporan LAB</td>
                <td>Kgf</td>
                <td>${TARGETS.kekerasan.label}</td>
                <td>${printItem.produkKekerasan?.malam || ""}</td>
                <td>${printItem.produkKekerasan?.pagi || ""}</td>
                <td>${printItem.produkKekerasan?.sore || ""}</td>
              </tr>
              <tr>
                <td></td>
                <td class="param-name">3.6. Timbangan</td>
                <td>Laporan Shift</td>
                <td>Kg / Karung</td>
                <td>${TARGETS.timbangan.label}</td>
                <td>${printItem.produkTimbangan?.malam || ""}</td>
                <td>${printItem.produkTimbangan?.pagi || ""}</td>
                <td>${printItem.produkTimbangan?.sore || ""}</td>
              </tr>
              <tr>
                <td></td>
                <td class="param-name">3.7. Tonase</td>
                <td>Laporan Shift</td>
                <td>Tonase / Shift</td>
                <td>${TARGETS.tonase.label}</td>
                <td><strong>${
                  printItem.produkTonase?.malam || ""
                } TON</strong></td>
                <td><strong>${
                  printItem.produkTonase?.pagi || ""
                } TON</strong></td>
                <td><strong>${
                  printItem.produkTonase?.sore || ""
                } TON</strong></td>
              </tr>
            </tbody>
          </table>

          <!-- Konsumsi Energi Detail -->
          <table style="margin-top: 15px; width: 48%; display: inline-table;">
            <tr>
              <th colspan="4" style="background-color: #E3F2FD;">KONSUMSI STEAM (M3)</th>
            </tr>
            <tr>
              <th>Shift</th>
              <th>Selisih</th>
              <th>Flow (M3/H)</th>
              <th>Biaya (Rp)</th>
            </tr>
            <tr>
              <td>Malam</td>
              <td>${formatNumber(steamMalamCalc.selisih)}</td>
              <td>${steamMalamCalc.flowPerHour.toFixed(2)}</td>
              <td class="number">${formatNumber(steamMalamCalc.costRp)}</td>
            </tr>
            <tr>
              <td>Pagi</td>
              <td>${formatNumber(steamPagiCalc.selisih)}</td>
              <td>${steamPagiCalc.flowPerHour.toFixed(2)}</td>
              <td class="number">${formatNumber(steamPagiCalc.costRp)}</td>
            </tr>
            <tr>
              <td>Sore</td>
              <td>${formatNumber(steamSoreCalc.selisih)}</td>
              <td>${steamSoreCalc.flowPerHour.toFixed(2)}</td>
              <td class="number">${formatNumber(steamSoreCalc.costRp)}</td>
            </tr>
            <tr style="background-color: #E3F2FD;">
              <td colspan="3"><strong>Total</strong></td>
              <td class="number"><strong>Rp ${formatNumber(
                totalSteamRp
              )}</strong></td>
            </tr>
          </table>

          <table style="margin-top: 15px; width: 48%; display: inline-table; margin-left: 2%;">
            <tr>
              <th colspan="4" style="background-color: #FFF3E0;">KONSUMSI GAS (Nm3)</th>
            </tr>
            <tr>
              <th>Shift</th>
              <th>Selisih</th>
              <th>Flow (Nm3/H)</th>
              <th>Biaya (Rp)</th>
            </tr>
            <tr>
              <td>Malam</td>
              <td>${formatNumber(gasMalamCalc.selisih)}</td>
              <td>${gasMalamCalc.flowPerHour.toFixed(2)}</td>
              <td class="number">${formatNumber(gasMalamCalc.costRp)}</td>
            </tr>
            <tr>
              <td>Pagi</td>
              <td>${formatNumber(gasPagiCalc.selisih)}</td>
              <td>${gasPagiCalc.flowPerHour.toFixed(2)}</td>
              <td class="number">${formatNumber(gasPagiCalc.costRp)}</td>
            </tr>
            <tr>
              <td>Sore</td>
              <td>${formatNumber(gasSoreCalc.selisih)}</td>
              <td>${gasSoreCalc.flowPerHour.toFixed(2)}</td>
              <td class="number">${formatNumber(gasSoreCalc.costRp)}</td>
            </tr>
            <tr style="background-color: #FFF3E0;">
              <td colspan="3"><strong>Total</strong></td>
              <td class="number"><strong>Rp ${formatNumber(
                totalGasRp
              )}</strong></td>
            </tr>
          </table>

          <div class="summary">
            <table style="width: auto;">
              <tr>
                <td style="border: none;"><strong>* Total Steam Dalam Satu Hari</strong></td>
                <td style="border: none;">Rp</td>
                <td style="border: none; text-align: right;"><strong>${formatNumber(
                  totalSteamRp
                )}</strong></td>
              </tr>
              <tr>
                <td style="border: none;"><strong>* Total Gas Dalam Satu Hari</strong></td>
                <td style="border: none;">Rp</td>
                <td style="border: none; text-align: right;"><strong>${formatNumber(
                  totalGasRp
                )}</strong></td>
              </tr>
              <tr>
                <td style="border: none;"><strong>* Total Tonase</strong></td>
                <td style="border: none;"></td>
                <td style="border: none; text-align: right;"><strong>${formatNumber(
                  totalTonase
                )} TON</strong></td>
              </tr>
              <tr>
                <td style="border: none; font-size: 7pt; color: #666;">Kurs Dollar: Rp ${formatNumber(
                  kursDollar
                )}</td>
                <td style="border: none;"></td>
                <td style="border: none;"></td>
              </tr>
            </table>
          </div>
        </div>
      </body>
      </html>
    `);

    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
      printWindow.print();
      printWindow.close();
    }, 250);
    setShowPrintPreview(false);
  };

  // Filtered data
  const filteredData = data.filter((item) => {
    const matchesSearch =
      item.tanggal?.includes(searchTerm) ||
      item.jenisOperasi?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesMonth = filterMonth
      ? item.tanggal?.startsWith(filterMonth)
      : true;
    return matchesSearch && matchesMonth;
  });

  // Helper component for parameter input row
  const ParameterInputRow = ({
    label,
    target,
    value,
    onChange,
    indikator,
    satuan,
  }: {
    label: string;
    target: string;
    value: ParameterValue;
    onChange: (val: ParameterValue) => void;
    indikator: string;
    satuan: string;
  }) => (
    <div className="grid grid-cols-7 gap-2 items-center py-2 border-b border-dark-100">
      <div className="col-span-2">
        <span className="text-sm font-medium text-dark-700">{label}</span>
        <p className="text-xs text-dark-400">
          {indikator} | {satuan}
        </p>
      </div>
      <div className="text-center">
        <span className="text-xs text-dark-500 bg-dark-100 px-2 py-1 rounded">
          {target}
        </span>
      </div>
      <div>
        <Input
          type="number"
          step="0.01"
          placeholder="Malam"
          value={value.malam}
          onChange={(e) => onChange({ ...value, malam: e.target.value })}
          className="text-sm"
        />
      </div>
      <div>
        <Input
          type="number"
          step="0.01"
          placeholder="Pagi"
          value={value.pagi}
          onChange={(e) => onChange({ ...value, pagi: e.target.value })}
          className="text-sm"
        />
      </div>
      <div>
        <Input
          type="number"
          step="0.01"
          placeholder="Sore"
          value={value.sore}
          onChange={(e) => onChange({ ...value, sore: e.target.value })}
          className="text-sm"
        />
      </div>
      <div></div>
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-display font-bold text-dark-900">
              Key Operating Parameter (KOP)
            </h1>
            <Badge variant={plant === "NPK1" ? "primary" : "success"}>
              {plant}
            </Badge>
          </div>
          <p className="text-dark-500 mt-1">
            Pabrik NPK Granular {plant === "NPK1" ? "1" : "2"}
          </p>
        </div>
        {!userIsViewOnly && userCanAdd && (
          <Button onClick={openAddForm} className="gap-2">
            <Plus className="h-4 w-4" />
            Tambah KOP
          </Button>
        )}
      </div>

      {/* Filters */}
      <Card className="p-4">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-dark-400" />
              <Input
                placeholder="Cari berdasarkan tanggal atau jenis operasi..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
          <div className="w-full md:w-48">
            <Input
              type="month"
              value={filterMonth}
              onChange={(e) => setFilterMonth(e.target.value)}
              placeholder="Filter Bulan"
            />
          </div>
        </div>
      </Card>

      {/* Data Table */}
      <Card>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-dark-50 border-b border-dark-100">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold text-dark-600 uppercase">
                  Tanggal
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-dark-600 uppercase">
                  Jenis Operasi
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-dark-600 uppercase">
                  Total Tonase
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-dark-600 uppercase">
                  Steam (Rp)
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-dark-600 uppercase">
                  Gas (Rp)
                </th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-dark-600 uppercase">
                  Aksi
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-dark-100">
              {loading ? (
                <tr>
                  <td
                    colSpan={6}
                    className="px-4 py-8 text-center text-dark-400"
                  >
                    <div className="flex items-center justify-center gap-2">
                      <div className="h-5 w-5 border-2 border-primary-600 border-t-transparent rounded-full animate-spin" />
                      Memuat data...
                    </div>
                  </td>
                </tr>
              ) : filteredData.length === 0 ? (
                <tr>
                  <td
                    colSpan={6}
                    className="px-4 py-8 text-center text-dark-400"
                  >
                    <FileText className="h-12 w-12 mx-auto mb-2 opacity-50" />
                    Tidak ada data KOP
                  </td>
                </tr>
              ) : (
                filteredData.map((item) => {
                  const totalTonase =
                    parseNumber(item.produkTonase?.malam || "0") +
                    parseNumber(item.produkTonase?.pagi || "0") +
                    parseNumber(item.produkTonase?.sore || "0");

                  // Calculate Steam & Gas costs for display
                  const kursDollar = parseNumber(item.kursDollar || "16000");
                  const steamMalamCalc = calculateSteamFlow(
                    item.steamMalam || emptyShiftEnergy
                  );
                  const steamPagiCalc = calculateSteamFlow(
                    item.steamPagi || emptyShiftEnergy
                  );
                  const steamSoreCalc = calculateSteamFlow(
                    item.steamSore || emptyShiftEnergy
                  );
                  const gasMalamCalc = calculateGasFlow(
                    item.gasMalam || emptyShiftEnergy
                  );
                  const gasPagiCalc = calculateGasFlow(
                    item.gasPagi || emptyShiftEnergy
                  );
                  const gasSoreCalc = calculateGasFlow(
                    item.gasSore || emptyShiftEnergy
                  );

                  const totalSteamRp =
                    calculateSteamCost(steamMalamCalc.selisih) +
                    calculateSteamCost(steamPagiCalc.selisih) +
                    calculateSteamCost(steamSoreCalc.selisih);
                  const totalGasRp =
                    calculateGasCost(gasMalamCalc.selisih, kursDollar) +
                    calculateGasCost(gasPagiCalc.selisih, kursDollar) +
                    calculateGasCost(gasSoreCalc.selisih, kursDollar);

                  return (
                    <tr
                      key={item.id}
                      className="hover:bg-dark-50 transition-colors"
                    >
                      <td className="px-4 py-3">
                        <span className="font-medium text-dark-900">
                          {formatDate(item.tanggal)}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <Badge
                          variant={
                            item.jenisOperasi === "NORMAL OPERASI"
                              ? "success"
                              : "warning"
                          }
                        >
                          {item.jenisOperasi}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 font-semibold text-primary-600">
                        {formatNumber(totalTonase)} TON
                      </td>
                      <td className="px-4 py-3 text-blue-700">
                        Rp {formatNumber(totalSteamRp)}
                      </td>
                      <td className="px-4 py-3 text-orange-700">
                        Rp {formatNumber(totalGasRp)}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            onClick={() => handlePrint(item)}
                            className="p-2 text-dark-400 hover:text-primary-600 hover:bg-primary-50 rounded-lg transition-colors"
                            title="Print"
                          >
                            <Printer className="h-4 w-4" />
                          </button>
                          {!userIsViewOnly && (
                            <>
                              <button
                                onClick={() => handleEdit(item)}
                                className="p-2 text-dark-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                title="Edit"
                              >
                                <Edit2 className="h-4 w-4" />
                              </button>
                              <button
                                onClick={() => handleDelete(item.id!)}
                                className="p-2 text-dark-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                title="Hapus"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Form Modal */}
      <Modal
        isOpen={showForm}
        onClose={() => setShowForm(false)}
        title={editingId ? "Edit KOP" : "Tambah KOP Baru"}
        size="full"
      >
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Basic Info */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="Tanggal"
              type="date"
              value={form.tanggal}
              onChange={(e) => setForm({ ...form, tanggal: e.target.value })}
              required
            />
            <Select
              label="Jenis Operasi"
              value={form.jenisOperasi}
              onChange={(e) =>
                setForm({ ...form, jenisOperasi: e.target.value })
              }
              options={jenisOperasiOptions}
            />
          </div>

          {/* Personel per Shift */}
          <Card className="p-4">
            <div className="flex items-center gap-2 mb-4">
              <Users className="h-5 w-5 text-primary-600" />
              <h3 className="text-lg font-semibold text-dark-900">
                Personel Shift
              </h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Shift Malam */}
              <div className="p-4 bg-dark-50 rounded-xl">
                <h4 className="font-medium text-dark-700 mb-3 flex items-center gap-2">
                  <Calendar className="h-4 w-4" /> Malam (23:00 - 07:00)
                </h4>
                <div className="space-y-3">
                  <Input
                    label="Section Head"
                    value={form.shiftMalam?.sectionHead || ""}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        shiftMalam: {
                          ...form.shiftMalam,
                          sectionHead: e.target.value,
                        },
                      })
                    }
                    placeholder="Nama Section Head"
                  />
                  <Input
                    label="Operator Panel"
                    value={form.shiftMalam?.operatorPanel || ""}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        shiftMalam: {
                          ...form.shiftMalam,
                          operatorPanel: e.target.value,
                        },
                      })
                    }
                    placeholder="Nama Operator Panel"
                  />
                </div>
              </div>

              {/* Shift Pagi */}
              <div className="p-4 bg-amber-50 rounded-xl">
                <h4 className="font-medium text-dark-700 mb-3 flex items-center gap-2">
                  <Calendar className="h-4 w-4" /> Pagi (07:00 - 15:00)
                </h4>
                <div className="space-y-3">
                  <Input
                    label="Section Head"
                    value={form.shiftPagi?.sectionHead || ""}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        shiftPagi: {
                          ...form.shiftPagi,
                          sectionHead: e.target.value,
                        },
                      })
                    }
                    placeholder="Nama Section Head"
                  />
                  <Input
                    label="Operator Panel"
                    value={form.shiftPagi?.operatorPanel || ""}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        shiftPagi: {
                          ...form.shiftPagi,
                          operatorPanel: e.target.value,
                        },
                      })
                    }
                    placeholder="Nama Operator Panel"
                  />
                </div>
              </div>

              {/* Shift Sore */}
              <div className="p-4 bg-orange-50 rounded-xl">
                <h4 className="font-medium text-dark-700 mb-3 flex items-center gap-2">
                  <Calendar className="h-4 w-4" /> Sore (15:00 - 23:00)
                </h4>
                <div className="space-y-3">
                  <Input
                    label="Section Head"
                    value={form.shiftSore?.sectionHead || ""}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        shiftSore: {
                          ...form.shiftSore,
                          sectionHead: e.target.value,
                        },
                      })
                    }
                    placeholder="Nama Section Head"
                  />
                  <Input
                    label="Operator Panel"
                    value={form.shiftSore?.operatorPanel || ""}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        shiftSore: {
                          ...form.shiftSore,
                          operatorPanel: e.target.value,
                        },
                      })
                    }
                    placeholder="Nama Operator Panel"
                  />
                </div>
              </div>
            </div>
          </Card>

          {/* Konsumsi Energi - Steam */}
          <Card className="p-4">
            <div className="flex items-center gap-2 mb-4">
              <Zap className="h-5 w-5 text-blue-600" />
              <h3 className="text-lg font-semibold text-dark-900">
                Konsumsi Steam (M3)
              </h3>
            </div>

            {/* Kurs Dollar */}
            <div className="mb-4 p-3 bg-amber-50 rounded-lg">
              <Input
                label="Kurs Dollar (Rp)"
                type="number"
                value={form.kursDollar}
                onChange={(e) =>
                  setForm({ ...form, kursDollar: e.target.value })
                }
                placeholder="Contoh: 16000"
              />
              <p className="text-xs text-amber-600 mt-1">
                * Kurs digunakan untuk perhitungan biaya Steam & Gas
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Steam Malam */}
              <div className="p-4 bg-slate-100 rounded-xl">
                <h4 className="font-medium text-dark-700 mb-3">
                  Shift Malam (23:00 - 07:00)
                </h4>
                <div className="space-y-3">
                  <Input
                    label="Awal Shift (M3)"
                    type="number"
                    step="0.01"
                    value={form.steamMalam?.awal || ""}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        steamMalam: {
                          ...form.steamMalam,
                          awal: e.target.value,
                        },
                      })
                    }
                  />
                  <Input
                    label="Akhir Shift (M3)"
                    type="number"
                    step="0.01"
                    value={form.steamMalam?.akhir || ""}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        steamMalam: {
                          ...form.steamMalam,
                          akhir: e.target.value,
                        },
                      })
                    }
                  />
                  <div className="p-2 bg-white rounded text-sm">
                    <div className="flex justify-between">
                      <span>Selisih:</span>
                      <span className="font-semibold">
                        {formatNumber(calculatedValues.steamMalam.selisih)} M3
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>Flow (M3/H):</span>
                      <span className="font-semibold text-blue-600">
                        {calculatedValues.steamMalam.flowPerHour.toFixed(2)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>Biaya:</span>
                      <span className="font-semibold text-green-600">
                        Rp {formatNumber(calculatedValues.steamMalam.costRp)}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Steam Pagi */}
              <div className="p-4 bg-amber-100 rounded-xl">
                <h4 className="font-medium text-dark-700 mb-3">
                  Shift Pagi (07:00 - 15:00)
                </h4>
                <div className="space-y-3">
                  <Input
                    label="Awal Shift (M3)"
                    type="number"
                    step="0.01"
                    value={form.steamPagi?.awal || ""}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        steamPagi: { ...form.steamPagi, awal: e.target.value },
                      })
                    }
                    placeholder="Auto dari akhir malam"
                  />
                  <Input
                    label="Akhir Shift (M3)"
                    type="number"
                    step="0.01"
                    value={form.steamPagi?.akhir || ""}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        steamPagi: { ...form.steamPagi, akhir: e.target.value },
                      })
                    }
                  />
                  <div className="p-2 bg-white rounded text-sm">
                    <div className="flex justify-between">
                      <span>Selisih:</span>
                      <span className="font-semibold">
                        {formatNumber(calculatedValues.steamPagi.selisih)} M3
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>Flow (M3/H):</span>
                      <span className="font-semibold text-blue-600">
                        {calculatedValues.steamPagi.flowPerHour.toFixed(2)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>Biaya:</span>
                      <span className="font-semibold text-green-600">
                        Rp {formatNumber(calculatedValues.steamPagi.costRp)}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Steam Sore */}
              <div className="p-4 bg-orange-100 rounded-xl">
                <h4 className="font-medium text-dark-700 mb-3">
                  Shift Sore (15:00 - 23:00)
                </h4>
                <div className="space-y-3">
                  <Input
                    label="Awal Shift (M3)"
                    type="number"
                    step="0.01"
                    value={form.steamSore?.awal || ""}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        steamSore: { ...form.steamSore, awal: e.target.value },
                      })
                    }
                    placeholder="Auto dari akhir pagi"
                  />
                  <Input
                    label="Akhir Shift (M3)"
                    type="number"
                    step="0.01"
                    value={form.steamSore?.akhir || ""}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        steamSore: { ...form.steamSore, akhir: e.target.value },
                      })
                    }
                  />
                  <div className="p-2 bg-white rounded text-sm">
                    <div className="flex justify-between">
                      <span>Selisih:</span>
                      <span className="font-semibold">
                        {formatNumber(calculatedValues.steamSore.selisih)} M3
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>Flow (M3/H):</span>
                      <span className="font-semibold text-blue-600">
                        {calculatedValues.steamSore.flowPerHour.toFixed(2)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>Biaya:</span>
                      <span className="font-semibold text-green-600">
                        Rp {formatNumber(calculatedValues.steamSore.costRp)}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Total Steam */}
            <div className="mt-4 p-4 bg-blue-100 rounded-xl">
              <div className="flex justify-between items-center">
                <span className="font-semibold text-blue-800">
                  Total Steam Dalam Satu Hari
                </span>
                <span className="text-xl font-bold text-blue-900">
                  Rp {formatNumber(calculatedValues.totalSteamRp)}
                </span>
              </div>
            </div>
          </Card>

          {/* Konsumsi Energi - Gas */}
          <Card className="p-4">
            <div className="flex items-center gap-2 mb-4">
              <Flame className="h-5 w-5 text-orange-600" />
              <h3 className="text-lg font-semibold text-dark-900">
                Konsumsi Gas (Nm3)
              </h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Gas Malam */}
              <div className="p-4 bg-slate-100 rounded-xl">
                <h4 className="font-medium text-dark-700 mb-3">
                  Shift Malam (23:00 - 07:00)
                </h4>
                <div className="space-y-3">
                  <Input
                    label="Awal Shift (Nm3)"
                    type="number"
                    step="0.01"
                    value={form.gasMalam?.awal || ""}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        gasMalam: { ...form.gasMalam, awal: e.target.value },
                      })
                    }
                  />
                  <Input
                    label="Akhir Shift (Nm3)"
                    type="number"
                    step="0.01"
                    value={form.gasMalam?.akhir || ""}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        gasMalam: { ...form.gasMalam, akhir: e.target.value },
                      })
                    }
                  />
                  <div className="p-2 bg-white rounded text-sm">
                    <div className="flex justify-between">
                      <span>Selisih:</span>
                      <span className="font-semibold">
                        {formatNumber(calculatedValues.gasMalam.selisih)} Nm3
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>Flow (Nm3/H):</span>
                      <span className="font-semibold text-orange-600">
                        {calculatedValues.gasMalam.flowPerHour.toFixed(2)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>Biaya:</span>
                      <span className="font-semibold text-green-600">
                        Rp {formatNumber(calculatedValues.gasMalam.costRp)}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Gas Pagi */}
              <div className="p-4 bg-amber-100 rounded-xl">
                <h4 className="font-medium text-dark-700 mb-3">
                  Shift Pagi (07:00 - 15:00)
                </h4>
                <div className="space-y-3">
                  <Input
                    label="Awal Shift (Nm3)"
                    type="number"
                    step="0.01"
                    value={form.gasPagi?.awal || ""}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        gasPagi: { ...form.gasPagi, awal: e.target.value },
                      })
                    }
                    placeholder="Auto dari akhir malam"
                  />
                  <Input
                    label="Akhir Shift (Nm3)"
                    type="number"
                    step="0.01"
                    value={form.gasPagi?.akhir || ""}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        gasPagi: { ...form.gasPagi, akhir: e.target.value },
                      })
                    }
                  />
                  <div className="p-2 bg-white rounded text-sm">
                    <div className="flex justify-between">
                      <span>Selisih:</span>
                      <span className="font-semibold">
                        {formatNumber(calculatedValues.gasPagi.selisih)} Nm3
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>Flow (Nm3/H):</span>
                      <span className="font-semibold text-orange-600">
                        {calculatedValues.gasPagi.flowPerHour.toFixed(2)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>Biaya:</span>
                      <span className="font-semibold text-green-600">
                        Rp {formatNumber(calculatedValues.gasPagi.costRp)}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Gas Sore */}
              <div className="p-4 bg-orange-100 rounded-xl">
                <h4 className="font-medium text-dark-700 mb-3">
                  Shift Sore (15:00 - 23:00)
                </h4>
                <div className="space-y-3">
                  <Input
                    label="Awal Shift (Nm3)"
                    type="number"
                    step="0.01"
                    value={form.gasSore?.awal || ""}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        gasSore: { ...form.gasSore, awal: e.target.value },
                      })
                    }
                    placeholder="Auto dari akhir pagi"
                  />
                  <Input
                    label="Akhir Shift (Nm3)"
                    type="number"
                    step="0.01"
                    value={form.gasSore?.akhir || ""}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        gasSore: { ...form.gasSore, akhir: e.target.value },
                      })
                    }
                  />
                  <div className="p-2 bg-white rounded text-sm">
                    <div className="flex justify-between">
                      <span>Selisih:</span>
                      <span className="font-semibold">
                        {formatNumber(calculatedValues.gasSore.selisih)} Nm3
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>Flow (Nm3/H):</span>
                      <span className="font-semibold text-orange-600">
                        {calculatedValues.gasSore.flowPerHour.toFixed(2)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>Biaya:</span>
                      <span className="font-semibold text-green-600">
                        Rp {formatNumber(calculatedValues.gasSore.costRp)}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Total Gas */}
            <div className="mt-4 p-4 bg-orange-100 rounded-xl">
              <div className="flex justify-between items-center">
                <span className="font-semibold text-orange-800">
                  Total Gas Dalam Satu Hari
                </span>
                <span className="text-xl font-bold text-orange-900">
                  Rp {formatNumber(calculatedValues.totalGasRp)}
                </span>
              </div>
              <p className="text-xs text-orange-600 mt-1">
                * Rumus: BTU/h = gas × 0.02831 × 1043.3294, MMBTU =
                BTU/1,000,000, $/h = MMBTU × 5.65, Rp = $ × kurs × 8 jam
              </p>
            </div>
          </Card>

          {/* Parameter Operasi */}
          <Card className="p-4">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Gauge className="h-5 w-5 text-primary-600" />
                <h3 className="text-lg font-semibold text-dark-900">
                  Parameter Operasi
                </h3>
              </div>
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={handleAutoFill}
              >
                Auto-Fill Temp & Timbangan
              </Button>
            </div>

            {/* Header */}
            <div className="grid grid-cols-7 gap-2 py-2 bg-dark-100 rounded-lg mb-2 px-2">
              <div className="col-span-2 text-xs font-semibold text-dark-600">
                PARAMETER
              </div>
              <div className="text-xs font-semibold text-dark-600 text-center">
                TARGET
              </div>
              <div className="text-xs font-semibold text-dark-600 text-center">
                MALAM
              </div>
              <div className="text-xs font-semibold text-dark-600 text-center">
                PAGI
              </div>
              <div className="text-xs font-semibold text-dark-600 text-center">
                SORE
              </div>
              <div></div>
            </div>

            {/* Granulator Section - Flow Steam dari perhitungan */}
            <div className="mb-4">
              <div className="bg-primary-50 text-primary-700 font-semibold px-3 py-2 rounded-lg mb-2">
                1. Granulator
              </div>
              <div className="grid grid-cols-7 gap-2 items-center py-2 border-b border-dark-100">
                <div className="col-span-2">
                  <span className="text-sm font-medium text-dark-700">
                    1.1. Flow Steam
                  </span>
                  <p className="text-xs text-dark-400">FI | M3/H</p>
                </div>
                <div className="text-center">
                  <span className="text-xs text-dark-500 bg-dark-100 px-2 py-1 rounded">
                    {TARGETS.folwSteam.label}
                  </span>
                </div>
                <div className="text-center font-semibold text-blue-600">
                  {calculatedValues.steamMalam.flowPerHour.toFixed(2)}
                </div>
                <div className="text-center font-semibold text-blue-600">
                  {calculatedValues.steamPagi.flowPerHour.toFixed(2)}
                </div>
                <div className="text-center font-semibold text-blue-600">
                  {calculatedValues.steamSore.flowPerHour.toFixed(2)}
                </div>
                <div className="text-xs text-dark-400 text-center">Auto</div>
              </div>
            </div>

            {/* Dryer Section - Flow Gas dari perhitungan */}
            <div className="mb-4">
              <div className="bg-secondary-50 text-secondary-700 font-semibold px-3 py-2 rounded-lg mb-2">
                2. Dryer
              </div>
              <div className="grid grid-cols-7 gap-2 items-center py-2 border-b border-dark-100">
                <div className="col-span-2">
                  <span className="text-sm font-medium text-dark-700">
                    2.1. Flow Gas
                  </span>
                  <p className="text-xs text-dark-400">FT-202 | NM3/H</p>
                </div>
                <div className="text-center">
                  <span className="text-xs text-dark-500 bg-dark-100 px-2 py-1 rounded">
                    {TARGETS.flowGas.label}
                  </span>
                </div>
                <div className="text-center font-semibold text-orange-600">
                  {calculatedValues.gasMalam.flowPerHour.toFixed(2)}
                </div>
                <div className="text-center font-semibold text-orange-600">
                  {calculatedValues.gasPagi.flowPerHour.toFixed(2)}
                </div>
                <div className="text-center font-semibold text-orange-600">
                  {calculatedValues.gasSore.flowPerHour.toFixed(2)}
                </div>
                <div className="text-xs text-dark-400 text-center">Auto</div>
              </div>
              <ParameterInputRow
                label="2.2. Temperatur Produk Out"
                indikator="Temp R-002"
                satuan="Deg.C"
                target={TARGETS.tempProdukOut.label}
                value={form.dryerTempProdukOut || emptyParameterValue}
                onChange={(val) =>
                  setForm({ ...form, dryerTempProdukOut: val })
                }
              />
            </div>

            {/* Produk NPK Section */}
            <div className="mb-4">
              <div className="bg-amber-50 text-amber-700 font-semibold px-3 py-2 rounded-lg mb-2">
                3. Produk NPK (15-10-12)
              </div>
              <ParameterInputRow
                label="3.1. N"
                indikator="Laporan LAB"
                satuan="%"
                target={TARGETS.produkN.label}
                value={form.produkN || emptyParameterValue}
                onChange={(val) => setForm({ ...form, produkN: val })}
              />
              <ParameterInputRow
                label="3.2. P"
                indikator="Laporan LAB"
                satuan="%"
                target={TARGETS.produkP.label}
                value={form.produkP || emptyParameterValue}
                onChange={(val) => setForm({ ...form, produkP: val })}
              />
              <ParameterInputRow
                label="3.3. K"
                indikator="Laporan LAB"
                satuan="%"
                target={TARGETS.produkK.label}
                value={form.produkK || emptyParameterValue}
                onChange={(val) => setForm({ ...form, produkK: val })}
              />
              <ParameterInputRow
                label="3.4. Moisture (H2O)"
                indikator="Laporan LAB"
                satuan="%"
                target={TARGETS.moisture.label}
                value={form.produkMoisture || emptyParameterValue}
                onChange={(val) => setForm({ ...form, produkMoisture: val })}
              />
              <ParameterInputRow
                label="3.5. Kekerasan"
                indikator="Laporan LAB"
                satuan="Kgf"
                target={TARGETS.kekerasan.label}
                value={form.produkKekerasan || emptyParameterValue}
                onChange={(val) => setForm({ ...form, produkKekerasan: val })}
              />
              <ParameterInputRow
                label="3.6. Timbangan"
                indikator="Laporan Shift"
                satuan="Kg/Karung"
                target={TARGETS.timbangan.label}
                value={form.produkTimbangan || emptyParameterValue}
                onChange={(val) => setForm({ ...form, produkTimbangan: val })}
              />
              <ParameterInputRow
                label="3.7. Tonase"
                indikator="Laporan Shift"
                satuan="Ton/Shift"
                target={TARGETS.tonase.label}
                value={form.produkTonase || emptyParameterValue}
                onChange={(val) => setForm({ ...form, produkTonase: val })}
              />
            </div>
          </Card>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-4 border-t border-dark-100">
            <Button
              type="button"
              variant="secondary"
              onClick={() => setShowForm(false)}
            >
              Batal
            </Button>
            <Button type="submit" disabled={loading} className="gap-2">
              <Save className="h-4 w-4" />
              {loading ? "Menyimpan..." : editingId ? "Perbarui" : "Simpan"}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Print Preview Modal */}
      <Modal
        isOpen={showPrintPreview}
        onClose={() => setShowPrintPreview(false)}
        title="Preview Print KOP"
        size="lg"
      >
        <div className="space-y-4">
          <p className="text-dark-600">
            Anda akan mencetak KOP untuk tanggal{" "}
            <strong>{printItem && formatDate(printItem.tanggal)}</strong>
          </p>
          <div className="flex justify-end gap-3">
            <Button
              variant="secondary"
              onClick={() => setShowPrintPreview(false)}
            >
              Batal
            </Button>
            <Button onClick={executePrint} className="gap-2">
              <Printer className="h-4 w-4" />
              Cetak Sekarang
            </Button>
          </div>
        </div>
      </Modal>

      {/* Delete Confirmation */}
      <ConfirmDialog
        isOpen={showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(false)}
        onConfirm={confirmDelete}
        title="Hapus Data KOP"
        message="Apakah Anda yakin ingin menghapus data KOP ini? Tindakan ini tidak dapat dibatalkan."
        variant="danger"
        isLoading={loading}
      />

      {/* Approval Dialog */}
      <ApprovalDialog
        isOpen={showApprovalDialog}
        onClose={() => {
          setShowApprovalDialog(false);
          setPendingEditItem(null);
        }}
        onSubmit={handleApprovalSubmit}
        action={approvalAction}
        itemName="data KOP"
        loading={loading}
      />

      {/* Success Overlay */}
      <SuccessOverlay
        isVisible={showSuccess}
        message="Data berhasil disimpan!"
      />
    </div>
  );
};

export default KOPPage;
