import { PrismaClient } from '@prisma/client';

export const prismaForTest = new PrismaClient();

export const resetDatabase = async () => {
  await prismaForTest.evaluation.deleteMany();
  await prismaForTest.characterSkill.deleteMany();
  await prismaForTest.quest.deleteMany();
  await prismaForTest.skill.deleteMany();
  await prismaForTest.character.deleteMany();
  await prismaForTest.employee.deleteMany();
};
