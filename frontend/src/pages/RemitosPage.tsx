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
  Divider,
  Grid,
  IconButton,
  MenuItem,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import { useEffect, useMemo, useState } from "react";

import { ApiError, Deposit, fetchDeposits, fetchRemitoPdfBlob, fetchRemitos, Remito, RemitoStatus } from "../lib/api";

const formatDate = (value?: string | null) => (value ? new Date(value).toLocaleDateString("es-AR") : "-");

const REMITO_STATUS_LABELS: Record<RemitoStatus, string> = {
  pending: "Pendiente",
  sent: "Enviado",
  delivered: "Entregado",
  dispatched: "Despachado",
  received: "Recibido",
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
  const [error, setError] = useState<string | null>(null);

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

  const openRemitoPdf = async (remitoId: number) => {
    try {
      setError(null);
      const pdfBlob = await fetchRemitoPdfBlob(remitoId);
      const blobUrl = URL.createObjectURL(pdfBlob);
      const newWindow = window.open(blobUrl, "_blank", "noopener,noreferrer");
      if (!newWindow) {
        window.location.assign(blobUrl);
      }
      window.setTimeout(() => URL.revokeObjectURL(blobUrl), 1000);
    } catch (err) {
      console.error(err);
      if (err instanceof ApiError && (err.status === 401 || err.status === 403)) {
        setError("Sesión expirada / sin permisos");
      } else {
        setError("No pudimos descargar el PDF.");
      }
    }
  };

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
                label="Buscar por ID"
                value={idFilter}
                onChange={(e) => setIdFilter(e.target.value)}
                placeholder="Ej: 1208"
              />
            </Grid>
          </Grid>
          <Stack spacing={1}>
            {filteredRemitos.length === 0 ? (
              <Typography variant="body2" color="text.secondary">
                Aún no hay remitos registrados.
              </Typography>
            ) : (
              filteredRemitos.map((remito) => (
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
                      </Stack>
                    </Stack>
                    {remito.items.length > 0 && (
                      <Box sx={{ mt: 2 }}>
                        <Typography variant="subtitle2" gutterBottom>
                          Ítems
                        </Typography>
                        <Stack spacing={0.5}>
                          {remito.items.map((item) => (
                            <Typography key={item.id} variant="body2" color="text.secondary">
                              {item.sku_code} · {item.sku_name} · {item.quantity}
                            </Typography>
                          ))}
                        </Stack>
                      </Box>
                    )}
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
