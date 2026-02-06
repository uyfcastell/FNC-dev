import BlockIcon from "@mui/icons-material/Block";
import { Box, Button, Stack, Typography } from "@mui/material";
import { useNavigate } from "react-router-dom";

export function ForbiddenPage() {
  const navigate = useNavigate();

  return (
    <Box minHeight="60vh" display="flex" alignItems="center" justifyContent="center">
      <Stack spacing={2} alignItems="center" textAlign="center">
        <BlockIcon color="error" sx={{ fontSize: 56 }} />
        <Typography variant="h4" fontWeight={700}>
          Sin acceso
        </Typography>
        <Typography variant="body1" color="text.secondary">
          No tenés permisos para ver esta sección.
        </Typography>
        <Button variant="contained" onClick={() => navigate("/")}>Volver al inicio</Button>
      </Stack>
    </Box>
  );
}
