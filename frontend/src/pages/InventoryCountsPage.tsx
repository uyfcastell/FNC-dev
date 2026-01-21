import FactCheckIcon from "@mui/icons-material/FactCheck";
import PlaylistAddCheckIcon from "@mui/icons-material/PlaylistAddCheck";
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField,
  Tooltip,
  Typography,
} from "@mui/material";
import { AddCircleOutline, CheckCircleOutline, Close, DeleteForever, Refresh } from "@mui/icons-material";
import { FormEvent, useEffect, useMemo, useState } from "react";

import { SearchableSelect } from "../components/SearchableSelect";
import {
  approveInventoryCount,
  cancelInventoryCount,
  closeInventoryCount,
  createInventoryCount,
  Deposit,
  fetchDeposits,
  fetchInventoryCounts,
  fetchProductionLots,
  fetchSkus,
  InventoryCount,
  InventoryCountItemPayload,
  InventoryCountStatus,
  ProductionLot,
  SKU,
  submitInventoryCount,
} from "../lib/api";

const statusLabels: Record<InventoryCountStatus, string> = {
  draft: "Borrador",
  submitted: "Enviado",
  approved: "Aprobado",
  closed: "Cerrado",
  cancelled: "Cancelado",
};

type CountLine = {
  sku_id: string;
  counted_quantity: string;
  production_lot_id: string;
};

const emptyLine: CountLine = { sku_id: "", counted_quantity: "", production_lot_id: "" };

