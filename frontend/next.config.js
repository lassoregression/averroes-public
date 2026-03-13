/** @type {import('next').NextConfig} */
const nextConfig = {
  // Allow ngrok and other tunnel domains in development
  allowedDevOrigins: ["*.ngrok-free.app", "*.ngrok-free.dev", "*.ngrok.io", "*.ngrok.app"],
};

module.exports = nextConfig;
