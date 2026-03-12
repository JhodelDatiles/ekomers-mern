import { ChevronLeft, ChevronRight } from "lucide-react";

const PAGE_SIZE_OPTIONS = [10, 20, 30, 40, 50, 100];

/**
 * Universal Pagination component.
 *
 * Props:
 *  currentPage      – number
 *  totalPages       – number
 *  onPageChange     – (page: number) => void
 *  pageSize         – number
 *  onPageSizeChange – (size: number) => void  (omit to hide size selector)
 *  totalItems       – number
 *  label            – string  e.g. "Orders", "Products"
 *  variant          – "dark" (admin) | "light" (user)  default: "dark"
 */
const Pagination = ({
  currentPage,
  totalPages,
  onPageChange,
  pageSize,
  onPageSizeChange,
  totalItems,
  label = "Items",
  variant = "dark",
}) => {
  if (!totalItems) return null;

  const isDark = variant === "dark";

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

  const border    = isDark ? "border-white/5"  : "border-base-300";
  const labelCls  = isDark ? "text-white opacity-30" : "text-base-content opacity-50";
  const selectCls = isDark
    ? "bg-white/5 border border-white/10 text-white/60 focus:border-primary/50 hover:border-primary/30"
    : "bg-base-200 border border-base-300 text-base-content/70 focus:border-primary/50 hover:border-primary/30";
  const btnBase = isDark
    ? "bg-white/5 border border-white/10 text-white/40 hover:border-primary/50 hover:text-primary disabled:hover:border-white/10 disabled:hover:text-white/40"
    : "bg-base-100 border border-base-300 text-base-content/40 hover:border-primary/50 hover:text-primary disabled:hover:border-base-300 disabled:hover:text-base-content/40";
  const activeCls = "bg-primary border-primary text-primary-content";

  return (
    <div className={`flex flex-col sm:flex-row items-center justify-between gap-4 pt-5 pb-2 border-t ${border}`}>

      {/* LEFT — label + optional size selector */}
      <div className="flex items-center gap-3">
        <p className={`text-[10px] font-black uppercase tracking-[0.2em] whitespace-nowrap ${labelCls}`}>
          {startItem}–{endItem} of {totalItems} {label}
        </p>

        {onPageSizeChange && (
          <div className="flex items-center gap-2">
            <span className={`text-[10px] font-black uppercase tracking-[0.15em] opacity-30 ${isDark ? "text-white" : "text-base-content"}`}>
              Show
            </span>
            <select
              value={pageSize}
              onChange={(e) => {
                onPageSizeChange(Number(e.target.value));
                onPageChange(1);
              }}
              className={`rounded-lg text-[10px] font-black uppercase px-2 py-1 outline-none transition-all cursor-pointer ${selectCls}`}
            >
              {PAGE_SIZE_OPTIONS.map((size) => (
                <option key={size} value={size} className={isDark ? "bg-[#121212] text-white" : ""}>
                  {size}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* RIGHT — page buttons */}
      {totalPages > 1 && (
        <div className="flex items-center gap-1">
          <button
            onClick={() => onPageChange(currentPage - 1)}
            disabled={currentPage === 1}
            className={`w-8 h-8 flex items-center justify-center rounded-xl transition-all disabled:opacity-20 disabled:cursor-not-allowed ${btnBase}`}
          >
            <ChevronLeft size={14} />
          </button>

          {getPageNumbers().map((page, i) =>
            page === "..." ? (
              <span key={`e-${i}`} className={`w-8 h-8 flex items-center justify-center text-[10px] font-black ${isDark ? "text-white/20" : "text-base-content/20"}`}>
                ···
              </span>
            ) : (
              <button
                key={page}
                onClick={() => onPageChange(page)}
                className={`w-8 h-8 flex items-center justify-center rounded-xl text-[11px] font-black transition-all border ${
                  currentPage === page ? activeCls : btnBase
                }`}
              >
                {page}
              </button>
            )
          )}

          <button
            onClick={() => onPageChange(currentPage + 1)}
            disabled={currentPage === totalPages}
            className={`w-8 h-8 flex items-center justify-center rounded-xl transition-all disabled:opacity-20 disabled:cursor-not-allowed ${btnBase}`}
          >
            <ChevronRight size={14} />
          </button>
        </div>
      )}
    </div>
  );
};

export default Pagination;