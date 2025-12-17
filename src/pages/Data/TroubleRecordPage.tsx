import { useState, useEffect, useCallback } from "react";
import { Plus, Edit2, Trash2, Search, AlertCircle, Clock } from "lucide-react";
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
  formatTime,
  canAdd,
  canEditDirect,
  canDeleteDirect,
  needsApprovalForEdit,
  needsApprovalForDelete,
  isViewOnly,
  getCurrentDate,
} from "@/lib/utils";
import type { TroubleRecord, PlantType } from "@/types";

const initialFormState: TroubleRecord = {
  nomorBerkas: "",
  tanggal: getCurrentDate(),
  tanggalKejadian: getCurrentDate(),
  shift: "1",
  waktuKejadian: "",
  kodePeralatan: "",
  area: "",
  deskripsiMasalah: "",
  penyebab: "",
  tindakan: "",
  status: "Open",
  pic: "",
  targetSelesai: "",
  keterangan: "",
};

interface TroubleRecordPageProps {
  plant: PlantType;
}

const TroubleRecordPage = ({ plant }: TroubleRecordPageProps) => {
  const { user } = useAuthStore();
  const [data, setData] = useState<TroubleRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [form, setForm] = useState<TroubleRecord>(initialFormState);
  const [searchTerm, setSearchTerm] = useState("");
  // Plant is now set from prop
  const currentPlant = plant;

  // Approval states
  const [showApprovalDialog, setShowApprovalDialog] = useState(false);
  const [approvalAction, setApprovalAction] = useState<"edit" | "delete">(
    "edit"
  );
  const [pendingEditItem, setPendingEditItem] = useState<TroubleRecord | null>(
    null
  );

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

  const areaOptions = [
    { value: "Granulator", label: "Granulator" },
    { value: "Dryer", label: "Dryer" },
    { value: "Cooler", label: "Cooler" },
    { value: "Screening", label: "Screening" },
    { value: "Coater", label: "Coater" },
    { value: "Bagging", label: "Bagging" },
    { value: "Utility", label: "Utility" },
    { value: "Belt Conveyor", label: "Belt Conveyor" },
    { value: "Bucket Elevator", label: "Bucket Elevator" },
    { value: "Control Room", label: "Control Room" },
    { value: "Lainnya", label: "Lainnya" },
  ];

  const statusOptions = [
    { value: "Open", label: "Open" },
    { value: "In Progress", label: "In Progress" },
    { value: "Closed", label: "Closed" },
    { value: "Pending", label: "Pending" },
  ];

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const { fetchDataByPlant, SHEETS } = await import("@/services/api");
        const result = await fetchDataByPlant<TroubleRecord>(
          SHEETS.TROUBLE_RECORD
        );
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
        const updateResult = await updateDataByPlant<TroubleRecord>(
          SHEETS.TROUBLE_RECORD,
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
        const createResult = await saveDataByPlant<TroubleRecord>(
          SHEETS.TROUBLE_RECORD,
          newData
        );
        if (createResult.success && createResult.data) {
          const newItem: TroubleRecord = {
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

  const handleEdit = (item: TroubleRecord) => {
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
          targetSheet: "TROUBLE_RECORD",
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

      const deleteResult = await deleteDataByPlant(SHEETS.TROUBLE_RECORD, {
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
      item.area?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.deskripsiMasalah?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.pic?.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesPlant = item._plant === currentPlant;

    return matchesSearch && matchesPlant;
  });

  const statusCounts = {
    open: filteredData.filter((d) => d.status === "Open").length,
    progress: filteredData.filter((d) => d.status === "In Progress").length,
    closed: filteredData.filter((d) => d.status === "Closed").length,
    pending: filteredData.filter((d) => d.status === "Pending").length,
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "Open":
        return "danger";
      case "In Progress":
        return "warning";
      case "Closed":
        return "success";
      case "Pending":
        return "info";
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
      key: "shift",
      header: "Shift",
      render: (value: unknown) => (
        <Badge variant="primary">Shift {value as string}</Badge>
      ),
    },
    {
      key: "waktuKejadian",
      header: "Waktu",
      render: (value: unknown) => formatTime(value),
    },
    {
      key: "area",
      header: "Area",
      render: (value: unknown) => (
        <div className="flex items-center gap-2">
          <AlertCircle className="h-4 w-4 text-dark-400" />
          <span className="font-medium">{value as string}</span>
        </div>
      ),
    },
    {
      key: "deskripsiMasalah",
      header: "Deskripsi Masalah",
      render: (value: unknown) => (
        <span className="line-clamp-2 max-w-xs">{value as string}</span>
      ),
    },
    { key: "pic", header: "PIC" },
    {
      key: "status",
      header: "Status",
      render: (value: unknown) => (
        <Badge variant={getStatusColor(value as string)}>
          {value as string}
        </Badge>
      ),
    },
    {
      key: "targetSelesai",
      header: "Target",
      render: (value: unknown) => formatDate(value as string),
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-display font-bold text-dark-900">
            Trouble Record {currentPlant === "NPK1" ? "NPK 1" : "NPK 2"}
          </h1>
          <p className="text-dark-500 mt-1">
            Catatan masalah dan tindak lanjut
          </p>
        </div>

        <div className="flex items-center gap-3">
          {userCanAdd && (
            <Button onClick={openAddForm}>
              <Plus className="h-4 w-4 mr-2" />
              Catat Trouble
            </Button>
          )}
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="p-4 border-l-4 border-l-red-500">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-red-100 rounded-lg">
              <AlertCircle className="h-5 w-5 text-red-600" />
            </div>
            <div>
              <p className="text-sm text-dark-500">Open</p>
              <p className="text-2xl font-bold text-red-600">
                {statusCounts.open}
              </p>
            </div>
          </div>
        </Card>
        <Card className="p-4 border-l-4 border-l-amber-500">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-amber-100 rounded-lg">
              <Clock className="h-5 w-5 text-amber-600" />
            </div>
            <div>
              <p className="text-sm text-dark-500">In Progress</p>
              <p className="text-2xl font-bold text-amber-600">
                {statusCounts.progress}
              </p>
            </div>
          </div>
        </Card>
        <Card className="p-4 border-l-4 border-l-green-500">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-100 rounded-lg">
              <AlertCircle className="h-5 w-5 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-dark-500">Closed</p>
              <p className="text-2xl font-bold text-green-600">
                {statusCounts.closed}
              </p>
            </div>
          </div>
        </Card>
        <Card className="p-4 border-l-4 border-l-gray-500">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-gray-100 rounded-lg">
              <AlertCircle className="h-5 w-5 text-gray-600" />
            </div>
            <div>
              <p className="text-sm text-dark-500">Pending</p>
              <p className="text-2xl font-bold text-gray-600">
                {statusCounts.pending}
              </p>
            </div>
          </div>
        </Card>
      </div>

      {/* Data Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Data Trouble Record</CardTitle>
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
        title={editingId ? "Edit Trouble Record" : "Catat Trouble Baru"}
        size="lg"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-3 gap-4">
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
              label="Shift"
              value={form.shift}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, shift: e.target.value }))
              }
              options={[
                { value: "1", label: "Shift 1" },
                { value: "2", label: "Shift 2" },
                { value: "3", label: "Shift 3" },
              ]}
              required
            />
            <Input
              label="Waktu Kejadian"
              type="time"
              value={form.waktuKejadian}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, waktuKejadian: e.target.value }))
              }
              required
            />
          </div>

          <Select
            label="Area"
            value={form.area}
            onChange={(e) =>
              setForm((prev) => ({ ...prev, area: e.target.value }))
            }
            options={areaOptions}
            placeholder="Pilih area"
            required
          />

          <div>
            <label className="block text-sm font-medium text-dark-700 mb-1">
              Deskripsi Masalah
            </label>
            <textarea
              value={form.deskripsiMasalah}
              onChange={(e) =>
                setForm((prev) => ({
                  ...prev,
                  deskripsiMasalah: e.target.value,
                }))
              }
              placeholder="Jelaskan masalah yang terjadi..."
              className="input-field min-h-[80px]"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-dark-700 mb-1">
              Penyebab
            </label>
            <textarea
              value={form.penyebab}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, penyebab: e.target.value }))
              }
              placeholder="Analisa penyebab..."
              className="input-field min-h-[60px]"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-dark-700 mb-1">
              Tindakan
            </label>
            <textarea
              value={form.tindakan}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, tindakan: e.target.value }))
              }
              placeholder="Tindakan yang dilakukan/direncanakan..."
              className="input-field min-h-[60px]"
            />
          </div>

          <div className="grid grid-cols-3 gap-4">
            <Select
              label="Status"
              value={form.status}
              onChange={(e) =>
                setForm((prev) => ({
                  ...prev,
                  status: e.target.value as TroubleRecord["status"],
                }))
              }
              options={statusOptions}
              required
            />
            <Input
              label="PIC"
              type="text"
              value={form.pic}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, pic: e.target.value }))
              }
              placeholder="Nama PIC"
              required
            />
            <Input
              label="Target Selesai"
              type="date"
              value={form.targetSelesai}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, targetSelesai: e.target.value }))
              }
            />
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
        title="Hapus Trouble Record"
        message="Apakah Anda yakin ingin menghapus record ini?"
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

export default TroubleRecordPage;
