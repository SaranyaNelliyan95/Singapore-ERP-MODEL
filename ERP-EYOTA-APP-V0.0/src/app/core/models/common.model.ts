export type EmploymentPassType = 'Local' | 'PR' | 'WP' | 'S Pass' | 'EP';

export type WorkLocation = 'Office' | 'Site' | 'WFH';

export type LeaveType =
  | 'Annual'
  | 'Sick'
  | 'Hospitalisation'
  | 'Childcare'
  | 'Maternity'
  | 'Paternity'
  | 'Unpaid'
  | 'Compassionate';

export type ClaimType =
  | 'Transport'
  | 'Medical'
  | 'Meals'
  | 'Accommodation'
  | 'Mobile'
  | 'Other';

export type RequestStatus =
  | 'Pending'
  | 'Approved'
  | 'Rejected'
  | 'Cancelled'
  | 'Paid'
  | 'Verified';

export type AssetType =
  | 'Laptop'
  | 'Mobile'
  | 'Helmet'
  | 'Safety Shoes'
  | 'Access Card'
  | 'Vehicle'
  | 'Tools'
  | 'Uniform';

export interface NavItem {
  label: string;
  route: string;
  icon: string;
  section?: string;
}

export interface BreadcrumbItem {
  label: string;
  route?: string;
}

export interface StatusBadgeConfig {
  label: string;
  tone: 'neutral' | 'success' | 'warning' | 'danger' | 'info';
}

export interface DataTableColumn<T> {
  key: keyof T & string;
  label: string;
  sortable?: boolean;
  width?: string;
  align?: 'left' | 'center' | 'right';
  format?: (row: T) => string;
  badge?: (row: T) => StatusBadgeConfig | null;
}

export interface EmptyStateConfig {
  title: string;
  description: string;
  actionLabel?: string;
}
