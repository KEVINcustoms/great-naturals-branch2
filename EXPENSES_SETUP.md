# Expenses Table Setup Guide

## Overview
The Financial Analytics page now includes an "Add Expenses" tab that allows users to dynamically add and track business expenses. However, the database table needs to be created first.

## Setup Steps

### 1. Run the Database Migration
In your Supabase dashboard:

1. Go to **SQL Editor**
2. Copy and paste the contents of `supabase/migrations/20250101000000_create_expenses_table.sql`
3. Click **Run** to execute the migration

### 2. What the Migration Creates
- **`expenses` table** with columns:
  - `id` (UUID, Primary Key)
  - `name` (Text) - Expense description
  - `category` (Text) - Expense category
  - `amount` (Decimal) - Expense amount in TZS
  - `date` (Date) - When the expense occurred
  - `created_by` (UUID) - User who created the expense
  - `created_at` (Timestamp) - When the record was created
  - `updated_at` (Timestamp) - When the record was last updated

### 3. Security Features
- **Row Level Security (RLS)** enabled
- Users can only see and manage their own expenses
- Automatic timestamp updates via database triggers

### 4. After Setup
Once the migration is complete:
- The "Add Expenses" tab will work properly
- Users can add unlimited expense fields
- Expenses will be stored securely in Supabase
- Recent expenses will be displayed
- All currency will be shown in Tanzanian Shillings (TZS)

## Troubleshooting

### "relation 'expenses' does not exist" Error
- Make sure you've run the migration file
- Check that the table was created successfully in Supabase

### Permission Denied Error
- Ensure RLS policies are in place
- Check that the user is properly authenticated

### TypeScript Errors
- These are expected until the table exists
- The `as never` type assertions are temporary workarounds

## Categories Available
- Inventory
- Utilities
- Staff Salaries
- Marketing
- Maintenance
- Rent
- Insurance
- Other

## Features
- ✅ Dynamic expense field addition
- ✅ Category selection
- ✅ Amount input in TZS
- ✅ Form validation
- ✅ Real-time database storage
- ✅ Recent expenses display
- ✅ Secure user isolation
- ✅ Automatic timestamps
