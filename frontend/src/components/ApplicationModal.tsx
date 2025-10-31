import { useState, useEffect, useCallback } from "react";
import { apiClient } from "@/integrations/apiClient/client";
import { useAuth } from "@/hooks/useAuth";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { useWalletModal } from "@solana/wallet-adapter-react-ui";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { AlertCircle, FileText, Upload, Loader2, Wallet, Link, Copy, CheckCircle } from "lucide-react";
import { PublicKey } from "@solana/web3.js";

interface ApplicationModalProps {
    isOpen: boolean;
    onClose: () => void;
    jobId: string;
    jobTitle: string;
    onSuccess: () => void;
}

interface UserWallet {
    id: string;
    walletAddress: string;
    name?: string;
}

export const ApplicationModal = ({
    isOpen,
    onClose,
    jobId,
    jobTitle,
    onSuccess,
}: ApplicationModalProps) => {
    const { user } = useAuth();
    const { publicKey, connected } = useWallet();
    const { setVisible } = useWalletModal();

    const [coverLetterText, setCoverLetterText] = useState("");
    const [estimatedDays, setEstimatedDays] = useState("");
    const [portfolioLinks, setPortfolioLinks] = useState("");
    const [resumeFile, setResumeFile] = useState<File | null>(null);
    const [coverLetterFile, setCoverLetterFile] = useState<File | null>(null);
    const [userWallets, setUserWallets] = useState<UserWallet[]>([]);
    const [primaryWalletAddress, setPrimaryWalletAddress] = useState("");
    const [manualWalletAddress, setManualWalletAddress] = useState("");
    const [selectedWalletAddress, setSelectedWalletAddress] = useState("");
    const [walletSelectionMethod, setWalletSelectionMethod] = useState<"profile" | "connect" | "manual">("profile");
    const [loading, setLoading] = useState(false);
    const [loadingWallets, setLoadingWallets] = useState(false);

    const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB

    const fetchUserWallets = useCallback(async () => {
        setLoadingWallets(true);
        try {
            const { data, error } = await apiClient.profile.getById(user!.id);
            if (error) throw new Error(error);

            const wallets = data?.userWallets || [];
            setUserWallets(wallets);

            // Set primary wallet (first one from signup)
            if (wallets.length > 0) {
                setPrimaryWalletAddress(wallets[0].walletAddress);
                // Pre-fill with primary wallet if no selection made yet
                if (!selectedWalletAddress) {
                    setSelectedWalletAddress(wallets[0].walletAddress);
                    setWalletSelectionMethod("profile");
                }
            }

            // If connected wallet is available and not already selected, suggest it
            if (connected && publicKey && !selectedWalletAddress) {
                const connectedWallet = publicKey.toBase58();
                setSelectedWalletAddress(connectedWallet);
                setWalletSelectionMethod("connect");
            }
        } catch (error) {
            console.error("Error fetching wallets:", error);
            toast.error("Failed to load wallet addresses");
        } finally {
            setLoadingWallets(false);
        }
    }, [user, selectedWalletAddress, connected, publicKey]);

    // Fetch user wallets when modal opens
    useEffect(() => {
        if (isOpen && user?.id) {
            fetchUserWallets();
        }
    }, [isOpen, user?.id, fetchUserWallets]);

    // Handle wallet connection changes
    useEffect(() => {
        if (walletSelectionMethod === "connect" && connected && publicKey) {
            setSelectedWalletAddress(publicKey.toBase58());
        }
    }, [connected, publicKey, walletSelectionMethod]);

    const handleConnectWallet = () => {
        setVisible(true);
        setWalletSelectionMethod("connect");
    };

    const handleManualWalletSubmit = () => {
        if (manualWalletAddress.trim()) {
            // Basic Solana address validation
            try {
                // This will throw if invalid
                new PublicKey(manualWalletAddress.trim());
                setSelectedWalletAddress(manualWalletAddress.trim());
                setWalletSelectionMethod("manual");
                toast.success("Wallet address set successfully");
            } catch {
                toast.error("Invalid Solana wallet address");
            }
        }
    };

    const handleCopyWallet = (address: string) => {
        navigator.clipboard.writeText(address);
        toast.success("Wallet address copied to clipboard");
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, fileType: 'resume' | 'coverLetter') => {
        const file = e.target.files?.[0];
        if (!file) return;

        // Validate file size
        if (file.size > MAX_FILE_SIZE) {
            toast.error(`File size exceeds 10 MB. Please choose a smaller file.`);
            e.target.value = '';
            return;
        }

        // Validate file type
        if (file.type !== 'application/pdf') {
            toast.error('Only PDF files are allowed');
            e.target.value = '';
            return;
        }

        if (fileType === 'resume') {
            setResumeFile(file);
        } else {
            setCoverLetterFile(file);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!estimatedDays.trim()) {
            toast.error("Please enter estimated completion time");
            return;
        }

        if (isNaN(parseInt(estimatedDays))) {
            toast.error("Estimated completion time must be a number");
            return;
        }

        if (!selectedWalletAddress.trim()) {
            toast.error("Please select or enter a wallet address for receiving payments");
            return;
        }

        setLoading(true);

        try {
            const formData = new FormData();
            formData.append('jobId', jobId);
            formData.append('coverLetterText', coverLetterText);
            formData.append('estimatedCompletionDays', estimatedDays);
            formData.append('walletAddress', selectedWalletAddress);

            if (portfolioLinks.trim()) {
                const links = portfolioLinks
                    .split('\n')
                    .map(link => link.trim())
                    .filter(link => link);
                formData.append('portfolioUrls', JSON.stringify(links));
            }

            if (resumeFile) {
                formData.append('resume', resumeFile);
            }

            if (coverLetterFile) {
                formData.append('coverLetter', coverLetterFile);
            }

            // Debug: Check token
            const token = localStorage.getItem('token');
            console.log('Token available:', !!token);
            console.log('Auth header will be sent:', token ? `Bearer ${token.substring(0, 20)}...` : 'No token');

            const { data, error } = await apiClient.request('/applications', {
                method: 'POST',
                body: formData,
            });

            if (error) {
                throw new Error(error);
            }

            toast.success("Application submitted successfully!");
            onSuccess();
            onClose();

            // Reset form
            setCoverLetterText("");
            setEstimatedDays("");
            setPortfolioLinks("");
            setResumeFile(null);
            setCoverLetterFile(null);
            setSelectedWalletAddress("");
            setManualWalletAddress("");
            setWalletSelectionMethod("profile");
        } catch (error: unknown) {
            const errorMessage = error instanceof Error ? error.message : "Failed to submit application";
            toast.error(errorMessage);
        } finally {
            setLoading(false);
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto bg-card border-border">
                <DialogHeader>
                    <DialogTitle>Apply for Job</DialogTitle>
                    <DialogDescription>{jobTitle}</DialogDescription>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="space-y-6">
                    {/* Cover Letter Text */}
                    <div className="space-y-2">
                        <Label htmlFor="coverLetter">Cover Letter (Optional)</Label>
                        <Textarea
                            id="coverLetter"
                            placeholder="Tell the recruiter why you're a great fit for this project..."
                            value={coverLetterText}
                            onChange={(e) => setCoverLetterText(e.target.value)}
                            className="min-h-[120px]"
                        />
                        <p className="text-xs text-muted-foreground">
                            {coverLetterText.length}/1000 characters
                        </p>
                    </div>

                    {/* Resume File Upload */}
                    <div className="space-y-2">
                        <Label htmlFor="resume" className="flex items-center gap-2">
                            <FileText className="w-4 h-4" />
                            Resume (PDF) - Optional
                        </Label>
                        <div className="flex items-center gap-2">
                            <Input
                                id="resume"
                                type="file"
                                accept=".pdf"
                                onChange={(e) => handleFileChange(e, 'resume')}
                                className="cursor-pointer"
                            />
                            <Upload className="w-4 h-4 text-muted-foreground" />
                        </div>
                        {resumeFile && (
                            <div className="flex items-center justify-between p-2 bg-green-500/10 border border-green-500/30 rounded">
                                <span className="text-sm text-green-600">
                                    ✓ {resumeFile.name}
                                </span>
                                <span className="text-xs text-muted-foreground">
                                    {(resumeFile.size / 1024 / 1024).toFixed(2)} MB
                                </span>
                            </div>
                        )}
                        <p className="text-xs text-muted-foreground">
                            Max file size: 10 MB
                        </p>
                    </div>

                    {/* Cover Letter File Upload */}
                    <div className="space-y-2">
                        <Label htmlFor="coverLetterFile" className="flex items-center gap-2">
                            <FileText className="w-4 h-4" />
                            Cover Letter (PDF) - Optional
                        </Label>
                        <div className="flex items-center gap-2">
                            <Input
                                id="coverLetterFile"
                                type="file"
                                accept=".pdf"
                                onChange={(e) => handleFileChange(e, 'coverLetter')}
                                className="cursor-pointer"
                            />
                            <Upload className="w-4 h-4 text-muted-foreground" />
                        </div>
                        {coverLetterFile && (
                            <div className="flex items-center justify-between p-2 bg-green-500/10 border border-green-500/30 rounded">
                                <span className="text-sm text-green-600">
                                    ✓ {coverLetterFile.name}
                                </span>
                                <span className="text-xs text-muted-foreground">
                                    {(coverLetterFile.size / 1024 / 1024).toFixed(2)} MB
                                </span>
                            </div>
                        )}
                        <p className="text-xs text-muted-foreground">
                            Max file size: 10 MB
                        </p>
                    </div>

                    {/* Estimated Completion Time */}
                    <div className="space-y-2">
                        <Label htmlFor="estimatedDays">
                            Estimated Completion Time (Days) *
                        </Label>
                        <Input
                            id="estimatedDays"
                            type="number"
                            placeholder="e.g., 30"
                            value={estimatedDays}
                            onChange={(e) => setEstimatedDays(e.target.value)}
                            min="1"
                        />
                        <p className="text-xs text-muted-foreground">
                            How many days do you estimate it will take to complete this project?
                        </p>
                    </div>

                    {/* Wallet Selection */}
                    <div className="space-y-3">
                        <Label className="flex items-center gap-2">
                            <Wallet className="w-4 h-4" />
                            Payment Wallet Address *
                        </Label>

                        {loadingWallets ? (
                            <div className="flex items-center justify-center py-4">
                                <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
                                <span className="ml-2 text-sm text-muted-foreground">Loading wallets...</span>
                            </div>
                        ) : (
                            <Tabs value={walletSelectionMethod} onValueChange={(value) => setWalletSelectionMethod(value as "profile" | "connect")} className="w-full">
                                <TabsList className="grid w-full grid-cols-2">
                                    <TabsTrigger value="profile" className="text-xs">Profile Wallets</TabsTrigger>
                                    <TabsTrigger value="connect" className="text-xs">Connect Wallet</TabsTrigger>
                                </TabsList>

                                <TabsContent value="profile" className="space-y-3">
                                    {userWallets.length > 0 ? (
                                        <RadioGroup
                                            value={selectedWalletAddress}
                                            onValueChange={(value) => {
                                                setSelectedWalletAddress(value);
                                                setWalletSelectionMethod("profile");
                                            }}
                                            className="space-y-2"
                                        >
                                            {userWallets.map((wallet) => (
                                                <div key={wallet.id} className="flex items-center space-x-2 p-3 border rounded-lg hover:bg-muted/50">
                                                    <RadioGroupItem value={wallet.walletAddress} id={wallet.id} />
                                                    <Label
                                                        htmlFor={wallet.id}
                                                        className="flex-1 cursor-pointer font-mono text-sm"
                                                    >
                                                        {wallet.walletAddress}
                                                        {wallet.name && (
                                                            <span className="block text-xs text-muted-foreground font-sans">
                                                                {wallet.name}
                                                            </span>
                                                        )}
                                                        {wallet.walletAddress === primaryWalletAddress && (
                                                            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-green-100 text-green-800 ml-2">
                                                                Primary
                                                            </span>
                                                        )}
                                                    </Label>
                                                    <Button
                                                        type="button"
                                                        variant="ghost"
                                                        size="sm"
                                                        onClick={() => handleCopyWallet(wallet.walletAddress)}
                                                        className="h-8 w-8 p-0"
                                                    >
                                                        <Copy className="h-4 w-4" />
                                                    </Button>
                                                </div>
                                            ))}
                                        </RadioGroup>
                                    ) : (
                                        <Alert className="border-amber-500/30 bg-amber-500/10">
                                            <AlertCircle className="h-4 w-4 text-amber-600" />
                                            <AlertDescription>
                                                No wallet addresses found in your profile. Use "Connect Wallet" instead.
                                            </AlertDescription>
                                        </Alert>
                                    )}
                                </TabsContent>

                                <TabsContent value="connect" className="space-y-3">
                                    <div className="p-4 border rounded-lg bg-muted/30">
                                        {connected && publicKey ? (
                                            <div className="space-y-3">
                                                <div className="flex items-center justify-between">
                                                    <div className="flex items-center space-x-2">
                                                        <CheckCircle className="w-5 h-5 text-green-600" />
                                                        <span className="font-medium">Wallet Connected</span>
                                                    </div>
                                                    <Button
                                                        type="button"
                                                        variant="ghost"
                                                        size="sm"
                                                        onClick={() => handleCopyWallet(publicKey.toBase58())}
                                                    >
                                                        <Copy className="h-4 w-4 mr-1" />
                                                        Copy
                                                    </Button>
                                                </div>
                                                <div className="font-mono text-sm bg-background p-2 rounded border">
                                                    {publicKey.toBase58()}
                                                </div>
                                                <Button
                                                    type="button"
                                                    onClick={() => {
                                                        setSelectedWalletAddress(publicKey.toBase58());
                                                        setWalletSelectionMethod("connect");
                                                    }}
                                                    className="w-full bg-primary"
                                                    disabled={selectedWalletAddress === publicKey.toBase58()}
                                                >
                                                    {selectedWalletAddress === publicKey.toBase58() ? "Selected ✓" : "Use This Wallet"}
                                                </Button>
                                            </div>
                                        ) : (
                                            <div className="text-center space-y-3">
                                                <Wallet className="w-12 h-12 text-muted-foreground mx-auto" />
                                                <div>
                                                    <p className="font-medium">Connect Your Wallet</p>
                                                    <p className="text-sm text-muted-foreground">Use your browser wallet to connect</p>
                                                </div>
                                                <Button
                                                    type="button"
                                                    onClick={handleConnectWallet}
                                                    className="bg-primary"
                                                >
                                                    <Link className="w-4 h-4 mr-2" />
                                                    Connect Wallet
                                                </Button>
                                            </div>
                                        )}
                                    </div>
                                </TabsContent>

                                {/* Manual Entry tab removed - only Profile Wallets and Connect Wallet allowed */}
                                <TabsContent value="manual" className="space-y-3" style={{display: 'none'}}>
                                    <div className="space-y-3">
                                        <div className="relative">
                                            <Input
                                                placeholder="Enter Solana wallet address (e.g., 11111111111111111111111111111112)"
                                                value={manualWalletAddress}
                                                onChange={(e) => setManualWalletAddress(e.target.value)}
                                                className="font-mono text-sm pr-10"
                                            />
                                            {manualWalletAddress && (
                                                <Button
                                                    type="button"
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={() => setManualWalletAddress("")}
                                                    className="absolute right-8 top-1/2 -translate-y-1/2 h-6 w-6 p-0"
                                                >
                                                    ×
                                                </Button>
                                            )}
                                        </div>
                                        <div className="flex gap-2">
                                            <Button
                                                type="button"
                                                onClick={handleManualWalletSubmit}
                                                disabled={!manualWalletAddress.trim()}
                                                className="flex-1"
                                            >
                                                Set Wallet Address
                                            </Button>
                                            {manualWalletAddress && (
                                                <Button
                                                    type="button"
                                                    variant="outline"
                                                    onClick={() => handleCopyWallet(manualWalletAddress)}
                                                    className="px-3"
                                                >
                                                    <Copy className="h-4 w-4" />
                                                </Button>
                                            )}
                                        </div>
                                    </div>
                                </TabsContent>
                            </Tabs>
                        )}

                        {selectedWalletAddress && (
                            <div className="p-3 bg-green-500/10 border border-green-500/30 rounded-lg">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center space-x-2">
                                        <CheckCircle className="w-4 h-4 text-green-600" />
                                        <span className="text-sm font-medium">Selected Wallet:</span>
                                    </div>
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => handleCopyWallet(selectedWalletAddress)}
                                    >
                                        <Copy className="h-4 w-4" />
                                    </Button>
                                </div>
                                <div className="font-mono text-sm mt-1 break-all">
                                    {selectedWalletAddress}
                                </div>
                            </div>
                        )}

                        <p className="text-xs text-muted-foreground">
                            Choose how you want to receive payments for this job. You can change this selection.
                        </p>
                    </div>

                    {/* Important Warning */}
                    <Alert className="border-red-500/30 bg-red-500/10">
                        <AlertCircle className="h-4 w-4 text-red-600" />
                        <AlertDescription className="text-sm font-medium">
                            <strong>⚠️ Important:</strong> Once you are selected for this job, all payments associated with it can only be claimed by this wallet address. This address cannot be changed after selection.
                        </AlertDescription>
                    </Alert>

                    {/* Portfolio Links */}
                    <div className="space-y-2">
                        <Label htmlFor="portfolio">
                            Portfolio Links (Optional)
                        </Label>
                        <Textarea
                            id="portfolio"
                            placeholder="https://github.com/yourprofile https://yourwebsite.com (one URL per line)"
                            value={portfolioLinks}
                            onChange={(e) => setPortfolioLinks(e.target.value)}
                            className="min-h-[80px] font-mono text-sm"
                        />
                        <p className="text-xs text-muted-foreground">
                            Add links to your portfolio, GitHub, or relevant work (one per line)
                        </p>
                    </div>

                    {/* Info Alert */}
                    <Alert className="border-blue-500/30 bg-blue-500/10">
                        <AlertCircle className="h-4 w-4 text-blue-600" />
                        <AlertDescription className="text-sm">
                            The recruiter will review your application along with your profile and
                            ratings. Make sure your profile is complete to increase your chances of being selected.
                        </AlertDescription>
                    </Alert>

                    {/* Actions */}
                    <div className="flex gap-3 justify-end">
                        <Button variant="outline" onClick={onClose} disabled={loading}>
                            Cancel
                        </Button>
                        <Button
                            type="submit"
                            className="bg-primary"
                            disabled={loading || !estimatedDays.trim() || !selectedWalletAddress.trim()}
                        >
                            {loading ? (
                                <>
                                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                    Submitting...
                                </>
                            ) : (
                                <>
                                    <Upload className="w-4 h-4 mr-2" />
                                    Submit Application
                                </>
                            )}
                        </Button>
                    </div>
                </form>
            </DialogContent>
        </Dialog>
    );
};

