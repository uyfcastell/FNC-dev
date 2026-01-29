import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import CheckIcon from "@mui/icons-material/Check";
import ClearIcon from "@mui/icons-material/Clear";
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  CardHeader,
  Chip,
  Divider,
  FormControlLabel,
  Stack,
  ToggleButton,
  ToggleButtonGroup,
  TextField,
  Typography,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Checkbox,
} from "@mui/material";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import { useEffect, useMemo, useState } from "react";
import { Link as RouterLink, useLocation, useParams } from "react-router-dom";

import { fetchShipment, prepShipmentItems, Shipment, ShipmentItem, ShipmentPrepStatus } from "../lib/api";

type PrepMode = "order" | "sku";
type PrepFilter = "all" | ShipmentPrepStatus;

const PREP_STATUS_LABELS: Record<ShipmentPrepStatus, string> = {
  pending: "Pendiente",
  partial: "Parcial",
  ready: "Listo",
};

const SHIPMENT_STATUS_LABELS: Record<string, string> = {
  draft: "Borrador",
  confirmed: "Confirmado",
  dispatched: "Despachado",
};

const MODE_LABELS: Record<PrepMode, string> = {
  order: "Por pedido",
  sku: "Por SKU",
};

const formatDate = (value?: string | null) => (value ? new Date(value).toLocaleDateString("es-AR") : "-");
const STORAGE_KEY = "prepMode";

const getPrepMode = (): PrepMode => {
  const stored = localStorage.getItem(STORAGE_KEY);
  return stored === "sku" ? "sku" : "order";
};

const getGroupStatus = (items: ShipmentItem[]): ShipmentPrepStatus => {
  const total = items.length;
  const ready = items.filter((item) => item.is_ready).length;
  if (total === 0 || ready === 0) return "pending";
  if (ready === total) return "ready";
  return "partial";
};

