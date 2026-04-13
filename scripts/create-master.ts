/**
 * Cria ou atualiza o usuário MASTER no banco.
 * Uso: DATABASE_URL="postgres://..." npx ts-node --project tsconfig.json scripts/create-master.ts
 */
import { config } from "dotenv";
config({ path: ".env.local" });
config({ path: ".env" });

import { PrismaClient } from "@prisma/client";
import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import bcrypt from "bcryptjs";

const pool    = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma  = new PrismaClient({ adapter } as any);

async function main() {
  const hash = await bcrypt.hash("msb@master2025", 12);

  const master = await prisma.user.upsert({
    where:  { id: "seed-user-master" },
    update: { passwordHash: hash, role: "MASTER", active: true },
    create: {
      id:           "seed-user-master",
      name:         "Admin MSB",
      email:        "master@msbsolution.com",
      passwordHash: hash,
      phone:        "11900000000",
      role:         "MASTER",
    },
  });

  console.log("✅  Master criado:", master.email);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
