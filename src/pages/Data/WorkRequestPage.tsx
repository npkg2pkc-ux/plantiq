import { useState, useEffect, useCallback } from "react";
import { Plus, Edit2, Trash2, FileText, Search } from "lucide-react";
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
import type { WorkRequest, PlantType } from "@/types";

const initialFormState: WorkRequest = {
  tanggal: getCurrentDate(),
  nomorWR: "",
  item: "",
  area: "",
  eksekutor: "",
  include: "",
  keterangan: "",
};

const eksekutorOptions = [
  { value: "Mekanik", label: "Mekanik" },
  { value: "Bengkel", label: "Bengkel" },
  { value: "Listrik", label: "Listrik" },
  { value: "Craftshop", label: "Craftshop" },
  { value: "Alat Berat", label: "Alat Berat" },
  { value: "Instrument", label: "Instrument" },
  { value: "Inspeksi", label: "Inspeksi" },
];

interface WorkRequestPageProps {
  plant: PlantType;
}

const WorkRequestPage = ({ plant }: WorkRequestPageProps) => {
  const { user } = useAuthStore();
  const [data, setData] = useState<WorkRequest[]>([]);
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [form, setForm] = useState<WorkRequest>(initialFormState);
  const [searchTerm, setSearchTerm] = useState("");
  // Plant is now set from prop, not from filter
  const currentPlant = plant;

  // Approval states
  const [showApprovalDialog, setShowApprovalDialog] = useState(false);
  const [approvalAction, setApprovalAction] = useState<"edit" | "delete">(
    "edit"
  );
  const [pendingEditItem, setPendingEditItem] = useState<WorkRequest | null>(
    null
  );

  // Check if user is view only (manager/eksternal)
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

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const { fetchDataByPlant, SHEETS } = await import("@/services/api");
        const result = await fetchDataByPlant<WorkRequest>(SHEETS.WORK_REQUEST);
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
        const updateResult = await updateDataByPlant<WorkRequest>(
          SHEETS.WORK_REQUEST,
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
        const createResult = await saveDataByPlant<WorkRequest>(
          SHEETS.WORK_REQUEST,
          newData
        );
        if (createResult.success && createResult.data) {
          const newItem: WorkRequest = {
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

  const handleEdit = (item: WorkRequest) => {
    // Jika user perlu approval untuk edit
    if (userNeedsApprovalEdit) {
      setPendingEditItem(item);
      setApprovalAction("edit");
      setShowApprovalDialog(true);
      return;
    }
    // Admin/Supervisor/AVP langsung edit
    setForm(item);
    setEditingId(item.id || null);
    setShowForm(true);
  };

  const handleDelete = (id: string) => {
    // Jika user perlu approval untuk delete
    if (userNeedsApprovalDelete) {
      setDeleteId(id);
      setApprovalAction("delete");
      setShowApprovalDialog(true);
      return;
    }
    // Admin langsung delete
    setDeleteId(id);
    setShowDeleteConfirm(true);
  };

  // Handle approval request submission
  const handleApprovalSubmit = async (reason: string) => {
    setLoading(true);
    try {
      const { createData, SHEETS } = await import("@/services/api");

      const approvalData = {
        type: "work_request" as const,
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

      const deleteResult = await deleteDataByPlant(SHEETS.WORK_REQUEST, {
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
      item.nomorWR?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.item?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.area?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.keterangan?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.include?.toLowerCase().includes(searchTerm.toLowerCase());

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
    { key: "nomorWR", header: "Nomor WR" },
    { key: "item", header: "Item" },
    { key: "area", header: "Area" },
    { key: "eksekutor", header: "Eksekutor" },
    { key: "include", header: "Include" },
    {
      key: "keterangan",
      header: "Keterangan",
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
            Work Request {currentPlant === "NPK1" ? "NPK 1" : "NPK 2"}
          </h1>
          <p className="text-dark-500 mt-1">
            Kelola permintaan perbaikan dan maintenance
          </p>
        </div>

        <div className="flex items-center gap-3">
          {userCanAdd && (
            <Button onClick={openAddForm}>
              <Plus className="h-4 w-4 mr-2" />
              Buat Work Request
            </Button>
          )}
        </div>
      </div>

      {/* Summary Card */}
      <div className="grid grid-cols-1 md:grid-cols-1 gap-4">
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary-100 rounded-lg">
              <FileText className="h-5 w-5 text-primary-600" />
            </div>
            <div>
              <p className="text-sm text-dark-500">Total Work Request</p>
              <p className="text-2xl font-bold text-primary-600">{totalData}</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Data Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Data Work Request</CardTitle>
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
                      title={
                        userNeedsApprovalEdit
                          ? "Ajukan Edit (perlu approval)"
                          : "Edit"
                      }
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
                      title={
                        userNeedsApprovalDelete
                          ? "Ajukan Hapus (perlu approval)"
                          : "Hapus"
                      }
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
        title={editingId ? "Edit Work Request" : "Buat Work Request"}
        size="lg"
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

          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Nomor WR"
              type="text"
              value={form.nomorWR}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, nomorWR: e.target.value }))
              }
              placeholder="Nomor Work Request"
              required
            />
            <Input
              label="Item"
              type="text"
              value={form.item}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, item: e.target.value }))
              }
              placeholder="Item"
              required
            />
          </div>

          <Input
            label="Area"
            type="text"
            value={form.area}
            onChange={(e) =>
              setForm((prev) => ({ ...prev, area: e.target.value }))
            }
            placeholder="Area"
            required
          />

          <div className="grid grid-cols-2 gap-4">
            <Select
              label="Eksekutor"
              value={form.eksekutor}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, eksekutor: e.target.value }))
              }
              options={eksekutorOptions}
              placeholder="Pilih eksekutor"
              required
            />
            <Input
              label="Include"
              type="text"
              value={form.include}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, include: e.target.value }))
              }
              placeholder="Include"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-dark-700 mb-1">
              Keterangan
            </label>
            <textarea
              value={form.keterangan}
              onChange={(e) =>
                setForm((prev) => ({
                  ...prev,
                  keterangan: e.target.value,
                }))
              }
              placeholder="Keterangan detail work request..."
              className="input-field min-h-[100px]"
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
        title="Hapus Work Request"
        message="Apakah Anda yakin ingin menghapus work request ini?"
        confirmText="Hapus"
        variant="danger"
        isLoading={loading}
      />

      {/* Approval Dialog for User role */}
      <ApprovalDialog
        isOpen={showApprovalDialog}
        onClose={() => {
          setShowApprovalDialog(false);
          setPendingEditItem(null);
          setDeleteId(null);
        }}
        onSubmit={handleApprovalSubmit}
        action={approvalAction}
        itemName="Work Request"
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

export default WorkRequestPage;
