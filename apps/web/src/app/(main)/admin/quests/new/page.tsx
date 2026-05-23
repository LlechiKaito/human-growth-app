'use client';

import { useRouter } from 'next/navigation';

import { ROUTES } from '@/constants/routes';
import { AdminGuard } from '@/features/admin/components/AdminGuard';
import { QuestForm } from '@/features/admin/components/QuestForm';
import { useCreateAdminQuest } from '@/features/admin/hooks/useAdminQuests';

export default function NewAdminQuestPage() {
  return (
    <AdminGuard>
      <Content />
    </AdminGuard>
  );
}

const Content = () => {
  const router = useRouter();
  const create = useCreateAdminQuest();
  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-4">
      <h1 className="text-2xl font-bold text-white">クエスト新規作成</h1>
      <QuestForm
        submitLabel="作成する"
        isPending={create.isPending}
        onSubmit={(input) =>
          create.mutate(input, {
            onSuccess: () => router.push(ROUTES.ADMIN_QUESTS),
          })
        }
      />
    </div>
  );
};
