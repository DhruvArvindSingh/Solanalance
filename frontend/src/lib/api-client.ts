interface ApiResponse<T = any> {
    data?: T;
    error?: string;
    message?: string;
}

class ApiClient {
    private baseURL: string;

    constructor() {
        this.baseURL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';
    }

    // Get current token from localStorage
    private getToken(): string | null {
        return localStorage.getItem('token');
    }

    public setToken(token: string | null): void {
        if (token) {
            localStorage.setItem('token', token);
        } else {
            localStorage.removeItem('token');
        }
    }

    public async request<T = any>(
        endpoint: string,
        options: RequestInit = {}
    ): Promise<ApiResponse<T>> {
        const url = `${this.baseURL}${endpoint}`;
        const token = this.getToken(); // Get fresh token from localStorage

        // Validate token format before sending (JWT should have 3 parts)
        if (token && token.split('.').length !== 3) {
            console.warn('Invalid token format detected, clearing token');
            this.setToken(null);
            return {
                data: null,
                error: 'Invalid authentication token. Please login again.'
            };
        }

        // Check if body is FormData
        const isFormData = options.body instanceof FormData;

        const config: RequestInit = {
            headers: isFormData
                ? {
                    ...(token && { Authorization: `Bearer ${token}` }),
                    ...options.headers,
                }
                : {
                    'Content-Type': 'application/json',
                    ...(token && { Authorization: `Bearer ${token}` }),
                    ...options.headers,
                },
            ...options,
        };

        try {
            const response = await fetch(url, config);
            const result = await response.json();

            if (!response.ok) {
                // Clear token if authentication fails
                if (response.status === 401 || response.status === 403) {
                    console.warn('Authentication failed, clearing token');
                    this.setToken(null);
                }
                
                return {
                    data: null,
                    error: result.error || 'An error occurred'
                };
            }

            return {
                data: result,
                error: null
            };
        } catch (error) {
            console.error(`Request failed for ${endpoint}:`, error);
            return {
                data: null,
                error: (error as Error).message || 'Network error'
            };
        }
    }

    // Auth endpoints
    auth = {
        register: async (data: {
            email: string;
            password: string;
            fullName: string;
            role: string;
            walletAddress: string;
        }) => {
            const result = await this.request('/auth/register', {
                method: 'POST',
                body: JSON.stringify(data),
            });

            if (result.data?.token) {
                this.setToken(result.data.token);
            }

            return result;
        },

        login: async (data: { email: string; password: string }) => {
            const result = await this.request('/auth/login', {
                method: 'POST',
                body: JSON.stringify(data),
            });

            if (result.data?.token) {
                this.setToken(result.data.token);
            }

            return result;
        },

        getUser: async () => {
            return this.request('/auth/me');
        },

        signOut: () => {
            this.setToken(null);
            return Promise.resolve({ data: { message: 'Signed out successfully' } });
        },

        // Legacy method names for compatibility
        signUp: async (options: { email: string; password: string; options?: { data: { full_name: string } } }) => {
            const data = {
                email: options.email,
                password: options.password,
                fullName: options.options?.data?.full_name || '',
                role: 'freelancer', // default role
                walletAddress: '' // will be updated later
            };
            return this.auth.register(data);
        },

        signInWithPassword: async (credentials: { email: string; password: string }) => {
            return this.auth.login(credentials);
        },

        getSession: async () => {
            const userResult = await this.auth.getUser();
            if (userResult.data && !userResult.error) {
                return {
                    data: {
                        session: {
                            user: userResult.data
                        }
                    }
                };
            }
            return { data: { session: null } };
        },

        onAuthStateChange: (callback: (event: string, session: any) => void) => {
            // For now, return a dummy subscription
            // In a real implementation, you might use WebSockets or polling
            return {
                data: {
                    subscription: {
                        unsubscribe: () => { }
                    }
                }
            };
        }
    };

    // Profile endpoints
    profile = {
        getById: async (id: string) => {
            return this.request(`/profile/${id}`);
        },

        update: async (data: any) => {
            return this.request('/profile/update', {
                method: 'PUT',
                body: JSON.stringify(data),
            });
        },

        uploadProfilePicture: async (file: File) => {
            const formData = new FormData();
            formData.append('profilePicture', file);

            return this.request('/profile/picture/upload', {
                method: 'POST',
                body: formData,
            });
        },
    };

    // Job endpoints
    jobs = {
        getAll: async (params?: any) => {
            const queryString = params ? `?${new URLSearchParams(params).toString()}` : '';
            return this.request(`/jobs${queryString}`);
        },

        getById: async (id: string) => {
            return this.request(`/jobs/${id}`);
        },

        create: async (data: any) => {
            return this.request('/jobs', {
                method: 'POST',
                body: JSON.stringify(data),
            });
        },

        getRecruiterJobs: async () => {
            return this.request('/jobs/recruiter/jobs');
        },

        getApplicants: async (jobId: string) => {
            return this.request(`/jobs/${jobId}/applicants`);
        },

        update: async (id: string, data: any) => {
            return this.request(`/jobs/${id}`, {
                method: 'PUT',
                body: JSON.stringify(data),
            });
        },
    };

