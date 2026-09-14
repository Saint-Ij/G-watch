import { eq } from "drizzle-orm";
import bcrypt from "bcrypt";
import db from "../db/index.js";
import { users } from "../db/schema.js";
import { generateToken } from "../utils/jwt.js";

export async function register({ name, email, password }) {
  const existing = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.email, email))
    .limit(1);

  if (existing.length > 0) {
    throw new Error("Email already registered");
  }

  const hashedPassword = await bcrypt.hash(password, 10);

  const [user] = await db
    .insert(users)
    .values({ name, email, password: hashedPassword, role: "admin" })
    .returning({ id: users.id, name: users.name, email: users.email, role: users.role });

  const token = generateToken({ userId: user.id, role: user.role });
  return { user, token };
}

export async function login({ email, password }) {
  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.email, email))
    .limit(1);

  if (!user) {
    throw new Error("Invalid email or password");
  }

  const valid = await bcrypt.compare(password, user.password);
  if (!valid) {
    throw new Error("Invalid email or password");
  }

  const token = generateToken({ userId: user.id, role: user.role });
  return {
    user: { id: user.id, name: user.name, email: user.email, role: user.role },
    token,
  };
}

export async function getMe(userId) {
  const [user] = await db
    .select({ id: users.id, name: users.name, email: users.email, role: users.role, createdAt: users.createdAt })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  if (!user) {
    throw new Error("User not found");
  }

  return user;
}
