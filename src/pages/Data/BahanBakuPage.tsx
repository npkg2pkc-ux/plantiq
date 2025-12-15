import { useState, useEffect } from "react";
import { Plus, Edit2, Trash2, Search, Package } from "lucide-react";
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
import type { BahanBaku, PlantType } from "@/types";

const initialFormState: BahanBaku = {
  tanggal: getCurrentDate(),
  namaBarang: "",
  namaBarangLainnya: "",
  jumlah: 0,
  satuan: "Kg",
  keterangan: "",
};

interface BahanBakuPageProps {
  plant: PlantType;
}

const BahanBakuPage = ({ plant }: BahanBakuPageProps) => {
  const { user } = useAuthStore();
  const [data, setData] = useState<BahanBaku[]>([]);
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [form, setForm] = useState<BahanBaku>(initialFormState);
  const [searchTerm, setSearchTerm] = useState("");
  // Plant is now set from prop
  const currentPlant = plant;

  // Approval states
  const [showApprovalDialog, setShowApprovalDialog] = useState(false);
  const [approvalAction, setApprovalAction] = useState<"edit" | "delete">(
    "edit"
  );
  const [pendingEditItem, setPendingEditItem] = useState<BahanBaku | null>(
    null
  );

  // Check if user is view only
  const userIsViewOnly = isViewOnly(user?.role || "");
  const userCanAdd = canAdd(user?.role || "") && !userIsViewOnly;
  const userCanEditDirect = canEditDirect(user?.role || "");
  const userCanDeleteDirect = canDeleteDirect(user?.role || "");
  const userNeedsApprovalEdit = needsApprovalForEdit(user?.role || "");
  const userNeedsApprovalDelete = needsApprovalForDelete(user?.role || "");

  const namaBarangOptions = [
    { value: "Urea", label: "Urea" },
    { value: "DAP", label: "DAP" },
    { value: "KCL", label: "KCL" },
    { value: "ZA", label: "ZA" },
    { value: "Dolomite", label: "Dolomite" },
    { value: "Clay", label: "Clay" },
    { value: "Silica", label: "Silica" },
    { value: "Pewarna", label: "Pewarna" },
    { value: "Coating Oil", label: "Coating Oil" },
    { value: "Rock Phosphate", label: "Rock Phosphate" },
    { value: "Lainnya", label: "Lainnya" },
  ];

  const satuanOptions = [
    { value: "Kg", label: "Kg" },
    { value: "Ton", label: "Ton" },
    { value: "Liter", label: "Liter" },
    { value: "Drum", label: "Drum" },
    { value: "Bag", label: "Bag" },
  ];

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const { fetchDataByPlant, SHEETS } = await import("@/services/api");
        const result = await fetchDataByPlant<BahanBaku>(SHEETS.BAHAN_BAKU);
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
        const updateResult = await updateDataByPlant<BahanBaku>(
          SHEETS.BAHAN_BAKU,
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
        const createResult = await saveDataByPlant<BahanBaku>(
          SHEETS.BAHAN_BAKU,
          newData
        );
        if (createResult.success && createResult.data) {
          const newItem: BahanBaku = {
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

  const handleEdit = (item: BahanBaku) => {
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
        type: "BAHAN_BAKU" as const,
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

      const deleteResult = await deleteDataByPlant(SHEETS.BAHAN_BAKU, {
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
      item.namaBarang?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.keterangan?.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesPlant = item._plant === currentPlant;

    return matchesSearch && matchesPlant;
  });

  // Calculate totals per item
  const totalsByItem = filteredData.reduce((acc, item) => {
    const key = item.namaBarang || "Unknown";
    acc[key] = (acc[key] || 0) + (item.jumlah || 0);
    return acc;
  }, {} as Record<string, number>);

  const columns = [
    {
      key: "tanggal",
      header: "Tanggal",
      sortable: true,
      render: (value: unknown) => formatDate(value as string),
    },
    {
      key: "namaBarang",
      header: "Nama Barang",
      render: (value: unknown, row: BahanBaku) => (
        <div className="flex items-center gap-2">
          <Package className="h-4 w-4 text-dark-400" />
          <span className="font-medium">
            {value === "Lainnya"
              ? row.namaBarangLainnya || "Lainnya"
              : (value as string)}
          </span>
        </div>
      ),
    },
    {
      key: "jumlah",
      header: "Jumlah",
      render: (value: unknown, row: BahanBaku) => (
        <span className="font-semibold text-dark-900">
          {formatNumber(parseNumber(value))} {row.satuan}
        </span>
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
            Data Bahan Baku {currentPlant === "NPK1" ? "NPK 1" : "NPK 2"}
          </h1>
          <p className="text-dark-500 mt-1">Kelola data pemakaian bahan baku</p>
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

      {/* Summary - Top Items */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        {Object.entries(totalsByItem)
          .slice(0, 5)
          .map(([name, total]) => (
            <Card key={name} className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-primary-100 rounded-lg">
                  <Package className="h-5 w-5 text-primary-600" />
                </div>
                <div>
                  <p className="text-sm text-dark-500">{name}</p>
                  <p className="text-lg font-bold text-dark-900">
                    {formatNumber(total)} Kg
                  </p>
                </div>
              </div>
            </Card>
          ))}
      </div>

      {/* Data Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Data Bahan Baku</CardTitle>
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
        title={editingId ? "Edit Data Bahan Baku" : "Tambah Data Bahan Baku"}
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
            label="Nama Barang"
            value={form.namaBarang}
            onChange={(e) =>
              setForm((prev) => ({
                ...prev,
                namaBarang: e.target.value,
                namaBarangLainnya:
                  e.target.value !== "Lainnya" ? "" : prev.namaBarangLainnya,
              }))
            }
            options={namaBarangOptions}
            placeholder="Pilih bahan baku"
            required
          />

          {form.namaBarang === "Lainnya" && (
            <Input
              label="Nama Barang Lainnya"
              type="text"
              value={form.namaBarangLainnya}
              onChange={(e) =>
                setForm((prev) => ({
                  ...prev,
                  namaBarangLainnya: e.target.value,
                }))
              }
              placeholder="Masukkan nama barang"
              required
            />
          )}

          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Jumlah"
              type="number"
              value={form.jumlah || ""}
              onChange={(e) =>
                setForm((prev) => ({
                  ...prev,
                  jumlah: parseFloat(e.target.value) || 0,
                }))
              }
              placeholder="0"
              required
            />
            <Select
              label="Satuan"
              value={form.satuan}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, satuan: e.target.value }))
              }
              options={satuanOptions}
              required
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
        title="Hapus Data"
        message="Apakah Anda yakin ingin menghapus data ini?"
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
        itemName="data bahan baku"
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

export default BahanBakuPage;
