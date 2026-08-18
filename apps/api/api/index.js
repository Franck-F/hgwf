// Fonction serverless Vercel : toutes les routes sont réécrites vers ce
// point d'entrée (voir vercel.json), le gestionnaire route sur req.url.
import { handler } from '../src/handler.js';

export default handler;
