import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { supabase } from "@/integrations/supabase/client";
import { CheckCircle, XCircle, Loader2, Mail } from "lucide-react";

export function EmailConfirmation() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    const confirmEmail = async () => {
      try {
        const token = searchParams.get('token');
        const type = searchParams.get('type');

        if (!token || type !== 'signup') {
          setError('Invalid confirmation link');
          setStatus('error');
          return;
        }

        const { error } = await supabase.auth.verifyOtp({
          token_hash: token,
          type: 'signup',
        });

        if (error) {
          console.error('Email confirmation error:', error);
          setError(error.message || 'Failed to confirm email');
          setStatus('error');
        } else {
          setMessage('Your email has been confirmed successfully! You can now sign in to your account.');
          setStatus('success');
        }
      } catch (err) {
        console.error('Unexpected error during email confirmation:', err);
        setError('An unexpected error occurred. Please try again.');
        setStatus('error');
      }
    };

    confirmEmail();
  }, [searchParams]);

  const handleSignIn = () => {
    navigate('/auth');
  };

  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <div className="flex flex-col items-center space-y-4">
              <Loader2 className="h-12 w-12 animate-spin text-blue-600" />
              <h2 className="text-xl font-semibold text-gray-900">Confirming your email...</h2>
              <p className="text-gray-600 text-center">
                Please wait while we verify your email address.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (status === 'error') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="flex justify-center mb-4">
              <XCircle className="h-16 w-16 text-red-500" />
            </div>
            <CardTitle className="text-xl text-red-900">Email Confirmation Failed</CardTitle>
            <CardDescription className="text-red-700">
              We couldn't confirm your email address
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
            <div className="space-y-3">
              <Button 
                onClick={handleSignIn} 
                className="w-full"
                style={{ backgroundColor: '#859447', borderColor: '#859447' }}
              >
                Go to Sign In
              </Button>
              <Button 
                variant="outline" 
                onClick={() => window.location.reload()} 
                className="w-full"
              >
                Try Again
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <CheckCircle className="h-16 w-16 text-green-500" />
          </div>
          <CardTitle className="text-xl text-green-900">Email Confirmed!</CardTitle>
          <CardDescription className="text-green-700">
            Your account is now active
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <div className="flex items-center gap-2 text-green-800">
              <Mail className="h-4 w-4" />
              <span className="text-sm font-medium">Account verified successfully</span>
            </div>
            <p className="text-sm text-green-700 mt-1">
              {message}
            </p>
          </div>
          <Button 
            onClick={handleSignIn} 
            className="w-full"
            style={{ backgroundColor: '#859447', borderColor: '#859447' }}
          >
            Sign In to Your Account
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

