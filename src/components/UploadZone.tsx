import { useState, useCallback, DragEvent, ChangeEvent } from "react";

type UploadStatus = "idle" | "uploading" | "success" | "error";

interface UploadResult {
  id: string;
  status: string;
}

interface UploadError {
  error: string;
}

export function UploadZone() {
  const [status, setStatus] = useState<UploadStatus>("idle");
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState<UploadResult | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  const upload = useCallback(async (file: File) => {
    setStatus("uploading");
    setProgress(0);
    setResult(null);
    setErrorMessage(null);

    const formData = new FormData();
    formData.append("file", file);

    try {
      const xhr = new XMLHttpRequest();

      xhr.upload.addEventListener("progress", (e) => {
        if (e.lengthComputable) {
          setProgress(Math.round((e.loaded / e.total) * 100));
        }
      });

      const response = await new Promise<UploadResult>((resolve, reject) => {
        xhr.onload = () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            const data = JSON.parse(xhr.responseText);
            resolve(data as UploadResult);
          } else {
            try {
              const err = JSON.parse(xhr.responseText) as UploadError;
              reject(new Error(err.error || "upload failed"));
            } catch {
              reject(new Error(`upload failed: ${xhr.status}`));
            }
          }
        };

        xhr.onerror = () => reject(new Error("network error"));

        xhr.open("POST", "/api/media/upload");
        xhr.send(formData);
      });

      setResult(response);
      setStatus("success");
      setProgress(100);
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : "unknown error");
      setStatus("error");
    }
  }, []);

  const handleDrop = useCallback(
    (e: DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      setIsDragging(false);

      const file = e.dataTransfer.files[0];
      if (file && (file.type.startsWith("image/") || file.type.startsWith("video/"))) {
        upload(file);
      } else {
        setErrorMessage("Only images and videos are supported");
        setStatus("error");
      }
    },
    [upload]
  );

  const handleFileInput = useCallback(
    (e: ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
        upload(file);
      }
    },
    [upload]
  );

  const handleDragOver = useCallback((e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback(() => {
    setIsDragging(false);
  }, []);

  const reset = useCallback(() => {
    setStatus("idle");
    setProgress(0);
    setResult(null);
    setErrorMessage(null);
  }, []);

  return (
    <div style={styles.container}>
      <div
        style={{
          ...styles.zone,
          ...(isDragging ? styles.zoneDragging : {}),
        }}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
      >
        {status === "idle" && (
          <>
            <div style={styles.icon}>📁</div>
            <p style={styles.label}>Drag & drop an image or video here</p>
            <p style={styles.subLabel}>or</p>
            <label style={styles.button}>
              Browse Files
              <input
                type="file"
                accept="image/*,video/*"
                onChange={handleFileInput}
                style={styles.hiddenInput}
              />
            </label>
          </>
        )}

        {status === "uploading" && (
          <>
            <div style={styles.spinner} />
            <p style={styles.label}>Uploading...</p>
            <div style={styles.progressBar}>
              <div style={{ ...styles.progressFill, width: `${progress}%` }} />
            </div>
            <p style={styles.progressText}>{progress}%</p>
          </>
        )}

        {status === "success" && result && (
          <>
            <div style={styles.successIcon}>✓</div>
            <p style={styles.label}>Upload complete</p>
            <p style={styles.resultId}>ID: {result.id}</p>
            <p style={styles.resultStatus}>Status: {result.status}</p>
            <button onClick={reset} style={styles.resetButton}>
              Upload Another
            </button>
          </>
        )}

        {status === "error" && (
          <>
            <div style={styles.errorIcon}>✗</div>
            <p style={styles.label}>Upload failed</p>
            <p style={styles.errorMessage}>{errorMessage}</p>
            <button onClick={reset} style={styles.resetButton}>
              Try Again
            </button>
          </>
        )}
      </div>
    </div>
  );
}

const styles: Record<string, Record<string, string>> = {
  container: {
    display: "flex",
    justifyContent: "center",
    padding: "2rem",
  },
  zone: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    width: "100%",
    maxWidth: "480px",
    padding: "3rem 2rem",
    border: "2px dashed #ccc",
    borderRadius: "12px",
    backgroundColor: "#fafafa",
    cursor: "pointer",
    transition: "all 0.2s ease",
  },
  zoneDragging: {
    borderColor: "#0070f3",
    backgroundColor: "#f0f7ff",
  },
  icon: {
    fontSize: "3rem",
    marginBottom: "1rem",
  },
  label: {
    fontSize: "1.125rem",
    fontWeight: "500",
    color: "#1a1a1a",
    margin: "0 0 0.5rem 0",
  },
  subLabel: {
    fontSize: "0.875rem",
    color: "#666",
    margin: "0.25rem 0",
  },
  button: {
    display: "inline-block",
    padding: "0.5rem 1rem",
    fontSize: "0.875rem",
    fontWeight: "500",
    color: "#fff",
    backgroundColor: "#0070f3",
    borderRadius: "6px",
    cursor: "pointer",
    marginTop: "0.5rem",
  },
  hiddenInput: {
    display: "none",
  },
  spinner: {
    width: "2rem",
    height: "2rem",
    border: "3px solid #e0e0e0",
    borderTopColor: "#0070f3",
    borderRadius: "50%",
    animation: "spin 1s linear infinite",
    marginBottom: "1rem",
  },
  progressBar: {
    width: "100%",
    maxWidth: "300px",
    height: "8px",
    backgroundColor: "#e0e0e0",
    borderRadius: "4px",
    overflow: "hidden",
    marginTop: "1rem",
  },
  progressFill: {
    height: "100%",
    backgroundColor: "#0070f3",
    transition: "width 0.2s ease",
  },
  progressText: {
    fontSize: "0.875rem",
    color: "#666",
    marginTop: "0.5rem",
  },
  successIcon: {
    fontSize: "3rem",
    color: "#10b981",
    marginBottom: "1rem",
  },
  resultId: {
    fontSize: "0.75rem",
    color: "#888",
    fontFamily: "monospace",
    margin: "0.25rem 0",
  },
  resultStatus: {
    fontSize: "0.875rem",
    color: "#666",
    margin: "0.25rem 0 1rem 0",
  },
  resetButton: {
    padding: "0.5rem 1rem",
    fontSize: "0.875rem",
    fontWeight: "500",
    color: "#0070f3",
    backgroundColor: "transparent",
    border: "1px solid #0070f3",
    borderRadius: "6px",
    cursor: "pointer",
    marginTop: "0.5rem",
  },
  errorIcon: {
    fontSize: "3rem",
    color: "#ef4444",
    marginBottom: "1rem",
  },
  errorMessage: {
    fontSize: "0.875rem",
    color: "#ef4444",
    margin: "0.25rem 0 1rem 0",
  },
};