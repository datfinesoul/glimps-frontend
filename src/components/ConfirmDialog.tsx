import { ReactNode } from "react";

interface ConfirmDialogProps {
  title: string;
  message?: string;
  details?: ReactNode;
  confirmLabel: string;
  cancelLabel?: string;
  destructive?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmDialog({
  title,
  message,
  details,
  confirmLabel,
  cancelLabel = "Cancel",
  destructive = false,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  return (
    <div style={styles.overlay} onClick={onCancel}>
      <div style={styles.box} onClick={(e) => e.stopPropagation()}>
        <h3 style={styles.title}>{title}</h3>
        {message && <p style={styles.message}>{message}</p>}
        {details && <div style={styles.details}>{details}</div>}
        <div style={styles.actions}>
          <button style={styles.cancelBtn} onClick={onCancel}>
            {cancelLabel}
          </button>
          <button
            style={destructive ? styles.destructiveBtn : styles.confirmBtn}
            onClick={onConfirm}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

const styles: Record<string, Record<string, string | number>> = {
  overlay: {
    position: "fixed",
    inset: 0,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 1000,
  },
  box: {
    backgroundColor: "#fff",
    borderRadius: "12px",
    padding: "1.5rem",
    maxWidth: "400px",
    width: "90%",
    boxShadow: "0 20px 40px rgba(0, 0, 0, 0.2)",
  },
  title: {
    margin: "0 0 0.5rem 0",
    fontSize: "1.125rem",
    fontWeight: 600,
    color: "#1a1a1a",
  },
  message: {
    margin: "0 0 1rem 0",
    fontSize: "0.875rem",
    color: "#666",
  },
  details: {
    marginBottom: "1rem",
    fontSize: "0.875rem",
    color: "#1a1a1a",
  },
  actions: {
    display: "flex",
    justifyContent: "flex-end",
    gap: "0.75rem",
  },
  cancelBtn: {
    padding: "0.5rem 1rem",
    fontSize: "0.875rem",
    fontWeight: 500,
    color: "#666",
    backgroundColor: "transparent",
    border: "1px solid #ddd",
    borderRadius: "6px",
    cursor: "pointer",
  },
  confirmBtn: {
    padding: "0.5rem 1rem",
    fontSize: "0.875rem",
    fontWeight: 500,
    color: "#fff",
    backgroundColor: "#0070f3",
    border: "none",
    borderRadius: "6px",
    cursor: "pointer",
  },
  destructiveBtn: {
    padding: "0.5rem 1rem",
    fontSize: "0.875rem",
    fontWeight: 500,
    color: "#fff",
    backgroundColor: "#dc2626",
    border: "none",
    borderRadius: "6px",
    cursor: "pointer",
  },
};
