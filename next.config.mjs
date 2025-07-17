/** @type {import('next').NextConfig} */
const nextConfig = {
    reactStrictMode: true,
    swcMinify: true,
    experimental: {
      // Deshabilita la compilación de RSC para este proyecto
      serverActions: false,
      serverComponents: false,
    }
  }
  
  export default nextConfig