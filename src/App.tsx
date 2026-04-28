import { useState, useEffect, useCallback } from "react";
import { useAuth } from "./contexts/AuthContext";
import { UploadZone } from "./components/UploadZone";
import { MediaGrid } from "./components/MediaGrid";
import { MediaDetail } from "./components/MediaDetail";
import { ConfirmDialog } from "./components/ConfirmDialog";
import { UserMenu } from "./components/UserMenu";
import { LoginPage } from "./pages/LoginPage";

interface MediaItem {
  id: string;
  thumbnailPath: string | null;
  previewPath: string | null;
  type: string;
  fileName: string;
  favorited: boolean;
  sensitive: boolean;
  createdAt: string;
  deletedAt?: string | null;
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

interface ConfirmState {
  type: "soft" | "hard" | "empty";
  item?: MediaItem;
  count?: number;
}

type ViewMode = "browse" | "search" | "trash";

function App() {
  const { user, loading } = useAuth();

  const [mediaItems, setMediaItems] = useState<MediaItem[]>([]);
  const [isLoading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [totalItems, setTotalItems] = useState(0);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [selectedDetail, setSelectedDetail] = useState<MediaDetailResponse | null>(null);
  const [typeFilter, setTypeFilter] = useState<"all" | "image" | "video">("all");
  const [dateFrom, setDateFrom] = useState<string>("");
  const [dateTo, setDateTo] = useState<string>("");

  const [viewMode, setViewMode] = useState<ViewMode>("browse");
  const [searchQuery, setSearchQuery] = useState("");
  const [deleteMode, setDeleteMode] = useState(false);

  const [trashItems, setTrashItems] = useState<MediaItem[]>([]);
  const [trashLoading, setTrashLoading] = useState(false);
  const [trashPage, setTrashPage] = useState(1);
  const [trashTotalPages, setTrashTotalPages] = useState(0);
  const [trashTotalItems, setTrashTotalItems] = useState(0);

  const [confirmState, setConfirmState] = useState<ConfirmState | null>(null);
  const [pendingDelete, setPendingDelete] = useState<MediaItem | null>(null);

  const buildQuery = useCallback((page: number) => {
    const params = new URLSearchParams({ page: String(page), limit: "30" });
    if (typeFilter !== "all") params.set("type", typeFilter);
    if (dateFrom) params.set("dateFrom", dateFrom);
    if (dateTo) params.set("dateTo", dateTo);
    return `/api/media?${params.toString()}`;
  }, [typeFilter, dateFrom, dateTo]);

  const buildSearchQuery = useCallback((page: number) => {
    const params = new URLSearchParams({ q: searchQuery, page: String(page), limit: "30" });
    if (typeFilter !== "all") params.set("type", typeFilter);
    if (dateFrom) params.set("dateFrom", dateFrom);
    if (dateTo) params.set("dateTo", dateTo);
    return `/api/media/search?${params.toString()}`;
  }, [searchQuery, typeFilter, dateFrom, dateTo]);

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

  const fetchSearch = useCallback(async (page: number) => {
    setLoading(true);
    try {
      const response = await fetch(buildSearchQuery(page));
      if (response.ok) {
        const data: MediaListResponse = await response.json();
        setMediaItems(data.data);
        setCurrentPage(data.pagination.page);
        setTotalPages(data.pagination.totalPages);
        setTotalItems(data.pagination.total);
      }
    } catch (err) {
      console.error("Failed to search media:", err);
    } finally {
      setLoading(false);
    }
  }, [buildSearchQuery]);

  const fetchTrash = useCallback(async (page: number) => {
    setTrashLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), limit: "30" });
      const response = await fetch(`/api/media/trash?${params.toString()}`);
      if (response.ok) {
        const data: MediaListResponse = await response.json();
        setTrashItems(data.data);
        setTrashPage(data.pagination.page);
        setTrashTotalPages(data.pagination.totalPages);
        setTrashTotalItems(data.pagination.total);
      }
    } catch (err) {
      console.error("Failed to fetch trash:", err);
    } finally {
      setTrashLoading(false);
    }
  }, []);

  const trashCount = trashTotalItems;

  useEffect(() => {
    if (viewMode === "browse") {
      fetchMedia(1);
    } else if (viewMode === "search") {
      fetchSearch(1);
    } else if (viewMode === "trash") {
      fetchTrash(1);
    }
  }, [viewMode, fetchMedia, fetchSearch, fetchTrash]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (confirmState) {
          setConfirmState(null);
          setPendingDelete(null);
        } else if (deleteMode) {
          setDeleteMode(false);
        }
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [deleteMode, confirmState]);

  const handleSelect = useCallback(async (item: MediaItem) => {
    if (deleteMode) {
      setPendingDelete(item);
      setConfirmState({ type: "soft", item });
      return;
    }

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
  }, [mediaItems, deleteMode]);

  const handleSoftDelete = async () => {
    if (!pendingDelete) return;
    try {
      const response = await fetch(`/api/media/${pendingDelete.id}`, { method: "DELETE" });
      if (response.ok) {
        setMediaItems((prev) => prev.filter((m) => m.id !== pendingDelete.id));
        setTotalItems((prev) => Math.max(0, prev - 1));
      }
    } catch (err) {
      console.error("Failed to delete:", err);
    } finally {
      setConfirmState(null);
      setPendingDelete(null);
    }
  };

  const handleRestore = async (item: MediaItem) => {
    try {
      const response = await fetch(`/api/media/${item.id}/restore`, { method: "POST" });
      if (response.ok) {
        setTrashItems((prev) => prev.filter((m) => m.id !== item.id));
        setTrashTotalItems((prev) => Math.max(0, prev - 1));
      }
    } catch (err) {
      console.error("Failed to restore:", err);
    }
  };

  const handleHardDelete = async () => {
    if (!pendingDelete) return;
    try {
      const response = await fetch(`/api/media/${pendingDelete.id}/permanent`, { method: "DELETE" });
      if (response.ok) {
        setTrashItems((prev) => prev.filter((m) => m.id !== pendingDelete.id));
        setTrashTotalItems((prev) => Math.max(0, prev - 1));
      }
    } catch (err) {
      console.error("Failed to permanently delete:", err);
    } finally {
      setConfirmState(null);
      setPendingDelete(null);
    }
  };

  const handleEmptyTrash = async () => {
    try {
      const response = await fetch(`/api/media/trash`, { method: "DELETE" });
      if (response.ok) {
        setTrashItems([]);
        setTrashTotalItems(0);
      }
    } catch (err) {
      console.error("Failed to empty trash:", err);
    } finally {
      setConfirmState(null);
      setPendingDelete(null);
    }
  };

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
    if (viewMode === "search") {
      fetchSearch(newPage);
    } else {
      fetchMedia(newPage);
    }
  };

  const handleTrashPageChange = (newPage: number) => {
    if (newPage < 1 || newPage > trashTotalPages) return;
    fetchTrash(newPage);
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    setViewMode("search");
    setSelectedIndex(null);
  };

  const clearSearch = () => {
    setSearchQuery("");
    setViewMode("browse");
    setSelectedIndex(null);
  };

  const goToTrash = () => {
    setViewMode("trash");
    setSelectedIndex(null);
    setSelectedDetail(null);
  };

  const goToBrowse = () => {
    setViewMode("browse");
    setSelectedIndex(null);
    setSelectedDetail(null);
    if (deleteMode) setDeleteMode(false);
  };

  const toggleDeleteMode = () => {
    setDeleteMode((prev) => !prev);
  };

  const isEmpty = !isLoading && mediaItems.length === 0;
  const emptyMessage = viewMode === "search"
    ? `No results for "${searchQuery}"`
    : viewMode === "trash"
    ? "Trash is empty"
    : "No media yet";

  if (loading) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "100vh" }}>
        <p style={{ color: "#666" }}>Loading...</p>
      </div>
    );
  }

  if (!user) {
    return <LoginPage />;
  }

  return (
    <main style={{ minHeight: "100vh", backgroundColor: "#fff" }}>
      <header style={{ padding: "1.5rem 2rem", borderBottom: "1px solid #e5e5e5" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div>
            <h1 style={{ margin: 0, fontSize: "1.5rem", fontWeight: 600 }}>Glimps</h1>
            <p style={{ margin: "0.25rem 0 0 0", color: "#666", fontSize: "0.875rem" }}>
              Personal image library
            </p>
          </div>
          <UserMenu />
          {viewMode === "trash" && (
            <button style={styles.backBtn} onClick={goToBrowse}>
              ← Back to Browse
            </button>
          )}
        </div>
      </header>

      {viewMode !== "trash" && (
        <section>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 2rem", marginTop: "2rem" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
              <h2 style={{ fontSize: "1.125rem", fontWeight: 600, margin: 0 }}>
                {viewMode === "search" ? `Results for "${searchQuery}"` : "Browse"}
              </h2>
              {totalItems > 0 && (
                <span style={{ fontSize: "0.875rem", color: "#666" }}>
                  {totalItems.toLocaleString()} items
                </span>
              )}
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
              {viewMode === "search" ? (
                <button style={styles.clearSearchBtn} onClick={clearSearch}>
                  Clear search
                </button>
              ) : (
                <form onSubmit={handleSearch} style={{ display: "flex", gap: "0.5rem" }}>
                  <input
                    type="text"
                    placeholder="Search..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    style={styles.searchInput}
                  />
                  <button type="submit" style={styles.searchBtn} disabled={!searchQuery.trim()}>
                    Search
                  </button>
                </form>
              )}
              <button
                style={{
                  ...styles.deleteModeBtn,
                  ...(deleteMode ? styles.deleteModeActive : {}),
                }}
                onClick={toggleDeleteMode}
                title="Delete mode"
              >
                🗑 Delete
              </button>
              <button
                style={styles.trashBtn}
                onClick={goToTrash}
                title="View trash"
              >
                🗑 Trash
                {trashCount > 0 && (
                  <span style={styles.trashBadge}>{trashCount}</span>
                )}
              </button>
            </div>
          </div>

          <div style={{ display: "flex", gap: "0.75rem", padding: "0.75rem 2rem", alignItems: "center", flexWrap: "wrap" }}>
            <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
              <span style={{ fontSize: "0.875rem", color: "#666" }}>Type:</span>
              <button
                style={{ ...filterBtnStyle, ...(typeFilter === "all" ? filterBtnActive : {}) }}
                onClick={() => { setTypeFilter("all"); setSelectedIndex(null); if (viewMode === "search") { fetchSearch(1); } else { fetchMedia(1); } }}
              >
                All
              </button>
              <button
                style={{ ...filterBtnStyle, ...(typeFilter === "image" ? filterBtnActive : {}) }}
                onClick={() => { setTypeFilter("image"); setSelectedIndex(null); if (viewMode === "search") { fetchSearch(1); } else { fetchMedia(1); } }}
              >
                Images
              </button>
              <button
                style={{ ...filterBtnStyle, ...(typeFilter === "video" ? filterBtnActive : {}) }}
                onClick={() => { setTypeFilter("video"); setSelectedIndex(null); if (viewMode === "search") { fetchSearch(1); } else { fetchMedia(1); } }}
              >
                Videos
              </button>
            </div>

            <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
              <span style={{ fontSize: "0.875rem", color: "#666" }}>From:</span>
              <input
                type="date"
                value={dateFrom}
                onChange={(e) => { setDateFrom(e.target.value); setSelectedIndex(null); if (viewMode === "search") { fetchSearch(1); } else { fetchMedia(1); } }}
                style={filterInputStyle}
              />
              <span style={{ fontSize: "0.875rem", color: "#666" }}>To:</span>
              <input
                type="date"
                value={dateTo}
                onChange={(e) => { setDateTo(e.target.value); setSelectedIndex(null); if (viewMode === "search") { fetchSearch(1); } else { fetchMedia(1); } }}
                style={filterInputStyle}
              />
              {(dateFrom || dateTo) && (
                <button
                  style={filterBtnStyle}
                  onClick={() => { setDateFrom(""); setDateTo(""); setSelectedIndex(null); if (viewMode === "search") { fetchSearch(1); } else { fetchMedia(1); } }}
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

          {isEmpty ? (
            <div style={styles.emptyState}>
              <p style={styles.emptyText}>{emptyMessage}</p>
            </div>
          ) : (
            <MediaGrid items={mediaItems} loading={isLoading} onSelect={handleSelect} />
          )}

          {totalPages > 1 && !isEmpty && (
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
      )}

      {viewMode === "trash" && (
        <section>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 2rem", marginTop: "2rem" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
              <h2 style={{ fontSize: "1.125rem", fontWeight: 600, margin: 0 }}>Trash</h2>
              {trashTotalItems > 0 && (
                <span style={{ fontSize: "0.875rem", color: "#666" }}>
                  {trashTotalItems.toLocaleString()} items
                </span>
              )}
            </div>
            {trashTotalItems > 0 && (
              <button
                style={styles.emptyTrashBtn}
                onClick={() => setConfirmState({ type: "empty", count: trashTotalItems })}
              >
                Empty Trash
              </button>
            )}
          </div>

          {trashTotalPages > 1 && (
            <div style={{ ...paginationStyles.container, paddingTop: "1rem" }}>
              <button
                style={paginationStyles.button}
                onClick={() => handleTrashPageChange(trashPage - 1)}
                disabled={trashPage <= 1}
              >
                ‹ Prev
              </button>
              <span style={paginationStyles.pageInfo}>
                Page {trashPage} of {trashTotalPages}
              </span>
              <button
                style={paginationStyles.button}
                onClick={() => handleTrashPageChange(trashPage + 1)}
                disabled={trashPage >= trashTotalPages}
              >
                Next ›
              </button>
            </div>
          )}

          {trashTotalItems === 0 && !trashLoading ? (
            <div style={styles.emptyState}>
              <p style={styles.emptyText}>Trash is empty</p>
            </div>
          ) : (
            <MediaGrid
              items={trashItems}
              loading={trashLoading}
              onSelect={(item) => handleRestore(item)}
              trashItems={trashItems}
              onRestore={handleRestore}
              onHardDelete={(item) => {
                setPendingDelete(item);
                setConfirmState({ type: "hard", item });
              }}
            />
          )}

          {trashTotalPages > 1 && trashTotalItems > 0 && (
            <div style={paginationStyles.container}>
              <button
                style={paginationStyles.button}
                onClick={() => handleTrashPageChange(trashPage - 1)}
                disabled={trashPage <= 1}
              >
                ‹ Prev
              </button>
              <span style={paginationStyles.pageInfo}>
                Page {trashPage} of {trashTotalPages}
              </span>
              <button
                style={paginationStyles.button}
                onClick={() => handleTrashPageChange(trashPage + 1)}
                disabled={trashPage >= trashTotalPages}
              >
                Next ›
              </button>
            </div>
          )}
        </section>
      )}

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

      {confirmState && (
        <>
          {confirmState.type === "soft" && confirmState.item && (
            <ConfirmDialog
              title="Move to trash?"
              message={confirmState.item.fileName}
              confirmLabel="Delete"
              cancelLabel="Cancel"
              destructive
              onConfirm={handleSoftDelete}
              onCancel={() => { setConfirmState(null); setPendingDelete(null); }}
            />
          )}
          {confirmState.type === "hard" && confirmState.item && (
            <ConfirmDialog
              title="Delete permanently?"
              message={confirmState.item.fileName}
              details={<span style={{ color: "#dc2626" }}>This cannot be undone.</span>}
              confirmLabel="Delete Permanently"
              cancelLabel="Cancel"
              destructive
              onConfirm={handleHardDelete}
              onCancel={() => { setConfirmState(null); setPendingDelete(null); }}
            />
          )}
          {confirmState.type === "empty" && (
            <ConfirmDialog
              title="Empty trash?"
              message={`Permanently delete ${confirmState.count} item${confirmState.count === 1 ? "" : "s"}?`}
              details={<span style={{ color: "#dc2626" }}>This cannot be undone.</span>}
              confirmLabel="Empty Trash"
              cancelLabel="Cancel"
              destructive
              onConfirm={handleEmptyTrash}
              onCancel={() => { setConfirmState(null); setPendingDelete(null); }}
            />
          )}
        </>
      )}
    </main>
  );
}

const styles: Record<string, Record<string, string | number>> = {
  backBtn: {
    padding: "0.5rem 1rem",
    fontSize: "0.875rem",
    fontWeight: 500,
    color: "#0070f3",
    backgroundColor: "transparent",
    border: "1px solid #0070f3",
    borderRadius: "6px",
    cursor: "pointer",
  },
  deleteModeBtn: {
    padding: "0.5rem 1rem",
    fontSize: "0.875rem",
    fontWeight: 500,
    color: "#666",
    backgroundColor: "transparent",
    border: "1px solid #ddd",
    borderRadius: "6px",
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    gap: "0.375rem",
  },
  deleteModeActive: {
    color: "#dc2626",
    borderColor: "#dc2626",
    backgroundColor: "#fef2f2",
  },
  trashBtn: {
    padding: "0.5rem 1rem",
    fontSize: "0.875rem",
    fontWeight: 500,
    color: "#666",
    backgroundColor: "transparent",
    border: "1px solid #ddd",
    borderRadius: "6px",
    cursor: "pointer",
    position: "relative",
    display: "flex",
    alignItems: "center",
    gap: "0.375rem",
  },
  trashBadge: {
    position: "absolute",
    top: "-6px",
    right: "-6px",
    backgroundColor: "#dc2626",
    color: "#fff",
    fontSize: "0.7rem",
    fontWeight: 600,
    borderRadius: "9999px",
    padding: "0.125rem 0.375rem",
    minWidth: "18px",
    textAlign: "center",
  },
  searchInput: {
    padding: "0.5rem 0.75rem",
    fontSize: "0.875rem",
    border: "1px solid #ddd",
    borderRadius: "6px",
    width: "200px",
  },
  searchBtn: {
    padding: "0.5rem 1rem",
    fontSize: "0.875rem",
    fontWeight: 500,
    color: "#fff",
    backgroundColor: "#0070f3",
    border: "none",
    borderRadius: "6px",
    cursor: "pointer",
  },
  clearSearchBtn: {
    padding: "0.5rem 1rem",
    fontSize: "0.875rem",
    fontWeight: 500,
    color: "#666",
    backgroundColor: "transparent",
    border: "1px solid #ddd",
    borderRadius: "6px",
    cursor: "pointer",
  },
  emptyTrashBtn: {
    padding: "0.5rem 1rem",
    fontSize: "0.875rem",
    fontWeight: 500,
    color: "#fff",
    backgroundColor: "#dc2626",
    border: "none",
    borderRadius: "6px",
    cursor: "pointer",
  },
  emptyState: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    padding: "4rem 2rem",
    textAlign: "center",
  },
  emptyText: {
    fontSize: "1.125rem",
    fontWeight: 500,
    color: "#1a1a1a",
    margin: 0,
  },
};

const paginationStyles: Record<string, Record<string, string | number>> = {
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
