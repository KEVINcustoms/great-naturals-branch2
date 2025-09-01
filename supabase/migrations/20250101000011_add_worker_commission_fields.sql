-- Add commission_rate and payment_type columns to workers table
-- This enables commission-based payroll calculations

-- Add commission_rate column to workers table
ALTER TABLE public.workers 
ADD COLUMN IF NOT EXISTS commission_rate DECIMAL(5,2) DEFAULT 10.0;

-- Add payment_type column to workers table
ALTER TABLE public.workers 
ADD COLUMN IF NOT EXISTS payment_type TEXT DEFAULT 'monthly' CHECK (payment_type IN ('monthly', 'commission'));

-- Add comments for documentation
COMMENT ON COLUMN public.workers.commission_rate IS 'Commission rate as percentage for commission-based workers. Default 10%.';
COMMENT ON COLUMN public.workers.payment_type IS 'Payment type: monthly (fixed salary) or commission (performance-based).';

-- Create index for better performance when querying by payment type
CREATE INDEX IF NOT EXISTS idx_workers_payment_type ON public.workers(payment_type);
CREATE INDEX IF NOT EXISTS idx_workers_commission_rate ON public.workers(commission_rate);

-- Update existing workers to have appropriate payment types
-- Set workers with salary > 0 to 'monthly', others to 'commission'
UPDATE public.workers 
SET payment_type = CASE 
    WHEN salary > 0 THEN 'monthly'
    ELSE 'commission'
END
WHERE payment_type IS NULL OR payment_type = 'monthly';

-- Set default commission rate for commission workers
UPDATE public.workers 
SET commission_rate = 10.0 
WHERE payment_type = 'commission' AND (commission_rate IS NULL OR commission_rate = 0);

-- Set commission rate to 0 for monthly workers (they don't earn commission)
UPDATE public.workers 
SET commission_rate = 0 
WHERE payment_type = 'monthly';
