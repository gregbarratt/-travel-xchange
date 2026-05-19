"use client";

export default function GlobalError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en">
      <body>
        <main
          style={{
            alignItems: "center",
            background: "#f8fafc",
            color: "#082f49",
            display: "flex",
            fontFamily: "Segoe UI, Arial, sans-serif",
            justifyContent: "center",
            minHeight: "100vh",
            padding: "24px",
          }}
        >
          <section
            style={{
              background: "#ffffff",
              border: "1px solid #fecdd3",
              borderRadius: "8px",
              boxShadow: "0 18px 42px rgba(7, 36, 91, 0.08)",
              maxWidth: "560px",
              padding: "32px",
              textAlign: "center",
            }}
          >
            <p style={{ color: "#be123c", fontWeight: 700 }}>
              Travel Xchange could not start
            </p>
            <h1 style={{ fontSize: "30px", margin: "12px 0" }}>
              Something went wrong
            </h1>
            <p style={{ color: "#475569", lineHeight: 1.7 }}>
              Please try again. If this keeps happening, check the production
              readiness page and deployment settings.
            </p>
            <button
              onClick={reset}
              style={{
                background: "#0f766e",
                border: "0",
                borderRadius: "8px",
                color: "#ffffff",
                cursor: "pointer",
                fontWeight: 700,
                marginTop: "20px",
                padding: "12px 16px",
              }}
              type="button"
            >
              Try again
            </button>
          </section>
        </main>
      </body>
    </html>
  );
}
