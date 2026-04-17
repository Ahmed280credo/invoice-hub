import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useCurrentOrg } from "@/hooks/useCurrentOrg";
import { supabase } from "@/integrations/supabase/client";
import AppHeader from "@/components/AppHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";

interface AuditRow {
  id: string;
  org_id: string;
  invoice_number: string | null;
  vendor_name: string | null;
  event: string;
  status: string | null;
  total_amount: number | null;
  currency: string | null;
  processed_at: string | null;
  source: string | null;
  created_at: string;
}

const eventStyles: Record<string, string> = {
  PROCESSED: "bg-green-100 text-green-800 border-green-200",
  DUPLICATE_DETECTED: "bg-yellow-100 text-yellow-800 border-yellow-200",
  EXTRACTION_FAILED: "bg-red-100 text-red-800 border-red-200",
};

const statusStyles: Record<string, string> = {
  processed: "bg-green-100 text-green-800 border-green-200",
  flagged: "bg-yellow-100 text-yellow-800 border-yellow-200",
  failed: "bg-red-100 text-red-800 border-red-200",
};

export default function AuditLog() {
  const { user, loading: authLoading } = useAuth();
  const { currentOrg, loading: orgLoading } = useCurrentOrg();
  const navigate = useNavigate();
  const [rows, setRows] = useState<AuditRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!authLoading && !user) navigate("/auth", { replace: true });
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (!currentOrg) return;
    (async () => {
      setLoading(true);
      const { data, error } = await (supabase as any)
        .from("invoice_audit_log")
        .select("*")
        .eq("org_id", currentOrg.id)
        .order("processed_at", { ascending: false, nullsFirst: false })
        .limit(200);

      if (!error && data) setRows(data as AuditRow[]);
      setLoading(false);
    })();
  }, [currentOrg]);

  if (authLoading || orgLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="min-h-screen bg-background">
      <AppHeader />
      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Audit Log</CardTitle>
          </CardHeader>
          <CardContent>
            {!currentOrg ? (
              <p className="py-12 text-center text-sm text-muted-foreground">
                No organization selected.
              </p>
            ) : loading ? (
              <div className="flex justify-center py-12">
                <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
              </div>
            ) : rows.length === 0 ? (
              <p className="py-12 text-center text-sm text-muted-foreground">
                No audit log entries yet.
              </p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Processed At</TableHead>
                    <TableHead>Invoice #</TableHead>
                    <TableHead>Vendor</TableHead>
                    <TableHead>Event</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map((r) => (
                    <TableRow key={r.id}>
                      <TableCell className="whitespace-nowrap text-sm">
                        {r.processed_at
                          ? new Date(r.processed_at).toLocaleString()
                          : new Date(r.created_at).toLocaleString()}
                      </TableCell>
                      <TableCell className="font-medium">{r.invoice_number ?? "—"}</TableCell>
                      <TableCell>{r.vendor_name ?? "—"}</TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={eventStyles[r.event] ?? "bg-muted text-muted-foreground"}
                        >
                          {r.event}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {r.status ? (
                          <Badge
                            variant="outline"
                            className={statusStyles[r.status] ?? ""}
                          >
                            {r.status}
                          </Badge>
                        ) : "—"}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
