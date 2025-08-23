import { useState, useEffect } from "react";
import { Bell, AlertTriangle, Info, CheckCircle, X, Filter } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

interface Alert {
  id: string;
  type: string;
  title: string;
  message: string;
  severity: string;
  entity_type: string | null;
  entity_id: string | null;
  is_read: boolean;
  expires_at: string | null;
  created_at: string;
}

export default function Alerts() {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filterSeverity, setFilterSeverity] = useState("all");
  const [filterType, setFilterType] = useState("all");
  const [filterRead, setFilterRead] = useState("all");
  
  const { user } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    fetchAlerts();
    // Set up real-time subscription
    const subscription = supabase
      .channel('alerts_channel')
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'alerts' 
      }, (payload) => {
        console.log('Alert change received!', payload);
        fetchAlerts();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(subscription);
    };
  }, []);

  const fetchAlerts = async () => {
    try {
      const { data, error } = await supabase
        .from("alerts")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setAlerts(data || []);
    } catch (error) {
      console.error("Error fetching alerts:", error);
      toast({
        title: "Error",
        description: "Failed to load alerts",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const markAsRead = async (alertId: string) => {
    try {
      const { error } = await supabase
        .from("alerts")
        .update({ is_read: true })
        .eq("id", alertId);

      if (error) throw error;
      
      setAlerts(prev => prev.map(alert => 
        alert.id === alertId ? { ...alert, is_read: true } : alert
      ));
      
      toast({ title: "Success", description: "Alert marked as read" });
    } catch (error) {
      console.error("Error marking alert as read:", error);
      toast({
        title: "Error",
        description: "Failed to mark alert as read",
        variant: "destructive",
      });
    }
  };

  const markAllAsRead = async () => {
    try {
      const { error } = await supabase
        .from("alerts")
        .update({ is_read: true })
        .eq("is_read", false);

      if (error) throw error;
      
      setAlerts(prev => prev.map(alert => ({ ...alert, is_read: true })));
      toast({ title: "Success", description: "All alerts marked as read" });
    } catch (error) {
      console.error("Error marking all alerts as read:", error);
      toast({
        title: "Error",
        description: "Failed to mark all alerts as read",
        variant: "destructive",
      });
    }
  };

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'critical':
      case 'error':
        return <AlertTriangle className="h-4 w-4" />;
      case 'warning':
        return <AlertTriangle className="h-4 w-4" />;
      case 'success':
        return <CheckCircle className="h-4 w-4" />;
      case 'info':
      default:
        return <Info className="h-4 w-4" />;
    }
  };

  const getSeverityBadge = (severity: string) => {
    switch (severity) {
      case 'critical':
        return <Badge variant="destructive">Critical</Badge>;
      case 'error':
        return <Badge variant="destructive">Error</Badge>;
      case 'warning':
        return <Badge className="bg-orange-100 text-orange-800">Warning</Badge>;
      case 'success':
        return <Badge className="bg-green-100 text-green-800">Success</Badge>;
      case 'info':
      default:
        return <Badge variant="secondary">Info</Badge>;
    }
  };

  const filteredAlerts = alerts.filter(alert => {
    if (filterSeverity !== "all" && alert.severity !== filterSeverity) return false;
    if (filterType !== "all" && alert.type !== filterType) return false;
    if (filterRead !== "all") {
      if (filterRead === "read" && !alert.is_read) return false;
      if (filterRead === "unread" && alert.is_read) return false;
    }
    return true;
  });

  const unreadCount = alerts.filter(alert => !alert.is_read).length;
  const criticalCount = alerts.filter(alert => alert.severity === 'critical').length;
  const warningCount = alerts.filter(alert => alert.severity === 'warning').length;

  const alertTypes = [...new Set(alerts.map(alert => alert.type))];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Alerts</h1>
          <p className="text-muted-foreground">System notifications and alerts</p>
        </div>
        {unreadCount > 0 && (
          <Button onClick={markAllAsRead}>
            <CheckCircle className="mr-2 h-4 w-4" />
            Mark All as Read
          </Button>
        )}
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Alerts</CardTitle>
            <Bell className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{alerts.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Unread</CardTitle>
            <Bell className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary">{unreadCount}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Critical</CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">{criticalCount}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Warnings</CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">{warningCount}</div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Alert Management</CardTitle>
          <CardDescription>
            View and manage system alerts and notifications
          </CardDescription>
          
          {/* Filters */}
          <div className="flex flex-wrap gap-4">
            <div className="flex items-center space-x-2">
              <Filter className="h-4 w-4" />
              <Select value={filterSeverity} onValueChange={setFilterSeverity}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="Severity" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Severities</SelectItem>
                  <SelectItem value="critical">Critical</SelectItem>
                  <SelectItem value="error">Error</SelectItem>
                  <SelectItem value="warning">Warning</SelectItem>
                  <SelectItem value="info">Info</SelectItem>
                  <SelectItem value="success">Success</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <Select value={filterType} onValueChange={setFilterType}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                {alertTypes.map(type => (
                  <SelectItem key={type} value={type}>{type}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            
            <Select value={filterRead} onValueChange={setFilterRead}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="unread">Unread</SelectItem>
                <SelectItem value="read">Read</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredAlerts.map((alert) => (
                <Card key={alert.id} className={`${!alert.is_read ? 'border-l-4 border-l-primary bg-primary/5' : ''}`}>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex items-start space-x-3 flex-1">
                        <div className="mt-0.5">
                          {getSeverityIcon(alert.severity)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-2">
                            <h3 className="font-semibold text-sm">{alert.title}</h3>
                            {getSeverityBadge(alert.severity)}
                            <Badge variant="outline" className="text-xs">
                              {alert.type}
                            </Badge>
                            {!alert.is_read && (
                              <Badge variant="default" className="text-xs">
                                New
                              </Badge>
                            )}
                          </div>
                          <p className="text-sm text-muted-foreground mb-2">
                            {alert.message}
                          </p>
                          <div className="flex items-center justify-between">
                            <span className="text-xs text-muted-foreground">
                              {new Date(alert.created_at).toLocaleString()}
                            </span>
                            {alert.expires_at && (
                              <span className="text-xs text-muted-foreground">
                                Expires: {new Date(alert.expires_at).toLocaleString()}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2 ml-4">
                        {!alert.is_read && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => markAsRead(alert.id)}
                          >
                            <CheckCircle className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
              
              {filteredAlerts.length === 0 && (
                <div className="text-center py-12">
                  <Bell className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No alerts found</h3>
                  <p className="text-muted-foreground">
                    {alerts.length === 0 
                      ? "You don't have any alerts yet." 
                      : "No alerts match your current filters."}
                  </p>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}