import type { NextConfig } from "next";

const isGitHubPagesBuild = process.env.GITHUB_PAGES === "true";
const repositoryName = process.env.GITHUB_REPOSITORY?.split("/")[1] ?? "";
const customDomain = process.env.GITHUB_PAGES_CUSTOM_DOMAIN?.trim() ?? "";
const isUserSite = repositoryName.endsWith(".github.io");
const basePath = isGitHubPagesBuild && repositoryName && !isUserSite && !customDomain
  ? `/${repositoryName}`
  : "";

const nextConfig: NextConfig = isGitHubPagesBuild
  ? {
      output: "export",
      trailingSlash: true,
      basePath,
      assetPrefix: basePath,
      images: { unoptimized: true },
    }
  : {};

export default nextConfig;
