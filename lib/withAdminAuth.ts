/**
 * Admin authentication middleware
 * 
 * Checks for X-Admin-Key header matching ADMIN_PASSWORD env var.
 * For now this is a simple password gate. Can be upgraded to proper auth later.
 */

import type { NextApiRequest, NextApiResponse } from 'next';

type Handler = (req: NextApiRequest, res: NextApiResponse) => void | Promise<void>;

export function withAdminAuth(handler: Handler): Handler {
  return async (req, res) => {
    const adminKey = req.headers['x-admin-key'] as string;
    const expectedKey = process.env.ADMIN_PASSWORD;

    if (!expectedKey) {
      console.error('[withAdminAuth] ADMIN_PASSWORD env var not set');
      return res.status(500).json({ error: 'Admin auth not configured' });
    }

    if (!adminKey || adminKey !== expectedKey) {
      return res.status(401).json({ error: 'Unauthorized - invalid admin key' });
    }

    return handler(req, res);
  };
}

/**
 * Combines CORS and Admin Auth for admin endpoints
 */
export function withAdminCors(handler: Handler): Handler {
  return async (req, res) => {
    // CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-Admin-Key');

    // Handle preflight
    if (req.method === 'OPTIONS') {
      res.status(204).end();
      return;
    }

    // Check admin auth
    const adminKey = req.headers['x-admin-key'] as string;
    const expectedKey = process.env.ADMIN_PASSWORD;

    if (!expectedKey) {
      console.error('[withAdminCors] ADMIN_PASSWORD env var not set');
      return res.status(500).json({ error: 'Admin auth not configured' });
    }

    if (!adminKey || adminKey !== expectedKey) {
      return res.status(401).json({ error: 'Unauthorized - invalid admin key' });
    }

    return handler(req, res);
  };
}

