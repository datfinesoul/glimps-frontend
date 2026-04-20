import { useState, useCallback, useRef, useMemo, DragEvent, ChangeEvent } from "react";

type FileStatus = "pending" | "uploading" | "success" | "duplicate" | "rateLimited" | "error";

interface PerFileState {
  file: File;
  status: FileStatus;
  progress: number;
  retryAfter?: number;
  error?: string;
  result?: { id: string; status: string };
}

interface UploadResponse {
  results: Array<{ id: string; status: string }>;
  errors?: Array<{ fileName: string; error: string }>;
}

interface UploadZoneProps {
  onUploadComplete?: () => void;
}

const MAX_CONCURRENT = 10;
const PROGRESS_THROTTLE_MS = 200;
const SUMMARY_THRESHOLD = 20;

function isMediaFile(file: File): boolean {
  return file.type.startsWith("image/") || file.type.startsWith("video/");
}

function useThrottledProgress() {
  const pendingRef = useRef<Map<File, number>>(new Map());
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const setFilesRef = useRef<((fn: (prev: PerFileState[]) => PerFileState[]) => void) | null>(null);

  setFilesRef.current = null;

  const flush = useCallback(() => {
    timerRef.current = null;
    const pending = pendingRef.current;
    if (pending.size === 0 || !setFilesRef.current) return;
    const snapshot = new Map(pending);
    pending.clear();
    setFilesRef.current((prev) =>
      prev.map((f) => {
        const p = snapshot.get(f.file);
        return p !== undefined ? { ...f, progress: p } : f;
      })
    );
  }, []);

  const track = useCallback(
    (file: File, progress: number, setFiles: (fn: (prev: PerFileState[]) => PerFileState[]) => void) => {
      pendingRef.current.set(file, progress);
      setFilesRef.current = setFiles;
      if (!timerRef.current) {
        timerRef.current = setTimeout(flush, PROGRESS_THROTTLE_MS);
      }
    },
    [flush]
  );

  return track;
}

