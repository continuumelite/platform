import { AuthShell } from '@/components/auth-shell';
import { LoginForm } from './login-form';

export default function LoginPage() {
  return (
    <AuthShell>
      <h1 className="text-4xl text-zinc-950 dark:text-zinc-50">Sign in</h1>
      <p className="mt-1 text-sm text-zinc-500">Welcome back. Pick up where you left off.</p>
      <LoginForm />
    </AuthShell>
  );
}
