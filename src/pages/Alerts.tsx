import { useState, useEffect } from "react";
import { Bell, AlertTriangle, Info, CheckCircle, X, Filter, Zap, Shield, Eye, EyeOff, Clock } from "lucide-react";
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

  const getSeverityBadge = (severity: string) => {
    switch (severity) {
      case 'error':
        return <Badge className="bg-red-100 text-red-800 border-red-200 hover:bg-red-200">⚠ Error</Badge>;
      case 'warning':
        return <Badge className="bg-amber-100 text-amber-800 border-amber-200 hover:bg-amber-200">⚠ Warning</Badge>;
      case 'info':
        return <Badge className="bg-blue-100 text-blue-800 border-blue-200 hover:bg-blue-200">ℹ Info</Badge>;
      case 'success':
        return <Badge className="bg-emerald-100 text-emerald-800 border-emerald-200 hover:bg-emerald-200">✓ Success</Badge>;
      default:
        return <Badge variant="outline">{severity}</Badge>;
    }
  };

  const getTypeBadge = (type: string) => {
    const typeColors: { [key: string]: string } = {
      'low_stock': 'bg-orange-100 text-orange-800 border-orange-200',
      'expiring_soon': 'bg-red-100 text-red-800 border-red-200',
      'system': 'bg-indigo-100 text-indigo-800 border-indigo-200',
      'maintenance': 'bg-purple-100 text-purple-800 border-purple-200',
      'security': 'bg-pink-100 text-pink-800 border-pink-200',
    };
    
    const colorClass = typeColors[type.toLowerCase()] || 'bg-gray-100 text-gray-800 border-gray-200';
    return <Badge className={`${colorClass} hover:opacity-80`}>{type.replace('_', ' ')}</Badge>;
  };

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'error':
        return <AlertTriangle className="h-5 w-5 text-red-500" />;
      case 'warning':
        return <AlertTriangle className="h-5 w-5 text-amber-500" />;
      case 'info':
        return <Info className="h-5 w-5 text-blue-500" />;
      case 'success':
        return <CheckCircle className="h-5 w-5 text-emerald-500" />;
      default:
        return <Bell className="h-5 w-5 text-gray-500" />;
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
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
          <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-amber-600 to-orange-600 bg-clip-text text-transparent">
            Alerts
          </h1>
          <p className="text-muted-foreground">Monitor and manage system alerts and notifications</p>
        </div>
        <div className="flex items-center gap-2">
          <Button 
            variant="outline"
            onClick={markAllAsRead}
            className="border-amber-200 text-amber-700 hover:bg-amber-50 hover:border-amber-300"
          >
            <Eye className="mr-2 h-4 w-4" />
            Mark All Read
          </Button>
        </div>
      </div>

      <Card className="border-0 shadow-lg bg-gradient-to-br from-white to-amber-50/50">
        <CardHeader className="bg-gradient-to-r from-amber-50 to-orange-50 border-b border-amber-100">
          <CardTitle className="text-amber-800 flex items-center gap-2">
            <Bell className="h-5 w-5 text-amber-600" />
            Alert Center
          </CardTitle>
          <CardDescription className="text-amber-600">
            Stay informed about important events and system status
          </CardDescription>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-amber-500" />
              <Select value={filterSeverity} onValueChange={setFilterSeverity}>
                <SelectTrigger className="w-32 border-amber-200 focus:border-amber-400 focus:ring-amber-400">
                  <SelectValue placeholder="Severity" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Severity</SelectItem>
                  <SelectItem value="error">Error</SelectItem>
                  <SelectItem value="warning">Warning</SelectItem>
                  <SelectItem value="info">Info</SelectItem>
                  <SelectItem value="success">Success</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-2">
              <Select value={filterType} onValueChange={setFilterType}>
                <SelectTrigger className="w-32 border-amber-200 focus:border-amber-400 focus:ring-amber-400">
                  <SelectValue placeholder="Type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="low_stock">Low Stock</SelectItem>
                  <SelectItem value="expiring_soon">Expiring Soon</SelectItem>
                  <SelectItem value="system">System</SelectItem>
                  <SelectItem value="maintenance">Maintenance</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-2">
              <Select value={filterRead} onValueChange={setFilterRead}>
                <SelectTrigger className="w-32 border-amber-200 focus:border-amber-400 focus:ring-amber-400">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="unread">Unread</SelectItem>
                  <SelectItem value="read">Read</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-6">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-amber-600"></div>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredAlerts.map((alert) => (
                <div
                  key={alert.id}
                  className={`p-4 rounded-lg border transition-all duration-200 ${
                    alert.is_read
                      ? 'bg-gray-50 border-gray-200'
                      : 'bg-white border-amber-200 shadow-md'
                  } ${!alert.is_read ? 'ring-2 ring-amber-100' : ''}`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-3 flex-1">
                      <div className="mt-1">
                        {getSeverityIcon(alert.severity)}
                      </div>
                      <div className="flex-1 space-y-2">
                        <div className="flex items-center gap-3">
                          <h3 className={`font-semibold ${alert.is_read ? 'text-gray-600' : 'text-gray-900'}`}>
                            {alert.title}
                          </h3>
                          <div className="flex items-center gap-2">
                            {getSeverityBadge(alert.severity)}
                            {getTypeBadge(alert.type)}
                          </div>
                        </div>
                        <p className={`text-sm ${alert.is_read ? 'text-gray-500' : 'text-gray-700'}`}>
                          {alert.message}
                        </p>
                        <div className="flex items-center gap-4 text-xs text-gray-500">
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {formatDate(alert.created_at)}
                          </span>
                          {alert.entity_type && (
                            <span className="flex items-center gap-1">
                              <Shield className="h-3 w-3" />
                              {alert.entity_type}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {!alert.is_read && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => markAsRead(alert.id)}
                          className="text-amber-600 hover:text-amber-700 hover:bg-amber-50"
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                      )}
                      {alert.is_read && (
                        <Badge variant="outline" className="text-gray-500">
                          <EyeOff className="mr-1 h-3 w-3" />
                          Read
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
              ))}
              {filteredAlerts.length === 0 && (
                <div className="text-center py-12 text-muted-foreground">
                  <Bell className="h-16 w-16 mx-auto mb-4 text-gray-300" />
                  <p className="text-lg font-medium text-gray-500">No alerts found</p>
                  <p className="text-sm text-gray-400">You're all caught up! No alerts to display.</p>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}