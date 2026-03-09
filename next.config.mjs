/** @type {import('next').NextConfig} */
const nextConfig = {
    serverExternalPackages: ["mjml"],
    webpack: (config, { isServer }) => {
        if (isServer) {
            if (!config.externals) config.externals = [];
            config.externals.push('mjml');
        }
        return config;
    },
};

export default nextConfig;
