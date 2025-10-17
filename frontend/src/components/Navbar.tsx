import { Button } from "@/components/ui/button";
import { Menu, Briefcase, LogOut, History } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useNavigate } from "react-router-dom";
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

export const Navbar = () => {
  const { user, userRole, signOut } = useAuth();
  console.log(user);
  console.log(userRole);
  console.log(signOut);
  const navigate = useNavigate();

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 glass border-b border-white/10">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 sm:h-20">
          {/* Logo */}
          <div className="flex items-center space-x-2 cursor-pointer" onClick={() => navigate("/")}>
            <div className="w-10 h-10 rounded-xl bg-gradient-solana flex items-center justify-center">
              <Briefcase className="w-6 h-6 text-background" />
            </div>
            <span className="text-xl font-bold text-gradient">SolanaLance</span>
          </div>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-8">
            <button
              onClick={() => navigate("/discover")}
              className="text-foreground/80 hover:text-foreground transition-colors"
            >
              Find Jobs
            </button>
            <button
              onClick={() => navigate("/how-it-works")}
              className="text-foreground/80 hover:text-foreground transition-colors"
            >
              How It Works
            </button>
            <button
              onClick={() => navigate("/about")}
              className="text-foreground/80 hover:text-foreground transition-colors"
            >
              About
            </button>
          </div>

          {/* Right Side Actions */}
          <div className="flex items-center space-x-4">
            {user ? (
              <>
                <div className="hidden sm:block">
                  <WalletMultiButton className="!bg-gradient-to-r !from-success !to-primary !h-10 !rounded-lg" />
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" className="relative h-10 w-10 rounded-full">
                      <Avatar>
                        <AvatarImage src={user.avatarUrl || undefined} />
                        <AvatarFallback className="bg-gradient-solana text-background">
                          {(user.fullName?.charAt(0) || user.email?.charAt(0) || "?").toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-56">
                    <DropdownMenuLabel>
                      <div className="flex flex-col space-y-1">
                        <p className="text-sm font-medium">{user.email}</p>
                        {userRole && (
                          <p className="text-xs text-muted-foreground capitalize">{userRole}</p>
                        )}
                      </div>
                    </DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      onClick={() => navigate(userRole === "recruiter" ? "/dashboard/recruiter" : "/dashboard/freelancer")}
                      className="cursor-pointer"
                    >
                      <Briefcase className="w-4 h-4 mr-2" />
                      Dashboard
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => navigate(`/profile/${user.id}`)}
                      className="cursor-pointer"
                    >
                      <Avatar className="w-4 h-4 mr-2">
                        <AvatarImage src={user.avatarUrl || undefined} />
                        <AvatarFallback className="text-xs">
                          {(user.fullName?.charAt(0) || user.email?.charAt(0) || "?").toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      Profile
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => navigate('/transactions')}
                      className="cursor-pointer"
                    >
                      <History className="w-4 h-4 mr-2" />
                      Transactions
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={signOut} className="cursor-pointer">
                      <LogOut className="w-4 h-4 mr-2" />
                      Sign Out
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </>
            ) : (
              <>
                <Button variant="ghost" className="hidden sm:flex" onClick={() => navigate("/auth")}>
                  Sign In
                </Button>
                <Button className="bg-gradient-solana hover:opacity-90 border-0" onClick={() => navigate("/auth")}>
                  Get Started
                </Button>
              </>
            )}
            <Button variant="ghost" size="icon" className="md:hidden">
              <Menu className="w-5 h-5" />
            </Button>
          </div>
        </div>
      </div>
    </nav>
  );
};
