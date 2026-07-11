/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    // image_vitrine_url (agents.image_vitrine_url, voir PIVOT_SOCIAL.md)
    // est hébergée sur Supabase Storage — next/image refuse par défaut
    // tout domaine non déclaré. Wildcard sur *.supabase.co plutôt que le
    // project ref exact : évite de casser l'image si le projet change
    // (dev/prod) ou si le bucket est reconfiguré.
    remotePatterns: [
      {
        protocol: "https",
        hostname: "**.supabase.co",
        pathname: "/storage/v1/object/public/**",
      },
    ],
  },
};

export default nextConfig;
