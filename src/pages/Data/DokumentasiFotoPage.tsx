import { useState, useEffect, useRef, useCallback } from "react";
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

  // Cleanup camera on unmount
  useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
      }
    };
  }, []);

  // Start camera - simplified version
  const startCamera = useCallback(
    async (facing: "environment" | "user" = "environment") => {
      setCameraError(null);
      setCameraReady(false);

      // Stop existing stream first
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
      }

      try {
        // Simple constraints that work on most devices
        const constraints: MediaStreamConstraints = {
          video: {
            facingMode: facing,
          },
          audio: false,
        };

        const stream = await navigator.mediaDevices.getUserMedia(constraints);
        streamRef.current = stream;

        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          // Let autoPlay handle playing
          setCameraReady(true);
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
          } else if (error.name === "NotReadableError") {
            setCameraError(
              "Kamera sedang digunakan aplikasi lain. Tutup aplikasi lain dan coba lagi."
            );
          } else {
            setCameraError(`Error: ${error.message}`);
          }
        }
      }
    },
    []
  );

  // Switch camera (front/back)
  const switchCamera = useCallback(() => {
    const newFacing = facingMode === "environment" ? "user" : "environment";
    setFacingMode(newFacing);
    startCamera(newFacing);
  }, [facingMode, startCamera]);

  // Stop camera
  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setCameraReady(false);
  }, []);

  // Capture photo from camera
  const capturePhoto = useCallback(() => {
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
  }, [stopCamera]);

  // Confirm captured photo and show form
  const confirmPhoto = useCallback(() => {
    setShowCameraModal(false);
    setShowFormModal(true);
  }, []);

  // Handle file input (for gallery selection)
  const handleFileInput = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
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
    },
    [stopCamera]
  );

  // Open camera modal
  const openCameraModal = () => {
    setCapturedImage(null);
    setFormData({ judul: "", keterangan: "" });
    setCameraError(null);
    setCameraReady(false);
    setShowCameraModal(true);
  };

  // Effect to start camera when modal opens
  useEffect(() => {
    let mounted = true;

    if (showCameraModal && !capturedImage) {
      // Small delay to ensure DOM is ready
      const timer = setTimeout(() => {
        if (mounted) {
          startCamera(facingMode);
        }
      }, 200);
      return () => {
        mounted = false;
        clearTimeout(timer);
      };
    }

    return () => {
      mounted = false;
    };
  }, [showCameraModal, capturedImage, facingMode, startCamera]);

  // Close camera modal
  const closeCameraModal = useCallback(() => {
    stopCamera();
    setCapturedImage(null);
    setFormData({ judul: "", keterangan: "" });
    setCameraError(null);
    setShowCameraModal(false);
    setShowFormModal(false);
  }, [stopCamera]);

  // Retake photo
  const retakePhoto = useCallback(() => {
    setCapturedImage(null);
    startCamera(facingMode);
  }, [facingMode, startCamera]);

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
    <div className="p-3 md:p-6 space-y-4 md:space-y-6 pb-20 md:pb-6">
      {/* Header - Mobile Optimized */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl md:text-2xl font-bold text-gray-900">
              📸 Dokumentasi Foto
            </h1>
            <p className="text-sm text-gray-500">
              Plant {plant} • {photos.length} foto
            </p>
          </div>

          {/* Refresh Button - Small on mobile */}
          <Button
            variant="outline"
            size="sm"
            onClick={fetchPhotos}
            disabled={loading}
            className="h-9 w-9 p-0 md:h-10 md:w-auto md:px-4"
          >
            <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} />
            <span className="hidden md:inline ml-2">Refresh</span>
          </Button>
        </div>

        {/* Search Bar - Full width on mobile */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            type="text"
            placeholder="Cari foto..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 w-full h-11 text-base rounded-xl bg-gray-50 border-gray-200 focus:bg-white"
          />
        </div>
      </div>

      {/* Loading State */}
      {loading && (
        <div className="flex justify-center py-16">
          <div className="text-center">
            <Spinner />
            <p className="text-sm text-gray-500 mt-3">Memuat foto...</p>
          </div>
        </div>
      )}

      {/* Empty State - Mobile Friendly */}
      {!loading && photos.length === 0 && (
        <div className="flex flex-col items-center justify-center py-16 px-4">
          <div className="w-20 h-20 rounded-full bg-gray-100 flex items-center justify-center mb-4">
            <Image className="h-10 w-10 text-gray-400" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-1">
            Belum Ada Foto
          </h3>
          <p className="text-sm text-gray-500 text-center mb-6">
            Mulai dokumentasi dengan mengambil foto pertama
          </p>
          {!viewOnly && (
            <Button
              onClick={openCameraModal}
              className="bg-green-600 hover:bg-green-700 rounded-xl h-12 px-6"
            >
              <Camera className="h-5 w-5 mr-2" />
              Ambil Foto Sekarang
            </Button>
          )}
        </div>
      )}

      {/* Photo Grid by Folder - Mobile Optimized */}
      {!loading && Object.keys(groupedPhotos).length > 0 && (
        <div className="space-y-6">
          {Object.entries(groupedPhotos).map(([folder, folderPhotos]) => (
            <div key={folder}>
              {/* Folder Header - Compact on mobile */}
              <div className="flex items-center justify-between mb-3 px-1">
                <div className="flex items-center gap-2 min-w-0">
                  <div className="w-8 h-8 rounded-lg bg-yellow-100 flex items-center justify-center flex-shrink-0">
                    <FolderOpen className="h-4 w-4 text-yellow-600" />
                  </div>
                  <div className="min-w-0">
                    <h2 className="text-base font-semibold text-gray-900 truncate">
                      {folder}
                    </h2>
                    <p className="text-xs text-gray-500">
                      {folderPhotos.length} foto
                    </p>
                  </div>
                </div>
                {folderPhotos[0]?.folderUrl && (
                  <a
                    href={folderPhotos[0].folderUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-blue-600 hover:text-blue-700 flex items-center gap-1 flex-shrink-0"
                  >
                    <ExternalLink className="h-3 w-3" />
                    <span className="hidden sm:inline">Buka</span>
                  </a>
                )}
              </div>

              {/* Photo Grid - 3 columns on mobile for better view */}
              <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-2 md:gap-3">
                {folderPhotos.map((photo) => (
                  <motion.div
                    key={photo.id}
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="relative aspect-square rounded-xl overflow-hidden bg-gray-100 cursor-pointer active:scale-95 transition-transform shadow-sm"
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

                    {/* Date Badge - Always visible on mobile */}
                    <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-1.5 md:p-2">
                      <p className="text-white text-[10px] md:text-xs truncate">
                        {photo.tanggal}
                      </p>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Floating Action Button - Mobile Only */}
      {!viewOnly && !loading && (
        <div className="fixed bottom-20 right-4 md:hidden z-50">
          <button
            onClick={openCameraModal}
            className="w-14 h-14 rounded-full bg-green-600 text-white shadow-lg flex items-center justify-center active:scale-95 transition-transform"
            style={{
              boxShadow: "0 4px 14px rgba(34, 197, 94, 0.4)",
            }}
          >
            <Camera className="h-6 w-6" />
          </button>
        </div>
      )}

      {/* Fullscreen Camera Overlay - Direct render without portal for iOS compatibility */}
      {showCameraModal && (
        <div
          className="fixed inset-0 bg-black"
          style={{
            zIndex: 99999,
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            width: "100vw",
            height: "100vh",
          }}
        >
          {/* Hidden canvas for capture */}
          <canvas ref={canvasRef} style={{ display: "none" }} />

          {/* Hidden file input */}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileInput}
            style={{ display: "none" }}
          />

          {!capturedImage ? (
            <>
              {/* Video Stream - Full Screen */}
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                onCanPlay={() => setCameraReady(true)}
                style={{
                  position: "absolute",
                  top: 0,
                  left: 0,
                  width: "100%",
                  height: "100%",
                  objectFit: "cover",
                  transform: facingMode === "user" ? "scaleX(-1)" : "none",
                }}
              />

              {/* Top Bar */}
              <div
                style={{
                  position: "absolute",
                  top: 0,
                  left: 0,
                  right: 0,
                  zIndex: 10,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: "16px",
                  paddingTop: "48px",
                  background:
                    "linear-gradient(to bottom, rgba(0,0,0,0.6), transparent)",
                }}
              >
                <button
                  onClick={closeCameraModal}
                  style={{
                    padding: "12px",
                    borderRadius: "50%",
                    backgroundColor: "rgba(0,0,0,0.3)",
                    color: "white",
                    border: "none",
                    cursor: "pointer",
                  }}
                >
                  <X size={24} />
                </button>

                <span
                  style={{ color: "white", fontWeight: 500, fontSize: "18px" }}
                >
                  Ambil Foto
                </span>

                <button
                  onClick={switchCamera}
                  style={{
                    padding: "12px",
                    borderRadius: "50%",
                    backgroundColor: "rgba(0,0,0,0.3)",
                    color: "white",
                    border: "none",
                    cursor: "pointer",
                  }}
                >
                  <RotateCcw size={24} />
                </button>
              </div>

              {/* Camera Loading */}
              {!cameraReady && !cameraError && (
                <div
                  style={{
                    position: "absolute",
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    backgroundColor: "rgba(0,0,0,0.7)",
                    zIndex: 20,
                  }}
                >
                  <div style={{ textAlign: "center", color: "white" }}>
                    <Spinner />
                    <p style={{ marginTop: "8px" }}>Memuat kamera...</p>
                  </div>
                </div>
              )}

              {/* Camera Error */}
              {cameraError && (
                <div
                  style={{
                    position: "absolute",
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    backgroundColor: "black",
                    zIndex: 20,
                  }}
                >
                  <div
                    style={{
                      textAlign: "center",
                      color: "white",
                      padding: "24px",
                      maxWidth: "320px",
                    }}
                  >
                    <AlertCircle
                      size={64}
                      style={{ margin: "0 auto 16px", color: "#f87171" }}
                    />
                    <p style={{ marginBottom: "24px", fontSize: "18px" }}>
                      {cameraError}
                    </p>
                    <div
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        gap: "12px",
                      }}
                    >
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
                <div
                  style={{
                    position: "absolute",
                    bottom: 0,
                    left: 0,
                    right: 0,
                    zIndex: 10,
                    paddingBottom: "32px",
                    paddingTop: "64px",
                    background:
                      "linear-gradient(to top, rgba(0,0,0,0.6), transparent)",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: "32px",
                    }}
                  >
                    {/* Gallery Button */}
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      style={{
                        padding: "16px",
                        borderRadius: "50%",
                        backgroundColor: "rgba(255,255,255,0.2)",
                        color: "white",
                        border: "none",
                        cursor: "pointer",
                      }}
                    >
                      <Image size={28} />
                    </button>

                    {/* Capture Button */}
                    <button
                      onClick={capturePhoto}
                      style={{
                        padding: "4px",
                        borderRadius: "50%",
                        backgroundColor: "white",
                        border: "none",
                        cursor: "pointer",
                      }}
                    >
                      <div
                        style={{
                          width: "72px",
                          height: "72px",
                          borderRadius: "50%",
                          border: "4px solid #d1d5db",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                        }}
                      >
                        <div
                          style={{
                            width: "60px",
                            height: "60px",
                            borderRadius: "50%",
                            backgroundColor: "white",
                          }}
                        />
                      </div>
                    </button>

                    {/* Placeholder for symmetry */}
                    <div style={{ width: "60px" }} />
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
                style={{
                  position: "absolute",
                  top: 0,
                  left: 0,
                  width: "100%",
                  height: "100%",
                  objectFit: "contain",
                  backgroundColor: "black",
                }}
              />

              {/* Top Bar */}
              <div
                style={{
                  position: "absolute",
                  top: 0,
                  left: 0,
                  right: 0,
                  zIndex: 10,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: "16px",
                  paddingTop: "48px",
                  background:
                    "linear-gradient(to bottom, rgba(0,0,0,0.6), transparent)",
                }}
              >
                <button
                  onClick={closeCameraModal}
                  style={{
                    padding: "12px",
                    borderRadius: "50%",
                    backgroundColor: "rgba(0,0,0,0.3)",
                    color: "white",
                    border: "none",
                    cursor: "pointer",
                  }}
                >
                  <X size={24} />
                </button>

                <span
                  style={{ color: "white", fontWeight: 500, fontSize: "18px" }}
                >
                  Preview Foto
                </span>

                <div style={{ width: "48px" }} />
              </div>

              {/* Bottom Controls for Preview */}
              <div
                style={{
                  position: "absolute",
                  bottom: 0,
                  left: 0,
                  right: 0,
                  zIndex: 10,
                  paddingBottom: "32px",
                  paddingTop: "64px",
                  background:
                    "linear-gradient(to top, rgba(0,0,0,0.6), transparent)",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: "48px",
                  }}
                >
                  {/* Retake Button */}
                  <button
                    onClick={retakePhoto}
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      gap: "8px",
                      color: "white",
                      background: "none",
                      border: "none",
                      cursor: "pointer",
                    }}
                  >
                    <div
                      style={{
                        padding: "16px",
                        borderRadius: "50%",
                        backgroundColor: "rgba(255,255,255,0.2)",
                      }}
                    >
                      <RotateCcw size={28} />
                    </div>
                    <span style={{ fontSize: "14px", fontWeight: 500 }}>
                      Ulangi
                    </span>
                  </button>

                  {/* Confirm Button */}
                  <button
                    onClick={confirmPhoto}
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      gap: "8px",
                      color: "white",
                      background: "none",
                      border: "none",
                      cursor: "pointer",
                    }}
                  >
                    <div
                      style={{
                        padding: "20px",
                        borderRadius: "50%",
                        backgroundColor: "#22c55e",
                      }}
                    >
                      <Check size={40} />
                    </div>
                    <span style={{ fontSize: "14px", fontWeight: 500 }}>
                      Gunakan Foto
                    </span>
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {/* Form Modal - After Photo Captured - Mobile Optimized */}
      <AnimatePresence>
        {showFormModal && capturedImage && (
          <Modal
            isOpen={showFormModal}
            onClose={closeCameraModal}
            title="📤 Upload Foto"
            size="lg"
          >
            <div className="space-y-4">
              {/* Image Preview Thumbnail */}
              <div className="relative bg-gray-100 rounded-xl overflow-hidden">
                <img
                  src={capturedImage}
                  alt="Captured"
                  className="w-full h-40 md:h-48 object-cover"
                />
                <button
                  onClick={() => {
                    setShowFormModal(false);
                    setShowCameraModal(true);
                    retakePhoto();
                  }}
                  className="absolute bottom-2 right-2 px-3 py-1.5 bg-white/90 hover:bg-white rounded-lg text-sm font-medium text-gray-700 flex items-center gap-1 shadow-sm"
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                  Ganti
                </button>
              </div>

              {/* Form */}
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Judul / Nama Folder <span className="text-red-500">*</span>
                  </label>
                  <Input
                    type="text"
                    placeholder="Contoh: C2-L-001"
                    value={formData.judul}
                    onChange={(e) =>
                      setFormData({ ...formData, judul: e.target.value })
                    }
                    className="w-full h-11 text-base rounded-xl"
                  />
                  <p className="text-xs text-gray-500 mt-1.5">
                    Foto akan dikelompokkan berdasarkan judul ini
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Keterangan
                  </label>
                  <textarea
                    placeholder="Deskripsi foto (opsional)"
                    value={formData.keterangan}
                    onChange={(e) =>
                      setFormData({ ...formData, keterangan: e.target.value })
                    }
                    rows={2}
                    className="w-full px-3 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-transparent resize-none text-base"
                  />
                </div>

                <div className="flex gap-3 pt-2">
                  <Button
                    variant="outline"
                    onClick={closeCameraModal}
                    className="flex-1 h-12 rounded-xl text-base"
                    disabled={uploading}
                  >
                    Batal
                  </Button>
                  <Button
                    onClick={handleUpload}
                    disabled={uploading || !formData.judul.trim()}
                    className="flex-1 h-12 rounded-xl text-base bg-green-600 hover:bg-green-700"
                  >
                    {uploading ? (
                      <>
                        <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                        Uploading...
                      </>
                    ) : (
                      <>
                        <Upload className="h-4 w-4 mr-2" />
                        Upload
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </div>
          </Modal>
        )}
      </AnimatePresence>

      {/* Preview Modal - Mobile Optimized */}
      <AnimatePresence>
        {showPreviewModal && selectedPhoto && (
          <Modal
            isOpen={showPreviewModal}
            onClose={() => {
              setShowPreviewModal(false);
              setSelectedPhoto(null);
            }}
            title=""
            size="xl"
          >
            <div className="space-y-4 -mt-2">
              {/* Full Image */}
              <div className="relative bg-black rounded-xl overflow-hidden -mx-2 md:-mx-4">
                <img
                  src={`https://drive.google.com/thumbnail?id=${selectedPhoto.fileId}&sz=w1200`}
                  alt={selectedPhoto.judul}
                  className="w-full max-h-[50vh] md:max-h-[60vh] object-contain"
                />
              </div>

              {/* Title */}
              <h3 className="text-lg font-semibold text-gray-900 truncate">
                {selectedPhoto.judul}
              </h3>

              {/* Info Cards */}
              <div className="grid grid-cols-2 gap-2">
                <div className="bg-gray-50 rounded-xl p-3">
                  <p className="text-xs text-gray-500 mb-0.5">Tanggal</p>
                  <p className="text-sm font-medium text-gray-900">
                    {selectedPhoto.tanggal}
                  </p>
                </div>
                <div className="bg-gray-50 rounded-xl p-3">
                  <p className="text-xs text-gray-500 mb-0.5">Upload oleh</p>
                  <p className="text-sm font-medium text-gray-900 truncate">
                    {selectedPhoto.uploadBy}
                  </p>
                </div>
              </div>

              {selectedPhoto.keterangan && (
                <div className="bg-gray-50 rounded-xl p-3">
                  <p className="text-xs text-gray-500 mb-0.5">Keterangan</p>
                  <p className="text-sm text-gray-900">
                    {selectedPhoto.keterangan}
                  </p>
                </div>
              )}

              {/* Actions - Mobile Friendly */}
              <div className="grid grid-cols-2 gap-2 pt-2">
                <a
                  href={selectedPhoto.fileUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block"
                >
                  <Button
                    variant="outline"
                    className="w-full h-11 rounded-xl text-sm"
                  >
                    <ExternalLink className="h-4 w-4 mr-1.5" />
                    Buka Drive
                  </Button>
                </a>
                <a
                  href={`https://drive.google.com/uc?export=download&id=${selectedPhoto.fileId}`}
                  download
                  className="block"
                >
                  <Button
                    variant="outline"
                    className="w-full h-11 rounded-xl text-sm"
                  >
                    <Download className="h-4 w-4 mr-1.5" />
                    Download
                  </Button>
                </a>
              </div>

              {!viewOnly && (
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowPreviewModal(false);
                    setShowDeleteModal(true);
                  }}
                  className="w-full h-11 rounded-xl text-sm text-red-600 border-red-200 hover:bg-red-50"
                >
                  <Trash2 className="h-4 w-4 mr-1.5" />
                  Hapus Foto
                </Button>
              )}
            </div>
          </Modal>
        )}
      </AnimatePresence>

      {/* Delete Confirmation Modal - Mobile Optimized */}
      <AnimatePresence>
        {showDeleteModal && selectedPhoto && (
          <Modal
            isOpen={showDeleteModal}
            onClose={() => {
              setShowDeleteModal(false);
              setSelectedPhoto(null);
            }}
            title=""
            size="sm"
          >
            <div className="space-y-4 text-center py-2">
              <div className="w-16 h-16 mx-auto bg-red-100 rounded-full flex items-center justify-center">
                <Trash2 className="h-8 w-8 text-red-600" />
              </div>

              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-1">
                  Hapus Foto?
                </h3>
                <p className="text-sm text-gray-500">
                  Foto "
                  <span className="font-medium">{selectedPhoto.judul}</span>"
                  akan dihapus permanen dari Google Drive.
                </p>
              </div>

              <div className="flex gap-3 pt-2">
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowDeleteModal(false);
                    setSelectedPhoto(null);
                  }}
                  className="flex-1 h-12 rounded-xl"
                  disabled={uploading}
                >
                  Batal
                </Button>
                <Button
                  onClick={handleDelete}
                  disabled={uploading}
                  className="flex-1 h-12 rounded-xl bg-red-600 hover:bg-red-700"
                >
                  {uploading ? (
                    <>
                      <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                      Menghapus...
                    </>
                  ) : (
                    "Hapus"
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
