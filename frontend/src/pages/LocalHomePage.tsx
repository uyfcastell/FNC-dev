import ListAltIcon from "@mui/icons-material/ListAlt";
import PlaylistAddIcon from "@mui/icons-material/PlaylistAdd";
import {
  Alert,
  Box,
  Button,
  Card,
  CardActions,
  CardContent,
  CardHeader,
  CircularProgress,
  List,
  ListItem,
  ListItemText,
  Stack,
  Typography,
} from "@mui/material";
import { ReactElement, useEffect, useMemo, useState } from "react";
import { Link as RouterLink } from "react-router-dom";

import { fetchOrders, Order } from "../lib/api";
import { useAuth } from "../lib/auth";

const PREVIEW_LIMIT = 5;

export function LocalHomePage() {
  const { canAny } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loadingOrders, setLoadingOrders] = useState(false);
  const [ordersError, setOrdersError] = useState<string | null>(null);

  const showOrderEntry = canAny(["orders.create"]);
  const showMyOrders = canAny(["orders.view"]);

  useEffect(() => {
    if (!showMyOrders) {
      return;
    }
    const loadOrders = async () => {
      setLoadingOrders(true);
      try {
        const orderList = await fetchOrders({ mine: true });
        setOrders(orderList);
        setOrdersError(null);
      } catch (error) {
        console.error(error);
        setOrdersError("No pudimos cargar tus pedidos.");
      } finally {
        setLoadingOrders(false);
      }
    };
    void loadOrders();
  }, [showMyOrders]);

  const latestOrders = useMemo(() => orders.slice(0, PREVIEW_LIMIT), [orders]);

  const cards = [
    showOrderEntry
      ? {
          key: "entry",
          content: (
            <Card key="entry">
              <CardHeader avatar={<PlaylistAddIcon />} title="Ingreso de pedidos" />
              <CardContent>
                <Typography variant="body2" color="text.secondary">
                  Cargá pedidos para tus locales con un flujo simplificado.
                </Typography>
              </CardContent>
              <CardActions>
                <Button component={RouterLink} to="/pedidos/ingreso" variant="contained">
                  Ir a ingreso
                </Button>
              </CardActions>
            </Card>
          ),
        }
      : null,
    showMyOrders
      ? {
          key: "mine",
          content: (
            <Card key="mine">
              <CardHeader avatar={<ListAltIcon />} title="Mis pedidos" />
              <CardContent>
                {loadingOrders ? (
                  <Box display="flex" justifyContent="center" py={2}>
                    <CircularProgress size={22} />
                  </Box>
                ) : ordersError ? (
                  <Alert severity="error">{ordersError}</Alert>
                ) : latestOrders.length === 0 ? (
                  <Typography variant="body2" color="text.secondary">
                    Todavía no registraste pedidos.
                  </Typography>
                ) : (
                  <List dense disablePadding>
                    {latestOrders.map((order) => (
                      <ListItem key={order.id} disableGutters>
                        <ListItemText
                          primary={`Pedido #${order.id} · ${order.destination}`}
                          secondary={`Estado: ${order.status} · ${new Date(order.created_at).toLocaleDateString()}`}
                        />
                      </ListItem>
                    ))}
                  </List>
                )}
              </CardContent>
              <CardActions>
                <Button component={RouterLink} to="/pedidos?mine=true">
                  Ver más
                </Button>
              </CardActions>
            </Card>
          ),
        }
      : null,
  ].filter(Boolean) as { key: string; content: ReactElement }[];

  if (!cards.length) {
    return (
      <Alert severity="info">
        No tenés accesos asignados para este portal. Contactá a un administrador si necesitás habilitar funcionalidades.
      </Alert>
    );
  }

  return (
    <Stack spacing={3}>
      <Typography variant="h4">Portal de Locales</Typography>
      <Stack spacing={2}>{cards.map((card) => card.content)}</Stack>
    </Stack>
  );
}
