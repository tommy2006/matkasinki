/** @type {import('next').NextConfig} */
const nextConfig = {
  // Move the dev-only Next.js indicator ("N" badge) out of the bottom-left so it
  // never covers the chat composer. Dev only — it never appears in production.
  devIndicators: { position: "top-right" },
  // The football database lives in data/ — never bundle it; read via fs at runtime.
  outputFileTracingExcludes: { "*": ["./data/**"] },
};

export default nextConfig;
