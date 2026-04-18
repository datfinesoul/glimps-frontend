import { MediaCard } from "./MediaCard";

interface MediaItem {
  id: string;
  thumbnailPath: string | null;
  previewPath: string | null;
  type: string;
  fileName: string;
  favorited: boolean;
  sensitive: boolean;
}

interface MediaGridProps {
  items: MediaItem[];
  loading: boolean;
  onSelect: (item: MediaItem) => void;
}

export function MediaGrid({ items, loading, onSelect }: MediaGridProps) {
  if (loading) {
    return (
      <div style={styles.container}>
        <div style={styles.grid}>
          {Array.from({ length: 12 }).map((_, i) => (
            <div key={i} style={styles.skeleton} />
          ))}
        </div>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div style={styles.empty}>
        <p style={styles.emptyText}>No media yet</p>
        <p style={styles.emptySubtext}>Upload some images or videos to get started</p>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <div style={styles.grid}>
        {items.map((item) => (
          <MediaCard key={item.id} item={item} onClick={() => onSelect(item)} />
        ))}
      </div>
    </div>
  );
}

const styles: Record<string, Record<string, string>> = {
  container: {
    padding: "0 2rem 2rem 2rem",
  },
  grid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))",
    gap: "1rem",
  },
  skeleton: {
    aspectRatio: "1",
    backgroundColor: "#e5e5e5",
    borderRadius: "8px",
    animation: "pulse 1.5s ease-in-out infinite",
  },
  empty: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    padding: "4rem 2rem",
    textAlign: "center",
  },
  emptyText: {
    fontSize: "1.125rem",
    fontWeight: "500",
    color: "#1a1a1a",
    margin: "0 0 0.5rem 0",
  },
  emptySubtext: {
    fontSize: "0.875rem",
    color: "#666",
    margin: "0",
  },
};