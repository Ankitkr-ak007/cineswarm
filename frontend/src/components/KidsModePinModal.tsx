import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { apiClient } from "@/lib/api-client";
import { supabase } from "@/lib/supabase";

interface PinModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function KidsModePinModal({ isOpen, onClose, onSuccess }: PinModalProps) {
  const [pin, setPin] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleVerify = async () => {
    setError("");
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setError("You must be logged in to verify PIN.");
        setLoading(false);
        return;
      }

      const { data, error: apiError } = await apiClient.POST("/api/v1/kids-mode/verify-pin", {
        body: { user_id: user.id, pin }
      });

      if (apiError || !data?.success) {
        setError(data?.message || "Invalid PIN");
      } else {
        setPin("");
        onSuccess();
      }
    } catch {
      setError("An error occurred");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Enter PIN to exit Kids Mode</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col space-y-4">
          <Input 
            type="password" 
            placeholder="Enter PIN" 
            value={pin} 
            onChange={e => setPin(e.target.value)}
          />
          {error && <p className="text-red-500 text-sm">{error}</p>}
          <Button onClick={handleVerify} disabled={loading}>
            {loading ? "Verifying..." : "Verify"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
