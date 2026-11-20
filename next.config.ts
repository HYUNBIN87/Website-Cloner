import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  async redirects() {
    return [
      // livemarket.pro sends the store root to its profile-live page.
      { source: "/nandapick", destination: "/nandapick/profile-live", permanent: false },
      // /my is a page now: it shows the demo account, or sends logged-out visitors to
      // /auth/login?previousPath=%2Fmy on the client (the session lives in localStorage).
    ];
  },
};

export default nextConfig;
