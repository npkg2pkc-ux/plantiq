import { Routes, Route, Navigate } from "react-router-dom";
import { useAuthStore } from "@/stores";
import {
  canViewUsersPage,
  canViewRKAPPage,
  canViewSettings,
} from "@/lib/utils";
import type { ReactNode } from "react";

// Layout
import { Layout } from "@/components/layout";

// Pages
import { LoginPage } from "@/pages/Login";
import { DashboardPage } from "@/pages/Dashboard";
import {
  ProduksiNPKPage,
  ProduksiBlendingPage,
  ProduksiNPKMiniPage,
} from "@/pages/Produksi";
import {
  DowntimePage,
  TimesheetForkliftPage,
  TimesheetLoaderPage,
  KOPPage,
} from "@/pages/Laporan";
import {
  WorkRequestPage,
  BahanBakuPage,
  VibrasiPage,
  GatePassPage,
  PertaPage,
  PerbaikanTahunanPage,
  TroubleRecordPage,
  DokumentasiFotoPage,
} from "@/pages/Data";
import { AkunPage, RKAPPage, UsersPage, ApprovalPage } from "@/pages/Settings";

// Protected Route Component
const ProtectedRoute = ({ children }: { children: ReactNode }) => {
  const { isLoggedIn } = useAuthStore();

  if (!isLoggedIn) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
};

// Public Route Component (redirect to dashboard if already logged in)
const PublicRoute = ({ children }: { children: ReactNode }) => {
  const { isLoggedIn } = useAuthStore();

  if (isLoggedIn) {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
};

// Settings Route Guard - check if user can access settings
const SettingsRoute = ({ children }: { children: ReactNode }) => {
  const { user } = useAuthStore();
  const userRole = user?.role || "";
  const userPlant = user?.plant;

  if (!canViewSettings(userRole, userPlant)) {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
};

// Users Page Route Guard
const UsersPageRoute = ({ children }: { children: ReactNode }) => {
  const { user } = useAuthStore();
  const userRole = user?.role || "";
  const userPlant = user?.plant;

  if (!canViewUsersPage(userRole, userPlant)) {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
};

// RKAP Page Route Guard
const RKAPPageRoute = ({ children }: { children: ReactNode }) => {
  const { user } = useAuthStore();
  const userRole = user?.role || "";

  if (!canViewRKAPPage(userRole)) {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
};

function App() {
  return (
    <Routes>
      {/* Public Routes */}
      <Route
        path="/login"
        element={
          <PublicRoute>
            <LoginPage />
          </PublicRoute>
        }
      />

      {/* Protected Routes with Layout */}
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <Layout />
          </ProtectedRoute>
        }
      >
        {/* Dashboard */}
        <Route index element={<Navigate to="/dashboard" replace />} />
        <Route path="dashboard" element={<DashboardPage />} />

        {/* Produksi Routes */}
        <Route path="produksi">
          <Route path="npk1" element={<ProduksiNPKPage plant="NPK1" />} />
          <Route path="npk2" element={<ProduksiNPKPage plant="NPK2" />} />
          <Route
            path="blending"
            element={<ProduksiBlendingPage type="blending" />}
          />
          <Route
            path="retail"
            element={<ProduksiBlendingPage type="retail" />}
          />
          <Route path="npk-mini" element={<ProduksiNPKMiniPage />} />
        </Route>

        {/* Laporan Routes */}
        <Route path="laporan">
          <Route path="kop-npk1" element={<KOPPage plant="NPK1" />} />
          <Route path="kop-npk2" element={<KOPPage plant="NPK2" />} />
          <Route path="downtime-npk1" element={<DowntimePage plant="NPK1" />} />
          <Route path="downtime-npk2" element={<DowntimePage plant="NPK2" />} />
          <Route
            path="timesheet-forklift-npk1"
            element={<TimesheetForkliftPage plant="NPK1" />}
          />
          <Route
            path="timesheet-forklift-npk2"
            element={<TimesheetForkliftPage plant="NPK2" />}
          />
          <Route
            path="timesheet-loader-npk1"
            element={<TimesheetLoaderPage plant="NPK1" />}
          />
          <Route
            path="timesheet-loader-npk2"
            element={<TimesheetLoaderPage plant="NPK2" />}
          />
        </Route>

        {/* Data Routes */}
        <Route path="data">
          <Route
            path="work-request-npk1"
            element={<WorkRequestPage plant="NPK1" />}
          />
          <Route
            path="work-request-npk2"
            element={<WorkRequestPage plant="NPK2" />}
          />
          <Route
            path="bahan-baku-npk1"
            element={<BahanBakuPage plant="NPK1" />}
          />
          <Route
            path="bahan-baku-npk2"
            element={<BahanBakuPage plant="NPK2" />}
          />
          <Route path="vibrasi-npk1" element={<VibrasiPage plant="NPK1" />} />
          <Route path="vibrasi-npk2" element={<VibrasiPage plant="NPK2" />} />
          <Route
            path="gate-pass-npk1"
            element={<GatePassPage plant="NPK1" />}
          />
          <Route
            path="gate-pass-npk2"
            element={<GatePassPage plant="NPK2" />}
          />
          <Route
            path="perbaikan-tahunan-npk1"
            element={<PerbaikanTahunanPage plant="NPK1" />}
          />
          <Route
            path="perbaikan-tahunan-npk2"
            element={<PerbaikanTahunanPage plant="NPK2" />}
          />
          <Route
            path="trouble-record-npk1"
            element={<TroubleRecordPage plant="NPK1" />}
          />
          <Route
            path="trouble-record-npk2"
            element={<TroubleRecordPage plant="NPK2" />}
          />
          <Route
            path="dokumentasi-foto-npk1"
            element={<DokumentasiFotoPage plant="NPK1" />}
          />
          <Route
            path="dokumentasi-foto-npk2"
            element={<DokumentasiFotoPage plant="NPK2" />}
          />
          {/* Legacy routes for backwards compatibility */}
          <Route path="perta" element={<PertaPage />} />
        </Route>

        {/* Settings Routes */}
        <Route path="settings">
          <Route
            path="akun"
            element={
              <SettingsRoute>
                <AkunPage />
              </SettingsRoute>
            }
          />
          <Route
            path="rkap"
            element={
              <RKAPPageRoute>
                <RKAPPage />
              </RKAPPageRoute>
            }
          />
          <Route
            path="users"
            element={
              <UsersPageRoute>
                <UsersPage />
              </UsersPageRoute>
            }
          />
          <Route
            path="approval"
            element={
              <SettingsRoute>
                <ApprovalPage />
              </SettingsRoute>
            }
          />
        </Route>
      </Route>

      {/* Catch all - redirect to dashboard */}
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}

export default App;
