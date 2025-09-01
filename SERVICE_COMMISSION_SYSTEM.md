# Service-Specific Commission System

## Overview
The salon management system now supports flexible commission structures where different services can have different commission rates, providing more realistic and customizable compensation models.

## How It Works

### 1. Commission Rate Hierarchy
The system follows this priority order for commission calculations:
1. **Service-Specific Rate**: If a service has a custom commission rate, it takes precedence
2. **Worker Default Rate**: If no service-specific rate is set, uses the worker's default commission rate
3. **Fallback**: If neither is set, defaults to 0%

### 2. Commission Rate Management

#### Worker Commission Rates
- Set in the Workers management page
- Acts as the default rate for all services performed by that worker
- Can be edited directly from the WorkerPayroll view

#### Service Commission Rates
- Set per individual service
- Overrides worker default rate for that specific service
- Can be edited directly from the service history in WorkerPayroll
- Useful for premium services that deserve higher commission rates

### 3. Database Structure

#### Services Table
```sql
ALTER TABLE services 
ADD COLUMN commission_rate DECIMAL(5,2) DEFAULT NULL;
```

#### Workers Table
```sql
-- Already exists: commission_rate DECIMAL(5,2) DEFAULT 6.0
```

## Benefits

1. **Flexibility**: Different services can have different commission structures
2. **Fair Compensation**: Premium services can offer higher commission rates
3. **Worker Motivation**: Workers can see exactly how much they earn per service type
4. **Business Control**: Management can set competitive rates for different service categories

## Example Scenarios

### Scenario 1: Standard Haircut
- Service: Basic Haircut
- Service Commission Rate: NULL (not set)
- Worker Default Rate: 6%
- **Result**: Worker earns 6% of haircut price

### Scenario 2: Premium Styling
- Service: Premium Hair Styling
- Service Commission Rate: 10%
- Worker Default Rate: 6%
- **Result**: Worker earns 10% of styling price (higher rate for premium service)

### Scenario 3: Treatment Service
- Service: Hair Treatment
- Service Commission Rate: 8%
- Worker Default Rate: 6%
- **Result**: Worker earns 8% of treatment price

## Usage Instructions

### Editing Worker Commission Rates
1. Go to WorkerPayroll page
2. Click the edit icon (pencil) next to any commission worker's rate
3. Enter new rate and click "Update Commission Rate"

### Editing Service Commission Rates
1. Go to WorkerPayroll page
2. Click on a worker's details
3. In the service history table, click "Edit Rate" for any service
4. Enter new rate and click "Update Service Commission Rate"

### Setting Initial Service Commission Rates
1. Go to Services management page
2. Edit any service to set its commission rate
3. Leave as NULL to use worker default rate

## Migration Notes

- Existing services will have `commission_rate` set to NULL
- This means they'll use worker default rates (no breaking changes)
- You can gradually set service-specific rates as needed
- The system gracefully handles both old and new commission structures

## Best Practices

1. **Start with Worker Defaults**: Set reasonable default rates for each worker
2. **Set Service Rates Gradually**: Don't feel pressured to set rates for all services immediately
3. **Monitor Performance**: Use the payroll analytics to see how different rates affect worker motivation
4. **Regular Reviews**: Periodically review and adjust rates based on business performance
5. **Documentation**: Keep track of why certain services have specific rates

## Technical Implementation

- Real-time commission calculations
- Automatic earnings updates when rates change
- Audit trail of commission rate changes
- Performance optimized with database indexes
- Responsive UI for easy rate management


