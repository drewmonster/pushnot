import { redirect } from "next/navigation";
import { getCurrentSession, getAdminCredentials } from "@/lib/session";

export default function LoginPage({ searchParams }: { searchParams: { error?: string } }) {
  if (getCurrentSession()) {
    redirect("/");
  }

  const { email } = getAdminCredentials();

  return (
    <main className="login-shell">
      <form className="login-panel" action="/api/login" method="post">
        <div>
          <h1 className="title">PushNot Admin</h1>
          <p className="meta">Acesso administrativo da demo.</p>
        </div>
        <label>
          Email
          <input name="email" type="email" defaultValue={email} required />
        </label>
        <label>
          Senha
          <input name="password" type="password" required />
        </label>
        {searchParams.error ? <div className="error">Credenciais invalidas.</div> : null}
        <button className="primary" type="submit">
          Entrar
        </button>
      </form>
    </main>
  );
}
