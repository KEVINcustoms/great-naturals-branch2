-- Add commission_rate column to services table
-- This allows different services to have different commission rates
-- If no service-specific rate is set, it will fall back to the worker's default rate

ALTER TABLE services 
ADD COLUMN IF NOT EXISTS commission_rate DECIMAL(5,2) DEFAULT NULL;

-- Add comment to explain the column
COMMENT ON COLUMN services.commission_rate IS 'Service-specific commission rate as percentage. If NULL, uses worker default rate.';

-- Create index for better performance when querying by commission rate
CREATE INDEX IF NOT EXISTS idx_services_commission_rate ON services(commission_rate);

-- Update existing services to have a default commission rate if needed
-- You can customize this based on your business logic
-- UPDATE services SET commission_rate = 6.0 WHERE commission_rate IS NULL;
