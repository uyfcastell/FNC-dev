import InventoryIcon from "@mui/icons-material/Inventory2";
import { Alert, Card, CardContent, CardHeader, Chip, Divider, Skeleton, Stack, Table, TableBody, TableCell, TableHead, TableRow, Typography } from "@mui/material";
import { useEffect, useState } from "react";

import { fetchStockLevels, fetchSkus, StockLevel, SKU } from "../lib/api";

export function StockPage() {
  const [stock, setStock] = useState<StockLevel[] | null>(null);
  const [skus, setSkus] = useState<SKU[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      try {
        const [stockLevels, skuList] = await Promise.all([fetchStockLevels(), fetchSkus()]);
        setStock(stockLevels);
        setSkus(skuList);
      } catch (err) {
        console.error(err);
        setError("No pudimos obtener el stock. ¿Está levantado el backend?");
        setStock([]);
      }
    }

    load();
  }, []);

  const getUnit = (skuCode: string) => skus?.find((s) => s.code === skuCode)?.unit ?? "";

  return (
    <Stack spacing={2}>
      <Typography variant="h5" sx={{ display: "flex", alignItems: "center", gap: 1 }}>
        <InventoryIcon color="primary" />
        Stock y kardex
      </Typography>
      <Card>
        <CardHeader
          title="Saldos por depósito"
          subheader="Consolidado en tiempo real según movimientos registrados"
          action={<Chip label="Vista diaria" color="secondary" variant="outlined" />}
        />
        <Divider />
        <CardContent>
          {error && <Alert severity="warning">{error}</Alert>}
          {!stock && (
            <Stack spacing={1}>
              <Skeleton variant="rectangular" height={32} />
              <Skeleton variant="rectangular" height={32} />
              <Skeleton variant="rectangular" height={32} />
            </Stack>
          )}
          {stock && (
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>SKU</TableCell>
                  <TableCell>Depósito</TableCell>
                  <TableCell align="right">Cantidad</TableCell>
                  <TableCell>UoM</TableCell>
                  <TableCell>Estado</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {stock.map((row) => (
                  <TableRow key={`${row.sku_code}-${row.deposit_id}`}>
                    <TableCell>{row.sku_code}</TableCell>
                    <TableCell>{row.deposit_name}</TableCell>
                    <TableCell align="right">{row.quantity}</TableCell>
                    <TableCell>{getUnit(row.sku_code)}</TableCell>
                    <TableCell>
                      <Chip
                        size="small"
                        label={row.quantity > 0 ? "En rango" : "Sin stock"}
                        color={row.quantity > 0 ? "success" : "warning"}
                        variant="outlined"
                      />
                    </TableCell>
                  </TableRow>
                ))}
                {stock.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={5} align="center">
                      Sin movimientos todavía. Registra ingresos o consumos para ver el kardex.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </Stack>
  );
}
