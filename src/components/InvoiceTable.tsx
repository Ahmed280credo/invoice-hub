import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useCurrentOrg } from "@/hooks/useCurrentOrg";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Eye, Trash2, ChevronLeft, ChevronRight, AlertTriangle } from "lucide-react";
import InvoiceDetailModal from "./InvoiceDetailModal";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import type { Tables } from "@/integrations/supabase/types";

const PAGE_SIZE = 10;

const statusStyles: Record<string, string> = {
  processed: "bg-green-100 text-green-800 border-green-200",
  flagged: "bg-yellow-100 text-yellow-800 border-yellow-200",
  failed: "bg-red-100 text-red-800 border-red-200",
};

const STATUSES = ["All", "processed", "flagged", "failed"];

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return bytes + " B";
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
  return (bytes / (1024 * 1024)).toFixed(2) + " MB";
}

interface InvoiceTableProps {
  refreshKey: number;
}

interface DeleteWebhookResult {
  ok?: boolean;
  externalStatus?: number;
}

export default function InvoiceTable({ refreshKey }: InvoiceTableProps) {
  const { currentOrg } = useCurrentOrg();
  const [invoices, setInvoices] = useState<Tables<"invoices">[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [statusFilter, setStatusFilter] = useState("All");
  const [loading, setLoading] = useState(true);
  const [selectedInvoice, setSelectedInvoice] = useState<Tables<"invoices"> | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [deleteInvoice, setDeleteInvoice] = useState<Tables<"invoices"> | null>(null);

  const fetchInvoices = useCallback(async () => {
    if (!currentOrg) return;
    setLoading(true);

    let query = supabase
      .from("invoices")
      .select("*", { count: "exact" })
      .eq("org_id", currentOrg.id)
      .order("uploaded_at", { ascending: false })
      .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);

    if (statusFilter !== "All") {
      query = query.eq("status", statusFilter);
    }

    const { data, count, error } = await query;
    if (!error && data) {
      setInvoices(data);
      setTotal(count ?? 0);
    }
    setLoading(false);
  }, [currentOrg, page, statusFilter]);

  useEffect(() => {
    fetchInvoices();
  }, [fetchInvoices, refreshKey]);

  useEffect(() => {
    setPage(0);
  }, [statusFilter]);

  const handleDelete = async () => {
    if (!deleteInvoice || !currentOrg) return;
    const { error } = await supabase.from("invoices").delete().eq("id", deleteInvoice.id);
    if (!error) {
      toast.success("Invoice deleted successfully");
      setInvoices((prev) => prev.filter((inv) => inv.id !== deleteInvoice.id));
      setTotal((prev) => prev - 1);

      try {
        const rawInvoiceNumber = (deleteInvoice as any).invoice_number ?? deleteInvoice.file_name ?? "";
        const match = rawInvoiceNumber.match(/(\d+)(?:\.pdf)?$/i);
        const invoiceNumberToSend = match ? match[1] : rawInvoiceNumber;

        const { data: webhookResult, error: webhookError } = await supabase.functions.invoke<DeleteWebhookResult>(
          "delete-invoice-webhook",
          {
            body: { invoice_number: invoiceNumberToSend, org_id: currentOrg.id },
          },
        );

        if (webhookError) {
          toast.warning("Invoice deleted, but the external service could not be reached");
        } else if (webhookResult?.ok === false) {
          toast.warning(
            webhookResult.externalStatus === 404
              ? "Invoice deleted, but the external workflow is inactive"
              : "Invoice deleted, but the external service did not accept the request",
          );
        }
      } catch {
        toast.warning("Invoice deleted, but the external service could not be reached");
      }
    } else {
      toast.error("Failed to delete invoice");
    }
    setDeleteInvoice(null);
  };

  const totalPages = Math.ceil(total / PAGE_SIZE);

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <CardTitle className="text-lg">Your Invoices</CardTitle>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="rounded-md border border-input bg-background px-3 py-1.5 text-sm capitalize ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring"
          >
            {STATUSES.map((s) => (
              <option key={s} value={s} className="capitalize">{s}</option>
            ))}
          </select>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-12">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
            </div>
          ) : invoices.length === 0 ? (
            <p className="py-12 text-center text-sm text-muted-foreground">
              No invoices found. Upload some files to get started.
            </p>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>File Name</TableHead>
                    <TableHead>Size</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Uploaded</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {invoices.map((inv) => (
                    <TableRow key={inv.id}>
                      <TableCell className="max-w-[220px] font-medium">
                        <div className="flex items-center gap-2">
                          <span className="truncate">{inv.file_name}</span>
                          {inv.status === "flagged" && (
                            <Badge
                              variant="outline"
                              className="shrink-0 border-yellow-200 bg-yellow-100 text-yellow-800"
                            >
                              <AlertTriangle className="mr-1 h-3 w-3" />
                              Duplicate
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>{formatFileSize(inv.file_size)}</TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={`capitalize ${statusStyles[inv.status] ?? ""}`}
                        >
                          {inv.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {new Date(inv.uploaded_at).toLocaleDateString()}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => { setSelectedInvoice(inv); setModalOpen(true); }}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setDeleteInvoice(inv)}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              {totalPages > 1 && (
                <div className="mt-4 flex items-center justify-between">
                  <p className="text-sm text-muted-foreground">
                    Page {page + 1} of {totalPages} ({total} total)
                  </p>
                  <div className="flex gap-1">
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={page === 0}
                      onClick={() => setPage((p) => p - 1)}
                    >
                      <ChevronLeft className="h-4 w-4" />
                      Previous
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={page >= totalPages - 1}
                      onClick={() => setPage((p) => p + 1)}
                    >
                      Next
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      <InvoiceDetailModal
        invoice={selectedInvoice}
        open={modalOpen}
        onOpenChange={setModalOpen}
      />

      <AlertDialog open={!!deleteInvoice} onOpenChange={(open) => { if (!open) setDeleteInvoice(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Invoice</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this invoice? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
