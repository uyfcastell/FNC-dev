import PlaylistAddIcon from "@mui/icons-material/PlaylistAdd";
import RemoveCircleOutlineIcon from "@mui/icons-material/RemoveCircleOutline";
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  CardHeader,
  Divider,
  Grid,
  IconButton,
  MenuItem,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { useLocation } from "react-router-dom";

import { createOrder, fetchDeposits, fetchSkus, Deposit, SKU } from "../lib/api";
import { ORDER_SECTIONS, OrderSectionKey } from "../lib/orderSections";

const ORDER_PIN = "1959";
const MAX_PIN_ATTEMPTS = 3;

type OrderLine = { sku_id: string; quantity: string; current_stock: string };

type SectionConfig = {
  key: OrderSectionKey;
  title: string;
  helper?: string;
  filter: (sku: SKU) => boolean;
};

const initialLine: OrderLine = { sku_id: "", quantity: "", current_stock: "" };

export function OrderEntryPage() {
  const location = useLocation();
  const fromMenu = (location.state as { fromMenu?: boolean } | null)?.fromMenu === true;

  const [skus, setSkus] = useState<SKU[]>([]);
  const [deposits, setDeposits] = useState<Deposit[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [pin, setPin] = useState("");
  const [pinAttempts, setPinAttempts] = useState(0);
  const [pinValidated, setPinValidated] = useState<boolean>(fromMenu);
  const [blocked, setBlocked] = useState(false);

  const [header, setHeader] = useState<{ destination_deposit_id: string; notes: string; requested_by: string }>({
    destination_deposit_id: "",
    notes: "",
    requested_by: "",
  });
  const [lines, setLines] = useState<Record<OrderSectionKey, OrderLine[]>>({
    pt: [initialLine],
    consumibles: [initialLine],
    papeleria: [initialLine],
    limpieza: [initialLine],
  });

  useEffect(() => {
    void loadCatalog();
  }, []);

  useEffect(() => {
    if (fromMenu) {
      setPinValidated(true);
    }
  }, [fromMenu]);

  const loadCatalog = async () => {
    try {
      const [skuList, depositList] = await Promise.all([
        fetchSkus({ tags: ["PT", "CON", "PAP", "LIM"], include_inactive: false }),
        fetchDeposits(),
      ]);
      setSkus(skuList);
      setDeposits(depositList);
    } catch (err) {
      console.error(err);
      setError("No pudimos cargar productos o locales. ¿Backend activo?");
    }
  };

  const sortedSkus = useMemo(() => [...skus].sort((a, b) => a.name.localeCompare(b.name)), [skus]);
  const storeDeposits = useMemo(() => deposits.filter((d) => d.is_store), [deposits]);

  const sections: SectionConfig[] = ORDER_SECTIONS;

  const renderSection = (config: SectionConfig) => {
    const options = sortedSkus.filter(config.filter);
    const sectionLines = lines[config.key];

    return (
      <Card variant="outlined">
        <CardHeader title={config.title} subheader={config.helper} />
        <Divider />
        <CardContent>
          <Stack spacing={1.5}>
            {sectionLines.map((item, index) => (
              <Stack key={`${config.key}-${index}`} direction={{ xs: "column", sm: "row" }} spacing={1} alignItems={{ sm: "center" }}>
                <TextField
                  select
                  label="Producto"
                  value={item.sku_id}
                  onChange={(e) => handleLineChange(config.key, index, "sku_id", e.target.value)}
                  sx={{ flex: 1 }}
                  helperText={!options.length ? "No hay productos activos en esta sección" : undefined}
                >
                  {options.map((sku) => (
                    <MenuItem key={sku.id} value={sku.id}>
                      {sku.name} ({sku.code})
                    </MenuItem>
                  ))}
                </TextField>
                <TextField
                  label="Cantidad"
                  type="number"
                  inputProps={{ step: 1, min: 1, inputMode: "numeric" }}
                  value={item.quantity}
                  onChange={(e) => handleLineChange(config.key, index, "quantity", e.target.value)}
                  sx={{ width: 180 }}
                />
                <TextField
                  required
                  label="Stock en local"
                  type="number"
                  inputProps={{ step: 1, min: 0, inputMode: "numeric" }}
                  value={item.current_stock}
                  onChange={(e) => handleLineChange(config.key, index, "current_stock", e.target.value)}
                  sx={{ width: 220 }}
                />
                <IconButton
                  aria-label="Eliminar línea"
                  color="error"
                  disabled={sectionLines.length <= 1}
                  onClick={() => removeLine(config.key, index)}
                >
                  <RemoveCircleOutlineIcon />
                </IconButton>
              </Stack>
            ))}
            <Button variant="outlined" onClick={() => addLine(config.key)} startIcon={<PlaylistAddIcon />}
 disabled={!options.length}>
              Agregar ítem
            </Button>
          </Stack>
        </CardContent>
      </Card>
    );
  };

  const handleLineChange = (section: OrderSectionKey, index: number, field: keyof OrderLine, value: string) => {
    setLines((prev) => {
      const next = { ...prev };
      const updated = [...next[section]];
      updated[index] = { ...updated[index], [field]: value };
      next[section] = updated;
      return next;
    });
  };

  const addLine = (section: OrderSectionKey) => {
    setLines((prev) => ({ ...prev, [section]: [...prev[section], { ...initialLine }] }));
  };

  const removeLine = (section: OrderSectionKey, index: number) => {
    setLines((prev) => ({ ...prev, [section]: prev[section].filter((_, idx) => idx !== index) }));
  };

  const handlePinSubmit = (event: FormEvent) => {
    event.preventDefault();
    if (blocked) return;
    if (pin === ORDER_PIN) {
      setPinValidated(true);
      setError(null);
      return;
    }
    const attempts = pinAttempts + 1;
    setPinAttempts(attempts);
    if (attempts >= MAX_PIN_ATTEMPTS) {
      setBlocked(true);
      setError("PIN incorrecto. Intentos agotados. Recarga la página para reintentar.");
    } else {
      setError(`PIN incorrecto. Intento ${attempts} de ${MAX_PIN_ATTEMPTS}.`);
    }
  };

  const buildItemsPayload = () => {
    const allLines = Object.values(lines).flat();
    return allLines
      .filter((line) => line.sku_id && Number(line.quantity) > 0)
      .map((line) => ({
        sku_id: Number(line.sku_id),
        quantity: Number(line.quantity),
        current_stock: line.current_stock === "" ? undefined : Number(line.current_stock),
      }));
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (!header.destination_deposit_id) {
      setError("Selecciona un destino (local)");
      return;
    }
    if (!header.requested_by.trim()) {
      setError("Indica quién está ingresando el pedido");
      return;
    }
    const items = buildItemsPayload();
    if (!items.length) {
      setError("Agrega al menos un ítem en cualquiera de las secciones");
      return;
    }
    if (items.some((item) => !Number.isInteger(item.quantity))) {
      setError("Las cantidades deben ser números enteros");
      return;
    }
    if (items.some((item) => item.current_stock === undefined || item.current_stock === null)) {
      setError("Indica el stock actual en el local para cada ítem");
      return;
    }
    if (items.some((item) => !Number.isInteger(item.current_stock))) {
      setError("El stock actual debe ser un número entero");
      return;
    }
    try {
      await createOrder({
        destination_deposit_id: Number(header.destination_deposit_id),
        notes: header.notes || undefined,
        requested_by: header.requested_by.trim() || undefined,
        items,
      });
      setSuccess("Pedido enviado");
      setError(null);
      setHeader({ destination_deposit_id: "", notes: "", requested_by: "" });
      setLines({ pt: [initialLine], consumibles: [initialLine], papeleria: [initialLine], limpieza: [initialLine] });
    } catch (err) {
      console.error(err);
      setError("No pudimos registrar el pedido. Revisa los datos");
    }
  };

  if (!pinValidated) {
    return (
      <Stack spacing={2} sx={{ maxWidth: 520, mx: "auto", mt: 4 }}>
        <Card>
          <CardHeader title="Acceso a ingreso de pedidos" />
          <Divider />
          <CardContent>
            {error && <Alert severity="warning">{error}</Alert>}
            <Stack component="form" spacing={2} onSubmit={handlePinSubmit}>
              <Typography>Ingresa el PIN de 4 dígitos para continuar.</Typography>
              <TextField
                label="PIN"
                type="password"
                value={pin}
                inputProps={{ maxLength: 4, inputMode: "numeric" }}
                onChange={(e) => setPin(e.target.value)}
                required
                disabled={blocked}
              />
              <Button type="submit" variant="contained" disabled={blocked}>
                Validar
              </Button>
              <Typography variant="body2" color="text.secondary">
                Tienes hasta {MAX_PIN_ATTEMPTS} intentos. El PIN es de 4 dígitos.
              </Typography>
            </Stack>
          </CardContent>
        </Card>
      </Stack>
    );
  }

  return (
    <Stack spacing={2}>
      <Typography variant="h5" sx={{ display: "flex", alignItems: "center", gap: 1 }}>
        <PlaylistAddIcon color="primary" /> Ingreso de pedidos
      </Typography>
      {error && <Alert severity="warning">{error}</Alert>}
      {success && (
        <Alert severity="success" onClose={() => setSuccess(null)}>
          {success}
        </Alert>
      )}
      <Card>
        <CardHeader title="Encabezado" subheader="Destino obligatorio" />
        <Divider />
        <CardContent>
          <Grid container spacing={2}>
            <Grid item xs={12} md={6}>
              <TextField
                select
                required
                fullWidth
                label="Destino (local)"
                value={header.destination_deposit_id}
                onChange={(e) => setHeader((prev) => ({ ...prev, destination_deposit_id: e.target.value }))}
                helperText={!storeDeposits.length ? "Crea locales en Maestros > Depósitos marcando 'Es local'" : undefined}
              >
                {storeDeposits.map((deposit) => (
                  <MenuItem key={deposit.id} value={deposit.id}>
                    {deposit.name}
                  </MenuItem>
                ))}
              </TextField>
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                required
                label="Ingresado por"
                value={header.requested_by}
                onChange={(e) => setHeader((prev) => ({ ...prev, requested_by: e.target.value }))}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Notas"
                value={header.notes}
                onChange={(e) => setHeader((prev) => ({ ...prev, notes: e.target.value }))}
              />
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
        Ítems por sección (solo productos activos)
      </Typography>
      {sections.map((section) => (
        <div key={section.key}>{renderSection(section)}</div>
      ))}

      <Card>
        <CardContent>
          <Button type="submit" variant="contained" size="large" onClick={handleSubmit}>
            Enviar pedido
          </Button>
        </CardContent>
      </Card>
    </Stack>
  );
}
