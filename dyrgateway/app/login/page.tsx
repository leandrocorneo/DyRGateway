import { Suspense } from "react";
import LoginForm from "./LoginForm";

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="grid min-h-screen place-items-center bg-background text-sm text-[var(--muted)]">Carregando...</div>}>
      <LoginForm />
    </Suspense>
  );
}
