export type Json =
    | string
    | number
    | boolean
    | null
    | { [key: string]: Json | undefined }
    | Json[]

export type Database = {
    // Allows to automatically instantiate createClient with right options
    // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
    __InternalSupabase: {
        PostgrestVersion: "13.0.5"
    }
    public: {
        Tables: {
            applications: {
                Row: {
                    cover_letter: string | null
                    created_at: string
                    estimated_completion_days: number
                    freelancer_id: string
                    id: string
                    job_id: string
                    portfolio_urls: string[] | null
                    status: string
                    updated_at: string
                }
                Insert: {
                    cover_letter?: string | null
                    created_at?: string
                    estimated_completion_days: number
                    freelancer_id: string
                    id?: string
                    job_id: string
                    portfolio_urls?: string[] | null
                    status?: string
                    updated_at?: string
                }
                Update: {
                    cover_letter?: string | null
                    created_at?: string
                    estimated_completion_days?: number
                    freelancer_id?: string
                    id?: string
                    job_id?: string
                    portfolio_urls?: string[] | null
                    status?: string
                    updated_at?: string
                }
                Relationships: []
            }
            jobs: {
                Row: {
                    category: string | null
                    closed_at: string | null
                    created_at: string
                    description: string
                    experience_level: string
                    id: string
                    project_duration: string | null
                    recruiter_id: string
                    selected_freelancer_id: string | null
                    skills: string[]
                    status: string
                    title: string
                    total_payment: number
                    updated_at: string
                    views_count: number
                }
                Insert: {
                    category?: string | null
                    closed_at?: string | null
                    created_at?: string
                    description: string
                    experience_level?: string
                    id?: string
                    project_duration?: string | null
                    recruiter_id: string
                    selected_freelancer_id?: string | null
                    skills?: string[]
                    status?: string
                    title: string
                    total_payment: number
                    updated_at?: string
                    views_count?: number
                }
                Update: {
                    category?: string | null
                    closed_at?: string | null
                    created_at?: string
                    description?: string
                    experience_level?: string
                    id?: string
                    project_duration?: string | null
                    recruiter_id?: string
                    selected_freelancer_id?: string | null
                    skills?: string[]
                    status?: string
                    title?: string
                    total_payment?: number
                    updated_at?: string
                    views_count?: number
                }
                Relationships: []
            }
            job_stages: {
                Row: {
                    created_at: string
                    description: string | null
                    id: string
                    job_id: string
                    name: string
                    payment: number
                    stage_number: number
                }
                Insert: {
                    created_at?: string
                    description?: string | null
                    id?: string
                    job_id: string
                    name: string
                    payment: number
                    stage_number: number
                }
                Update: {
                    created_at?: string
                    description?: string | null
                    id?: string
                    job_id?: string
                    name?: string
                    payment?: number
                    stage_number?: number
                }
                Relationships: []
            }
            messages: {
                Row: {
                    content: string
                    created_at: string
                    file_name: string | null
                    file_size: number | null
                    file_url: string | null
                    id: string
                    is_read: boolean
                    message_type: string
                    project_id: string
                    sender_id: string
                }
                Insert: {
                    content: string
                    created_at?: string
                    file_name?: string | null
                    file_size?: number | null
                    file_url?: string | null
                    id?: string
                    is_read?: boolean
                    message_type?: string
                    project_id: string
                    sender_id: string
                }
                Update: {
                    content?: string
                    created_at?: string
                    file_name?: string | null
                    file_size?: number | null
                    file_url?: string | null
                    id?: string
                    is_read?: boolean
                    message_type?: string
                    project_id?: string
                    sender_id?: string
                }
                Relationships: []
            }
            milestones: {
                Row: {
                    created_at: string
                    id: string
                    payment_amount: number
                    payment_released: boolean
                    project_id: string
                    reviewed_at: string | null
                    reviewer_comments: string | null
                    stage_id: string
                    stage_number: number
                    status: string
                    submission_description: string | null
                    submission_files: string[] | null
                    submission_links: string[] | null
                    submitted_at: string | null
                }
                Insert: {
                    created_at?: string
                    id?: string
                    payment_amount: number
                    payment_released?: boolean
                    project_id: string
                    reviewed_at?: string | null
                    reviewer_comments?: string | null
                    stage_id: string
                    stage_number: number
                    status?: string
                    submission_description?: string | null
                    submission_files?: string[] | null
                    submission_links?: string[] | null
                    submitted_at?: string | null
                }
                Update: {
                    created_at?: string
                    id?: string
                    payment_amount?: number
                    payment_released?: boolean
                    project_id?: string
                    reviewed_at?: string | null
                    reviewer_comments?: string | null
                    stage_id?: string
                    stage_number?: number
                    status?: string
                    submission_description?: string | null
                    submission_files?: string[] | null
                    submission_links?: string[] | null
                    submitted_at?: string | null
                }
                Relationships: []
            }
            notifications: {
                Row: {
                    created_at: string
                    id: string
                    is_read: boolean
                    message: string
                    related_id: string | null
                    title: string
                    type: string
                    user_id: string
                }
                Insert: {
                    created_at?: string
                    id?: string
                    is_read?: boolean
                    message: string
                    related_id?: string | null
                    title: string
                    type: string
                    user_id: string
                }
                Update: {
                    created_at?: string
                    id?: string
                    is_read?: boolean
                    message?: string
                    related_id?: string | null
                    title?: string
                    type?: string
                    user_id?: string
                }
                Relationships: []
            }
            profiles: {
                Row: {
                    avatar_url: string | null
                    bio: string | null
                    company_name: string | null
                    created_at: string
                    email: string
                    full_name: string
                    hourly_rate: number | null
                    id: string
                    skills: string[] | null
                    updated_at: string
                }
                Insert: {
                    avatar_url?: string | null
                    bio?: string | null
                    company_name?: string | null
                    created_at?: string
                    email: string
                    full_name: string
                    hourly_rate?: number | null
                    id: string
                    skills?: string[] | null
                    updated_at?: string
                }
                Update: {
                    avatar_url?: string | null
                    bio?: string | null
                    company_name?: string | null
                    created_at?: string
                    email?: string
                    full_name?: string
                    hourly_rate?: number | null
                    id?: string
                    skills?: string[] | null
                    updated_at?: string
                }
                Relationships: []
            }
            projects: {
                Row: {
                    completed_at: string | null
                    created_at: string
                    current_stage: number
                    freelancer_id: string
                    id: string
                    job_id: string
                    recruiter_id: string
                    started_at: string
                    status: string
                }
                Insert: {
                    completed_at?: string | null
                    created_at?: string
                    current_stage?: number
                    freelancer_id: string
                    id?: string
                    job_id: string
                    recruiter_id: string
                    started_at?: string
                    status?: string
                }
                Update: {
                    completed_at?: string | null
                    created_at?: string
                    current_stage?: number
                    freelancer_id?: string
                    id?: string
                    job_id?: string
                    recruiter_id?: string
                    started_at?: string
                    status?: string
                }
                Relationships: []
            }
            ratings: {
                Row: {
                    communication_rating: number
                    created_at: string
                    id: string
                    is_public: boolean
                    overall_rating: number
                    professionalism_rating: number
                    project_id: string
                    quality_rating: number
                    ratee_id: string
                    rater_id: string
                    review_text: string | null
                    updated_at: string
                }
                Insert: {
                    communication_rating: number
                    created_at?: string
                    id?: string
                    is_public?: boolean
                    overall_rating: number
                    professionalism_rating: number
                    project_id: string
                    quality_rating: number
                    ratee_id: string
                    rater_id: string
                    review_text?: string | null
                    updated_at?: string
                }
                Update: {
                    communication_rating?: number
                    created_at?: string
                    id?: string
                    is_public?: boolean
                    overall_rating?: number
                    professionalism_rating?: number
                    project_id?: string
                    quality_rating?: number
                    ratee_id?: string
                    rater_id?: string
                    review_text?: string | null
                    updated_at?: string
                }
                Relationships: []
            }
            staking: {
                Row: {
                    created_at: string
                    id: string
                    project_id: string
                    recruiter_id: string
                    total_released: number
                    total_staked: number
                    transaction_signature: string
                    updated_at: string
                    wallet_address: string
                }
                Insert: {
                    created_at?: string
                    id?: string
                    project_id: string
                    recruiter_id: string
                    total_released?: number
                    total_staked: number
                    transaction_signature: string
                    updated_at?: string
                    wallet_address: string
                }
                Update: {
                    created_at?: string
                    id?: string
                    project_id?: string
                    recruiter_id?: string
                    total_released?: number
                    total_staked?: number
                    transaction_signature?: string
                    updated_at?: string
                    wallet_address?: string
                }
                Relationships: []
            }
            transactions: {
                Row: {
                    amount: number
                    created_at: string
                    from_user_id: string
                    id: string
                    milestone_id: string | null
                    project_id: string | null
                    status: string
                    to_user_id: string | null
                    type: string
                    wallet_from: string
                    wallet_signature: string
                    wallet_to: string | null
                }
                Insert: {
                    amount: number
                    created_at?: string
                    from_user_id: string
                    id?: string
                    milestone_id?: string | null
                    project_id?: string | null
                    status?: string
                    to_user_id?: string | null
                    type: string
                    wallet_from: string
                    wallet_signature: string
                    wallet_to?: string | null
                }
                Update: {
                    amount?: number
                    created_at?: string
                    from_user_id?: string
                    id?: string
                    milestone_id?: string | null
                    project_id?: string | null
                    status?: string
                    to_user_id?: string | null
                    type?: string
                    wallet_from?: string
                    wallet_signature?: string
                    wallet_to?: string | null
                }
                Relationships: []
            }
            trust_points: {
                Row: {
                    average_rating: number | null
                    completed_projects: number
                    created_at: string
                    id: string
                    last_calculated_at: string
                    successful_projects: number
                    tier: string
                    total_points: number
                    user_id: string
                }
                Insert: {
                    average_rating?: number | null
                    completed_projects?: number
                    created_at?: string
                    id?: string
                    last_calculated_at?: string
                    successful_projects?: number
                    tier?: string
                    total_points?: number
                    user_id: string
                }
                Update: {
                    average_rating?: number | null
                    completed_projects?: number
                    created_at?: string
                    id?: string
                    last_calculated_at?: string
                    successful_projects?: number
                    tier?: string
                    total_points?: number
                    user_id?: string
                }
                Relationships: []
            }
            user_roles: {
                Row: {
                    created_at: string
                    id: string
                    role: string
                    user_id: string
                }
                Insert: {
                    created_at?: string
                    id?: string
                    role: string
                    user_id: string
                }
                Update: {
                    created_at?: string
                    id?: string
                    role?: string
                    user_id?: string
                }
                Relationships: []
            }
            user_wallets: {
                Row: {
                    created_at: string
                    id: string
                    is_verified: boolean
                    updated_at: string
                    user_id: string
                    wallet_address: string
                }
                Insert: {
                    created_at?: string
                    id?: string
                    is_verified?: boolean
                    updated_at?: string
                    user_id: string
                    wallet_address: string
                }
                Update: {
                    created_at?: string
                    id?: string
                    is_verified?: boolean
                    updated_at?: string
                    user_id?: string
                    wallet_address?: string
                }
                Relationships: []
            }
        }
        Views: {
            [_ in never]: never
        }
        Functions: {
            get_user_role: {
                Args: {
                    _user_id: string
                }
                Returns: string
            }
            has_role: {
                Args: {
                    _role: string
                    _user_id: string
                }
                Returns: boolean
            }
            increment_job_views: {
                Args: {
                    job_uuid: string
                }
                Returns: undefined
            }
        }
        Enums: {
            app_role: "recruiter" | "freelancer"
            experience_level: "beginner" | "intermediate" | "expert"
            job_status: "draft" | "open" | "active" | "completed" | "cancelled"
            project_duration: "short_term" | "medium_term" | "long_term"
            rating_tier: "gold" | "silver" | "bronze" | "iron"
        }
        CompositeTypes: {
            [_ in never]: never
        }
    }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof DatabaseWithoutInternals, "public">]

