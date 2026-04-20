import { useState, useRef } from "react";

interface MediaItem {
  id: string;
  thumbnailPath: string | null;
  previewPath: string | null;
  animatedThumbnailPath: string | null;
  type: string;
  fileName: string;
  favorited: boolean;
  sensitive: boolean;
  createdAt: string;
  deletedAt?: string | null;
}

interface MediaCardProps {
  item: MediaItem;
  onClick: () => void;
  isTrash?: boolean;
  onRestore?: () => void;
  onHardDelete?: () => void;
}

export function MediaCard({ item, onClick, isTrash, onRestore, onHardDelete }: MediaCardProps) {
  const imageUrl = item.thumbnailPath || item.previewPath || "/placeholder.svg";

  const [showVideo, setShowVideo] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const isVideo = item.type === "video";
  const hasAnimatedThumbnail = !!item.animatedThumbnailPath;

  const handleMouseEnter = () => {
    if (isVideo && hasAnimatedThumbnail && videoRef.current) {
      setShowVideo(true);
      videoRef.current.play().catch(() => {});
    }
  };

  const handleMouseLeave = () => {
    if (showVideo && videoRef.current) {
      videoRef.current.pause();
      videoRef.current.currentTime = 0;
      setShowVideo(false);
    }
  };

  const formatDate = (dateStr: string): string => {
    const d = new Date(dateStr);
    return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  };

  const formatDeletedDate = (dateStr: string): string => {
    const d = new Date(dateStr);
    return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  };

  return (
    <div style={styles.card} onClick={onClick}>
      <div
        style={styles.imageWrapper}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
      >
        {isVideo && hasAnimatedThumbnail && showVideo ? (
          <video
            ref={videoRef}
            src={item.animatedThumbnailPath!}
            style={styles.image}
            muted
            loop
          />
        ) : (
          <img src={imageUrl} alt={item.fileName} style={styles.image} loading="lazy" />
        )}
        {item.type === "video" && (
          <div style={styles.videoIndicator}>▶</div>
        )}
        {item.favorited && (
          <div style={styles.favoriteIndicator}>★</div>
        )}
        {isTrash && item.deletedAt && (
          <div style={styles.deletedOverlay}>
            <span style={styles.deletedText}>Deleted {formatDeletedDate(item.deletedAt)}</span>
          </div>
        )}
        {!isTrash && (
          <div style={styles.dateOverlay}>
            <span style={styles.dateText}>{formatDate(item.createdAt)}</span>
          </div>
        )}
      </div>
      <div style={styles.overlay}>
        <p style={styles.filename} title={item.fileName}>{item.fileName}</p>
        {isTrash && (
          <div style={styles.trashActions}>
            <button
              style={styles.restoreBtn}
              onClick={(e) => { e.stopPropagation(); onRestore?.(); }}
            >
              Restore
            </button>
            <button
              style={styles.hardDeleteBtn}
              onClick={(e) => { e.stopPropagation(); onHardDelete?.(); }}
            >
              Delete
            </button>
          </div>
        )}
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
  dateOverlay: {
    position: "absolute",
    top: "8px",
    left: "8px",
    backgroundColor: "rgba(0,0,0,0.6)",
    borderRadius: "4px",
    padding: "0.125rem 0.375rem",
  },
  dateText: {
    fontSize: "0.7rem",
    color: "#fff",
  },
  deletedOverlay: {
    position: "absolute",
    top: "8px",
    left: "8px",
    backgroundColor: "rgba(220,38,38,0.9)",
    borderRadius: "4px",
    padding: "0.125rem 0.375rem",
  },
  deletedText: {
    fontSize: "0.7rem",
    color: "#fff",
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
  trashActions: {
    display: "flex",
    gap: "0.375rem",
    marginTop: "0.25rem",
  },
  restoreBtn: {
    flex: 1,
    padding: "0.25rem 0.5rem",
    fontSize: "0.7rem",
    fontWeight: 500,
    color: "#fff",
    backgroundColor: "rgba(0,113,227,0.9)",
    border: "none",
    borderRadius: "4px",
    cursor: "pointer",
  },
  hardDeleteBtn: {
    flex: 1,
    padding: "0.25rem 0.5rem",
    fontSize: "0.7rem",
    fontWeight: 500,
    color: "#fff",
    backgroundColor: "rgba(220,38,38,0.9)",
    border: "none",
    borderRadius: "4px",
    cursor: "pointer",
  },
};
