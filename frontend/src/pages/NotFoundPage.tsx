import { Button, Stack, Typography } from "@mui/material";
import { Link as RouterLink } from "react-router-dom";

export function NotFoundPage() {
  return (
    <Stack spacing={2} alignItems="flex-start">
      <Typography variant="h4">Página no encontrada</Typography>
      <Typography variant="body1" color="text.secondary">
        La ruta solicitada no existe. Usa la navegación para volver al inicio.
      </Typography>
      <Button component={RouterLink} to="/" variant="contained" color="primary">
        Volver al inicio
      </Button>
    </Stack>
  );
}
