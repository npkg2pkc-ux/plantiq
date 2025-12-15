import { useState } from "react";
import { AlertCircle, Send } from "lucide-react";
import { Modal } from "./Modal";
import { Button } from "./Button";
import { Input } from "./Input";

interface ApprovalDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (reason: string) => void;
  action: "edit" | "delete";
  itemName?: string;
  loading?: boolean;
}

export const ApprovalDialog = ({
  isOpen,
  onClose,
  onSubmit,
  action,
  itemName = "data ini",
  loading = false,
}: ApprovalDialogProps) => {
  const [reason, setReason] = useState("");

  const handleSubmit = () => {
    if (!reason.trim()) {
      alert("Mohon isi alasan permintaan");
      return;
    }
    onSubmit(reason);
    setReason("");
  };

  const handleClose = () => {
    setReason("");
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title={`Permintaan ${action === "edit" ? "Edit" : "Hapus"} Data`}
    >
      <div className="space-y-4">
        <div className="flex items-start gap-3 p-4 bg-amber-50 border border-amber-200 rounded-xl">
          <AlertCircle className="h-5 w-5 text-amber-600 mt-0.5" />
          <div className="text-sm text-amber-800">
            <p className="font-medium">Perlu Persetujuan</p>
            <p className="mt-1">
              Anda akan mengajukan permintaan untuk{" "}
              <strong>{action === "edit" ? "mengedit" : "menghapus"}</strong>{" "}
              {itemName}. Permintaan ini akan dikirim ke AVP, Supervisor, atau
              Admin untuk disetujui.
            </p>
          </div>
        </div>

        <Input
          label="Alasan Permintaan"
          placeholder={`Jelaskan alasan mengapa Anda ingin ${
            action === "edit" ? "mengedit" : "menghapus"
          } data ini...`}
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          required
        />

        <div className="flex justify-end gap-3 pt-4 border-t border-dark-100">
          <Button variant="secondary" onClick={handleClose} disabled={loading}>
            Batal
          </Button>
          <Button onClick={handleSubmit} disabled={loading}>
            <Send className="h-4 w-4 mr-2" />
            {loading ? "Mengirim..." : "Kirim Permintaan"}
          </Button>
        </div>
      </div>
    </Modal>
  );
};

export default ApprovalDialog;
