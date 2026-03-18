import { ChevronLeft, ChevronRight } from "lucide-react";

const PAGE_SIZE_OPTIONS = [10, 20, 30, 40, 50, 100];

/**
 * Reusable server-side pagination component with page size selector.
 * Props:
 *  currentPage   – number
 *  totalPages    – number
 *  onPageChange  – (page: number) => void
 *  pageSize      – number (current limit)
 *  onPageSizeChange – (size: number) => void
 *  totalItems    – number  (for label)
 *  label         – string  (e.g. "Orders", "Users")
 */
const AdminPagination = ({
  currentPage,
  totalPages,
  onPageChange,
  pageSize,
  onPageSizeChange,
  totalItems,
  label = "Items",
}) => {
  if (!totalItems) return null;

  const getPageNumbers = () => {
    const pages = [];
    const delta = 1;
    const rangeStart = Math.max(2, currentPage - delta);
    const rangeEnd   = Math.min(totalPages - 1, currentPage + delta);

    pages.push(1);
    if (rangeStart > 2) pages.push("...");
    for (let i = rangeStart; i <= rangeEnd; i++) pages.push(i);
    if (rangeEnd < totalPages - 1) pages.push("...");
    if (totalPages > 1) pages.push(totalPages);

    return pages;
  };

  const startItem = (currentPage - 1) * pageSize + 1;
  const endItem   = Math.min(currentPage * pageSize, totalItems);

  return (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-6 pb-2 border-t border-white/5">

      {/* LEFT — results label + page size selector */}
      <div className="flex items-center gap-3">
        <p className="text-[10px] font-black uppercase tracking-[0.2em] opacity-30 text-white whitespace-nowrap">
          {startItem}–{endItem} of {totalItems} {label}
        </p>

        {/* Page size dropdown */}
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-black uppercase tracking-[0.15em] opacity-20 text-white">Show</span>
          <select
            value={pageSize}
            onChange={(e) => {
              onPageSizeChange(Number(e.target.value));
              onPageChange(1); // always reset to page 1 on size change
            }}
            className="bg-white/5 border border-white/10 rounded-lg text-[10px] font-black text-white/60 uppercase px-2 py-1 outline-none focus:border-primary/50 transition-all cursor-pointer hover:border-primary/30"
          >
            {PAGE_SIZE_OPTIONS.map((size) => (
              <option key={size} value={size} className="bg-[#121212] text-white">
                {size}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* RIGHT — page buttons (hidden if only 1 page) */}
      {totalPages > 1 && (
        <div className="flex items-center gap-1">
          <button
            onClick={() => onPageChange(currentPage - 1)}
            disabled={currentPage === 1}
            className="w-8 h-8 flex items-center justify-center rounded-xl bg-white/5 border border-white/10 text-white/40 hover:border-primary/50 hover:text-primary transition-all disabled:opacity-20 disabled:cursor-not-allowed disabled:hover:border-white/10 disabled:hover:text-white/40"
          >
            <ChevronLeft size={14} />
          </button>

          {getPageNumbers().map((page, i) =>
            page === "..." ? (
              <span key={`e-${i}`} className="w-8 h-8 flex items-center justify-center text-[10px] font-black text-white/20">
                ···
              </span>
            ) : (
              <button
                key={page}
                onClick={() => onPageChange(page)}
                className={`w-8 h-8 flex items-center justify-center rounded-xl text-[11px] font-black transition-all border ${
                  currentPage === page
                    ? "bg-primary border-primary text-black"
                    : "bg-white/5 border-white/10 text-white/40 hover:border-primary/50 hover:text-primary"
                }`}
              >
                {page}
              </button>
            )
          )}

          <button
            onClick={() => onPageChange(currentPage + 1)}
            disabled={currentPage === totalPages}
            className="w-8 h-8 flex items-center justify-center rounded-xl bg-white/5 border border-white/10 text-white/40 hover:border-primary/50 hover:text-primary transition-all disabled:opacity-20 disabled:cursor-not-allowed disabled:hover:border-white/10 disabled:hover:text-white/40"
          >
            <ChevronRight size={14} />
          </button>
        </div>
      )}
    </div>
  );
};

export default AdminPagination;