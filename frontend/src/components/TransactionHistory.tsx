import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { ExternalLink, Copy, RefreshCw, Clock, CheckCircle, ArrowUpRight, ArrowDownLeft } from 'lucide-react';
import { apiClient } from '@/lib/api-client';
import { toast } from 'sonner';
import { formatDistanceToNow } from 'date-fns';

interface Transaction {
    id: string;
    type: 'stake' | 'milestone_payment';
    amount: number;
    wallet_signature: string;
    wallet_from: string;
    wallet_to: string;
    status: string;
    created_at: string;
    from_user: {
        id: string;
        name: string;
    };
    to_user: {
        id: string;
        name: string;
    };
    milestone?: {
        id: string;
        stage_number: number;
        status: string;
    };
    project: {
        title: string;
    };
}

interface TransactionHistoryProps {
    projectId: string;
    className?: string;
}

export function TransactionHistory({ projectId, className = "" }: TransactionHistoryProps) {
    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [loading, setLoading] = useState(true);
    const [projectTitle, setProjectTitle] = useState<string>('');

    const fetchTransactions = async () => {
        try {
            setLoading(true);
            const response = await apiClient.projects.getTransactions(projectId);

            if (response.error) {
                toast.error(response.error);
                return;
            }

            // Filter out mock transactions (signatures starting with 'mock-signature')
            const realTransactions = (response.data?.transactions || []).filter(
                (tx: Transaction) => !tx.wallet_signature.startsWith('mock-signature')
            );

            setTransactions(realTransactions);
            setProjectTitle(response.data?.project_title || '');
        } catch (error) {
            console.error('Error fetching transactions:', error);
            toast.error('Failed to fetch transaction history');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (projectId) {
            fetchTransactions();
        }
    }, [projectId]);

    const copyToClipboard = (text: string, label: string) => {
        navigator.clipboard.writeText(text);
        toast.success(`${label} copied to clipboard`);
    };

    const openInExplorer = (signature: string) => {
        const explorerUrl = `https://explorer.solana.com/tx/${signature}?cluster=devnet`;
        window.open(explorerUrl, '_blank');
    };

    const getTransactionTypeInfo = (transaction: Transaction) => {
        switch (transaction.type) {
            case 'stake':
                return {
                    label: 'Initial Staking',
                    icon: <ArrowUpRight className="w-4 h-4" />,
                    color: 'bg-blue-500/10 text-blue-600 border-blue-500/20',
                    description: 'Funds staked to escrow'
                };
            case 'milestone_payment':
                return {
                    label: `Milestone ${transaction.milestone?.stage_number || 'N/A'} Payment`,
                    icon: <ArrowDownLeft className="w-4 h-4" />,
                    color: 'bg-green-500/10 text-green-600 border-green-500/20',
                    description: 'Milestone payment claimed'
                };
            default:
                return {
                    label: 'Unknown Transaction',
                    icon: <Clock className="w-4 h-4" />,
                    color: 'bg-gray-500/10 text-gray-600 border-gray-500/20',
                    description: 'Transaction type unknown'
                };
        }
    };

    const getStatusBadge = (status: string) => {
        switch (status.toLowerCase()) {
            case 'confirmed':
                return (
                    <Badge variant="outline" className="bg-green-500/10 text-green-600 border-green-500/20">
                        <CheckCircle className="w-3 h-3 mr-1" />
                        Confirmed
                    </Badge>
                );
            case 'pending':
                return (
                    <Badge variant="outline" className="bg-yellow-500/10 text-yellow-600 border-yellow-500/20">
                        <Clock className="w-3 h-3 mr-1" />
                        Pending
                    </Badge>
                );
            default:
                return (
                    <Badge variant="outline" className="bg-gray-500/10 text-gray-600 border-gray-500/20">
                        {status}
                    </Badge>
                );
        }
    };

    const truncateAddress = (address: string, start = 6, end = 4) => {
        if (!address || address.length <= start + end) return address;
        return `${address.slice(0, start)}...${address.slice(-end)}`;
    };

    if (loading) {
        return (
            <Card className={className}>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <RefreshCw className="w-5 h-5 animate-spin" />
                        Loading Transaction History
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="space-y-4">
                        {[1, 2, 3].map((i) => (
                            <div key={i} className="animate-pulse">
                                <div className="h-20 bg-muted rounded-lg"></div>
                            </div>
                        ))}
                    </div>
                </CardContent>
            </Card>
        );
    }

    return (
        <Card className={className}>
            <CardHeader>
                <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center gap-2">
                        <ExternalLink className="w-5 h-5" />
                        Transaction History
                    </CardTitle>
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={fetchTransactions}
                        className="gap-2"
                    >
                        <RefreshCw className="w-4 h-4" />
                        Refresh
                    </Button>
                </div>
                {projectTitle && (
                    <p className="text-sm text-muted-foreground">
                        All blockchain transactions for: {projectTitle}
                    </p>
                )}
            </CardHeader>
            <CardContent>
                {transactions.length === 0 ? (
                    <div className="text-center py-8">
                        <ExternalLink className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                        <h3 className="text-lg font-semibold mb-2">No Transactions Found</h3>
                        <p className="text-muted-foreground">
                            No blockchain transactions have been recorded for this project yet.
                        </p>
                    </div>
                ) : (
                    <div className="space-y-4">
                        {transactions.map((transaction, index) => {
                            const typeInfo = getTransactionTypeInfo(transaction);

                            return (
                                <div key={transaction.id}>
                                    <div className="p-4 border rounded-lg hover:bg-muted/50 transition-colors">
                                        <div className="flex items-start justify-between mb-3">
                                            <div className="flex items-center gap-3">
                                                <div className={`p-2 rounded-full ${typeInfo.color}`}>
                                                    {typeInfo.icon}
                                                </div>
                                                <div>
                                                    <h4 className="font-semibold">{typeInfo.label}</h4>
                                                    <p className="text-sm text-muted-foreground">
                                                        {typeInfo.description}
                                                    </p>
                                                </div>
                                            </div>
                                            <div className="text-right">
                                                <div className="text-lg font-bold text-primary">
                                                    {transaction.amount.toFixed(4)} SOL
                                                </div>
                                                {getStatusBadge(transaction.status)}
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                                            <div>
                                                <label className="text-muted-foreground">From:</label>
                                                <div className="flex items-center gap-2 mt-1">
                                                    <span className="font-mono text-xs bg-muted px-2 py-1 rounded">
                                                        {truncateAddress(transaction.wallet_from)}
                                                    </span>
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        onClick={() => copyToClipboard(transaction.wallet_from, 'From address')}
                                                        className="h-6 w-6 p-0"
                                                    >
                                                        <Copy className="w-3 h-3" />
                                                    </Button>
                                                </div>
                                                <p className="text-xs text-muted-foreground mt-1">
                                                    {transaction.from_user.name}
                                                </p>
                                            </div>

                                            <div>
                                                <label className="text-muted-foreground">To:</label>
                                                <div className="flex items-center gap-2 mt-1">
                                                    <span className="font-mono text-xs bg-muted px-2 py-1 rounded">
                                                        {truncateAddress(transaction.wallet_to)}
                                                    </span>
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        onClick={() => copyToClipboard(transaction.wallet_to, 'To address')}
                                                        className="h-6 w-6 p-0"
                                                    >
                                                        <Copy className="w-3 h-3" />
                                                    </Button>
                                                </div>
                                                <p className="text-xs text-muted-foreground mt-1">
                                                    {transaction.to_user.name}
                                                </p>
                                            </div>
                                        </div>

                                        <div className="mt-4">
                                            <label className="text-muted-foreground text-sm">Transaction Signature:</label>
                                            <div className="flex items-center gap-2 mt-1">
                                                <span className="font-mono text-xs bg-muted px-3 py-2 rounded flex-1 break-all">
                                                    {transaction.wallet_signature}
                                                </span>
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={() => copyToClipboard(transaction.wallet_signature, 'Transaction signature')}
                                                    className="h-8 w-8 p-0"
                                                >
                                                    <Copy className="w-4 h-4" />
                                                </Button>
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    onClick={() => openInExplorer(transaction.wallet_signature)}
                                                    className="gap-2"
                                                >
                                                    <ExternalLink className="w-4 h-4" />
                                                    Explorer
                                                </Button>
                                            </div>
                                        </div>

                                        <div className="flex items-center justify-between mt-3 pt-3 border-t">
                                            <span className="text-xs text-muted-foreground">
                                                {formatDistanceToNow(new Date(transaction.created_at))} ago
                                            </span>
                                            {transaction.milestone && (
                                                <Badge variant="outline" className="text-xs">
                                                    Stage {transaction.milestone.stage_number}
                                                </Badge>
                                            )}
                                        </div>
                                    </div>
                                    {index < transactions.length - 1 && <Separator className="my-4" />}
                                </div>
                            );
                        })}
                    </div>
                )}
            </CardContent>
        </Card>
    );
}

