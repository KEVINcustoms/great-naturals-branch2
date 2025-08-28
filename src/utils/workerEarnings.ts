import { supabase } from "@/integrations/supabase/client";

export interface WorkerEarnings {
  worker_id: string;
  service_price: number;
  commission_rate: number;
  commission_amount: number;
  service_date: string;
}

/**
 * Calculate and update worker earnings when a service is completed
 * This function should be called from the Services page when a service is added/updated
 */
export const updateWorkerEarnings = async (
  workerId: string,
  servicePrice: number,
  serviceDate: string = new Date().toISOString()
) => {
  try {
    // Get worker details to check payment type and commission rate
    const { data: worker, error: workerError } = await supabase
      .from("workers")
      .select("payment_type, commission_rate, total_earnings, current_month_earnings, services_performed")
      .eq("id", workerId)
      .single();

    if (workerError) throw workerError;

    // Only calculate earnings for commission-based workers
    if (worker.payment_type !== 'commission') {
      return { success: true, message: "Worker is on monthly salary - no commission calculated" };
    }

    const commissionRate = worker.commission_rate || 6;
    const commissionAmount = (servicePrice * commissionRate) / 100;

    // Calculate new totals
    const newTotalEarnings = (worker.total_earnings || 0) + commissionAmount;
    const newServicesPerformed = (worker.services_performed || 0) + 1;

    // Check if service is in current month
    const serviceDateObj = new Date(serviceDate);
    const currentDate = new Date();
    const isCurrentMonth = serviceDateObj.getMonth() === currentDate.getMonth() &&
                          serviceDateObj.getFullYear() === currentDate.getFullYear();

    let newCurrentMonthEarnings = worker.current_month_earnings || 0;
    if (isCurrentMonth) {
      newCurrentMonthEarnings += commissionAmount;
    }

    // Update worker with new earnings
    const { error: updateError } = await supabase
      .from("workers")
      .update({
        total_earnings: newTotalEarnings,
        current_month_earnings: newCurrentMonthEarnings,
        services_performed: newServicesPerformed
      })
      .eq("id", workerId);

    if (updateError) throw updateError;

    return {
      success: true,
      message: `Commission calculated: ${commissionAmount.toFixed(2)} (${commissionRate}% of ${servicePrice})`,
      data: {
        commissionAmount,
        newTotalEarnings,
        newCurrentMonthEarnings,
        newServicesPerformed
      }
    };

  } catch (error) {
    console.error("Error updating worker earnings:", error);
    return {
      success: false,
      message: "Failed to update worker earnings",
      error
    };
  }
};

/**
 * Recalculate all worker earnings from services
 * This is useful for maintenance or when earnings get out of sync
 */
export const recalculateAllWorkerEarnings = async () => {
  try {
    // Get all commission-based workers
    const { data: workers, error: workersError } = await supabase
      .from("workers")
      .select("id, payment_type, commission_rate")
      .eq("payment_type", "commission");

    if (workersError) throw workersError;

    const results = [];

    for (const worker of workers) {
      // Get all services for this worker
      const { data: services, error: servicesError } = await supabase
        .from("services")
        .select("service_price, created_at")
        .eq("staff_member_id", worker.id);

      if (servicesError) {
        results.push({ workerId: worker.id, success: false, error: servicesError });
        continue;
      }

      if (services && services.length > 0) {
        const totalEarnings = services.reduce((sum, service) => {
          const commission = (service.service_price * (worker.commission_rate || 6)) / 100;
          return sum + commission;
        }, 0);

        // Calculate current month earnings
        const currentMonth = new Date().getMonth();
        const currentYear = new Date().getFullYear();
        const currentMonthEarnings = services.reduce((sum, service) => {
          const serviceDate = new Date(service.created_at);
          if (serviceDate.getMonth() === currentMonth && serviceDate.getFullYear() === currentYear) {
            const commission = (service.service_price * (worker.commission_rate || 6)) / 100;
            return sum + commission;
          }
          return sum;
        }, 0);

        // Update worker
        const { error: updateError } = await supabase
          .from("workers")
          .update({
            total_earnings: totalEarnings,
            current_month_earnings: currentMonthEarnings,
            services_performed: services.length
          })
          .eq("id", worker.id);

        if (updateError) {
          results.push({ workerId: worker.id, success: false, error: updateError });
        } else {
          results.push({
            workerId: worker.id,
            success: true,
            totalEarnings,
            currentMonthEarnings,
            servicesPerformed: services.length
          });
        }
      }
    }

    return { success: true, results };

  } catch (error) {
    console.error("Error recalculating all worker earnings:", error);
    return { success: false, error };
  }
};
