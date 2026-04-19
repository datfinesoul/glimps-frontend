import { useState, useEffect, useCallback } from "react";
import { UploadZone } from "./components/UploadZone";
import { MediaGrid } from "./components/MediaGrid";
import { MediaDetail } from "./components/MediaDetail";

interface MediaItem {
  id: string;
  thumbnailPath: string | null;
  previewPath: string | null;
  type: string;
  fileName: string;
  favorited: boolean;
  sensitive: boolean;
}

interface MediaListResponse {
  data: MediaItem[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

interface MediaDetailResponse {
  id: string;
  originalPath: string | null;
  thumbnailPath: string | null;
  previewPath: string | null;
  animatedThumbnailPath: string | null;
  type: string;
  fileName: string;
  mimeType?: string;
  fileSize?: number;
  width: number | null;
  height: number | null;
  duration?: number | null;
  metadata?: Record<string, unknown>;
  favorited: boolean;
  sensitive: boolean;
  createdAt: string;
}

function App() {
  const [mediaItems, setMediaItems] = useState<MediaItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [totalItems, setTotalItems] = useState(0);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [selectedDetail, setSelectedDetail] = useState<MediaDetailResponse | null>(null);
  const [typeFilter, setTypeFilter] = useState<"all" | "image" | "video">("all");
  const [dateFrom, setDateFrom] = useState<string>("");
  const [dateTo, setDateTo] = useState<string>("");

  const buildQuery = useCallback((page: number) => {
    const params = new URLSearchParams({ page: String(page), limit: "30" });
    if (typeFilter !== "all") params.set("type", typeFilter);
    if (dateFrom) params.set("dateFrom", dateFrom);
    if (dateTo) params.set("dateTo", dateTo);
    return `/api/media?${params.toString()}`;
  }, [typeFilter, dateFrom, dateTo]);

  const fetchMedia = useCallback(async (page: number) => {
    setLoading(true);
    try {
      const response = await fetch(buildQuery(page));
      if (response.ok) {
        const data: MediaListResponse = await response.json();
        setMediaItems(data.data);
        setCurrentPage(data.pagination.page);
        setTotalPages(data.pagination.totalPages);
        setTotalItems(data.pagination.total);
      }
    } catch (err) {
      console.error("Failed to fetch media:", err);
    } finally {
      setLoading(false);
    }
  }, [buildQuery]);

  useEffect(() => {
    fetchMedia(1);
  }, [fetchMedia]);

  const handleSelect = useCallback(async (item: MediaItem) => {
    const index = mediaItems.findIndex((m) => m.id === item.id);
    setSelectedIndex(index);

    try {
      const response = await fetch(`/api/media/${item.id}`);
      if (response.ok) {
        const detail: MediaDetailResponse = await response.json();
        setSelectedDetail(detail);
      }
    } catch (err) {
      console.error("Failed to fetch media detail:", err);
    }
  }, [mediaItems]);

  const handleClose = () => {
    setSelectedIndex(null);
    setSelectedDetail(null);
  };

  const handleNavigate = useCallback((direction: "prev" | "next") => {
    if (selectedIndex === null) return;
    let newIndex = selectedIndex;
    if (direction === "prev" && selectedIndex > 0) {
      newIndex = selectedIndex - 1;
    } else if (direction === "next" && selectedIndex < mediaItems.length - 1) {
      newIndex = selectedIndex + 1;
    } else {
      return;
    }
    setSelectedIndex(newIndex);
    const item = mediaItems[newIndex];
    if (item) {
      fetch(`/api/media/${item.id}`)
        .then((res) => res.ok && res.json())
        .then((detail: MediaDetailResponse) => setSelectedDetail(detail))
        .catch(console.error);
    }
  }, [selectedIndex, mediaItems]);

  const handlePageChange = (newPage: number) => {
    if (newPage < 1 || newPage > totalPages) return;
    setSelectedIndex(null);
    fetchMedia(newPage);
  };

  return (
    <main style={{ minHeight: "100vh", backgroundColor: "#fff" }}>
      <header style={{ padding: "1.5rem 2rem", borderBottom: "1px solid #e5e5e5" }}>
        <h1 style={{ margin: 0, fontSize: "1.5rem", fontWeight: 600 }}>Glimps</h1>
        <p style={{ margin: "0.25rem 0 0 0", color: "#666", fontSize: "0.875rem" }}>
          Personal image library
        </p>
      </header>

      <section>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 2rem", marginTop: "2rem" }}>
          <h2 style={{ fontSize: "1.125rem", fontWeight: 600, margin: 0 }}>Browse</h2>
          {totalItems > 0 && (
            <span style={{ fontSize: "0.875rem", color: "#666" }}>
              {totalItems.toLocaleString()} items
            </span>
          )}
        </div>

        <div style={{ display: "flex", gap: "0.75rem", padding: "0.75rem 2rem", alignItems: "center", flexWrap: "wrap" }}>
          <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
            <span style={{ fontSize: "0.875rem", color: "#666" }}>Type:</span>
            <button
              style={{ ...filterBtnStyle, ...(typeFilter === "all" ? filterBtnActive : {}) }}
              onClick={() => { setTypeFilter("all"); setSelectedIndex(null); fetchMedia(1); }}
            >
              All
            </button>
            <button
              style={{ ...filterBtnStyle, ...(typeFilter === "image" ? filterBtnActive : {}) }}
              onClick={() => { setTypeFilter("image"); setSelectedIndex(null); fetchMedia(1); }}
            >
              Images
            </button>
            <button
              style={{ ...filterBtnStyle, ...(typeFilter === "video" ? filterBtnActive : {}) }}
              onClick={() => { setTypeFilter("video"); setSelectedIndex(null); fetchMedia(1); }}
            >
              Videos
            </button>
          </div>

          <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
            <span style={{ fontSize: "0.875rem", color: "#666" }}>From:</span>
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => { setDateFrom(e.target.value); setSelectedIndex(null); fetchMedia(1); }}
              style={filterInputStyle}
            />
            <span style={{ fontSize: "0.875rem", color: "#666" }}>To:</span>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => { setDateTo(e.target.value); setSelectedIndex(null); fetchMedia(1); }}
              style={filterInputStyle}
            />
            {(dateFrom || dateTo) && (
              <button
                style={filterBtnStyle}
                onClick={() => { setDateFrom(""); setDateTo(""); setSelectedIndex(null); fetchMedia(1); }}
              >
                Clear
              </button>
            )}
          </div>
        </div>

        {totalPages > 1 && (
          <div style={{ ...paginationStyles.container, paddingTop: "1rem" }}>
            <button
              style={paginationStyles.button}
              onClick={() => handlePageChange(currentPage - 1)}
              disabled={currentPage <= 1}
            >
              ‹ Prev
            </button>
            <span style={paginationStyles.pageInfo}>
              Page {currentPage} of {totalPages}
            </span>
            <button
              style={paginationStyles.button}
              onClick={() => handlePageChange(currentPage + 1)}
              disabled={currentPage >= totalPages}
            >
              Next ›
            </button>
          </div>
        )}

        <MediaGrid items={mediaItems} loading={loading} onSelect={handleSelect} />

        {totalPages > 1 && (
          <div style={paginationStyles.container}>
            <button
              style={paginationStyles.button}
              onClick={() => handlePageChange(currentPage - 1)}
              disabled={currentPage <= 1}
            >
              ‹ Prev
            </button>
            <span style={paginationStyles.pageInfo}>
              Page {currentPage} of {totalPages}
            </span>
            <button
              style={paginationStyles.button}
              onClick={() => handlePageChange(currentPage + 1)}
              disabled={currentPage >= totalPages}
            >
              Next ›
            </button>
          </div>
        )}
      </section>

      <section>
        <h2 style={{ fontSize: "1.125rem", fontWeight: 600, padding: "0 2rem", marginTop: "2rem" }}>
          Upload Media
        </h2>
        <UploadZone />
      </section>

      <MediaDetail
        item={selectedDetail}
        onClose={handleClose}
        onNavigate={handleNavigate}
        hasPrev={selectedIndex !== null && selectedIndex > 0}
        hasNext={selectedIndex !== null && selectedIndex < mediaItems.length - 1}
      />
    </main>
  );
}

const paginationStyles: Record<string, Record<string, string>> = {
  container: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "1rem",
    padding: "1rem 2rem 2rem 2rem",
  },
  button: {
    padding: "0.5rem 1rem",
    fontSize: "0.875rem",
    fontWeight: "500",
    color: "#0070f3",
    backgroundColor: "transparent",
    border: "1px solid #0070f3",
    borderRadius: "6px",
    cursor: "pointer",
  },
  pageInfo: {
    fontSize: "0.875rem",
    color: "#666",
  },
};

const filterBtnStyle: Record<string, string> = {
  padding: "0.25rem 0.75rem",
  fontSize: "0.875rem",
  fontWeight: "500",
  color: "#666",
  backgroundColor: "transparent",
  border: "1px solid #ddd",
  borderRadius: "4px",
  cursor: "pointer",
};

const filterBtnActive: Record<string, string> = {
  color: "#0070f3",
  borderColor: "#0070f3",
};

const filterInputStyle: Record<string, string> = {
  padding: "0.25rem 0.5rem",
  fontSize: "0.875rem",
  border: "1px solid #ddd",
  borderRadius: "4px",
};

export default App;