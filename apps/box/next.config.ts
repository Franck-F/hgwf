import type { NextConfig } from 'next';

// Contrairement au site, cette application a besoin d'un serveur : elle lit une
// base de données par requête et gère des sessions. Pas d'export statique.
const nextConfig: NextConfig = {};

export default nextConfig;
