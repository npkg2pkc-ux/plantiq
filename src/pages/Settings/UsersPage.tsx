import { useState, useEffect } from "react";
import {
  Plus,
  Edit2,
  Trash2,
  Search,
  Users,
  Shield,
  UserCheck,
  UserX,
} from "lucide-react";
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
} from "@/components/ui";
import { useAuthStore } from "@/stores";
import { formatDate } from "@/lib/utils";
import type { User, PlantType } from "@/types";

const initialFormState: User = {
  username: "",
  nama: "",
  namaLengkap: "",
  email: "",
  password: "",
  role: "user",
  plant: "NPK2",
  status: "active",
};

const UsersPage = () => {
  const { user } = useAuthStore();
  const [data, setData] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [form, setForm] = useState<User>(initialFormState);
  const [searchTerm, setSearchTerm] = useState("");
  const [roleFilter, setRoleFilter] = useState("ALL");

  const roleOptions = [
    { value: "admin", label: "Admin" },
    { value: "supervisor", label: "Supervisor" },
    { value: "user", label: "User" },
    { value: "avp", label: "AVP" },
    { value: "manager", label: "Manager" },
    { value: "eksternal", label: "Eksternal" },
  ];

  const plantOptions = [
    { value: "NPK1", label: "NPK 1" },
    { value: "NPK2", label: "NPK 2" },
    { value: "ALL", label: "Semua Plant" },
  ];

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const { readData, SHEETS } = await import("@/services/api");
        const result = await readData<User>(SHEETS.USERS);
        if (result.success && result.data) {
          const sortedData = [...result.data].sort((a, b) =>
            (a.nama || "").localeCompare(b.nama || "")
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
      const { createData, updateData, SHEETS } = await import("@/services/api");

      // Prepare data with proper field mapping
      const preparedData = {
        ...form,
        username: form.username || form.email?.split("@")[0] || "",
        namaLengkap: form.namaLengkap || form.nama || "",
      };

      // Remove password if empty (for update)
      if (editingId && !preparedData.password) {
        delete preparedData.password;
      }

      if (editingId) {
        const dataToUpdate = {
          ...preparedData,
          id: editingId,
          updatedAt: new Date().toISOString(),
        };
        const updateResult = await updateData<User>(SHEETS.USERS, dataToUpdate);
        if (updateResult.success) {
          setData((prev) =>
            prev.map((item) =>
              item.id === editingId
                ? {
                    ...preparedData,
                    id: editingId,
                    updatedAt: new Date().toISOString(),
                  }
                : item
            )
          );
        } else {
          throw new Error(updateResult.error || "Gagal mengupdate data");
        }
      } else {
        const newData = {
          ...preparedData,
          createdAt: new Date().toISOString(),
        };
        const createResult = await createData<User>(SHEETS.USERS, newData);
        if (createResult.success && createResult.data) {
          const newItem: User = {
            ...newData,
            ...createResult.data,
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

  const handleEdit = (item: User) => {
    setForm({
      ...item,
      password: "",
      namaLengkap: item.namaLengkap || item.nama || "",
    });
    setEditingId(item.id || null);
    setShowForm(true);
  };

  const handleDelete = (id: string) => {
    setDeleteId(id);
    setShowDeleteConfirm(true);
  };

  const confirmDelete = async () => {
    if (!deleteId) return;

    setLoading(true);
    try {
      const { deleteData, SHEETS } = await import("@/services/api");
      const deleteResult = await deleteData(SHEETS.USERS, deleteId);
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

  const toggleStatus = async (id: string) => {
    const item = data.find((u) => u.id === id);
    if (!item) return;

    try {
      const { updateData, SHEETS } = await import("@/services/api");
      const newStatus = item.status === "active" ? "inactive" : "active";
      const dataToUpdate = { ...item, status: newStatus };
      const updateResult = await updateData<User>(SHEETS.USERS, dataToUpdate);
      if (updateResult.success) {
        setData((prev) =>
          prev.map((u) => (u.id === id ? { ...u, status: newStatus } : u))
        );
      } else {
        throw new Error(updateResult.error || "Gagal mengupdate status");
      }
    } catch (error) {
      console.error("Error toggling status:", error);
      alert(
        error instanceof Error
          ? error.message
          : "Terjadi kesalahan saat mengubah status"
      );
    }
  };

  const openAddForm = () => {
    setForm(initialFormState);
    setEditingId(null);
    setShowForm(true);
  };

  const filteredData = data.filter((item) => {
    const matchesSearch =
      item.nama?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.namaLengkap?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.username?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.email?.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesRole = roleFilter === "ALL" || item.role === roleFilter;

    return matchesSearch && matchesRole;
  });

  const getRoleBadge = (role: string) => {
    switch (role) {
      case "admin":
        return "danger";
      case "supervisor":
        return "primary";
      case "manager":
        return "info";
      case "avp":
        return "success";
      case "eksternal":
        return "warning";
      default:
        return "primary";
    }
  };

  const columns = [
    {
      key: "nama",
      header: "User",
      render: (value: unknown, row: User) => (
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary-500 to-primary-700 flex items-center justify-center text-white font-semibold">
            {(row.namaLengkap || row.nama || row.username || "U")
              ?.charAt(0)
              .toUpperCase()}
          </div>
          <div>
            <p className="font-medium text-dark-900">
              {row.namaLengkap || row.nama || row.username}
            </p>
            <p className="text-sm text-dark-500">
              @{row.username} • {row.email}
            </p>
          </div>
        </div>
      ),
    },
    {
      key: "role",
      header: "Role",
      render: (value: unknown) => (
        <Badge variant={getRoleBadge(value as string)}>
          <Shield className="h-3 w-3 mr-1" />
          {(value as string).toUpperCase()}
        </Badge>
      ),
    },
    {
      key: "plant",
      header: "Plant",
      render: (value: unknown) => (
        <Badge variant="info">{value as string}</Badge>
      ),
    },
    {
      key: "status",
      header: "Status",
      render: (value: unknown, row: User) => (
        <button
          onClick={(e) => {
            e.stopPropagation();
            toggleStatus(row.id!);
          }}
          className="flex items-center gap-2"
        >
          {value === "active" ? (
            <Badge variant="success">
              <UserCheck className="h-3 w-3 mr-1" />
              Active
            </Badge>
          ) : (
            <Badge variant="danger">
              <UserX className="h-3 w-3 mr-1" />
              Inactive
            </Badge>
          )}
        </button>
      ),
    },
    {
      key: "createdAt",
      header: "Dibuat",
      render: (value: unknown) => formatDate(value as string),
    },
  ];

  const isAdmin = user?.role === "admin";
  const activeUsers = filteredData.filter((u) => u.status === "active").length;
  const inactiveUsers = filteredData.filter(
    (u) => u.status === "inactive"
  ).length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-display font-bold text-dark-900">
            Manajemen User
          </h1>
          <p className="text-dark-500 mt-1">Kelola pengguna sistem</p>
        </div>

        <div className="flex items-center gap-3">
          <Select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            options={[{ value: "ALL", label: "Semua Role" }, ...roleOptions]}
            className="w-40"
          />
          {isAdmin && (
            <Button onClick={openAddForm}>
              <Plus className="h-4 w-4 mr-2" />
              Tambah User
            </Button>
          )}
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-primary-100 rounded-xl">
              <Users className="h-6 w-6 text-primary-600" />
            </div>
            <div>
              <p className="text-sm text-dark-500">Total Users</p>
              <p className="text-2xl font-bold text-dark-900">
                {filteredData.length}
              </p>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-green-100 rounded-xl">
              <UserCheck className="h-6 w-6 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-dark-500">Active Users</p>
              <p className="text-2xl font-bold text-green-600">{activeUsers}</p>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-red-100 rounded-xl">
              <UserX className="h-6 w-6 text-red-600" />
            </div>
            <div>
              <p className="text-sm text-dark-500">Inactive Users</p>
              <p className="text-2xl font-bold text-red-600">{inactiveUsers}</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Data Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Daftar User</CardTitle>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-dark-400" />
              <Input
                type="text"
                placeholder="Cari user..."
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
            isAdmin
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
        title={editingId ? "Edit User" : "Tambah User Baru"}
        size="md"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="Username"
            type="text"
            value={form.username}
            onChange={(e) =>
              setForm((prev) => ({ ...prev, username: e.target.value }))
            }
            placeholder="Username untuk login"
            required
            disabled={!!editingId}
          />

          <Input
            label="Nama Lengkap"
            type="text"
            value={form.namaLengkap}
            onChange={(e) =>
              setForm((prev) => ({
                ...prev,
                namaLengkap: e.target.value,
                nama: e.target.value,
              }))
            }
            placeholder="Nama lengkap"
            required
          />

          <Input
            label="Email"
            type="email"
            value={form.email}
            onChange={(e) =>
              setForm((prev) => ({ ...prev, email: e.target.value }))
            }
            placeholder="email@example.com"
            required
          />

          <Input
            label={
              editingId
                ? "Password Baru (kosongkan jika tidak diubah)"
                : "Password"
            }
            type="password"
            value={form.password}
            onChange={(e) =>
              setForm((prev) => ({ ...prev, password: e.target.value }))
            }
            placeholder="••••••••"
            required={!editingId}
          />

          <div className="grid grid-cols-2 gap-4">
            <Select
              label="Role"
              value={form.role}
              onChange={(e) =>
                setForm((prev) => ({
                  ...prev,
                  role: e.target.value as User["role"],
                }))
              }
              options={roleOptions}
              required
            />
            <Select
              label="Plant"
              value={form.plant}
              onChange={(e) =>
                setForm((prev) => ({
                  ...prev,
                  plant: e.target.value as PlantType,
                }))
              }
              options={plantOptions}
              required
            />
          </div>

          <Select
            label="Status"
            value={form.status}
            onChange={(e) =>
              setForm((prev) => ({
                ...prev,
                status: e.target.value as User["status"],
              }))
            }
            options={[
              { value: "active", label: "Active" },
              { value: "inactive", label: "Inactive" },
            ]}
            required
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
        title="Hapus User"
        message="Apakah Anda yakin ingin menghapus user ini? Tindakan ini tidak dapat dibatalkan."
        confirmText="Hapus"
        variant="danger"
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

export default UsersPage;
