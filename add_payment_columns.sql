-- Migration: Add payment_type and commission_rate columns to workers table
-- This script adds new columns without dropping the existing table

-- Add payment_type column with default value
ALTER TABLE workers 
ADD COLUMN payment_type VARCHAR(20) DEFAULT 'monthly' CHECK (payment_type IN ('monthly', 'commission'));

-- Add commission_rate column with default value
ALTER TABLE workers 
ADD COLUMN commission_rate DECIMAL(5,2) DEFAULT 6.00 CHECK (commission_rate >= 0 AND commission_rate <= 100);

-- Update existing records to have default values
UPDATE workers 
SET payment_type = 'monthly', commission_rate = 6.00 
WHERE payment_type IS NULL OR commission_rate IS NULL;

-- Make the columns NOT NULL after setting default values
ALTER TABLE workers 
ALTER COLUMN payment_type SET NOT NULL,
ALTER COLUMN commission_rate SET NOT NULL;

-- Add comment for documentation
COMMENT ON COLUMN workers.payment_type IS 'Payment type: monthly salary or commission based';
COMMENT ON COLUMN workers.commission_rate IS 'Commission rate as percentage (0-100)';

-- Verify the changes
SELECT column_name, data_type, is_nullable, column_default 
FROM information_schema.columns 
WHERE table_name = 'workers' 
AND column_name IN ('payment_type', 'commission_rate');
