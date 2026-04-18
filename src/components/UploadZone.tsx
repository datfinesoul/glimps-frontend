import { useState, useCallback, DragEvent, ChangeEvent } from "react";

type FileStatus = "pending" | "uploading" | "success" | "duplicate" | "error";

interface PerFileState {
  file: File;
  status: FileStatus;
  progress: number;
  error?: string;
  result?: { id: string; status: string };
}

interface UploadResponse {
  results: Array<{ id: string; status: string }>;
  errors?: Array<{ fileName: string; error: string }>;
}

function isMediaFile(file: File): boolean {
  return file.type.startsWith("image/") || file.type.startsWith("video/");
}

export function UploadZone() {
  const [files, setFiles] = useState<PerFileState[]>([]);
  const [isDragging, setIsDragging] = useState(false);

  const activeCount = files.filter((f) => f.status === "uploading").length;
  const completedCount = files.filter((f) => f.status === "success").length;
  const duplicateCount = files.filter((f) => f.status === "duplicate").length;
  const errorCount = files.filter((f) => f.status === "error").length;

  const uploadFile = useCallback(async (fileState: PerFileState) => {
    const { file } = fileState;

    setFiles((prev) =>
      prev.map((f) =>
        f.file === file ? { ...f, status: "uploading", progress: 0 } : f
      )
    );

    const formData = new FormData();
    formData.append("file", file);

    try {
      const xhr = new XMLHttpRequest();

      xhr.upload.addEventListener("progress", (e) => {
        if (e.lengthComputable) {
          const progress = Math.round((e.loaded / e.total) * 100);
          setFiles((prev) =>
            prev.map((f) => (f.file === file ? { ...f, progress } : f))
          );
        }
      });

      const response = await new Promise<UploadResponse>((resolve, reject) => {
        xhr.onload = () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            const data = JSON.parse(xhr.responseText);
            resolve(data as UploadResponse);
          } else {
            try {
              const err = JSON.parse(xhr.responseText) as { error?: string };
              reject(new Error(err.error || `upload failed: ${xhr.status}`));
            } catch {
              reject(new Error(`upload failed: ${xhr.status}`));
            }
          }
        };

        xhr.onerror = () => reject(new Error("network error"));

        xhr.open("POST", "/api/media/upload");
        xhr.send(formData);
      });

      const myResult = response.results.find((r) => r.status === "duplicate" || r.status === "success");

      if (myResult?.status === "duplicate") {
        setFiles((prev) =>
          prev.map((f) =>
            f.file === file
              ? { ...f, status: "duplicate", progress: 100, result: myResult }
              : f
          )
        );
      } else {
        setFiles((prev) =>
          prev.map((f) =>
            f.file === file
              ? { ...f, status: "success", progress: 100, result: myResult }
              : f
          )
        );
      }
    } catch (err) {
      setFiles((prev) =>
        prev.map((f) =>
          f.file === file
            ? { ...f, status: "error", error: err instanceof Error ? err.message : "unknown error" }
            : f
        )
      );
    }
  }, []);

  const handleFiles = useCallback(
    (fileList: FileList) => {
      const validFiles = Array.from(fileList).filter(isMediaFile);
      if (validFiles.length === 0) return;

      const newFileStates: PerFileState[] = validFiles.map((file) => ({
        file,
        status: "pending",
        progress: 0,
      }));

      setFiles((prev) => [...prev, ...newFileStates]);

      newFileStates.forEach((fileState) => {
        uploadFile(fileState);
      });
    },
    [uploadFile]
  );

  const handleDrop = useCallback(
    (e: DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      setIsDragging(false);
      handleFiles(e.dataTransfer.files);
    },
    [handleFiles]
  );

  const handleFileInput = useCallback(
    (e: ChangeEvent<HTMLInputElement>) => {
      if (e.target.files) {
        handleFiles(e.target.files);
        e.target.value = "";
      }
    },
    [handleFiles]
  );

  const handleDragOver = useCallback((e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback(() => {
    setIsDragging(false);
  }, []);

  const reset = useCallback(() => {
    setFiles([]);
  }, []);

  const removeFile = useCallback((file: File) => {
    setFiles((prev) => prev.filter((f) => f.file !== file));
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
        {files.length === 0 && (
          <>
            <div style={styles.icon}>📁</div>
            <p style={styles.label}>Drag & drop images or videos here</p>
            <p style={styles.subLabel}>or</p>
            <label style={styles.button}>
              Browse Files
              <input
                type="file"
                multiple
                accept="image/*,video/*"
                onChange={handleFileInput}
                style={styles.hiddenInput}
              />
            </label>
          </>
        )}

        {files.length > 0 && (
          <div style={styles.fileList}>
            {files.map((fileState) => (
              <div key={fileState.file.name} style={styles.fileRow}>
                <div style={styles.fileInfo}>
                  <span style={styles.fileName}>{fileState.file.name}</span>
                  {fileState.status === "uploading" && (
                    <div style={styles.inlineProgress}>
                      <div
                        style={{
                          ...styles.inlineProgressFill,
                          width: `${fileState.progress}%`,
                        }}
                      />
                    </div>
                  )}
                  {fileState.status === "success" && (
                    <span style={styles.successText}>✓ uploaded</span>
                  )}
                  {fileState.status === "duplicate" && (
                    <span style={styles.warningText}>⚠ already uploaded</span>
                  )}
                  {fileState.status === "error" && (
                    <span style={styles.errorText}>
                      ✗ {fileState.error}
                    </span>
                  )}
                </div>
                <button
                  onClick={() => removeFile(fileState.file)}
                  style={styles.removeBtn}
                  aria-label={`Remove ${fileState.file.name}`}
                >
                  ✗
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {files.length > 0 && (
        <div style={styles.actions}>
          <div style={styles.stats}>
            {completedCount > 0 && (
              <span style={styles.successText}>{completedCount} uploaded</span>
            )}
            {duplicateCount > 0 && (
              <span style={styles.warningText}>{duplicateCount} skipped</span>
            )}
            {errorCount > 0 && (
              <span style={styles.errorText}>{errorCount} failed</span>
            )}
            {activeCount > 0 && (
              <span style={styles.uploadingText}>{activeCount} uploading...</span>
            )}
          </div>
          <button onClick={reset} style={styles.resetButton}>
            Clear
          </button>
        </div>
      )}
    </div>
  );
}

const styles: Record<string, Record<string, string>> = {
  container: {
    display: "flex",
    flexDirection: "column",
    gap: "0.75rem",
    padding: "2rem",
  },
  zone: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    width: "100%",
    maxWidth: "600px",
    minHeight: "120px",
    padding: "1.5rem 2rem",
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
    fontSize: "2rem",
    marginBottom: "0.5rem",
  },
  label: {
    fontSize: "1rem",
    fontWeight: "500",
    color: "#1a1a1a",
    margin: "0 0 0.25rem 0",
  },
  subLabel: {
    fontSize: "0.875rem",
    color: "#666",
    margin: "0.125rem 0",
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
  fileList: {
    width: "100%",
    display: "flex",
    flexDirection: "column",
    gap: "0.5rem",
  },
  fileRow: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "0.5rem 0",
    borderBottom: "1px solid #eee",
  },
  fileInfo: {
    display: "flex",
    flexDirection: "column",
    gap: "0.25rem",
    minWidth: "0",
    flex: "1",
  },
  fileName: {
    fontSize: "0.875rem",
    color: "#1a1a1a",
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
  },
  inlineProgress: {
    width: "100%",
    maxWidth: "300px",
    height: "4px",
    backgroundColor: "#e0e0e0",
    borderRadius: "2px",
    overflow: "hidden",
  },
  inlineProgressFill: {
    height: "100%",
    backgroundColor: "#0070f3",
    transition: "width 0.2s ease",
  },
  successText: {
    fontSize: "0.75rem",
    color: "#10b981",
  },
  errorText: {
    fontSize: "0.75rem",
    color: "#ef4444",
  },
  warningText: {
    fontSize: "0.75rem",
    color: "#f59e0b",
  },
  uploadingText: {
    fontSize: "0.75rem",
    color: "#666",
  },
  removeBtn: {
    background: "none",
    border: "none",
    cursor: "pointer",
    color: "#999",
    fontSize: "0.875rem",
    padding: "0.25rem 0.5rem",
  },
  actions: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    width: "100%",
    maxWidth: "600px",
  },
  stats: {
    display: "flex",
    gap: "1rem",
  },
  resetButton: {
    padding: "0.375rem 0.75rem",
    fontSize: "0.875rem",
    fontWeight: "500",
    color: "#666",
    backgroundColor: "transparent",
    border: "1px solid #ddd",
    borderRadius: "6px",
    cursor: "pointer",
  },
};
