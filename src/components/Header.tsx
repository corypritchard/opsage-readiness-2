import { Button } from "@/components/ui/button";
import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { ThemeToggle } from "@/components/ThemeToggle";
import { useTheme } from "@/contexts/ThemeContext";

const Header = () => {
  const [isScrolled, setIsScrolled] = useState(false);
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const { resolvedTheme } = useTheme();

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 0);
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const handleLoginClick = () => {
    if (user) {
      navigate("/dashboard");
    } else {
      navigate("/auth");
    }
  };

  const handleLogout = async () => {
    await signOut();
  };

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-50 w-full py-4 px-6 transition-all duration-300 ${
        isScrolled
          ? "bg-background/95 backdrop-blur-sm border-b border-border shadow-sm"
          : "bg-transparent"
      }`}
    >
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <img
            src="/lovable-uploads/99e1c9c8-57aa-4386-91f7-9fba40624b01.png"
            alt="Opsage Logo"
            className="h-16 w-auto object-contain"
          />
        </div>

        <div className="flex items-center space-x-4">
          <Button
            variant="ghost"
            onClick={handleLoginClick}
            className="hidden md:inline-flex"
          >
            Dashboard
          </Button>
          <Button
            variant="ghost"
            onClick={handleLogout}
            className="hidden md:inline-flex"
          >
            Logout
          </Button>
          <Button variant="outline" className="hidden md:inline-flex">
            Try Demo
          </Button>
          <Button className="bg-primary text-primary-foreground hover:bg-primary/90">
            Book Walkthrough
          </Button>
        </div>
      </div>
    </header>
  );
};

export default Header;
