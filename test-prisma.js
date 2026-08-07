const { PrismaClient } = require('@prisma/client');
const { PrismaBetterSqlite3 } = require('@prisma/adapter-better-sqlite3');
const Database = require('better-sqlite3');

async function main() {
  const adapter = new PrismaBetterSqlite3({ url: 'file:./prisma/dev.db' });
  const prisma = new PrismaClient({ adapter });

  try {
    const res = await prisma.$transaction(async (tx) => {
      // try PRAGMA foreign_keys = OFF instead of defer
      // because SQLite doesn't allow changing foreign_keys inside a tx
      // wait, let's try $executeRaw
      console.log("executing raw");
      await tx.$executeRaw`PRAGMA defer_foreign_keys = ON;`;
      console.log("executed");
      
      const pId = 'p_' + Date.now();
      const aId = 'a_' + Date.now();
      
      const p = await tx.persona.create({
        data: {
          id: pId,
          agentId: aId,
          version: 1,
          name: 'Test',
          domain: 'Test',
          voiceRules: {},
          pillars: [],
          antiTopics: []
        }
      });
      
      const a = await tx.agent.create({
        data: {
          id: aId,
          personaId: pId
        }
      });
      
      return { p, a };
    });
    console.log("Success PRAGMA defer_foreign_keys:", res);
  } catch(e) {
    console.error("Failed PRAGMA defer_foreign_keys:", e.message);
  }
}

main();
