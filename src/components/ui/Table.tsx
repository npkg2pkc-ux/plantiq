import { ReactNode, useState } from "react";
import { cn } from "@/lib/utils";
import {
  ChevronUp,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Search,
} from "lucide-react";
import { Input } from "./Input";

// Table Container
interface TableProps {
  children: ReactNode;
  className?: string;
}

const Table = ({ children, className }: TableProps) => {
  return (
    <div className={cn("w-full overflow-x-auto", className)}>
      <table className="w-full border-collapse">{children}</table>
    </div>
  );
};

// Table Header
const TableHeader = ({ children, className }: TableProps) => {
  return <thead className={cn("bg-dark-50", className)}>{children}</thead>;
};

// Table Body
const TableBody = ({ children, className }: TableProps) => {
  return (
    <tbody className={cn("divide-y divide-dark-100", className)}>
      {children}
    </tbody>
  );
};

// Table Row
interface TableRowProps extends TableProps {
  onClick?: () => void;
  isClickable?: boolean;
}

const TableRow = ({
  children,
  className,
  onClick,
  isClickable,
}: TableRowProps) => {
  return (
    <tr
      className={cn(
        "transition-colors",
        isClickable && "cursor-pointer hover:bg-primary-50/50",
        className
      )}
      onClick={onClick}
    >
      {children}
    </tr>
  );
};

// Table Head Cell
interface TableHeadProps extends TableProps {
  sortable?: boolean;
  sorted?: "asc" | "desc" | null;
  onSort?: () => void;
  style?: React.CSSProperties;
}

const TableHead = ({
  children,
  className,
  sortable,
  sorted,
  onSort,
  style,
}: TableHeadProps) => {
  return (
    <th
      className={cn(
        "px-6 py-4 text-left text-xs font-semibold text-dark-500 uppercase tracking-wider",
        sortable && "cursor-pointer select-none hover:text-dark-700",
        className
      )}
      onClick={sortable ? onSort : undefined}
      style={style}
    >
      <div className="flex items-center gap-2">
        {children}
        {sortable && (
          <span className="flex flex-col">
            <ChevronUp
              className={cn(
                "h-3 w-3 -mb-1",
                sorted === "asc" ? "text-primary-600" : "text-dark-300"
              )}
            />
            <ChevronDown
              className={cn(
                "h-3 w-3",
                sorted === "desc" ? "text-primary-600" : "text-dark-300"
              )}
            />
          </span>
        )}
      </div>
    </th>
  );
};

// Table Cell
const TableCell = ({ children, className }: TableProps) => {
  return (
    <td
      className={cn(
        "px-6 py-4 text-sm text-dark-700 whitespace-nowrap",
        className
      )}
    >
      {children}
    </td>
  );
};

// Empty State
interface TableEmptyProps {
  message?: string;
  icon?: ReactNode;
}

const TableEmpty = ({ message = "Tidak ada data", icon }: TableEmptyProps) => {
  return (
    <tr>
      <td colSpan={100} className="px-6 py-12 text-center">
        <div className="flex flex-col items-center gap-3 text-dark-400">
          {icon}
          <p className="text-sm">{message}</p>
        </div>
      </td>
    </tr>
  );
};

// Loading State
const TableLoading = () => {
  return (
    <tr>
      <td colSpan={100} className="px-6 py-12 text-center">
        <div className="flex items-center justify-center gap-3">
          <div className="h-5 w-5 border-2 border-primary-600 border-t-transparent rounded-full animate-spin" />
          <span className="text-sm text-dark-500">Memuat data...</span>
        </div>
      </td>
    </tr>
  );
};

// Pagination
interface PaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  totalItems?: number;
  itemsPerPage?: number;
}

const Pagination = ({
  currentPage,
  totalPages,
  onPageChange,
  totalItems,
  itemsPerPage = 10,
}: PaginationProps) => {
  const startItem = (currentPage - 1) * itemsPerPage + 1;
  const endItem = Math.min(currentPage * itemsPerPage, totalItems || 0);

  const getPageNumbers = () => {
    const pages: (number | string)[] = [];
    const showPages = 5;

    if (totalPages <= showPages) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      if (currentPage <= 3) {
        for (let i = 1; i <= 4; i++) pages.push(i);
        pages.push("...");
        pages.push(totalPages);
      } else if (currentPage >= totalPages - 2) {
        pages.push(1);
        pages.push("...");
        for (let i = totalPages - 3; i <= totalPages; i++) pages.push(i);
      } else {
        pages.push(1);
        pages.push("...");
        for (let i = currentPage - 1; i <= currentPage + 1; i++) pages.push(i);
        pages.push("...");
        pages.push(totalPages);
      }
    }

    return pages;
  };

  if (totalPages <= 1) return null;

  return (
    <div className="flex items-center justify-between px-6 py-4 border-t border-dark-100">
      {totalItems && (
        <p className="text-sm text-dark-500">
          Menampilkan {startItem} - {endItem} dari {totalItems} data
        </p>
      )}

      <div className="flex items-center gap-2">
        <button
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage === 1}
          className="p-2 text-dark-500 hover:text-dark-700 hover:bg-dark-100 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <ChevronLeft className="h-5 w-5" />
        </button>

        {getPageNumbers().map((page, idx) => (
          <button
            key={idx}
            onClick={() => typeof page === "number" && onPageChange(page)}
            disabled={page === "..."}
            className={cn(
              "min-w-[40px] h-10 px-3 text-sm font-medium rounded-lg transition-colors",
              page === currentPage
                ? "bg-primary-600 text-white"
                : page === "..."
                ? "text-dark-400 cursor-default"
                : "text-dark-600 hover:bg-dark-100"
            )}
          >
            {page}
          </button>
        ))}

        <button
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage === totalPages}
          className="p-2 text-dark-500 hover:text-dark-700 hover:bg-dark-100 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <ChevronRight className="h-5 w-5" />
        </button>
      </div>
    </div>
  );
};

