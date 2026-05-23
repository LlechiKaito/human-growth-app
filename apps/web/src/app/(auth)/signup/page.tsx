import { SignupForm } from '@/features/auth/components/SignupForm';

export default function SignupPage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-8 p-8">
      <h1 className="text-3xl font-bold text-rpg-accent">新規登録</h1>
      <SignupForm />
    </main>
  );
}
