import ManufacturingIcon from "@mui/icons-material/PrecisionManufacturing";
import { Box, Card, CardContent, CardHeader, Chip, Divider, LinearProgress, Stack, Typography } from "@mui/material";

const mockRuns = [
  { id: "L-240930-01", sku: "CUC-GRANEL", stage: "Masa", progress: 65, responsible: "Laura" },
  { id: "L-240930-04", sku: "CUC-PT-24", stage: "Empaque", progress: 35, responsible: "Joaquín" },
  { id: "L-240929-02", sku: "MP-HARINA", stage: "Consumo", progress: 100, responsible: "Andrea" },
];

export function ProductionPage() {
  return (
    <Stack spacing={2}>
      <Typography variant="h5" sx={{ display: "flex", alignItems: "center", gap: 1 }}>
        <ManufacturingIcon color="primary" />
        Producción en curso
      </Typography>
      {mockRuns.map((run) => (
        <Card key={run.id} variant="outlined">
          <CardHeader
            title={`${run.sku} · ${run.stage}`}
            subheader={`Lote ${run.id}`}
            action={<Chip label={`Responsable: ${run.responsible}`} color="primary" variant="outlined" />}
          />
          <Divider />
          <CardContent>
            <Stack spacing={1}>
              <Typography variant="body2">Avance</Typography>
              <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
                <LinearProgress value={run.progress} variant="determinate" sx={{ flexGrow: 1 }} />
                <Typography variant="body2" color="text.secondary">{`${run.progress}%`}</Typography>
              </Box>
            </Stack>
          </CardContent>
        </Card>
      ))}
    </Stack>
  );
}
