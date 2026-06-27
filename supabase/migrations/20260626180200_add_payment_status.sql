-- Migration: Add paymentStatus to income and refreshments
-- Description: Ensures all three transactional tables have the paymentStatus column to support UI edits and upserts.

ALTER TABLE income 
ADD COLUMN IF NOT EXISTS "paymentStatus" text DEFAULT 'Received';

ALTER TABLE refreshments 
ADD COLUMN IF NOT EXISTS "paymentStatus" text DEFAULT 'Paid';

ALTER TABLE expenses 
ADD COLUMN IF NOT EXISTS "paymentStatus" text DEFAULT 'Paid';
