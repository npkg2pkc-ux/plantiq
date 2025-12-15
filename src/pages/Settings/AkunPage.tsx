import { useState } from "react";
import { User, Lock, Bell, Shield, Save } from "lucide-react";
import {
  Button,
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  Input,
  Select,
  Badge,
  SuccessOverlay,
} from "@/components/ui";
import { useAuthStore } from "@/stores";

const AkunPage = () => {
  const { user, logout } = useAuthStore();
  const [loading, setLoading] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [activeTab, setActiveTab] = useState<
    "profile" | "password" | "notifications"
  >("profile");

  const [profileForm, setProfileForm] = useState({
    nama: user?.nama || "",
    email: user?.email || "",
    phone: "",
    department: "Produksi",
  });

  const [passwordForm, setPasswordForm] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });

  const [notificationSettings, setNotificationSettings] = useState({
    emailNotifications: true,
    pushNotifications: true,
    dailyReport: true,
    weeklyReport: false,
    alertDowntime: true,
    alertWorkRequest: true,
  });

  const handleProfileSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { updateData, SHEETS } = await import("@/services/api");
      if (user?.id) {
        const dataToUpdate = {
          id: user.id,
          nama: profileForm.nama,
          email: profileForm.email,
          phone: profileForm.phone,
          department: profileForm.department,
        };
        const updateResult = await updateData(SHEETS.USERS, dataToUpdate);
        if (updateResult.success) {
          setShowSuccess(true);
          setTimeout(() => setShowSuccess(false), 2000);
        } else {
          throw new Error(updateResult.error || "Gagal mengupdate profile");
        }
      }
    } catch (error) {
      console.error("Error updating profile:", error);
      alert(
        error instanceof Error
          ? error.message
          : "Terjadi kesalahan saat mengupdate profile"
      );
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      alert("Password baru dan konfirmasi tidak cocok");
      return;
    }
    setLoading(true);
    try {
      const { updateData, SHEETS } = await import("@/services/api");
      if (user?.id) {
        const dataToUpdate = {
          id: user.id,
          password: passwordForm.newPassword,
          currentPassword: passwordForm.currentPassword,
        };
        const updateResult = await updateData(SHEETS.USERS, dataToUpdate);
        if (updateResult.success) {
          setPasswordForm({
            currentPassword: "",
            newPassword: "",
            confirmPassword: "",
          });
          setShowSuccess(true);
          setTimeout(() => setShowSuccess(false), 2000);
        } else {
          throw new Error(updateResult.error || "Gagal mengupdate password");
        }
      }
    } catch (error) {
      console.error("Error updating password:", error);
      alert(
        error instanceof Error
          ? error.message
          : "Terjadi kesalahan saat mengupdate password"
      );
    } finally {
      setLoading(false);
    }
  };

  const handleNotificationSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { updateData, SHEETS } = await import("@/services/api");
      if (user?.id) {
        const dataToUpdate = {
          id: user.id,
          notificationSettings,
        };
        const updateResult = await updateData(SHEETS.USERS, dataToUpdate);
        if (updateResult.success) {
          setShowSuccess(true);
          setTimeout(() => setShowSuccess(false), 2000);
        } else {
          throw new Error(updateResult.error || "Gagal mengupdate notifikasi");
        }
      }
    } catch (error) {
      console.error("Error updating notifications:", error);
      alert(
        error instanceof Error
          ? error.message
          : "Terjadi kesalahan saat mengupdate notifikasi"
      );
    } finally {
      setLoading(false);
    }
  };

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
      default:
        return "warning";
    }
  };

  const tabs = [
    { id: "profile", label: "Profile", icon: User },
    { id: "password", label: "Password", icon: Lock },
    { id: "notifications", label: "Notifikasi", icon: Bell },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-display font-bold text-dark-900">
          Pengaturan Akun
        </h1>
        <p className="text-dark-500 mt-1">
          Kelola informasi akun dan preferensi Anda
        </p>
      </div>

      {/* User Info Card */}
      <Card className="p-6 bg-gradient-to-r from-primary-50 to-indigo-50 border-primary-200">
        <div className="flex items-center gap-6">
          <div className="w-20 h-20 rounded-full bg-gradient-to-br from-primary-500 to-primary-700 flex items-center justify-center text-white text-2xl font-bold">
            {user?.nama?.charAt(0).toUpperCase() || "U"}
          </div>
          <div className="flex-1">
            <h2 className="text-xl font-semibold text-dark-900">
              {user?.nama || "User"}
            </h2>
            <p className="text-dark-500">{user?.email || "user@example.com"}</p>
            <div className="flex items-center gap-3 mt-2">
              <Badge variant={getRoleBadge(user?.role || "user")}>
                <Shield className="h-3 w-3 mr-1" />
                {user?.role?.toUpperCase() || "USER"}
              </Badge>
              <Badge variant="primary">{user?.plant || "NPK2"}</Badge>
            </div>
          </div>
          <Button variant="secondary" onClick={logout}>
            Logout
          </Button>
        </div>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Sidebar Tabs */}
        <Card className="p-4 h-fit">
          <nav className="space-y-1">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as typeof activeTab)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-left transition-colors ${
                  activeTab === tab.id
                    ? "bg-primary-100 text-primary-700 font-medium"
                    : "text-dark-600 hover:bg-dark-50"
                }`}
              >
                <tab.icon className="h-5 w-5" />
                {tab.label}
              </button>
            ))}
          </nav>
        </Card>

        {/* Content */}
        <div className="lg:col-span-3">
          {activeTab === "profile" && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="h-5 w-5" />
                  Informasi Profile
                </CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleProfileSubmit} className="space-y-4">
                  <Input
                    label="Nama Lengkap"
                    type="text"
                    value={profileForm.nama}
                    onChange={(e) =>
                      setProfileForm((prev) => ({
                        ...prev,
                        nama: e.target.value,
                      }))
                    }
                    required
                  />
                  <Input
                    label="Email"
                    type="email"
                    value={profileForm.email}
                    onChange={(e) =>
                      setProfileForm((prev) => ({
                        ...prev,
                        email: e.target.value,
                      }))
                    }
                    required
                  />
                  <Input
                    label="No. Telepon"
                    type="tel"
                    value={profileForm.phone}
                    onChange={(e) =>
                      setProfileForm((prev) => ({
                        ...prev,
                        phone: e.target.value,
                      }))
                    }
                    placeholder="08xxxxxxxxxx"
                  />
                  <Select
                    label="Department"
                    value={profileForm.department}
                    onChange={(e) =>
                      setProfileForm((prev) => ({
                        ...prev,
                        department: e.target.value,
                      }))
                    }
                    options={[
                      { value: "Produksi", label: "Produksi" },
                      { value: "Maintenance", label: "Maintenance" },
                      { value: "Quality Control", label: "Quality Control" },
                      { value: "HSE", label: "HSE" },
                      { value: "Admin", label: "Admin" },
                    ]}
                  />
                  <div className="flex justify-end pt-4">
                    <Button type="submit" isLoading={loading}>
                      <Save className="h-4 w-4 mr-2" />
                      Simpan Perubahan
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          )}

          {activeTab === "password" && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Lock className="h-5 w-5" />
                  Ubah Password
                </CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={handlePasswordSubmit} className="space-y-4">
                  <Input
                    label="Password Saat Ini"
                    type="password"
                    value={passwordForm.currentPassword}
                    onChange={(e) =>
                      setPasswordForm((prev) => ({
                        ...prev,
                        currentPassword: e.target.value,
                      }))
                    }
                    required
                  />
                  <Input
                    label="Password Baru"
                    type="password"
                    value={passwordForm.newPassword}
                    onChange={(e) =>
                      setPasswordForm((prev) => ({
                        ...prev,
                        newPassword: e.target.value,
                      }))
                    }
                    required
                  />
                  <Input
                    label="Konfirmasi Password Baru"
                    type="password"
                    value={passwordForm.confirmPassword}
                    onChange={(e) =>
                      setPasswordForm((prev) => ({
                        ...prev,
                        confirmPassword: e.target.value,
                      }))
                    }
                    required
                  />
                  <div className="p-4 bg-amber-50 rounded-xl border border-amber-200">
                    <p className="text-sm text-amber-800">
                      <strong>Tips:</strong> Password minimal 8 karakter,
                      kombinasi huruf besar, huruf kecil, dan angka.
                    </p>
                  </div>
                  <div className="flex justify-end pt-4">
                    <Button type="submit" isLoading={loading}>
                      <Save className="h-4 w-4 mr-2" />
                      Update Password
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          )}

          {activeTab === "notifications" && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Bell className="h-5 w-5" />
                  Pengaturan Notifikasi
                </CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleNotificationSubmit} className="space-y-6">
                  <div className="space-y-4">
                    <h3 className="font-semibold text-dark-900">
                      Notifikasi Umum
                    </h3>
                    <label className="flex items-center justify-between p-4 bg-dark-50 rounded-xl cursor-pointer">
                      <div>
                        <p className="font-medium text-dark-900">
                          Email Notifications
                        </p>
                        <p className="text-sm text-dark-500">
                          Terima notifikasi via email
                        </p>
                      </div>
                      <input
                        type="checkbox"
                        checked={notificationSettings.emailNotifications}
                        onChange={(e) =>
                          setNotificationSettings((prev) => ({
                            ...prev,
                            emailNotifications: e.target.checked,
                          }))
                        }
                        className="w-5 h-5 text-primary-600 rounded"
                      />
                    </label>
                    <label className="flex items-center justify-between p-4 bg-dark-50 rounded-xl cursor-pointer">
                      <div>
                        <p className="font-medium text-dark-900">
                          Push Notifications
                        </p>
                        <p className="text-sm text-dark-500">
                          Notifikasi browser/app
                        </p>
                      </div>
                      <input
                        type="checkbox"
                        checked={notificationSettings.pushNotifications}
                        onChange={(e) =>
                          setNotificationSettings((prev) => ({
                            ...prev,
                            pushNotifications: e.target.checked,
                          }))
                        }
                        className="w-5 h-5 text-primary-600 rounded"
                      />
                    </label>
                  </div>

                  <div className="space-y-4">
                    <h3 className="font-semibold text-dark-900">Laporan</h3>
                    <label className="flex items-center justify-between p-4 bg-dark-50 rounded-xl cursor-pointer">
                      <div>
                        <p className="font-medium text-dark-900">
                          Laporan Harian
                        </p>
                        <p className="text-sm text-dark-500">
                          Ringkasan produksi harian
                        </p>
                      </div>
                      <input
                        type="checkbox"
                        checked={notificationSettings.dailyReport}
                        onChange={(e) =>
                          setNotificationSettings((prev) => ({
                            ...prev,
                            dailyReport: e.target.checked,
                          }))
                        }
                        className="w-5 h-5 text-primary-600 rounded"
                      />
                    </label>
                    <label className="flex items-center justify-between p-4 bg-dark-50 rounded-xl cursor-pointer">
                      <div>
                        <p className="font-medium text-dark-900">
                          Laporan Mingguan
                        </p>
                        <p className="text-sm text-dark-500">
                          Ringkasan produksi mingguan
                        </p>
                      </div>
                      <input
                        type="checkbox"
                        checked={notificationSettings.weeklyReport}
                        onChange={(e) =>
                          setNotificationSettings((prev) => ({
                            ...prev,
                            weeklyReport: e.target.checked,
                          }))
                        }
                        className="w-5 h-5 text-primary-600 rounded"
                      />
                    </label>
                  </div>

                  <div className="space-y-4">
                    <h3 className="font-semibold text-dark-900">Alert</h3>
                    <label className="flex items-center justify-between p-4 bg-dark-50 rounded-xl cursor-pointer">
                      <div>
                        <p className="font-medium text-dark-900">
                          Alert Downtime
                        </p>
                        <p className="text-sm text-dark-500">
                          Notifikasi saat terjadi downtime
                        </p>
                      </div>
                      <input
                        type="checkbox"
                        checked={notificationSettings.alertDowntime}
                        onChange={(e) =>
                          setNotificationSettings((prev) => ({
                            ...prev,
                            alertDowntime: e.target.checked,
                          }))
                        }
                        className="w-5 h-5 text-primary-600 rounded"
                      />
                    </label>
                    <label className="flex items-center justify-between p-4 bg-dark-50 rounded-xl cursor-pointer">
                      <div>
                        <p className="font-medium text-dark-900">
                          Alert Work Request
                        </p>
                        <p className="text-sm text-dark-500">
                          Notifikasi work request baru
                        </p>
                      </div>
                      <input
                        type="checkbox"
                        checked={notificationSettings.alertWorkRequest}
                        onChange={(e) =>
                          setNotificationSettings((prev) => ({
                            ...prev,
                            alertWorkRequest: e.target.checked,
                          }))
                        }
                        className="w-5 h-5 text-primary-600 rounded"
                      />
                    </label>
                  </div>

                  <div className="flex justify-end pt-4">
                    <Button type="submit" isLoading={loading}>
                      <Save className="h-4 w-4 mr-2" />
                      Simpan Pengaturan
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      <SuccessOverlay
        isVisible={showSuccess}
        message="Perubahan berhasil disimpan!"
        onClose={() => setShowSuccess(false)}
      />
    </div>
  );
};

export default AkunPage;
