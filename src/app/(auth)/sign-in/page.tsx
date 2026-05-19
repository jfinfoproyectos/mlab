import { LoginForm } from "@/features/auth";

export default function SignInPage() {
  return (
    <main className="flex min-h-screen items-center justify-center p-4 bg-neutral-50 dark:bg-neutral-950">
      <LoginForm />
    </main>
  );
}
