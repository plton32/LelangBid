import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import db from '../config/db';

const JWT_SECRET = process.env.JWT_SECRET || 'super_secret_jersey_lelang_token_key_12345';

export interface AuthRequest extends Request {
  user?: {
    id: string;
    email: string;
    role: string;
  };
}

export function authenticateToken(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ message: 'Authentication token is missing' });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as any;
    const currentUser = db.prepare('SELECT email, role, status FROM users WHERE id = ?').get(decoded.id) as any;

    if (!currentUser) {
      return res.status(401).json({ message: 'User not found' });
    }

    if (currentUser.status !== 'active') {
      return res.status(403).json({ message: 'Your account is suspended' });
    }

    (req as AuthRequest).user = {
      id: decoded.id,
      email: currentUser.email || decoded.email,
      role: currentUser.role
    };
    next();
  } catch (error) {
    return res.status(403).json({ message: 'Invalid or expired token' });
  }
}

export function requireRole(allowedRoles: string[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    const authReq = req as AuthRequest;
    if (!authReq.user) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    if (!allowedRoles.includes(authReq.user.role)) {
      return res.status(403).json({ message: 'Forbidden: Insufficient permissions' });
    }

    next();
  };
}
