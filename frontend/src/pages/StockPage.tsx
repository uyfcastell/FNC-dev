import InventoryIcon from "@mui/icons-material/Inventory2";
import { Card, CardContent, CardHeader, Chip, Divider, Stack, Table, TableBody, TableCell, TableHead, TableRow, Typography } from "@mui/material";

const rows = [
  { sku: "CUC-PT-24", depot: "Depósito Principal", qty: 1240, uom: "un", status: "OK" },
  { sku: "CUC-GRANEL", depot: "Depósito MP", qty: 520, uom: "kg", status: "OK" },
  { sku: "MP-HARINA", depot: "Depósito MP", qty: 180, uom: "kg", status: "Bajo" },
];

export function StockPage() {
  return (
    <Stack spacing={2}>
      <Typography variant="h5" sx={{ display: "flex", alignItems: "center", gap: 1 }}>
        <InventoryIcon color="primary" />
        Stock y kardex
      </Typography>
      <Card>
        <CardHeader
          title="Saldos por depósito"
          subheader="Valores ilustrativos hasta conectar con el backend"
          action={<Chip label="Vista diaria" color="secondary" variant="outlined" />}
        />
        <Divider />
        <CardContent>
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
              {rows.map((row) => (
                <TableRow key={`${row.sku}-${row.depot}`}>
                  <TableCell>{row.sku}</TableCell>
                  <TableCell>{row.depot}</TableCell>
                  <TableCell align="right">{row.qty}</TableCell>
                  <TableCell>{row.uom}</TableCell>
                  <TableCell>
                    <Chip
                      size="small"
                      label={row.status === "OK" ? "En rango" : "Bajo"}
                      color={row.status === "OK" ? "success" : "warning"}
                      variant="outlined"
                    />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </Stack>
  );
}
