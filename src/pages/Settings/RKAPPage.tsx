import { useState, useEffect, useMemo } from "react";
import {
  Plus,
  Edit2,
  Trash2,
  Target,
  TrendingUp,
  Calendar,
} from "lucide-react";
import {
  Button,
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  Input,
  Select,
  Modal,
  ConfirmDialog,
  Badge,
  SuccessOverlay,
} from "@/components/ui";
import { useAuthStore } from "@/stores";
import { formatNumber, parseNumber } from "@/lib/utils";
import type { RKAP, PlantType, ProduksiNPK } from "@/types";

const MONTHS = [
  { key: "januari", label: "Januari" },
  { key: "februari", label: "Februari" },
  { key: "maret", label: "Maret" },
  { key: "april", label: "April" },
  { key: "mei", label: "Mei" },
  { key: "juni", label: "Juni" },
  { key: "juli", label: "Juli" },
  { key: "agustus", label: "Agustus" },
  { key: "september", label: "September" },
  { key: "oktober", label: "Oktober" },
  { key: "november", label: "November" },
  { key: "desember", label: "Desember" },
];

const initialFormState: RKAP = {
  tahun: new Date().getFullYear().toString(),
  plant: "NPK2",
  januari: 0,
  februari: 0,
  maret: 0,
  april: 0,
  mei: 0,
  juni: 0,
  juli: 0,
  agustus: 0,
  september: 0,
  oktober: 0,
  november: 0,
  desember: 0,
  total: 0,
};

const yearOptions = [
  { value: "2023", label: "2023" },
  { value: "2024", label: "2024" },
  { value: "2025", label: "2025" },
  { value: "2026", label: "2026" },
  { value: "2027", label: "2027" },
];

