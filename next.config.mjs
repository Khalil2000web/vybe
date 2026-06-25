let supabaseHostname = "";

try {
  supabaseHostname = new URL(process.env.NEXT_PUBLIC_SUPABASE_URL).hostname;
} catch {}

const nextConfig = {
  images: {
    remotePatterns: supabaseHostname
      ? [
          {
            protocol: "https",
            hostname: supabaseHostname,
            pathname: "/storage/v1/object/public/**",
          },
        ]
      : [],
  },
};

export default nextConfig;