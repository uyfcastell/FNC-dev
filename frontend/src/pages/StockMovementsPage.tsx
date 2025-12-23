import HistoryIcon from "@mui/icons-material/History";
import {
  Alert,
  Button,
  Card,
  CardContent,
  CardHeader,
  Chip,
  Divider,
  Grid,
  Skeleton,
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

import { SearchableSelect } from "../components/SearchableSelect";
import {
  Deposit,
  fetchDeposits,
  fetchSkus,
  fetchStockMovementTypes,
  fetchStockMovements,
  SKU,
  StockMovement,
  StockMovementType,
} from "../lib/api";

const PAGE_SIZE = 50;

const formatDateTime = (value: string) =>
  new Date(value).toLocaleString("es-AR", { hour12: false, timeZone: "UTC" });

export function StockMovementsPage() {
  const [skus, setSkus] = useState<SKU[]>([]);
  const [deposits, setDeposits] = useState<Deposit[]>([]);
  const [movementTypes, setMovementTypes] = useState<StockMovementType[]>([]);
  const [movements, setMovements] = useState<StockMovement[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<{
    sku_id: number | null;
    deposit_id: number | null;
    movement_type_id: number | null;
    date_from: string;
    date_to: string;
    lot_code: string;
  }>({
    sku_id: null,
    deposit_id: null,
    movement_type_id: null,
    date_from: "",
    date_to: "",
    lot_code: "",
  });

  useEffect(() => {
    const loadCatalogs = async () => {
      try {
        const [skuList, depositList, movementTypeList] = await Promise.all([
          fetchSkus(),
          fetchDeposits(),
          fetchStockMovementTypes({ include_inactive: true }),
        ]);
        setSkus(skuList);
        setDeposits(depositList);
        setMovementTypes(movementTypeList);
      } catch (err) {
        console.error(err);
        setError("No pudimos obtener catálogos para filtrar movimientos");
      }
    };
    void loadCatalogs();
  }, []);

  useEffect(() => {
    const loadMovements = async () => {
      setLoading(true);
      try {
        const response = await fetchStockMovements({
          sku_id: filters.sku_id ?? undefined,
          deposit_id: filters.deposit_id ?? undefined,
          movement_type_id: filters.movement_type_id ?? undefined,
          date_from: filters.date_from || undefined,
          date_to: filters.date_to || undefined,
          lot_code: filters.lot_code || undefined,
          limit: PAGE_SIZE,
          offset: page * PAGE_SIZE,
        });
        setMovements(response.items);
        setTotal(response.total);
        setError(null);
      } catch (err) {
        console.error(err);
        setError("No pudimos obtener los movimientos de stock");
        setMovements([]);
        setTotal(0);
      } finally {
        setLoading(false);
      }
    };
    void loadMovements();
  }, [filters, page]);

  const skuOptions = useMemo(
    () =>
      [...skus]
        .sort((a, b) => a.name.localeCompare(b.name))
        .map((sku) => ({
          value: sku.id,
          label: `${sku.name} (${sku.code})`,
          description: sku.sku_type_label,
        })),
    [skus]
  );

  const depositOptions = useMemo(
    () =>
      [...deposits]
        .sort((a, b) => a.name.localeCompare(b.name))
        .map((deposit) => ({ value: deposit.id, label: deposit.name, description: deposit.location || undefined })),
    [deposits]
  );

  const movementTypeOptions = useMemo(
    () =>
      movementTypes.map((type) => ({
        value: type.id,
        label: `${type.code} — ${type.label}`,
        description: type.is_active ? "Activo" : "Inactivo",
      })),
    [movementTypes]
  );

  const handleFilterChange = (patch: Partial<typeof filters>) => {
    setFilters((prev) => ({ ...prev, ...patch }));
    setPage(0);
  };

  const handleClearFilters = () => {
    setFilters({
      sku_id: null,
      deposit_id: null,
      movement_type_id: null,
      date_from: "",
      date_to: "",
      lot_code: "",
    });
    setPage(0);
  };

  const hasNextPage = (page + 1) * PAGE_SIZE < total;
  const hasPrevPage = page > 0;

  return (
    <Stack spacing={2}>
      <Typography variant="h5" sx={{ display: "flex", alignItems: "center", gap: 1 }}>
        <HistoryIcon color="primary" />
        Movimientos de stock
      </Typography>
      {error && <Alert severity="warning">{error}</Alert>}
      <Card>
        <CardHeader title="Filtros" subheader="SKU, depósito, tipo y rango de fechas" />
        <Divider />
        <CardContent>
          <Grid container spacing={2}>
            <Grid item xs={12} md={3}>
              <SearchableSelect
                label="SKU"
                options={skuOptions}
                value={filters.sku_id}
                onChange={(value) => handleFilterChange({ sku_id: value })}
                placeholder="Todos"
                size="small"
              />
            </Grid>
            <Grid item xs={12} md={3}>
              <SearchableSelect
                label="Depósito"
                options={depositOptions}
                value={filters.deposit_id}
                onChange={(value) => handleFilterChange({ deposit_id: value })}
                placeholder="Todos"
                size="small"
              />
            </Grid>
            <Grid item xs={12} md={3}>
              <SearchableSelect
                label="Tipo de movimiento"
                options={movementTypeOptions}
                value={filters.movement_type_id}
                onChange={(value) => handleFilterChange({ movement_type_id: value })}
                placeholder="Todos"
                size="small"
              />
            </Grid>
            <Grid item xs={12} md={3}>
              <TextField
                label="Lote"
                value={filters.lot_code}
                onChange={(e) => handleFilterChange({ lot_code: e.target.value })}
                fullWidth
                size="small"
              />
            </Grid>
            <Grid item xs={12} md={3}>
              <TextField
                label="Desde"
                type="date"
                value={filters.date_from}
                onChange={(e) => handleFilterChange({ date_from: e.target.value })}
                fullWidth
                size="small"
                InputLabelProps={{ shrink: true }}
              />
            </Grid>
            <Grid item xs={12} md={3}>
              <TextField
                label="Hasta"
                type="date"
                value={filters.date_to}
                onChange={(e) => handleFilterChange({ date_to: e.target.value })}
                fullWidth
                size="small"
                InputLabelProps={{ shrink: true }}
              />
            </Grid>
            <Grid item xs={12} md={6} display="flex" justifyContent="flex-end" alignItems="center" gap={1}>
              <Button variant="outlined" onClick={handleClearFilters}>
                Limpiar filtros
              </Button>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      <Card>
        <CardHeader
          title="Últimos movimientos"
          subheader="Visibilidad operativa en tiempo real, incluyendo saldos negativos"
          action={<Chip label={`Total: ${total}`} color="primary" variant="outlined" />}
        />
        <Divider />
        <CardContent>
          {loading && (
            <Stack spacing={1}>
              <Skeleton variant="rectangular" height={32} />
              <Skeleton variant="rectangular" height={32} />
              <Skeleton variant="rectangular" height={32} />
            </Stack>
          )}
          {!loading && (
            <>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Fecha registro</TableCell>
                    <TableCell>Fecha movimiento</TableCell>
                    <TableCell>SKU</TableCell>
                    <TableCell>Depósito</TableCell>
                    <TableCell>Tipo</TableCell>
                    <TableCell align="right">Cantidad</TableCell>
                    <TableCell align="right">Saldo actual</TableCell>
                    <TableCell>Lote</TableCell>
                    <TableCell>Línea</TableCell>
                    <TableCell>Referencia</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {movements.map((movement) => (
                    <TableRow key={movement.id} hover>
                      <TableCell>{formatDateTime(movement.created_at)}</TableCell>
                      <TableCell>{movement.movement_date}</TableCell>
                      <TableCell>
                        <Stack spacing={0.3}>
                          <Typography variant="body2">{movement.sku_code}</Typography>
                          <Typography variant="caption" color="text.secondary">
                            {movement.sku_name}
                          </Typography>
                        </Stack>
                      </TableCell>
                      <TableCell>{movement.deposit_name}</TableCell>
                      <TableCell>
                        <Chip size="small" label={movement.movement_type_label} color="default" />
                      </TableCell>
                      <TableCell align="right">
                        <Typography color={movement.quantity < 0 ? "error" : "success.main"} fontWeight={600}>
                          {movement.quantity}
                        </Typography>
                      </TableCell>
                      <TableCell align="right">
                        <Typography color={(movement.current_balance ?? 0) < 0 ? "error" : "text.primary"} fontWeight={600}>
                          {movement.current_balance ?? "—"}
                        </Typography>
                      </TableCell>
                      <TableCell>{movement.lot_code || "—"}</TableCell>
                      <TableCell>{movement.production_line_name || "—"}</TableCell>
                      <TableCell>{movement.reference || "—"}</TableCell>
                    </TableRow>
                  ))}
                  {!movements.length && (
                    <TableRow>
                      <TableCell colSpan={10} align="center">
                        <Typography variant="body2" color="text.secondary">
                          No hay movimientos que coincidan con los filtros
                        </Typography>
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
              <Stack direction="row" spacing={1} justifyContent="flex-end" alignItems="center" sx={{ mt: 2 }}>
                <Typography variant="body2" color="text.secondary">
                  Página {page + 1} / {Math.max(1, Math.ceil(total / PAGE_SIZE))}
                </Typography>
                <Button variant="outlined" onClick={() => setPage((prev) => Math.max(0, prev - 1))} disabled={!hasPrevPage}>
                  Anterior
                </Button>
                <Button variant="outlined" onClick={() => setPage((prev) => prev + 1)} disabled={!hasNextPage}>
                  Siguiente
                </Button>
              </Stack>
            </>
          )}
        </CardContent>
      </Card>
    </Stack>
  );
}
