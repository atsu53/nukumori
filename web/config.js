// Where the API relay lives. Local dev talks to `wrangler dev`; the published
// page talks to the deployed Worker. No secrets here.
window.NUKUMORI_CONFIG = {
  apiBase: (location.hostname === "localhost" || location.hostname === "127.0.0.1")
    ? "http://127.0.0.1:8791"
    : "", // published: the screens and the API share one origin
  photoMaxEdge: 1200,
  photoQuality: 0.85,
};
