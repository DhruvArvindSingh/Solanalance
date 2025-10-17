import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { apiClient } from "@/integrations/apiClient/client";
import { Navbar } from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { ArrowLeft, ExternalLink, Download, Search, Coins } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

interface Transaction {
    id: string;
    amount: number;
    type: string;
    wallet_signature: string;
    wallet_from: string;
    wallet_to: string | null;
    status: string;
    created_at: string;
    project: {
        job_title: string;
    } | null;
}

export default function TransactionHistory() {
    const { user } = useAuth();
    const navigate = useNavigate();

    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [filteredTransactions, setFilteredTransactions] = useState<Transaction[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState("");
    const [filterType, setFilterType] = useState("all");

    useEffect(() => {
        if (!user) {
            navigate("/auth");
            return;
        }

        fetchTransactions();
    }, [user]);

    useEffect(() => {
        applyFilters();
    }, [transactions, searchQuery, filterType]);

    const fetchTransactions = async () => {
        if (!user) return;

        try {
            setLoading(true);

            const { data, error } = await apiClient.transactions.getMyTransactions();

            if (error) throw new Error(error);

            setTransactions(data || []);
        } catch (error: any) {
            console.error("Error fetching transactions:", error);
        } finally {
            setLoading(false);
        }
    };

    const applyFilters = () => {
        let filtered = [...transactions];

        // Type filter
        if (filterType !== "all") {
            filtered = filtered.filter((t) => t.type === filterType);
        }

        // Search filter
        if (searchQuery) {
            const query = searchQuery.toLowerCase();
            filtered = filtered.filter(
                (t) =>
                    t.wallet_signature.toLowerCase().includes(query) ||
                    t.project?.job_title.toLowerCase().includes(query)
            );
        }

        setFilteredTransactions(filtered);
    };

    const getTypeColor = (type: string) => {
        switch (type) {
            case "stake":
                return "bg-warning/10 text-warning border-warning/30";
            case "payment":
                return "bg-success/10 text-success border-success/30";
            case "refund":
                return "bg-primary/10 text-primary border-primary/30";
            case "penalty":
                return "bg-destructive/10 text-destructive border-destructive/30";
            default:
                return "bg-muted text-muted-foreground border-muted";
        }
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case "confirmed":
                return "bg-success/10 text-success border-success/30";
            case "pending":
                return "bg-warning/10 text-warning border-warning/30";
            case "failed":
                return "bg-destructive/10 text-destructive border-destructive/30";
            default:
                return "bg-muted text-muted-foreground border-muted";
        }
    };

    const truncateAddress = (address: string) => {
        if (!address) return "N/A";
        return `${address.slice(0, 4)}...${address.slice(-4)}`;
    };

    const openInExplorer = (signature: string) => {
        // Solana Explorer URL (devnet)
        window.open(`https://explorer.solana.com/tx/${signature}?cluster=devnet`, "_blank");
    };

    const exportToCSV = () => {
        const headers = ["Date", "Type", "Amount (SOL)", "Status", "Signature", "Project"];
        const rows = filteredTransactions.map((t) => [
            new Date(t.created_at).toLocaleDateString(),
            t.type,
            t.amount.toFixed(2),
            t.status,
            t.wallet_signature,
            t.project?.job_title || "N/A",
        ]);

        const csv = [headers, ...rows].map((row) => row.join(",")).join("\n");
        const blob = new Blob([csv], { type: "text/csv" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `transactions-${new Date().toISOString().split("T")[0]}.csv`;
        a.click();
    };

    const totalVolume = transactions.reduce((sum, t) => sum + t.amount, 0);

    return (
        <div className="min-h-screen bg-background">
            <Navbar />

            <div className="container mx-auto px-4 sm:px-6 lg:px-8 pt-24 pb-16">
                <Button variant="ghost" onClick={() => navigate(-1)} className="mb-6">
                    <ArrowLeft className="w-4 h-4 mr-2" />
                    Back
                </Button>

                {/* Header */}
                <div className="mb-8 flex items-center justify-between">
                    <div>
                        <h1 className="text-4xl font-bold mb-2">
                            Transaction <span className="text-gradient">History</span>
                        </h1>
                        <p className="text-muted-foreground">
                            View all your blockchain transactions
                        </p>
                    </div>

                    <Button onClick={exportToCSV} variant="outline">
                        <Download className="w-4 h-4 mr-2" />
                        Export CSV
                    </Button>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
                    <Card className="glass border-white/10">
                        <CardContent className="pt-6 text-center">
                            <p className="text-2xl font-bold">{transactions.length}</p>
                            <p className="text-sm text-muted-foreground">Total Transactions</p>
                        </CardContent>
                    </Card>

                    <Card className="glass border-white/10">
                        <CardContent className="pt-6 text-center">
                            <div className="flex items-center justify-center space-x-1 text-2xl font-bold text-gradient mb-1">
                                <Coins className="w-5 h-5" />
                                <span>{totalVolume.toFixed(2)}</span>
                            </div>
                            <p className="text-sm text-muted-foreground">Total Volume (SOL)</p>
                        </CardContent>
                    </Card>

                    <Card className="glass border-white/10">
                        <CardContent className="pt-6 text-center">
                            <p className="text-2xl font-bold text-success">
                                {transactions.filter((t) => t.type === "payment").length}
                            </p>
                            <p className="text-sm text-muted-foreground">Payments</p>
                        </CardContent>
                    </Card>

                    <Card className="glass border-white/10">
                        <CardContent className="pt-6 text-center">
                            <p className="text-2xl font-bold text-warning">
                                {transactions.filter((t) => t.type === "stake").length}
                            </p>
                            <p className="text-sm text-muted-foreground">Stakes</p>
                        </CardContent>
                    </Card>
                </div>

                {/* Filters */}
                <Card className="glass border-white/10 mb-6">
                    <CardContent className="pt-6">
                        <div className="flex flex-col sm:flex-row gap-4">
                            <div className="flex-1 relative">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                                <Input
                                    placeholder="Search by signature or project..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="pl-10"
                                />
                            </div>

                            <Select value={filterType} onValueChange={setFilterType}>
                                <SelectTrigger className="w-full sm:w-[200px]">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">All Types</SelectItem>
                                    <SelectItem value="stake">Stake</SelectItem>
                                    <SelectItem value="payment">Payment</SelectItem>
                                    <SelectItem value="refund">Refund</SelectItem>
                                    <SelectItem value="penalty">Penalty</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </CardContent>
                </Card>

                {/* Transactions Table */}
                <Card className="glass border-white/10">
                    <CardHeader>
                        <CardTitle>Transactions ({filteredTransactions.length})</CardTitle>
                    </CardHeader>
                    <CardContent>
                        {loading ? (
                            <div className="text-center py-12">
                                <p className="text-muted-foreground">Loading transactions...</p>
                            </div>
                        ) : filteredTransactions.length > 0 ? (
                            <div className="overflow-x-auto">
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Date</TableHead>
                                            <TableHead>Type</TableHead>
                                            <TableHead>Amount</TableHead>
                                            <TableHead>Status</TableHead>
                                            <TableHead>Project</TableHead>
                                            <TableHead>Signature</TableHead>
                                            <TableHead>Actions</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {filteredTransactions.map((transaction) => (
                                            <TableRow key={transaction.id}>
                                                <TableCell className="whitespace-nowrap">
                                                    {formatDistanceToNow(new Date(transaction.created_at), {
                                                        addSuffix: true,
                                                    })}
                                                </TableCell>
                                                <TableCell>
                                                    <Badge variant="outline" className={getTypeColor(transaction.type)}>
                                                        {transaction.type}
                                                    </Badge>
                                                </TableCell>
                                                <TableCell>
                                                    <div className="flex items-center space-x-1 font-semibold">
                                                        <Coins className="w-4 h-4 text-secondary" />
                                                        <span>{transaction.amount.toFixed(2)} SOL</span>
                                                    </div>
                                                </TableCell>
                                                <TableCell>
                                                    <Badge
                                                        variant="outline"
                                                        className={getStatusColor(transaction.status)}
                                                    >
                                                        {transaction.status}
                                                    </Badge>
                                                </TableCell>
                                                <TableCell className="max-w-[200px] truncate">
                                                    {transaction.project?.job_title || "N/A"}
                                                </TableCell>
                                                <TableCell className="font-mono text-xs">
                                                    {truncateAddress(transaction.wallet_signature)}
                                                </TableCell>
                                                <TableCell>
                                                    <Button
                                                        size="sm"
                                                        variant="ghost"
                                                        onClick={() => openInExplorer(transaction.wallet_signature)}
                                                    >
                                                        <ExternalLink className="w-4 h-4" />
                                                    </Button>
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </div>
                        ) : (
                            <div className="text-center py-12">
                                <p className="text-muted-foreground">No transactions found</p>
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}

