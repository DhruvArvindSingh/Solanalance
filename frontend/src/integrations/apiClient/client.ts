// Updated to use custom API client instead of apiClient
import { apiClient as a } from '@/lib/api-client';

// Import the apiClient client like this:
// import { apiClient } from "@/integrations/apiClient/client";

export const apiClient = a;