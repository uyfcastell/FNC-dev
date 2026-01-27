import { Card, CardContent, CardHeader, Chip, Divider, List, ListItem, ListItemText, Stack, Typography } from "@mui/material";

const steps = [
  "Definir usuarios base y roles (Administración, Planta, Depósito, Producción, Empaque, Reparto, Locales, Auditoría)",
  "Crear SKUs PT/SEMI/MP/CON y depósitos iniciales",
  "Registrar primeras recetas/BOM y correr migraciones",
  "Probar flujo pedido → envío → remito → movimiento de stock",
];

export function WelcomeCard() {
  return (
    <Card elevation={2}>
      <CardHeader
        title="MVP en marcha"
        subheader="Backend FastAPI + SQLModel, frontend React + Material UI"
        action={<Chip label="Iteración 1" color="primary" />}
      />
      <Divider />
      <CardContent>
        <Typography variant="body1" sx={{ mb: 2 }}>
          Esta primera versión incluye la estructura mínima para los modelos principales, migraciones iniciales y un shell de
          interfaz listo para iterar pantallas de producción, stock y envíos.
        </Typography>
        <Stack spacing={1}>
          <Typography variant="subtitle1">Siguientes acciones sugeridas</Typography>
          <List dense>
            {steps.map((step) => (
              <ListItem key={step}>
                <ListItemText primary={step} />
              </ListItem>
            ))}
          </List>
        </Stack>
      </CardContent>
    </Card>
  );
}
