import { useState, useEffect, useCallback, useMemo } from "react";
import {
  Plus,
  Edit2,
  Trash2,
  Fuel,
  TrendingUp,
  TrendingDown,
  BarChart3,
  Printer,
} from "lucide-react";
import { useSaveShortcut } from "@/hooks";
import {
  Button,
  Card,
  CardHeader,
  CardTitle,
  Input,
  Modal,
  ConfirmDialog,
  DataTable,
  SuccessOverlay,
  ApprovalDialog,
  Select,
  BBMPrintModal,
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
import type { RekapBBM, PlantType } from "@/types";

const MONTH_OPTIONS = [
  { value: "all", label: "Semua Bulan" },
  { value: "0", label: "Januari" },
  { value: "1", label: "Februari" },
  { value: "2", label: "Maret" },
  { value: "3", label: "April" },
  { value: "4", label: "Mei" },
  { value: "5", label: "Juni" },
  { value: "6", label: "Juli" },
  { value: "7", label: "Agustus" },
  { value: "8", label: "September" },
  { value: "9", label: "Oktober" },
  { value: "10", label: "November" },
  { value: "11", label: "Desember" },
];

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

const initialFormState: RekapBBM = {
  tanggal: getCurrentDate(),
  namaAlatBerat: "",
  pengajuanSolar: 0,
  realisasiPengisian: 0,
  keterangan: "",
};

interface RekapBBMPageProps {
  plant: PlantType;
}

const RekapBBMPage = ({ plant }: RekapBBMPageProps) => {
  const { user } = useAuthStore();
  const [data, setData] = useState<RekapBBM[]>([]);
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [form, setForm] = useState<RekapBBM>(initialFormState);
  const [selectedMonth, setSelectedMonth] = useState<string>("all");
  const [showPrintModal, setShowPrintModal] = useState(false);
  const currentPlant = plant;

  // Approval states
  const [showApprovalDialog, setShowApprovalDialog] = useState(false);
  const [approvalAction, setApprovalAction] = useState<"edit" | "delete">(
    "edit"
  );
  const [pendingEditItem, setPendingEditItem] = useState<RekapBBM | null>(null);

  // Check if user is view only
  const userIsViewOnly = isViewOnly(user?.role || "");
  const userCanAdd = canAdd(user?.role || "") && !userIsViewOnly;

  // Alt+S shortcut to save
  const triggerSave = useCallback(() => {
    if (showForm && !loading) {
      const formEl = document.querySelector("form");
      if (formEl) formEl.requestSubmit();
    }
  }, [showForm, loading]);
  useSaveShortcut(triggerSave, showForm);

  const userCanEditDirect = canEditDirect(user?.role || "");
  const userCanDeleteDirect = canDeleteDirect(user?.role || "");
  const userNeedsApprovalEdit = needsApprovalForEdit(user?.role || "");
  const userNeedsApprovalDelete = needsApprovalForDelete(user?.role || "");

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const { fetchDataByPlant, SHEETS } = await import("@/services/api");
        const result = await fetchDataByPlant<RekapBBM>(SHEETS.REKAP_BBM);
        if (result.success && result.data) {
          const sortedData = [...result.data].sort(
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
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { saveDataByPlant, updateDataByPlant, SHEETS } = await import(
        "@/services/api"
      );

      if (editingId) {
        const dataToUpdate = { ...form, id: editingId, _plant: currentPlant };
        const updateResult = await updateDataByPlant<RekapBBM>(
          SHEETS.REKAP_BBM,
          dataToUpdate
        );
        if (updateResult.success) {
          setData((prev) =>
            prev.map((item) =>
              item.id === editingId ? { ...dataToUpdate } : item
            )
          );
        }
      } else {
        const dataToSave = { ...form, _plant: currentPlant };
        const saveResult = await saveDataByPlant<RekapBBM>(
          SHEETS.REKAP_BBM,
          dataToSave
        );
        if (saveResult.success && saveResult.data) {
          setData((prev) => [saveResult.data as RekapBBM, ...prev]);
        }
      }

      setShowSuccess(true);
      setShowForm(false);
      setEditingId(null);
      setForm(initialFormState);
    } catch (error) {
      console.error("Error saving data:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (item: RekapBBM) => {
    if (userIsViewOnly) return;

    if (userCanEditDirect) {
      setForm(item);
      setEditingId(item.id || null);
      setShowForm(true);
    } else if (userNeedsApprovalEdit) {
      setPendingEditItem(item);
      setApprovalAction("edit");
      setShowApprovalDialog(true);
    }
  };

  const handleDelete = (id: string) => {
    if (userIsViewOnly) return;

    if (userCanDeleteDirect) {
      setDeleteId(id);
      setShowDeleteConfirm(true);
    } else if (userNeedsApprovalDelete) {
      const item = data.find((d) => d.id === id);
      if (item) {
        setPendingEditItem(item);
        setApprovalAction("delete");
        setShowApprovalDialog(true);
      }
    }
  };

  const confirmDelete = async () => {
    if (!deleteId) return;
    setLoading(true);

    try {
      const { deleteDataByPlant, SHEETS } = await import("@/services/api");
      const itemToDelete = data.find((d) => d.id === deleteId);
      const result = await deleteDataByPlant(SHEETS.REKAP_BBM, {
        id: deleteId,
        _plant: itemToDelete?._plant,
      });

      if (result.success) {
        setData((prev) => prev.filter((item) => item.id !== deleteId));
        setShowSuccess(true);
      }
    } catch (error) {
      console.error("Error deleting data:", error);
    } finally {
      setLoading(false);
      setShowDeleteConfirm(false);
      setDeleteId(null);
    }
  };

  const handleApprovalSubmit = async (reason: string) => {
    if (!pendingEditItem) return;
    setLoading(true);

    try {
      const { createData, SHEETS } = await import("@/services/api");
      const approvalRequest = {
        type: approvalAction,
        dataType: "rekap_bbm",
        dataId: pendingEditItem.id,
        plant: currentPlant,
        requestBy: user?.username,
        requestByName: user?.namaLengkap || user?.nama,
        reason,
        data: JSON.stringify(pendingEditItem),
        status: "pending",
        createdAt: new Date().toISOString(),
      };

      await createData(SHEETS.APPROVAL_REQUESTS, approvalRequest);
      setShowSuccess(true);
    } catch (error) {
      console.error("Error creating approval request:", error);
    } finally {
      setLoading(false);
      setShowApprovalDialog(false);
      setPendingEditItem(null);
    }
  };

  const filteredData = useMemo(() => {
    return data.filter((item) => {
      if (item._plant !== currentPlant) return false;
      if (selectedMonth !== "all") {
        const month = new Date(item.tanggal).getMonth();
        if (month !== parseInt(selectedMonth)) return false;
      }
      return true;
    });
  }, [data, currentPlant, selectedMonth]);

  // Summary statistics
  const summaryStats = useMemo(() => {
    const totalPengajuan = filteredData.reduce(
      (sum, item) => sum + (item.pengajuanSolar || 0),
      0
    );
    const totalRealisasi = filteredData.reduce(
      (sum, item) => sum + (item.realisasiPengisian || 0),
      0
    );
    const totalSelisih = totalRealisasi - totalPengajuan;
    const totalRecord = filteredData.length;

    return {
      totalPengajuan,
      totalRealisasi,
      totalSelisih,
      totalRecord,
    };
  }, [filteredData]);

  const columns = [
    {
      key: "tanggal",
      header: "Tanggal",
      render: (_value: unknown, row: RekapBBM) => formatDate(row.tanggal),
      sortable: true,
    },
    {
      key: "namaAlatBerat",
      header: "Nama Alat Berat",
      sortable: true,
    },
    {
      key: "pengajuanSolar",
      header: "Pengajuan Solar (L)",
      render: (_value: unknown, row: RekapBBM) =>
        formatNumber(row.pengajuanSolar),
      sortable: true,
    },
    {
      key: "realisasiPengisian",
      header: "Realisasi Pengisian (L)",
      render: (_value: unknown, row: RekapBBM) =>
        formatNumber(row.realisasiPengisian),
      sortable: true,
    },
    {
      key: "selisih",
      header: "Selisih (L)",
      render: (_value: unknown, row: RekapBBM) => {
        const selisih = row.realisasiPengisian - row.pengajuanSolar;
        const color = selisih >= 0 ? "text-green-600" : "text-red-600";
        return <span className={color}>{formatNumber(selisih)}</span>;
      },
      sortable: false,
    },
    {
      key: "keterangan",
      header: "Keterangan",
      render: (_value: unknown, row: RekapBBM) => row.keterangan || "-",
    },
  ];

  const renderActions = (row: RekapBBM) => {
    if (userIsViewOnly) return null;

    return (
      <div className="flex items-center gap-2">
        {(userCanEditDirect || userNeedsApprovalEdit) && (
          <button
            onClick={() => handleEdit(row)}
            className="p-1.5 text-dark-500 dark:text-dark-400 hover:text-primary-600 hover:bg-primary-50 rounded-lg transition-colors"
            title={userNeedsApprovalEdit ? "Ajukan Edit" : "Edit"}
          >
            <Edit2 className="h-4 w-4" />
          </button>
        )}
        {(userCanDeleteDirect || userNeedsApprovalDelete) && (
          <button
            onClick={() => handleDelete(row.id || "")}
            className="p-1.5 text-dark-500 dark:text-dark-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
            title={userNeedsApprovalDelete ? "Ajukan Hapus" : "Hapus"}
          >
            <Trash2 className="h-4 w-4" />
          </button>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Summary Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-gradient-to-br from-amber-50 to-amber-100 rounded-xl p-5 border border-amber-200">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-amber-500 rounded-lg">
              <Fuel className="h-5 w-5 text-white" />
            </div>
            <div>
              <p className="text-xs font-medium text-amber-700 uppercase tracking-wider">
                Total Pengajuan
              </p>
              <p className="text-2xl font-bold text-amber-900">
                {formatNumber(summaryStats.totalPengajuan)}
              </p>
              <p className="text-xs text-amber-600">Liter</p>
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl p-5 border border-blue-200">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-blue-500 rounded-lg">
              <TrendingUp className="h-5 w-5 text-white" />
            </div>
            <div>
              <p className="text-xs font-medium text-blue-700 uppercase tracking-wider">
                Total Realisasi
              </p>
              <p className="text-2xl font-bold text-blue-900">
                {formatNumber(summaryStats.totalRealisasi)}
              </p>
              <p className="text-xs text-blue-600">Liter</p>
            </div>
          </div>
        </div>

        <div
          className={`bg-gradient-to-br rounded-xl p-5 border ${
            summaryStats.totalSelisih >= 0
              ? "from-green-50 to-green-100 border-green-200"
              : "from-red-50 to-red-100 border-red-200"
          }`}
        >
          <div className="flex items-center gap-3">
            <div
              className={`p-2.5 rounded-lg ${
                summaryStats.totalSelisih >= 0 ? "bg-green-500" : "bg-red-500"
              }`}
            >
              <TrendingDown className="h-5 w-5 text-white" />
            </div>
            <div>
              <p
                className={`text-xs font-medium uppercase tracking-wider ${
                  summaryStats.totalSelisih >= 0
                    ? "text-green-700"
                    : "text-red-700"
                }`}
              >
                Total Selisih
              </p>
              <p
                className={`text-2xl font-bold ${
                  summaryStats.totalSelisih >= 0
                    ? "text-green-900"
                    : "text-red-900"
                }`}
              >
                {summaryStats.totalSelisih >= 0 ? "+" : ""}
                {formatNumber(summaryStats.totalSelisih)}
              </p>
              <p
                className={`text-xs ${
                  summaryStats.totalSelisih >= 0
                    ? "text-green-600"
                    : "text-red-600"
                }`}
              >
                Liter{" "}
                {summaryStats.totalSelisih >= 0 ? "(Surplus)" : "(Defisit)"}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-slate-50 to-slate-100 rounded-xl p-5 border border-slate-200">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-slate-500 rounded-lg">
              <BarChart3 className="h-5 w-5 text-white" />
            </div>
            <div>
              <p className="text-xs font-medium text-slate-700 uppercase tracking-wider">
                Total Record
              </p>
              <p className="text-2xl font-bold text-slate-900">
                {summaryStats.totalRecord}
              </p>
              <p className="text-xs text-slate-600">
                {selectedMonth === "all"
                  ? "Semua bulan"
                  : `Bulan ${MONTH_NAMES[parseInt(selectedMonth)]}`}
              </p>
            </div>
          </div>
        </div>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-amber-100 rounded-lg">
              <Fuel className="h-6 w-6 text-amber-600" />
            </div>
            <div>
              <CardTitle>Rekap Pengajuan BBM Alat Berat</CardTitle>
              <p className="text-sm text-dark-500 dark:text-dark-400 mt-1">
                Plant {currentPlant} - Data pengajuan dan realisasi BBM
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              options={MONTH_OPTIONS}
              className="w-40"
            />
            <Button
              variant="secondary"
              onClick={() => setShowPrintModal(true)}
              className="border-amber-300 text-amber-700 hover:bg-amber-50"
            >
              <Printer className="h-4 w-4 mr-2" />
              Cetak
            </Button>
            {userCanAdd && (
              <Button
                onClick={() => {
                  setForm(initialFormState);
                  setEditingId(null);
                  setShowForm(true);
                }}
              >
                <Plus className="h-4 w-4 mr-2" />
                Tambah Data
              </Button>
            )}
          </div>
        </CardHeader>

        <DataTable
          data={filteredData}
          columns={columns}
          actions={renderActions}
          loading={loading}
          emptyMessage="Tidak ada data rekap BBM"
          searchable={true}
          searchKeys={["namaAlatBerat", "keterangan"]}
        />
      </Card>

      {/* Form Modal */}
      <Modal
        isOpen={showForm}
        onClose={() => {
          setShowForm(false);
          setEditingId(null);
          setForm(initialFormState);
        }}
        title={editingId ? "Edit Data BBM" : "Tambah Data BBM"}
        size="md"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="Tanggal"
            type="date"
            value={form.tanggal}
            onChange={(e) => setForm({ ...form, tanggal: e.target.value })}
            required
          />

          <Input
            label="Nama Alat Berat"
            placeholder="Contoh: Forklift 1, Loader A, dll"
            value={form.namaAlatBerat}
            onChange={(e) =>
              setForm({ ...form, namaAlatBerat: e.target.value })
            }
            required
          />

          <Input
            label="Pengajuan Solar (Liter)"
            type="text"
            placeholder="0"
            value={form.pengajuanSolar ? formatNumber(form.pengajuanSolar) : ""}
            onChange={(e) =>
              setForm({ ...form, pengajuanSolar: parseNumber(e.target.value) })
            }
            required
          />

          <Input
            label="Realisasi Pengisian (Liter)"
            type="text"
            placeholder="0"
            value={
              form.realisasiPengisian
                ? formatNumber(form.realisasiPengisian)
                : ""
            }
            onChange={(e) =>
              setForm({
                ...form,
                realisasiPengisian: parseNumber(e.target.value),
              })
            }
            required
          />

          <Input
            label="Keterangan"
            placeholder="Keterangan tambahan (opsional)"
            value={form.keterangan || ""}
            onChange={(e) => setForm({ ...form, keterangan: e.target.value })}
          />

          <div className="flex justify-end gap-3 pt-4">
            <Button
              type="button"
              variant="secondary"
              onClick={() => {
                setShowForm(false);
                setEditingId(null);
                setForm(initialFormState);
              }}
            >
              Batal
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Menyimpan..." : editingId ? "Update" : "Simpan"}
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
        title="Hapus Data BBM"
        message="Apakah Anda yakin ingin menghapus data ini? Tindakan ini tidak dapat dibatalkan."
        confirmText="Hapus"
        cancelText="Batal"
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
        itemName={pendingEditItem?.namaAlatBerat || ""}
        loading={loading}
      />

      {/* Success Overlay */}
      <SuccessOverlay
        isVisible={showSuccess}
        message={
          editingId
            ? "Data berhasil diupdate!"
            : deleteId
            ? "Data berhasil dihapus!"
            : "Data berhasil disimpan!"
        }
        onClose={() => setShowSuccess(false)}
      />

      {/* Print Modal */}
      <BBMPrintModal
        isOpen={showPrintModal}
        onClose={() => setShowPrintModal(false)}
        data={filteredData}
        plant={currentPlant}
      />
    </div>
  );
};

export default RekapBBMPage;
