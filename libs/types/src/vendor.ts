/**
 * Vendor/contractor directory types.
 *
 * Tracks home service providers — plumbers, electricians, landscapers, etc. —
 * with contact info, ratings, and links to inventory assets they have serviced.
 */

/** Fixed enum of trade categories for vendors */
export type VendorCategory =
  | 'plumber'
  | 'electrician'
  | 'hvac'
  | 'landscaper'
  | 'general-contractor'
  | 'painter'
  | 'roofer'
  | 'pest-control'
  | 'cleaning'
  | 'insurance'
  | 'other';

/** A service provider in the vendor directory */
export interface Vendor {
  id: string;
  name: string;
  /** Company or business name (optional) */
  company: string | null;
  /** Phone number stored as string to preserve formatting (e.g., "(555) 123-4567") */
  phone: string;
  email: string | null;
  website: string | null;
  category: VendorCategory;
  notes: string;
  /** Rating from 1 to 5 (integer), or null if unrated */
  rating: number | null;
  /** ISO-8601 date of last contact */
  lastContactedAt: string | null;
  /** ISO-8601 date of last service performed */
  lastServiceDate: string | null;
  /** IDs of inventory assets linked to this vendor */
  linkedAssetIds: string[];
  createdAt: string;
  updatedAt: string;
}

/** Input for creating a new vendor */
export interface CreateVendorInput {
  name: string;
  company?: string | null;
  phone: string;
  email?: string | null;
  website?: string | null;
  category: VendorCategory;
  notes?: string;
  rating?: number | null;
  lastContactedAt?: string | null;
  lastServiceDate?: string | null;
  linkedAssetIds?: string[];
}

/** Partial update input for an existing vendor */
export interface UpdateVendorInput {
  name?: string;
  company?: string | null;
  phone?: string;
  email?: string | null;
  website?: string | null;
  category?: VendorCategory;
  notes?: string;
  rating?: number | null;
  lastContactedAt?: string | null;
  lastServiceDate?: string | null;
  linkedAssetIds?: string[];
}

/** Optional filters for listing vendors */
export interface VendorFilters {
  category?: VendorCategory;
}
