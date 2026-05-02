import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CheckCircle, DollarSign } from "lucide-react";
import type { Tables } from "@/integrations/supabase/types";

interface Props {
  invoice: Tables<"invoices"> | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onStatusUpdate?: (inv: Tables<"invoices">, newStatus: string) => void;
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return bytes + " B";
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
  return (bytes / (1024 * 1024)).toFixed(2) + " MB";
}

const statusStyles: Record<string, string> = {
  pending: "bg-gray-100 text-gray-800 border-gray-200",
  processed: "bg-green-100 text-green-800 border-green-200",
  approved: "bg-blue-100 text-blue-800 border-blue-200",
  paid: "bg-purple-100 text-purple-800 border-purple-200",
  flagged: "bg-yellow-100 text-yellow-800 border-yellow-200",
  failed: "bg-red-100 text-red-800 border-red-200",
};

export default function InvoiceDetailModal({ invoice, open, onOpenChange, onStatusUpdate }: Props) {
  if (!invoice) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Invoice Details</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <p className="text-sm text-muted-foreground">File Name</p>
            <p className="font-medium">{invoice.file_name}</p>
          </div>
          {(invoice as any).invoice_number && (
            <div>
              <p className="text-sm text-muted-foreground">Invoice #</p>
              <p className="font-medium">{(invoice as any).invoice_number}</p>
            </div>
          )}
          {invoice.vendor_name && (
            <div>
              <p className="text-sm text-muted-foreground">Vendor</p>
              <p className="font-medium">{invoice.vendor_name}</p>
            </div>
          )}
          {invoice.total_amount && (
            <div>
              <p className="text-sm text-muted-foreground">Total Amount</p>
              <p className="font-medium">{invoice.currency ?? "PKR"} {Number(invoice.total_amount).toLocaleString()}</p>
            </div>
          )}
          {invoice.invoice_date && (
            <div>
              <p className="text-sm text-muted-foreground">Invoice Date</p>
              <p className="font-medium">{invoice.invoice_date}</p>
            </div>
          )}
          {invoice.due_date && (
            <div>
              <p className="text-sm text-muted-foreground">Due Date</p>
              <p className="font-medium">{invoice.due_date}</p>
            </div>
          )}
          <div>
            <p className="text-sm text-muted-foreground">File Size</p>
            <p className="font-medium">{formatFileSize(invoice.file_size)}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Status</p>
            <Badge variant="outline" className={`capitalize ${statusStyles[invoice.status] ?? ""}`}>
              {invoice.status}
            </Badge>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Uploaded</p>
            <p className="font-medium">{new Date(invoice.uploaded_at).toLocaleString()}</p>
          </div>

          {onStatusUpdate && (
            <div className="flex gap-2 pt-2 border-t">
              {invoice.status === "processed" && (
                <Button
                  variant="outline"
                  className="flex-1 border-blue-200 text-blue-700 hover:bg-blue-50"
                  onClick={() => { onStatusUpdate(invoice, "approved"); onOpenChange(false); }}
                >
                  <CheckCircle className="mr-2 h-4 w-4" /> Approve
                </Button>
              )}
              {invoice.status === "approved" && (
                <Button
                  variant="outline"
                  className="flex-1 border-purple-200 text-purple-700 hover:bg-purple-50"
                  onClick={() => { onStatusUpdate(invoice, "paid"); onOpenChange(false); }}
                >
                  <DollarSign className="mr-2 h-4 w-4" /> Mark as Paid
                </Button>
              )}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}