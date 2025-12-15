import { cn } from "@/lib/utils";

// Loading Spinner
interface SpinnerProps {
  size?: "sm" | "md" | "lg";
  className?: string;
}

const Spinner = ({ size = "md", className }: SpinnerProps) => {
  const sizes = {
    sm: "h-4 w-4 border-2",
    md: "h-6 w-6 border-2",
    lg: "h-10 w-10 border-3",
  };

  return (
    <div
      className={cn(
        "border-primary-600 border-t-transparent rounded-full animate-spin",
        sizes[size],
        className
      )}
    />
  );
};

// Full Page Loader
interface LoaderProps {
  message?: string;
}

const Loader = ({ message = "Memuat..." }: LoaderProps) => {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-white/80 backdrop-blur-sm">
      <div className="flex flex-col items-center gap-4">
        <Spinner size="lg" />
        <p className="text-sm font-medium text-dark-600">{message}</p>
      </div>
    </div>
  );
};

// Skeleton
interface SkeletonProps {
  className?: string;
}

const Skeleton = ({ className }: SkeletonProps) => {
  return <div className={cn("animate-pulse bg-dark-200 rounded", className)} />;
};

// Card Skeleton
const CardSkeleton = () => {
  return (
    <div className="card p-6">
      <Skeleton className="h-4 w-1/4 mb-4" />
      <Skeleton className="h-8 w-1/2 mb-2" />
      <Skeleton className="h-4 w-3/4" />
    </div>
  );
};

// Table Skeleton
const TableSkeleton = ({ rows = 5 }: { rows?: number }) => {
  return (
    <div className="card">
      <div className="px-6 py-4 border-b border-dark-100">
        <Skeleton className="h-10 w-64" />
      </div>
      <div className="divide-y divide-dark-100">
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} className="px-6 py-4 flex gap-4">
            <Skeleton className="h-4 w-1/6" />
            <Skeleton className="h-4 w-1/4" />
            <Skeleton className="h-4 w-1/3" />
            <Skeleton className="h-4 w-1/6" />
          </div>
        ))}
      </div>
    </div>
  );
};

// Success Overlay
interface SuccessOverlayProps {
  isVisible: boolean;
  message?: string;
  onClose?: () => void;
}

const SuccessOverlay = ({
  isVisible,
  message = "Berhasil!",
  onClose,
}: SuccessOverlayProps) => {
  if (!isVisible) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-dark-900/60 backdrop-blur-sm"
      onClick={onClose}
    >
      <div className="bg-white rounded-2xl p-8 shadow-xl text-center animate-scale-in">
        <div className="w-16 h-16 mx-auto mb-4 bg-secondary-100 rounded-full flex items-center justify-center">
          <svg
            className="w-8 h-8 text-secondary-600"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M5 13l4 4L19 7"
            />
          </svg>
        </div>
        <p className="text-lg font-semibold text-dark-900">{message}</p>
      </div>
    </div>
  );
};

export {
  Spinner,
  Loader,
  Skeleton,
  CardSkeleton,
  TableSkeleton,
  SuccessOverlay,
};
