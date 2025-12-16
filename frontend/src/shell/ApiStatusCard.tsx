import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import ErrorIcon from "@mui/icons-material/ErrorOutline";
import RefreshIcon from "@mui/icons-material/Refresh";
import { Alert, AlertTitle, Box, Button, Card, CardContent, CardHeader, CircularProgress, Stack, Typography } from "@mui/material";
import { useEffect, useState } from "react";
import { fetchHealth } from "../lib/api";

export function ApiStatusCard() {
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState<string | null>(null);
  const [version, setVersion] = useState<string | undefined>();
  const [error, setError] = useState<string | null>(null);

  const loadHealth = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchHealth();
      setStatus(data.status);
      setVersion(data.version);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error desconocido");
      setStatus(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadHealth();
  }, []);

  const isHealthy = status === "ok";

  return (
    <Card>
      <CardHeader
        title="Estado del backend"
        subheader="Consulta al endpoint /health con VITE_API_BASE_URL"
        action={
          <Button startIcon={<RefreshIcon />} onClick={loadHealth} disabled={loading} variant="outlined">
            Actualizar
          </Button>
        }
      />
      <CardContent>
        {loading ? (
          <Box display="flex" alignItems="center" gap={2}>
            <CircularProgress size={24} />
            <Typography variant="body2">Consultando API...</Typography>
          </Box>
        ) : error ? (
          <Alert severity="error" icon={<ErrorIcon />}>
            <AlertTitle>API sin respuesta</AlertTitle>
            {error}
          </Alert>
        ) : (
          <Alert severity={isHealthy ? "success" : "warning"} icon={isHealthy ? <CheckCircleIcon /> : undefined}>
            <AlertTitle>{isHealthy ? "Operativa" : "Advertencia"}</AlertTitle>
            <Stack spacing={0.5}>
              <Typography>Respuesta: {status ?? ""}</Typography>
              {version && <Typography variant="body2">Versión: {version}</Typography>}
            </Stack>
          </Alert>
        )}
      </CardContent>
    </Card>
  );
}
