-- Migration: Add earnings tracking columns to workers table
-- This script adds columns to track worker earnings from services

-- Add earnings tracking columns
ALTER TABLE workers 
ADD COLUMN total_earnings DECIMAL(10,2) DEFAULT 0.00,
ADD COLUMN current_month_earnings DECIMAL(10,2) DEFAULT 0.00,
ADD COLUMN services_performed INTEGER DEFAULT 0;

-- Add comment for documentation
COMMENT ON COLUMN workers.total_earnings IS 'Total earnings from commission-based services';
COMMENT ON COLUMN workers.current_month_earnings IS 'Earnings from commission-based services in current month';
COMMENT ON COLUMN workers.services_performed IS 'Total number of services performed by this worker';

-- Verify the changes
SELECT column_name, data_type, is_nullable, column_default 
FROM information_schema.columns 
WHERE table_name = 'workers' 
AND column_name IN ('total_earnings', 'current_month_earnings', 'services_performed');