const RKAPPage = () => {
  const { user } = useAuthStore();
  const [data, setData] = useState<RKAP[]>([]);
  const [produksiData, setProduksiData] = useState<ProduksiNPK[]>([]);
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [form, setForm] = useState<RKAP>(initialFormState);
  const [plantFilter, setPlantFilter] = useState<PlantType>(
    user?.plant || "ALL"
  );
  const [yearFilter, setYearFilter] = useState(
    new Date().getFullYear().toString()
  );

  // Fetch RKAP and Produksi data
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const { readData, fetchDataByPlant, SHEETS } = await import(
          "@/services/api"
        );

        // Fetch RKAP data
        const rkapResult = await readData<RKAP>(SHEETS.RKAP);
        if (rkapResult.success && rkapResult.data) {
          setData(rkapResult.data);
        } else {
          setData([]);
        }

        // Fetch Produksi data for comparison
        const produksiResult = await fetchDataByPlant<ProduksiNPK>(
          SHEETS.PRODUKSI_NPK
        );
        if (produksiResult.success && produksiResult.data) {
          setProduksiData(produksiResult.data);
        } else {
          setProduksiData([]);
        }
      } catch (error) {
        console.error("Error fetching data:", error);
        setData([]);
        setProduksiData([]);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  // Calculate total when form changes
  useEffect(() => {
    const total = MONTHS.reduce((sum, month) => {
      return sum + (Number(form[month.key as keyof RKAP]) || 0);
    }, 0);
    setForm((prev) => ({ ...prev, total }));
  }, [
    form.januari,
    form.februari,
    form.maret,
    form.april,
    form.mei,
    form.juni,
    form.juli,
    form.agustus,
    form.september,
    form.oktober,
    form.november,
    form.desember,
  ]);

  // Calculate monthly production from produksiData
  const monthlyProduksi = useMemo(() => {
    const result: { [key: string]: number } = {};

    const filteredProduksi = produksiData.filter((item) => {
      const year = new Date(item.tanggal).getFullYear().toString();
      const matchesYear = year === yearFilter;
      const matchesPlant = plantFilter === "ALL" || item._plant === plantFilter;
      return matchesYear && matchesPlant;
    });

    MONTHS.forEach((month, index) => {
      const monthProduksi = filteredProduksi.filter((item) => {
        const monthIndex = new Date(item.tanggal).getMonth();
        return monthIndex === index;
      });

      result[month.key] = monthProduksi.reduce((sum, item) => {
        return (
          sum +
          (parseNumber(item.total) ||
            parseNumber(item.shiftMalamOnspek) +
              parseNumber(item.shiftMalamOffspek) +
              parseNumber(item.shiftPagiOnspek) +
              parseNumber(item.shiftPagiOffspek) +
              parseNumber(item.shiftSoreOnspek) +
              parseNumber(item.shiftSoreOffspek))
        );
      }, 0);
    });

    return result;
  }, [produksiData, yearFilter, plantFilter]);

  // Get filtered RKAP data
  const filteredRKAP = useMemo(() => {
    return data.filter((item) => {
      const matchesYear = item.tahun?.toString() === yearFilter;
      const matchesPlant = plantFilter === "ALL" || item.plant === plantFilter;
      return matchesYear && matchesPlant;
    });
  }, [data, yearFilter, plantFilter]);

  // Get current RKAP (should be one per year per plant)
  const currentRKAP = filteredRKAP[0];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { createData, updateData, SHEETS } = await import("@/services/api");

      if (editingId) {
        const dataToUpdate = { ...form, id: editingId };
        const updateResult = await updateData<RKAP>(SHEETS.RKAP, dataToUpdate);
        if (updateResult.success) {
          setData((prev) =>
            prev.map((item) =>
              item.id === editingId ? { ...form, id: editingId } : item
            )
          );
        } else {
          throw new Error(updateResult.error || "Gagal mengupdate data");
        }
      } else {
        const createResult = await createData<RKAP>(SHEETS.RKAP, form);
        if (createResult.success && createResult.data) {
          setData((prev) => [createResult.data!, ...prev]);
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

  const handleEdit = (item: RKAP) => {
    setForm(item);
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
      const deleteResult = await deleteData(SHEETS.RKAP, deleteId);
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
    setForm({
      ...initialFormState,
      tahun: yearFilter,
      plant: plantFilter === "ALL" ? "NPK2" : plantFilter,
    });
    setEditingId(null);
    setShowForm(true);
  };

  const handleMonthChange = (monthKey: string, value: string) => {
    setForm((prev) => ({
      ...prev,
      [monthKey]: parseFloat(value) || 0,
    }));
  };

  // Calculate totals
  const totalTarget = currentRKAP?.total || 0;
  const totalProduksi = Object.values(monthlyProduksi).reduce(
    (sum, val) => sum + val,
    0
  );
  const percentage =
    totalTarget > 0 ? ((totalProduksi / totalTarget) * 100).toFixed(1) : "0";

  const isAdmin =
    user?.role === "admin" || user?.role === "manager" || user?.role === "avp";
  const plantLabel =
    plantFilter === "ALL"
      ? "Semua Plant"
      : plantFilter === "NPK1"
      ? "NPK Plant 1"
      : "NPK Plant 2";

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-display font-bold text-dark-900">
            RKAP (Target Produksi)
          </h1>
          <p className="text-dark-500 mt-1">
            Rencana Kerja dan Anggaran Perusahaan - {plantLabel}
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Select
            value={yearFilter}
            onChange={(e) => setYearFilter(e.target.value)}
            options={yearOptions}
            className="w-32"
          />
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
          {isAdmin &&
            (currentRKAP ? (
              <Button onClick={() => handleEdit(currentRKAP)}>
                <Edit2 className="h-4 w-4 mr-2" />
                Edit Target
              </Button>
            ) : (
              <Button onClick={openAddForm}>
                <Plus className="h-4 w-4 mr-2" />
                Buat Target
              </Button>
            ))}
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="p-4 bg-gradient-to-br from-primary-50 to-indigo-50 border-primary-200">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-primary-100 rounded-xl">
              <Target className="h-6 w-6 text-primary-600" />
            </div>
            <div>
              <p className="text-sm text-dark-500">
                Total Target RKAP {yearFilter}
              </p>
              <p className="text-2xl font-bold text-primary-600">
                {formatNumber(totalTarget)} Ton
              </p>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-secondary-100 rounded-xl">
              <TrendingUp className="h-6 w-6 text-secondary-600" />
            </div>
            <div>
              <p className="text-sm text-dark-500">Total Realisasi</p>
              <p className="text-2xl font-bold text-secondary-600">
                {formatNumber(totalProduksi)} Ton
              </p>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div
              className={`p-3 rounded-xl ${
                Number(percentage) >= 100 ? "bg-green-100" : "bg-amber-100"
              }`}
            >
              <Calendar
                className={`h-6 w-6 ${
                  Number(percentage) >= 100
                    ? "text-green-600"
                    : "text-amber-600"
                }`}
              />
            </div>
            <div>
              <p className="text-sm text-dark-500">Pencapaian</p>
              <p
                className={`text-2xl font-bold ${
                  Number(percentage) >= 100
                    ? "text-green-600"
                    : "text-amber-600"
                }`}
              >
                {percentage}%
              </p>
            </div>
          </div>
        </Card>
      </div>

      {/* Monthly Comparison Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>
              Perbandingan Target vs Realisasi Bulanan - {yearFilter}
            </CardTitle>
            <Badge variant={currentRKAP ? "success" : "warning"}>
              {currentRKAP ? "Target Tersedia" : "Belum Ada Target"}
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-dark-200">
                  <th className="text-left py-3 px-4 font-semibold text-dark-600">
                    Bulan
                  </th>
                  <th className="text-right py-3 px-4 font-semibold text-dark-600">
                    Target RKAP (Ton)
                  </th>
                  <th className="text-right py-3 px-4 font-semibold text-dark-600">
                    Realisasi (Ton)
                  </th>
                  <th className="text-right py-3 px-4 font-semibold text-dark-600">
                    Selisih (Ton)
                  </th>
                  <th className="text-right py-3 px-4 font-semibold text-dark-600">
                    Pencapaian
                  </th>
                </tr>
              </thead>
              <tbody>
                {MONTHS.map((month) => {
                  const target =
                    Number(currentRKAP?.[month.key as keyof RKAP]) || 0;
                  const realisasi = monthlyProduksi[month.key] || 0;
                  const selisih = realisasi - target;
                  const pct =
                    target > 0 ? ((realisasi / target) * 100).toFixed(1) : "0";

                  return (
                    <tr
                      key={month.key}
                      className="border-b border-dark-100 hover:bg-dark-50"
                    >
                      <td className="py-3 px-4 font-medium">{month.label}</td>
                      <td className="py-3 px-4 text-right text-primary-600 font-semibold">
                        {formatNumber(target)}
                      </td>
                      <td className="py-3 px-4 text-right text-secondary-600 font-semibold">
                        {formatNumber(realisasi)}
                      </td>
                      <td
                        className={`py-3 px-4 text-right font-semibold ${
                          selisih >= 0 ? "text-green-600" : "text-red-600"
                        }`}
                      >
                        {selisih >= 0 ? "+" : ""}
                        {formatNumber(selisih)}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <Badge
                          variant={
                            Number(pct) >= 100
                              ? "success"
                              : Number(pct) >= 80
                              ? "warning"
                              : "danger"
                          }
                        >
                          {pct}%
                        </Badge>
                      </td>
                    </tr>
                  );
                })}
                {/* Total Row */}
                <tr className="bg-dark-100 font-bold">
                  <td className="py-3 px-4">TOTAL</td>
                  <td className="py-3 px-4 text-right text-primary-700">
                    {formatNumber(totalTarget)}
                  </td>
                  <td className="py-3 px-4 text-right text-secondary-700">
                    {formatNumber(totalProduksi)}
                  </td>
                  <td
                    className={`py-3 px-4 text-right ${
                      totalProduksi - totalTarget >= 0
                        ? "text-green-700"
                        : "text-red-700"
                    }`}
                  >
                    {totalProduksi - totalTarget >= 0 ? "+" : ""}
                    {formatNumber(totalProduksi - totalTarget)}
                  </td>
                  <td className="py-3 px-4 text-right">
                    <Badge
                      variant={
                        Number(percentage) >= 100 ? "success" : "warning"
                      }
                      className="text-base"
                    >
                      {percentage}%
                    </Badge>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Delete Button for existing RKAP */}
      {isAdmin && currentRKAP && (
        <div className="flex justify-end">
          <Button
            variant="danger"
            onClick={() => handleDelete(currentRKAP.id!)}
          >
            <Trash2 className="h-4 w-4 mr-2" />
            Hapus Target RKAP {yearFilter}
          </Button>
        </div>
      )}

      {/* Add/Edit Modal */}
      <Modal
        isOpen={showForm}
        onClose={() => {
          setShowForm(false);
          setForm(initialFormState);
          setEditingId(null);
        }}
        title={
          editingId ? `Edit Target RKAP ${form.tahun}` : "Buat Target RKAP Baru"
        }
        size="lg"
      >
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Tahun dan Plant */}
          <div className="grid grid-cols-2 gap-4">
            <Select
              label="Tahun"
              value={form.tahun?.toString() || ""}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, tahun: e.target.value }))
              }
              options={yearOptions}
              required
              disabled={!!editingId}
            />
            <Select
              label="Plant"
              value={form.plant || "NPK2"}
              onChange={(e) =>
                setForm((prev) => ({
                  ...prev,
                  plant: e.target.value as PlantType,
                }))
              }
              options={[
                { value: "NPK1", label: "NPK Plant 1" },
                { value: "NPK2", label: "NPK Plant 2" },
              ]}
              required
              disabled={!!editingId}
            />
          </div>

          {/* Monthly Targets */}
          <div className="space-y-3">
            <h3 className="font-semibold text-dark-700 border-b pb-2">
              Target Bulanan (Ton)
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {MONTHS.map((month) => (
                <Input
                  key={month.key}
                  label={month.label}
                  type="number"
                  value={form[month.key as keyof RKAP] || ""}
                  onChange={(e) => handleMonthChange(month.key, e.target.value)}
                  placeholder="0"
                  min="0"
                />
              ))}
            </div>
          </div>

          {/* Total */}
          <div className="bg-primary-50 rounded-xl p-4">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-dark-700">
                Total Target Tahunan:
              </span>
              <span className="text-2xl font-bold text-primary-600">
                {formatNumber(form.total || 0)} Ton
              </span>
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
        title="Hapus Target RKAP"
        message={`Apakah Anda yakin ingin menghapus target RKAP tahun ${yearFilter}?`}
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

export default RKAPPage;
