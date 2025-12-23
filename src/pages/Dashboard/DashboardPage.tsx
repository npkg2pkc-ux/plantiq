import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
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
  CalendarDays,
  Fuel,
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
  RekapBBM,
  PemantauanBahanBaku,
} from "@/types";

// Bahan Baku options for filter
const BAHAN_BAKU_OPTIONS = [
  "Urea",
  "DAP",
  "KCL",
  "ZA",
  "Dolomite",
  "Clay",
] as const;

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
  rekapBBM: RekapBBM[];
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
          <p className="text-sm font-medium text-dark-500 dark:text-dark-400">
            {title}
          </p>
          <p className="text-2xl font-bold text-dark-900 dark:text-white mt-1">
            {value}
          </p>
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
                    : "text-dark-500 dark:text-dark-400"
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

  const navigate = useNavigate();

  // Helper function to get plant-specific route
  const getPlantRoute = (basePath: string) => {
    const plant =
      effectivePlantFilter === "ALL"
        ? "npk2"
        : effectivePlantFilter.toLowerCase();
    return `${basePath}-${plant}`;
  };

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

  // Pemantauan Bahan Baku state
  const [pemantauanBBFilter, setPemantauanBBFilter] = useState<string>("Urea");
  const [pemantauanBBData, setPemantauanBBData] = useState<
    PemantauanBahanBaku[]
  >([]);

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
    rekapBBM: [],
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

        // Fetch all data in parallel (tanpa pemantauanBB dulu)
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
          rekapBBMResult,
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
          fetchDataByPlant<RekapBBM>(SHEETS.REKAP_BBM),
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
          rekapBBM:
            rekapBBMResult.success && rekapBBMResult.data
              ? rekapBBMResult.data
              : [],
        });
      } catch (error) {
        console.error("Error fetching dashboard data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchAllData();
  }, []);

  // Fetch pemantauan bahan baku data terpisah
  useEffect(() => {
    const fetchPemantauanBB = async () => {
      try {
        const { fetchDataByPlant, SHEETS } = await import("@/services/api");
        if (SHEETS.PEMANTAUAN_BAHAN_BAKU) {
          const result = await fetchDataByPlant<PemantauanBahanBaku>(
            SHEETS.PEMANTAUAN_BAHAN_BAKU
          );
          if (result.success && result.data) {
            setPemantauanBBData(result.data);
          }
        }
      } catch (error) {
        console.error("Error fetching pemantauan bahan baku:", error);
      }
    };
    fetchPemantauanBB();
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
      rekapBBM: filterByYear(filterByPlant(dashboardData.rekapBBM)),
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

    // BBM Statistics
    const bbmPengajuan = filteredData.rekapBBM.reduce(
      (sum, item) => sum + parseNumber(item.pengajuanSolar),
      0
    );
    const bbmRealisasi = filteredData.rekapBBM.reduce(
      (sum, item) => sum + parseNumber(item.realisasiPengisian),
      0
    );
    const bbmSelisih = bbmRealisasi - bbmPengajuan;

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
      bbmPengajuan,
      bbmRealisasi,
      bbmSelisih,
      bbmRecordCount: filteredData.rekapBBM.length,
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

  // Current month production data
  const currentMonthData = useMemo(() => {
    const currentMonth = new Date().getMonth();
    const currentMonthName = MONTH_SHORT[currentMonth];
    const monthKey = MONTH_KEY[currentMonth];

    // NPK Production this month
    const npkThisMonth = filteredData.produksiNPK.filter((item) => {
      const month = new Date(item.tanggal).getMonth();
      return month === currentMonth;
    });

    const npkProduksi = npkThisMonth.reduce((sum, item) => {
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

    const npkOnspek = npkThisMonth.reduce((sum, item) => {
      return (
        sum +
        (parseNumber(item.totalOnspek) ||
          parseNumber(item.shiftMalamOnspek) +
            parseNumber(item.shiftPagiOnspek) +
            parseNumber(item.shiftSoreOnspek))
      );
    }, 0);

    const npkOffspek = npkThisMonth.reduce((sum, item) => {
      return (
        sum +
        (parseNumber(item.totalOffspek) ||
          parseNumber(item.shiftMalamOffspek) +
            parseNumber(item.shiftPagiOffspek) +
            parseNumber(item.shiftSoreOffspek))
      );
    }, 0);

    // Blending Production this month
    const blendingThisMonth = filteredData.produksiBlending.filter((item) => {
      const month = new Date(item.tanggal).getMonth();
      return month === currentMonth;
    });

    const blendingProduksi = blendingThisMonth.reduce((sum, item) => {
      return sum + parseNumber(item.tonase);
    }, 0);

    // NPK Mini Production this month
    const npkMiniThisMonth = filteredData.produksiNPKMini.filter((item) => {
      const month = new Date(item.tanggal).getMonth();
      return month === currentMonth;
    });

    const npkMiniProduksi = npkMiniThisMonth.reduce((sum, item) => {
      return sum + parseNumber(item.tonase);
    }, 0);

    // RKAP for this month
    const rkapThisMonth = filteredData.rkap.reduce((sum, rkapItem) => {
      return sum + parseNumber(rkapItem[monthKey as keyof RKAP]);
    }, 0);

    const percentageRkap =
      rkapThisMonth > 0
        ? ((npkProduksi / rkapThisMonth) * 100).toFixed(1)
        : "0";

    return {
      monthName: currentMonthName,
      npkProduksi,
      npkOnspek,
      npkOffspek,
      blendingProduksi,
      npkMiniProduksi,
      rkapThisMonth,
      percentageRkap,
      totalProduksi: npkProduksi + blendingProduksi + npkMiniProduksi,
    };
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
          <p className="mt-4 text-dark-500 dark:text-dark-400">
            Memuat data dashboard...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-display font-bold text-dark-900 dark:text-white">
            Dashboard - {plantLabel}
          </h1>
          <p className="text-dark-500 dark:text-dark-400 mt-1">
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

      {/* Produksi Bulan Ini - Highlighted Section */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        onClick={() =>
          navigate(
            `/produksi/${effectivePlantFilter === "NPK1" ? "npk1" : "npk2"}`
          )
        }
        className="bg-gradient-to-r from-primary-500 to-primary-600 rounded-2xl p-6 text-white shadow-lg cursor-pointer hover:shadow-xl hover:scale-[1.01] transition-all duration-300"
      >
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <CalendarDays className="h-6 w-6" />
              <h2 className="text-xl font-bold">
                Produksi Bulan {currentMonthData.monthName} {dashboardYear}
              </h2>
              <ArrowUpRight className="h-5 w-5 opacity-60 ml-2" />
            </div>
            <p className="text-primary-100 text-sm">
              Ringkasan produksi {plantLabel.toLowerCase()} bulan ini
            </p>
          </div>

          <div className="flex flex-wrap gap-4 lg:gap-8">
            <div className="bg-white/20 rounded-xl px-6 py-4 backdrop-blur-sm min-w-[140px]">
              <p className="text-primary-100 text-xs uppercase tracking-wider mb-1">
                NPK Produksi
              </p>
              <p className="text-2xl lg:text-3xl font-bold">
                {formatNumber(currentMonthData.npkProduksi)}
              </p>
              <p className="text-primary-100 text-xs">Ton</p>
            </div>

            <div className="bg-white/20 rounded-xl px-6 py-4 backdrop-blur-sm min-w-[140px]">
              <p className="text-primary-100 text-xs uppercase tracking-wider mb-1">
                Target RKAP
              </p>
              <p className="text-2xl lg:text-3xl font-bold">
                {formatNumber(currentMonthData.rkapThisMonth)}
              </p>
              <p className="text-primary-100 text-xs">Ton</p>
            </div>

            <div className="bg-white/20 rounded-xl px-6 py-4 backdrop-blur-sm min-w-[140px]">
              <p className="text-primary-100 text-xs uppercase tracking-wider mb-1">
                Pencapaian
              </p>
              <p className="text-2xl lg:text-3xl font-bold">
                {currentMonthData.percentageRkap}%
              </p>
              <p className="text-primary-100 text-xs">
                {Number(currentMonthData.percentageRkap) >= 100
                  ? "✓ Target Tercapai"
                  : "dari target"}
              </p>
            </div>
          </div>
        </div>

        {/* Sub-detail row */}
        <div className="mt-4 pt-4 border-t border-white/20 grid grid-cols-2 md:grid-cols-4 gap-4">
          <div>
            <p className="text-primary-100 text-xs">Onspek</p>
            <p className="font-semibold">
              {formatNumber(currentMonthData.npkOnspek)} Ton
            </p>
          </div>
          <div>
            <p className="text-primary-100 text-xs">Offspek</p>
            <p className="font-semibold">
              {formatNumber(currentMonthData.npkOffspek)} Ton
            </p>
          </div>
          <div>
            <p className="text-primary-100 text-xs">Blending</p>
            <p className="font-semibold">
              {formatNumber(currentMonthData.blendingProduksi)} Ton
            </p>
          </div>
          <div>
            <p className="text-primary-100 text-xs">NPK Mini</p>
            <p className="font-semibold">
              {formatNumber(currentMonthData.npkMiniProduksi)} Ton
            </p>
          </div>
        </div>
      </motion.div>

      {/* Main Metrics Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Produksi Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          onClick={() =>
            navigate(
              `/produksi/${effectivePlantFilter === "NPK1" ? "npk1" : "npk2"}`
            )
          }
          className="bg-gradient-to-r from-blue-500 to-blue-600 rounded-2xl p-5 text-white shadow-lg cursor-pointer hover:shadow-xl hover:scale-[1.01] transition-all duration-300"
        >
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Factory className="h-5 w-5" />
              <h3 className="font-bold">Produksi Tahunan {dashboardYear}</h3>
            </div>
            <ArrowUpRight className="h-4 w-4 opacity-60" />
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="bg-white/20 rounded-xl px-4 py-3 backdrop-blur-sm">
              <p className="text-blue-100 text-[10px] uppercase tracking-wider">
                NPK Granul
              </p>
              <p className="text-xl font-bold">
                {formatNumber(metrics.totalProduksiNPK)}
              </p>
              <p className="text-blue-100 text-[10px]">
                Ton ({metrics.percentage}% RKAP)
              </p>
            </div>
            <div className="bg-white/20 rounded-xl px-4 py-3 backdrop-blur-sm">
              <p className="text-blue-100 text-[10px] uppercase tracking-wider">
                Onspek
              </p>
              <p className="text-xl font-bold">
                {formatNumber(metrics.totalOnspek)}
              </p>
              <p className="text-blue-100 text-[10px]">Ton</p>
            </div>
            <div className="bg-white/20 rounded-xl px-4 py-3 backdrop-blur-sm">
              <p className="text-blue-100 text-[10px] uppercase tracking-wider">
                Offspek
              </p>
              <p className="text-xl font-bold">
                {formatNumber(metrics.totalOffspek)}
              </p>
              <p className="text-blue-100 text-[10px]">Ton</p>
            </div>
            <div className="bg-white/20 rounded-xl px-4 py-3 backdrop-blur-sm">
              <p className="text-blue-100 text-[10px] uppercase tracking-wider">
                Target RKAP
              </p>
              <p className="text-xl font-bold">
                {formatNumber(metrics.totalRKAP)}
              </p>
              <p className="text-blue-100 text-[10px]">Ton</p>
            </div>
          </div>
          <div className="mt-3 pt-3 border-t border-white/20 grid grid-cols-2 gap-3">
            <div className="bg-white/10 rounded-lg px-3 py-2">
              <p className="text-blue-100 text-[10px]">Blending/Retail</p>
              <p className="font-semibold">
                {formatNumber(metrics.totalProduksiBlending)} Ton
              </p>
            </div>
            <div className="bg-white/10 rounded-lg px-3 py-2">
              <p className="text-blue-100 text-[10px]">NPK Mini</p>
              <p className="font-semibold">
                {formatNumber(metrics.totalProduksiNPKMini)} Ton
              </p>
            </div>
          </div>
        </motion.div>

        {/* Operasional Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-gradient-to-r from-slate-600 to-slate-700 rounded-2xl p-5 text-white shadow-lg"
        >
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Truck className="h-5 w-5" />
              <h3 className="font-bold">Operasional & Logistik</h3>
            </div>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div
              onClick={() =>
                navigate(
                  `/laporan/timesheet-forklift-${
                    effectivePlantFilter === "NPK1" ? "npk1" : "npk2"
                  }`
                )
              }
              className="bg-white/20 rounded-xl px-4 py-3 backdrop-blur-sm cursor-pointer hover:bg-white/30 transition-colors"
            >
              <p className="text-slate-200 text-[10px] uppercase tracking-wider">
                Forklift
              </p>
              <p className="text-xl font-bold">
                {formatNumber(metrics.forkliftHours)}
              </p>
              <p className="text-slate-200 text-[10px]">
                Jam ({filteredData.timesheetForklift.length} rec)
              </p>
            </div>
            <div
              onClick={() =>
                navigate(
                  `/laporan/timesheet-loader-${
                    effectivePlantFilter === "NPK1" ? "npk1" : "npk2"
                  }`
                )
              }
              className="bg-white/20 rounded-xl px-4 py-3 backdrop-blur-sm cursor-pointer hover:bg-white/30 transition-colors"
            >
              <p className="text-slate-200 text-[10px] uppercase tracking-wider">
                Loader
              </p>
              <p className="text-xl font-bold">
                {formatNumber(metrics.loaderHours)}
              </p>
              <p className="text-slate-200 text-[10px]">
                Jam ({filteredData.timesheetLoader.length} rec)
              </p>
            </div>
            <div
              onClick={() =>
                navigate(
                  `/data/gate-pass-${
                    effectivePlantFilter === "NPK1" ? "npk1" : "npk2"
                  }`
                )
              }
              className="bg-white/20 rounded-xl px-4 py-3 backdrop-blur-sm cursor-pointer hover:bg-white/30 transition-colors"
            >
              <p className="text-slate-200 text-[10px] uppercase tracking-wider">
                Gate Pass
              </p>
              <p className="text-xl font-bold">{metrics.gatePassCount}</p>
              <p className="text-slate-200 text-[10px]">Transaksi</p>
            </div>
            <div
              onClick={() =>
                navigate(
                  `/data/bahan-baku-${
                    effectivePlantFilter === "NPK1" ? "npk1" : "npk2"
                  }`
                )
              }
              className="bg-white/20 rounded-xl px-4 py-3 backdrop-blur-sm cursor-pointer hover:bg-white/30 transition-colors"
            >
              <p className="text-slate-200 text-[10px] uppercase tracking-wider">
                Bahan Baku
              </p>
              <p className="text-xl font-bold">
                {formatNumber(metrics.totalBahanBaku)}
              </p>
              <p className="text-slate-200 text-[10px]">
                {filteredData.bahanBaku.length} item
              </p>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Maintenance & Issues Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Downtime & Issues */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-gradient-to-r from-red-500 to-rose-500 rounded-2xl p-5 text-white shadow-lg"
        >
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              <h3 className="font-bold">Downtime & Issues</h3>
            </div>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div
              onClick={() =>
                navigate(
                  `/laporan/downtime-${
                    effectivePlantFilter === "NPK1" ? "npk1" : "npk2"
                  }`
                )
              }
              className="bg-white/20 rounded-xl px-4 py-3 backdrop-blur-sm cursor-pointer hover:bg-white/30 transition-colors"
            >
              <p className="text-red-100 text-[10px] uppercase tracking-wider">
                Total Downtime
              </p>
              <p className="text-xl font-bold">
                {formatNumber(metrics.totalDowntime)}
              </p>
              <p className="text-red-100 text-[10px]">
                Jam ({filteredData.downtime.length} kejadian)
              </p>
            </div>
            <div
              onClick={() =>
                navigate(
                  `/data/work-request-${
                    effectivePlantFilter === "NPK1" ? "npk1" : "npk2"
                  }`
                )
              }
              className="bg-white/20 rounded-xl px-4 py-3 backdrop-blur-sm cursor-pointer hover:bg-white/30 transition-colors"
            >
              <p className="text-red-100 text-[10px] uppercase tracking-wider">
                Work Request
              </p>
              <p className="text-xl font-bold">{metrics.workRequestTotal}</p>
              <p className="text-red-100 text-[10px]">
                {metrics.workRequestPending} pending
              </p>
            </div>
            <div
              onClick={() =>
                navigate(
                  `/data/trouble-record-${
                    effectivePlantFilter === "NPK1" ? "npk1" : "npk2"
                  }`
                )
              }
              className="bg-white/20 rounded-xl px-4 py-3 backdrop-blur-sm cursor-pointer hover:bg-white/30 transition-colors"
            >
              <p className="text-red-100 text-[10px] uppercase tracking-wider">
                Trouble Open
              </p>
              <p className="text-xl font-bold">{metrics.troubleRecordOpen}</p>
              <p className="text-red-100 text-[10px]">
                dari {filteredData.troubleRecord.length} total
              </p>
            </div>
            <div
              onClick={() =>
                navigate(
                  `/data/vibrasi-${
                    effectivePlantFilter === "NPK1" ? "npk1" : "npk2"
                  }`
                )
              }
              className="bg-white/20 rounded-xl px-4 py-3 backdrop-blur-sm cursor-pointer hover:bg-white/30 transition-colors"
            >
              <p className="text-red-100 text-[10px] uppercase tracking-wider">
                Vibrasi Alert
              </p>
              <p className="text-xl font-bold">{metrics.vibrasiWarnings}</p>
              <p className="text-red-100 text-[10px]">
                dari {filteredData.vibrasi.length} ukur
              </p>
            </div>
          </div>
        </motion.div>

        {/* BBM Summary Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          onClick={() =>
            navigate(
              `/data/rekap-bbm-${
                effectivePlantFilter === "NPK1" ? "npk1" : "npk2"
              }`
            )
          }
          className="bg-gradient-to-r from-amber-500 to-orange-500 rounded-2xl p-5 text-white shadow-lg cursor-pointer hover:shadow-xl hover:scale-[1.01] transition-all duration-300"
        >
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Fuel className="h-5 w-5" />
              <h3 className="font-bold">
                Rekap BBM Alat Berat {dashboardYear}
              </h3>
            </div>
            <ArrowUpRight className="h-4 w-4 opacity-60" />
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="bg-white/20 rounded-xl px-4 py-3 backdrop-blur-sm">
              <p className="text-amber-100 text-[10px] uppercase tracking-wider">
                Pengajuan
              </p>
              <p className="text-xl font-bold">
                {formatNumber(metrics.bbmPengajuan)}
              </p>
              <p className="text-amber-100 text-[10px]">Liter</p>
            </div>
            <div className="bg-white/20 rounded-xl px-4 py-3 backdrop-blur-sm">
              <p className="text-amber-100 text-[10px] uppercase tracking-wider">
                Realisasi
              </p>
              <p className="text-xl font-bold">
                {formatNumber(metrics.bbmRealisasi)}
              </p>
              <p className="text-amber-100 text-[10px]">Liter</p>
            </div>
            <div className="bg-white/20 rounded-xl px-4 py-3 backdrop-blur-sm">
              <p className="text-amber-100 text-[10px] uppercase tracking-wider">
                Selisih
              </p>
              <p className="text-xl font-bold">
                {metrics.bbmSelisih >= 0 ? "+" : ""}
                {formatNumber(metrics.bbmSelisih)}
              </p>
              <p className="text-amber-100 text-[10px]">
                {metrics.bbmSelisih >= 0 ? "Surplus" : "Defisit"}
              </p>
            </div>
            <div className="bg-white/20 rounded-xl px-4 py-3 backdrop-blur-sm">
              <p className="text-amber-100 text-[10px] uppercase tracking-wider">
                Record
              </p>
              <p className="text-xl font-bold">{metrics.bbmRecordCount}</p>
              <p className="text-amber-100 text-[10px]">Pengajuan</p>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Pemantauan Bahan Baku Section */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.35 }}
        onClick={() =>
          navigate(
            `/laporan/pemantauan-bb-${
              effectivePlantFilter === "NPK1" ? "npk1" : "npk2"
            }`
          )
        }
        className="bg-gradient-to-r from-emerald-500 to-teal-500 rounded-2xl p-5 text-white shadow-lg cursor-pointer hover:shadow-xl hover:scale-[1.01] transition-all duration-300"
      >
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4">
          <div className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            <h3 className="font-bold">Pemantauan Stok Bahan Baku</h3>
          </div>
          <div className="flex items-center gap-2">
            <Select
              value={pemantauanBBFilter}
              onChange={(e) => {
                e.stopPropagation();
                setPemantauanBBFilter(e.target.value);
              }}
              onClick={(e) => e.stopPropagation()}
              className="w-full sm:w-40 bg-white/20 border-white/30 text-white text-sm"
              options={BAHAN_BAKU_OPTIONS.map((opt) => ({
                value: opt,
                label: opt,
              }))}
            />
            <ArrowUpRight className="h-4 w-4 opacity-60" />
          </div>
        </div>
        {(() => {
          const filteredBBData = pemantauanBBData.filter(
            (item) =>
              item._plant === effectivePlantFilter ||
              effectivePlantFilter === "ALL"
          );
          const selectedData = filteredBBData
            .filter((item) => item.bahanBaku === pemantauanBBFilter)
            .sort(
              (a, b) =>
                new Date(b.tanggal).getTime() - new Date(a.tanggal).getTime()
            );
          const latestData = selectedData[0];
          const totalRecords = selectedData.length;
          const yearData = selectedData.filter((item) => {
            const year = new Date(item.tanggal).getFullYear();
            return year === dashboardYear;
          });
          const totalIn = yearData.reduce(
            (sum, item) => sum + (item.bahanBakuIn || 0),
            0
          );
          const totalOut = yearData.reduce(
            (sum, item) => sum + (item.bahanBakuOut || 0),
            0
          );

          return (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div className="bg-white/20 rounded-xl px-4 py-3 backdrop-blur-sm">
                <p className="text-emerald-100 text-[10px] uppercase tracking-wider">
                  Stok Terakhir
                </p>
                <p className="text-xl font-bold">
                  {formatNumber(latestData?.stockAkhir || 0)}
                </p>
                <p className="text-emerald-100 text-[10px]">
                  Ton ({latestData?.tanggal || "-"})
                </p>
              </div>
              <div className="bg-white/20 rounded-xl px-4 py-3 backdrop-blur-sm">
                <p className="text-emerald-100 text-[10px] uppercase tracking-wider">
                  Total Masuk {dashboardYear}
                </p>
                <p className="text-xl font-bold">{formatNumber(totalIn)}</p>
                <p className="text-emerald-100 text-[10px]">Ton</p>
              </div>
              <div className="bg-white/20 rounded-xl px-4 py-3 backdrop-blur-sm">
                <p className="text-emerald-100 text-[10px] uppercase tracking-wider">
                  Total Keluar {dashboardYear}
                </p>
                <p className="text-xl font-bold">{formatNumber(totalOut)}</p>
                <p className="text-emerald-100 text-[10px]">Ton</p>
              </div>
              <div className="bg-white/20 rounded-xl px-4 py-3 backdrop-blur-sm">
                <p className="text-emerald-100 text-[10px] uppercase tracking-wider">
                  Total Record
                </p>
                <p className="text-xl font-bold">{totalRecords}</p>
                <p className="text-emerald-100 text-[10px]">Pencatatan</p>
              </div>
            </div>
          );
        })()}
      </motion.div>

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
                <p className="text-xs text-dark-500 dark:text-dark-400 mt-1">
                  Record Produksi NPK
                </p>
              </div>
              <div className="p-4 bg-dark-50 rounded-xl text-center">
                <p className="text-2xl font-bold text-secondary-600">
                  {filteredData.produksiBlending.length}
                </p>
                <p className="text-xs text-dark-500 dark:text-dark-400 mt-1">
                  Record Blending
                </p>
              </div>
              <div className="p-4 bg-dark-50 rounded-xl text-center">
                <p className="text-2xl font-bold text-amber-600">
                  {filteredData.downtime.length}
                </p>
                <p className="text-xs text-dark-500 dark:text-dark-400 mt-1">
                  Record Downtime
                </p>
              </div>
              <div className="p-4 bg-dark-50 rounded-xl text-center">
                <p className="text-2xl font-bold text-red-600">
                  {filteredData.workRequest.length}
                </p>
                <p className="text-xs text-dark-500 dark:text-dark-400 mt-1">
                  Work Request
                </p>
              </div>
              <div className="p-4 bg-dark-50 rounded-xl text-center">
                <p className="text-2xl font-bold text-cyan-600">
                  {filteredData.bahanBaku.length}
                </p>
                <p className="text-xs text-dark-500 dark:text-dark-400 mt-1">
                  Bahan Baku
                </p>
              </div>
              <div className="p-4 bg-dark-50 rounded-xl text-center">
                <p className="text-2xl font-bold text-purple-600">
                  {filteredData.vibrasi.length}
                </p>
                <p className="text-xs text-dark-500 dark:text-dark-400 mt-1">
                  Data Vibrasi
                </p>
              </div>
              <div className="p-4 bg-dark-50 rounded-xl text-center">
                <p className="text-2xl font-bold text-indigo-600">
                  {filteredData.gatePass.length}
                </p>
                <p className="text-xs text-dark-500 dark:text-dark-400 mt-1">
                  Gate Pass
                </p>
              </div>
              <div className="p-4 bg-dark-50 rounded-xl text-center">
                <p className="text-2xl font-bold text-pink-600">
                  {filteredData.troubleRecord.length}
                </p>
                <p className="text-xs text-dark-500 dark:text-dark-400 mt-1">
                  Trouble Record
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default DashboardPage;
