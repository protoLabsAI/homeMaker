/**
 * Home inventory asset tracking types for homeMaker.
 *
 * Assets represent tracked household items with purchase info, warranty
 * tracking, and optional links to IoT sensors. All monetary amounts are
 * stored in cents to avoid floating-point arithmetic issues.
 */

/** Broad classification for household assets */
export type AssetCategory =
  | 'appliance'
  | 'furniture'
  | 'electronics'
  | 'plumbing'
  | 'hvac'
  | 'electrical'
  | 'structural'
  | 'outdoor'
  | 'vehicle'
  | 'other';

/** A single tracked household asset */
export interface Asset {
  /** Unique identifier */
  id: string;
  /** Human-readable name (e.g. "Kitchen Refrigerator") */
  name: string;
  /** Broad classification */
  category: AssetCategory;
  /** Room or zone where the asset is located (e.g. "Kitchen", "Garage") */
  location: string;
  /** Date of purchase in YYYY-MM-DD format */
  purchaseDate: string | null;
  /** Original purchase price in cents */
  purchasePrice: number | null;
  /** Warranty expiration date in YYYY-MM-DD format, or null if none */
  warrantyExpiration: string | null;
  /** Manufacturer model number */
  modelNumber: string | null;
  /** Unique serial number */
  serialNumber: string | null;
  /** Manufacturer or brand name */
  manufacturer: string | null;
  /** URL to the product manual */
  manualUrl: string | null;
  /** Estimated replacement cost in cents */
  replacementCost: number | null;
  /** Free-form notes */
  notes: string | null;
  /** Linked sensor registry IDs (no FK enforcement — sensors are in-memory) */
  sensorIds: string[];
  /** URLs to asset photos */
  photoUrls: string[];
  /** ISO-8601 creation timestamp */
  createdAt: string;
  /** ISO-8601 last-update timestamp */
  updatedAt: string;
}

/** Fields accepted when creating a new asset (id and timestamps are generated) */
export type CreateAssetInput = Omit<Asset, 'id' | 'createdAt' | 'updatedAt'>;

/** Fields accepted when updating an existing asset (all optional) */
export type UpdateAssetInput = Partial<Omit<Asset, 'id' | 'createdAt' | 'updatedAt'>>;

/** Warranty status grouping for the warranty report */
export interface WarrantyReport {
  /** Warranty is still valid */
  active: Asset[];
  /** Warranty expires within 90 days */
  expiringSoon: Asset[];
  /** Warranty has already expired */
  expired: Asset[];
  /** No warranty information recorded */
  noWarranty: Asset[];
}

/** Per-category value totals for the total value report */
export interface CategoryValue {
  category: AssetCategory;
  totalReplacementCost: number;
  assetCount: number;
}

/** Aggregate value report across all assets */
export interface TotalValueReport {
  totalReplacementCost: number;
  byCategory: CategoryValue[];
}
