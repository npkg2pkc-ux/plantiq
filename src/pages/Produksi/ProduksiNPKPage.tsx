import { useState, useEffect } from "react";
import { Plus, Edit2, Trash2, Printer, Search } from "lucide-react";
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
  formatNumber,
  parseNumber,
  canAdd,
  canEditDirect,
  canDeleteDirect,
  needsApprovalForEdit,
  needsApprovalForDelete,
  isViewOnly,
  getCurrentDate,
  sendNotification,
} from "@/lib/utils";
import type { ProduksiNPK } from "@/types";

// Initial form state
const initialFormState: ProduksiNPK = {
  tanggal: getCurrentDate(),
  shiftMalamOnspek: 0,
  shiftMalamOffspek: 0,
  shiftPagiOnspek: 0,
  shiftPagiOffspek: 0,
  shiftSoreOnspek: 0,
  shiftSoreOffspek: 0,
  totalOnspek: 0,
  totalOffspek: 0,
  total: 0,
};

interface ProduksiNPKPageProps {
  plant: "NPK1" | "NPK2";
}

const ProduksiNPKPage = ({ plant }: ProduksiNPKPageProps) => {
  const { user } = useAuthStore();
  const [data, setData] = useState<ProduksiNPK[]>([]);
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [form, setForm] = useState<ProduksiNPK>(initialFormState);
  const [searchTerm, setSearchTerm] = useState("");

  // Approval states
  const [showApprovalDialog, setShowApprovalDialog] = useState(false);
  const [approvalAction, setApprovalAction] = useState<"edit" | "delete">(
    "edit"
  );
  const [pendingEditItem, setPendingEditItem] = useState<ProduksiNPK | null>(
    null
  );

  // Permission checks
  const userRole = user?.role || "";
  const userCanAdd = canAdd(userRole);
  const userCanEditDirect = canEditDirect(userRole);
  const userCanDeleteDirect = canDeleteDirect(userRole);
  const userNeedsApprovalEdit = needsApprovalForEdit(userRole);
  const userNeedsApprovalDelete = needsApprovalForDelete(userRole);
  const userIsViewOnly = isViewOnly(userRole);

  // Fetch data from API
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const { readData, SHEETS, getSheetNameByPlant } = await import(
          "@/services/api"
        );
        const sheetName = getSheetNameByPlant(SHEETS.PRODUKSI_NPK, plant);
        const result = await readData<ProduksiNPK>(sheetName);
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
  }, [plant]);

  // Auto calculate totals
  useEffect(() => {
    const totalOnspek =
      (form.shiftMalamOnspek || 0) +
      (form.shiftPagiOnspek || 0) +
      (form.shiftSoreOnspek || 0);
    const totalOffspek =
      (form.shiftMalamOffspek || 0) +
      (form.shiftPagiOffspek || 0) +
      (form.shiftSoreOffspek || 0);
    setForm((prev) => ({
      ...prev,
      totalOnspek,
      totalOffspek,
      total: totalOnspek + totalOffspek,
    }));
  }, [
    form.shiftMalamOnspek,
    form.shiftMalamOffspek,
    form.shiftPagiOnspek,
    form.shiftPagiOffspek,
    form.shiftSoreOnspek,
    form.shiftSoreOffspek,
  ]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { createData, updateData, SHEETS, getSheetNameByPlant } =
        await import("@/services/api");
      const sheetName = getSheetNameByPlant(SHEETS.PRODUKSI_NPK, plant);

      if (editingId) {
        // Update existing
        const updateResult = await updateData<ProduksiNPK>(sheetName, {
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
          // Send notification (user who updates won't receive)
          sendNotification({
            message: `Data Produksi NPK (${plant}) tanggal ${formatDate(
              form.tanggal
            )} telah diupdate oleh ${user?.namaLengkap || user?.nama}`,
            fromUser: user?.username || "",
            fromPlant: plant,
          });
        } else {
          throw new Error(updateResult.error || "Gagal mengupdate data");
        }
      } else {
        // Add new
        const newData = { ...form, _plant: plant };
        const createResult = await createData<ProduksiNPK>(sheetName, newData);
        if (createResult.success && createResult.data) {
          const newItem: ProduksiNPK = {
            ...createResult.data,
            _plant: plant,
          };
          setData((prev) => [newItem, ...prev]);
          // Send notification (user who creates won't receive)
          sendNotification({
            message: `Data Produksi NPK (${plant}) baru ditambahkan oleh ${
              user?.namaLengkap || user?.nama
            } - Total: ${formatNumber(form.total)} ton`,
            fromUser: user?.username || "",
            fromPlant: plant,
          });
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

  const handleEdit = (item: ProduksiNPK) => {
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
          targetSheet: `PRODUKSI_NPK_${plant}`,
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
      const sheetName = getSheetNameByPlant(SHEETS.PRODUKSI_NPK, plant);
      const deletedItem = data.find((item) => item.id === deleteId);

      const deleteResult = await deleteData(sheetName, deleteId);
      if (deleteResult.success) {
        setData((prev) => prev.filter((item) => item.id !== deleteId));
        setShowDeleteConfirm(false);
        setDeleteId(null);
        setShowSuccess(true);
        setTimeout(() => setShowSuccess(false), 2000);
        // Send notification (user who deletes won't receive)
        if (deletedItem) {
          sendNotification({
            message: `Data Produksi NPK (${plant}) tanggal ${formatDate(
              deletedItem.tanggal
            )} telah dihapus oleh ${user?.namaLengkap || user?.nama}`,
            fromUser: user?.username || "",
            fromPlant: plant,
          });
        }
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

  const columns = [
    {
      key: "tanggal",
      header: "Tanggal",
      sortable: true,
      render: (value: unknown) => formatDate(value as string),
    },
    {
      key: "shiftMalamOnspek",
      header: "Malam Onspek",
      render: (value: unknown) => formatNumber(parseNumber(value)),
    },
    {
      key: "shiftMalamOffspek",
      header: "Malam Offspek",
      render: (value: unknown) => formatNumber(parseNumber(value)),
    },
    {
      key: "shiftPagiOnspek",
      header: "Pagi Onspek",
      render: (value: unknown) => formatNumber(parseNumber(value)),
    },
    {
      key: "shiftPagiOffspek",
      header: "Pagi Offspek",
      render: (value: unknown) => formatNumber(parseNumber(value)),
    },
    {
      key: "shiftSoreOnspek",
      header: "Sore Onspek",
      render: (value: unknown) => formatNumber(parseNumber(value)),
    },
    {
      key: "shiftSoreOffspek",
      header: "Sore Offspek",
      render: (value: unknown) => formatNumber(parseNumber(value)),
    },
    {
      key: "total",
      header: "Total",
      render: (value: unknown) => (
        <span className="font-semibold text-primary-600">
          {formatNumber(parseNumber(value))}
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
              Produksi NPK Granul
            </h1>
            <Badge variant={plant === "NPK1" ? "primary" : "success"}>
              {plant}
            </Badge>
          </div>
          <p className="text-dark-500 mt-1">
            Kelola data produksi NPK Granul untuk {plant}
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Button variant="secondary" size="sm">
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

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="p-4">
          <p className="text-sm text-dark-500">Total Onspek</p>
          <p className="text-2xl font-bold text-primary-600">
            {formatNumber(
              data.reduce((sum, item) => sum + parseNumber(item.totalOnspek), 0)
            )}
          </p>
        </Card>
        <Card className="p-4">
          <p className="text-sm text-dark-500">Total Offspek</p>
          <p className="text-2xl font-bold text-red-600">
            {formatNumber(
              data.reduce(
                (sum, item) => sum + parseNumber(item.totalOffspek),
                0
              )
            )}
          </p>
        </Card>
        <Card className="p-4">
          <p className="text-sm text-dark-500">Total Produksi</p>
          <p className="text-2xl font-bold text-dark-900">
            {formatNumber(
              data.reduce((sum, item) => sum + parseNumber(item.total), 0)
            )}
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
            <CardTitle>Data Produksi</CardTitle>
            <div className="flex items-center gap-3">
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
          </div>
        </CardHeader>
        <DataTable
          data={data.filter(
            (item) =>
              item.tanggal?.includes(searchTerm) ||
              item.total?.toString().includes(searchTerm)
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
        title={editingId ? "Edit Data Produksi" : "Tambah Data Produksi"}
        size="lg"
      >
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <Input
              label="Tanggal"
              type="date"
              value={form.tanggal}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, tanggal: e.target.value }))
              }
              required
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-4">
              <h4 className="font-medium text-dark-700 border-b pb-2">
                Shift Malam
              </h4>
              <Input
                label="Onspek (Ton)"
                type="number"
                value={form.shiftMalamOnspek}
                onChange={(e) =>
                  setForm((prev) => ({
                    ...prev,
                    shiftMalamOnspek: Number(e.target.value),
                  }))
                }
                min="0"
                step="0.01"
              />
              <Input
                label="Offspek (Ton)"
                type="number"
                value={form.shiftMalamOffspek}
                onChange={(e) =>
                  setForm((prev) => ({
                    ...prev,
                    shiftMalamOffspek: Number(e.target.value),
                  }))
                }
                min="0"
                step="0.01"
              />
            </div>

            <div className="space-y-4">
              <h4 className="font-medium text-dark-700 border-b pb-2">
                Shift Pagi
              </h4>
              <Input
                label="Onspek (Ton)"
                type="number"
                value={form.shiftPagiOnspek}
                onChange={(e) =>
                  setForm((prev) => ({
                    ...prev,
                    shiftPagiOnspek: Number(e.target.value),
                  }))
                }
                min="0"
                step="0.01"
              />
              <Input
                label="Offspek (Ton)"
                type="number"
                value={form.shiftPagiOffspek}
                onChange={(e) =>
                  setForm((prev) => ({
                    ...prev,
                    shiftPagiOffspek: Number(e.target.value),
                  }))
                }
                min="0"
                step="0.01"
              />
            </div>

            <div className="space-y-4">
              <h4 className="font-medium text-dark-700 border-b pb-2">
                Shift Sore
              </h4>
              <Input
                label="Onspek (Ton)"
                type="number"
                value={form.shiftSoreOnspek}
                onChange={(e) =>
                  setForm((prev) => ({
                    ...prev,
                    shiftSoreOnspek: Number(e.target.value),
                  }))
                }
                min="0"
                step="0.01"
              />
              <Input
                label="Offspek (Ton)"
                type="number"
                value={form.shiftSoreOffspek}
                onChange={(e) =>
                  setForm((prev) => ({
                    ...prev,
                    shiftSoreOffspek: Number(e.target.value),
                  }))
                }
                min="0"
                step="0.01"
              />
            </div>

            <div className="space-y-4">
              <h4 className="font-medium text-dark-700 border-b pb-2">
                Total (Auto)
              </h4>
              <div className="p-4 bg-dark-50 rounded-xl">
                <div className="flex justify-between mb-2">
                  <span className="text-dark-500">Total Onspek:</span>
                  <span className="font-semibold text-primary-600">
                    {formatNumber(form.totalOnspek || 0)} Ton
                  </span>
                </div>
                <div className="flex justify-between mb-2">
                  <span className="text-dark-500">Total Offspek:</span>
                  <span className="font-semibold text-red-600">
                    {formatNumber(form.totalOffspek || 0)} Ton
                  </span>
                </div>
                <div className="flex justify-between pt-2 border-t">
                  <span className="font-medium text-dark-700">Total:</span>
                  <span className="font-bold text-dark-900">
                    {formatNumber(form.total || 0)} Ton
                  </span>
                </div>
              </div>
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
        message="Apakah Anda yakin ingin menghapus data ini? Tindakan ini tidak dapat dibatalkan."
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
        message={
          editingId ? "Data berhasil diupdate!" : "Data berhasil disimpan!"
        }
        onClose={() => setShowSuccess(false)}
      />
    </div>
  );
};

export default ProduksiNPKPage;
