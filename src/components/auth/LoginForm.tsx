import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Eye, EyeOff, Loader2, Mail, AlertTriangle } from "lucide-react";

export function LoginForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [showEmailVerification, setShowEmailVerification] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        // Handle specific access control errors
        if (error.message.includes('banned')) {
          setError("Your account has been banned from the system. Please contact an administrator for more information.");
        } else if (error.message.includes('restricted')) {
          setError("Your account access has been restricted. Please contact an administrator for more information.");
        } else if (error.message.includes('deactivated')) {
          setError("Your account has been deactivated. Please contact an administrator for more information.");
        } else if (error.message.includes('Email not confirmed')) {
          setError("Please check your email and click the confirmation link before signing in.");
          // setShowEmailVerification(true); // This state variable is not defined in the original file
        } else if (error.message.includes('Invalid login credentials')) {
          setError("Invalid email or password. Please try again.");
        } else {
          setError(error.message || "An error occurred during sign in");
        }
      } else if (data) {
        // Success - user will be redirected by the auth context
        toast({
          title: "Success",
          description: "Signed in successfully!",
        });
      }
    } catch (err) {
      setError("An unexpected error occurred. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendVerification = async () => {
    if (!email.trim()) {
      setError("Please enter your email address first.");
      return;
    }

    setIsLoading(true);
    setError("");

    try {
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email: email.trim(),
        options: {
          emailRedirectTo: `${window.location.origin}/auth/confirm`,
        },
      });

      if (error) {
        setError(`Failed to resend verification: ${error.message}`);
      } else {
        toast({
          title: "Verification email sent!",
          description: "Please check your email for the verification link.",
        });
      }
    } catch (err) {
      setError("Failed to resend verification email. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      
      <div className="space-y-2">
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          type="email"
          placeholder="Enter your email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          disabled={isLoading}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="password">Password</Label>
        <div className="relative">
          <Input
            id="password"
            type={showPassword ? "text" : "password"}
            placeholder="Enter your password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            disabled={isLoading}
          />
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
            onClick={() => setShowPassword(!showPassword)}
            disabled={isLoading}
          >
            {showPassword ? (
              <EyeOff className="h-4 w-4" />
            ) : (
              <Eye className="h-4 w-4" />
            )}
          </Button>
        </div>
      </div>

      <Button type="submit" className="w-full" disabled={isLoading}>
        {isLoading ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Signing in...
          </>
        ) : (
          "Sign In"
        )}
      </Button>

      {showEmailVerification && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
          <div className="flex items-center gap-2 text-amber-800 mb-2">
            <AlertTriangle className="h-4 w-4" />
            <span className="text-sm font-medium">Email not verified</span>
          </div>
          <p className="text-sm text-amber-700 mb-3">
            You need to verify your email address before signing in.
          </p>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleResendVerification}
            disabled={isLoading}
            className="w-full text-amber-700 border-amber-300 hover:bg-amber-100"
          >
            <Mail className="h-4 w-4 mr-2" />
            Resend Verification Email
          </Button>
        </div>
      )}
    </form>
  );
}