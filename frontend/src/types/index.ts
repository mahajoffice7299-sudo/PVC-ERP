// Common global types
export interface BaseEntity {
  id: string;
  createdAt?: string;
  updatedAt?: string;
}

export type StatusType = 'active' | 'inactive' | 'pending' | 'completed' | 'cancelled';

