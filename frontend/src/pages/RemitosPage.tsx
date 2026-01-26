import ArrowDownwardIcon from "@mui/icons-material/ArrowDownward";
import ArrowUpwardIcon from "@mui/icons-material/ArrowUpward";
import OpenInNewIcon from "@mui/icons-material/OpenInNew";
import ReceiptLongIcon from "@mui/icons-material/ReceiptLong";
import RefreshIcon from "@mui/icons-material/Refresh";
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  CardHeader,
  Chip,
  Collapse,
  Divider,
  Grid,
  IconButton,
  Link,
  MenuItem,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField,
  Tooltip,
  Typography,
} from "@mui/material";
import { useEffect, useMemo, useState } from "react";
import { Link as RouterLink, useNavigate } from "react-router-dom";

import {
  ApiError,
  Deposit,
  fetchDeposits,
  fetchRemitoPdfBlob,
  fetchRemitos,
  OrderStatus,
  Remito,
  RemitoStatus,
} from "../lib/api";

const formatDate = (value?: string | null) => (value ? new Date(value).toLocaleDateString("es-AR") : "-");

const REMITO_STATUS_LABELS: Record<RemitoStatus, string> = {
  pending: "Pendiente",
  dispatched: "Enviado",
  received: "Entregado",
  cancelled: "Cancelado",
};

const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
  draft: "Borrador",
  submitted: "Enviado",
  prepared: "Preparado",
  partially_prepared: "Preparado parcial",
  partially_dispatched: "Parcialmente despachado",
  dispatched: "Despachado",
  cancelled: "Cancelado",
};

