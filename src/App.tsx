import { UploadZone } from "./components/UploadZone";

function App() {
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
          Upload Media
        </h2>
        <UploadZone />
      </section>
    </main>
  );
}

export default App;