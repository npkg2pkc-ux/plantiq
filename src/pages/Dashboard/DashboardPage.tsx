import { useState, useEffect, useMemo } from "react";
import { motion } from "framer-motion";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  Legend,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import {
  Factory,
  TrendingUp,
  TrendingDown,
  Clock,
  AlertTriangle,
  FileText,
  ArrowUpRight,
  Package,
  Truck,
  Gauge,
  Loader2,
} from "lucide-react";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  Badge,
  Select,
} from "@/components/ui";
import { useAuthStore, useUIStore } from "@/stores";
import { formatNumber, parseNumber } from "@/lib/utils";
import type {
  ProduksiNPK,
  ProduksiBlending,
  ProduksiNPKMini,
  Downtime,
  WorkRequest,
  BahanBaku,
  Vibrasi,
  GatePass,
  TimesheetForklift,
  TimesheetLoader,
  TroubleRecord,
  RKAP,
  PlantType,
} from "@/types";

const COLORS = [
  "#3b82f6",
  "#22c55e",
  "#f59e0b",
  "#ef4444",
  "#8b5cf6",
  "#06b6d4",
];

const MONTH_SHORT = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "Mei",
  "Jun",
  "Jul",
  "Agu",
  "Sep",
  "Okt",
  "Nov",
  "Des",
];

const MONTH_KEY = [
  "januari",
  "februari",
  "maret",
  "april",
  "mei",
  "juni",
  "juli",
  "agustus",
  "september",
  "oktober",
  "november",
  "desember",
] as const;

interface DashboardData {
  produksiNPK: ProduksiNPK[];
  produksiBlending: ProduksiBlending[];
  produksiNPKMini: ProduksiNPKMini[];
  downtime: Downtime[];
  workRequest: WorkRequest[];
  bahanBaku: BahanBaku[];
  vibrasi: Vibrasi[];
  gatePass: GatePass[];
  timesheetForklift: TimesheetForklift[];
  timesheetLoader: TimesheetLoader[];
  troubleRecord: TroubleRecord[];
  rkap: RKAP[];
}

const MetricCard = ({
  title,
  value,
  subtitle,
  trend,
  trendValue,
  icon: Icon,
  color = "primary",
}: {
  title: string;
  value: string | number;
  subtitle?: string;
  trend?: "up" | "down" | "neutral";
  trendValue?: string;
  icon: React.ComponentType<{ className?: string }>;
  color?: "primary" | "success" | "warning" | "danger" | "info";
}) => {
  const colorClasses = {
    primary: "from-primary-500 to-primary-600",
    success: "from-secondary-500 to-secondary-600",
    warning: "from-amber-500 to-amber-600",
    danger: "from-red-500 to-red-600",
    info: "from-cyan-500 to-cyan-600",
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="card p-6 hover:shadow-lg transition-all duration-300"
    >
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-medium text-dark-500">{title}</p>
          <p className="text-2xl font-bold text-dark-900 mt-1">{value}</p>
          {subtitle && <p className="text-sm text-dark-400 mt-1">{subtitle}</p>}
          {trend && trendValue && (
            <div className="flex items-center gap-1 mt-2">
              {trend === "up" ? (
                <TrendingUp className="h-4 w-4 text-secondary-500" />
              ) : trend === "down" ? (
                <TrendingDown className="h-4 w-4 text-red-500" />
              ) : null}
              <span
                className={`text-sm font-medium ${
                  trend === "up"
                    ? "text-secondary-600"
                    : trend === "down"
                    ? "text-red-600"
                    : "text-dark-500"
                }`}
              >
                {trendValue}
              </span>
            </div>
          )}
        </div>
        <div
          className={`h-12 w-12 rounded-xl bg-gradient-to-br ${colorClasses[color]} flex items-center justify-center`}
        >
          <Icon className="h-6 w-6 text-white" />
        </div>
      </div>
    </motion.div>
  );
};

