import LockOpenIcon from "@mui/icons-material/LockOpen";
import { Alert, Box, Button, Card, CardContent, CardHeader, Stack, TextField } from "@mui/material";
import { FormEvent, useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";

import { useAuth } from "../lib/auth";

export function LoginPage() {
  const { login, user, loading } = useAuth();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const redirectTo = (location.state as { from?: { pathname?: string } })?.from?.pathname ?? "/";

  useEffect(() => {
    if (user && !submitting) {
      navigate(redirectTo, { replace: true });
    }
  }, [user, navigate, redirectTo, submitting]);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await login(username, password);
      navigate(redirectTo, { replace: true });
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : "No se pudo iniciar sesión");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Box display="flex" justifyContent="center" alignItems="center" minHeight="60vh">
      <Card sx={{ width: 420 }} component="form" onSubmit={handleSubmit}>
        <CardHeader
          avatar={<LockOpenIcon color="primary" />}
          title="Ingreso"
          subheader="Autenticación contra API"
        />
        <CardContent>
          <Stack spacing={2}>
            {error && <Alert severity="error">{error}</Alert>}
            <TextField
              label="Usuario"
              fullWidth
              placeholder="usuario@ejemplo.com"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              disabled={submitting || loading}
            />
            <TextField
              label="Contraseña"
              type="password"
              fullWidth
              placeholder="••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={submitting || loading}
            />
            <Button variant="contained" color="primary" fullWidth type="submit" disabled={submitting || loading}>
              {submitting || loading ? "Ingresando..." : "Entrar"}
            </Button>
          </Stack>
        </CardContent>
      </Card>
    </Box>
  );
}
