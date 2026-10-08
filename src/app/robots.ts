import type { MetadataRoute } from "next";
import { config } from "@/lib/config";

export default function robots(): MetadataRoute.Robots {
  if (!config.allowIndexing) return { rules: [{ userAgent: "*", disallow: "/" }] };
  return {
    rules: [{ userAgent: "*", allow: "/", disallow: ["/admin", "/provider", "/enquiry", "/claim", "/report", "/set-password", "/login", "/compare"] }],
    sitemap: `${config.siteUrl}/sitemap.xml`,
  };
}
