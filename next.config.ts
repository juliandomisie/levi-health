import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        source: "/:file*.shortcut",
        headers: [
          { key: "Content-Type", value: "application/octet-stream" },
          { key: "Content-Disposition", value: 'attachment; filename="Levi Update.shortcut"' },
        ],
      },
    ];
  },
};

export default nextConfig;