export function RemitosPage() {
  const [remitos, setRemitos] = useState<Remito[]>([]);
  const [deposits, setDeposits] = useState<Deposit[]>([]);
  const [statusFilter, setStatusFilter] = useState<RemitoStatus | "all">("all");
  const [destinationFilter, setDestinationFilter] = useState("");
  const [dateFromFilter, setDateFromFilter] = useState("");
  const [dateToFilter, setDateToFilter] = useState("");
  const [idFilter, setIdFilter] = useState("");
  const [sortField, setSortField] = useState<"issue_date" | "id">("issue_date");
  const [sortDirection, setSortDirection] = useState<"desc" | "asc">("desc");
  const [expandedRemitoId, setExpandedRemitoId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  const supportsRegeneratePdf = false;

  useEffect(() => {
    void loadRemitos();
    void loadDeposits();
  }, []);

  const loadRemitos = async () => {
    try {
      const remitosList = await fetchRemitos();
      setRemitos(remitosList);
      setError(null);
    } catch (err) {
      console.error(err);
      setError("No pudimos cargar los remitos.");
    }
  };

  const loadDeposits = async () => {
    try {
      const depositList = await fetchDeposits();
      setDeposits(depositList);
    } catch (err) {
      console.error(err);
      setError("No pudimos cargar los depósitos.");
    }
  };

  const handleDateFromChange = (value: string) => {
    setDateFromFilter(value);
    if (dateToFilter && value && value > dateToFilter) {
      setDateToFilter(value);
    }
  };

  const handleDateToChange = (value: string) => {
    if (dateFromFilter && value && value < dateFromFilter) {
      setDateToFilter(dateFromFilter);
      return;
    }
    setDateToFilter(value);
  };

  const filteredRemitos = useMemo(() => {
    const start = dateFromFilter ? new Date(`${dateFromFilter}T00:00:00`) : null;
    const end = dateToFilter ? new Date(`${dateToFilter}T23:59:59`) : null;
    const idQuery = idFilter.trim();

    return remitos.filter((remito) => {
      if (statusFilter !== "all" && remito.status !== statusFilter) {
        return false;
      }
      if (destinationFilter && String(remito.destination_deposit_id ?? "") !== destinationFilter) {
        return false;
      }
      if (idQuery && !String(remito.id).includes(idQuery)) {
        return false;
      }
      const issuedAt = new Date(remito.issue_date);
      if (start && issuedAt < start) {
        return false;
      }
      if (end && issuedAt > end) {
        return false;
      }
      return true;
    });
  }, [remitos, statusFilter, destinationFilter, dateFromFilter, dateToFilter, idFilter]);

  const sortedRemitos = useMemo(() => {
    const sorted = [...filteredRemitos];
    sorted.sort((a, b) => {
      if (sortField === "issue_date") {
        const aDate = new Date(a.issue_date).getTime();
        const bDate = new Date(b.issue_date).getTime();
        return sortDirection === "asc" ? aDate - bDate : bDate - aDate;
      }
      const aId = a.id;
      const bId = b.id;
      return sortDirection === "asc" ? aId - bId : bId - aId;
    });
    return sorted;
  }, [filteredRemitos, sortField, sortDirection]);

  const openRemitoPdf = async (remitoId: number) => {
    const newWindow = window.open("", "_blank");
    if (!newWindow) {
      setError("El navegador bloqueó la apertura del PDF en una pestaña nueva.");
      return;
    }
    newWindow.opener = null;
    newWindow.document.title = `Remito #${remitoId}`;
    newWindow.document.body.innerHTML = "<p>Cargando PDF...</p>";
    try {
      setError(null);
      const pdfBlob = await fetchRemitoPdfBlob(remitoId);
      const blobUrl = URL.createObjectURL(pdfBlob);
      const revokeBlobUrl = () => URL.revokeObjectURL(blobUrl);
      newWindow.addEventListener("pagehide", revokeBlobUrl, { once: true });
      window.setTimeout(revokeBlobUrl, 5 * 60 * 1000);
      const pdfTitle = `Remito #${remitoId}`;
      newWindow.document.open();
      newWindow.document.write(`<!DOCTYPE html>
        <html lang="es">
          <head>
            <meta charset="utf-8" />
            <title>${pdfTitle}</title>
            <style>
              html, body { margin: 0; height: 100%; }
              iframe { border: 0; width: 100%; height: 100%; }
            </style>
          </head>
          <body>
            <iframe src="${blobUrl}" title="${pdfTitle}"></iframe>
          </body>
        </html>`);
      newWindow.document.close();
      newWindow.focus();
    } catch (err) {
      console.error(err);
      newWindow.close();
      if (err instanceof ApiError && (err.status === 401 || err.status === 403)) {
        setError("Sesión expirada / sin permisos");
      } else {
        setError("No pudimos descargar el PDF.");
      }
    }
  };

  const handleRegeneratePdf = () => {
    setError("La regeneración de PDF aún no está disponible.");
  };

  const handleViewStockMovements = (remito: Remito) => {
    if (!remito.shipment_id) {
      setError("El remito no tiene envío asociado para ver movimientos de stock.");
      return;
    }
    setError(null);
    navigate(`/stock/movimientos?reference_type=SHIPMENT&reference_id=${remito.shipment_id}`);
  };

  const clearFilters = () => {
    setStatusFilter("all");
    setDestinationFilter("");
    setDateFromFilter("");
    setDateToFilter("");
    setIdFilter("");
  };

  const hasActiveFilters =
    statusFilter !== "all" ||
    destinationFilter !== "" ||
    dateFromFilter !== "" ||
    dateToFilter !== "" ||
    idFilter.trim() !== "";

  return (
    <Stack spacing={3}>
      <Typography variant="h5" fontWeight={700} display="flex" alignItems="center" gap={1}>
        <ReceiptLongIcon color="primary" /> Remitos
      </Typography>

      {error && <Alert severity="error">{error}</Alert>}

      <Card>
        <CardHeader
          title={`Bandeja de remitos (${filteredRemitos.length})`}
          subheader={`Mostrando ${filteredRemitos.length} de ${remitos.length}`}
          action={
            <IconButton onClick={loadRemitos}>
              <RefreshIcon />
            </IconButton>
          }
        />
        <Divider />
        <CardContent>
          <Grid container spacing={2} sx={{ mb: 2 }}>
            <Grid item xs={12} md={3}>
              <TextField
                select
                fullWidth
                label="Estado"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as RemitoStatus | "all")}
              >
                <MenuItem value="all">Todos</MenuItem>
                {Object.entries(REMITO_STATUS_LABELS).map(([status, label]) => (
                  <MenuItem key={status} value={status}>
                    {label}
                  </MenuItem>
                ))}
              </TextField>
            </Grid>
            <Grid item xs={12} md={3}>
              <TextField
                select
                fullWidth
                label="Destino"
                value={destinationFilter}
                onChange={(e) => setDestinationFilter(e.target.value)}
              >
                <MenuItem value="">Todos</MenuItem>
                {deposits.map((deposit) => (
                  <MenuItem key={deposit.id} value={String(deposit.id)}>
                    {deposit.name}
                  </MenuItem>
                ))}
              </TextField>
            </Grid>
            <Grid item xs={12} md={3}>
              <TextField
                fullWidth
                type="date"
                label="Fecha emisión desde"
                value={dateFromFilter}
                onChange={(e) => handleDateFromChange(e.target.value)}
                InputLabelProps={{ shrink: true }}
              />
            </Grid>
            <Grid item xs={12} md={3}>
              <TextField
                fullWidth
                type="date"
                label="Fecha emisión hasta"
                value={dateToFilter}
                onChange={(e) => handleDateToChange(e.target.value)}
                inputProps={{ min: dateFromFilter || undefined }}
                InputLabelProps={{ shrink: true }}
              />
            </Grid>
            <Grid item xs={12} md={4}>
              <TextField
                fullWidth
                label="Buscar por número de remito"
                value={idFilter}
                onChange={(e) => setIdFilter(e.target.value)}
                placeholder="Ej: 1208"
              />
            </Grid>
            <Grid item xs={12} md={4}>
              <TextField
                select
                fullWidth
                label="Ordenar por"
                value={sortField}
                onChange={(e) => setSortField(e.target.value as "issue_date" | "id")}
              >
                <MenuItem value="issue_date">Fecha de emisión</MenuItem>
                <MenuItem value="id">Número de remito</MenuItem>
              </TextField>
            </Grid>
            <Grid item xs={12} md={2}>
              <Button
                fullWidth
                variant="outlined"
                onClick={() => setSortDirection((prev) => (prev === "asc" ? "desc" : "asc"))}
                startIcon={sortDirection === "asc" ? <ArrowUpwardIcon /> : <ArrowDownwardIcon />}
              >
                {sortDirection === "asc" ? "Ascendente" : "Descendente"}
              </Button>
            </Grid>
            <Grid item xs={12} md={2}>
              <Button fullWidth variant="text" onClick={clearFilters} disabled={!hasActiveFilters}>
                Limpiar filtros
              </Button>
            </Grid>
          </Grid>
          <Stack spacing={1}>
            {sortedRemitos.length === 0 ? (
              <Typography variant="body2" color="text.secondary">
                Aún no hay remitos registrados.
              </Typography>
            ) : (
              sortedRemitos.map((remito) => (
                <Card key={remito.id} variant="outlined">
                  <CardContent>
                    <Stack direction={{ xs: "column", sm: "row" }} justifyContent="space-between" spacing={2}>
                      <Box>
                        <Typography fontWeight={700}>Remito #{remito.id}</Typography>
                        <Typography variant="body2" color="text.secondary">
                          Destino: {remito.destination_deposit_name ?? remito.destination}
                          {remito.source_deposit_name ? ` · Origen: ${remito.source_deposit_name}` : ""}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          Emisión: {formatDate(remito.issue_date)} · Estado: {REMITO_STATUS_LABELS[remito.status]}
                        </Typography>
                      </Box>
                      <Stack spacing={1} alignItems={{ sm: "flex-end" }}>
                        <Chip label={REMITO_STATUS_LABELS[remito.status]} variant="outlined" />
                        {remito.pdf_path && (
                          <Button variant="outlined" onClick={() => openRemitoPdf(remito.id)}>
                            Ver PDF
                          </Button>
                        )}
                        <Button
                          variant="text"
                          onClick={() =>
                            setExpandedRemitoId((prev) => (prev === remito.id ? null : remito.id))
                          }
                        >
                          {expandedRemitoId === remito.id ? "Ocultar detalle" : "Ver detalle"}
                        </Button>
                      </Stack>
                    </Stack>
                    <Collapse in={expandedRemitoId === remito.id} timeout="auto" unmountOnExit>
                      <Divider sx={{ my: 2 }} />
                      <Grid container spacing={2}>
                        <Grid item xs={12} md={6}>
                          <Typography variant="subtitle2" gutterBottom>
                            Datos del remito
                          </Typography>
                          <Stack spacing={0.5}>
                            <Typography variant="body2" color="text.secondary">
                              Número: {remito.id}
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                              Fecha: {formatDate(remito.issue_date)}
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                              Estado: {REMITO_STATUS_LABELS[remito.status]}
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                              Destino: {remito.destination_deposit_name ?? remito.destination}
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                              Origen: {remito.source_deposit_name ?? "Sin dato"}
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                              Confirmado por: {remito.updated_by_name ?? remito.created_by_name ?? "Sin dato"}
                            </Typography>
                          </Stack>
                        </Grid>
                        <Grid item xs={12} md={6}>
                          <Typography variant="subtitle2" gutterBottom>
                            Pedidos origen asociados
                          </Typography>
                          {remito.origin_orders && remito.origin_orders.length > 0 ? (
                            <Stack spacing={0.5}>
                              {remito.origin_orders.map((order) => (
                                <Typography key={order.id} variant="body2" color="text.secondary">
                                  Pedido #{order.id} · {ORDER_STATUS_LABELS[order.status]}
                                </Typography>
                              ))}
                            </Stack>
                          ) : (
                            <Typography variant="body2" color="text.secondary">
                              No hay pedidos asociados registrados.
                            </Typography>
                          )}
                          {remito.shipment_id && (
                            <Link
                              component={RouterLink}
                              to={`/envios/${remito.shipment_id}`}
                              underline="hover"
                              variant="body2"
                            >
                              Envío #{remito.shipment_id}
                            </Link>
                          )}
                        </Grid>
                        <Grid item xs={12}>
                          <Typography variant="subtitle2" gutterBottom>
                            Líneas del remito
                          </Typography>
                          {remito.items.length > 0 ? (
                            <Table size="small">
                              <TableHead>
                                <TableRow>
                                  <TableCell>SKU</TableCell>
                                  <TableCell>Descripción</TableCell>
                                  <TableCell align="right">Cantidad (unid.)</TableCell>
                                </TableRow>
                              </TableHead>
                              <TableBody>
                                {remito.items.map((item) => (
                                  <TableRow key={item.id}>
                                    <TableCell>{item.sku_code}</TableCell>
                                    <TableCell>{item.sku_name}</TableCell>
                                    <TableCell align="right">{item.quantity}</TableCell>
                                  </TableRow>
                                ))}
                              </TableBody>
                            </Table>
                          ) : (
                            <Typography variant="body2" color="text.secondary">
                              No hay líneas cargadas.
                            </Typography>
                          )}
                        </Grid>
                        <Grid item xs={12}>
                          <Typography variant="subtitle2" gutterBottom>
                            Acciones operativas
                          </Typography>
                          <Stack direction={{ xs: "column", sm: "row" }} spacing={1} flexWrap="wrap">
                            {remito.pdf_path && (
                              <Button variant="outlined" onClick={() => openRemitoPdf(remito.id)}>
                                Ver PDF
                              </Button>
                            )}
                            <Tooltip
                              title={
                                supportsRegeneratePdf
                                  ? "Regenerar el PDF con la última información"
                                  : "Función disponible cuando el backend la habilite"
                              }
                            >
                              <span>
                                <Button
                                  variant="outlined"
                                  disabled={!supportsRegeneratePdf}
                                  onClick={handleRegeneratePdf}
                                >
                                  Re-generar PDF
                                </Button>
                              </span>
                            </Tooltip>
                            <Button
                              variant="text"
                              endIcon={<OpenInNewIcon />}
                              onClick={() => handleViewStockMovements(remito)}
                            >
                              Ver movimientos de stock asociados
                            </Button>
                          </Stack>
                          <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 1 }}>
                            Los movimientos se visualizan en la bandeja general.{" "}
                            <Link
                              component="button"
                              underline="hover"
                              onClick={() => handleViewStockMovements(remito)}
                            >
                              Abrir movimientos de stock
                            </Link>
                            .
                          </Typography>
                        </Grid>
                      </Grid>
                    </Collapse>
                  </CardContent>
                </Card>
              ))
            )}
          </Stack>
        </CardContent>
      </Card>
    </Stack>
  );
}
