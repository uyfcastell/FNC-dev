import LockIcon from "@mui/icons-material/Lock";
import VisibilityIcon from "@mui/icons-material/Visibility";
import VisibilityOffIcon from "@mui/icons-material/VisibilityOff";
import { Alert, Box, Button, Card, CardContent, CardHeader, IconButton, InputAdornment, Stack, TextField } from "@mui/material";
import { FormEvent, useEffect, useState } from "react";
import { Link as RouterLink, useLocation, useNavigate } from "react-router-dom";

import { useAuth } from "../lib/auth";
import { isLocalUser } from "../lib/roles";

export function MobilePinLoginPage() {
  const { loginWithPin, user, loading } = useAuth();
  const [pin, setPin] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [showPin, setShowPin] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  useEffect(() => {
    if (user && !submitting) {
      const redirectTo =
        isLocalUser(user) ? "/mobile/pedidos" : ((location.state as { from?: { pathname?: string } })?.from?.pathname ?? "/");
      navigate(redirectTo, { replace: true });
    }
  }, [location.state, navigate, submitting, user]);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await loginWithPin(pin.trim());
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : "PIN inválido");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Box display="flex" justifyContent="center" alignItems="center" minHeight="60vh">
      <Card sx={{ width: 360 }} component="form" onSubmit={handleSubmit}>
        <CardHeader
          avatar={<LockIcon color="primary" />}
          title="Ingreso rápido"
          subheader="PIN numérico"
        />
        <CardContent>
          <Stack spacing={2}>
            {error && <Alert severity="error">{error}</Alert>}
            <TextField
              label="PIN"
              type={showPin ? "text" : "password"}
              fullWidth
              value={pin}
              inputMode="numeric"
              placeholder="••••"
              inputProps={{ maxLength: 6 }}
              onChange={(e) => setPin(e.target.value.replace(/\D/g, ""))}
              disabled={submitting || loading}
              InputProps={{
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton
                      edge="end"
                      aria-label={showPin ? "Ocultar PIN" : "Mostrar PIN"}
                      onClick={() => setShowPin((prev) => !prev)}
                      onMouseDown={(event) => event.preventDefault()}
                    >
                      {showPin ? <VisibilityOffIcon /> : <VisibilityIcon />}
                    </IconButton>
                  </InputAdornment>
                ),
              }}
            />
            <Button variant="contained" color="primary" fullWidth type="submit" disabled={submitting || loading || !pin}>
              {submitting || loading ? "Ingresando..." : "Ingresar"}
            </Button>
            <Button component={RouterLink} to="/login" variant="text" fullWidth>
              Ingresar con usuario y contraseña
            </Button>
          </Stack>
        </CardContent>
      </Card>
    </Box>
  );
}
