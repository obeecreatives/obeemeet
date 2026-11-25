import type { IncomingMessage, ServerResponse } from 'node:http';
import { handleJoinToken } from '../server/livekitCore.js';

interface VercelRequest extends IncomingMessage {
  body?: Record<string, unknown>;
}

interface VercelResponse extends ServerResponse {
  status: (code: number) => VercelResponse;
  json: (data: unknown) => void;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }
  const result = await handleJoinToken(req.body ?? {}, req.headers.authorization);
  res.status(result.status).json(result.body);
}
