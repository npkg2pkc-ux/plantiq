import { useState, useEffect } from "react";
import {
  Search,
  CheckCircle,
  XCircle,
  Clock,
  Eye,
  FileText,
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

interface ApprovalItem {
  id: string;
  type: "downtime" | "work_request" | "gate_pass" | "trouble_record";
  title: string;
  description: string;
  submittedBy: string;
  submittedAt: string;
  status: "pending" | "approved" | "rejected";
  data?: Record<string, unknown>;
}

const ApprovalPage = () => {
  const { user } = useAuthStore();
  const [data, setData] = useState<ApprovalItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [showDetail, setShowDetail] = useState(false);
  const [showApproveConfirm, setShowApproveConfirm] = useState(false);
  const [showRejectConfirm, setShowRejectConfirm] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [selectedItem, setSelectedItem] = useState<ApprovalItem | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("pending");
  const [rejectReason, setRejectReason] = useState("");

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const { readData, SHEETS } = await import("@/services/api");
        const result = await readData<ApprovalItem>(SHEETS.APPROVAL_REQUESTS);
        if (result.success && result.data) {
          const sortedData = [...result.data].sort(
            (a, b) =>
              new Date(b.submittedAt || 0).getTime() -
              new Date(a.submittedAt || 0).getTime()
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

  const handleApprove = async () => {
    if (!selectedItem) return;

    setLoading(true);
    try {
      const { updateData, SHEETS } = await import("@/services/api");
      const dataToUpdate = { ...selectedItem, status: "approved" as const };
      const updateResult = await updateData<ApprovalItem>(
        SHEETS.APPROVAL_REQUESTS,
        dataToUpdate
      );
      if (updateResult.success) {
        setData((prev) =>
          prev.map((item) =>
            item.id === selectedItem.id
              ? { ...item, status: "approved" as const }
              : item
          )
        );
        setShowApproveConfirm(false);
        setSelectedItem(null);
        setShowSuccess(true);
        setTimeout(() => setShowSuccess(false), 2000);
      } else {
        throw new Error(updateResult.error || "Gagal approve data");
      }
    } catch (error) {
      console.error("Error approving:", error);
      alert(
        error instanceof Error
          ? error.message
          : "Terjadi kesalahan saat approve"
      );
    } finally {
      setLoading(false);
    }
  };

  const handleReject = async () => {
    if (!selectedItem) return;

    setLoading(true);
    try {
      const { updateData, SHEETS } = await import("@/services/api");
      const dataToUpdate = {
        ...selectedItem,
        status: "rejected" as const,
        rejectReason,
      };
      const updateResult = await updateData<ApprovalItem>(
        SHEETS.APPROVAL_REQUESTS,
        dataToUpdate
      );
      if (updateResult.success) {
        setData((prev) =>
          prev.map((item) =>
            item.id === selectedItem.id
              ? { ...item, status: "rejected" as const }
              : item
          )
        );
        setShowRejectConfirm(false);
        setSelectedItem(null);
        setRejectReason("");
        setShowSuccess(true);
        setTimeout(() => setShowSuccess(false), 2000);
      } else {
        throw new Error(updateResult.error || "Gagal reject data");
      }
    } catch (error) {
      console.error("Error rejecting:", error);
      alert(
        error instanceof Error ? error.message : "Terjadi kesalahan saat reject"
      );
    } finally {
      setLoading(false);
    }
  };

  const viewDetail = (item: ApprovalItem) => {
    setSelectedItem(item);
    setShowDetail(true);
  };

  const openApproveConfirm = (item: ApprovalItem) => {
    setSelectedItem(item);
    setShowApproveConfirm(true);
  };

  const openRejectConfirm = (item: ApprovalItem) => {
    setSelectedItem(item);
    setShowRejectConfirm(true);
  };

  const filteredData = data.filter((item) => {
    const matchesSearch =
      item.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.submittedBy?.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus =
      statusFilter === "all" || item.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  const getTypeBadge = (type: ApprovalItem["type"]) => {
    switch (type) {
      case "work_request":
        return { variant: "primary" as const, label: "Work Request" };
      case "gate_pass":
        return { variant: "info" as const, label: "Gate Pass" };
      case "downtime":
        return { variant: "warning" as const, label: "Downtime" };
      case "trouble_record":
        return { variant: "danger" as const, label: "Trouble Record" };
      default:
        return { variant: "info" as const, label: type };
    }
  };

  const getStatusBadge = (status: ApprovalItem["status"]) => {
    switch (status) {
      case "pending":
        return { variant: "warning" as const, icon: Clock, label: "Pending" };
      case "approved":
        return {
          variant: "success" as const,
          icon: CheckCircle,
          label: "Approved",
        };
      case "rejected":
        return { variant: "danger" as const, icon: XCircle, label: "Rejected" };
      default:
        return { variant: "info" as const, icon: Clock, label: status };
    }
  };

  const columns = [
    {
      key: "title",
      header: "Judul",
      render: (value: unknown, row: ApprovalItem) => (
        <div>
          <p className="font-medium text-dark-900">{value as string}</p>
          <p className="text-sm text-dark-500 line-clamp-1">
            {row.description}
          </p>
        </div>
      ),
    },
    {
      key: "type",
      header: "Tipe",
      render: (value: unknown) => {
        const badge = getTypeBadge(value as ApprovalItem["type"]);
        return <Badge variant={badge.variant}>{badge.label}</Badge>;
      },
    },
    { key: "submittedBy", header: "Diajukan Oleh" },
    {
      key: "submittedAt",
      header: "Tanggal",
      render: (value: unknown) => formatDate(value as string),
    },
    {
      key: "status",
      header: "Status",
      render: (value: unknown) => {
        const badge = getStatusBadge(value as ApprovalItem["status"]);
        return (
          <Badge variant={badge.variant}>
            <badge.icon className="h-3 w-3 mr-1" />
            {badge.label}
          </Badge>
        );
      },
    },
  ];

  const pendingCount = data.filter((d) => d.status === "pending").length;
  const approvedCount = data.filter((d) => d.status === "approved").length;
  const rejectedCount = data.filter((d) => d.status === "rejected").length;

  const canApprove =
    user?.role === "admin" ||
    user?.role === "supervisor" ||
    user?.role === "manager" ||
    user?.role === "avp";

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-display font-bold text-dark-900">
            Approval
          </h1>
          <p className="text-dark-500 mt-1">
            Kelola persetujuan dokumen dan request
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            options={[
              { value: "all", label: "Semua Status" },
              { value: "pending", label: "Pending" },
              { value: "approved", label: "Approved" },
              { value: "rejected", label: "Rejected" },
            ]}
            className="w-40"
          />
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card
          className="p-4 border-l-4 border-l-amber-500 cursor-pointer hover:bg-amber-50 transition-colors"
          onClick={() => setStatusFilter("pending")}
        >
          <div className="flex items-center gap-3">
            <div className="p-3 bg-amber-100 rounded-xl">
              <Clock className="h-6 w-6 text-amber-600" />
            </div>
            <div>
              <p className="text-sm text-dark-500">Menunggu Approval</p>
              <p className="text-2xl font-bold text-amber-600">
                {pendingCount}
              </p>
            </div>
          </div>
        </Card>
        <Card
          className="p-4 border-l-4 border-l-green-500 cursor-pointer hover:bg-green-50 transition-colors"
          onClick={() => setStatusFilter("approved")}
        >
          <div className="flex items-center gap-3">
            <div className="p-3 bg-green-100 rounded-xl">
              <CheckCircle className="h-6 w-6 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-dark-500">Approved</p>
              <p className="text-2xl font-bold text-green-600">
                {approvedCount}
              </p>
            </div>
          </div>
        </Card>
        <Card
          className="p-4 border-l-4 border-l-red-500 cursor-pointer hover:bg-red-50 transition-colors"
          onClick={() => setStatusFilter("rejected")}
        >
          <div className="flex items-center gap-3">
            <div className="p-3 bg-red-100 rounded-xl">
              <XCircle className="h-6 w-6 text-red-600" />
            </div>
            <div>
              <p className="text-sm text-dark-500">Rejected</p>
              <p className="text-2xl font-bold text-red-600">{rejectedCount}</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Data Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Daftar Approval</CardTitle>
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
          actions={(row) => (
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="icon"
                onClick={(e) => {
                  e.stopPropagation();
                  viewDetail(row);
                }}
              >
                <Eye className="h-4 w-4 text-dark-600" />
              </Button>
              {canApprove && row.status === "pending" && (
                <>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={(e) => {
                      e.stopPropagation();
                      openApproveConfirm(row);
                    }}
                  >
                    <CheckCircle className="h-4 w-4 text-green-600" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={(e) => {
                      e.stopPropagation();
                      openRejectConfirm(row);
                    }}
                  >
                    <XCircle className="h-4 w-4 text-red-600" />
                  </Button>
                </>
              )}
            </div>
          )}
        />
      </Card>

      {/* Detail Modal */}
      <Modal
        isOpen={showDetail}
        onClose={() => {
          setShowDetail(false);
          setSelectedItem(null);
        }}
        title="Detail Approval"
        size="md"
      >
        {selectedItem && (
          <div className="space-y-4">
            <div className="flex items-start gap-4 p-4 bg-dark-50 rounded-xl">
              <FileText className="h-10 w-10 text-primary-600" />
              <div className="flex-1">
                <h3 className="font-semibold text-dark-900">
                  {selectedItem.title}
                </h3>
                <p className="text-dark-500 mt-1">{selectedItem.description}</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-dark-500">Tipe</p>
                <Badge variant={getTypeBadge(selectedItem.type).variant}>
                  {getTypeBadge(selectedItem.type).label}
                </Badge>
              </div>
              <div>
                <p className="text-sm text-dark-500">Status</p>
                <Badge variant={getStatusBadge(selectedItem.status).variant}>
                  {getStatusBadge(selectedItem.status).label}
                </Badge>
              </div>
              <div>
                <p className="text-sm text-dark-500">Diajukan Oleh</p>
                <p className="font-medium">{selectedItem.submittedBy}</p>
              </div>
              <div>
                <p className="text-sm text-dark-500">Tanggal</p>
                <p className="font-medium">
                  {formatDate(selectedItem.submittedAt)}
                </p>
              </div>
            </div>

            {selectedItem.data && (
              <div className="p-4 bg-dark-50 rounded-xl">
                <p className="text-sm font-medium text-dark-700 mb-2">
                  Detail Data:
                </p>
                <div className="space-y-1">
                  {Object.entries(selectedItem.data).map(([key, value]) => (
                    <div key={key} className="flex justify-between text-sm">
                      <span className="text-dark-500 capitalize">
                        {key.replace(/([A-Z])/g, " $1").trim()}:
                      </span>
                      <span className="font-medium">{String(value)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {canApprove && selectedItem.status === "pending" && (
              <div className="flex justify-end gap-3 pt-4 border-t">
                <Button
                  variant="danger"
                  onClick={() => {
                    setShowDetail(false);
                    openRejectConfirm(selectedItem);
                  }}
                >
                  <XCircle className="h-4 w-4 mr-2" />
                  Reject
                </Button>
                <Button
                  variant="success"
                  onClick={() => {
                    setShowDetail(false);
                    openApproveConfirm(selectedItem);
                  }}
                >
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Approve
                </Button>
              </div>
            )}
          </div>
        )}
      </Modal>

      {/* Approve Confirmation */}
      <ConfirmDialog
        isOpen={showApproveConfirm}
        onClose={() => {
          setShowApproveConfirm(false);
          setSelectedItem(null);
        }}
        onConfirm={handleApprove}
        title="Approve Request"
        message={`Apakah Anda yakin ingin menyetujui "${selectedItem?.title}"?`}
        confirmText="Approve"
        variant="info"
        isLoading={loading}
      />

      {/* Reject Confirmation */}
      <Modal
        isOpen={showRejectConfirm}
        onClose={() => {
          setShowRejectConfirm(false);
          setSelectedItem(null);
          setRejectReason("");
        }}
        title="Reject Request"
        size="sm"
      >
        <div className="space-y-4">
          <p className="text-dark-600">
            Apakah Anda yakin ingin menolak "{selectedItem?.title}"?
          </p>
          <div>
            <label className="block text-sm font-medium text-dark-700 mb-1">
              Alasan Penolakan (opsional)
            </label>
            <textarea
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="Masukkan alasan penolakan..."
              className="input-field min-h-[80px]"
            />
          </div>
          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button
              variant="secondary"
              onClick={() => {
                setShowRejectConfirm(false);
                setSelectedItem(null);
                setRejectReason("");
              }}
            >
              Batal
            </Button>
            <Button variant="danger" onClick={handleReject} isLoading={loading}>
              Reject
            </Button>
          </div>
        </div>
      </Modal>

      <SuccessOverlay
        isVisible={showSuccess}
        message="Berhasil!"
        onClose={() => setShowSuccess(false)}
      />
    </div>
  );
};

export default ApprovalPage;
