-- Add updated_at and deleted_at columns to messages table
ALTER TABLE "messages" 
ADD COLUMN IF NOT EXISTS "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN IF NOT EXISTS "deleted_at" TIMESTAMPTZ(6);

-- Create index for deleted messages
CREATE INDEX IF NOT EXISTS "messages_deleted_at_idx" ON "messages"("deleted_at");

