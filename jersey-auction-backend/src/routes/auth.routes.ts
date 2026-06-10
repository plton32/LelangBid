import { Router, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { randomUUID } from 'node:crypto';
import db from '../config/db';
import { authenticateToken, AuthRequest } from '../middleware/auth';

const router = Router();
const JWT_SECRET = process.env.JWT_SECRET || 'super_secret_jersey_lelang_token_key_12345';

// Register
router.post('/register', (req, res) => {
  const { fullName, email, phone, password } = req.body;

  if (!fullName || !email || !password) {
    return res.status(400).json({ message: 'Full name, email, and password are required' });
  }

  const targetRole = 'member';

  try {
    // Check if email exists
    const checkEmail = db.prepare('SELECT id FROM users WHERE email = ?').get(email) as any;
    if (checkEmail) {
      return res.status(400).json({ message: 'Email is already registered' });
    }

    const salt = bcrypt.genSaltSync(10);
    const passwordHash = bcrypt.hashSync(password, salt);
    const userId = randomUUID();

    const insertUser = db.prepare(`
      INSERT INTO users (id, full_name, email, phone, password_hash, role, status)
      VALUES (?, ?, ?, ?, ?, ?, 'active')
    `);
    
    insertUser.run(userId, fullName, email, phone || null, passwordHash, targetRole);

    const token = jwt.sign({ id: userId, email, role: targetRole }, JWT_SECRET, { expiresIn: '7d' });

    return res.status(201).json({
      token,
      user: {
        id: userId,
        fullName,
        email,
        phone,
        role: targetRole,
        status: 'active',
        depositBalance: 0
      }
    });
  } catch (error) {
    console.error('Registration error:', error);
    return res.status(500).json({ message: 'Internal server error during registration' });
  }
});

// Login
router.post('/login', (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ message: 'Email and password are required' });
  }

  try {
    const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email) as any;
    if (!user) {
      return res.status(400).json({ message: 'Invalid email or password' });
    }

    if (user.status !== 'active') {
      return res.status(403).json({ message: 'Your account is suspended' });
    }

    const isMatch = bcrypt.compareSync(password, user.password_hash);
    if (!isMatch) {
      return res.status(400).json({ message: 'Invalid email or password' });
    }

    const token = jwt.sign({ id: user.id, email: user.email, role: user.role }, JWT_SECRET, { expiresIn: '7d' });

    return res.json({
      token,
      user: {
        id: user.id,
        fullName: user.full_name,
        email: user.email,
        phone: user.phone,
        role: user.role,
        status: user.status,
        depositBalance: Number(user.deposit_balance || 0)
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    return res.status(500).json({ message: 'Internal server error during login' });
  }
});

// Get profile
router.get('/me', authenticateToken, (req: AuthRequest, res) => {
  try {
    const user = db.prepare('SELECT id, full_name, email, phone, role, status, deposit_balance FROM users WHERE id = ?').get(req.user!.id) as any;
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    return res.json({
      id: user.id,
      fullName: user.full_name,
      email: user.email,
      phone: user.phone,
      role: user.role,
      status: user.status,
      depositBalance: Number(user.deposit_balance || 0)
    });
  } catch (error) {
    console.error('Me query error:', error);
    return res.status(500).json({ message: 'Internal server error fetching user data' });
  }
});

export default router;
