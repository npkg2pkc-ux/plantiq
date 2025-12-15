import { useState, useEffect } from "react";
import { Plus, Edit2, Trash2, Printer, Search } from "lucide-react";
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
  formatTime,
  parseNumber,
  canAdd,
  needsApprovalForEdit,
  needsApprovalForDelete,
  isViewOnly,
  getCurrentDate,
  calculateJamGrounded,
} from "@/lib/utils";
import type { TimesheetForklift } from "@/types";

const initialFormState: TimesheetForklift = {
  tanggal: getCurrentDate(),
  forklift: "",
  deskripsiTemuan: "",
  jamOff: "",
  jamStart: "",
  jamGrounded: 0,
  jamOperasi: 0,
  keterangan: "",
};

interface TimesheetForkliftPageProps {
  plant: "NPK1" | "NPK2";
}

const TimesheetForkliftPage = ({ plant }: TimesheetForkliftPageProps) => {
  const { user } = useAuthStore();
  const [data, setData] = useState<TimesheetForklift[]>([]);
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [form, setForm] = useState<TimesheetForklift>(initialFormState);
  const [searchTerm, setSearchTerm] = useState("");

  // Approval states
  const [showApprovalDialog, setShowApprovalDialog] = useState(false);
  const [approvalAction, setApprovalAction] = useState<"edit" | "delete">(
    "edit"
  );
  const [pendingEditItem, setPendingEditItem] =
    useState<TimesheetForklift | null>(null);

  // Permission checks
  const userRole = user?.role || "";
  const userCanAdd = canAdd(userRole);
  const userNeedsApprovalEdit = needsApprovalForEdit(userRole);
  const userNeedsApprovalDelete = needsApprovalForDelete(userRole);
  const userIsViewOnly = isViewOnly(userRole);

  const forkliftOptions = [
    { value: "F19", label: "F19" },
    { value: "F20", label: "F20" },
    { value: "F21", label: "F21" },
    { value: "F22", label: "F22" },
    { value: "F23", label: "F23" },
    { value: "ALL", label: "Semua Forklift" },
  ];

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const { readData, SHEETS, getSheetNameByPlant } = await import(
          "@/services/api"
        );
        const sheetName = getSheetNameByPlant(SHEETS.TIMESHEET_FORKLIFT, plant);
        const result = await readData<TimesheetForklift>(sheetName);
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

  // Auto calculate jam grounded dan operasi
  // Jam Operasi = 20 - Jam Grounded
  // Keterangan: Grounded <= 2 jam = Operasi, Grounded >= 3 jam = Grounded
  useEffect(() => {
    if (form.jamOff && form.jamStart) {
      const grounded = calculateJamGrounded(form.jamOff, form.jamStart);
      const operasi = Math.max(0, 20 - grounded);
      setForm((prev) => ({
        ...prev,
        jamGrounded: grounded,
        jamOperasi: operasi,
        keterangan: grounded <= 2 ? "Operasi" : "Grounded",
      }));
    }
  }, [form.jamOff, form.jamStart]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { createData, updateData, SHEETS, getSheetNameByPlant } =
        await import("@/services/api");
      const sheetName = getSheetNameByPlant(SHEETS.TIMESHEET_FORKLIFT, plant);

      // Jika pilih ALL, buat entry untuk semua forklift
      if (form.forklift === "ALL" && !editingId) {
        const forklifts = ["F19", "F20", "F21", "F22", "F23"];
        for (const fl of forklifts) {
          const newData = { ...form, forklift: fl, _plant: plant };
          await createData<TimesheetForklift>(sheetName, newData);
        }
        // Refresh data from API
        const { readData } = await import("@/services/api");
        const result = await readData<TimesheetForklift>(sheetName);
        if (result.success && result.data) {
          const sortedData = result.data
            .map((item) => ({ ...item, _plant: plant }))
            .sort(
              (a, b) =>
                new Date(b.tanggal).getTime() - new Date(a.tanggal).getTime()
            );
          setData(sortedData);
        }
      } else if (editingId) {
        const dataToUpdate = { ...form, id: editingId, _plant: plant };
        const updateResult = await updateData<TimesheetForklift>(
          sheetName,
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
        const createResult = await createData<TimesheetForklift>(
          sheetName,
          newData
        );
        if (createResult.success && createResult.data) {
          const newItem: TimesheetForklift = {
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

  const handleEdit = (item: TimesheetForklift) => {
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
          targetSheet: "TIMESHEET_FORKLIFT",
          targetId: pendingEditItem.id,
          targetData: JSON.stringify(pendingEditItem),
          reason: reason,
          status: "pending",
          requestedAt: new Date().toISOString(),
        },
      };

      await fetch(API_URL, {
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
      const sheetName = getSheetNameByPlant(SHEETS.TIMESHEET_FORKLIFT, plant);

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
    setShowForm(true);
  };

  const filteredData = data.filter((item) => {
    const matchesSearch =
      item.tanggal?.includes(searchTerm) ||
      item.forklift?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.deskripsiTemuan?.toLowerCase().includes(searchTerm.toLowerCase());

    return matchesSearch;
  });

  const columns = [
    {
      key: "tanggal",
      header: "Tanggal",
      sortable: true,
      render: (value: unknown) => formatDate(value as string),
    },
    {
      key: "forklift",
      header: "Forklift",
      render: (value: unknown) => (
        <Badge variant="primary">{value as string}</Badge>
      ),
    },
    { key: "deskripsiTemuan", header: "Deskripsi Temuan" },
    {
      key: "jamOff",
      header: "Jam Off",
      render: (value: unknown) => formatTime(value),
    },
    {
      key: "jamStart",
      header: "Jam Start",
      render: (value: unknown) => formatTime(value),
    },
    {
      key: "jamGrounded",
      header: "Jam Grounded",
      render: (value: unknown) => (
        <span className="font-semibold text-amber-600">
          {formatNumber(parseNumber(value as string | number))}
        </span>
      ),
    },
    {
      key: "jamOperasi",
      header: "Jam Operasi",
      render: (value: unknown) => (
        <span className="font-semibold text-secondary-600">
          {formatNumber(parseNumber(value as string | number))}
        </span>
      ),
    },
    {
      key: "keterangan",
      header: "Status",
      render: (value: unknown) => (
        <Badge variant={value === "Operasi" ? "success" : "warning"}>
          {value as string}
        </Badge>
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
              Timesheet Forklift
            </h1>
            <Badge variant={plant === "NPK1" ? "primary" : "success"}>
              {plant}
            </Badge>
          </div>
          <p className="text-dark-500 mt-1">
            Kelola data timesheet forklift harian untuk {plant}
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
          <p className="text-sm text-dark-500">Total Jam Grounded</p>
          <p className="text-2xl font-bold text-amber-600">
            {formatNumber(
              filteredData.reduce(
                (sum, item) => sum + parseNumber(item.jamGrounded),
                0
              )
            )}{" "}
            Jam
          </p>
        </Card>
        <Card className="p-4">
          <p className="text-sm text-dark-500">Total Jam Operasi</p>
          <p className="text-2xl font-bold text-secondary-600">
            {formatNumber(
              filteredData.reduce(
                (sum, item) => sum + parseNumber(item.jamOperasi),
                0
              )
            )}{" "}
            Jam
          </p>
        </Card>
        <Card className="p-4">
          <p className="text-sm text-dark-500">Forklift Aktif</p>
          <p className="text-2xl font-bold text-dark-900">
            {new Set(filteredData.map((item) => item.forklift)).size}
          </p>
        </Card>
        <Card className="p-4">
          <p className="text-sm text-dark-500">Jumlah Entry</p>
          <p className="text-2xl font-bold text-dark-900">
            {filteredData.length}
          </p>
        </Card>
      </div>

      {/* Data Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Data Timesheet Forklift</CardTitle>
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
          editingId ? "Edit Timesheet Forklift" : "Tambah Timesheet Forklift"
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
            label="Forklift"
            value={form.forklift}
            onChange={(e) =>
              setForm((prev) => ({ ...prev, forklift: e.target.value }))
            }
            options={
              editingId
                ? forkliftOptions.filter((f) => f.value !== "ALL")
                : forkliftOptions
            }
            placeholder="Pilih forklift"
            required
          />

          <Input
            label="Deskripsi Temuan"
            type="text"
            value={form.deskripsiTemuan}
            onChange={(e) =>
              setForm((prev) => ({ ...prev, deskripsiTemuan: e.target.value }))
            }
            placeholder="Deskripsi temuan/kejadian"
          />

          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Jam Off"
              type="time"
              value={form.jamOff}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, jamOff: e.target.value }))
              }
              required
            />
            <Input
              label="Jam Start"
              type="time"
              value={form.jamStart}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, jamStart: e.target.value }))
              }
              required
            />
          </div>

          <div className="p-4 bg-dark-50 rounded-xl space-y-2">
            <div className="flex justify-between">
              <span className="text-dark-500">Jam Grounded:</span>
              <span className="font-semibold text-amber-600">
                {formatNumber(form.jamGrounded || 0)} Jam
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-dark-500">Jam Operasi:</span>
              <span className="font-semibold text-secondary-600">
                {formatNumber(form.jamOperasi || 0)} Jam
              </span>
            </div>
            <div className="flex justify-between pt-2 border-t">
              <span className="text-dark-700 font-medium">Status:</span>
              <Badge
                variant={form.keterangan === "Operasi" ? "success" : "warning"}
              >
                {form.keterangan || "-"}
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
        action={approvalAction}
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

export default TimesheetForkliftPage;
