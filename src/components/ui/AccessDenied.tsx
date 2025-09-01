import { Shield, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useNavigate } from "react-router-dom";

interface AccessDeniedProps {
  title?: string;
  description?: string;
  showBackButton?: boolean;
}

export function AccessDenied({ 
  title = "Access Denied", 
  description = "You don't have permission to access this feature. Please contact your administrator if you believe this is an error.",
  showBackButton = true 
}: AccessDeniedProps) {
  const navigate = useNavigate();

  const handleGoBack = () => {
    navigate(-1);
  };

  const handleGoToServices = () => {
    navigate('/services');
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <div className="p-3 bg-red-100 rounded-full">
              <Shield className="h-8 w-8 text-red-600" />
            </div>
          </div>
          <CardTitle className="text-xl text-red-900">{title}</CardTitle>
          <CardDescription className="text-red-700">
            {description}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <p className="text-sm text-red-700 text-center">
              This feature requires administrator privileges. Regular users can access:
            </p>
            <ul className="text-sm text-red-700 mt-2 space-y-1">
              <li>• Services management</li>
              <li>• Customer management</li>
              <li>• Product management</li>
              <li>• Inventory management</li>
              <li>• Alerts and notifications</li>
            </ul>
          </div>
          
          <div className="space-y-3">
            {showBackButton && (
              <Button 
                variant="outline" 
                onClick={handleGoBack}
                className="w-full"
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Go Back
              </Button>
            )}
            
            <Button 
              onClick={handleGoToServices}
              className="w-full"
              style={{ backgroundColor: '#859447', borderColor: '#859447' }}
            >
              Go to Services
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}




