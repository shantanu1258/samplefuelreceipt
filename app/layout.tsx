import type { Metadata } from "next";
import "./globals.css";

function resolveSiteUrl() {
  if (process.env.NEXT_PUBLIC_SITE_URL) return process.env.NEXT_PUBLIC_SITE_URL;

  const customDomain = process.env.GITHUB_PAGES_CUSTOM_DOMAIN?.trim();
  if (customDomain) return `https://${customDomain}`;

  const [owner = "", repositoryName = ""] = process.env.GITHUB_REPOSITORY?.split("/") ?? [];
  if (process.env.GITHUB_PAGES === "true" && owner && repositoryName) {
    const repositoryPath = repositoryName.endsWith(".github.io") ? "" : `/${repositoryName}`;
    return `https://${owner}.github.io${repositoryPath}`;
  }

  return "http://localhost:3000";
}

const siteUrl = resolveSiteUrl();
const socialImage = `${siteUrl}/og.png`;

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: "Fuel Receipt Studio | Fuel Bill Generator",
  description:
    "Create polished petrol, diesel, CNG and EV charging receipts with a live preview, local browser history and print-ready PDF output.",
  openGraph: {
    title: "Fuel Receipt Studio",
    description: "Create, save and clone polished fuel receipts in seconds.",
    type: "website",
    url: siteUrl,
    images: [
      {
        url: socialImage,
        width: 1731,
        height: 909,
        alt: "Fuel Receipt Studio social preview",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Fuel Receipt Studio",
    description: "Create, save and clone polished fuel receipts in seconds.",
    images: [socialImage],
  },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en-IN">
      <body>{children}</body>
    </html>
  );
}
