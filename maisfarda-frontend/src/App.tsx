import { useEffect, useState } from "react";
import { Route, Routes } from "react-router-dom";
import type { Session } from "@supabase/supabase-js";
import { AdminRoutes } from "./pages/AdminPage";
import CatalogPage from "./pages/CatalogPage";
import { LoginPage } from "./pages/LoginPage";
import { supabase } from "./lib/supabaseClient";

function AdminGate() {
  const [session, setSession] = useState<Session | null | undefined>(undefined);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data: sub } = supabase.auth.onAuthStateChange((_event, s) => setSession(s));
    return () => sub.subscription.unsubscribe();
  }, []);

  if (session === undefined) return null;
  if (!session) return <LoginPage onLoggedIn={() => {}} />;
  return <AdminRoutes />;
}

function App() {
  return (
    <Routes>
      <Route path="/" element={<CatalogPage />} />
      <Route path="/admin/*" element={<AdminGate />} />
    </Routes>
  );
}

export default App;
