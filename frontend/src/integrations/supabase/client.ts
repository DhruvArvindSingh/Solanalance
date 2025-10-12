// Updated to use custom API client instead of Supabase
import { apiClient } from '@/lib/api-client';

// Import the supabase client like this:
// import { supabase } from "@/integrations/supabase/client";

export const supabase = apiClient;