    // Application endpoints
    applications = {
        create: async (data: any) => {
            return this.request('/applications', {
                method: 'POST',
                body: JSON.stringify(data),
            });
        },

        getMyApplications: async () => {
            return this.request('/applications/my-applications');
        },

        updateStatus: async (id: string, status: string) => {
            return this.request(`/applications/${id}/status`, {
                method: 'PUT',
                body: JSON.stringify({ status }),
            });
        },

        checkApplication: async (jobId: string) => {
            return this.request(`/applications/check/${jobId}`);
        },
    };

    // Project endpoints
    projects = {
        getMyProjects: async () => {
            return this.request('/projects/my-projects');
        },

        getById: async (id: string) => {
            return this.request(`/projects/${id}`);
        },

        submitMilestone: async (milestoneId: string, data: any) => {
            return this.request(`/projects/milestone/${milestoneId}/submit`, {
                method: 'PUT',
                body: JSON.stringify(data),
            });
        },

        reviewMilestone: async (milestoneId: string, data: any) => {
            return this.request(`/projects/milestone/${milestoneId}/review`, {
                method: 'PUT',
                body: JSON.stringify(data),
            });
        },
    };

    // Staking endpoints
    staking = {
        create: async (data: any) => {
            return this.request('/staking', {
                method: 'POST',
                body: JSON.stringify(data),
            });
        },

        getByProject: async (projectId: string) => {
            return this.request(`/staking/project/${projectId}`);
        },
    };

    // Transaction endpoints
    transactions = {
        getMyTransactions: async () => {
            return this.request('/transactions/my-transactions');
        },

        getById: async (id: string) => {
            return this.request(`/transactions/${id}`);
        },
    };

    // Rating endpoints
    ratings = {
        create: async (data: any) => {
            return this.request('/ratings', {
                method: 'POST',
                body: JSON.stringify(data),
            });
        },

        getByUser: async (userId: string, params?: any) => {
            const queryString = params ? `?${new URLSearchParams(params).toString()}` : '';
            return this.request(`/ratings/user/${userId}${queryString}`);
        },

        checkRating: async (projectId: string) => {
            return this.request(`/ratings/check/${projectId}`);
        },
    };

    // Message endpoints
    messages = {
        getByProject: async (projectId: string, params?: any) => {
            const queryString = params ? `?${new URLSearchParams(params).toString()}` : '';
            return this.request(`/messages/project/${projectId}${queryString}`);
        },

        send: async (data: any) => {
            return this.request('/messages', {
                method: 'POST',
                body: JSON.stringify(data),
            });
        },
    };

    // Notification endpoints
    notifications = {
        getAll: async (params?: any) => {
            const queryString = params ? `?${new URLSearchParams(params).toString()}` : '';
            return this.request(`/notifications${queryString}`);
        },

        markAsRead: async (id: string) => {
            return this.request(`/notifications/${id}/read`, {
                method: 'PUT',
            });
        },

        markAllAsRead: async () => {
            return this.request('/notifications/mark-all-read', {
                method: 'PUT',
            });
        },

        getUnreadCount: async () => {
            return this.request('/notifications/unread-count');
        },
    };

    // Upload endpoints
    upload = {
        uploadFile: async (formData: FormData) => {
            return this.request('/upload', {
                method: 'POST',
                body: formData,
            });
        },

        uploadMultiple: async (formData: FormData) => {
            return this.request('/upload/multiple', {
                method: 'POST',
                body: formData,
            });
        },
    };

    // Conversation endpoints
    conversations = {
        getAll: async (params?: any) => {
            const queryString = params ? `?${new URLSearchParams(params).toString()}` : '';
            return this.request(`/conversations${queryString}`);
        },

        getById: async (id: string) => {
            return this.request(`/conversations/${id}`);
        },

        create: async (data: any) => {
            return this.request('/conversations', {
                method: 'POST',
                body: JSON.stringify(data),
            });
        },

        markAsRead: async (id: string) => {
            return this.request(`/conversations/${id}/read`, {
                method: 'PUT',
            });
        },
    };

    // Utility functions to match Supabase API pattern
    from(table: string) {
        return {
            select: (columns = '*') => ({
                eq: (column: string, value: any) => ({
                    single: async () => {
                        // This is a simplified implementation
                        // In a real app, you'd build proper query endpoints
                        return { data: null, error: null };
                    },
                }),
            }),
            insert: (data: any) => ({
                select: () => ({
                    single: async () => {
                        // Simplified implementation
                        return { data: null, error: null };
                    },
                }),
            }),
            update: (data: any) => ({
                eq: (column: string, value: any) => ({
                    select: () => ({
                        single: async () => {
                            // Simplified implementation
                            return { data: null, error: null };
                        },
                    }),
                }),
            }),
        };
    }

    // RPC function simulation
    rpc(functionName: string, params?: any) {
        // Handle specific RPC calls that were used in the frontend
        if (functionName === 'increment_job_views') {
            // This would be handled by the job detail endpoint
            return Promise.resolve({ data: null, error: null });
        }
        return Promise.resolve({ data: null, error: null });
    }
}

export const a = new ApiClient();

// Export for compatibility with existing code that imports { apiClient }
export const apiClient = a;
