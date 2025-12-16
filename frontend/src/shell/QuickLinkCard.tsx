import { ArrowForward } from "@mui/icons-material";
import { Card, CardActionArea, CardContent, CardHeader, Typography } from "@mui/material";
import { Link as RouterLink } from "react-router-dom";

interface QuickLinkCardProps {
  title: string;
  description: string;
  to: string;
}

export function QuickLinkCard({ title, description, to }: QuickLinkCardProps) {
  return (
    <Card variant="outlined">
      <CardActionArea component={RouterLink} to={to} sx={{ height: "100%" }}>
        <CardHeader title={title} action={<ArrowForward color="primary" />} />
        <CardContent>
          <Typography variant="body2" color="text.secondary">
            {description}
          </Typography>
        </CardContent>
      </CardActionArea>
    </Card>
  );
}
