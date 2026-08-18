/**
 * Serveur de dev local : enveloppe le gestionnaire HTTP de src/handler.js.
 *
 * Démarrage :  copier .env.example vers .env, renseigner le jeton, puis
 *   pnpm --filter api dev
 * En production, la même logique est servie en fonction serverless Vercel
 * (voir api/index.js) ; ce serveur reste déployable tel quel sur tout
 * hébergeur Node (Render, Railway, VPS…).
 */
import { createServer } from 'node:http';
import { handler } from './handler.js';

const PORT = Number(process.env.PORT || 8787);

const server = createServer(handler);

server.listen(PORT, () => {
  console.log(
    `API HGWF Cargo sur http://localhost:${PORT} (dataset ${process.env.SANITY_DATASET || 'operations'})`,
  );
});
