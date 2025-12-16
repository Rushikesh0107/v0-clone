import {PrismaClient} from "@prisma/client";

const globalPrisma = globalThis as unknown as {
    prisma: PrismaClient | undefined;
};  

const db = globalPrisma.prisma || new PrismaClient({
    log: ["query", "error", "warn", "info"]
});

if (process.env.NODE_ENV == "development") {
    globalPrisma.prisma = db;
}

export default db;
