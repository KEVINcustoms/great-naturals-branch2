import { useState, useEffect } from "react";
import { Save, User, Bell, Database, Shield, Palette } from "lucide-react";
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
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
        <p className="text-muted-foreground">
          Manage your account and application preferences
        </p>
      </div>

      <Tabs defaultValue="profile" className="space-y-4">
        <TabsList>
          <TabsTrigger value="profile">Profile</TabsTrigger>
          <TabsTrigger value="notifications">Notifications</TabsTrigger>
          <TabsTrigger value="system">System</TabsTrigger>
          <TabsTrigger value="security">Security</TabsTrigger>
        </TabsList>

        <TabsContent value="profile">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                Profile Information
              </CardTitle>
              <CardDescription>
                Update your personal information and account details
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleProfileUpdate} className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="full_name">Full Name</Label>
                    <Input
                      id="full_name"
                      value={profileData.full_name}
                      onChange={(e) => setProfileData({ ...profileData, full_name: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      value={profileData.email}
                      onChange={(e) => setProfileData({ ...profileData, email: e.target.value })}
                    />
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label>Role</Label>
                  <div className="flex items-center space-x-2">
                    <span className="px-2 py-1 bg-primary/10 text-primary rounded-md text-sm">
                      {profile?.role || 'User'}
                    </span>
                    <span className="text-sm text-muted-foreground">
                      Contact an administrator to change your role
                    </span>
                  </div>
                </div>

                <Button type="submit" disabled={isLoading}>
                  <Save className="mr-2 h-4 w-4" />
                  {isLoading ? "Saving..." : "Save Changes"}
                </Button>
              </form>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="notifications">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bell className="h-5 w-5" />
                Notification Preferences
              </CardTitle>
              <CardDescription>
                Configure how you receive notifications and alerts
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Push Notifications</Label>
                    <p className="text-sm text-muted-foreground">
                      Receive notifications in the application
                    </p>
                  </div>
                  <Switch
                    checked={preferences.notifications}
                    onCheckedChange={(checked) => 
                      setPreferences({ ...preferences, notifications: checked })
                    }
                  />
                </div>

                <Separator />

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Email Alerts</Label>
                    <p className="text-sm text-muted-foreground">
                      Receive important alerts via email
                    </p>
                  </div>
                  <Switch
                    checked={preferences.email_alerts}
                    onCheckedChange={(checked) => 
                      setPreferences({ ...preferences, email_alerts: checked })
                    }
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Low Stock Alerts</Label>
                    <p className="text-sm text-muted-foreground">
                      Get notified when inventory is running low
                    </p>
                  </div>
                  <Switch
                    checked={preferences.low_stock_alerts}
                    onCheckedChange={(checked) => 
                      setPreferences({ ...preferences, low_stock_alerts: checked })
                    }
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Payment Reminders</Label>
                    <p className="text-sm text-muted-foreground">
                      Receive reminders about pending payments
                    </p>
                  </div>
                  <Switch
                    checked={preferences.payment_reminders}
                    onCheckedChange={(checked) => 
                      setPreferences({ ...preferences, payment_reminders: checked })
                    }
                  />
                </div>
              </div>

              <Separator />

              <div className="space-y-4">
                <h4 className="font-medium">Alert Management</h4>
                <div className="flex gap-2">
                  <Button variant="outline" onClick={handleTestAlert}>
                    <Bell className="mr-2 h-4 w-4" />
                    Create Test Alert
                  </Button>
                  <Button variant="outline" onClick={handleCreateLowStockAlert}>
                    <Bell className="mr-2 h-4 w-4" />
                    Generate Low Stock Alerts
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="system">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Database className="h-5 w-5" />
                System Preferences
              </CardTitle>
              <CardDescription>
                Configure system-wide settings and preferences
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Theme</Label>
                  <Select value={preferences.theme} onValueChange={(value) => setPreferences({ ...preferences, theme: value })}>
                    <SelectTrigger className="w-48">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="light">Light</SelectItem>
                      <SelectItem value="dark">Dark</SelectItem>
                      <SelectItem value="system">System</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <Separator />

                <div className="space-y-4">
                  <h4 className="font-medium">Data Management</h4>
                  <div className="grid gap-4 md:grid-cols-2">
                    <Card className="p-4">
                      <h5 className="font-medium mb-2">Database Status</h5>
                      <p className="text-sm text-muted-foreground mb-3">
                        Real-time updates are enabled for all tables
                      </p>
                      <div className="flex items-center gap-2">
                        <div className="h-2 w-2 rounded-full bg-green-500"></div>
                        <span className="text-sm text-green-600">Connected</span>
                      </div>
                    </Card>
                    
                    <Card className="p-4">
                      <h5 className="font-medium mb-2">Backup Status</h5>
                      <p className="text-sm text-muted-foreground mb-3">
                        Automatic backups are managed by Supabase
                      </p>
                      <div className="flex items-center gap-2">
                        <div className="h-2 w-2 rounded-full bg-blue-500"></div>
                        <span className="text-sm text-blue-600">Automated</span>
                      </div>
                    </Card>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="security">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5" />
                Security Settings
              </CardTitle>
              <CardDescription>
                Manage your account security and access permissions
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <Card className="p-4">
                    <h5 className="font-medium mb-2">Authentication</h5>
                    <p className="text-sm text-muted-foreground mb-3">
                      Secure authentication powered by Supabase
                    </p>
                    <div className="flex items-center gap-2">
                      <div className="h-2 w-2 rounded-full bg-green-500"></div>
                      <span className="text-sm text-green-600">Active</span>
                    </div>
                  </Card>
                  
                  <Card className="p-4">
                    <h5 className="font-medium mb-2">Row Level Security</h5>
                    <p className="text-sm text-muted-foreground mb-3">
                      Database access is protected with RLS policies
                    </p>
                    <div className="flex items-center gap-2">
                      <div className="h-2 w-2 rounded-full bg-green-500"></div>
                      <span className="text-sm text-green-600">Enabled</span>
                    </div>
                  </Card>
                </div>

                <Separator />

                <div className="space-y-4">
                  <h4 className="font-medium">Account Actions</h4>
                  <div className="space-y-2">
                    <Button variant="outline" disabled>
                      Change Password
                      <span className="ml-2 text-xs text-muted-foreground">
                        (Use Supabase Auth)
                      </span>
                    </Button>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Password changes are handled securely through Supabase authentication.
                    Contact your administrator for password reset options.
                  </p>
                </div>

                <Separator />

                <div className="space-y-4">
                  <h4 className="font-medium">Permission Summary</h4>
                  <div className="space-y-2">
                    <div className="flex justify-between items-center py-2 px-3 bg-muted/50 rounded">
                      <span className="text-sm">Customers</span>
                      <span className="text-sm text-muted-foreground">
                        {profile?.role === 'admin' ? 'Full Access' : 'Own Records Only'}
                      </span>
                    </div>
                    <div className="flex justify-between items-center py-2 px-3 bg-muted/50 rounded">
                      <span className="text-sm">Workers</span>
                      <span className="text-sm text-muted-foreground">
                        {profile?.role === 'admin' ? 'Full Access' : 'Read Only'}
                      </span>
                    </div>
                    <div className="flex justify-between items-center py-2 px-3 bg-muted/50 rounded">
                      <span className="text-sm">Inventory</span>
                      <span className="text-sm text-muted-foreground">
                        {profile?.role === 'admin' ? 'Full Access' : 'Read/Edit Own'}
                      </span>
                    </div>
                    <div className="flex justify-between items-center py-2 px-3 bg-muted/50 rounded">
                      <span className="text-sm">Alerts</span>
                      <span className="text-sm text-muted-foreground">Read Only</span>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}