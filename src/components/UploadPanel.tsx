import { useState, useRef, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Upload, X, Loader2, AlertCircle } from "lucide-react";
import { useCurrentOrg } from "@/hooks/useCurrentOrg";

const MAX_FILES = 20;
const MAX_SIZE = 10 * 1024 * 1024; // 10MB
const ACCEPTED_TYPES = ["application/pdf", "image/jpeg", "image/png"];
const WEBHOOK_URL = "https://mfin1.app.n8n.cloud/webhook/process-invoice";

interface UploadPanelProps {
  onUploadComplete: () => void;
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return bytes + " B";
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
  return (bytes / (1024 * 1024)).toFixed(2) + " MB";
}

export default function UploadPanel({ onUploadComplete }: UploadPanelProps) {
  const [stagedFiles, setStagedFiles] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const [warning, setWarning] = useState("");
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const { currentOrg } = useCurrentOrg();

  const addFiles = useCallback((files: FileList | File[]) => {
    setError("");
    setWarning("");
    const incoming = Array.from(files);
    const valid: File[] = [];

    for (const f of incoming) {
      if (!ACCEPTED_TYPES.includes(f.type)) {
        setError(`"${f.name}" is not a supported file type (PDF, JPG, PNG only).`);
        return;
      }
      if (f.size > MAX_SIZE) {
        setError(`"${f.name}" exceeds the 10MB size limit.`);
        return;
      }
      valid.push(f);
    }

    setStagedFiles((prev) => {
      const total = prev.length + valid.length;
      if (total > MAX_FILES) {
        setWarning(`You can upload a maximum of ${MAX_FILES} files at once. ${total - MAX_FILES} file(s) were not added.`);
        return [...prev, ...valid.slice(0, MAX_FILES - prev.length)];
      }
      return [...prev, ...valid];
    });
  }, []);

  const removeFile = (index: number) => {
    setStagedFiles((prev) => prev.filter((_, i) => i !== index));
    setWarning("");
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    if (e.dataTransfer.files.length) addFiles(e.dataTransfer.files);
  }, [addFiles]);

  const handleUpload = async () => {
    if (!currentOrg || stagedFiles.length === 0) {
      if (!currentOrg) setError("No organization selected.");
      return;
    }
    setUploading(true);
    setError("");

    const formData = new FormData();
    formData.append("org_id", currentOrg.id);
    stagedFiles.forEach((f) => formData.append("files", f));

    try {
      const response = await fetch(WEBHOOK_URL, { method: "POST", body: formData });
      if (!response.ok) {
        setError(`Upload failed (status ${response.status}). Please try again.`);
      } else {
        setStagedFiles([]);
        setWarning("");
      }
      onUploadComplete();
    } catch {
      setError("Network error — could not reach the processing server. Please try again.");
      onUploadComplete();
    } finally {
      setUploading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Upload Invoices</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Drop zone */}
        <div
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
          onClick={() => inputRef.current?.click()}
          className={`flex cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed p-8 transition-colors ${
            dragOver ? "border-primary bg-primary/5" : "border-border hover:border-primary/50"
          }`}
        >
          <Upload className="h-8 w-8 text-muted-foreground" />
          <p className="text-sm font-medium text-muted-foreground">
            Drag & drop files here, or click to browse
          </p>
          <p className="text-xs text-muted-foreground">
            PDF, JPG, PNG — max 10MB per file, up to {MAX_FILES} files
          </p>
          <input
            ref={inputRef}
            type="file"
            multiple
            accept=".pdf,.jpg,.jpeg,.png"
            className="hidden"
            onChange={(e) => { if (e.target.files) addFiles(e.target.files); e.target.value = ""; }}
          />
        </div>

        {error && (
          <div className="flex items-start gap-2 rounded-md bg-destructive/10 p-3 text-sm text-destructive">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            {error}
          </div>
        )}

        {warning && (
          <div className="rounded-md bg-warning/10 p-3 text-sm text-warning-foreground">
            {warning}
          </div>
        )}

        {stagedFiles.length > 0 && (
          <div className="space-y-2">
            <p className="text-sm font-medium text-foreground">
              {stagedFiles.length} file{stagedFiles.length > 1 ? "s" : ""} staged
            </p>
            <div className="max-h-60 space-y-1 overflow-y-auto">
              {stagedFiles.map((f, i) => (
                <div
                  key={`${f.name}-${i}`}
                  className="flex items-center justify-between rounded-md border bg-card px-3 py-2 text-sm"
                >
                  <div className="flex items-center gap-2 truncate">
                    {uploading && <Loader2 className="h-4 w-4 animate-spin text-primary" />}
                    <span className="truncate">{f.name}</span>
                    <span className="shrink-0 text-muted-foreground">
                      {formatFileSize(f.size)}
                    </span>
                  </div>
                  {!uploading && (
                    <button
                      onClick={() => removeFile(i)}
                      className="ml-2 rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  )}
                </div>
              ))}
            </div>
            <Button onClick={handleUpload} disabled={uploading} className="w-full">
              {uploading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Uploading...
                </>
              ) : (
                `Upload All (${stagedFiles.length} file${stagedFiles.length > 1 ? "s" : ""})`
              )}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
