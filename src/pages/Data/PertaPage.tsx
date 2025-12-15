import { useState, useEffect } from "react";
import { Plus, Edit2, Trash2, Search, Droplets } from "lucide-react";
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
import type { Perta, PlantType } from "@/types";

const initialFormState: Perta = {
  tanggal: getCurrentDate(),
  nomorPerta: "",
  deskripsi: "",
  status: "Open",
  shift: "1",
  jenisBBM: "Solar",
  volumeAwal: 0,
  volumePengisian: 0,
  volumePemakaian: 0,
  volumeAkhir: 0,
  keterangan: "",
};

const PertaPage = () => {
  const { user } = useAuthStore();
  const [data, setData] = useState<Perta[]>([]);
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [form, setForm] = useState<Perta>(initialFormState);
  const [searchTerm, setSearchTerm] = useState("");
  // Set default filter berdasarkan plant user yang login
  const [plantFilter, setPlantFilter] = useState<PlantType>(
    user?.plant || "ALL"
  );

  // Approval states
  const [showApprovalDialog, setShowApprovalDialog] = useState(false);
  const [approvalAction, setApprovalAction] = useState<"edit" | "delete">(
    "edit"
  );
  const [pendingEditItem, setPendingEditItem] = useState<Perta | null>(null);

  // Check if user is view only
  const userIsViewOnly = isViewOnly(user?.role || "");
  const userCanAdd = canAdd(user?.role || "") && !userIsViewOnly;
  const userCanEditDirect = canEditDirect(user?.role || "");
  const userCanDeleteDirect = canDeleteDirect(user?.role || "");
  const userNeedsApprovalEdit = needsApprovalForEdit(user?.role || "");
  const userNeedsApprovalDelete = needsApprovalForDelete(user?.role || "");

  const jenisBBMOptions = [
    { value: "Solar", label: "Solar" },
    { value: "Pertamax", label: "Pertamax" },
    { value: "Pertalite", label: "Pertalite" },
    { value: "Premium", label: "Premium" },
    { value: "Biosolar", label: "Biosolar" },
  ];

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const { fetchDataByPlant, SHEETS } = await import("@/services/api");
        const result = await fetchDataByPlant<Perta>(SHEETS.PERTA);
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

  // Auto calculate volume akhir
  useEffect(() => {
    const volumeAkhir =
      (form.volumeAwal || 0) +
      (form.volumePengisian || 0) -
      (form.volumePemakaian || 0);
    setForm((prev) => ({
      ...prev,
      volumeAkhir: volumeAkhir > 0 ? volumeAkhir : 0,
    }));
  }, [form.volumeAwal, form.volumePengisian, form.volumePemakaian]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { saveDataByPlant, updateDataByPlant, SHEETS } = await import(
        "@/services/api"
      );
      const plant = user?.plant === "ALL" ? "NPK2" : user?.plant;

      if (editingId) {
        const dataToUpdate = { ...form, id: editingId, _plant: plant };
        const updateResult = await updateDataByPlant<Perta>(
          SHEETS.PERTA,
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
        const createResult = await saveDataByPlant<Perta>(
          SHEETS.PERTA,
          newData
        );
        if (createResult.success && createResult.data) {
          const newItem: Perta = {
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

  const handleEdit = (item: Perta) => {
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
        type: "PERTA" as const,
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

      const deleteResult = await deleteDataByPlant(SHEETS.PERTA, {
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
    // Get last volume akhir as volume awal
    const lastEntry = data[0];
    setForm({
      ...initialFormState,
      volumeAwal: lastEntry?.volumeAkhir || 0,
    });
    setEditingId(null);
    setShowForm(true);
  };

  const filteredData = data.filter((item) => {
    const matchesSearch =
      item.tanggal?.includes(searchTerm) ||
      item.jenisBBM?.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesPlant = plantFilter === "ALL" || item._plant === plantFilter;

    return matchesSearch && matchesPlant;
  });

  const totals = filteredData.reduce(
    (acc, item) => ({
      pengisian: acc.pengisian + (item.volumePengisian || 0),
      pemakaian: acc.pemakaian + (item.volumePemakaian || 0),
    }),
    { pengisian: 0, pemakaian: 0 }
  );

  const latestStock = filteredData[0]?.volumeAkhir || 0;

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
      key: "jenisBBM",
      header: "Jenis BBM",
      render: (value: unknown) => (
        <div className="flex items-center gap-2">
          <Droplets className="h-4 w-4 text-amber-500" />
          <span className="font-medium">{value as string}</span>
        </div>
      ),
    },
    {
      key: "volumeAwal",
      header: "Vol. Awal (L)",
      render: (value: unknown) => formatNumber(parseNumber(value)),
    },
    {
      key: "volumePengisian",
      header: "Pengisian (L)",
      render: (value: unknown) => (
        <span className="text-green-600 font-semibold">
          +{formatNumber(parseNumber(value))}
        </span>
      ),
    },
    {
      key: "volumePemakaian",
      header: "Pemakaian (L)",
      render: (value: unknown) => (
        <span className="text-red-600 font-semibold">
          -{formatNumber(parseNumber(value))}
        </span>
      ),
    },
    {
      key: "volumeAkhir",
      header: "Vol. Akhir (L)",
      render: (value: unknown) => (
        <span className="font-bold text-dark-900">
          {formatNumber(parseNumber(value))}
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
            Data Perta (BBM)
          </h1>
          <p className="text-dark-500 mt-1">
            Kelola data pemakaian bahan bakar
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* Filter plant hanya tampil untuk admin */}
          {user?.plant === "ALL" && (
            <Select
              value={plantFilter}
              onChange={(e) => setPlantFilter(e.target.value as PlantType)}
              options={[
                { value: "ALL", label: "Semua Plant" },
                { value: "NPK1", label: "NPK 1" },
                { value: "NPK2", label: "NPK 2" },
              ]}
              className="w-40"
            />
          )}
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
        <Card className="p-4 bg-gradient-to-br from-amber-50 to-orange-50 border-amber-200">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-amber-100 rounded-lg">
              <Droplets className="h-5 w-5 text-amber-600" />
            </div>
            <div>
              <p className="text-sm text-dark-500">Stock Saat Ini</p>
              <p className="text-2xl font-bold text-amber-600">
                {formatNumber(latestStock)} L
              </p>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-100 rounded-lg">
              <Droplets className="h-5 w-5 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-dark-500">Total Pengisian</p>
              <p className="text-2xl font-bold text-green-600">
                +{formatNumber(totals.pengisian)} L
              </p>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-red-100 rounded-lg">
              <Droplets className="h-5 w-5 text-red-600" />
            </div>
            <div>
              <p className="text-sm text-dark-500">Total Pemakaian</p>
              <p className="text-2xl font-bold text-red-600">
                -{formatNumber(totals.pemakaian)} L
              </p>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-dark-100 rounded-lg">
              <Droplets className="h-5 w-5 text-dark-600" />
            </div>
            <div>
              <p className="text-sm text-dark-500">Jumlah Entry</p>
              <p className="text-2xl font-bold text-dark-900">
                {filteredData.length}
              </p>
            </div>
          </div>
        </Card>
      </div>

      {/* Data Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Data Pemakaian BBM</CardTitle>
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
        title={editingId ? "Edit Data BBM" : "Tambah Data BBM"}
        size="md"
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
          </div>

          <Select
            label="Jenis BBM"
            value={form.jenisBBM}
            onChange={(e) =>
              setForm((prev) => ({ ...prev, jenisBBM: e.target.value }))
            }
            options={jenisBBMOptions}
            required
          />

          <Input
            label="Volume Awal (Liter)"
            type="number"
            value={form.volumeAwal || ""}
            onChange={(e) =>
              setForm((prev) => ({
                ...prev,
                volumeAwal: parseFloat(e.target.value) || 0,
              }))
            }
            placeholder="0"
            required
          />

          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Volume Pengisian (Liter)"
              type="number"
              value={form.volumePengisian || ""}
              onChange={(e) =>
                setForm((prev) => ({
                  ...prev,
                  volumePengisian: parseFloat(e.target.value) || 0,
                }))
              }
              placeholder="0"
            />
            <Input
              label="Volume Pemakaian (Liter)"
              type="number"
              value={form.volumePemakaian || ""}
              onChange={(e) =>
                setForm((prev) => ({
                  ...prev,
                  volumePemakaian: parseFloat(e.target.value) || 0,
                }))
              }
              placeholder="0"
              required
            />
          </div>

          <div className="p-4 bg-gradient-to-r from-amber-50 to-orange-50 rounded-xl border border-amber-200">
            <div className="flex items-center justify-between">
              <span className="text-dark-600 font-medium">Volume Akhir:</span>
              <span className="text-2xl font-bold text-amber-600">
                {formatNumber(form.volumeAkhir || 0)} Liter
              </span>
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

      <ApprovalDialog
        isOpen={showApprovalDialog}
        onClose={() => {
          setShowApprovalDialog(false);
          setPendingEditItem(null);
          setDeleteId(null);
        }}
        onSubmit={handleApprovalSubmit}
        action={approvalAction}
        itemName="data perta"
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

export default PertaPage;
