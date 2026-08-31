import { Twitter, Send, MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";

const Footer = () => {
  return (
    <footer className="border-t border-border mt-12 sm:mt-24 pb-16 lg:pb-0">
      <div className="container mx-auto px-4 py-8 sm:py-12">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 sm:gap-8 mb-6 sm:mb-8">
          <div>
            <div className="flex items-center space-x-2 mb-4">
              <div className="h-8 w-8 rounded-lg bg-dtx-mint/15 ring-1 ring-dtx-mint/40 grid place-items-center">
                <span className="font-mono text-xs font-bold text-dtx-mint-bright">C7 Winners</span>
              </div>
              <span className="font-display text-xl font-bold text-foreground">
                C<span className="text-dtx-mint-bright">7</span> Casinos
              </span>
            </div>
            <p className="text-sm text-muted-foreground">Season Casinos — premium provably fair crypto gaming.</p>
          </div>

          <div>
            <h4 className="font-display font-semibold mb-4">Contact Us</h4>
            <div className="space-y-2 text-sm text-muted-foreground">
              <p>✉ Email: <a href="mailto:info@creator74.com" className="text-primary hover:underline">info@creator74.com</a></p>
              <p>📱 Telegram: <a href="https://t.me/Creator744" className="text-primary hover:underline">@Creator744</a></p>
            </div>
          </div>

          <div>
            <h4 className="font-display font-semibold mb-4">Social Links</h4>
            <div className="flex space-x-4">
              <Button size="icon" variant="ghost" asChild>
                <a href="https://twitter.com" target="_blank" rel="noopener noreferrer"><Twitter className="h-5 w-5" /></a>
              </Button>
              <Button size="icon" variant="ghost" asChild>
                <a href="https://t.me/Creator744" target="_blank" rel="noopener noreferrer"><Send className="h-5 w-5" /></a>
              </Button>
              <Button size="icon" variant="ghost" asChild>
                <a href="https://discord.com" target="_blank" rel="noopener noreferrer"><MessageCircle className="h-5 w-5" /></a>
              </Button>
            </div>
          </div>
        </div>

        <div className="pt-8 border-t border-border flex flex-col md:flex-row justify-between items-center text-sm text-muted-foreground">
          <p>© 2025 C7 Winners (Season Casinos). All rights reserved.</p>
          <div className="flex space-x-4 mt-4 md:mt-0">
            <Link to="/privacy" className="hover:text-foreground transition-colors">Privacy Policy</Link>
            <Link to="/terms" className="hover:text-foreground transition-colors">Terms of Service</Link>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