// Search Bar
interface TableSearchProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

const TableSearch = ({
  value,
  onChange,
  placeholder = "Cari...",
}: TableSearchProps) => {
  return (
    <div className="relative w-full max-w-xs">
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-dark-400" />
      <Input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="pl-10"
      />
    </div>
  );
};

// Full DataTable Component
interface DataTableProps<T> {
  data: T[];
  columns: {
    key: string;
    header: string;
    render?: (value: unknown, row: T) => ReactNode;
    sortable?: boolean;
    width?: string;
  }[];
  loading?: boolean;
  emptyMessage?: string;
  searchable?: boolean;
  searchKeys?: string[];
  pagination?: boolean;
  itemsPerPage?: number;
  onRowClick?: (row: T) => void;
  actions?: (row: T) => ReactNode;
}

function DataTable<T extends object>({
  data,
  columns,
  loading = false,
  emptyMessage = "Tidak ada data",
  searchable = true,
  searchKeys = [],
  pagination = true,
  itemsPerPage = 10,
  onRowClick,
  actions,
}: DataTableProps<T>) {
  const [search, setSearch] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [sortKey, setSortKey] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");

  // Filter data
  const filteredData = search
    ? data.filter((row) =>
        searchKeys.some((key) => {
          const value = (row as Record<string, unknown>)[key];
          if (typeof value === "string") {
            return value.toLowerCase().includes(search.toLowerCase());
          }
          if (typeof value === "number") {
            return value.toString().includes(search);
          }
          return false;
        })
      )
    : data;

  // Sort data
  const sortedData = sortKey
    ? [...filteredData].sort((a, b) => {
        const aVal = (a as Record<string, unknown>)[sortKey];
        const bVal = (b as Record<string, unknown>)[sortKey];
        if (aVal === bVal) return 0;
        if (aVal === null || aVal === undefined) return 1;
        if (bVal === null || bVal === undefined) return -1;
        const comparison =
          (aVal as string | number) < (bVal as string | number) ? -1 : 1;
        return sortDirection === "asc" ? comparison : -comparison;
      })
    : filteredData;

  // Paginate data
  const totalPages = Math.ceil(sortedData.length / itemsPerPage);
  const paginatedData = pagination
    ? sortedData.slice(
        (currentPage - 1) * itemsPerPage,
        currentPage * itemsPerPage
      )
    : sortedData;

  const handleSort = (key: string) => {
    if (sortKey === key) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortKey(key);
      setSortDirection("asc");
    }
  };

  return (
    <div className="card">
      {searchable && (
        <div className="px-6 py-4 border-b border-dark-100">
          <TableSearch value={search} onChange={setSearch} />
        </div>
      )}

      <Table>
        <TableHeader>
          <TableRow>
            {columns.map((col) => (
              <TableHead
                key={col.key}
                sortable={col.sortable}
                sorted={sortKey === col.key ? sortDirection : null}
                onSort={() => col.sortable && handleSort(col.key)}
                style={{ width: col.width }}
              >
                {col.header}
              </TableHead>
            ))}
            {actions && <TableHead>Aksi</TableHead>}
          </TableRow>
        </TableHeader>
        <TableBody>
          {loading ? (
            <TableLoading />
          ) : paginatedData.length === 0 ? (
            <TableEmpty message={emptyMessage} />
          ) : (
            paginatedData.map((row, idx) => (
              <TableRow
                key={idx}
                onClick={() => onRowClick?.(row)}
                isClickable={!!onRowClick}
              >
                {columns.map((col) => (
                  <TableCell key={col.key}>
                    {col.render
                      ? col.render(
                          (row as Record<string, unknown>)[col.key],
                          row
                        )
                      : String(
                          (row as Record<string, unknown>)[col.key] ?? "-"
                        )}
                  </TableCell>
                ))}
                {actions && <TableCell>{actions(row)}</TableCell>}
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>

      {pagination && (
        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          onPageChange={setCurrentPage}
          totalItems={sortedData.length}
          itemsPerPage={itemsPerPage}
        />
      )}
    </div>
  );
}

export {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
  TableEmpty,
  TableLoading,
  Pagination,
  TableSearch,
  DataTable,
};
