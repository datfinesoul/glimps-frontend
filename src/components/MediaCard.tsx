interface MediaItem {
  id: string;
  thumbnailPath: string | null;
  previewPath: string | null;
  type: string;
  fileName: string;
  favorited: boolean;
  sensitive: boolean;
}

interface MediaCardProps {
  item: MediaItem;
  onClick: () => void;
}

export function MediaCard({ item, onClick }: MediaCardProps) {
  const imageUrl = item.thumbnailPath || item.previewPath || "/placeholder.svg";

  return (
    <div style={styles.card} onClick={onClick}>
      <div style={styles.imageWrapper}>
        <img src={imageUrl} alt={item.fileName} style={styles.image} loading="lazy" />
        {item.type === "video" && (
          <div style={styles.videoIndicator}>▶</div>
        )}
        {item.favorited && (
          <div style={styles.favoriteIndicator}>★</div>
        )}
      </div>
      <div style={styles.overlay}>
        <p style={styles.filename} title={item.fileName}>{item.fileName}</p>
      </div>
    </div>
  );
}

const styles: Record<string, Record<string, string | number>> = {
  card: {
    position: "relative",
    aspectRatio: "1",
    borderRadius: "8px",
    overflow: "hidden",
    cursor: "pointer",
    backgroundColor: "#f5f5f5",
    transition: "transform 0.2s ease, box-shadow 0.2s ease",
  },
  imageWrapper: {
    position: "relative",
    width: "100%",
    height: "100%",
  },
  image: {
    width: "100%",
    height: "100%",
    objectFit: "cover",
  },
  videoIndicator: {
    position: "absolute",
    top: "50%",
    left: "50%",
    transform: "translate(-50%, -50%)",
    fontSize: "2rem",
    color: "#fff",
    textShadow: "0 2px 4px rgba(0,0,0,0.5)",
    pointerEvents: "none",
  },
  favoriteIndicator: {
    position: "absolute",
    top: "8px",
    right: "8px",
    fontSize: "1.25rem",
    color: "#f59e0b",
    textShadow: "0 1px 2px rgba(0,0,0,0.5)",
  },
  overlay: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    padding: "0.5rem",
    background: "linear-gradient(transparent, rgba(0,0,0,0.7))",
    opacity: 0,
    transition: "opacity 0.2s ease",
  },
  filename: {
    margin: 0,
    fontSize: "0.75rem",
    color: "#fff",
    whiteSpace: "nowrap",
    overflow: "hidden",
    textOverflow: "ellipsis",
  },
};