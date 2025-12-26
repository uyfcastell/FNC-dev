import MenuIcon from "@mui/icons-material/Menu";
import { AppBar, Box, Button, Container, Divider, Drawer, IconButton, List, ListItemButton, ListItemText, Toolbar, Typography } from "@mui/material";
import { PropsWithChildren, useState } from "react";
import { Link as RouterLink, useLocation } from "react-router-dom";

import { useAuth } from "../lib/auth";

type MobileNavItem = {
  label: string;
  to: string;
};

type Props = PropsWithChildren<{
  title: string;
  navItems: MobileNavItem[];
}>;

const drawerWidth = 260;

export function MobileShell({ title, navItems, children }: Props) {
  const [open, setOpen] = useState(false);
  const location = useLocation();
  const { logout } = useAuth();

  return (
    <Box sx={{ display: "flex", flexDirection: "column", minHeight: "100vh", bgcolor: "#f5f6fa" }}>
      <AppBar position="fixed" sx={{ bgcolor: "#1b5e20" }}>
        <Toolbar>
          <IconButton edge="start" color="inherit" onClick={() => setOpen(true)} sx={{ mr: 1 }}>
            <MenuIcon />
          </IconButton>
          <Typography variant="h6" sx={{ fontWeight: 700 }}>
            {title}
          </Typography>
          <Box flexGrow={1} />
          <Button color="inherit" size="small" onClick={logout}>
            Salir
          </Button>
        </Toolbar>
      </AppBar>

      <Drawer
        anchor="left"
        open={open}
        onClose={() => setOpen(false)}
        ModalProps={{ keepMounted: true }}
        sx={{ "& .MuiDrawer-paper": { width: drawerWidth } }}
      >
        <Toolbar />
        <Divider />
        <List>
          {navItems.map((item) => (
            <ListItemButton
              key={item.to}
              component={RouterLink}
              to={item.to}
              selected={location.pathname === item.to}
              onClick={() => setOpen(false)}
              sx={{ py: 2 }}
            >
              <ListItemText primaryTypographyProps={{ sx: { fontSize: 16, fontWeight: 600 } }} primary={item.label} />
            </ListItemButton>
          ))}
        </List>
      </Drawer>

      <Toolbar />
      <Container maxWidth="md" sx={{ flexGrow: 1, py: 2 }}>{children}</Container>
    </Box>
  );
}
