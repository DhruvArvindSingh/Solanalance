import { Loader2 } from "lucide-react";

export const AuthLoading = () => {
    return (
        <div className="min-h-screen flex items-center justify-center bg-background">
            <div className="text-center">
                <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-primary" />
                <p className="text-muted-foreground">Checking authentication...</p>
            </div>
        </div>
    );
};
