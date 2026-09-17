import { useState } from "react";
import logo from "../assets/logo-maisfarda.jpg";
import { supabase } from "../lib/supabaseClient";

export function LoginPage({ onLoggedIn }: { onLoggedIn: () => void }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) { setError("E-mail ou senha inválidos."); return; }
    onLoggedIn();
  }

  return (
    <div className="login-wrap">
      <form className="login-panel" onSubmit={handleSubmit}>
        <img src={logo} alt="Mais Farda" style={{ height: 40, width: "auto", marginBottom: 18 }} />
        <h1 style={{ fontSize: 20, marginBottom: 4 }}>Painel administrativo</h1>
        <p className="muted" style={{ marginBottom: 18 }}>Entre com seu e-mail e senha.</p>
        <div className="field">
          <label>E-mail</label>
          <input className="input" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} autoFocus />
        </div>
        <div className="field">
          <label>Senha</label>
          <input className="input" type="password" required value={password} onChange={(e) => setPassword(e.target.value)} />
        </div>
        {error && <p style={{ color: "#b3392f", fontSize: 13 }}>{error}</p>}
        <button className="btn" type="submit" disabled={loading} style={{ width: "100%", marginTop: 8 }}>
          {loading ? "Entrando..." : "Entrar"}
        </button>
      </form>
    </div>
  );
}
