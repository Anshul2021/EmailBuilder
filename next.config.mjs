/** @type {import('next').NextConfig} */
const nextConfig = {
    experimental: {
        // This is the CORRECT key for Next.js 14.2.x 
        // Prevents mjml (and its deps like uglify-js) from being bundled by the RSC bundler
        serverComponentsExternalPackages: ["mjml"],
    },
    eslint: {
        // Warning: This allows production builds to successfully complete even if
        // the project has ESLint errors.
        ignoreDuringBuilds: true,
    },
};

export default nextConfig;
