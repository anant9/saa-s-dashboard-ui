/** @type {import('next').NextConfig} */
export default {
  output: "standalone",
  experimental: {
    outputFileTracingRoot: process.cwd(),
  },
}

