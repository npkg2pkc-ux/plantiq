import { useState, useEffect, useRef, useCallback } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  Camera,
  Upload,
  Trash2,
  Image,
  FolderOpen,
  ExternalLink,
  Search,
  RefreshCw,
  Download,
  ZoomIn,
  AlertCircle,
  X,
  RotateCcw,
  Check,
} from "lucide-react";
import { Button, Card, Input, Spinner, Modal } from "@/components/ui";
import {
  readData,
  uploadPhoto,
  deletePhoto,
  getSheetNameByPlant,
  SHEETS,
} from "@/services/api";
import { useAuthStore } from "@/stores";
import { cn, isViewOnly } from "@/lib/utils";
import type { DokumentasiFoto, PlantType } from "@/types";

interface DokumentasiFotoPageProps {
  plant: PlantType;
}

interface PhotoFormData {
  judul: string;
  keterangan: string;
}

export default function DokumentasiFotoPage({
  plant,
}: DokumentasiFotoPageProps) {
  const { user } = useAuthStore();
  const viewOnly = isViewOnly(user?.role || "");

  // State
  const [photos, setPhotos] = useState<DokumentasiFoto[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  // Modal states
  const [showCameraModal, setShowCameraModal] = useState(false);
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedPhoto, setSelectedPhoto] = useState<DokumentasiFoto | null>(
    null
  );

  // Camera states
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [formData, setFormData] = useState<PhotoFormData>({
    judul: "",
    keterangan: "",
  });
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [cameraReady, setCameraReady] = useState(false);
  const [showFormModal, setShowFormModal] = useState(false);
  const [facingMode, setFacingMode] = useState<"environment" | "user">(
    "environment"
  );

  // Refs
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const sheetName = getSheetNameByPlant(
    SHEETS.DOKUMENTASI_FOTO,
    plant as "NPK1" | "NPK2"
  );

  // Fetch photos
  const fetchPhotos = useCallback(async () => {
    setLoading(true);
    try {
      const result = await readData<DokumentasiFoto>(sheetName);
      if (result.success && result.data) {
        // Add thumbnailUrl to each photo
        const photosWithThumbnails = result.data.map((photo) => ({
          ...photo,
          _plant: plant,
          thumbnailUrl: `https://drive.google.com/thumbnail?id=${photo.fileId}&sz=w400`,
        }));
        // Sort by date descending
        photosWithThumbnails.sort(
          (a, b) =>
            new Date(b.createdAt || b.tanggal).getTime() -
            new Date(a.createdAt || a.tanggal).getTime()
        );
        setPhotos(photosWithThumbnails);
      }
    } catch (error) {
      console.error("Error fetching photos:", error);
    } finally {
      setLoading(false);
    }
  }, [sheetName, plant]);

  useEffect(() => {
    fetchPhotos();
  }, [fetchPhotos]);

  // Start camera
  const startCamera = async (facing: "environment" | "user" = facingMode) => {
    setCameraError(null);
    setCameraReady(false);

    // Stop existing stream first
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }

    try {
      // Request camera access - prefer back camera for mobile, with full resolution
      const constraints: MediaStreamConstraints = {
        video: {
          facingMode: { ideal: facing },
          width: { ideal: 4096 },
          height: { ideal: 2160 },
        },
        audio: false,
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.onloadedmetadata = () => {
          videoRef.current?.play();
          setCameraReady(true);
        };
      }
    } catch (error) {
      console.error("Camera error:", error);
      if (error instanceof Error) {
        if (error.name === "NotAllowedError") {
          setCameraError(
            "Akses kamera ditolak. Mohon izinkan akses kamera di pengaturan browser."
          );
        } else if (error.name === "NotFoundError") {
          setCameraError(
            "Kamera tidak ditemukan. Pastikan perangkat memiliki kamera."
          );
        } else {
          setCameraError(`Error: ${error.message}`);
        }
      }
    }
  };

  // Switch camera (front/back)
  const switchCamera = () => {
    const newFacing = facingMode === "environment" ? "user" : "environment";
    setFacingMode(newFacing);
    startCamera(newFacing);
  };

  // Stop camera
  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setCameraReady(false);
  };

  // Capture photo from camera
  const capturePhoto = () => {
    if (!videoRef.current || !canvasRef.current) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const context = canvas.getContext("2d");

    if (!context) return;

    // Set canvas dimensions to video dimensions
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    // Draw video frame to canvas
    context.drawImage(video, 0, 0, canvas.width, canvas.height);

    // Get image data as base64
    const imageData = canvas.toDataURL("image/jpeg", 0.9);
    setCapturedImage(imageData);

    // Stop camera after capture
    stopCamera();
  };

  // Confirm captured photo and show form
  const confirmPhoto = () => {
    setShowCameraModal(false);
    setShowFormModal(true);
  };

  // Handle file input (for gallery selection)
  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Check file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      alert("Ukuran file maksimal 5MB");
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const result = event.target?.result as string;
      setCapturedImage(result);
      stopCamera();
      // Show form modal after selecting from gallery
      setShowCameraModal(false);
      setShowFormModal(true);
    };
    reader.readAsDataURL(file);

    // Reset input value so same file can be selected again
    e.target.value = "";
  };

  // Open camera modal
  const openCameraModal = () => {
    setCapturedImage(null);
    setFormData({ judul: "", keterangan: "" });
    setCameraError(null);
    setShowCameraModal(true);
    // Start camera after modal opens
    setTimeout(() => startCamera(), 300);
  };

  // Close camera modal
  const closeCameraModal = () => {
    stopCamera();
    setCapturedImage(null);
    setFormData({ judul: "", keterangan: "" });
    setCameraError(null);
    setShowCameraModal(false);
    setShowFormModal(false);
  };

  // Retake photo
  const retakePhoto = () => {
    setCapturedImage(null);
    startCamera();
  };

  // Upload photo
  const handleUpload = async () => {
    if (!capturedImage || !formData.judul.trim()) {
      alert("Judul foto harus diisi!");
      return;
    }

    setUploading(true);

    try {
      const fileName = `${formData.judul.replace(
        /[^a-zA-Z0-9-_]/g,
        "_"
      )}_${Date.now()}.jpg`;

      const result = await uploadPhoto({
        judul: formData.judul.trim(),
        keterangan: formData.keterangan.trim(),
        imageBase64: capturedImage,
        fileName,
        uploadBy: user?.username || user?.nama || "unknown",
        plant: plant,
      });

      if (result.success) {
        alert("Foto berhasil diupload!");
        closeCameraModal();
        fetchPhotos();
      } else {
        alert(`Gagal upload: ${result.error}`);
      }
    } catch (error) {
      console.error("Upload error:", error);
      alert("Terjadi kesalahan saat upload foto");
    } finally {
      setUploading(false);
    }
  };

  // Delete photo
  const handleDelete = async () => {
    if (!selectedPhoto?.id || !selectedPhoto?.fileId) return;

    setUploading(true);

    try {
      const result = await deletePhoto({
        id: selectedPhoto.id,
        fileId: selectedPhoto.fileId,
        plant: plant,
      });

      if (result.success) {
        alert("Foto berhasil dihapus!");
        setShowDeleteModal(false);
        setSelectedPhoto(null);
        fetchPhotos();
      } else {
        alert(`Gagal menghapus: ${result.error}`);
      }
    } catch (error) {
      console.error("Delete error:", error);
      alert("Terjadi kesalahan saat menghapus foto");
    } finally {
      setUploading(false);
    }
  };

  // Open preview
  const openPreview = (photo: DokumentasiFoto) => {
    setSelectedPhoto(photo);
    setShowPreviewModal(true);
  };

  // Filter photos by search
  const filteredPhotos = photos.filter(
    (photo) =>
      photo.judul?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      photo.keterangan?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      photo.uploadBy?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Group photos by judul (folder)
  const groupedPhotos = filteredPhotos.reduce((acc, photo) => {
    const key = photo.judul || "Lainnya";
    if (!acc[key]) {
      acc[key] = [];
    }
    acc[key].push(photo);
    return acc;
  }, {} as Record<string, DokumentasiFoto[]>);

  return (
    <div className="p-4 md:p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dokumentasi Foto</h1>
          <p className="text-gray-600">
            Plant {plant} - {photos.length} foto
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-3">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              type="text"
              placeholder="Cari foto..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 w-full sm:w-64"
            />
          </div>

          {/* Actions */}
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={fetchPhotos}
              disabled={loading}
              className="flex-1 sm:flex-none"
            >
              <RefreshCw
                className={cn("h-4 w-4 mr-2", loading && "animate-spin")}
              />
              Refresh
            </Button>

            {!viewOnly && (
              <Button
                onClick={openCameraModal}
                className="flex-1 sm:flex-none bg-green-600 hover:bg-green-700"
              >
                <Camera className="h-4 w-4 mr-2" />
                Ambil Foto
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Loading State */}
      {loading && (
        <div className="flex justify-center py-12">
          <Spinner />
        </div>
      )}

      {/* Empty State */}
      {!loading && photos.length === 0 && (
        <Card className="p-12 text-center">
          <Image className="h-16 w-16 mx-auto text-gray-300 mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            Belum Ada Foto
          </h3>
          <p className="text-gray-500 mb-6">
            Mulai dokumentasi dengan mengambil foto pertama
          </p>
          {!viewOnly && (
            <Button
              onClick={openCameraModal}
              className="bg-green-600 hover:bg-green-700"
            >
              <Camera className="h-4 w-4 mr-2" />
              Ambil Foto Sekarang
            </Button>
          )}
        </Card>
      )}

      {/* Photo Grid by Folder */}
      {!loading && Object.keys(groupedPhotos).length > 0 && (
        <div className="space-y-8">
          {Object.entries(groupedPhotos).map(([folder, folderPhotos]) => (
            <div key={folder}>
              {/* Folder Header */}
              <div className="flex items-center gap-2 mb-4">
                <FolderOpen className="h-5 w-5 text-yellow-500" />
                <h2 className="text-lg font-semibold text-gray-900">
                  {folder}
                </h2>
                <span className="text-sm text-gray-500">
                  ({folderPhotos.length} foto)
                </span>
                {folderPhotos[0]?.folderUrl && (
                  <a
                    href={folderPhotos[0].folderUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="ml-auto text-sm text-blue-600 hover:text-blue-700 flex items-center gap-1"
                  >
                    <ExternalLink className="h-4 w-4" />
                    Buka Folder
                  </a>
                )}
              </div>

              {/* Photo Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
                {folderPhotos.map((photo) => (
                  <motion.div
                    key={photo.id}
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="group relative aspect-square rounded-lg overflow-hidden bg-gray-100 cursor-pointer shadow-sm hover:shadow-md transition-shadow"
                    onClick={() => openPreview(photo)}
                  >
                    {/* Thumbnail */}
                    <img
                      src={photo.thumbnailUrl}
                      alt={photo.judul}
                      className="w-full h-full object-cover"
                      loading="lazy"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src =
                          "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24'%3E%3Cpath stroke='%239ca3af' stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z'/%3E%3C/svg%3E";
                      }}
                    />

                    {/* Overlay */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity">
                      <div className="absolute bottom-0 left-0 right-0 p-2">
                        <p className="text-white text-xs truncate">
                          {photo.tanggal}
                        </p>
                        {photo.keterangan && (
                          <p className="text-white/80 text-xs truncate">
                            {photo.keterangan}
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Zoom Icon */}
                    <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <ZoomIn className="h-5 w-5 text-white drop-shadow-lg" />
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Fullscreen Camera Overlay */}
      <AnimatePresence>
        {showCameraModal &&
          createPortal(
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[100] bg-black"
            >
              {/* Hidden canvas for capture */}
              <canvas ref={canvasRef} className="hidden" />

              {/* Hidden file input */}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                capture="environment"
                onChange={handleFileInput}
                className="hidden"
              />

              {!capturedImage ? (
                <>
                  {/* Video Stream - Full Screen */}
                  <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    muted
                    className="absolute inset-0 w-full h-full object-cover"
                    style={{
                      transform: facingMode === "user" ? "scaleX(-1)" : "none",
                    }}
                  />

                  {/* Top Bar */}
                  <div className="absolute top-0 left-0 right-0 z-10 flex items-center justify-between p-4 bg-gradient-to-b from-black/60 to-transparent">
                    <button
                      onClick={closeCameraModal}
                      className="p-3 rounded-full bg-black/30 text-white hover:bg-black/50 transition-colors"
                    >
                      <X className="h-6 w-6" />
                    </button>

                    <span className="text-white font-medium text-lg drop-shadow-lg">
                      Ambil Foto
                    </span>

                    <button
                      onClick={switchCamera}
                      className="p-3 rounded-full bg-black/30 text-white hover:bg-black/50 transition-colors"
                    >
                      <RotateCcw className="h-6 w-6" />
                    </button>
                  </div>

                  {/* Camera Loading */}
                  {!cameraReady && !cameraError && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/50 z-20">
                      <div className="text-center text-white">
                        <Spinner />
                        <p className="mt-2">Memuat kamera...</p>
                      </div>
                    </div>
                  )}

                  {/* Camera Error */}
                  {cameraError && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black z-20">
                      <div className="text-center text-white p-6 max-w-sm">
                        <AlertCircle className="h-16 w-16 mx-auto mb-4 text-red-400" />
                        <p className="mb-6 text-lg">{cameraError}</p>
                        <div className="flex flex-col gap-3">
                          <Button
                            onClick={() => startCamera()}
                            className="bg-white text-black hover:bg-gray-200"
                          >
                            <RefreshCw className="h-4 w-4 mr-2" />
                            Coba Lagi
                          </Button>
                          <Button
                            variant="outline"
                            onClick={() => fileInputRef.current?.click()}
                            className="text-white border-white hover:bg-white/10"
                          >
                            <Upload className="h-4 w-4 mr-2" />
                            Pilih dari Galeri
                          </Button>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Bottom Controls */}
                  {cameraReady && (
                    <div className="absolute bottom-0 left-0 right-0 z-10 pb-8 pt-16 bg-gradient-to-t from-black/60 to-transparent">
                      <div className="flex items-center justify-center gap-8">
                        {/* Gallery Button */}
                        <button
                          onClick={() => fileInputRef.current?.click()}
                          className="p-4 rounded-full bg-white/20 text-white hover:bg-white/30 transition-colors"
                        >
                          <Image className="h-7 w-7" />
                        </button>

                        {/* Capture Button */}
                        <button
                          onClick={capturePhoto}
                          className="relative p-1 rounded-full bg-white"
                        >
                          <div className="w-20 h-20 rounded-full border-4 border-gray-300 flex items-center justify-center hover:bg-gray-100 transition-colors">
                            <div className="w-16 h-16 rounded-full bg-white" />
                          </div>
                        </button>

                        {/* Placeholder for symmetry */}
                        <div className="p-4 w-14" />
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <>
                  {/* Captured Image Preview - Full Screen */}
                  <img
                    src={capturedImage}
                    alt="Captured"
                    className="absolute inset-0 w-full h-full object-contain bg-black"
                  />

                  {/* Top Bar */}
                  <div className="absolute top-0 left-0 right-0 z-10 flex items-center justify-between p-4 bg-gradient-to-b from-black/60 to-transparent">
                    <button
                      onClick={closeCameraModal}
                      className="p-3 rounded-full bg-black/30 text-white hover:bg-black/50 transition-colors"
                    >
                      <X className="h-6 w-6" />
                    </button>

                    <span className="text-white font-medium text-lg drop-shadow-lg">
                      Preview Foto
                    </span>

                    <div className="w-12" />
                  </div>

                  {/* Bottom Controls for Preview */}
                  <div className="absolute bottom-0 left-0 right-0 z-10 pb-8 pt-16 bg-gradient-to-t from-black/60 to-transparent">
                    <div className="flex items-center justify-center gap-8">
                      {/* Retake Button */}
                      <button
                        onClick={retakePhoto}
                        className="flex flex-col items-center gap-2 text-white"
                      >
                        <div className="p-4 rounded-full bg-white/20 hover:bg-white/30 transition-colors">
                          <RotateCcw className="h-7 w-7" />
                        </div>
                        <span className="text-sm font-medium">Ulangi</span>
                      </button>

                      {/* Confirm Button */}
                      <button
                        onClick={confirmPhoto}
                        className="flex flex-col items-center gap-2 text-white"
                      >
                        <div className="p-5 rounded-full bg-green-500 hover:bg-green-600 transition-colors">
                          <Check className="h-10 w-10" />
                        </div>
                        <span className="text-sm font-medium">
                          Gunakan Foto
                        </span>
                      </button>

                      {/* Placeholder for symmetry */}
                      <div className="p-4 w-14 flex flex-col items-center gap-2">
                        <div className="p-4 w-14" />
                        <span className="text-sm">&nbsp;</span>
                      </div>
                    </div>
                  </div>
                </>
              )}
            </motion.div>,
            document.body
          )}
      </AnimatePresence>

      {/* Form Modal - After Photo Captured */}
      <AnimatePresence>
        {showFormModal && capturedImage && (
          <Modal
            isOpen={showFormModal}
            onClose={closeCameraModal}
            title="Upload Foto"
            size="lg"
          >
            <div className="space-y-4">
              {/* Image Preview Thumbnail */}
              <div className="relative bg-gray-100 rounded-lg overflow-hidden">
                <img
                  src={capturedImage}
                  alt="Captured"
                  className="w-full h-48 object-cover"
                />
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setShowFormModal(false);
                    setShowCameraModal(true);
                    retakePhoto();
                  }}
                  className="absolute bottom-2 right-2 bg-white/90 hover:bg-white"
                >
                  <RotateCcw className="h-4 w-4 mr-1" />
                  Ganti Foto
                </Button>
              </div>

              {/* Form */}
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Judul / Nama Folder <span className="text-red-500">*</span>
                  </label>
                  <Input
                    type="text"
                    placeholder="Contoh: C2-L-001"
                    value={formData.judul}
                    onChange={(e) =>
                      setFormData({ ...formData, judul: e.target.value })
                    }
                    className="w-full"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Foto akan disimpan di folder sesuai judul ini
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Keterangan
                  </label>
                  <textarea
                    placeholder="Deskripsi foto (opsional)"
                    value={formData.keterangan}
                    onChange={(e) =>
                      setFormData({ ...formData, keterangan: e.target.value })
                    }
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent resize-none"
                  />
                </div>

                <div className="flex gap-3 pt-2">
                  <Button
                    variant="outline"
                    onClick={closeCameraModal}
                    className="flex-1"
                    disabled={uploading}
                  >
                    Batal
                  </Button>
                  <Button
                    onClick={handleUpload}
                    disabled={uploading || !formData.judul.trim()}
                    className="flex-1 bg-green-600 hover:bg-green-700"
                  >
                    {uploading ? (
                      <>
                        <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                        Mengupload...
                      </>
                    ) : (
                      <>
                        <Upload className="h-4 w-4 mr-2" />
                        Upload Foto
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </div>
          </Modal>
        )}
      </AnimatePresence>

      {/* Preview Modal */}
      <AnimatePresence>
        {showPreviewModal && selectedPhoto && (
          <Modal
            isOpen={showPreviewModal}
            onClose={() => {
              setShowPreviewModal(false);
              setSelectedPhoto(null);
            }}
            title={selectedPhoto.judul}
            size="xl"
          >
            <div className="space-y-4">
              {/* Full Image */}
              <div className="relative bg-gray-100 rounded-lg overflow-hidden">
                <img
                  src={`https://drive.google.com/thumbnail?id=${selectedPhoto.fileId}&sz=w1200`}
                  alt={selectedPhoto.judul}
                  className="w-full max-h-[60vh] object-contain"
                />
              </div>

              {/* Info */}
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-500">Tanggal:</span>
                  <span className="font-medium">{selectedPhoto.tanggal}</span>
                </div>
                {selectedPhoto.keterangan && (
                  <div className="flex justify-between">
                    <span className="text-gray-500">Keterangan:</span>
                    <span className="font-medium">
                      {selectedPhoto.keterangan}
                    </span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-gray-500">Diupload oleh:</span>
                  <span className="font-medium">{selectedPhoto.uploadBy}</span>
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-3">
                <a
                  href={selectedPhoto.fileUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1"
                >
                  <Button variant="outline" className="w-full">
                    <ExternalLink className="h-4 w-4 mr-2" />
                    Buka di Drive
                  </Button>
                </a>
                <a
                  href={`https://drive.google.com/uc?export=download&id=${selectedPhoto.fileId}`}
                  download
                  className="flex-1"
                >
                  <Button variant="outline" className="w-full">
                    <Download className="h-4 w-4 mr-2" />
                    Download
                  </Button>
                </a>
                {!viewOnly && (
                  <Button
                    variant="outline"
                    onClick={() => {
                      setShowPreviewModal(false);
                      setShowDeleteModal(true);
                    }}
                    className="text-red-600 border-red-300 hover:bg-red-50"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </div>
          </Modal>
        )}
      </AnimatePresence>

      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {showDeleteModal && selectedPhoto && (
          <Modal
            isOpen={showDeleteModal}
            onClose={() => {
              setShowDeleteModal(false);
              setSelectedPhoto(null);
            }}
            title="Hapus Foto"
            size="sm"
          >
            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <div className="p-2 bg-red-100 rounded-full">
                  <Trash2 className="h-5 w-5 text-red-600" />
                </div>
                <div>
                  <p className="text-gray-900">
                    Apakah Anda yakin ingin menghapus foto ini?
                  </p>
                  <p className="text-sm text-gray-500 mt-1">
                    Foto "{selectedPhoto.judul}" akan dihapus dari Google Drive.
                    Tindakan ini tidak dapat dibatalkan.
                  </p>
                </div>
              </div>

              <div className="flex gap-3">
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowDeleteModal(false);
                    setSelectedPhoto(null);
                  }}
                  className="flex-1"
                  disabled={uploading}
                >
                  Batal
                </Button>
                <Button
                  onClick={handleDelete}
                  disabled={uploading}
                  className="flex-1 bg-red-600 hover:bg-red-700"
                >
                  {uploading ? (
                    <>
                      <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                      Menghapus...
                    </>
                  ) : (
                    <>
                      <Trash2 className="h-4 w-4 mr-2" />
                      Hapus
                    </>
                  )}
                </Button>
              </div>
            </div>
          </Modal>
        )}
      </AnimatePresence>
    </div>
  );
}
