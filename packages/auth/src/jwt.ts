import jwt from "jsonwebtoken";
import { loadEnv, type JwtClaims } from "@switchboard/shared";

export function verifyJwt(token: string): JwtClaims {
  const env = loadEnv();
  // Throws on bad signature/expiry — callers treat any throw as 401.
  return jwt.verify(token, env.JWT_SECRET) as JwtClaims;
}