export function ShipmentPrepPage() {
  const { shipmentId } = useParams<{ shipmentId: string }>();
  const location = useLocation();
  const [shipment, setShipment] = useState<Shipment | null>(null);
  const [mode, setMode] = useState<PrepMode>(getPrepMode);
  const [filter, setFilter] = useState<PrepFilter>("all");
  const [search, setSearch] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [savingIds, setSavingIds] = useState<Set<number>>(new Set());

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, mode);
  }, [mode]);

  useEffect(() => {
    const id = Number(shipmentId);
    if (!shipmentId || Number.isNaN(id)) {
      setError("No pudimos identificar el envío solicitado.");
      return;
    }
    const loadShipment = async () => {
      setLoading(true);
      try {
        const data = await fetchShipment(id);
        setShipment(data);
        setError(null);
      } catch (err) {
        console.error(err);
        setError("No pudimos cargar el envío.");
      } finally {
        setLoading(false);
      }
    };
    void loadShipment();
  }, [shipmentId]);

  const isReadOnly = shipment?.status !== "draft";
  const items = shipment?.items ?? [];
  const totalCount = items.length;
  const readyCount = items.filter((item) => item.is_ready).length;

  const searchLower = search.trim().toLowerCase();

  const orderGroups = useMemo(() => {
    const orderMap = new Map<number, ShipmentItem[]>();
    items.forEach((item) => {
      if (!orderMap.has(item.order_id)) {
        orderMap.set(item.order_id, []);
      }
      orderMap.get(item.order_id)?.push(item);
    });
    const orderSummary = new Map(shipment?.orders?.map((order) => [order.id, order]) ?? []);
    return Array.from(orderMap.entries()).map(([orderId, groupItems]) => {
      const status = getGroupStatus(groupItems);
      const ready = groupItems.filter((item) => item.is_ready).length;
      const summary = orderSummary.get(orderId);
      return {
        orderId,
        items: groupItems,
        status,
        ready,
        total: groupItems.length,
        subtitle: summary?.required_delivery_date
          ? `Entrega: ${formatDate(summary.required_delivery_date)}`
          : undefined,
      };
    });
  }, [items, shipment?.orders]);

  const filteredOrderGroups = useMemo(() => {
    return orderGroups.filter((group) => {
      if (filter !== "all" && group.status !== filter) return false;
      if (!searchLower) return true;
      const orderMatch = String(group.orderId).includes(searchLower);
      const skuMatch = group.items.some((item) =>
        `${item.sku_code} ${item.sku_name}`.toLowerCase().includes(searchLower),
      );
      return orderMatch || skuMatch;
    });
  }, [orderGroups, filter, searchLower]);

  const skuGroups = useMemo(() => {
    const skuMap = new Map<number, ShipmentItem[]>();
    items.forEach((item) => {
      if (!skuMap.has(item.sku_id)) {
        skuMap.set(item.sku_id, []);
      }
      skuMap.get(item.sku_id)?.push(item);
    });
    return Array.from(skuMap.entries()).map(([skuId, groupItems]) => {
      const status = getGroupStatus(groupItems);
      const ready = groupItems.filter((item) => item.is_ready).length;
      return {
        skuId,
        sku_code: groupItems[0]?.sku_code ?? String(skuId),
        sku_name: groupItems[0]?.sku_name ?? "",
        items: groupItems,
        status,
        ready,
        total: groupItems.length,
      };
    });
  }, [items]);

  const filteredSkuGroups = useMemo(() => {
    return skuGroups.filter((group) => {
      if (filter !== "all" && group.status !== filter) return false;
      if (!searchLower) return true;
      return `${group.sku_code} ${group.sku_name}`.toLowerCase().includes(searchLower);
    });
  }, [skuGroups, filter, searchLower]);

  const updateShipmentItems = async (updates: Array<{ shipment_item_id: number; is_ready: boolean }>) => {
    if (!shipment) return;
    const nextSaving = new Set(savingIds);
    updates.forEach((update) => nextSaving.add(update.shipment_item_id));
    setSavingIds(nextSaving);
    try {
      const updated = await prepShipmentItems(shipment.id, updates);
      setShipment(updated);
    } catch (err) {
      console.error(err);
      setError("No pudimos actualizar los ítems del envío.");
    } finally {
      setSavingIds((prev) => {
        const next = new Set(prev);
        updates.forEach((update) => next.delete(update.shipment_item_id));
        return next;
      });
    }
  };

  const handleToggleItem = async (item: ShipmentItem) => {
    await updateShipmentItems([{ shipment_item_id: item.id, is_ready: !item.is_ready }]);
  };

  const handleSkuAction = async (groupItems: ShipmentItem[], isReady: boolean) => {
    const updates = groupItems.map((item) => ({ shipment_item_id: item.id, is_ready: isReady }));
    await updateShipmentItems(updates);
  };

  const isMobileRoute = location.pathname.startsWith("/mobile");
  const backTo = isMobileRoute ? "/mobile/envios" : `/envios/${shipment?.id ?? ""}`;
  const backLabel = isMobileRoute ? "Volver a envíos" : "Volver al envío";

  return (
    <Stack spacing={3}>
      <Box display="flex" alignItems="center" justifyContent="space-between" flexWrap="wrap" gap={2}>
        <Stack spacing={0.5}>
          <Typography variant="h5" fontWeight={700}>
            Preparar envío #{shipment?.id ?? "-"}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Destino: {shipment?.deposit_name ?? shipment?.deposit_id ?? "-"} · Fecha: {formatDate(shipment?.estimated_delivery_date)}
          </Typography>
        </Stack>
        <Stack direction="row" spacing={1} flexWrap="wrap">
          {shipment?.status && <Chip label={`Estado: ${SHIPMENT_STATUS_LABELS[shipment.status] ?? shipment.status}`} />}
          {shipment?.prep_status && (
            <Chip label={`Preparación: ${PREP_STATUS_LABELS[shipment.prep_status]}`} color={shipment.prep_status === "ready" ? "success" : "default"} />
          )}
          <Button component={RouterLink} to={backTo} startIcon={<ArrowBackIcon />} variant="outlined">
            {backLabel}
          </Button>
        </Stack>
      </Box>

      {error && <Alert severity="error">{error}</Alert>}
      {isReadOnly && (
        <Alert severity="info">Este envío ya no está en borrador. La preparación está en modo lectura.</Alert>
      )}

      <Card>
        <CardHeader
          title="Progreso"
          subheader={`${readyCount} de ${totalCount} líneas listas`}
          action={<Chip label={PREP_STATUS_LABELS[shipment?.prep_status ?? "pending"]} />}
        />
        <Divider />
        <CardContent>
          <Stack spacing={2}>
            <ToggleButtonGroup
              value={mode}
              exclusive
              onChange={(_, value) => value && setMode(value)}
              aria-label="modo de preparación"
            >
              <ToggleButton value="order">{MODE_LABELS.order}</ToggleButton>
              <ToggleButton value="sku">{MODE_LABELS.sku}</ToggleButton>
            </ToggleButtonGroup>

            <ToggleButtonGroup
              value={filter}
              exclusive
              onChange={(_, value) => value && setFilter(value)}
              aria-label="filtro"
            >
              <ToggleButton value="all">Todos</ToggleButton>
              <ToggleButton value="pending">Pendientes</ToggleButton>
              <ToggleButton value="partial">Parciales</ToggleButton>
              <ToggleButton value="ready">Listos</ToggleButton>
            </ToggleButtonGroup>

            <TextField
              label="Buscar pedido o SKU"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              size="small"
              fullWidth
            />
          </Stack>
        </CardContent>
      </Card>

      {loading ? (
        <Typography variant="body2" color="text.secondary">
          Cargando preparación...
        </Typography>
      ) : mode === "order" ? (
        <Stack spacing={2}>
          {filteredOrderGroups.map((group) => (
            <Accordion key={group.orderId} defaultExpanded={group.status !== "ready"}>
              <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                <Stack direction="row" spacing={2} alignItems="center" flexWrap="wrap">
                  <Typography fontWeight={600}>Pedido #{group.orderId}</Typography>
                  <Chip label={`${group.ready}/${group.total}`} />
                  <Chip label={PREP_STATUS_LABELS[group.status]} size="small" />
                  {group.subtitle && (
                    <Typography variant="body2" color="text.secondary">
                      {group.subtitle}
                    </Typography>
                  )}
                </Stack>
              </AccordionSummary>
              <AccordionDetails>
                <Stack spacing={1}>
                  {group.items.map((item) => (
                    <Box
                      key={item.id}
                      display="flex"
                      alignItems="center"
                      justifyContent="space-between"
                      gap={2}
                      flexWrap="wrap"
                    >
                      <Stack spacing={0.25}>
                        <Typography fontWeight={500}>
                          {item.sku_code} · {item.sku_name}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          Cantidad: {item.quantity}
                        </Typography>
                      </Stack>
                      <FormControlLabel
                        control={
                          <Checkbox
                            checked={item.is_ready}
                            onChange={() => void handleToggleItem(item)}
                            disabled={isReadOnly || savingIds.has(item.id)}
                          />
                        }
                        label={item.is_ready ? "Listo" : "Pendiente"}
                      />
                    </Box>
                  ))}
                </Stack>
              </AccordionDetails>
            </Accordion>
          ))}
          {filteredOrderGroups.length === 0 && (
            <Typography variant="body2" color="text.secondary">
              No hay pedidos para mostrar con los filtros actuales.
            </Typography>
          )}
        </Stack>
      ) : (
        <Stack spacing={2}>
          {filteredSkuGroups.map((group) => {
            const canMarkAllReady = group.items.some((item) => !item.is_ready);
            const canUnmarkAll = group.items.some((item) => item.is_ready);
            return (
              <Card key={group.skuId} variant="outlined">
                <CardContent>
                  <Stack spacing={1}>
                    <Stack direction="row" spacing={2} alignItems="center" flexWrap="wrap">
                      <Typography fontWeight={600}>
                        {group.sku_code} · {group.sku_name}
                      </Typography>
                      <Chip label={`${group.ready}/${group.total}`} />
                      <Chip label={PREP_STATUS_LABELS[group.status]} size="small" />
                    </Stack>
                    <Stack direction="row" spacing={1} flexWrap="wrap">
                      <Button
                        variant="contained"
                        startIcon={<CheckIcon />}
                        disabled={isReadOnly || !canMarkAllReady}
                        onClick={() => void handleSkuAction(group.items, true)}
                      >
                        Marcar SKU listo
                      </Button>
                      <Button
                        variant="outlined"
                        startIcon={<ClearIcon />}
                        disabled={isReadOnly || !canUnmarkAll}
                        onClick={() => void handleSkuAction(group.items, false)}
                      >
                        Desmarcar SKU
                      </Button>
                    </Stack>
                  </Stack>
                </CardContent>
              </Card>
            );
          })}
          {filteredSkuGroups.length === 0 && (
            <Typography variant="body2" color="text.secondary">
              No hay SKUs para mostrar con los filtros actuales.
            </Typography>
          )}
        </Stack>
      )}
    </Stack>
  );
}
