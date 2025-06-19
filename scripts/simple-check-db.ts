import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function simpleCheck() {
  try {
    const lineageCount = await prisma.lineage.count();
    console.log(`Lineage count: ${lineageCount}`);
    
    const lineages = await prisma.lineage.findMany({ take: 10 });
    console.log('First 10 lineages:', lineages);
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

simpleCheck();