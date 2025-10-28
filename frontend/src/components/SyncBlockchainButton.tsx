import { useState } from "react";
import { Button } from "@/components/ui/button";
import { RefreshCw, AlertTriangle, CheckCircle } from "lucide-react";
import { toast } from "sonner";
import { apiClient } from "@/integrations/apiClient/client";

interface SyncBlockchainButtonProps {
    jobId: string;
    variant?: "default" | "outline" | "ghost";
    size?: "default" | "sm" | "lg" | "icon";
    className?: string;
}

export function SyncBlockchainButton({
    jobId,
    variant = "outline",
    size = "sm",
    className = ""
}: SyncBlockchainButtonProps) {
    const [isSyncing, setIsSyncing] = useState(false);
    const [syncStatus, setSyncStatus] = useState<"idle" | "outdated" | "synced">("idle");

    const handleSync = async () => {
        if (!jobId) {
            toast.error("Job ID is required");
            return;
        }

        setIsSyncing(true);
        setSyncStatus("idle");

        try {
            console.log("Syncing blockchain data for job:", jobId);

            const response = await apiClient.request(`/jobs/${jobId}/sync-blockchain`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${localStorage.getItem('token')}`
                }
            });

            if (response.error) {
                throw new Error(response.error);
            }

            const result = response.data;
            console.log("Sync result:", result);

            if (result.status === "outdated") {
                setSyncStatus("outdated");
                toast.warning("Database was outdated and has been updated with blockchain data");

                // Show "Outdated" status for 0.5 seconds then reload
                setTimeout(() => {
                    window.location.reload();
                }, 500);
            } else if (result.status === "synced") {
                setSyncStatus("synced");
                toast.success("Database is already in sync with blockchain");

                // Reset status after 2 seconds
                setTimeout(() => {
                    setSyncStatus("idle");
                }, 2000);
            }

        } catch (error: any) {
            console.error("Sync error:", error);
            toast.error(error.message || "Failed to sync with blockchain");
            setSyncStatus("idle");
        } finally {
            setIsSyncing(false);
        }
    };

    const getButtonContent = () => {
        if (isSyncing) {
            return (
                <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    Syncing...
                </>
            );
        }

        if (syncStatus === "outdated") {
            return (
                <>
                    <AlertTriangle className="w-4 h-4 text-orange-500" />
                    Outdated
                </>
            );
        }

        if (syncStatus === "synced") {
            return (
                <>
                    <CheckCircle className="w-4 h-4 text-green-500" />
                    Synced
                </>
            );
        }

        return (
            <>
                <RefreshCw className="w-4 h-4" />
                Sync Blockchain
            </>
        );
    };

    const getButtonVariant = () => {
        if (syncStatus === "outdated") return "destructive";
        if (syncStatus === "synced") return "default";
        return variant;
    };

    return (
        <Button
            onClick={handleSync}
            disabled={isSyncing}
            variant={getButtonVariant()}
            size={size}
            className={`gap-2 ${className}`}
        >
            {getButtonContent()}
        </Button>
    );
}