const DashboardPage = () => {
  const { user } = useAuthStore();
  const {
    dashboardPlantFilter,
    dashboardYear,
    setDashboardPlantFilter,
    setDashboardYear,
  } = useUIStore();

  const [loading, setLoading] = useState(true);

  // Downtime chart filter states
  const [downtimePeriodFilter, setDowntimePeriodFilter] = useState<
    "bulanan" | "tahunan"
  >("tahunan");
  const [downtimeValueFilter, setDowntimeValueFilter] = useState<
    "jam" | "frekuensi"
  >("jam");
  const [downtimeMonthFilter, setDowntimeMonthFilter] = useState<number>(
    new Date().getMonth()
  );

  const [dashboardData, setDashboardData] = useState<DashboardData>({
    produksiNPK: [],
    produksiBlending: [],
    produksiNPKMini: [],
    downtime: [],
    workRequest: [],
    bahanBaku: [],
    vibrasi: [],
    gatePass: [],
    timesheetForklift: [],
    timesheetLoader: [],
    troubleRecord: [],
    rkap: [],
  });

  // Determine if user can view all plants
  const userPlant = user?.plant;
  const userRole = user?.role;
  const canViewAllPlants =
    userPlant === "ALL" || userRole === "manager" || userRole === "eksternal";

  // Set initial plant filter based on user's plant
  useEffect(() => {
    if (!canViewAllPlants && userPlant) {
      setDashboardPlantFilter(userPlant as "NPK1" | "NPK2");
    }
  }, [userPlant, canViewAllPlants, setDashboardPlantFilter]);

  // Effective plant filter - use user's plant if they can't view all
  const effectivePlantFilter = canViewAllPlants
    ? dashboardPlantFilter
    : (userPlant as "NPK1" | "NPK2") || "NPK2";

  // Fetch all data from API
  useEffect(() => {
    const fetchAllData = async () => {
      setLoading(true);
      try {
        const { fetchDataByPlant, readData, SHEETS } = await import(
          "@/services/api"
        );

        // Fetch all data in parallel
        const [
          produksiNPKResult,
          produksiBlendingResult,
          produksiNPKMiniResult,
          downtimeResult,
          workRequestResult,
          bahanBakuResult,
          vibrasiResult,
          gatePassResult,
          timesheetForkliftResult,
          timesheetLoaderResult,
          troubleRecordResult,
          rkapResult,
        ] = await Promise.all([
          fetchDataByPlant<ProduksiNPK>(SHEETS.PRODUKSI_NPK),
          fetchDataByPlant<ProduksiBlending>(SHEETS.PRODUKSI_BLENDING),
          fetchDataByPlant<ProduksiNPKMini>(SHEETS.PRODUKSI_NPK_MINI),
          fetchDataByPlant<Downtime>(SHEETS.DOWNTIME),
          fetchDataByPlant<WorkRequest>(SHEETS.WORK_REQUEST),
          fetchDataByPlant<BahanBaku>(SHEETS.BAHAN_BAKU),
          fetchDataByPlant<Vibrasi>(SHEETS.VIBRASI),
          fetchDataByPlant<GatePass>(SHEETS.GATE_PASS),
          fetchDataByPlant<TimesheetForklift>(SHEETS.TIMESHEET_FORKLIFT),
          fetchDataByPlant<TimesheetLoader>(SHEETS.TIMESHEET_LOADER),
          fetchDataByPlant<TroubleRecord>(SHEETS.TROUBLE_RECORD),
          readData<RKAP>(SHEETS.RKAP),
        ]);

        setDashboardData({
          produksiNPK:
            produksiNPKResult.success && produksiNPKResult.data
              ? produksiNPKResult.data
              : [],
          produksiBlending:
            produksiBlendingResult.success && produksiBlendingResult.data
              ? produksiBlendingResult.data
              : [],
          produksiNPKMini:
            produksiNPKMiniResult.success && produksiNPKMiniResult.data
              ? produksiNPKMiniResult.data
              : [],
          downtime:
            downtimeResult.success && downtimeResult.data
              ? downtimeResult.data
              : [],
          workRequest:
            workRequestResult.success && workRequestResult.data
              ? workRequestResult.data
              : [],
          bahanBaku:
            bahanBakuResult.success && bahanBakuResult.data
              ? bahanBakuResult.data
              : [],
          vibrasi:
            vibrasiResult.success && vibrasiResult.data
              ? vibrasiResult.data
              : [],
          gatePass:
            gatePassResult.success && gatePassResult.data
              ? gatePassResult.data
              : [],
          timesheetForklift:
            timesheetForkliftResult.success && timesheetForkliftResult.data
              ? timesheetForkliftResult.data
              : [],
          timesheetLoader:
            timesheetLoaderResult.success && timesheetLoaderResult.data
              ? timesheetLoaderResult.data
              : [],
          troubleRecord:
            troubleRecordResult.success && troubleRecordResult.data
              ? troubleRecordResult.data
              : [],
          rkap: rkapResult.success && rkapResult.data ? rkapResult.data : [],
        });
      } catch (error) {
        console.error("Error fetching dashboard data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchAllData();
  }, []);

  // Filter data by plant - use effectivePlantFilter
  const filterByPlant = <T extends { _plant?: PlantType }>(data: T[]): T[] => {
    if (effectivePlantFilter === "ALL") return data;
    return data.filter((item) => item._plant === effectivePlantFilter);
  };

  // Filter RKAP by plant (uses 'plant' field instead of '_plant')
  const filterRKAPByPlant = (data: RKAP[]): RKAP[] => {
    if (effectivePlantFilter === "ALL") return data;
    return data.filter((item) => item.plant === effectivePlantFilter);
  };

  // Filter data by year
  const filterByYear = <T extends { tanggal?: string }>(data: T[]): T[] => {
    return data.filter((item) => {
      if (!item.tanggal) return false;
      const year = new Date(item.tanggal).getFullYear();
      return year === dashboardYear;
    });
  };

  // Filtered data
  const filteredData = useMemo(() => {
    return {
      produksiNPK: filterByYear(filterByPlant(dashboardData.produksiNPK)),
      produksiBlending: filterByYear(
        filterByPlant(dashboardData.produksiBlending)
      ),
      produksiNPKMini: filterByYear(
        filterByPlant(dashboardData.produksiNPKMini)
      ),
      downtime: filterByYear(filterByPlant(dashboardData.downtime)),
      workRequest: filterByYear(filterByPlant(dashboardData.workRequest)),
      bahanBaku: filterByYear(filterByPlant(dashboardData.bahanBaku)),
      vibrasi: filterByYear(filterByPlant(dashboardData.vibrasi)),
      gatePass: filterByYear(filterByPlant(dashboardData.gatePass)),
      timesheetForklift: filterByYear(
        filterByPlant(dashboardData.timesheetForklift)
      ),
      timesheetLoader: filterByYear(
        filterByPlant(dashboardData.timesheetLoader)
      ),
      troubleRecord: filterByYear(filterByPlant(dashboardData.troubleRecord)),
      rkap: filterRKAPByPlant(dashboardData.rkap).filter(
        (item) => Number(item.tahun) === dashboardYear
      ),
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dashboardData, effectivePlantFilter, dashboardYear]);

  // Calculate metrics
  const metrics = useMemo(() => {
    // Total produksi NPK (sum of total field or calculate from shifts)
    const totalProduksiNPK = filteredData.produksiNPK.reduce((sum, item) => {
      const total =
        parseNumber(item.total) ||
        parseNumber(item.shiftMalamOnspek) +
          parseNumber(item.shiftMalamOffspek) +
          parseNumber(item.shiftPagiOnspek) +
          parseNumber(item.shiftPagiOffspek) +
          parseNumber(item.shiftSoreOnspek) +
          parseNumber(item.shiftSoreOffspek);
      return sum + total;
    }, 0);

    const totalOnspek = filteredData.produksiNPK.reduce((sum, item) => {
      return (
        sum +
        (parseNumber(item.totalOnspek) ||
          parseNumber(item.shiftMalamOnspek) +
            parseNumber(item.shiftPagiOnspek) +
            parseNumber(item.shiftSoreOnspek))
      );
    }, 0);

    const totalOffspek = filteredData.produksiNPK.reduce((sum, item) => {
      return (
        sum +
        (parseNumber(item.totalOffspek) ||
          parseNumber(item.shiftMalamOffspek) +
            parseNumber(item.shiftPagiOffspek) +
            parseNumber(item.shiftSoreOffspek))
      );
    }, 0);

    // Total produksi blending
    const totalProduksiBlending = filteredData.produksiBlending.reduce(
      (sum, item) => sum + parseNumber(item.tonase),
      0
    );

    // Total produksi NPK Mini
    const totalProduksiNPKMini = filteredData.produksiNPKMini.reduce(
      (sum, item) => sum + parseNumber(item.tonase),
      0
    );

    // Total RKAP target - sum all monthly targets from all matching RKAP records
    const totalRKAP = filteredData.rkap.reduce((total, rkapItem) => {
      const rkapTotal =
        parseNumber(rkapItem.total) ||
        MONTH_KEY.reduce(
          (sum, monthKey) =>
            sum + parseNumber(rkapItem[monthKey as keyof RKAP]),
          0
        );
      return total + rkapTotal;
    }, 0);

    // Total downtime
    const totalDowntime = filteredData.downtime.reduce(
      (sum, item) => sum + parseNumber(item.downtime),
      0
    );

    // Work request counts
    const workRequestTotal = filteredData.workRequest.length;
    const workRequestPending = filteredData.workRequest.filter(
      (item) => !item.eksekutor || item.eksekutor === ""
    ).length;

    // Bahan baku total
    const totalBahanBaku = filteredData.bahanBaku.reduce(
      (sum, item) => sum + parseNumber(item.jumlah),
      0
    );

    // Vibrasi warnings
    const vibrasiWarnings = filteredData.vibrasi.filter(
      (item) =>
        item.status === "Warning" ||
        item.status === "Critical" ||
        item.status === "Alert"
    ).length;

    // Gate pass count
    const gatePassCount = filteredData.gatePass.length;

    // Trouble record open
    const troubleRecordOpen = filteredData.troubleRecord.filter(
      (item) => item.status === "Open" || item.status === "In Progress"
    ).length;

    // Forklift & Loader hours - use parseNumber to handle string/number values
    const forkliftHours = filteredData.timesheetForklift.reduce(
      (sum, item) => sum + parseNumber(item.jamOperasi),
      0
    );
    const loaderHours = filteredData.timesheetLoader.reduce(
      (sum, item) => sum + parseNumber(item.jamOperasi),
      0
    );

    return {
      totalProduksiNPK,
      totalOnspek,
      totalOffspek,
      totalProduksiBlending,
      totalProduksiNPKMini,
      totalRKAP,
      totalDowntime,
      workRequestTotal,
      workRequestPending,
      totalBahanBaku,
      vibrasiWarnings,
      gatePassCount,
      troubleRecordOpen,
      forkliftHours,
      loaderHours,
      percentage:
        totalRKAP > 0 ? ((totalProduksiNPK / totalRKAP) * 100).toFixed(1) : "0",
    };
  }, [filteredData]);

  // Monthly chart data
  const monthlyChartData = useMemo(() => {
    const monthlyData = MONTH_SHORT.map((bulan, index) => {
      // Filter produksi by month
      const monthProduksi = filteredData.produksiNPK.filter((item) => {
        const month = new Date(item.tanggal).getMonth();
        return month === index;
      });

      const produksi = monthProduksi.reduce((sum, item) => {
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

      const onspek = monthProduksi.reduce((sum, item) => {
        return (
          sum +
          (parseNumber(item.totalOnspek) ||
            parseNumber(item.shiftMalamOnspek) +
              parseNumber(item.shiftPagiOnspek) +
              parseNumber(item.shiftSoreOnspek))
        );
      }, 0);

      const offspek = monthProduksi.reduce((sum, item) => {
        return (
          sum +
          (parseNumber(item.totalOffspek) ||
            parseNumber(item.shiftMalamOffspek) +
              parseNumber(item.shiftPagiOffspek) +
              parseNumber(item.shiftSoreOffspek))
        );
      }, 0);

      // Get RKAP for this month - sum all plants if filter is "ALL"
      const monthKey = MONTH_KEY[index];
      const rkap = filteredData.rkap.reduce((sum, rkapItem) => {
        return sum + parseNumber(rkapItem[monthKey as keyof RKAP]);
      }, 0);

      return { bulan, produksi, rkap, onspek, offspek };
    });

    return monthlyData;
  }, [filteredData]);

  // Downtime by equipment chart data - with period and value filters
  const downtimeChartData = useMemo(() => {
    // Filter by period (bulanan/tahunan)
    let filteredDowntime = filteredData.downtime;

    if (downtimePeriodFilter === "bulanan") {
      filteredDowntime = filteredData.downtime.filter((item) => {
        if (!item.tanggal) return false;
        const month = new Date(item.tanggal).getMonth();
        return month === downtimeMonthFilter;
      });
    }

    const downtimeByItem: {
      [key: string]: { jam: number; frekuensi: number };
    } = {};
    filteredDowntime.forEach((item) => {
      const key = item.item || "Unknown";
      if (!downtimeByItem[key]) {
        downtimeByItem[key] = { jam: 0, frekuensi: 0 };
      }
      downtimeByItem[key].jam += parseNumber(item.downtime);
      downtimeByItem[key].frekuensi += 1;
    });

    return Object.entries(downtimeByItem)
      .map(([item, data]) => ({
        item,
        downtime: downtimeValueFilter === "jam" ? data.jam : data.frekuensi,
        jam: data.jam,
        frekuensi: data.frekuensi,
      }))
      .sort((a, b) => b.downtime - a.downtime)
      .slice(0, 8);
  }, [
    filteredData,
    downtimePeriodFilter,
    downtimeValueFilter,
    downtimeMonthFilter,
  ]);

  // Calculate total downtime for filtered data
  const filteredTotalDowntime = useMemo(() => {
    let filteredDowntime = filteredData.downtime;

    if (downtimePeriodFilter === "bulanan") {
      filteredDowntime = filteredData.downtime.filter((item) => {
        if (!item.tanggal) return false;
        const month = new Date(item.tanggal).getMonth();
        return month === downtimeMonthFilter;
      });
    }

    if (downtimeValueFilter === "jam") {
      return filteredDowntime.reduce(
        (sum, item) => sum + parseNumber(item.downtime),
        0
      );
    } else {
      return filteredDowntime.length;
    }
  }, [
    filteredData,
    downtimePeriodFilter,
    downtimeValueFilter,
    downtimeMonthFilter,
  ]);

  // Work request by eksekutor chart data
  const workRequestChartData = useMemo(() => {
    const wrByEksekutor: { [key: string]: number } = {};
    filteredData.workRequest.forEach((item) => {
      const key = item.eksekutor || "Belum Ditentukan";
      wrByEksekutor[key] = (wrByEksekutor[key] || 0) + 1;
    });

    return Object.entries(wrByEksekutor)
      .map(([eksekutor, count]) => ({ eksekutor, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 6);
  }, [filteredData]);

  // Vibrasi status chart data
  const vibrasiChartData = useMemo(() => {
    const statusCount: { [key: string]: number } = {};
    filteredData.vibrasi.forEach((item) => {
      const key = item.status || "Unknown";
      statusCount[key] = (statusCount[key] || 0) + 1;
    });

    return Object.entries(statusCount).map(([status, count]) => ({
      status,
      count,
    }));
  }, [filteredData]);

  // Produksi breakdown chart data
  const produksiBreakdownData = useMemo(() => {
    return [
      { name: "NPK Granul", value: metrics.totalProduksiNPK },
      { name: "Blending/Retail", value: metrics.totalProduksiBlending },
      { name: "NPK Mini", value: metrics.totalProduksiNPKMini },
    ].filter((item) => item.value > 0);
  }, [metrics]);

  const plantLabel =
    effectivePlantFilter === "ALL"
      ? "Semua Plant"
      : effectivePlantFilter === "NPK1"
      ? "NPK Plant 1"
      : "NPK Plant 2";

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin text-primary-500 mx-auto" />
          <p className="mt-4 text-dark-500">Memuat data dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-display font-bold text-dark-900">
            Dashboard - {plantLabel}
          </h1>
          <p className="text-dark-500 mt-1">
            Selamat datang, {user?.namaLengkap || user?.nama}! Berikut ringkasan
            data {plantLabel.toLowerCase()} tahun {dashboardYear}.
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* Only show plant filter if user can view all plants */}
          {canViewAllPlants && (
            <Select
              value={effectivePlantFilter}
              onChange={(e) =>
                setDashboardPlantFilter(
                  e.target.value as "ALL" | "NPK1" | "NPK2"
                )
              }
              options={[
                { value: "ALL", label: "Semua Plant" },
                { value: "NPK1", label: "NPK 1" },
                { value: "NPK2", label: "NPK 2" },
              ]}
              className="w-40"
            />
          )}
          <Select
            value={dashboardYear.toString()}
            onChange={(e) => setDashboardYear(Number(e.target.value))}
            options={[
              { value: "2023", label: "2023" },
              { value: "2024", label: "2024" },
              { value: "2025", label: "2025" },
              { value: "2026", label: "2026" },
            ]}
            className="w-32"
          />
        </div>
      </div>

      {/* Main Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <MetricCard
          title="Total Produksi NPK"
          value={formatNumber(metrics.totalProduksiNPK) + " Ton"}
          subtitle={`${metrics.percentage}% dari RKAP`}
          trend={Number(metrics.percentage) >= 100 ? "up" : "neutral"}
          trendValue={
            Number(metrics.percentage) >= 100 ? "Target Tercapai" : ""
          }
          icon={Factory}
          color="primary"
        />
        <MetricCard
          title="Target RKAP"
          value={formatNumber(metrics.totalRKAP) + " Ton"}
          subtitle={`Tahun ${dashboardYear}`}
          icon={TrendingUp}
          color="success"
        />
        <MetricCard
          title="Total Downtime"
          value={formatNumber(metrics.totalDowntime) + " Jam"}
          subtitle={`${filteredData.downtime.length} kejadian`}
          icon={Clock}
          color="warning"
        />
        <MetricCard
          title="Work Request"
          value={metrics.workRequestTotal.toString()}
          subtitle={`${metrics.workRequestPending} belum dieksekusi`}
          icon={FileText}
          color="danger"
        />
      </div>

      {/* Secondary Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4">
        <MetricCard
          title="Produksi Onspek"
          value={formatNumber(metrics.totalOnspek) + " Ton"}
          icon={TrendingUp}
          color="success"
        />
        <MetricCard
          title="Produksi Offspek"
          value={formatNumber(metrics.totalOffspek) + " Ton"}
          icon={TrendingDown}
          color="danger"
        />
        <MetricCard
          title="Blending/Retail"
          value={formatNumber(metrics.totalProduksiBlending) + " Ton"}
          icon={Package}
          color="info"
        />
        <MetricCard
          title="NPK Mini"
          value={formatNumber(metrics.totalProduksiNPKMini) + " Ton"}
          icon={Package}
          color="primary"
        />
        <MetricCard
          title="Bahan Baku"
          value={formatNumber(metrics.totalBahanBaku)}
          subtitle={`${filteredData.bahanBaku.length} item`}
          icon={Package}
          color="info"
        />
        <MetricCard
          title="Gate Pass"
          value={metrics.gatePassCount.toString()}
          subtitle="Total transaksi"
          icon={Truck}
          color="warning"
        />
      </div>

      {/* Third Row Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          title="Vibrasi Alert"
          value={metrics.vibrasiWarnings.toString()}
          subtitle={`dari ${filteredData.vibrasi.length} pengukuran`}
          icon={Gauge}
          color={metrics.vibrasiWarnings > 0 ? "danger" : "success"}
        />
        <MetricCard
          title="Trouble Record Open"
          value={metrics.troubleRecordOpen.toString()}
          subtitle={`dari ${filteredData.troubleRecord.length} total`}
          icon={AlertTriangle}
          color={metrics.troubleRecordOpen > 0 ? "warning" : "success"}
        />
        <MetricCard
          title="Jam Operasi Forklift"
          value={formatNumber(metrics.forkliftHours) + " Jam"}
          subtitle={`${filteredData.timesheetForklift.length} record`}
          icon={Truck}
          color="primary"
        />
        <MetricCard
          title="Jam Operasi Loader"
          value={formatNumber(metrics.loaderHours) + " Jam"}
          subtitle={`${filteredData.timesheetLoader.length} record`}
          icon={Truck}
          color="info"
        />
      </div>

      {/* Charts Row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Production vs RKAP Chart */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Produksi vs RKAP</CardTitle>
              <Badge variant="primary">{dashboardYear}</Badge>
            </div>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={monthlyChartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="bulan" stroke="#64748b" fontSize={12} />
                <YAxis stroke="#64748b" fontSize={12} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "white",
                    border: "none",
                    borderRadius: "12px",
                    boxShadow: "0 4px 20px rgba(0,0,0,0.1)",
                  }}
                  formatter={(value: number) => [
                    formatNumber(value) + " Ton",
                    "",
                  ]}
                />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="produksi"
                  stroke="#3b82f6"
                  strokeWidth={3}
                  dot={{ fill: "#3b82f6", r: 4 }}
                  name="Produksi"
                />
                <Line
                  type="monotone"
                  dataKey="rkap"
                  stroke="#22c55e"
                  strokeWidth={2}
                  strokeDasharray="5 5"
                  dot={false}
                  name="RKAP"
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Onspek vs Offspek */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Produksi Onspek vs Offspek</CardTitle>
              <Badge variant="success">Monthly</Badge>
            </div>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={monthlyChartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="bulan" stroke="#64748b" fontSize={12} />
                <YAxis stroke="#64748b" fontSize={12} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "white",
                    border: "none",
                    borderRadius: "12px",
                    boxShadow: "0 4px 20px rgba(0,0,0,0.1)",
                  }}
                  formatter={(value: number) => [
                    formatNumber(value) + " Ton",
                    "",
                  ]}
                />
                <Legend />
                <Bar
                  dataKey="onspek"
                  fill="#3b82f6"
                  radius={[4, 4, 0, 0]}
                  name="Onspek"
                />
                <Bar
                  dataKey="offspek"
                  fill="#ef4444"
                  radius={[4, 4, 0, 0]}
                  name="Offspek"
                />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row 2 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Downtime Chart */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <CardTitle>Downtime per Equipment</CardTitle>
                <Badge variant="warning">
                  {formatNumber(filteredTotalDowntime)}{" "}
                  {downtimeValueFilter === "jam" ? "Jam" : "Kejadian"} Total
                </Badge>
              </div>
              <div className="flex items-center gap-2">
                <Select
                  value={downtimePeriodFilter}
                  onChange={(e) =>
                    setDowntimePeriodFilter(
                      e.target.value as "bulanan" | "tahunan"
                    )
                  }
                  options={[
                    { value: "tahunan", label: "Tahunan" },
                    { value: "bulanan", label: "Bulanan" },
                  ]}
                  className="w-28"
                />
                {downtimePeriodFilter === "bulanan" && (
                  <Select
                    value={downtimeMonthFilter.toString()}
                    onChange={(e) =>
                      setDowntimeMonthFilter(Number(e.target.value))
                    }
                    options={MONTH_SHORT.map((month, index) => ({
                      value: index.toString(),
                      label: month,
                    }))}
                    className="w-24"
                  />
                )}
                <Select
                  value={downtimeValueFilter}
                  onChange={(e) =>
                    setDowntimeValueFilter(
                      e.target.value as "jam" | "frekuensi"
                    )
                  }
                  options={[
                    { value: "jam", label: "Jam" },
                    { value: "frekuensi", label: "Frekuensi" },
                  ]}
                  className="w-28"
                />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {downtimeChartData.length > 0 ? (
              <ResponsiveContainer width="100%" height={350}>
                <BarChart data={downtimeChartData} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis type="number" stroke="#64748b" fontSize={12} />
                  <YAxis
                    type="category"
                    dataKey="item"
                    stroke="#64748b"
                    fontSize={12}
                    width={120}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "white",
                      border: "none",
                      borderRadius: "12px",
                      boxShadow: "0 4px 20px rgba(0,0,0,0.1)",
                    }}
                    formatter={(
                      value: number,
                      _name: string,
                      props: { payload?: { jam?: number; frekuensi?: number } }
                    ) => {
                      const unit =
                        downtimeValueFilter === "jam" ? " Jam" : " Kejadian";
                      const additionalInfo =
                        downtimeValueFilter === "jam"
                          ? `(${props.payload?.frekuensi || 0} kejadian)`
                          : `(${formatNumber(props.payload?.jam || 0)} jam)`;
                      return [
                        `${formatNumber(value)}${unit} ${additionalInfo}`,
                        "Downtime",
                      ];
                    }}
                  />
                  <Bar
                    dataKey="downtime"
                    fill="#f59e0b"
                    radius={[0, 8, 8, 0]}
                    name={
                      downtimeValueFilter === "jam"
                        ? "Downtime (Jam)"
                        : "Downtime (Frekuensi)"
                    }
                  />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-[350px] text-dark-400">
                Tidak ada data downtime
              </div>
            )}
          </CardContent>
        </Card>

        {/* Produksi Breakdown Pie Chart */}
        <Card>
          <CardHeader>
            <CardTitle>Breakdown Produksi</CardTitle>
          </CardHeader>
          <CardContent>
            {produksiBreakdownData.length > 0 ? (
              <ResponsiveContainer width="100%" height={350}>
                <PieChart>
                  <Pie
                    data={produksiBreakdownData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    fill="#8884d8"
                    paddingAngle={5}
                    dataKey="value"
                    label={({ name, percent }) =>
                      `${name} ${(percent * 100).toFixed(0)}%`
                    }
                  >
                    {produksiBreakdownData.map((_, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={COLORS[index % COLORS.length]}
                      />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "white",
                      border: "none",
                      borderRadius: "12px",
                      boxShadow: "0 4px 20px rgba(0,0,0,0.1)",
                    }}
                    formatter={(value: number) => [
                      formatNumber(value) + " Ton",
                      "",
                    ]}
                  />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-[350px] text-dark-400">
                Tidak ada data produksi
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Charts Row 3 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Work Request by Eksekutor */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Work Request by Eksekutor</CardTitle>
              <Badge variant="danger">{metrics.workRequestTotal} Total</Badge>
            </div>
          </CardHeader>
          <CardContent>
            {workRequestChartData.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={workRequestChartData}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={90}
                    fill="#8884d8"
                    paddingAngle={5}
                    dataKey="count"
                    nameKey="eksekutor"
                    label={({ eksekutor, count }) => `${eksekutor}: ${count}`}
                  >
                    {workRequestChartData.map((_, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={COLORS[index % COLORS.length]}
                      />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "white",
                      border: "none",
                      borderRadius: "12px",
                      boxShadow: "0 4px 20px rgba(0,0,0,0.1)",
                    }}
                  />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-[300px] text-dark-400">
                Tidak ada data work request
              </div>
            )}
          </CardContent>
        </Card>

        {/* Vibrasi Status */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Status Vibrasi Equipment</CardTitle>
              <Badge
                variant={metrics.vibrasiWarnings > 0 ? "danger" : "success"}
              >
                {metrics.vibrasiWarnings} Alert
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            {vibrasiChartData.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={vibrasiChartData}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={90}
                    fill="#8884d8"
                    paddingAngle={5}
                    dataKey="count"
                    nameKey="status"
                  >
                    {vibrasiChartData.map((entry, index) => {
                      const statusColors: { [key: string]: string } = {
                        Normal: "#22c55e",
                        Warning: "#f59e0b",
                        Critical: "#ef4444",
                        Alert: "#ef4444",
                      };
                      return (
                        <Cell
                          key={`cell-${index}`}
                          fill={
                            statusColors[entry.status] ||
                            COLORS[index % COLORS.length]
                          }
                        />
                      );
                    })}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "white",
                      border: "none",
                      borderRadius: "12px",
                      boxShadow: "0 4px 20px rgba(0,0,0,0.1)",
                    }}
                  />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-[300px] text-dark-400">
                Tidak ada data vibrasi
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions & Summary */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle>Aksi Cepat</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <a
              href="/produksi/npk2"
              className="flex items-center justify-between p-3 bg-primary-50 hover:bg-primary-100 rounded-xl transition-colors group"
            >
              <div className="flex items-center gap-3">
                <Factory className="h-5 w-5 text-primary-600" />
                <span className="text-sm font-medium text-primary-900">
                  Input Produksi
                </span>
              </div>
              <ArrowUpRight className="h-4 w-4 text-primary-600 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
            </a>
            <a
              href="/laporan/downtime-npk2"
              className="flex items-center justify-between p-3 bg-amber-50 hover:bg-amber-100 rounded-xl transition-colors group"
            >
              <div className="flex items-center gap-3">
                <Clock className="h-5 w-5 text-amber-600" />
                <span className="text-sm font-medium text-amber-900">
                  Input Downtime
                </span>
              </div>
              <ArrowUpRight className="h-4 w-4 text-amber-600 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
            </a>
            <a
              href="/data/work-request-npk2"
              className="flex items-center justify-between p-3 bg-secondary-50 hover:bg-secondary-100 rounded-xl transition-colors group"
            >
              <div className="flex items-center gap-3">
                <FileText className="h-5 w-5 text-secondary-600" />
                <span className="text-sm font-medium text-secondary-900">
                  Work Request
                </span>
              </div>
              <ArrowUpRight className="h-4 w-4 text-secondary-600 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
            </a>
            <a
              href="/data/vibrasi-npk2"
              className="flex items-center justify-between p-3 bg-red-50 hover:bg-red-100 rounded-xl transition-colors group"
            >
              <div className="flex items-center gap-3">
                <Gauge className="h-5 w-5 text-red-600" />
                <span className="text-sm font-medium text-red-900">
                  Data Vibrasi
                </span>
              </div>
              <ArrowUpRight className="h-4 w-4 text-red-600 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
            </a>
          </CardContent>
        </Card>

        {/* Data Summary */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Ringkasan Data {plantLabel}</CardTitle>
              <Badge variant="info">{dashboardYear}</Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="p-4 bg-dark-50 rounded-xl text-center">
                <p className="text-2xl font-bold text-primary-600">
                  {filteredData.produksiNPK.length}
                </p>
                <p className="text-xs text-dark-500 mt-1">
                  Record Produksi NPK
                </p>
              </div>
              <div className="p-4 bg-dark-50 rounded-xl text-center">
                <p className="text-2xl font-bold text-secondary-600">
                  {filteredData.produksiBlending.length}
                </p>
                <p className="text-xs text-dark-500 mt-1">Record Blending</p>
              </div>
              <div className="p-4 bg-dark-50 rounded-xl text-center">
                <p className="text-2xl font-bold text-amber-600">
                  {filteredData.downtime.length}
                </p>
                <p className="text-xs text-dark-500 mt-1">Record Downtime</p>
              </div>
              <div className="p-4 bg-dark-50 rounded-xl text-center">
                <p className="text-2xl font-bold text-red-600">
                  {filteredData.workRequest.length}
                </p>
                <p className="text-xs text-dark-500 mt-1">Work Request</p>
              </div>
              <div className="p-4 bg-dark-50 rounded-xl text-center">
                <p className="text-2xl font-bold text-cyan-600">
                  {filteredData.bahanBaku.length}
                </p>
                <p className="text-xs text-dark-500 mt-1">Bahan Baku</p>
              </div>
              <div className="p-4 bg-dark-50 rounded-xl text-center">
                <p className="text-2xl font-bold text-purple-600">
                  {filteredData.vibrasi.length}
                </p>
                <p className="text-xs text-dark-500 mt-1">Data Vibrasi</p>
              </div>
              <div className="p-4 bg-dark-50 rounded-xl text-center">
                <p className="text-2xl font-bold text-indigo-600">
                  {filteredData.gatePass.length}
                </p>
                <p className="text-xs text-dark-500 mt-1">Gate Pass</p>
              </div>
              <div className="p-4 bg-dark-50 rounded-xl text-center">
                <p className="text-2xl font-bold text-pink-600">
                  {filteredData.troubleRecord.length}
                </p>
                <p className="text-xs text-dark-500 mt-1">Trouble Record</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default DashboardPage;
