// Lightweight health probe for the ndumi backend.
// Usage: npm run healthcheck
// Override target with: BACKEND_URL=https://host npm run healthcheck
const base = process.env.BACKEND_URL || "http://localhost:3001";
const url = `${base.replace(/\/$/, "")}/health`;

fetch(url)
  .then((r) => {
    if (r.ok) {
      console.log(`[healthcheck] OK ${url} -> ${r.status}`);
      process.exit(0);
    }
    console.error(`[healthcheck] FAIL ${url} -> ${r.status}`);
    process.exit(1);
  })
  .catch((err) => {
    console.error(`[healthcheck] FAIL ${url} -> ${err.message}`);
    process.exit(1);
  });
