import { useState, useEffect } from "react";
import { Save, User, Bell, Database, Shield, Palette, Settings as SettingsIcon, Key, Globe, Monitor } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Badge } from "@/components/ui/badge";

export default function Settings() {
  const [isLoading, setIsLoading] = useState(false);
  const [profileData, setProfileData] = useState({
    full_name: "",
    email: "",
  });
  const [preferences, setPreferences] = useState({
    theme: "light",
    notifications: true,
    email_alerts: true,
    low_stock_alerts: true,
    payment_reminders: true,
  });
  
  const { user, profile } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    if (profile) {
      setProfileData({
        full_name: profile.full_name,
        email: profile.email,
      });
    }
  }, [profile]);

  const handleProfileUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setIsLoading(true);
    try {
      const { error } = await supabase
        .from("profiles")
        .update({
          full_name: profileData.full_name,
          email: profileData.email,
        })
        .eq("user_id", user.id);

      if (error) throw error;
      
      toast({ title: "Success", description: "Profile updated successfully" });
    } catch (error) {
      console.error("Error updating profile:", error);
      toast({
        title: "Error",
        description: "Failed to update profile",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateLowStockAlert = async () => {
    if (!user) return;

    try {
      // Get items with low stock
      const { data: lowStockItems, error: fetchError } = await supabase
        .from("inventory_items")
        .select("*")
        .lte("current_stock", "min_stock_level");

      if (fetchError) throw fetchError;

      if (lowStockItems && lowStockItems.length > 0) {
        // Create alerts for low stock items
        const alerts = lowStockItems.map(item => ({
          type: "low_stock",
          title: "Low Stock Alert",
          message: `Item "${item.name}" is running low. Current stock: ${item.current_stock}, Minimum: ${item.min_stock_level}`,
          severity: "warning",
          entity_type: "inventory_item",
          entity_id: item.id,
          expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days from now
        }));

        const { error: insertError } = await supabase
          .from("alerts")
          .insert(alerts);

        if (insertError) throw insertError;

        toast({ 
          title: "Success", 
          description: `Created ${alerts.length} low stock alerts` 
        });
      } else {
        toast({ 
          title: "Info", 
          description: "No low stock items found" 
        });
      }
    } catch (error) {
      console.error("Error creating low stock alerts:", error);
      toast({
        title: "Error",
        description: "Failed to create low stock alerts",
        variant: "destructive",
      });
    }
  };

  const handleTestAlert = async () => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from("alerts")
        .insert({
          type: "test",
          title: "Test Alert",
          message: "This is a test alert to verify the notification system is working properly.",
          severity: "info",
          expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // 24 hours from now
        });

      if (error) throw error;
      
      toast({ title: "Success", description: "Test alert created successfully" });
    } catch (error) {
      console.error("Error creating test alert:", error);
      toast({
        title: "Error",
        description: "Failed to create test alert",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Professional Notice */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-4 mb-6">
        <div className="flex items-start gap-3">
          <div className="p-2 bg-blue-100 rounded-full">
            <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div className="flex-1">
            <h3 className="text-sm font-semibold text-blue-900 mb-1">System Updates & Maintenance</h3>
            <p className="text-sm text-blue-700 leading-relaxed">
              This system is actively maintained and enhanced by <strong>Our Team</strong>. 
              Future updates will include new features, security improvements, and performance optimizations. 
              For technical support or feature requests, please contact our development team.
            </p>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Settings</h1>
          <p className="text-gray-600">Manage your account and system preferences</p>
        </div>
      </div>

      <Tabs defaultValue="profile" className="w-full">
        <TabsList className="grid w-full grid-cols-4 bg-gray-100 p-1">
          <TabsTrigger 
            value="profile" 
            className="data-[state=active]:bg-white data-[state=active]:text-indigo-600 data-[state=active]:shadow-sm"
          >
            <User className="mr-2 h-4 w-4" />
            Profile
          </TabsTrigger>
          <TabsTrigger 
            value="preferences" 
            className="data-[state=active]:bg-white data-[state=active]:text-purple-600 data-[state=active]:shadow-sm"
          >
            <Palette className="mr-2 h-4 w-4" />
            Preferences
          </TabsTrigger>
          <TabsTrigger 
            value="notifications" 
            className="data-[state=active]:bg-white data-[state=active]:text-pink-600 data-[state=active]:shadow-sm"
          >
            <Bell className="mr-2 h-4 w-4" />
            Notifications
          </TabsTrigger>
          <TabsTrigger 
            value="system" 
            className="data-[state=active]:bg-white data-[state=active]:text-blue-600 data-[state=active]:shadow-sm"
          >
            <SettingsIcon className="mr-2 h-4 w-4" />
            System
          </TabsTrigger>
        </TabsList>

        <TabsContent value="profile" className="mt-6">
          <Card className="border-0 shadow-lg bg-gradient-to-br from-white to-indigo-50/50">
            <CardHeader className="bg-gradient-to-r from-indigo-50 to-purple-50 border-b border-indigo-100">
              <CardTitle className="text-indigo-800 flex items-center gap-2">
                <User className="h-5 w-5 text-indigo-600" />
                Profile Settings
              </CardTitle>
              <CardDescription className="text-indigo-600">
                Update your personal information and account details
              </CardDescription>
            </CardHeader>
            <CardContent className="p-6">
              <form onSubmit={handleProfileUpdate} className="space-y-6">
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="full_name" className="text-gray-700 font-medium">Full Name</Label>
                    <Input
                      id="full_name"
                      value={profileData.full_name}
                      onChange={(e) => setProfileData({ ...profileData, full_name: e.target.value })}
                      className="border-gray-200 focus:border-indigo-400 focus:ring-indigo-400"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email" className="text-gray-700 font-medium">Email Address</Label>
                    <Input
                      id="email"
                      type="email"
                      value={profileData.email}
                      onChange={(e) => setProfileData({ ...profileData, email: e.target.value })}
                      className="border-gray-200 focus:border-indigo-400 focus:ring-indigo-400"
                    />
                  </div>
                </div>
                <div className="flex items-center justify-end">
                  <Button 
                    type="submit" 
                    disabled={isLoading}
                    className="bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white"
                  >
                    {isLoading ? (
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    ) : (
                      <>
                        <Save className="mr-2 h-4 w-4" />
                        Save Changes
                      </>
                    )}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="preferences" className="mt-6">
          <Card className="border-0 shadow-lg bg-gradient-to-br from-white to-purple-50/50">
            <CardHeader className="bg-gradient-to-r from-purple-50 to-pink-50 border-b border-purple-100">
              <CardTitle className="text-purple-800 flex items-center gap-2">
                <Palette className="h-5 w-5 text-purple-600" />
                Appearance & Preferences
              </CardTitle>
              <CardDescription className="text-purple-600">
                Customize the look and feel of your salon management system
              </CardDescription>
            </CardHeader>
            <CardContent className="p-6">
              <div className="space-y-6">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="space-y-1">
                      <Label className="text-gray-700 font-medium">Theme</Label>
                      <p className="text-sm text-gray-500">Choose your preferred color scheme</p>
                    </div>
                    <Select value={preferences.theme} onValueChange={(value) => setPreferences({ ...preferences, theme: value })}>
                      <SelectTrigger className="w-32 border-purple-200 focus:border-purple-400 focus:ring-purple-400">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="light">Light</SelectItem>
                        <SelectItem value="dark">Dark</SelectItem>
                        <SelectItem value="auto">Auto</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <Separator />
                  <div className="flex items-center justify-between">
                    <div className="space-y-1">
                      <Label className="text-gray-700 font-medium">Language</Label>
                      <p className="text-sm text-gray-500">Select your preferred language</p>
                    </div>
                    <Select defaultValue="en">
                      <SelectTrigger className="w-32 border-purple-200 focus:border-purple-400 focus:ring-purple-400">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="en">English</SelectItem>
                        <SelectItem value="es">Español</SelectItem>
                        <SelectItem value="fr">Français</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="notifications" className="mt-6">
          <Card className="border-0 shadow-lg bg-gradient-to-br from-white to-pink-50/50">
            <CardHeader className="bg-gradient-to-r from-pink-50 to-rose-50 border-b border-pink-100">
              <CardTitle className="text-pink-800 flex items-center gap-2">
                <Bell className="h-5 w-5 text-pink-600" />
                Notification Preferences
              </CardTitle>
              <CardDescription className="text-pink-600">
                Configure how and when you receive notifications
              </CardDescription>
            </CardHeader>
            <CardContent className="p-6">
              <div className="space-y-6">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="space-y-1">
                      <Label className="text-gray-700 font-medium">Push Notifications</Label>
                      <p className="text-sm text-gray-500">Receive notifications in your browser</p>
                    </div>
                    <Switch 
                      checked={preferences.notifications} 
                      onCheckedChange={(checked) => setPreferences({ ...preferences, notifications: checked })}
                    />
                  </div>
                  <Separator />
                  <div className="flex items-center justify-between">
                    <div className="space-y-1">
                      <Label className="text-gray-700 font-medium">Email Alerts</Label>
                      <p className="text-sm text-gray-500">Get important updates via email</p>
                    </div>
                    <Switch 
                      checked={preferences.email_alerts} 
                      onCheckedChange={(checked) => setPreferences({ ...preferences, email_alerts: checked })}
                    />
                  </div>
                  <Separator />
                  <div className="flex items-center justify-between">
                    <div className="space-y-1">
                      <Label className="text-gray-700 font-medium">Low Stock Alerts</Label>
                      <p className="text-sm text-gray-500">Notify when inventory is running low</p>
                    </div>
                    <Switch 
                      checked={preferences.low_stock_alerts} 
                      onCheckedChange={(checked) => setPreferences({ ...preferences, low_stock_alerts: checked })}
                    />
                  </div>
                  <Separator />
                  <div className="flex items-center justify-between">
                    <div className="space-y-1">
                      <Label className="text-gray-700 font-medium">Payment Reminders</Label>
                      <p className="text-sm text-gray-500">Get reminders for pending payments</p>
                    </div>
                    <Switch 
                      checked={preferences.payment_reminders} 
                      onCheckedChange={(checked) => setPreferences({ ...preferences, payment_reminders: checked })}
                    />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="system" className="mt-6">
          <div className="grid gap-6 md:grid-cols-2">
            <Card className="border-0 shadow-lg bg-gradient-to-br from-white to-blue-50/50">
              <CardHeader className="bg-gradient-to-r from-blue-50 to-cyan-50 border-b border-blue-100">
                <CardTitle className="text-blue-800 flex items-center gap-2">
                  <Database className="h-5 w-5 text-blue-600" />
                  Database
                </CardTitle>
                <CardDescription className="text-blue-600">
                  System database information and status
                </CardDescription>
              </CardHeader>
              <CardContent className="p-6">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Status</span>
                    <Badge className="bg-emerald-100 text-emerald-800 border-emerald-200">Connected</Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Last Backup</span>
                    <span className="text-sm text-gray-800">2 hours ago</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Size</span>
                    <span className="text-sm text-gray-800">2.4 GB</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-lg bg-gradient-to-br from-white to-emerald-50/50">
              <CardHeader className="bg-gradient-to-r from-emerald-50 to-teal-50 border-b border-emerald-100">
                <CardTitle className="text-emerald-800 flex items-center gap-2">
                  <Shield className="h-5 w-5 text-emerald-600" />
                  Security
                </CardTitle>
                <CardDescription className="text-emerald-600">
                  Account security and privacy settings
                </CardDescription>
              </CardHeader>
              <CardContent className="p-6">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Two-Factor Auth</span>
                    <Badge variant="outline" className="text-gray-600">Disabled</Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Last Login</span>
                    <span className="text-sm text-gray-800">Today, 9:30 AM</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Session Timeout</span>
                    <span className="text-sm text-gray-800">24 hours</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <Card className="mt-6 border-0 shadow-lg bg-gradient-to-br from-white to-orange-50/50">
            <CardHeader className="bg-gradient-to-r from-orange-50 to-amber-50 border-b border-orange-100">
              <CardTitle className="text-orange-800 flex items-center gap-2">
                <Monitor className="h-5 w-5 text-orange-600" />
                System Information
              </CardTitle>
              <CardDescription className="text-orange-600">
                Technical details about your salon management system
              </CardDescription>
            </CardHeader>
            <CardContent className="p-6">
              <div className="grid gap-4 md:grid-cols-3">
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-gray-700">Version</Label>
                  <p className="text-sm text-gray-600">v1.2.0</p>
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-gray-700">Build Date</Label>
                  <p className="text-sm text-gray-600">Dec 15, 2024</p>
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-gray-700">Environment</Label>
                  <p className="text-sm text-gray-600">Production</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}