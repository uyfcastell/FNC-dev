import AssessmentIcon from "@mui/icons-material/Assessment";
import SummarizeIcon from "@mui/icons-material/Summarize";
import {
  Alert,
  Card,
  CardContent,
  CardHeader,
  Divider,
  Grid,
  LinearProgress,
  Stack,
  Typography,
} from "@mui/material";
import { useEffect, useState } from "react";

import { fetchStockReport, MovementSummary, StockSummaryRow } from "../lib/api";

type ChartProps = {
  title: string;
  rows: StockSummaryRow[];
  emptyText: string;
};

const SummaryBar = ({ label, quantity, total, absolute }: { label: string; quantity: number; total: number; absolute?: boolean }) => {
  const value = absolute ? Math.abs(quantity) : quantity;
  const percentage = total > 0 ? Math.round((value / total) * 100) : 0;
  return (
    <Stack spacing={0.5}>
      <Stack direction="row" justifyContent="space-between">
        <Typography variant="body2" sx={{ fontWeight: 700 }}>
          {label}
        </Typography>
        <Typography variant="body2">
          {quantity.toFixed(2)} ({percentage}%)
        </Typography>
      </Stack>
      <LinearProgress variant="determinate" value={percentage} />
    </Stack>
  );
};

const SummaryCard = ({ title, rows, emptyText }: ChartProps) => {
  const total = rows.reduce((acc, row) => acc + row.quantity, 0);
  return (
    <Card>
      <CardHeader avatar={<AssessmentIcon color="primary" />} title={title} />
      <Divider />
      <CardContent>
        {rows.length === 0 && <Typography variant="body2">{emptyText}</Typography>}
        <Stack spacing={1.5}>
          {rows.map((row) => (
            <SummaryBar key={row.label} label={row.label} quantity={row.quantity} total={total} />
          ))}
        </Stack>
      </CardContent>
    </Card>
  );
};

export function ReportsPage() {
  const [totalsByTag, setTotalsByTag] = useState<StockSummaryRow[]>([]);
  const [totalsByDeposit, setTotalsByDeposit] = useState<StockSummaryRow[]>([]);
  const [movementTotals, setMovementTotals] = useState<MovementSummary[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      try {
        const report = await fetchStockReport();
        setTotalsByTag(report.totals_by_tag);
        setTotalsByDeposit(report.totals_by_deposit);
        setMovementTotals(report.movement_totals);
        setError(null);
      } catch (err) {
        console.error(err);
        setError("No pudimos obtener los reportes. Verifica el backend.");
      }
    }
    void load();
  }, []);

  const totalMovements = movementTotals.reduce((acc, row) => acc + Math.abs(row.quantity), 0);

  return (
    <Stack spacing={2}>
      <Typography variant="h5" sx={{ display: "flex", alignItems: "center", gap: 1 }}>
        <SummarizeIcon color="primary" />
        Reportes rápidos
      </Typography>
      {error && <Alert severity="warning">{error}</Alert>}
      <Grid container spacing={2}>
        <Grid item xs={12} md={6}>
          <SummaryCard title="Stock por tipo de SKU" rows={totalsByTag} emptyText="Sin datos de stock." />
        </Grid>
        <Grid item xs={12} md={6}>
          <SummaryCard title="Stock por depósito" rows={totalsByDeposit} emptyText="Sin datos de stock." />
        </Grid>
        <Grid item xs={12}>
          <Card>
            <CardHeader title="Movimientos últimos 7 días" />
            <Divider />
            <CardContent>
              {movementTotals.length === 0 && <Typography variant="body2">Sin movimientos registrados.</Typography>}
              <Stack spacing={1}>
                {movementTotals.map((row) => {
                  const pct = totalMovements > 0 ? Math.round((Math.abs(row.quantity) / totalMovements) * 100) : 0;
                  return (
                    <SummaryBar
                      key={row.movement_type_code}
                      label={row.movement_type_label || row.movement_type_code}
                      quantity={row.quantity}
                      total={totalMovements || 1}
                      absolute
                    />
                  );
                })}
              </Stack>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Stack>
  );
}
