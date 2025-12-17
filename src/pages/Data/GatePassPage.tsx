import { useState, useEffect, useCallback } from "react";
import { Plus, Edit2, Trash2, Search, Truck } from "lucide-react";
import { useSaveShortcut } from "@/hooks";
import {
  Button,
  Card,
  CardHeader,
  CardTitle,
  Input,
  Select,
  Modal,
  ConfirmDialog,
  DataTable,
  SuccessOverlay,
  ApprovalDialog,
} from "@/components/ui";
import { useAuthStore } from "@/stores";
import {
  formatDate,
  canAdd,
  canEditDirect,
  canDeleteDirect,
  needsApprovalForEdit,
  needsApprovalForDelete,
  isViewOnly,
  getCurrentDate,
} from "@/lib/utils";
import type { GatePass, PlantType } from "@/types";

const initialFormState: GatePass = {
  tanggal: getCurrentDate(),
  nomorGatePass: "",
  noPolisi: "",
  pemilikBarang: "",
  namaPembawa: "",
  mengetahui: "",
  deskripsiBarang: "",
  alasanKeluar: "",
};

interface GatePassPageProps {
  plant: PlantType;
}

const GatePassPage = ({ plant }: GatePassPageProps) => {
  const { user } = useAuthStore();
  const [data, setData] = useState<GatePass[]>([]);
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [form, setForm] = useState<GatePass>(initialFormState);
  const [searchTerm, setSearchTerm] = useState("");
  // Plant is now set from prop
  const currentPlant = plant;

  // Approval states
  const [showApprovalDialog, setShowApprovalDialog] = useState(false);
  const [approvalAction, setApprovalAction] = useState<"edit" | "delete">(
    "edit"
  );
  const [pendingEditItem, setPendingEditItem] = useState<GatePass | null>(null);

  // Check if user is view only
  const userIsViewOnly = isViewOnly(user?.role || "");
  const userCanAdd = canAdd(user?.role || "") && !userIsViewOnly;

  // Alt+S shortcut to save
  const triggerSave = useCallback(() => {
    if (showForm && !loading) {
      const form = document.querySelector("form");
      if (form) form.requestSubmit();
    }
  }, [showForm, loading]);
  useSaveShortcut(triggerSave, showForm);

  const userCanEditDirect = canEditDirect(user?.role || "");
  const userCanDeleteDirect = canDeleteDirect(user?.role || "");
  const userNeedsApprovalEdit = needsApprovalForEdit(user?.role || "");
  const userNeedsApprovalDelete = needsApprovalForDelete(user?.role || "");

  // Roman numerals for months
  const monthToRoman = (month: number): string => {
    const romanNumerals = [
      "I",
      "II",
      "III",
      "IV",
      "V",
      "VI",
      "VII",
      "VIII",
      "IX",
      "X",
      "XI",
      "XII",
    ];
    return romanNumerals[month];
  };

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const { fetchDataByPlant, SHEETS } = await import("@/services/api");
        const result = await fetchDataByPlant<GatePass>(SHEETS.GATE_PASS);
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

  // Auto generate gate pass number based on plant
  const generateGatePassNumber = () => {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth(); // 0-indexed
    const romanMonth = monthToRoman(month);
    const plantCode = currentPlant === "NPK1" ? "NPK-1" : "NPK-2";

    // Count existing gate passes for this month and plant
    const currentMonthData = data.filter((item) => {
      if (!item.tanggal) return false;
      const itemDate = new Date(item.tanggal);
      return (
        itemDate.getMonth() === month &&
        itemDate.getFullYear() === year &&
        item._plant === currentPlant
      );
    });

    const num = String(currentMonthData.length + 1).padStart(3, "0");
    return `${num}/GP/${plantCode}/${romanMonth}/${year}`;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { saveDataByPlant, updateDataByPlant, SHEETS } = await import(
        "@/services/api"
      );

      if (editingId) {
        const dataToUpdate = { ...form, id: editingId, _plant: currentPlant };
        const updateResult = await updateDataByPlant<GatePass>(
          SHEETS.GATE_PASS,
          dataToUpdate
        );
        if (updateResult.success) {
          setData((prev) =>
            prev.map((item) =>
              item.id === editingId
                ? { ...form, id: editingId, _plant: currentPlant }
                : item
            )
          );
        } else {
          throw new Error(updateResult.error || "Gagal mengupdate data");
        }
      } else {
        const newData = {
          ...form,
          nomorGatePass: form.nomorGatePass || generateGatePassNumber(),
          _plant: currentPlant,
        };
        const createResult = await saveDataByPlant<GatePass>(
          SHEETS.GATE_PASS,
          newData
        );
        if (createResult.success && createResult.data) {
          const newItem: GatePass = {
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

  const handleEdit = (item: GatePass) => {
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
      setDeleteId(id);
      setApprovalAction("delete");
      setShowApprovalDialog(true);
      return;
    }
    setDeleteId(id);
    setShowDeleteConfirm(true);
  };

  const handleApprovalSubmit = async (reason: string) => {
    setLoading(true);
    try {
      const { createData, SHEETS } = await import("@/services/api");
      const approvalData = {
        type: "GATE_PASS" as const,
        action: approvalAction,
        itemId: approvalAction === "edit" ? pendingEditItem?.id : deleteId,
        itemData:
          approvalAction === "edit"
            ? pendingEditItem
            : data.find((d) => d.id === deleteId),
        reason,
        submittedBy: user?.nama || user?.email || "Unknown",
        submittedAt: new Date().toISOString(),
        status: "pending" as const,
      };
      const result = await createData(SHEETS.APPROVAL_REQUESTS, approvalData);
      if (result.success) {
        setShowApprovalDialog(false);
        setPendingEditItem(null);
        setDeleteId(null);
        alert("Permintaan telah dikirim dan menunggu persetujuan");
      } else {
        throw new Error(result.error || "Gagal mengirim permintaan");
      }
    } catch (error) {
      console.error("Error submitting approval:", error);
      alert(error instanceof Error ? error.message : "Terjadi kesalahan");
    } finally {
      setLoading(false);
    }
  };

  const confirmDelete = async () => {
    if (!deleteId) return;

    setLoading(true);
    try {
      const { deleteDataByPlant, SHEETS } = await import("@/services/api");
      const itemToDelete = data.find((item) => item.id === deleteId);

      const deleteResult = await deleteDataByPlant(SHEETS.GATE_PASS, {
        id: deleteId,
        _plant: itemToDelete?._plant,
      });
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
    setForm({
      ...initialFormState,
      nomorGatePass: generateGatePassNumber(),
    });
    setEditingId(null);
    setShowForm(true);
  };

  const filteredData = data.filter((item) => {
    const matchesSearch =
      item.tanggal?.includes(searchTerm) ||
      item.nomorGatePass?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.deskripsiBarang?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.noPolisi?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.pemilikBarang?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.namaPembawa?.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesPlant = item._plant === currentPlant;

    return matchesSearch && matchesPlant;
  });

  const columns = [
    {
      key: "tanggal",
      header: "Tanggal",
      sortable: true,
      render: (value: unknown) => formatDate(value as string),
    },
    {
      key: "nomorGatePass",
      header: "No. Gate Pass",
      render: (value: unknown) => (
        <span className="font-mono font-semibold text-primary-600">
          {value as string}
        </span>
      ),
    },
    { key: "noPolisi", header: "No Polisi" },
    { key: "pemilikBarang", header: "Pemilik Barang" },
    { key: "namaPembawa", header: "Nama Pembawa" },
    { key: "mengetahui", header: "Mengetahui" },
    {
      key: "deskripsiBarang",
      header: "Deskripsi Barang",
      render: (value: unknown) => (
        <span className="line-clamp-2 max-w-xs whitespace-pre-wrap">
          {value as string}
        </span>
      ),
    },
    {
      key: "alasanKeluar",
      header: "Alasan Mengeluarkan",
      render: (value: unknown) => (
        <span className="line-clamp-2 max-w-xs whitespace-pre-wrap">
          {value as string}
        </span>
      ),
    },
  ];

  const totalData = filteredData.length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-display font-bold text-dark-900">
            Gate Pass {currentPlant === "NPK1" ? "NPK 1" : "NPK 2"}
          </h1>
          <p className="text-dark-500 mt-1">
            Kelola data gate pass barang masuk/keluar
          </p>
        </div>

        <div className="flex items-center gap-3">
          {userCanAdd && (
            <Button onClick={openAddForm}>
              <Plus className="h-4 w-4 mr-2" />
              Buat Gate Pass
            </Button>
          )}
        </div>
      </div>

      {/* Summary Card */}
      <div className="grid grid-cols-1 md:grid-cols-1 gap-4">
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary-100 rounded-lg">
              <Truck className="h-5 w-5 text-primary-600" />
            </div>
            <div>
              <p className="text-sm text-dark-500">Total Gate Pass</p>
              <p className="text-2xl font-bold text-primary-600">{totalData}</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Data Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Data Gate Pass</CardTitle>
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
          data={filteredData}
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
        title={editingId ? "Edit Gate Pass" : "Buat Gate Pass"}
        size="lg"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Tanggal"
              type="date"
              value={form.tanggal}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, tanggal: e.target.value }))
              }
              required
            />
            <Input
              label="No. Gate Pass"
              type="text"
              value={form.nomorGatePass}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, nomorGatePass: e.target.value }))
              }
              placeholder="Auto generate"
              disabled={!editingId}
            />
          </div>

          <Input
            label="No Polisi"
            type="text"
            value={form.noPolisi}
            onChange={(e) =>
              setForm((prev) => ({ ...prev, noPolisi: e.target.value }))
            }
            placeholder="Nomor polisi kendaraan"
            required
          />

          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Pemilik Barang"
              type="text"
              value={form.pemilikBarang}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, pemilikBarang: e.target.value }))
              }
              placeholder="Nama pemilik barang"
              required
            />
            <Input
              label="Nama Pembawa"
              type="text"
              value={form.namaPembawa}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, namaPembawa: e.target.value }))
              }
              placeholder="Nama pembawa barang"
              required
            />
          </div>

          <Input
            label="Mengetahui"
            type="text"
            value={form.mengetahui}
            onChange={(e) =>
              setForm((prev) => ({ ...prev, mengetahui: e.target.value }))
            }
            placeholder="Yang mengetahui"
            required
          />

          <div>
            <label className="block text-sm font-medium text-dark-700 mb-1">
              Deskripsi Barang
            </label>
            <textarea
              value={form.deskripsiBarang}
              onChange={(e) =>
                setForm((prev) => ({
                  ...prev,
                  deskripsiBarang: e.target.value,
                }))
              }
              placeholder="Deskripsi detail barang..."
              className="input-field min-h-[120px]"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-dark-700 mb-1">
              Alasan Mengeluarkan Barang
            </label>
            <textarea
              value={form.alasanKeluar}
              onChange={(e) =>
                setForm((prev) => ({
                  ...prev,
                  alasanKeluar: e.target.value,
                }))
              }
              placeholder="Alasan mengeluarkan barang..."
              className="input-field min-h-[80px]"
              required
            />
          </div>

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
        title="Hapus Gate Pass"
        message="Apakah Anda yakin ingin menghapus gate pass ini?"
        confirmText="Hapus"
        variant="danger"
        isLoading={loading}
      />

      <ApprovalDialog
        isOpen={showApprovalDialog}
        onClose={() => {
          setShowApprovalDialog(false);
          setPendingEditItem(null);
          setDeleteId(null);
        }}
        onSubmit={handleApprovalSubmit}
        action={approvalAction}
        itemName="gate pass"
        loading={loading}
      />

      <SuccessOverlay
        isVisible={showSuccess}
        message="Data berhasil disimpan!"
        onClose={() => setShowSuccess(false)}
      />
    </div>
  );
};

export default GatePassPage;
