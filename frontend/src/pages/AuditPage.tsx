import HistoryIcon from "@mui/icons-material/History";
import {
  Alert,
  Button,
  Card,
  CardContent,
  CardHeader,
  Divider,
  Grid,
  MenuItem,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from "@mui/material";
import { useEffect, useState } from "react";

import { AuditAction, AuditLog, fetchAuditLogs } from "../lib/api";

const actionLabels: Record<AuditAction, string> = {
  create: "Alta",
  update: "Edición",
  delete: "Borrado",
  status: "Cambio de estado",
  approve: "Aprobación",
  cancel: "Cancelación",
};

export function AuditPage() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [filters, setFilters] = useState({ entity_type: "", entity_id: "", user_id: "", date_from: "", date_to: "" });

  const loadLogs = async () => {
    try {
      setLoading(true);
      const data = await fetchAuditLogs({
        entity_type: filters.entity_type || undefined,
        entity_id: filters.entity_id ? Number(filters.entity_id) : undefined,
        user_id: filters.user_id ? Number(filters.user_id) : undefined,
        date_from: filters.date_from || undefined,
        date_to: filters.date_to || undefined,
        limit: 200,
      });
      setLogs(data);
      setError(null);
    } catch (err) {
      console.error(err);
      setError("No pudimos cargar la auditoría.");
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (patch: Partial<typeof filters>) => {
    setFilters((prev) => {
      const next = { ...prev, ...patch };
      if (next.date_from && next.date_to && next.date_to < next.date_from) {
        next.date_to = next.date_from;
      }
      return next;
    });
  };

  useEffect(() => {
    void loadLogs();
  }, []);

  return (
    <Stack spacing={2}>
      <Typography variant="h5" sx={{ display: "flex", alignItems: "center", gap: 1 }}>
        <HistoryIcon color="primary" />
        Auditoría
      </Typography>

      {error && <Alert severity="error">{error}</Alert>}

      <Card>
        <CardHeader title="Filtros" />
        <Divider />
        <CardContent>
          <Grid container spacing={2}>
            <Grid item xs={12} md={3}>
              <TextField
                select
                fullWidth
                label="Entidad"
                value={filters.entity_type}
                onChange={(e) => setFilters((prev) => ({ ...prev, entity_type: e.target.value }))}
              >
                <MenuItem value="">Todas</MenuItem>
                <MenuItem value="orders">Pedidos</MenuItem>
                <MenuItem value="remitos">Remitos</MenuItem>
                <MenuItem value="stock_movements">Movimientos</MenuItem>
                <MenuItem value="inventory_counts">Conteos</MenuItem>
                <MenuItem value="mermas">Mermas</MenuItem>
              </TextField>
            </Grid>
            <Grid item xs={12} md={2}>
              <TextField
                label="ID entidad"
                fullWidth
                value={filters.entity_id}
                onChange={(e) => setFilters((prev) => ({ ...prev, entity_id: e.target.value }))}
              />
            </Grid>
            <Grid item xs={12} md={2}>
              <TextField
                label="Usuario (ID)"
                fullWidth
                value={filters.user_id}
                onChange={(e) => setFilters((prev) => ({ ...prev, user_id: e.target.value }))}
              />
            </Grid>
            <Grid item xs={12} md={2.5}>
              <TextField
                type="date"
                fullWidth
                label="Desde"
                InputLabelProps={{ shrink: true }}
                value={filters.date_from}
                onChange={(e) => handleFilterChange({ date_from: e.target.value })}
              />
            </Grid>
            <Grid item xs={12} md={2.5}>
              <TextField
                type="date"
                fullWidth
                label="Hasta"
                InputLabelProps={{ shrink: true }}
                value={filters.date_to}
                onChange={(e) => handleFilterChange({ date_to: e.target.value })}
                inputProps={{ min: filters.date_from || undefined }}
              />
            </Grid>
          </Grid>
          <Stack direction="row" spacing={2} mt={2}>
            <Button variant="contained" onClick={loadLogs} disabled={loading}>
              Aplicar filtros
            </Button>
          </Stack>
        </CardContent>
      </Card>

      <Card>
        <CardHeader title="Eventos recientes" />
        <Divider />
        <CardContent>
          {logs.length === 0 && <Typography>No hay registros de auditoría.</Typography>}
          {logs.length > 0 && (
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Fecha</TableCell>
                  <TableCell>Entidad</TableCell>
                  <TableCell>ID</TableCell>
                  <TableCell>Acción</TableCell>
                  <TableCell>Usuario</TableCell>
                  <TableCell>Detalle</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {logs.map((log) => (
                  <TableRow key={log.id}>
                    <TableCell>{new Date(log.created_at).toLocaleString()}</TableCell>
                    <TableCell>{log.entity_type}</TableCell>
                    <TableCell>{log.entity_id ?? "-"}</TableCell>
                    <TableCell>{actionLabels[log.action] ?? log.action}</TableCell>
                    <TableCell>{log.user_name ?? log.user_id ?? "-"}</TableCell>
                    <TableCell>
                      <Typography variant="caption" sx={{ whiteSpace: "pre-wrap" }}>
                        {log.changes ? JSON.stringify(log.changes) : "-"}
                      </Typography>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </Stack>
  );
}
