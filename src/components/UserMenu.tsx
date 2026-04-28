import { useAuth } from "../contexts/AuthContext";

export function UserMenu() {
  const { user, logout } = useAuth();

  if (!user) return null;

  return (
    <div style={styles.container}>
      <span style={styles.email}>{user.email}</span>
      <button onClick={logout} style={styles.button}>
        Sign out
      </button>
    </div>
  );
}

const styles: Record<string, Record<string, string | number>> = {
  container: {
    display: "flex",
    alignItems: "center",
    gap: "1rem",
  },
  email: {
    fontSize: "0.875rem",
    color: "#666",
  },
  button: {
    padding: "0.375rem 0.75rem",
    fontSize: "0.8125rem",
    fontWeight: 500,
    color: "#666",
    backgroundColor: "transparent",
    border: "1px solid #ddd",
    borderRadius: "4px",
    cursor: "pointer",
  },
};