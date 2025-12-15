import { useState, useEffect } from "react";
import {
  Plus,
  Edit2,
  Trash2,
  Search,
  Calendar,
  Wrench,
  PlusCircle,
  Minus,
} from "lucide-react";
import {
  Button,
  Card,
  CardHeader,
  CardTitle,
  Input,
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
  canAdd,
  canEditDirect,
  canDeleteDirect,
  needsApprovalForEdit,
  needsApprovalForDelete,
  isViewOnly,
  getCurrentDate,
} from "@/lib/utils";
import type { PerbaikanTahunan, PlantType } from "@/types";

interface ItemDeskripsi {
  item: string;
  deskripsi: string;
}

const initialFormState: PerbaikanTahunan = {
  tanggalMulai: getCurrentDate(),
  items: [{ item: "", deskripsi: "" }],
  tanggalSelesai: "",
  jumlahHari: 0,
};

interface PerbaikanTahunanPageProps {
  plant: PlantType;
}

const PerbaikanTahunanPage = ({ plant }: PerbaikanTahunanPageProps) => {
  const { user } = useAuthStore();
  const [data, setData] = useState<PerbaikanTahunan[]>([]);
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [form, setForm] = useState<PerbaikanTahunan>(initialFormState);
  const [searchTerm, setSearchTerm] = useState("");
  // Plant is now set from prop
  const currentPlant = plant;

  // Approval states
  const [showApprovalDialog, setShowApprovalDialog] = useState(false);
  const [approvalAction, setApprovalAction] = useState<"edit" | "delete">(
    "edit"
  );
  const [pendingEditItem, setPendingEditItem] =
    useState<PerbaikanTahunan | null>(null);

  // Check permissions
  const userIsViewOnly = isViewOnly(user?.role || "");
  const userCanAdd = canAdd(user?.role || "") && !userIsViewOnly;
  const userNeedsApprovalEdit = needsApprovalForEdit(user?.role || "");
  const userNeedsApprovalDelete = needsApprovalForDelete(user?.role || "");

  // Silence unused vars (for future use)
  void canEditDirect;
  void canDeleteDirect;

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const { fetchDataByPlant, SHEETS } = await import("@/services/api");
        const result = await fetchDataByPlant<PerbaikanTahunan>(
          SHEETS.PERBAIKAN_TAHUNAN
        );
        if (result.success && result.data) {
          // Parse items if it's a string
          const parsedData = result.data.map((item) => ({
            ...item,
            items:
              typeof item.items === "string"
                ? JSON.parse(item.items)
                : item.items || [],
          }));
          // Sort by tanggalMulai descending (newest first)
          const sortedData = parsedData.sort(
            (a, b) =>
              new Date(b.tanggalMulai || 0).getTime() -
              new Date(a.tanggalMulai || 0).getTime()
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

  // Calculate jumlahHari when dates change
  useEffect(() => {
    if (form.tanggalMulai && form.tanggalSelesai) {
      const startDate = new Date(form.tanggalMulai);
      const endDate = new Date(form.tanggalSelesai);
      const timeDiff = endDate.getTime() - startDate.getTime();
      const daysDiff = Math.ceil(timeDiff / (1000 * 3600 * 24)) + 1; // Include both start and end date
      setForm((prev) => ({
        ...prev,
        jumlahHari: daysDiff > 0 ? daysDiff : 0,
      }));
    } else {
      setForm((prev) => ({
        ...prev,
        jumlahHari: 0,
      }));
    }
  }, [form.tanggalMulai, form.tanggalSelesai]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { saveDataByPlant, updateDataByPlant, SHEETS } = await import(
        "@/services/api"
      );

      // Stringify items for storage
      const dataToSave = {
        ...form,
        items: JSON.stringify(form.items),
      };

      if (editingId) {
        const dataToUpdate = {
          ...dataToSave,
          id: editingId,
          _plant: currentPlant,
        };
        const updateResult = await updateDataByPlant<PerbaikanTahunan>(
          SHEETS.PERBAIKAN_TAHUNAN,
          dataToUpdate as unknown as PerbaikanTahunan
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
        const newData = { ...dataToSave, _plant: currentPlant };
        const createResult = await saveDataByPlant<PerbaikanTahunan>(
          SHEETS.PERBAIKAN_TAHUNAN,
          newData as unknown as PerbaikanTahunan
        );
        if (createResult.success && createResult.data) {
          const newItem: PerbaikanTahunan = {
            ...form,
            id: createResult.data.id,
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

  const handleEdit = (item: PerbaikanTahunan) => {
    if (userNeedsApprovalEdit) {
      setPendingEditItem(item);
      setApprovalAction("edit");
      setShowApprovalDialog(true);
      return;
    }
    setForm({
      ...item,
      items: Array.isArray(item.items)
        ? item.items
        : [{ item: "", deskripsi: "" }],
    });
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
        type: "PERBAIKAN_TAHUNAN" as const,
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

      const deleteResult = await deleteDataByPlant(SHEETS.PERBAIKAN_TAHUNAN, {
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

  // Handle adding new item-deskripsi pair
  const addItemDeskripsi = () => {
    setForm((prev) => ({
      ...prev,
      items: [...prev.items, { item: "", deskripsi: "" }],
    }));
  };

  // Handle removing item-deskripsi pair
  const removeItemDeskripsi = (index: number) => {
    if (form.items.length > 1) {
      setForm((prev) => ({
        ...prev,
        items: prev.items.filter((_, i) => i !== index),
      }));
    }
  };

  // Handle updating item-deskripsi pair
  const updateItemDeskripsi = (
    index: number,
    field: keyof ItemDeskripsi,
    value: string
  ) => {
    setForm((prev) => ({
      ...prev,
      items: prev.items.map((item, i) =>
        i === index ? { ...item, [field]: value } : item
      ),
    }));
  };

  const filteredData = data.filter((item) => {
    const matchesSearch =
      item.tanggalMulai?.includes(searchTerm) ||
      item.tanggalSelesai?.includes(searchTerm) ||
      item.items?.some(
        (i: ItemDeskripsi) =>
          i.item?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          i.deskripsi?.toLowerCase().includes(searchTerm.toLowerCase())
      );

    const matchesPlant = item._plant === currentPlant;

    return matchesSearch && matchesPlant;
  });

  const totalHariPerta = filteredData.reduce(
    (acc, item) => acc + (item.jumlahHari || 0),
    0
  );

  const columns = [
    {
      key: "tanggalMulai",
      header: "Tanggal Mulai",
      sortable: true,
      render: (value: unknown) => formatDate(value as string),
    },
    {
      key: "tanggalSelesai",
      header: "Tanggal Selesai",
      render: (value: unknown) => (value ? formatDate(value as string) : "-"),
    },
    {
      key: "items",
      header: "Item Perbaikan",
      render: (value: unknown) => {
        const items = value as ItemDeskripsi[];
        if (!items || !Array.isArray(items)) return "-";
        return (
          <div className="max-w-xs">
            {items.slice(0, 2).map((item, idx) => (
              <div key={idx} className="text-sm">
                <span className="font-medium">{item.item}</span>
              </div>
            ))}
            {items.length > 2 && (
              <span className="text-xs text-dark-400">
                +{items.length - 2} lainnya
              </span>
            )}
          </div>
        );
      },
    },
    {
      key: "jumlahHari",
      header: "Jumlah Hari",
      render: (value: unknown) => (
        <Badge variant="primary">{value as number} Hari</Badge>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-display font-bold text-dark-900">
            Perbaikan Tahunan {currentPlant === "NPK1" ? "NPK 1" : "NPK 2"}
          </h1>
          <p className="text-dark-500 mt-1">
            Kelola data perbaikan tahunan (PERTA)
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
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary-100 rounded-lg">
              <Wrench className="h-5 w-5 text-primary-600" />
            </div>
            <div>
              <p className="text-sm text-dark-500">Total Perbaikan</p>
              <p className="text-2xl font-bold text-primary-600">
                {filteredData.length}
              </p>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-amber-100 rounded-lg">
              <Calendar className="h-5 w-5 text-amber-600" />
            </div>
            <div>
              <p className="text-sm text-dark-500">Total Hari Perta</p>
              <p className="text-2xl font-bold text-amber-600">
                {totalHariPerta} Hari
              </p>
            </div>
          </div>
        </Card>
      </div>

      {/* Data Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Data Perbaikan Tahunan</CardTitle>
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
        title={
          editingId ? "Edit Perbaikan Tahunan" : "Tambah Perbaikan Tahunan"
        }
        size="lg"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="Tanggal Mulai Perta"
            type="date"
            value={form.tanggalMulai}
            onChange={(e) =>
              setForm((prev) => ({ ...prev, tanggalMulai: e.target.value }))
            }
            required
          />

          {/* Dynamic Item-Deskripsi pairs */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="block text-sm font-medium text-dark-700">
                Item & Deskripsi Perbaikan
              </label>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={addItemDeskripsi}
              >
                <PlusCircle className="h-4 w-4 mr-1" />
                Tambah Item
              </Button>
            </div>

            {form.items.map((itemDeskripsi, index) => (
              <div key={index} className="p-4 bg-dark-50 rounded-xl space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-dark-600">
                    Item {index + 1}
                  </span>
                  {form.items.length > 1 && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => removeItemDeskripsi(index)}
                      className="h-6 w-6"
                    >
                      <Minus className="h-4 w-4 text-red-500" />
                    </Button>
                  )}
                </div>
                <Input
                  type="text"
                  value={itemDeskripsi.item}
                  onChange={(e) =>
                    updateItemDeskripsi(index, "item", e.target.value)
                  }
                  placeholder="Nama item perbaikan"
                  required
                />
                <textarea
                  value={itemDeskripsi.deskripsi}
                  onChange={(e) =>
                    updateItemDeskripsi(index, "deskripsi", e.target.value)
                  }
                  placeholder="Deskripsi perbaikan..."
                  className="input-field min-h-[80px]"
                  required
                />
              </div>
            ))}
          </div>

          <Input
            label="Tanggal Selesai Perta"
            type="date"
            value={form.tanggalSelesai}
            onChange={(e) =>
              setForm((prev) => ({ ...prev, tanggalSelesai: e.target.value }))
            }
          />

          {/* Show calculated days */}
          <div className="p-4 bg-primary-50 rounded-xl">
            <div className="flex items-center justify-between">
              <span className="text-dark-600 font-medium">
                Jumlah Hari Perta:
              </span>
              <Badge variant="primary" className="text-lg px-4">
                {form.jumlahHari} Hari
              </Badge>
            </div>
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
        title="Hapus Data"
        message="Apakah Anda yakin ingin menghapus data perbaikan tahunan ini?"
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
        itemName="perbaikan tahunan"
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

export default PerbaikanTahunanPage;