export function UploadZone({ onUploadComplete }: UploadZoneProps) {
  const [files, setFiles] = useState<PerFileState[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const retryTimers = useRef<Map<File, ReturnType<typeof setTimeout>>>(new Map());
  const onUploadCompleteRef = useRef(onUploadComplete);
  onUploadCompleteRef.current = onUploadComplete;
  const throttledProgress = useThrottledProgress();

  const { activeCount, completedCount, duplicateCount, rateLimitedCount, errorCount, pendingCount, settledCount, overallPercent } = useMemo(() => {
    const counts = {
      activeCount: 0,
      completedCount: 0,
      duplicateCount: 0,
      rateLimitedCount: 0,
      errorCount: 0,
      pendingCount: 0,
      settledCount: 0,
      overallPercent: 0,
    };
    for (const f of files) {
      if (f.status === "uploading") counts.activeCount++;
      else if (f.status === "success") counts.completedCount++;
      else if (f.status === "duplicate") counts.duplicateCount++;
      else if (f.status === "rateLimited") counts.rateLimitedCount++;
      else if (f.status === "error") counts.errorCount++;
      else if (f.status === "pending") counts.pendingCount++;
    }
    counts.settledCount = counts.completedCount + counts.duplicateCount + counts.errorCount;
    counts.overallPercent = files.length > 0 ? Math.round((counts.settledCount / files.length) * 100) : 0;
    return counts;
  }, [files]);

  const uploadFile = useCallback(
    async (
      fileState: PerFileState,
      queueNext: () => void
    ) => {
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
            throttledProgress(file, progress, setFiles);
          }
        });

        const response = await new Promise<UploadResponse>((resolve, reject) => {
          xhr.onload = () => {
            if (xhr.status === 429) {
              const retryAfter = parseInt(xhr.getResponseHeader("Retry-After") || "30", 10);
              reject({ status: 429, retryAfter: isNaN(retryAfter) ? 30 : retryAfter });
            } else if (xhr.status >= 200 && xhr.status < 300) {
              try {
                const data = JSON.parse(xhr.responseText);
                resolve(data as UploadResponse);
              } catch {
                reject(new Error("invalid response from server"));
              }
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

        const myResult = response.results.find(
          (r) => r.status === "duplicate" || r.status === "success"
        );

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
        if (
          typeof err === "object" &&
          err !== null &&
          "status" in err &&
          (err as { status: number }).status === 429
        ) {
          const retryAfter = (err as unknown as { retryAfter: number }).retryAfter;
          setFiles((prev) =>
            prev.map((f) =>
              f.file === file ? { ...f, status: "rateLimited", retryAfter } : f
            )
          );

          const timer = setTimeout(() => {
            retryTimers.current.delete(file);
            uploadFile({ ...fileState, status: "pending" }, queueNext);
          }, retryAfter * 1000);
          retryTimers.current.set(file, timer);
          queueNext();
          return;
        }

        setFiles((prev) =>
          prev.map((f) =>
            f.file === file
              ? {
                  ...f,
                  status: "error",
                  error: err instanceof Error ? err.message : "unknown error",
                }
              : f
          )
        );
      }

      queueNext();
    },
    [throttledProgress]
  );

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

      let running = 0;
      let idx = 0;

      const queueNext = () => {
        running--;
        if (running === 0 && idx === newFileStates.length && onUploadCompleteRef.current) {
          onUploadCompleteRef.current();
        }
        processNext();
      };

      const processNext = () => {
        while (running < MAX_CONCURRENT && idx < newFileStates.length) {
          const fileState = newFileStates[idx++];
          running++;
          uploadFile(fileState, queueNext);
        }
      };

      processNext();
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
    retryTimers.current.forEach((timer) => clearTimeout(timer));
    retryTimers.current.clear();
    setFiles([]);
  }, []);

  const removeFile = useCallback(
    (file: File) => {
      const timer = retryTimers.current.get(file);
      if (timer) {
        clearTimeout(timer);
        retryTimers.current.delete(file);
      }
      setFiles((prev) => prev.filter((f) => f.file !== file));
    },
    []
  );

  const isUploading = activeCount > 0 || pendingCount > 0 || rateLimitedCount > 0;
  const showSummary = files.length > SUMMARY_THRESHOLD;

  return (
    <div style={styles.container}>
      <div
        style={{
          ...styles.zone,
          ...(isDragging ? styles.zoneDragging : {}),
          ...(files.length > 0 ? styles.zoneActive : {}),
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
            {isUploading && (
              <div style={styles.overallProgress}>
                <div style={styles.overallProgressHeader}>
                  <span style={styles.overallLabel}>
                    {settledCount} / {files.length} files
                  </span>
                  <span style={styles.overallPercent}>{overallPercent}%</span>
                </div>
                <div style={styles.overallProgressBar}>
                  <div
                    style={{
                      ...styles.overallProgressFill,
                      width: `${overallPercent}%`,
                    }}
                  />
                </div>
              </div>
            )}

            {showSummary ? (
              <div style={styles.summaryGrid}>
                {activeCount > 0 && (
                  <div style={styles.summaryItem}>
                    <span style={styles.summaryNumber}>{activeCount}</span>
                    <span style={styles.uploadingText}>uploading</span>
                  </div>
                )}
                {pendingCount > 0 && (
                  <div style={styles.summaryItem}>
                    <span style={styles.summaryNumber}>{pendingCount}</span>
                    <span style={styles.uploadingText}>pending</span>
                  </div>
                )}
                {completedCount > 0 && (
                  <div style={styles.summaryItem}>
                    <span style={styles.summaryNumber}>{completedCount}</span>
                    <span style={styles.successText}>uploaded</span>
                  </div>
                )}
                {duplicateCount > 0 && (
                  <div style={styles.summaryItem}>
                    <span style={styles.summaryNumber}>{duplicateCount}</span>
                    <span style={styles.warningText}>skipped</span>
                  </div>
                )}
                {rateLimitedCount > 0 && (
                  <div style={styles.summaryItem}>
                    <span style={styles.summaryNumber}>{rateLimitedCount}</span>
                    <span style={styles.warningText}>waiting</span>
                  </div>
                )}
                {errorCount > 0 && (
                  <div style={styles.summaryItem}>
                    <span style={styles.summaryNumber}>{errorCount}</span>
                    <span style={styles.errorText}>failed</span>
                  </div>
                )}
              </div>
            ) : (
              files.map((fileState) => (
                <div key={`${fileState.file.name}-${fileState.file.size}`} style={styles.fileRow}>
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
                    {fileState.status === "rateLimited" && (
                      <span style={styles.warningText}>
                        ⚠ rate limited, retrying in {fileState.retryAfter}s
                      </span>
                    )}
                    {fileState.status === "error" && (
                      <span style={styles.errorText}>✗ {fileState.error}</span>
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
              ))
            )}
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
            {rateLimitedCount > 0 && (
              <span style={styles.warningText}>{rateLimitedCount} waiting...</span>
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

const styles: Record<string, Record<string, string | number>> = {
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
  zoneActive: {
    cursor: "default",
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
  overallProgress: {
    width: "100%",
    marginBottom: "0.75rem",
  },
  overallProgressHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "baseline",
    marginBottom: "0.375rem",
  },
  overallLabel: {
    fontSize: "0.875rem",
    fontWeight: "500",
    color: "#1a1a1a",
  },
  overallPercent: {
    fontSize: "0.875rem",
    fontWeight: "600",
    color: "#0070f3",
  },
  overallProgressBar: {
    width: "100%",
    height: "8px",
    backgroundColor: "#e0e0e0",
    borderRadius: "4px",
    overflow: "hidden",
  },
  overallProgressFill: {
    height: "100%",
    backgroundColor: "#0070f3",
    borderRadius: "4px",
    transition: "width 0.3s ease",
  },
  summaryGrid: {
    display: "flex",
    flexWrap: "wrap",
    gap: "1rem",
    width: "100%",
    justifyContent: "center",
    padding: "0.5rem 0",
  },
  summaryItem: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: "0.125rem",
  },
  summaryNumber: {
    fontSize: "1.5rem",
    fontWeight: "600",
    color: "#1a1a1a",
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
