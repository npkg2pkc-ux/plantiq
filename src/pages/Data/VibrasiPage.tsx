import { useState, useEffect, useCallback } from "react";
import {
  Plus,
  Edit2,
  Trash2,
  Search,
  Activity,
  AlertTriangle,
} from "lucide-react";
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
  Badge,
  DataTable,
  SuccessOverlay,
  ApprovalDialog,
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
import type { Vibrasi, PlantType } from "@/types";

const initialFormState: Vibrasi = {
  tanggal: getCurrentDate(),
  namaEquipment: "",
  posisiPengukuran: "",
  pointPengukuran: "",
  nilaiVibrasi: 0,
  status: "Normal",
  keterangan: "",
};

interface VibrasiPageProps {
  plant: PlantType;
}

const VibrasiPage = ({ plant }: VibrasiPageProps) => {
  const { user } = useAuthStore();
  const [data, setData] = useState<Vibrasi[]>([]);
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [form, setForm] = useState<Vibrasi>(initialFormState);
  const [searchTerm, setSearchTerm] = useState("");
  // Plant is now set from prop
  const currentPlant = plant;

  // Approval states
  const [showApprovalDialog, setShowApprovalDialog] = useState(false);
  const [approvalAction, setApprovalAction] = useState<"edit" | "delete">(
    "edit"
  );
  const [pendingEditItem, setPendingEditItem] = useState<Vibrasi | null>(null);

  // Permission checks
  const userRole = user?.role || "";
  const userCanAdd = canAdd(userRole);

  // Alt+S shortcut to save
  const triggerSave = useCallback(() => {
    if (showForm && !loading) {
      const form = document.querySelector("form");
      if (form) form.requestSubmit();
    }
  }, [showForm, loading]);
  useSaveShortcut(triggerSave, showForm);

  const userCanEditDirect = canEditDirect(userRole);
  const userCanDeleteDirect = canDeleteDirect(userRole);
  const userNeedsApprovalEdit = needsApprovalForEdit(userRole);
  const userNeedsApprovalDelete = needsApprovalForDelete(userRole);
  const userIsViewOnly = isViewOnly(userRole);

  const posisiPengukuranOptions = [
    { value: "Vertical", label: "Vertical" },
    { value: "Horizontal", label: "Horizontal" },
    { value: "Axial", label: "Axial" },
  ];

  const pointPengukuranOptions = [
    { value: "A", label: "A" },
    { value: "B", label: "B" },
    { value: "C", label: "C" },
    { value: "D", label: "D" },
  ];

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const { fetchDataByPlant, SHEETS } = await import("@/services/api");
        const result = await fetchDataByPlant<Vibrasi>(SHEETS.VIBRASI);
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

  // Auto determine status based on vibrasi value
  useEffect(() => {
    let status: Vibrasi["status"] = "Normal";
    if (form.nilaiVibrasi >= 7) {
      status = "Alert";
    } else if (form.nilaiVibrasi >= 4) {
      status = "Warning";
    }
    setForm((prev) => ({ ...prev, status }));
  }, [form.nilaiVibrasi]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { saveDataByPlant, updateDataByPlant, SHEETS } = await import(
        "@/services/api"
      );

      if (editingId) {
        const dataToUpdate = { ...form, id: editingId, _plant: currentPlant };
        const updateResult = await updateDataByPlant<Vibrasi>(
          SHEETS.VIBRASI,
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
        const newData = { ...form, _plant: currentPlant };
        const createResult = await saveDataByPlant<Vibrasi>(
          SHEETS.VIBRASI,
          newData
        );
        if (createResult.success && createResult.data) {
          const newItem: Vibrasi = {
            ...createResult.data,
            _plant: currentPlant,
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

  const handleEdit = (item: Vibrasi) => {
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
          targetSheet: "VIBRASI",
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
      const { deleteDataByPlant, SHEETS } = await import("@/services/api");
      const itemToDelete = data.find((item) => item.id === deleteId);

      const deleteResult = await deleteDataByPlant(SHEETS.VIBRASI, {
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
    setForm(initialFormState);
    setEditingId(null);
    setShowForm(true);
  };

  const filteredData = data.filter((item) => {
    const matchesSearch =
      item.tanggal?.includes(searchTerm) ||
      item.namaEquipment?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.posisiPengukuran?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.pointPengukuran?.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesPlant = item._plant === currentPlant;

    return matchesSearch && matchesPlant;
  });

  const statusCounts = {
    normal: filteredData.filter((d) => d.status === "Normal").length,
    warning: filteredData.filter((d) => d.status === "Warning").length,
    alert: filteredData.filter((d) => d.status === "Alert").length,
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "Normal":
        return "success";
      case "Warning":
        return "warning";
      case "Alert":
        return "danger";
      default:
        return "default";
    }
  };

  const columns = [
    {
      key: "tanggal",
      header: "Tanggal",
      sortable: true,
      render: (value: unknown) => formatDate(value as string),
    },
    {
      key: "namaEquipment",
      header: "Equipment",
      render: (value: unknown) => (
        <div className="flex items-center gap-2">
          <Activity className="h-4 w-4 text-dark-400" />
          <span className="font-medium">{value as string}</span>
        </div>
      ),
    },
    {
      key: "posisiPengukuran",
      header: "Posisi Pengukuran",
      render: (value: unknown) => (
        <Badge variant="default">{value as string}</Badge>
      ),
    },
    {
      key: "pointPengukuran",
      header: "Point Pengukuran",
      render: (value: unknown) => (
        <Badge variant="primary">{value as string}</Badge>
      ),
    },
    {
      key: "nilaiVibrasi",
      header: "Vibrasi (mm/s)",
      render: (value: unknown) => {
        const numValue = parseNumber(value);
        return (
          <span
            className={`font-bold ${
              numValue >= 7
                ? "text-red-600"
                : numValue >= 4
                ? "text-amber-600"
                : "text-green-600"
            }`}
          >
            {formatNumber(numValue)}
          </span>
        );
      },
    },
    {
      key: "status",
      header: "Status",
      render: (value: unknown) => (
        <Badge variant={getStatusColor(value as string)}>
          {value as string}
        </Badge>
      ),
    },
    { key: "keterangan", header: "Keterangan" },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-display font-bold text-dark-900">
            Data Vibrasi {currentPlant === "NPK1" ? "NPK 1" : "NPK 2"}
          </h1>
          <p className="text-dark-500 mt-1">
            Monitoring vibrasi equipment produksi
          </p>
        </div>

        <div className="flex items-center gap-3">
          {userCanAdd && (
            <Button onClick={openAddForm}>
              <Plus className="h-4 w-4 mr-2" />
              Tambah Data
            </Button>
          )}
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-100 rounded-lg">
              <Activity className="h-5 w-5 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-dark-500">Normal</p>
              <p className="text-2xl font-bold text-green-600">
                {statusCounts.normal}
              </p>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-amber-100 rounded-lg">
              <AlertTriangle className="h-5 w-5 text-amber-600" />
            </div>
            <div>
              <p className="text-sm text-dark-500">Warning</p>
              <p className="text-2xl font-bold text-amber-600">
                {statusCounts.warning}
              </p>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-red-100 rounded-lg">
              <AlertTriangle className="h-5 w-5 text-red-600" />
            </div>
            <div>
              <p className="text-sm text-dark-500">Alert</p>
              <p className="text-2xl font-bold text-red-600">
                {statusCounts.alert}
              </p>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-dark-100 rounded-lg">
              <Activity className="h-5 w-5 text-dark-600" />
            </div>
            <div>
              <p className="text-sm text-dark-500">Total Pengukuran</p>
              <p className="text-2xl font-bold text-dark-900">
                {filteredData.length}
              </p>
            </div>
          </div>
        </Card>
      </div>

      {/* Vibrasi Alert Info */}
      <Card className="p-4 bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200">
        <div className="flex items-start gap-4">
          <div className="p-2 bg-blue-100 rounded-lg">
            <Activity className="h-5 w-5 text-blue-600" />
          </div>
          <div className="flex-1">
            <h3 className="font-semibold text-dark-900">
              Panduan Status Vibrasi
            </h3>
            <div className="mt-2 grid grid-cols-3 gap-4 text-sm">
              <div>
                <Badge variant="success">Normal</Badge>
                <p className="text-dark-600 mt-1">&lt; 4 mm/s</p>
              </div>
              <div>
                <Badge variant="warning">Warning</Badge>
                <p className="text-dark-600 mt-1">4 - 7 mm/s</p>
              </div>
              <div>
                <Badge variant="danger">Alert</Badge>
                <p className="text-dark-600 mt-1">&gt; 7 mm/s</p>
              </div>
            </div>
          </div>
        </div>
      </Card>

      {/* Data Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Data Pengukuran Vibrasi</CardTitle>
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
        title={editingId ? "Edit Data Vibrasi" : "Tambah Data Vibrasi"}
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

          <Input
            label="Nama Equipment"
            type="text"
            value={form.namaEquipment}
            onChange={(e) =>
              setForm((prev) => ({ ...prev, namaEquipment: e.target.value }))
            }
            placeholder="Masukkan nama equipment"
            required
          />

          <div className="grid grid-cols-2 gap-4">
            <Select
              label="Posisi Pengukuran"
              value={form.posisiPengukuran}
              onChange={(e) =>
                setForm((prev) => ({
                  ...prev,
                  posisiPengukuran: e.target.value,
                }))
              }
              options={posisiPengukuranOptions}
              placeholder="Pilih posisi"
              required
            />

            <Select
              label="Point Pengukuran"
              value={form.pointPengukuran}
              onChange={(e) =>
                setForm((prev) => ({
                  ...prev,
                  pointPengukuran: e.target.value,
                }))
              }
              options={pointPengukuranOptions}
              placeholder="Pilih point"
              required
            />
          </div>

          <Input
            label="Nilai Vibrasi (mm/s)"
            type="number"
            step="0.1"
            value={form.nilaiVibrasi || ""}
            onChange={(e) =>
              setForm((prev) => ({
                ...prev,
                nilaiVibrasi: parseFloat(e.target.value) || 0,
              }))
            }
            placeholder="0.0"
            required
          />

          <div className="p-4 bg-dark-50 rounded-xl">
            <div className="flex items-center justify-between">
              <span className="text-dark-600">Status:</span>
              <Badge
                variant={getStatusColor(form.status || "Normal")}
                className="text-lg px-4"
              >
                {form.status}
              </Badge>
            </div>
          </div>

          <Input
            label="Keterangan"
            type="text"
            value={form.keterangan}
            onChange={(e) =>
              setForm((prev) => ({ ...prev, keterangan: e.target.value }))
            }
            placeholder="Keterangan tambahan"
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

      <SuccessOverlay
        isVisible={showSuccess}
        message="Data berhasil disimpan!"
        onClose={() => setShowSuccess(false)}
      />
    </div>
  );
};

export default VibrasiPage;
