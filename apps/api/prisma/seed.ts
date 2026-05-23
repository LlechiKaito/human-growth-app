import { PrismaClient, QuestDifficulty } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database...');

  await prisma.evaluation.deleteMany();
  await prisma.characterSkill.deleteMany();
  await prisma.quest.deleteMany();
  await prisma.skill.deleteMany();
  await prisma.character.deleteMany();
  await prisma.employee.deleteMany();

  const employee = await prisma.employee.create({
    data: {
      externalId: 'HR-0001',
      cognitoSub: 'cognito-stub-0001',
      email: 'alice@example.com',
      displayName: 'Alice',
      department: 'Engineering',
      joinedAt: new Date('2024-04-01'),
    },
  });

  const character = await prisma.character.create({
    data: {
      employeeId: employee.id,
      name: 'Alice the Brave',
      className: 'Engineer',
      experiencePoint: 320,
    },
  });

  const skills = await Promise.all([
    prisma.skill.create({
      data: {
        code: 'frontend-basic',
        name: 'Frontend Basic',
        description: 'HTML / CSS / JavaScript の基礎',
        tier: 1,
      },
    }),
    prisma.skill.create({
      data: {
        code: 'backend-basic',
        name: 'Backend Basic',
        description: 'API / DB / 認証の基礎',
        tier: 1,
      },
    }),
  ]);

  const frontendAdvanced = await prisma.skill.create({
    data: {
      code: 'frontend-react',
      name: 'React',
      description: 'React の実践的な利用',
      tier: 2,
      parentId: skills[0].id,
    },
  });

  await prisma.characterSkill.create({
    data: { characterId: character.id, skillId: skills[0].id },
  });

  await prisma.quest.createMany({
    data: [
      {
        title: 'コードレビュー 3件こなす',
        description: '他メンバーの PR を 3件レビューする',
        difficulty: QuestDifficulty.EASY,
        rewardXp: 50,
        assignedCharacterId: character.id,
      },
      {
        title: 'ユニットテスト カバレッジ 80% 達成',
        description: 'API のユニットテストを書いてカバレッジ 80% を超える',
        difficulty: QuestDifficulty.HARD,
        rewardXp: 200,
        assignedCharacterId: character.id,
      },
      {
        title: '新人メンバー オンボーディング',
        description: '新入社員 1名のオンボーディングを担当する',
        difficulty: QuestDifficulty.EPIC,
        rewardXp: 500,
      },
    ],
  });

  console.log(`Seeded: employee=${employee.id}, character=${character.id}, skill=${frontendAdvanced.id}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
