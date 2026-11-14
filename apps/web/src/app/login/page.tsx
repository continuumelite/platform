import { Card } from '@/components/ui';
import { LoginForm } from './login-form';

export default function LoginPage() {
  return (
    <main className="flex flex-1 items-center justify-center bg-zinc-50 px-4 py-12 dark:bg-black">
      <Card className="w-full max-w-sm">
        <h1 className="text-xl font-semibold text-zinc-900 dark:text-zinc-50">Sign in</h1>
        <p className="mt-1 text-sm text-zinc-500">Continuum Elite</p>
        <LoginForm />
      </Card>
    </main>
  );
}
