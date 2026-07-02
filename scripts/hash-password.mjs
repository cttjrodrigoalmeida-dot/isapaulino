// ============================================================
// Gera o hash PBKDF2 de uma senha do admin, no MESMO formato que a
// Function verifica (functions/api/_lib/auth.ts):
//   pbkdf2$<iterations>$<saltB64>$<hashB64>
//
// Uso:
//   node scripts/hash-password.mjs "minha-senha-forte"
//   npm run hash -- "minha-senha-forte"
//
// Depois, insira o usuário no D1 (ver BACKEND.md):
//   wrangler d1 execute isapaulino-db --remote \
//     --command "INSERT INTO admin_users (username, password_hash) VALUES ('isabela', '<HASH>')"
// ============================================================
import { pbkdf2Sync, randomBytes } from "node:crypto";

const password = process.argv[2];
if (!password) {
  console.error('Uso: node scripts/hash-password.mjs "sua-senha"');
  process.exit(1);
}

const ITERATIONS = 100_000;
const salt = randomBytes(16);
const hash = pbkdf2Sync(password, salt, ITERATIONS, 32, "sha256");

const encoded = `pbkdf2$${ITERATIONS}$${salt.toString("base64")}$${hash.toString("base64")}`;
console.log(encoded);
