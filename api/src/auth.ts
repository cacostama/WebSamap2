import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import type { Request, Response, NextFunction } from "express";

const SECRET = process.env.JWT_SECRET ?? "dev-secret";
const EXPIRES = process.env.JWT_EXPIRES_IN ?? "7d";

if (process.env.NODE_ENV === "production" && SECRET === "dev-secret") {
  throw new Error("JWT_SECRET es obligatorio en produccion");
}

export interface AuthPayload {
  id: number;
  email: string;
  role: "superadmin" | "editor";
  name: string;
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthPayload;
    }
  }
}

export function signToken(p: AuthPayload): string {
  return jwt.sign(p, SECRET, { expiresIn: EXPIRES as any });
}

export function verifyToken(t: string): AuthPayload {
  return jwt.verify(t, SECRET) as AuthPayload;
}

export async function hashPassword(pw: string) {
  return bcrypt.hash(pw, 10);
}

export async function comparePassword(pw: string, hash: string) {
  return bcrypt.compare(pw, hash);
}

export function requireAuth(req: Request, res: Response, next: NextFunction) {
  const h = req.headers.authorization;
  if (!h?.startsWith("Bearer ")) return res.status(401).json({ error: "no token" });
  try {
    req.user = verifyToken(h.slice(7));
    next();
  } catch {
    return res.status(401).json({ error: "token invalido" });
  }
}

export function requireRole(...roles: AuthPayload["role"][]) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) return res.status(401).json({ error: "no auth" });
    if (!roles.includes(req.user.role)) return res.status(403).json({ error: "forbidden" });
    next();
  };
}
