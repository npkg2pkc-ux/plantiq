import { useState, useEffect, useMemo } from "react";
import {
  Plus,
  Edit2,
  Trash2,
  Printer,
  Search,
  CalendarDays,
} from "lucide-react";
import {
  Button,
  Card,
  CardHeader,
  CardTitle,
  Input,
  Select,
  Modal,
  ConfirmDialog,
  Badge,
  DataTable,
  SuccessOverlay,
  ApprovalDialog,
  PrintModal,
} from "@/components/ui";
import { useAuthStore } from "@/stores";
import {
  formatDate,
  formatNumber,
  parseNumber,
  canAdd,
  canEditDirect,
  canDeleteDirect,
  needsApprovalForEdit,
  needsApprovalForDelete,
  isViewOnly,
  getCurrentDate,
} from "@/lib/utils";
import type { ProduksiBlending } from "@/types";

const initialFormState: ProduksiBlending = {
  tanggal: getCurrentDate(),
  kategori: "Fresh",
  formula: "",
  tonase: 0,
};

interface ProduksiBlendingPageProps {
  type: "blending" | "retail";
}

const ProduksiBlendingPage = ({ type }: ProduksiBlendingPageProps) => {
  const { user } = useAuthStore();
  const [data, setData] = useState<ProduksiBlending[]>([]);
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [showPrintModal, setShowPrintModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [isCustomFormula, setIsCustomFormula] = useState(false);
  const [customFormulaValue, setCustomFormulaValue] = useState("");
  const [form, setForm] = useState<ProduksiBlending>(initialFormState);
  const [searchTerm, setSearchTerm] = useState("");

  const plant = type === "blending" ? "NPK2" : "NPK1";
  const pageTitle =
    type === "blending" ? "Produksi Blending" : "Produksi Retail";

  // Approval states
  const [showApprovalDialog, setShowApprovalDialog] = useState(false);
  const [approvalAction, setApprovalAction] = useState<"edit" | "delete">(
    "edit"
  );
  const [pendingEditItem, setPendingEditItem] =
    useState<ProduksiBlending | null>(null);

  // Permission checks
  const userRole = user?.role || "";
  const userCanAdd = canAdd(userRole);
  const userCanEditDirect = canEditDirect(userRole);
  const userCanDeleteDirect = canDeleteDirect(userRole);
  const userNeedsApprovalEdit = needsApprovalForEdit(userRole);
  const userNeedsApprovalDelete = needsApprovalForDelete(userRole);
  const userIsViewOnly = isViewOnly(userRole);

  const kategoriOptions =
    type === "blending"
      ? [
          { value: "Fresh", label: "Fresh" },
          { value: "Oversack", label: "Oversack" },
        ]
      : [{ value: "Retail", label: "Retail" }];

  const formulaOptions = [
    { value: "NPK 15-15-15", label: "NPK 15-15-15" },
    { value: "NPK 16-16-16", label: "NPK 16-16-16" },
    { value: "NPK 20-10-10", label: "NPK 20-10-10" },
    { value: "NPK 12-12-17", label: "NPK 12-12-17" },
    { value: "NPK 15-15-15-4S", label: "NPK 15-15-15-4S" },
    { value: "Custom", label: "Custom" },
  ];

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const { readData, SHEETS, getSheetNameByPlant } = await import(
          "@/services/api"
        );
        const sheetName = getSheetNameByPlant(SHEETS.PRODUKSI_BLENDING, plant);
        const result = await readData<ProduksiBlending>(sheetName);
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
        console.error("Error fetching data:", error);
        setData([]);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [type, plant]);

  // Calculate current month production
  const MONTH_NAMES = [
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
  const currentMonthProduksi = useMemo(() => {
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    const thisMonthData = data.filter((item) => {
      const itemDate = new Date(item.tanggal);
      return (
        itemDate.getMonth() === currentMonth &&
        itemDate.getFullYear() === currentYear
      );
    });

    const totalFresh = thisMonthData
      .filter((i) => i.kategori === "Fresh")
      .reduce((sum, item) => sum + parseNumber(item.tonase || item.total), 0);
    const totalOversack = thisMonthData
      .filter((i) => i.kategori === "Oversack")
      .reduce((sum, item) => sum + parseNumber(item.tonase || item.total), 0);
    const total = thisMonthData.reduce(
      (sum, item) => sum + parseNumber(item.tonase || item.total),
      0
    );

    return {
      monthName: MONTH_NAMES[currentMonth],
      year: currentYear,
      totalFresh,
      totalOversack,
      total,
      entryCount: thisMonthData.length,
    };
  }, [data]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { createData, updateData, SHEETS, getSheetNameByPlant } =
        await import("@/services/api");
      const sheetName = getSheetNameByPlant(SHEETS.PRODUKSI_BLENDING, plant);

      if (editingId) {
        const updateResult = await updateData<ProduksiBlending>(sheetName, {
          ...form,
          id: editingId,
        });
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
        const createResult = await createData<ProduksiBlending>(
          sheetName,
          newData
        );
        if (createResult.success && createResult.data) {
          const newItem: ProduksiBlending = {
            ...createResult.data,
            _plant: plant,
          };
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
      console.error("Error saving data:", error);
      alert(
        error instanceof Error
          ? error.message
          : "Terjadi kesalahan saat menyimpan data"
      );
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (item: ProduksiBlending) => {
    if (userNeedsApprovalEdit) {
      setPendingEditItem(item);
      setApprovalAction("edit");
      setShowApprovalDialog(true);
      return;
    }
    setForm(item);
    setEditingId(item.id || null);
    // Check if formula is custom (not in predefined options)
    const isPredefined = formulaOptions.some(
      (opt) => opt.value === item.formula && opt.value !== "Custom"
    );
    setIsCustomFormula(!isPredefined && item.formula !== "");
    setCustomFormulaValue(
      !isPredefined && item.formula !== "" ? item.formula : ""
    );
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

  const handleApprovalSubmit = async (reason: string) => {
    if (!pendingEditItem || !user) return;

    setLoading(true);
    try {
      const API_URL =
        "https://script.google.com/macros/s/AKfycbwhf1qqyKphj6flFppZSczHJDqERKyfn6qoh-LVhfS8thGvZw085lqDGMKKHyt_uYcwEw/exec";

      const approvalData = {
        action: "create",
        sheet: "APPROVAL_REQUESTS",
        data: {
          requestedBy: user.nama,
          requestedByRole: user.role,
          requestedByPlant: user.plant,
          actionType: approvalAction,
          targetSheet:
            type === "retail" ? "PRODUKSI_BLENDING_NPK1" : "PRODUKSI_BLENDING",
          targetId: pendingEditItem.id,
          targetData: JSON.stringify(pendingEditItem),
          reason: reason,
          status: "pending",
          requestedAt: new Date().toISOString(),
        },
      };

      const response = await fetch(API_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(approvalData),
        mode: "no-cors",
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

  const confirmDelete = async () => {
    if (!deleteId) return;

    setLoading(true);
    try {
      const { deleteData, SHEETS, getSheetNameByPlant } = await import(
        "@/services/api"
      );
      const sheetName = getSheetNameByPlant(SHEETS.PRODUKSI_BLENDING, plant);

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
      console.error("Error deleting data:", error);
      alert(
        error instanceof Error
          ? error.message
          : "Terjadi kesalahan saat menghapus data"
      );
    } finally {
      setLoading(false);
    }
  };

  const openAddForm = () => {
    setForm(initialFormState);
    setEditingId(null);
    setIsCustomFormula(false);
    setCustomFormulaValue("");
    setShowForm(true);
  };

  const columns = [
    {
      key: "tanggal",
      header: "Tanggal",
      sortable: true,
      render: (value: unknown) => formatDate(value as string),
    },
    {
      key: "kategori",
      header: "Kategori",
      render: (value: unknown) => (
        <Badge
          variant={
            value === "Fresh"
              ? "success"
              : value === "Oversack"
              ? "warning"
              : "primary"
          }
        >
          {value as string}
        </Badge>
      ),
    },
    { key: "formula", header: "Formula" },
    {
      key: "tonase",
      header: "Tonase",
      render: (value: unknown) => (
        <span className="font-semibold">
          {formatNumber(parseNumber(value))} Ton
        </span>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-display font-bold text-dark-900">
              {pageTitle}
            </h1>
            <Badge variant={plant === "NPK1" ? "primary" : "success"}>
              {plant}
            </Badge>
          </div>
          <p className="text-dark-500 mt-1">
            Kelola data {pageTitle.toLowerCase()} untuk {plant}
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Button variant="secondary" size="sm" onClick={() => setShowPrintModal(true)}>
            <Printer className="h-4 w-4 mr-2" />
            Cetak
          </Button>
          {userCanAdd && (
            <Button onClick={openAddForm}>
              <Plus className="h-4 w-4 mr-2" />
              Tambah Data
            </Button>
          )}
        </div>
      </div>

      {/* Produksi Bulan Ini */}
      <div
        className={`rounded-xl p-5 text-white shadow-md ${
          type === "blending"
            ? "bg-gradient-to-r from-green-500 to-green-600"
            : "bg-gradient-to-r from-primary-500 to-primary-600"
        }`}
      >
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="flex items-center gap-3">
            <CalendarDays className="h-8 w-8" />
            <div>
              <h3 className="text-lg font-bold">
                Produksi Bulan {currentMonthProduksi.monthName}{" "}
                {currentMonthProduksi.year}
              </h3>
              <p className="text-white/80 text-sm">
                {currentMonthProduksi.entryCount} entry data
              </p>
            </div>
          </div>

          <div className="flex gap-4 md:gap-6">
            {type === "blending" && (
              <>
                <div className="bg-white/20 rounded-lg px-4 py-2 backdrop-blur-sm">
                  <p className="text-white/80 text-xs uppercase">Fresh</p>
                  <p className="text-xl font-bold">
                    {formatNumber(currentMonthProduksi.totalFresh)}{" "}
                    <span className="text-sm font-normal">Ton</span>
                  </p>
                </div>
                <div className="bg-white/20 rounded-lg px-4 py-2 backdrop-blur-sm">
                  <p className="text-white/80 text-xs uppercase">Oversack</p>
                  <p className="text-xl font-bold">
                    {formatNumber(currentMonthProduksi.totalOversack)}{" "}
                    <span className="text-sm font-normal">Ton</span>
                  </p>
                </div>
              </>
            )}
            <div className="bg-white/20 rounded-lg px-4 py-2 backdrop-blur-sm">
              <p className="text-white/80 text-xs uppercase">Total</p>
              <p className="text-xl font-bold">
                {formatNumber(currentMonthProduksi.total)}{" "}
                <span className="text-sm font-normal">Ton</span>
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="p-4">
          <p className="text-sm text-dark-500">Total Tonase</p>
          <p className="text-2xl font-bold text-primary-600">
            {formatNumber(
              data.reduce((sum, item) => sum + parseNumber(item.tonase), 0)
            )}{" "}
            Ton
          </p>
        </Card>
        <Card className="p-4">
          <p className="text-sm text-dark-500">Jumlah Formula</p>
          <p className="text-2xl font-bold text-dark-900">
            {new Set(data.map((item) => item.formula)).size}
          </p>
        </Card>
        <Card className="p-4">
          <p className="text-sm text-dark-500">Jumlah Entry</p>
          <p className="text-2xl font-bold text-dark-900">{data.length}</p>
        </Card>
      </div>

      {/* Data Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Data {pageTitle}</CardTitle>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-dark-400" />
              <Input
                type="text"
                placeholder="Cari..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9 w-64"
              />
            </div>
          </div>
        </CardHeader>
        <DataTable
          data={data.filter(
            (item) =>
              item.tanggal?.includes(searchTerm) ||
              item.formula?.toLowerCase().includes(searchTerm.toLowerCase()) ||
              item.kategori?.toLowerCase().includes(searchTerm.toLowerCase())
          )}
          columns={columns}
          loading={loading}
          searchable={false}
          actions={
            !userIsViewOnly
              ? (row) => (
                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleEdit(row);
                      }}
                    >
                      <Edit2 className="h-4 w-4 text-primary-600" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDelete(row.id!);
                      }}
                    >
                      <Trash2 className="h-4 w-4 text-red-600" />
                    </Button>
                  </div>
                )
              : undefined
          }
        />
      </Card>

      {/* Add/Edit Modal */}
      <Modal
        isOpen={showForm}
        onClose={() => {
          setShowForm(false);
          setForm(initialFormState);
          setEditingId(null);
        }}
        title={
          editingId ? `Edit Data ${pageTitle}` : `Tambah Data ${pageTitle}`
        }
        size="md"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="Tanggal"
            type="date"
            value={form.tanggal}
            onChange={(e) =>
              setForm((prev) => ({ ...prev, tanggal: e.target.value }))
            }
            required
          />

          <Select
            label="Kategori"
            value={form.kategori}
            onChange={(e) =>
              setForm((prev) => ({ ...prev, kategori: e.target.value }))
            }
            options={kategoriOptions}
            required
          />

          <Select
            label="Formula"
            value={isCustomFormula ? "Custom" : form.formula}
            onChange={(e) => {
              const val = e.target.value;
              if (val === "Custom") {
                setIsCustomFormula(true);
                setCustomFormulaValue("");
              } else {
                setIsCustomFormula(false);
                setForm((prev) => ({ ...prev, formula: val }));
              }
            }}
            options={formulaOptions}
            placeholder="Pilih formula"
            required
          />

          {isCustomFormula && (
            <Input
              label="Formula Custom"
              type="text"
              value={customFormulaValue}
              onChange={(e) => {
                setCustomFormulaValue(e.target.value);
                setForm((prev) => ({ ...prev, formula: e.target.value }));
              }}
              placeholder="Masukkan formula custom (contoh: NPK 18-18-18)"
              required
            />
          )}

          <Input
            label="Tonase (Ton)"
            type="number"
            value={form.tonase}
            onChange={(e) =>
              setForm((prev) => ({ ...prev, tonase: Number(e.target.value) }))
            }
            min="0"
            step="0.01"
            required
          />

          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button
              type="button"
              variant="secondary"
              onClick={() => {
                setShowForm(false);
                setForm(initialFormState);
                setEditingId(null);
              }}
            >
              Batal
            </Button>
            <Button type="submit" isLoading={loading}>
              {editingId ? "Update" : "Simpan"}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirmation */}
      <ConfirmDialog
        isOpen={showDeleteConfirm}
        onClose={() => {
          setShowDeleteConfirm(false);
          setDeleteId(null);
        }}
        onConfirm={confirmDelete}
        title="Hapus Data"
        message="Apakah Anda yakin ingin menghapus data ini?"
        confirmText="Hapus"
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
        actionType={approvalAction}
        isLoading={loading}
      />

      {/* Success Overlay */}
      <SuccessOverlay
        isVisible={showSuccess}
        message="Data berhasil disimpan!"
        onClose={() => setShowSuccess(false)}
      />

      {/* Print Modal */}
      <PrintModal
        isOpen={showPrintModal}
        onClose={() => setShowPrintModal(false)}
        title={pageTitle}
        plant={plant === "NPK1" ? "NPK Plant 1" : "NPK Plant 2"}
        data={data as unknown as Record<string, unknown>[]}
        columns={[
          { key: "tanggal", header: "Tanggal", render: (v) => formatDate(v as string), width: "80px" },
          { key: "kategori", header: "Kategori", width: "70px" },
          { key: "formula", header: "Formula", width: "120px" },
          { key: "tonase", header: "Tonase (Ton)", render: (v) => formatNumber(parseNumber(v)), align: "right", width: "80px" },
        ]}
        filters={type === "blending" ? {
          kategori: {
            label: "Kategori",
            options: [
              { value: "Fresh", label: "Fresh" },
              { value: "Oversack", label: "Oversack" },
            ]
          }
        } : undefined}
        signatures={[
          { role: "mengetahui", label: "Mengetahui" },
          { role: "pembuat", label: "Pembuat" },
        ]}
        summaryRows={[
          { label: "Total Tonase:", getValue: (d) => formatNumber(d.reduce((s, i) => s + parseNumber(i.tonase), 0)) + " Ton" },
        ]}
      />
    </div>
  );
};

export default ProduksiBlendingPage;
