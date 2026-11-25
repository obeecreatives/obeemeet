import type { IncomingMessage, ServerResponse } from 'node:http';
import { handleHealth } from '../server/livekitCore.js';

interface VercelResponse extends ServerResponse {
  status: (code: number) => VercelResponse;
  json: (data: unknown) => void;
}

export default function handler(req: IncomingMessage, res: VercelResponse) {
  if (req.method !== 'GET') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }
  const result = handleHealth();
  res.status(result.status).json(result.body);
}