export type Tables<
    DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
    TableName extends DefaultSchemaTableNameOrOptions extends {
        schema: keyof DatabaseWithoutInternals
    }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
}
    ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
            Row: infer R
        }
    ? R
    : never
    : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
            Row: infer R
        }
    ? R
    : never
    : never

export type TablesInsert<
    DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
    TableName extends DefaultSchemaTableNameOrOptions extends {
        schema: keyof DatabaseWithoutInternals
    }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
}
    ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
        Insert: infer I
    }
    ? I
    : never
    : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
    }
    ? I
    : never
    : never

export type TablesUpdate<
    DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
    TableName extends DefaultSchemaTableNameOrOptions extends {
        schema: keyof DatabaseWithoutInternals
    }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
}
    ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
        Update: infer U
    }
    ? U
    : never
    : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
    }
    ? U
    : never
    : never

export type Enums<
    DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
    EnumName extends DefaultSchemaEnumNameOrOptions extends {
        schema: keyof DatabaseWithoutInternals
    }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
}
    ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
    : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export const Constants = {
    public: {
        Enums: {
            app_role: ["recruiter", "freelancer"],
            experience_level: ["beginner", "intermediate", "expert"],
            job_status: ["draft", "open", "active", "completed", "cancelled"],
            project_duration: ["short_term", "medium_term", "long_term"],
            rating_tier: ["gold", "silver", "bronze", "iron"],
        },
    },
} as const