export function InventoryCountsPage() {
  const [counts, setCounts] = useState<InventoryCount[]>([]);
  const [selectedCount, setSelectedCount] = useState<InventoryCount | null>(null);
  const [deposits, setDeposits] = useState<Deposit[]>([]);
  const [skus, setSkus] = useState<SKU[]>([]);
  const [lots, setLots] = useState<ProductionLot[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [form, setForm] = useState({ deposit_id: "", count_date: "", notes: "" });
  const [lines, setLines] = useState<CountLine[]>([emptyLine]);

  useEffect(() => {
    void loadAll();
  }, []);

  const loadAll = async () => {
    try {
      setLoading(true);
      const [countList, depositList, skuList] = await Promise.all([fetchInventoryCounts(), fetchDeposits(), fetchSkus()]);
      setCounts(countList);
      setDeposits(depositList);
      setSkus(skuList);
      setError(null);
      if (countList.length > 0 && !selectedCount) {
        setSelectedCount(countList[0]);
      }
    } catch (err) {
      console.error(err);
      setError("No pudimos cargar conteos o catálogos.");
    } finally {
      setLoading(false);
    }
  };

  const selectedDeposit = deposits.find((d) => d.id === Number(form.deposit_id)) ?? null;

  const skuOptions = useMemo(
    () =>
      skus.map((sku) => ({
        value: sku.id,
        label: `${sku.name} (${sku.code})`,
      })),
    [skus]
  );

  const lotOptions = useMemo(() => {
    if (!selectedDeposit?.controls_lot) return [];
    return lots.map((lot) => ({
      value: lot.id,
      label: `${lot.lot_code} · ${lot.sku_name}`,
      description: `Disponible: ${lot.remaining_quantity.toFixed(2)}`,
    }));
  }, [lots, selectedDeposit]);

  const handleLineChange = (index: number, field: keyof CountLine, value: string) => {
    setLines((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], [field]: value };
      return next;
    });
  };

  const addLine = () => setLines((prev) => [...prev, emptyLine]);
  const removeLine = (index: number) => setLines((prev) => prev.filter((_, idx) => idx !== index));

  const handleSkuChange = async (index: number, skuId: string) => {
    handleLineChange(index, "sku_id", skuId);
    if (!selectedDeposit?.controls_lot || !skuId) return;
    try {
      const lotList = await fetchProductionLots({
        deposit_id: selectedDeposit.id,
        sku_id: Number(skuId),
        available_only: true,
      });
      setLots((prev) => {
        const existing = new Map(prev.map((lot) => [lot.id, lot]));
        for (const lot of lotList) {
          existing.set(lot.id, lot);
        }
        return Array.from(existing.values());
      });
    } catch (err) {
      console.error(err);
      setError("No pudimos cargar los lotes disponibles.");
    }
  };

  const handleCreate = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);
    setSuccess(null);
    if (!form.deposit_id) {
      setError("Selecciona un depósito.");
      return;
    }
    const payloadItems: InventoryCountItemPayload[] = lines
      .filter((line) => line.sku_id && Number(line.counted_quantity) > 0)
      .map((line) => ({
        sku_id: Number(line.sku_id),
        counted_quantity: Number(line.counted_quantity),
        production_lot_id: line.production_lot_id ? Number(line.production_lot_id) : undefined,
      }));
    if (!payloadItems.length) {
      setError("Agrega al menos un SKU con cantidad.");
      return;
    }

    try {
      const created = await createInventoryCount({
        deposit_id: Number(form.deposit_id),
        count_date: form.count_date || null,
        notes: form.notes || null,
        items: payloadItems,
      });
      setSuccess(`Conteo #${created.id} creado.`);
      setCounts((prev) => [created, ...prev]);
      setSelectedCount(created);
      setForm({ deposit_id: "", count_date: "", notes: "" });
      setLines([emptyLine]);
    } catch (err) {
      console.error(err);
      setError("No pudimos crear el conteo. Verifica lotes y cantidades.");
    }
  };

  const handleAction = async (action: "submit" | "approve" | "close" | "cancel", countId: number) => {
    try {
      setLoading(true);
      let updated: InventoryCount;
      if (action === "submit") {
        updated = await submitInventoryCount(countId);
      } else if (action === "approve") {
        updated = await approveInventoryCount(countId);
      } else if (action === "close") {
        updated = await closeInventoryCount(countId);
      } else {
        updated = await cancelInventoryCount(countId);
      }
      setCounts((prev) => prev.map((count) => (count.id === updated.id ? updated : count)));
      setSelectedCount(updated);
      setSuccess(`Conteo #${updated.id} actualizado.`);
    } catch (err) {
      console.error(err);
      setError("No pudimos actualizar el conteo.");
    } finally {
      setLoading(false);
    }
  };

  const statusColor = (status: InventoryCountStatus) => {
    if (status === "approved" || status === "closed") return "success";
    if (status === "submitted") return "info";
    if (status === "cancelled") return "error";
    return "default";
  };

  return (
    <Stack spacing={2}>
      <Typography variant="h5" sx={{ display: "flex", alignItems: "center", gap: 1 }}>
        <FactCheckIcon color="primary" />
        Inventarios físicos
      </Typography>

      {error && <Alert severity="error">{error}</Alert>}
      {success && <Alert severity="success">{success}</Alert>}

      <Card>
        <CardHeader
          title="Nuevo conteo"
          subheader="Registra cantidades por depósito y lote (si aplica)."
          avatar={<PlaylistAddCheckIcon color="primary" />}
        />
        <Divider />
        <CardContent component="form" onSubmit={handleCreate}>
          <Grid container spacing={2}>
            <Grid item xs={12} md={4}>
              <TextField
                select
                fullWidth
                label="Depósito"
                value={form.deposit_id}
                onChange={(e) => setForm((prev) => ({ ...prev, deposit_id: e.target.value }))}
              >
                {deposits.map((deposit) => (
                  <MenuItem key={deposit.id} value={deposit.id}>
                    {deposit.name}
                  </MenuItem>
                ))}
              </TextField>
            </Grid>
            <Grid item xs={12} md={3}>
              <TextField
                type="date"
                fullWidth
                label="Fecha del conteo"
                InputLabelProps={{ shrink: true }}
                value={form.count_date}
                onChange={(e) => setForm((prev) => ({ ...prev, count_date: e.target.value }))}
              />
            </Grid>
            <Grid item xs={12} md={5}>
              <TextField
                fullWidth
                label="Notas"
                value={form.notes}
                onChange={(e) => setForm((prev) => ({ ...prev, notes: e.target.value }))}
              />
            </Grid>
          </Grid>

          <Box mt={3}>
            <Typography variant="subtitle1" gutterBottom>
              Ítems del conteo
            </Typography>
            <Stack spacing={1.5}>
              {lines.map((line, idx) => (
                <Grid container spacing={2} key={idx} alignItems="center">
                  <Grid item xs={12} md={5}>
                    <SearchableSelect
                      label="SKU"
                      value={line.sku_id ? Number(line.sku_id) : null}
                      options={skuOptions}
                      onChange={(value) => handleSkuChange(idx, value ? String(value) : "")}
                    />
                  </Grid>
                  <Grid item xs={12} md={3}>
                    <TextField
                      label="Cantidad contada"
                      type="number"
                      fullWidth
                      value={line.counted_quantity}
                      onChange={(e) => handleLineChange(idx, "counted_quantity", e.target.value)}
                    />
                  </Grid>
                  <Grid item xs={12} md={3}>
                    <SearchableSelect
                      label={selectedDeposit?.controls_lot ? "Lote" : "Lote (opcional)"}
                      value={line.production_lot_id ? Number(line.production_lot_id) : null}
                      options={lotOptions.filter((lot) => {
                        if (!line.sku_id) return true;
                        const lotData = lots.find((l) => l.id === lot.value);
                        return lotData?.sku_id === Number(line.sku_id);
                      })}
                      onChange={(value) => handleLineChange(idx, "production_lot_id", value ? String(value) : "")}
                      disabled={!selectedDeposit?.controls_lot}
                    />
                  </Grid>
                  <Grid item xs={12} md={1}>
                    <IconButton color="error" onClick={() => removeLine(idx)} disabled={lines.length === 1}>
                      <DeleteForever />
                    </IconButton>
                  </Grid>
                </Grid>
              ))}
              <Button startIcon={<AddCircleOutline />} onClick={addLine} sx={{ alignSelf: "flex-start" }}>
                Agregar ítem
              </Button>
            </Stack>
          </Box>

          <Stack direction="row" spacing={2} mt={3}>
            <Button type="submit" variant="contained">
              Crear conteo
            </Button>
            <Button variant="outlined" startIcon={<Refresh />} onClick={loadAll}>
              Recargar
            </Button>
          </Stack>
        </CardContent>
      </Card>

      <Card>
        <CardHeader
          title="Conteos registrados"
          subheader="Selecciona un conteo para ver el detalle"
          action={
            <Tooltip title="Actualizar">
              <IconButton onClick={loadAll}>
                <Refresh />
              </IconButton>
            </Tooltip>
          }
        />
        <Divider />
        <CardContent>
          {counts.length === 0 && <Typography>No hay conteos registrados.</Typography>}
          {counts.length > 0 && (
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>ID</TableCell>
                  <TableCell>Fecha</TableCell>
                  <TableCell>Depósito</TableCell>
                  <TableCell>Estado</TableCell>
                  <TableCell>Ítems</TableCell>
                  <TableCell>Acciones</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {counts.map((count) => (
                  <TableRow
                    key={count.id}
                    hover
                    selected={selectedCount?.id === count.id}
                    onClick={() => setSelectedCount(count)}
                    sx={{ cursor: "pointer" }}
                  >
                    <TableCell>#{count.id}</TableCell>
                    <TableCell>{count.count_date}</TableCell>
                    <TableCell>{count.deposit_name}</TableCell>
                    <TableCell>
                      <Chip label={statusLabels[count.status]} color={statusColor(count.status)} />
                    </TableCell>
                    <TableCell>{count.items.length}</TableCell>
                    <TableCell>
                      <Stack direction="row" spacing={1} flexWrap="wrap">
                        <Button
                          size="small"
                          variant="outlined"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleAction("submit", count.id);
                          }}
                          disabled={count.status !== "draft"}
                        >
                          Enviar
                        </Button>
                        <Button
                          size="small"
                          variant="outlined"
                          color="success"
                          startIcon={<CheckCircleOutline />}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleAction("approve", count.id);
                          }}
                          disabled={count.status !== "submitted"}
                        >
                          Aprobar
                        </Button>
                        <Button
                          size="small"
                          variant="outlined"
                          startIcon={<Close />}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleAction("close", count.id);
                          }}
                          disabled={count.status !== "approved"}
                        >
                          Cerrar
                        </Button>
                        <Button
                          size="small"
                          variant="outlined"
                          color="error"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleAction("cancel", count.id);
                          }}
                          disabled={!(["draft", "submitted"].includes(count.status))}
                        >
                          Cancelar
                        </Button>
                      </Stack>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {selectedCount && (
        <Card>
          <CardHeader title={`Detalle conteo #${selectedCount.id}`} />
          <Divider />
          <CardContent>
            <Grid container spacing={2} mb={2}>
              <Grid item xs={12} md={4}>
                <Typography variant="body2" color="text.secondary">
                  Depósito
                </Typography>
                <Typography variant="subtitle1">{selectedCount.deposit_name}</Typography>
              </Grid>
              <Grid item xs={12} md={4}>
                <Typography variant="body2" color="text.secondary">
                  Estado
                </Typography>
                <Typography variant="subtitle1">{statusLabels[selectedCount.status]}</Typography>
              </Grid>
              <Grid item xs={12} md={4}>
                <Typography variant="body2" color="text.secondary">
                  Responsable
                </Typography>
                <Typography variant="subtitle1">{selectedCount.created_by_name ?? "-"}</Typography>
              </Grid>
            </Grid>

            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>SKU</TableCell>
                  <TableCell>Lote</TableCell>
                  <TableCell align="right">Sistema</TableCell>
                  <TableCell align="right">Conteo</TableCell>
                  <TableCell align="right">Diferencia</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {selectedCount.items.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell>{item.sku_name}</TableCell>
                    <TableCell>{item.lot_code ?? "-"}</TableCell>
                    <TableCell align="right">{item.system_quantity.toFixed(2)}</TableCell>
                    <TableCell align="right">{item.counted_quantity.toFixed(2)}</TableCell>
                    <TableCell align="right">{item.difference.toFixed(2)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </Stack>
  );
}
