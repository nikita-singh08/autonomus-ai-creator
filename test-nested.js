const { PrismaClient } = require('@prisma/client');
const { PrismaBetterSqlite3 } = require('@prisma/adapter-better-sqlite3');

async function main() {
  const adapter = new PrismaBetterSqlite3({ url: 'file:./prisma/dev.db' });
  const prisma = new PrismaClient({ adapter });

  try {
    const res = await prisma.agent.create({
      data: {
        persona: {
          create: {
            version: 1,
            name: 'Test',
            domain: 'Test',
            voiceRules: {},
            pillars: [],
            antiTopics: [],
            // agentRef is the relation "AgentPersonas" on Persona pointing back to Agent
            // But how do we point it to the agent currently being created?
            // Actually, if Persona has a required `agentId`, and we are creating Persona as part of Agent's `persona`, 
            // does Prisma auto-fill `agentId`? Wait, `agentId` is for `AgentPersonas` (1:N), not `CurrentPersona`!
            // Prisma might not auto-fill it because it's a DIFFERENT relation.
          }
        }
      }
    });
    console.log("Success:", res);
  } catch(e) {
    console.error("Failed:", e.message);
  }
}

main();
