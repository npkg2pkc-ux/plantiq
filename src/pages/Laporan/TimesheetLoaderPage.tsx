import { useState, useEffect, useCallback } from "react";
import { Plus, Edit2, Trash2, Printer, Search } from "lucide-react";
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
  PrintModal,
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
import type { TimesheetLoader } from "@/types";

const initialFormState: TimesheetLoader = {
  tanggal: getCurrentDate(),
  shift: "Malam",
  deskripsiTemuan: "",
  jamOff: "",
  jamStart: "",
  jamGrounded: 0,
  jamOperasi: 0,
  keterangan: "",
};

interface TimesheetLoaderPageProps {
  plant: "NPK1" | "NPK2";
}

// Shift options
const shiftOptions = [
  { value: "Malam", label: "Malam" },
  { value: "Pagi", label: "Pagi" },
  { value: "Sore", label: "Sore" },
  { value: "ALL", label: "Semua Shift" },
];

// Get working hours per shift
const getShiftHours = (shift: string): number => {
  if (shift === "Malam") return 8;
  return 7; // Pagi and Sore = 7 hours
};

const TimesheetLoaderPage = ({ plant }: TimesheetLoaderPageProps) => {
  const { user } = useAuthStore();
  const [data, setData] = useState<TimesheetLoader[]>([]);
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [showPrintModal, setShowPrintModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [form, setForm] = useState<TimesheetLoader>(initialFormState);
  const [searchTerm, setSearchTerm] = useState("");

  // Approval states
  const [showApprovalDialog, setShowApprovalDialog] = useState(false);
  const [approvalAction, setApprovalAction] = useState<"edit" | "delete">(
    "edit"
  );
  const [pendingEditItem, setPendingEditItem] =
    useState<TimesheetLoader | null>(null);

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

  const userNeedsApprovalEdit = needsApprovalForEdit(userRole);
  const userNeedsApprovalDelete = needsApprovalForDelete(userRole);
  const userIsViewOnly = isViewOnly(userRole);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const { readData, SHEETS, getSheetNameByPlant } = await import(
          "@/services/api"
        );
        const sheetName = getSheetNameByPlant(SHEETS.TIMESHEET_LOADER, plant);
        const result = await readData<TimesheetLoader>(sheetName);
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

  // Auto calculate jam grounded dan operasi based on shift
  // Keterangan:
  // - Shift Malam: jam operasi < 8 = Grounded, else Operasi
  // - Shift Pagi/Sore: jam operasi < 7 = Grounded, else Operasi
  useEffect(() => {
    if (form.jamOff && form.jamStart) {
      const grounded = calculateJamGrounded(form.jamOff, form.jamStart);
      const shiftHours = getShiftHours(form.shift);
      const operasi = Math.max(0, shiftHours - grounded);
      const keterangan = operasi < shiftHours ? "Grounded" : "Operasi";
      setForm((prev) => ({
        ...prev,
        jamGrounded: grounded,
        jamOperasi: operasi,
        keterangan: keterangan,
      }));
    }
  }, [form.jamOff, form.jamStart, form.shift]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { createData, updateData, SHEETS, getSheetNameByPlant } =
        await import("@/services/api");
      const sheetName = getSheetNameByPlant(SHEETS.TIMESHEET_LOADER, plant);

      // Jika pilih ALL, buat entry untuk semua shift
      if (form.shift === "ALL" && !editingId) {
        const shifts = ["Malam", "Pagi", "Sore"];
        for (const sh of shifts) {
          const shiftHours = getShiftHours(sh);
          const grounded = calculateJamGrounded(form.jamOff, form.jamStart);
          const operasi = Math.max(0, shiftHours - grounded);
          const keterangan = operasi < shiftHours ? "Grounded" : "Operasi";
          const newData = {
            ...form,
            shift: sh,
            jamGrounded: grounded,
            jamOperasi: operasi,
            keterangan: keterangan,
            _plant: plant,
          };
          await createData<TimesheetLoader>(sheetName, newData);
        }
        // Refresh data from API
        const { readData } = await import("@/services/api");
        const result = await readData<TimesheetLoader>(sheetName);
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
        const updateResult = await updateData<TimesheetLoader>(
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
        const createResult = await createData<TimesheetLoader>(
          sheetName,
          newData
        );
        if (createResult.success && createResult.data) {
          const newItem: TimesheetLoader = {
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

  const handleEdit = (item: TimesheetLoader) => {
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
          targetSheet: "TIMESHEET_LOADER",
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
      const sheetName = getSheetNameByPlant(SHEETS.TIMESHEET_LOADER, plant);

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
      item.shift?.toLowerCase().includes(searchTerm.toLowerCase()) ||
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
      key: "shift",
      header: "Shift",
      render: (value: unknown) => (
        <Badge
          variant={
            value === "Malam"
              ? "primary"
              : value === "Pagi"
              ? "success"
              : "warning"
          }
        >
          {value as string}
        </Badge>
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
              Timesheet Loader
            </h1>
            <Badge variant={plant === "NPK1" ? "primary" : "success"}>
              {plant}
            </Badge>
          </div>
          <p className="text-dark-500 mt-1">
            Kelola data timesheet loader harian untuk {plant}
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Button
            variant="secondary"
            size="sm"
            onClick={() => setShowPrintModal(true)}
          >
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
          <p className="text-sm text-dark-500">Total Shift</p>
          <p className="text-2xl font-bold text-dark-900">
            {filteredData.length}
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
            <CardTitle>Data Timesheet Loader</CardTitle>
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
        title={editingId ? "Edit Timesheet Loader" : "Tambah Timesheet Loader"}
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
            label="Shift"
            value={form.shift}
            onChange={(e) =>
              setForm((prev) => ({ ...prev, shift: e.target.value }))
            }
            options={
              editingId
                ? shiftOptions.filter((s) => s.value !== "ALL")
                : shiftOptions
            }
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

      {/* Print Modal */}
      <PrintModal
        isOpen={showPrintModal}
        onClose={() => setShowPrintModal(false)}
        title="Timesheet Loader"
        plant={plant === "NPK1" ? "NPK Plant 1" : "NPK Plant 2"}
        data={data as unknown as Record<string, unknown>[]}
        compactMode={false}
        columns={[
          {
            key: "tanggal",
            header: "Tanggal",
            render: (v) => formatDate(v as string),
            width: "75px",
          },
          { key: "shift", header: "Shift", width: "55px" },
          {
            key: "deskripsiTemuan",
            header: "Deskripsi Temuan",
            width: "auto",
          },
          {
            key: "jamOff",
            header: "Jam Off",
            render: (v) => formatTime(v as string),
            width: "55px",
          },
          {
            key: "jamStart",
            header: "Jam Start",
            render: (v) => formatTime(v as string),
            width: "60px",
          },
          {
            key: "jamGrounded",
            header: "Grounded",
            render: (v) => formatNumber(parseNumber(v)),
            align: "right",
            width: "60px",
          },
          {
            key: "jamOperasi",
            header: "Operasi",
            render: (v) => formatNumber(parseNumber(v)),
            align: "right",
            width: "55px",
          },
          { key: "keterangan", header: "Status", width: "65px" },
        ]}
        filters={{
          shift: {
            label: "Shift",
            options: shiftOptions.filter((o) => o.value !== "ALL"),
          },
        }}
        signatures={[
          { role: "mengetahui", label: "Mengetahui" },
          { role: "menyetujui", label: "Menyetujui" },
          { role: "operator", label: "Operator Loader" },
        ]}
        summaryRows={[
          {
            label: "Total Jam Grounded:",
            getValue: (d) =>
              formatNumber(
                d.reduce((s, i) => s + parseNumber(i.jamGrounded), 0)
              ) + " Jam",
          },
          {
            label: "Total Jam Operasi:",
            getValue: (d) =>
              formatNumber(
                d.reduce((s, i) => s + parseNumber(i.jamOperasi), 0)
              ) + " Jam",
          },
        ]}
      />
    </div>
  );
};

export default TimesheetLoaderPage;
