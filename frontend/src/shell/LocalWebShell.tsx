import LogoutIcon from "@mui/icons-material/Logout";
import { AppBar, Box, Button, Stack, Toolbar, Typography } from "@mui/material";
import { PropsWithChildren } from "react";

import { useAuth } from "../lib/auth";

export function LocalWebShell({ children }: PropsWithChildren) {
  const { user, logout } = useAuth();

  return (
    <Box sx={{ display: "flex", flexDirection: "column", minHeight: "100vh", bgcolor: "#f5f6fa" }}>
      <AppBar position="sticky">
        <Toolbar>
          <Typography variant="h6" noWrap component="div">
            FNC | Locales
          </Typography>
          <Box flexGrow={1} />
          <Stack direction="row" spacing={2} alignItems="center">
            {user && (
              <Typography variant="body2" color="inherit">
                {user.full_name} {user.role_name ? `(${user.role_name})` : ""}
              </Typography>
            )}
            <Button color="inherit" size="small" startIcon={<LogoutIcon />} onClick={logout}>
              Salir
            </Button>
          </Stack>
        </Toolbar>
      </AppBar>
      <Box component="main" sx={{ flexGrow: 1, p: 3 }}>
        {children}
      </Box>
    </Box>
  );
}
