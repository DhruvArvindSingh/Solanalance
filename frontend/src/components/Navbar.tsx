import { Button } from "@/components/ui/button";
import { Menu, Briefcase, LogOut, History, X } from "lucide-react";
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
import { useState, useEffect } from "react";

export const Navbar = () => {
  const { user, userRole, signOut } = useAuth();
  const navigate = useNavigate();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const toggleMobileMenu = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen);
  };

  const closeMobileMenu = () => {
    setIsMobileMenuOpen(false);
  };

  // Close mobile menu on screen resize to desktop
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 768) { // md breakpoint
        setIsMobileMenuOpen(false);
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Close mobile menu on escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isMobileMenuOpen) {
        setIsMobileMenuOpen(false);
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isMobileMenuOpen]);

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
            {user && (
              <button
                onClick={() => navigate(userRole === "recruiter" ? "/dashboard/recruiter" : "/dashboard/freelancer")}
                className="text-foreground/80 hover:text-foreground transition-colors font-medium"
              >
                Dashboard
              </button>
            )}
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
            <Button variant="ghost" size="icon" className="md:hidden" onClick={toggleMobileMenu}>
              {isMobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </Button>
          </div>
        </div>
      </div>

      {/* Mobile Menu Sidebar */}
      {isMobileMenuOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40 md:hidden"
            onClick={closeMobileMenu}
          />

          {/* Sidebar */}
          <div className="fixed top-0 right-0 h-full w-80 bg-background/95 backdrop-blur-xl border-l border-border/50 shadow-2xl z-50 md:hidden transform transition-transform duration-300 ease-out">
            <div className="flex flex-col h-full">
              {/* Header */}
              <div className="flex items-center justify-between p-6 border-b border-border/30">
                <div className="flex items-center space-x-2">
                  <div className="w-8 h-8 rounded-lg bg-gradient-solana flex items-center justify-center">
                    <Briefcase className="w-5 h-5 text-background" />
                  </div>
                  <span className="text-lg font-bold text-gradient">SolanaLance</span>
                </div>
                <Button variant="ghost" size="icon" onClick={closeMobileMenu}>
                  <X className="w-5 h-5" />
                </Button>
              </div>

              {/* Menu Items */}
              <div className="flex-1 overflow-y-auto p-6">
                <div className="space-y-4">
                  {user && (
                    <button
                      onClick={() => {
                        navigate(userRole === "recruiter" ? "/dashboard/recruiter" : "/dashboard/freelancer");
                        closeMobileMenu();
                      }}
                      className="w-full text-left px-4 py-3 rounded-lg hover:bg-muted/50 transition-colors font-medium text-foreground"
                    >
                      <div className="flex items-center space-x-3">
                        <Briefcase className="w-5 h-5" />
                        <span>Dashboard</span>
                      </div>
                    </button>
                  )}

                  <button
                    onClick={() => {
                      navigate("/discover");
                      closeMobileMenu();
                    }}
                    className="w-full text-left px-4 py-3 rounded-lg hover:bg-muted/50 transition-colors text-foreground"
                  >
                    <div className="flex items-center space-x-3">
                      <Briefcase className="w-5 h-5" />
                      <span>Find Jobs</span>
                    </div>
                  </button>

                  <button
                    onClick={() => {
                      navigate("/how-it-works");
                      closeMobileMenu();
                    }}
                    className="w-full text-left px-4 py-3 rounded-lg hover:bg-muted/50 transition-colors text-foreground"
                  >
                    <div className="flex items-center space-x-3">
                      <History className="w-5 h-5" />
                      <span>How It Works</span>
                    </div>
                  </button>

                  <button
                    onClick={() => {
                      navigate("/about");
                      closeMobileMenu();
                    }}
                    className="w-full text-left px-4 py-3 rounded-lg hover:bg-muted/50 transition-colors text-foreground"
                  >
                    <div className="flex items-center space-x-3">
                      <Briefcase className="w-5 h-5" />
                      <span>About</span>
                    </div>
                  </button>

                  {user && (
                    <>
                      <div className="border-t border-border/30 my-4"></div>

                      <button
                        onClick={() => {
                          navigate(`/profile/${user.id}`);
                          closeMobileMenu();
                        }}
                        className="w-full text-left px-4 py-3 rounded-lg hover:bg-muted/50 transition-colors text-foreground"
                      >
                        <div className="flex items-center space-x-3">
                          <Avatar className="w-5 h-5">
                            <AvatarImage src={user.avatarUrl || undefined} />
                            <AvatarFallback className="text-xs">
                              {(user.fullName?.charAt(0) || user.email?.charAt(0) || "?").toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <span>Profile</span>
                        </div>
                      </button>

                      <button
                        onClick={() => {
                          navigate('/transactions');
                          closeMobileMenu();
                        }}
                        className="w-full text-left px-4 py-3 rounded-lg hover:bg-muted/50 transition-colors text-foreground"
                      >
                        <div className="flex items-center space-x-3">
                          <History className="w-5 h-5" />
                          <span>Transactions</span>
                        </div>
                      </button>
                    </>
                  )}
                </div>
              </div>

              {/* Footer */}
              <div className="p-6 border-t border-border/30">
                {user ? (
                  <div className="space-y-4">
                    <div className="flex items-center space-x-3 p-3 bg-muted/30 rounded-lg">
                      <Avatar className="w-8 h-8">
                        <AvatarImage src={user.avatarUrl || undefined} />
                        <AvatarFallback className="bg-gradient-solana text-background text-sm">
                          {(user.fullName?.charAt(0) || user.email?.charAt(0) || "?").toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{user.email}</p>
                        {userRole && (
                          <p className="text-xs text-muted-foreground capitalize">{userRole}</p>
                        )}
                      </div>
                    </div>

                    <div className="block sm:hidden">
                      <WalletMultiButton className="!bg-gradient-to-r !from-success !to-primary !h-10 !rounded-lg !w-full" />
                    </div>

                    <Button
                      variant="outline"
                      className="w-full"
                      onClick={() => {
                        signOut();
                        closeMobileMenu();
                      }}
                    >
                      <LogOut className="w-4 h-4 mr-2" />
                      Sign Out
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <Button
                      variant="outline"
                      className="w-full"
                      onClick={() => {
                        navigate("/auth");
                        closeMobileMenu();
                      }}
                    >
                      Sign In
                    </Button>
                    <Button
                      className="w-full bg-gradient-solana hover:opacity-90 border-0"
                      onClick={() => {
                        navigate("/auth");
                        closeMobileMenu();
                      }}
                    >
                      Get Started
                    </Button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </>
      )}
    </nav>
  );
};
