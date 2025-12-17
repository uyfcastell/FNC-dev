import LockOpenIcon from "@mui/icons-material/LockOpen";
import { Box, Button, Card, CardContent, CardHeader, Stack, TextField, Typography } from "@mui/material";

export function LoginPage() {
  return (
    <Box display="flex" justifyContent="center" alignItems="center" minHeight="60vh">
      <Card sx={{ width: 420 }}>
        <CardHeader
          avatar={<LockOpenIcon color="primary" />}
          title="Ingreso"
          subheader="Autenticación interna (mock)"
        />
        <CardContent>
          <Stack spacing={2}>
            <TextField label="Usuario" fullWidth placeholder="admin" />
            <TextField label="Contraseña" type="password" fullWidth placeholder="••••••" />
            <Button variant="contained" color="primary" fullWidth>
              Entrar
            </Button>
            <Typography variant="body2" color="text.secondary" textAlign="center">
              Validación pendiente de implementar contra API.
            </Typography>
          </Stack>
        </CardContent>
      </Card>
    </Box>
  );
}
