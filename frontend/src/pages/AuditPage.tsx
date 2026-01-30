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
import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";

import {
  ApiError,
  AuditAction,
  AuditLog,
  fetchAuditLogs,
  fetchAuditLogsExport,
  fetchAuditLogsMeta,
  fetchUsers,
  User,
} from "../lib/api";
import { downloadBlob } from "../lib/download";

const actionLabels: Record<AuditAction, string> = {
  create: "Alta",
  update: "Edición",
  delete: "Borrado",
  status: "Cambio de estado",
  approve: "Aprobación",
  cancel: "Cancelación",
};

const entityTypeLabels: Record<string, string> = {
  orders: "Pedidos",
  shipments: "Envíos",
  remitos: "Remitos",
  stock_movements: "Movimientos",
  inventory_counts: "Conteos",
  purchase_receipts: "Recepciones de compra",
  roles: "Roles",
  users: "Usuarios",
  skus: "Productos",
  sku_types: "Tipos de SKU",
  deposits: "Depósitos",
  merma_events: "Mermas",
  merma_types: "Tipos de merma",
  merma_causes: "Causas de merma",
  mermas: "Mermas",
};

const PAGE_SIZE = 200;

const formatEntityTypeLabel = (value: string) => {
  if (!value) return value;
  if (entityTypeLabels[value]) return entityTypeLabels[value];
  return value
    .split("_")
    .map((word) => (word ? word[0].toUpperCase() + word.slice(1) : word))
    .join(" ");
};

export function AuditPage() {
  const [searchParams] = useSearchParams();
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [users, setUsers] = useState<User[]>([]);
  const [entityTypes, setEntityTypes] = useState<string[]>([]);
  const [page, setPage] = useState(0);
  const [filters, setFilters] = useState({
    entity_type: searchParams.get("entity_type") ?? "",
    user_id: "",
    date_from: "",
    date_to: "",
    detail_q: "",
  });

  const entityTypeOptions = useMemo(() => {
    const current = filters.entity_type;
    if (current && !entityTypes.includes(current)) {
      return [...entityTypes, current];
    }
    return entityTypes;
  }, [entityTypes, filters.entity_type]);

  const loadLogs = async () => {
    try {
      setLoading(true);
      const data = await fetchAuditLogs({
        entity_type: filters.entity_type || undefined,
        user_id: filters.user_id ? Number(filters.user_id) : undefined,
        date_from: filters.date_from || undefined,
        date_to: filters.date_to || undefined,
        detail_q: filters.detail_q || undefined,
        limit: PAGE_SIZE,
        offset: page * PAGE_SIZE,
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
    setPage(0);
  };

  useEffect(() => {
    setFilters((prev) => ({
      ...prev,
      entity_type: searchParams.get("entity_type") ?? "",
    }));
    setPage(0);
  }, [searchParams]);

  useEffect(() => {
    const loadUsers = async () => {
      try {
        const data = await fetchUsers();
        setUsers(data);
      } catch (err) {
        console.error(err);
        setError("No pudimos cargar usuarios.");
      }
    };
    void loadUsers();
  }, []);

  useEffect(() => {
    const loadMeta = async () => {
      try {
        const data = await fetchAuditLogsMeta();
        setEntityTypes(data.entity_types ?? []);
      } catch (err) {
        console.error(err);
        setError("No pudimos cargar metadata de auditoría.");
      }
    };
    void loadMeta();
  }, []);

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      void loadLogs();
    }, 300);
    return () => window.clearTimeout(timeout);
  }, [filters, page]);

  const handleExport = async () => {
    try {
      setExporting(true);
      const { blob, filename } = await fetchAuditLogsExport({
        entity_type: filters.entity_type || undefined,
        user_id: filters.user_id ? Number(filters.user_id) : undefined,
        date_from: filters.date_from || undefined,
        date_to: filters.date_to || undefined,
        detail_q: filters.detail_q || undefined,
      });
      downloadBlob(blob, filename);
    } catch (err) {
      console.error(err);
      if (err instanceof ApiError) {
        setError(err.message || "No pudimos exportar la auditoría.");
      } else {
        setError("No pudimos exportar la auditoría.");
      }
    } finally {
      setExporting(false);
    }
  };

  return (
    <Stack spacing={2}>
      <Typography variant="h5" sx={{ display: "flex", alignItems: "center", gap: 1 }}>
        <HistoryIcon color="primary" />
        Auditoría
      </Typography>

      {error && <Alert severity="error">{error}</Alert>}

      <Card>
        <CardHeader
          title="Filtros"
          action={
            <Button variant="outlined" onClick={handleExport} disabled={loading || exporting}>
              Exportar Excel
            </Button>
          }
        />
        <Divider />
        <CardContent>
          <Grid container spacing={2}>
            <Grid item xs={12} md={3}>
              <TextField
                select
                fullWidth
                label="Entidad"
                value={filters.entity_type}
                onChange={(e) => handleFilterChange({ entity_type: e.target.value })}
              >
                <MenuItem value="">Todas</MenuItem>
                {entityTypeOptions.map((entityType) => (
                  <MenuItem key={entityType} value={entityType}>
                    {formatEntityTypeLabel(entityType)}
                  </MenuItem>
                ))}
              </TextField>
            </Grid>
            <Grid item xs={12} md={3}>
              <TextField
                select
                fullWidth
                label="Usuario"
                value={filters.user_id}
                onChange={(e) => handleFilterChange({ user_id: e.target.value })}
              >
                <MenuItem value="">Todos</MenuItem>
                {users.map((user) => (
                  <MenuItem key={user.id} value={String(user.id)}>
                    {user.full_name ? `${user.full_name} (${user.email})` : user.email}
                    {!user.is_active ? " (Inactivo)" : ""}
                  </MenuItem>
                ))}
              </TextField>
            </Grid>
            <Grid item xs={12} md={3}>
              <TextField
                type="search"
                label="Buscar en detalle…"
                placeholder="Buscar en detalle…"
                fullWidth
                value={filters.detail_q}
                onChange={(e) => handleFilterChange({ detail_q: e.target.value })}
              />
            </Grid>
            <Grid item xs={12} md={1.5}>
              <TextField
                type="date"
                fullWidth
                label="Desde"
                InputLabelProps={{ shrink: true }}
                value={filters.date_from}
                onChange={(e) => handleFilterChange({ date_from: e.target.value })}
              />
            </Grid>
            <Grid item xs={12} md={1.5}>
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
                      <TableCell>{formatEntityTypeLabel(log.entity_type)}</TableCell>
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
          <Stack direction="row" spacing={1} justifyContent="flex-end" sx={{ mt: 2 }}>
            <Button
              variant="outlined"
              onClick={() => setPage((prev) => Math.max(prev - 1, 0))}
              disabled={loading || page === 0}
            >
              Anterior
            </Button>
            <Button
              variant="outlined"
              onClick={() => setPage((prev) => prev + 1)}
              disabled={loading || logs.length < PAGE_SIZE}
            >
              Siguiente
            </Button>
          </Stack>
        </CardContent>
      </Card>
    </Stack>
  );
}
