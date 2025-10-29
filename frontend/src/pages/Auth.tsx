import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { apiClient } from "@/integrations/apiClient/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Briefcase, UserCircle, Wallet, CheckCircle, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { useWalletModal } from "@solana/wallet-adapter-react-ui";

export default function Auth() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [role, setRole] = useState<"recruiter" | "freelancer">("freelancer");
  const [loading, setLoading] = useState(false);
  const [walletConnected, setWalletConnected] = useState(false);
  const [walletAddress, setWalletAddress] = useState("");

  const navigate = useNavigate();
  const { user, refreshAuth } = useAuth();
  const { connection } = useConnection();
  const { publicKey, disconnect, connected, wallet } = useWallet();
  const { setVisible } = useWalletModal();

  useEffect(() => {
    if (user) {
      navigate("/");
    }
  }, [user, navigate]);

  // Monitor wallet connection status
  useEffect(() => {
    if (connected && publicKey) {
      setWalletAddress(publicKey.toBase58());
      setWalletConnected(true);
    } else {
      setWalletAddress("");
      setWalletConnected(false);
    }
  }, [connected, publicKey]);

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate wallet connection
    if (!walletConnected || !walletAddress) {
      toast.error("Please connect your Solana wallet before signing up");
      return;
    }

    setLoading(true);

    try {
      const { data, error } = await apiClient.auth.register({
        email,
        password,
        fullName,
        role,
        walletAddress: walletAddress,
      });

      if (error) {
        throw new Error(error);
      }

      // Refresh authentication state immediately after successful registration
      await refreshAuth();

      toast.success(`Account created successfully! Your User ID is #${data.user.userId}`);
      setEmail("");
      setPassword("");
      setFullName("");
      setWalletAddress("");
    } catch (error: any) {
      toast.error(error.message || "Error signing up");
    } finally {
      setLoading(false);
    }
  };

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { data, error } = await apiClient.auth.login({
        email,
        password,
      });

      if (error) {
        throw new Error(error);
      }

      // Refresh authentication state immediately after successful login
      await refreshAuth();

      toast.success("Signed in successfully!");
      navigate("/");
    } catch (error: any) {
      toast.error(error.message || "Error signing in");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-background via-background to-primary/5">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="w-16 h-16 rounded-2xl bg-gradient-solana flex items-center justify-center mx-auto mb-4">
            <Briefcase className="w-8 h-8 text-background" />
          </div>
          <h1 className="text-3xl font-bold text-gradient mb-2">SolanaLance</h1>
          <p className="text-muted-foreground">Join the decentralized freelancing revolution</p>
        </div>

        <Card className="glass border-white/10">
          <CardHeader>
            <CardTitle>Welcome</CardTitle>
            <CardDescription>Sign in or create your account</CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="signin" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="signin">Sign In</TabsTrigger>
                <TabsTrigger value="signup">Sign Up</TabsTrigger>
              </TabsList>

              <TabsContent value="signin">
                <form onSubmit={handleSignIn} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="signin-email">Email</Label>
                    <Input
                      id="signin-email"
                      type="email"
                      placeholder="you@example.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="signin-password">Password</Label>
                    <Input
                      id="signin-password"
                      type="password"
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                    />
                  </div>
                  <Button type="submit" className="w-full bg-gradient-solana" disabled={loading}>
                    {loading ? "Signing in..." : "Sign In"}
                  </Button>
                </form>
              </TabsContent>

              <TabsContent value="signup">
                <form onSubmit={handleSignUp} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="signup-name">Full Name</Label>
                    <Input
                      id="signup-name"
                      type="text"
                      placeholder="John Doe"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="signup-email">Email</Label>
                    <Input
                      id="signup-email"
                      type="email"
                      placeholder="you@example.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="signup-password">Password</Label>
                    <Input
                      id="signup-password"
                      type="password"
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      minLength={6}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>I am a</Label>
                    <div className="grid grid-cols-2 gap-4">
                      <Button
                        type="button"
                        variant={role === "freelancer" ? "default" : "outline"}
                        className={role === "freelancer" ? "bg-gradient-solana" : ""}
                        onClick={() => setRole("freelancer")}
                      >
                        <UserCircle className="w-4 h-4 mr-2" />
                        Freelancer
                      </Button>
                      <Button
                        type="button"
                        variant={role === "recruiter" ? "default" : "outline"}
                        className={role === "recruiter" ? "bg-gradient-solana" : ""}
                        onClick={() => setRole("recruiter")}
                      >
                        <Briefcase className="w-4 h-4 mr-2" />
                        Recruiter
                      </Button>
                    </div>
                  </div>

                  {/* Wallet Connection */}
                  <div className="space-y-2">
                    <Label className="flex items-center gap-2">
                      <Wallet className="w-4 h-4" />
                      Solana Wallet Setup
                    </Label>


                    <div className="p-4 border rounded-lg bg-muted/20">
                      {walletConnected ? (
                        <div className="space-y-2">
                          <div className="flex items-center gap-2 text-green-600">
                            <CheckCircle className="w-4 h-4" />
                            <span className="text-sm font-medium">Wallet Connected</span>
                          </div>
                          <div className="text-xs text-muted-foreground font-mono bg-muted px-2 py-1 rounded break-all">
                            {walletAddress}
                          </div>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => setVisible(true)}
                            className="text-xs"
                          >
                            Change Wallet
                          </Button>
                        </div>
                      ) : (
                        <div className="space-y-2">
                          <div className="flex items-center gap-2 text-orange-600">
                            <AlertCircle className="w-4 h-4" />
                            <span className="text-sm font-medium">Wallet Required</span>
                          </div>
                          <p className="text-xs text-muted-foreground">
                            Connect your Solana wallet to secure your account and enable blockchain transactions.
                          </p>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => setVisible(true)}
                            className="bg-gradient-solana text-white hover:bg-gradient-solana/90"
                          >
                            <Wallet className="w-4 h-4 mr-2" />
                            Select Wallet
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                  <Button type="submit" className="w-full bg-gradient-solana" disabled={loading}>
                    {loading ? "Creating account..." : "Sign Up"}
                  </Button>
                </form>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
