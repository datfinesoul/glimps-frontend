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

function App() {
  const [mediaItems, setMediaItems] = useState<MediaItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const fetchMedia = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/media?page=1&limit=30");
      if (response.ok) {
        const data: MediaListResponse = await response.json();
        setMediaItems(data.data);
      }
    } catch (err) {
      console.error("Failed to fetch media:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchMedia();
  }, [fetchMedia]);

  const handleSelect = (item: MediaItem) => {
    const index = mediaItems.findIndex((m) => m.id === item.id);
    setSelectedIndex(index);
  };

  const handleClose = () => {
    setSelectedIndex(null);
  };

  const handleNavigate = (direction: "prev" | "next") => {
    if (selectedIndex === null) return;
    if (direction === "prev" && selectedIndex > 0) {
      setSelectedIndex(selectedIndex - 1);
    } else if (direction === "next" && selectedIndex < mediaItems.length - 1) {
      setSelectedIndex(selectedIndex + 1);
    }
  };

  const selectedItem = selectedIndex !== null ? mediaItems[selectedIndex] : null;

  return (
    <main style={{ minHeight: "100vh", backgroundColor: "#fff" }}>
      <header style={{ padding: "1.5rem 2rem", borderBottom: "1px solid #e5e5e5" }}>
        <h1 style={{ margin: 0, fontSize: "1.5rem", fontWeight: 600 }}>Glimps</h1>
        <p style={{ margin: "0.25rem 0 0 0", color: "#666", fontSize: "0.875rem" }}>
          Personal image library
        </p>
      </header>

      <section>
        <h2 style={{ fontSize: "1.125rem", fontWeight: 600, padding: "0 2rem", marginTop: "2rem" }}>
          Browse
        </h2>
        <MediaGrid items={mediaItems} loading={loading} onSelect={handleSelect} />
      </section>

      <section>
        <h2 style={{ fontSize: "1.125rem", fontWeight: 600, padding: "0 2rem", marginTop: "2rem" }}>
          Upload Media
        </h2>
        <UploadZone />
      </section>

      <MediaDetail
        item={selectedItem}
        onClose={handleClose}
        onNavigate={handleNavigate}
        hasPrev={selectedIndex !== null && selectedIndex > 0}
        hasNext={selectedIndex !== null && selectedIndex < mediaItems.length - 1}
      />
    </main>
  );
}

export default App;