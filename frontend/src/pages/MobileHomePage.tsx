import ProductionIcon from "@mui/icons-material/PrecisionManufacturing";
import ReceiptIcon from "@mui/icons-material/ReceiptLong";
import LocalShippingIcon from "@mui/icons-material/LocalShipping";
import { Button, Card, CardContent, Stack, Typography } from "@mui/material";
import { Link as RouterLink } from "react-router-dom";

export function MobileHomePage() {
  return (
    <Stack spacing={3} alignItems="center" sx={{ mt: 2 }}>
      <Typography variant="h5" sx={{ fontWeight: 800, textAlign: "center" }}>
        ¿Qué querés hacer hoy?
      </Typography>
      <Stack spacing={2} sx={{ width: "100%" }}>
        <Card sx={{ borderRadius: 3 }}>
          <CardContent>
            <Stack spacing={2} alignItems="center">
              <ProductionIcon color="primary" sx={{ fontSize: 48 }} />
              <Typography variant="h6" sx={{ fontWeight: 700 }}>
                Producción
              </Typography>
              <Button
                component={RouterLink}
                to="/mobile/produccion"
                variant="contained"
                size="large"
                fullWidth
                sx={{ py: 1.5, fontSize: 18, fontWeight: 700 }}
              >
                Ir a producción
              </Button>
            </Stack>
          </CardContent>
        </Card>
        <Card sx={{ borderRadius: 3 }}>
          <CardContent>
            <Stack spacing={2} alignItems="center">
              <ReceiptIcon color="secondary" sx={{ fontSize: 48 }} />
              <Typography variant="h6" sx={{ fontWeight: 700 }}>
                Pedidos
              </Typography>
              <Button
                component={RouterLink}
                to="/mobile/pedidos"
                variant="contained"
                color="secondary"
                size="large"
                fullWidth
                sx={{ py: 1.5, fontSize: 18, fontWeight: 700 }}
              >
                Ir a pedidos
              </Button>
            </Stack>
          </CardContent>
        </Card>
        <Card sx={{ borderRadius: 3 }}>
          <CardContent>
            <Stack spacing={2} alignItems="center">
              <LocalShippingIcon color="info" sx={{ fontSize: 48 }} />
              <Typography variant="h6" sx={{ fontWeight: 700 }}>
                Envíos
              </Typography>
              <Button
                component={RouterLink}
                to="/mobile/envios"
                variant="contained"
                color="info"
                size="large"
                fullWidth
                sx={{ py: 1.5, fontSize: 18, fontWeight: 700 }}
              >
                Ir a envíos
              </Button>
            </Stack>
          </CardContent>
        </Card>
      </Stack>
    </Stack>
  );
}
