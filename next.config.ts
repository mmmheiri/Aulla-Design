import type { NextConfig } from "next";
const config: NextConfig = {
  turbopack: {root: process.cwd()},
  outputFileTracingRoot: process.cwd(),
  devIndicators: false,
  trailingSlash: true,
  poweredByHeader: false,
  async headers() {
    return [{source:'/sw.js',headers:[{key:'Cache-Control',value:'no-cache, no-store, must-revalidate'},{key:'Content-Type',value:'application/javascript; charset=utf-8'}]},{source:'/:path*',headers:[
      {key:'X-Content-Type-Options',value:'nosniff'},
      {key:'X-Frame-Options',value:'DENY'},
      {key:'Referrer-Policy',value:'no-referrer'},
      {key:'Content-Security-Policy',value:"default-src 'self'; script-src 'self' 'unsafe-inline'"+(process.env.NODE_ENV==='development'?" 'unsafe-eval'":"")+"; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob: https://tile.openstreetmap.org; font-src 'self'; connect-src 'self' blob:; worker-src 'self' blob:; object-src 'none'; frame-ancestors 'none'; form-action 'self'; base-uri 'self'"},
    ]}];
  },
};
export default config;
