const baseUrl = process.env.APP_ORIGIN || "https://arconethn.com";

export default function robots() {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: [
          "/admin",
          "/admin/",
          "/panel-administrativo",
          "/panel-administrativo/",
          "/cliente",
          "/cliente/",
          "/login",
          "/login/",
          "/registro",
          "/registro/",
          "/api/",
        ],
      },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
    host: baseUrl,
  };
}
