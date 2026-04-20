import { useState } from "react";

interface MediaDetailItem {
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

interface MediaDetailProps {
  item: Partial<MediaDetailItem> | null;
  onClose: () => void;
  onNavigate: (direction: "prev" | "next") => void;
  hasPrev: boolean;
  hasNext: boolean;
}

export function MediaDetail({ item, onClose, onNavigate, hasPrev, hasNext }: MediaDetailProps) {
  const [videoQuality, setVideoQuality] = useState<"preview" | "original">("preview");

  if (!item) return null;

  const isVideo = item.type === "video";
  const imageUrl = item.previewPath || item.thumbnailPath || item.originalPath || "/placeholder.svg";

  const streamUrl = `/api/media/${item.id}/stream`;
  const videoSrc = videoQuality === "preview" && item.previewPath ? streamUrl : item.originalPath;

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const formatDate = (dateStr: string): string => {
    return new Date(dateStr).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") onClose();
    if (e.key === "ArrowLeft" && hasPrev) onNavigate("prev");
    if (e.key === "ArrowRight" && hasNext) onNavigate("next");
  };

  return (
    <div style={styles.overlay} onKeyDown={handleKeyDown} tabIndex={0}>
      <div style={styles.backdrop} onClick={onClose} />
      <div style={styles.content}>
        <button style={styles.closeButton} onClick={onClose}>✕</button>

        <button
          style={{ ...styles.navButton, ...styles.prevButton }}
          onClick={() => onNavigate("prev")}
          disabled={!hasPrev}
        >
          ‹
        </button>

        <div style={styles.imageContainer}>
          {isVideo && item.previewPath ? (
            <div style={{ position: "relative", width: "100%" }}>
              <video
                src={videoSrc || streamUrl}
                controls
                style={{ ...styles.image, width: "100%", maxHeight: "70vh" }}
              />
              <div style={{ marginTop: "0.5rem", display: "flex", alignItems: "center", gap: "0.5rem" }}>
                <span style={{ color: "#fff", fontSize: "0.75rem" }}>Quality:</span>
                <select
                  value={videoQuality}
                  onChange={(e) => setVideoQuality(e.target.value as "preview" | "original")}
                  style={styles.qualitySelect}
                >
                  {item.previewPath && <option value="preview">Preview</option>}
                  <option value="original">Original</option>
                </select>
              </div>
            </div>
          ) : (
            <img src={imageUrl} alt={item.fileName} style={styles.image} />
          )}
        </div>

        <button
          style={{ ...styles.navButton, ...styles.nextButton }}
          onClick={() => onNavigate("next")}
          disabled={!hasNext}
        >
          ›
        </button>
      </div>

      <div style={styles.metadata}>
        <div style={styles.filenameRow}>
          <h3 style={styles.filename}>{item.fileName}</h3>
          {item.originalPath && (
            <a
              href={item.originalPath}
              download={item.fileName}
              style={styles.downloadBtn}
              target="_blank"
              rel="noopener noreferrer"
            >
              ↓ Download Original
            </a>
          )}
        </div>
        <div style={styles.metaGrid}>
          <div style={styles.metaItem}>
            <span style={styles.metaLabel}>Type</span>
            <span style={styles.metaValue}>{item.mimeType ?? "Unknown"}</span>
          </div>
          <div style={styles.metaItem}>
            <span style={styles.metaLabel}>Size</span>
            <span style={styles.metaValue}>{item.fileSize != null ? formatFileSize(item.fileSize) : "Unknown"}</span>
          </div>
          {item.width && item.height && (
            <div style={styles.metaItem}>
              <span style={styles.metaLabel}>Dimensions</span>
              <span style={styles.metaValue}>{item.width} × {item.height}</span>
            </div>
          )}
          {item.duration && (
            <div style={styles.metaItem}>
              <span style={styles.metaLabel}>Duration</span>
              <span style={styles.metaValue}>{Math.round(item.duration / 60)}:{String(item.duration % 60).padStart(2, "0")}</span>
            </div>
          )}
          <div style={styles.metaItem}>
            <span style={styles.metaLabel}>Uploaded</span>
            <span style={styles.metaValue}>{item.createdAt ? formatDate(item.createdAt) : "Unknown"}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

const styles: Record<string, Record<string, string | number>> = {
  overlay: {
    position: "fixed",
    inset: 0,
    zIndex: 1000,
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    outline: "none",
  },
  backdrop: {
    position: "absolute",
    inset: 0,
    backgroundColor: "rgba(0, 0, 0, 0.9)",
  },
  content: {
    position: "relative",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    maxWidth: "90vw",
    maxHeight: "80vh",
    zIndex: 1,
  },
  closeButton: {
    position: "absolute",
    top: "-3rem",
    right: 0,
    background: "transparent",
    border: "none",
    color: "#fff",
    fontSize: "1.5rem",
    cursor: "pointer",
    padding: "0.5rem",
  },
  navButton: {
    position: "absolute",
    top: "50%",
    transform: "translateY(-50%)",
    background: "rgba(255, 255, 255, 0.1)",
    border: "none",
    color: "#fff",
    fontSize: "3rem",
    cursor: "pointer",
    padding: "1rem",
    zIndex: 2,
  },
  prevButton: {
    left: "-4rem",
  },
  nextButton: {
    right: "-4rem",
  },
  imageContainer: {
    maxWidth: "100%",
    maxHeight: "100%",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  image: {
    maxWidth: "100%",
    maxHeight: "80vh",
    objectFit: "contain",
    borderRadius: "4px",
  },
  metadata: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    background: "linear-gradient(transparent, rgba(0,0,0,0.8))",
    padding: "4rem 2rem 2rem 2rem",
    zIndex: 1,
  },
  filename: {
    margin: "0",
    fontSize: "1rem",
    fontWeight: "500",
    color: "#fff",
  },
  filenameRow: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: "1rem",
  },
  downloadBtn: {
    fontSize: "0.875rem",
    fontWeight: "500",
    color: "#0070f3",
    textDecoration: "none",
    padding: "0.25rem 0.5rem",
    border: "1px solid #0070f3",
    borderRadius: "4px",
  },
  metaGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))",
    gap: "1rem",
  },
  qualitySelect: {
    backgroundColor: "rgba(255,255,255,0.1)",
    color: "#fff",
    border: "1px solid rgba(255,255,255,0.3)",
    borderRadius: "4px",
    padding: "0.25rem 0.5rem",
    fontSize: "0.75rem",
    cursor: "pointer",
  },
  metaItem: {
    display: "flex",
    flexDirection: "column",
    gap: "0.25rem",
  },
  metaLabel: {
    fontSize: "0.75rem",
    color: "#aaa",
    textTransform: "uppercase",
  },
  metaValue: {
    fontSize: "0.875rem",
    color: "#fff",
  },
};