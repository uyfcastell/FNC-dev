import MenuIcon from "@mui/icons-material/Menu";
import { AppBar, Avatar, Box, Container, Divider, Drawer, IconButton, List, ListItemButton, ListItemText, Menu, MenuItem, Toolbar, Typography } from "@mui/material";
import { MouseEvent, PropsWithChildren, useMemo, useState } from "react";
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

function buildUserInitials(fullName?: string): string {
  if (!fullName) return "?";
  const parts = fullName
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  if (!parts.length) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0] ?? ""}${parts[1][0] ?? ""}`.toUpperCase();
}

export function MobileShell({ title, navItems, children }: Props) {
  const [open, setOpen] = useState(false);
  const [accountMenuAnchor, setAccountMenuAnchor] = useState<null | HTMLElement>(null);
  const location = useLocation();
  const { logout, user } = useAuth();
  const accountMenuOpen = Boolean(accountMenuAnchor);
  const userInitials = useMemo(() => buildUserInitials(user?.full_name), [user?.full_name]);

  const openAccountMenu = (event: MouseEvent<HTMLElement>) => {
    setAccountMenuAnchor(event.currentTarget);
  };

  const closeAccountMenu = () => {
    setAccountMenuAnchor(null);
  };

  const handleLogout = () => {
    closeAccountMenu();
    logout();
  };

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
          <IconButton
            color="inherit"
            onClick={openAccountMenu}
            aria-label="Abrir menú de cuenta"
            aria-controls={accountMenuOpen ? "mobile-account-menu" : undefined}
            aria-haspopup="true"
            aria-expanded={accountMenuOpen ? "true" : undefined}
          >
            <Avatar sx={{ width: 32, height: 32, bgcolor: "#2e7d32", fontSize: 13, fontWeight: 700 }}>{userInitials}</Avatar>
          </IconButton>
          <Menu
            id="mobile-account-menu"
            anchorEl={accountMenuAnchor}
            open={accountMenuOpen}
            onClose={closeAccountMenu}
            anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
            transformOrigin={{ vertical: "top", horizontal: "right" }}
          >
            <MenuItem disabled sx={{ opacity: "1 !important" }}>
              <Box>
                <Typography variant="body2" sx={{ fontWeight: 700 }}>
                  {user?.full_name ?? "Usuario"}
                </Typography>
              </Box>
            </MenuItem>
            <Divider />
            <MenuItem onClick={handleLogout}>Salir</MenuItem>
          </Menu>
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
