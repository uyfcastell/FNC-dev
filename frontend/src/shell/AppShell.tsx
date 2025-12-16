import { AppBar, Box, Container, IconButton, Toolbar, Typography } from "@mui/material";
import MenuIcon from "@mui/icons-material/Menu";
import { WelcomeCard } from "./WelcomeCard";

export function AppShell() {
  return (
    <Box sx={{ minHeight: "100vh", bgcolor: "#f5f6fa" }}>
      <AppBar position="static" color="primary">
        <Toolbar>
          <IconButton edge="start" color="inherit" aria-label="menu" sx={{ mr: 2 }}>
            <MenuIcon />
          </IconButton>
          <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
            FNC | Gestión de producción y stock
          </Typography>
        </Toolbar>
      </AppBar>
      <Container sx={{ py: 4 }}>
        <WelcomeCard />
      </Container>
    </Box>
  );
}

