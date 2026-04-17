import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useCurrentOrg } from "@/hooks/useCurrentOrg";
import UploadPanel from "@/components/UploadPanel";
import InvoiceTable from "@/components/InvoiceTable";
import AppHeader from "@/components/AppHeader";

const Index = () => {
  const { user, loading } = useAuth();
  const { currentOrg, loading: orgLoading } = useCurrentOrg();
  const navigate = useNavigate();
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    if (!loading && !user) navigate("/auth", { replace: true });
  }, [user, loading, navigate]);

  if (loading || orgLoading) {
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
        {!currentOrg ? (
          <p className="py-12 text-center text-sm text-muted-foreground">
            No organization found for your account.
          </p>
        ) : (
          <div className="grid gap-6 lg:grid-cols-[380px_1fr]">
            <div>
              <UploadPanel onUploadComplete={() => setRefreshKey((k) => k + 1)} />
            </div>
            <div>
              <InvoiceTable refreshKey={refreshKey} />
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default Index;
