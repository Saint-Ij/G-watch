import jwt from "jsonwebtoken";
import config from "../config/index.js";

export function generateToken(payload) {
  return jwt.sign(payload, config.jwtSecret, { expiresIn: "24h" });
}

export function verifyToken(token) {
  return jwt.verify(token, config.jwtSecret);
}
