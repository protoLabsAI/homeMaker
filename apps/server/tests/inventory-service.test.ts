/**
 * Unit tests for InventoryService
 */

import { describe, it, expect, beforeEach } from 'vitest';
import BetterSqlite3 from 'better-sqlite3';
import { InventoryService } from '../src/services/inventory-service.js';
import type { CreateAssetInput } from '@protolabsai/types';

function createTestDb(): BetterSqlite3.Database {
  const db = new BetterSqlite3(':memory:');
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');
  return db;
}

/** Return an ISO date string N days from today (date-only, YYYY-MM-DD) */
function dateInDays(n: number): string {
  return new Date(Date.now() + n * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
}

const BASE_ASSET: CreateAssetInput = {
  name: 'LG Refrigerator',
  category: 'appliance',
  location: 'Kitchen',
  purchasePrice: 120000, // $1200.00 in cents
  replacementCost: 140000, // $1400.00 in cents
};

describe('InventoryService', () => {
  let db: BetterSqlite3.Database;
  let service: InventoryService;

  beforeEach(() => {
    db = createTestDb();
    service = new InventoryService(db);
  });

  // ── create ────────────────────────────────────────────────────────────────

  it('creates an asset with required fields', () => {
    const asset = service.create(BASE_ASSET);
    expect(asset.id).toBeTruthy();
    expect(asset.name).toBe('LG Refrigerator');
    expect(asset.category).toBe('appliance');
    expect(asset.location).toBe('Kitchen');
    expect(asset.createdAt).toBeTruthy();
    expect(asset.updatedAt).toBeTruthy();
  });

  it('stores monetary amounts in cents (integers)', () => {
    const asset = service.create(BASE_ASSET);
    expect(asset.purchasePrice).toBe(120000);
    expect(asset.replacementCost).toBe(140000);
  });

  it('stores sensorIds and photoUrls as empty arrays by default', () => {
    const asset = service.create(BASE_ASSET);
    expect(asset.sensorIds).toEqual([]);
    expect(asset.photoUrls).toEqual([]);
  });

  it('stores provided sensorIds and photoUrls', () => {
    const asset = service.create({
      ...BASE_ASSET,
      sensorIds: ['sensor-1', 'sensor-2'],
      photoUrls: ['https://example.com/photo.jpg'],
    });
    expect(asset.sensorIds).toEqual(['sensor-1', 'sensor-2']);
    expect(asset.photoUrls).toEqual(['https://example.com/photo.jpg']);
  });

  it('stores optional fields as null when not provided', () => {
    const asset = service.create({ name: 'Minimal Asset', category: 'other' });
    expect(asset.purchaseDate).toBeNull();
    expect(asset.purchasePrice).toBeNull();
    expect(asset.warrantyExpiration).toBeNull();
    expect(asset.modelNumber).toBeNull();
    expect(asset.serialNumber).toBeNull();
    expect(asset.manufacturer).toBeNull();
    expect(asset.notes).toBeNull();
  });

  it('persists all optional fields to database', () => {
    const created = service.create({
      ...BASE_ASSET,
      purchaseDate: '2023-06-15',
      warrantyExpiration: '2026-06-15',
      modelNumber: 'LRMVS3006S',
      serialNumber: 'SN123456',
      manufacturer: 'LG',
      manualUrl: 'https://example.com/manual.pdf',
      notes: 'Bottom freezer model',
    });

    const fetched = service.get(created.id);
    expect(fetched?.purchaseDate).toBe('2023-06-15');
    expect(fetched?.warrantyExpiration).toBe('2026-06-15');
    expect(fetched?.modelNumber).toBe('LRMVS3006S');
    expect(fetched?.serialNumber).toBe('SN123456');
    expect(fetched?.manufacturer).toBe('LG');
    expect(fetched?.manualUrl).toBe('https://example.com/manual.pdf');
    expect(fetched?.notes).toBe('Bottom freezer model');
  });

  // ── list ──────────────────────────────────────────────────────────────────

  it('lists all assets ordered by name', () => {
    service.create({ ...BASE_ASSET, name: 'Zebra Rug' });
    service.create({ ...BASE_ASSET, name: 'Apple TV' });
    service.create({ ...BASE_ASSET, name: 'Microwave' });

    const list = service.list();
    expect(list).toHaveLength(3);
    expect(list[0]?.name).toBe('Apple TV');
    expect(list[1]?.name).toBe('Microwave');
    expect(list[2]?.name).toBe('Zebra Rug');
  });

  it('returns empty array when no assets exist', () => {
    expect(service.list()).toHaveLength(0);
  });

  it('filters by category', () => {
    service.create({ ...BASE_ASSET, name: 'Fridge', category: 'appliance' });
    service.create({ ...BASE_ASSET, name: 'Sofa', category: 'furniture' });
    service.create({ ...BASE_ASSET, name: 'Washer', category: 'appliance' });

    const appliances = service.list({ category: 'appliance' });
    expect(appliances).toHaveLength(2);
    expect(appliances.every((a) => a.category === 'appliance')).toBe(true);
  });

  it('filters by location (exact match)', () => {
    service.create({ ...BASE_ASSET, name: 'Fridge', location: 'Kitchen' });
    service.create({ ...BASE_ASSET, name: 'TV', location: 'Living Room' });
    service.create({ ...BASE_ASSET, name: 'Microwave', location: 'Kitchen' });

    const kitchen = service.list({ location: 'Kitchen' });
    expect(kitchen).toHaveLength(2);
    expect(kitchen.every((a) => a.location === 'Kitchen')).toBe(true);
  });

  it('filters for assets with warranty expiring within 30 days', () => {
    service.create({
      ...BASE_ASSET,
      name: 'Expiring Soon',
      warrantyExpiration: dateInDays(15),
    });
    service.create({
      ...BASE_ASSET,
      name: 'Not Expiring',
      warrantyExpiration: dateInDays(90),
    });
    service.create({ ...BASE_ASSET, name: 'No Warranty' });

    const expiring = service.list({ warrantyExpiring: true });
    expect(expiring).toHaveLength(1);
    expect(expiring[0]?.name).toBe('Expiring Soon');
  });

  // ── get ───────────────────────────────────────────────────────────────────

  it('returns null for non-existent asset', () => {
    expect(service.get('no-such-id')).toBeNull();
  });

  it('retrieves asset by id', () => {
    const created = service.create(BASE_ASSET);
    const fetched = service.get(created.id);
    expect(fetched?.id).toBe(created.id);
    expect(fetched?.name).toBe('LG Refrigerator');
  });

  // ── update ────────────────────────────────────────────────────────────────

  it('returns null when updating non-existent asset', () => {
    expect(service.update('ghost', { name: 'New Name' })).toBeNull();
  });

  it('partially updates name', () => {
    const created = service.create(BASE_ASSET);
    const updated = service.update(created.id, { name: 'Samsung Refrigerator' });
    expect(updated?.name).toBe('Samsung Refrigerator');
    expect(updated?.category).toBe('appliance'); // unchanged
  });

  it('updates replacementCost (monetary value in cents)', () => {
    const created = service.create(BASE_ASSET);
    const updated = service.update(created.id, { replacementCost: 160000 });
    expect(updated?.replacementCost).toBe(160000);
  });

  it('updates sensorIds array', () => {
    const created = service.create(BASE_ASSET);
    const updated = service.update(created.id, { sensorIds: ['sensor-abc', 'sensor-xyz'] });
    expect(updated?.sensorIds).toEqual(['sensor-abc', 'sensor-xyz']);
  });

  it('updates photoUrls array', () => {
    const created = service.create(BASE_ASSET);
    const updated = service.update(created.id, {
      photoUrls: ['https://example.com/1.jpg', 'https://example.com/2.jpg'],
    });
    expect(updated?.photoUrls).toEqual(['https://example.com/1.jpg', 'https://example.com/2.jpg']);
  });

  it('returns existing asset unchanged when called with empty changes', () => {
    const created = service.create(BASE_ASSET);
    const updated = service.update(created.id, {});
    expect(updated?.name).toBe(created.name);
    expect(updated?.id).toBe(created.id);
  });

  it('updates updatedAt timestamp', async () => {
    const created = service.create(BASE_ASSET);
    // Small delay to ensure a different timestamp
    await new Promise((resolve) => setTimeout(resolve, 5));
    const updated = service.update(created.id, { name: 'New Name' });
    expect(new Date(updated!.updatedAt).getTime()).toBeGreaterThanOrEqual(
      new Date(created.updatedAt).getTime()
    );
  });

  // ── delete ────────────────────────────────────────────────────────────────

  it('deletes an asset by id', () => {
    const created = service.create(BASE_ASSET);
    service.delete(created.id);
    expect(service.get(created.id)).toBeNull();
  });

  it('throws when deleting non-existent asset', () => {
    expect(() => service.delete('non-existent')).toThrow(/not found/);
  });

  // ── search ────────────────────────────────────────────────────────────────

  it('finds assets by name (case-insensitive substring)', () => {
    service.create({ ...BASE_ASSET, name: 'LG Refrigerator' });
    service.create({ ...BASE_ASSET, name: 'Samsung TV' });
    service.create({ ...BASE_ASSET, name: 'Bosch Dishwasher' });

    const results = service.search('samsung');
    expect(results).toHaveLength(1);
    expect(results[0]?.name).toBe('Samsung TV');
  });

  it('finds assets by manufacturer', () => {
    service.create({ ...BASE_ASSET, name: 'Asset A', manufacturer: 'Bosch' });
    service.create({ ...BASE_ASSET, name: 'Asset B', manufacturer: 'LG' });

    const results = service.search('bosch');
    expect(results).toHaveLength(1);
    expect(results[0]?.manufacturer).toBe('Bosch');
  });

  it('finds assets by model number', () => {
    service.create({ ...BASE_ASSET, name: 'Asset', modelNumber: 'XR-9000' });

    const results = service.search('XR-9000');
    expect(results).toHaveLength(1);
    expect(results[0]?.modelNumber).toBe('XR-9000');
  });

  it('finds assets by serial number', () => {
    service.create({ ...BASE_ASSET, name: 'Asset', serialNumber: 'SN-ABC-123' });

    const results = service.search('ABC-123');
    expect(results).toHaveLength(1);
    expect(results[0]?.serialNumber).toBe('SN-ABC-123');
  });

  it('finds assets by location substring', () => {
    service.create({ ...BASE_ASSET, name: 'Fridge', location: 'Kitchen' });
    service.create({ ...BASE_ASSET, name: 'TV', location: 'Living Room' });

    const results = service.search('kitchen');
    expect(results).toHaveLength(1);
    expect(results[0]?.name).toBe('Fridge');
  });

  it('finds assets by notes substring', () => {
    service.create({ ...BASE_ASSET, name: 'Asset', notes: 'Needs annual servicing' });

    const results = service.search('annual');
    expect(results).toHaveLength(1);
    expect(results[0]?.notes).toBe('Needs annual servicing');
  });

  it('returns empty array when no assets match', () => {
    service.create(BASE_ASSET);
    const results = service.search('xyznomatch99');
    expect(results).toHaveLength(0);
  });

  it('returns multiple matching results', () => {
    service.create({ ...BASE_ASSET, name: 'LG Refrigerator', manufacturer: 'LG' });
    service.create({ ...BASE_ASSET, name: 'LG Dishwasher', manufacturer: 'LG' });
    service.create({ ...BASE_ASSET, name: 'Samsung TV', manufacturer: 'Samsung' });

    const results = service.search('LG');
    expect(results).toHaveLength(2);
  });

  // ── getWarrantyReport ─────────────────────────────────────────────────────

  it('returns empty groups when no assets', () => {
    const report = service.getWarrantyReport();
    expect(report.active).toHaveLength(0);
    expect(report.expiringSoon).toHaveLength(0);
    expect(report.expired).toHaveLength(0);
    expect(report.noWarranty).toHaveLength(0);
  });

  it('classifies asset with no warranty into noWarranty', () => {
    service.create({ ...BASE_ASSET, name: 'No Warranty Asset' });
    const report = service.getWarrantyReport();
    expect(report.noWarranty).toHaveLength(1);
    expect(report.noWarranty[0]?.name).toBe('No Warranty Asset');
  });

  it('classifies active warranty (>90 days remaining) as active', () => {
    service.create({
      ...BASE_ASSET,
      name: 'Active Warranty',
      warrantyExpiration: dateInDays(200),
    });
    const report = service.getWarrantyReport();
    expect(report.active).toHaveLength(1);
    expect(report.active[0]?.name).toBe('Active Warranty');
  });

  it('classifies warranty expiring within 90 days as expiringSoon', () => {
    service.create({
      ...BASE_ASSET,
      name: 'Expiring Soon',
      warrantyExpiration: dateInDays(45),
    });
    const report = service.getWarrantyReport();
    expect(report.expiringSoon).toHaveLength(1);
    expect(report.expiringSoon[0]?.name).toBe('Expiring Soon');
  });

  it('classifies expired warranty (past date) as expired', () => {
    service.create({
      ...BASE_ASSET,
      name: 'Expired Warranty',
      warrantyExpiration: dateInDays(-30),
    });
    const report = service.getWarrantyReport();
    expect(report.expired).toHaveLength(1);
    expect(report.expired[0]?.name).toBe('Expired Warranty');
  });

  it('handles mixed warranty statuses', () => {
    service.create({ ...BASE_ASSET, name: 'Active', warrantyExpiration: dateInDays(200) });
    service.create({ ...BASE_ASSET, name: 'Expiring', warrantyExpiration: dateInDays(45) });
    service.create({ ...BASE_ASSET, name: 'Expired', warrantyExpiration: dateInDays(-10) });
    service.create({ ...BASE_ASSET, name: 'None' });

    const report = service.getWarrantyReport();
    expect(report.active).toHaveLength(1);
    expect(report.expiringSoon).toHaveLength(1);
    expect(report.expired).toHaveLength(1);
    expect(report.noWarranty).toHaveLength(1);
  });

  // ── getTotalValue ──────────────────────────────────────────────────────────

  it('returns zero totals when no assets', () => {
    const report = service.getTotalValue();
    expect(report.totalReplacementCost).toBe(0);
    expect(report.byCategory).toHaveLength(0);
  });

  it('sums replacement costs per category', () => {
    service.create({ ...BASE_ASSET, category: 'appliance', replacementCost: 100000 });
    service.create({
      ...BASE_ASSET,
      name: 'Washer',
      category: 'appliance',
      replacementCost: 80000,
    });
    service.create({ ...BASE_ASSET, name: 'Sofa', category: 'furniture', replacementCost: 60000 });

    const report = service.getTotalValue();
    expect(report.totalReplacementCost).toBe(240000);

    const applianceRow = report.byCategory.find((r) => r.category === 'appliance');
    expect(applianceRow?.totalReplacementCost).toBe(180000);
    expect(applianceRow?.assetCount).toBe(2);

    const furnitureRow = report.byCategory.find((r) => r.category === 'furniture');
    expect(furnitureRow?.totalReplacementCost).toBe(60000);
    expect(furnitureRow?.assetCount).toBe(1);
  });

  it('excludes assets with null replacementCost from the total', () => {
    service.create({ ...BASE_ASSET, replacementCost: 50000 });
    service.create({ ...BASE_ASSET, name: 'No Value', replacementCost: undefined });

    const report = service.getTotalValue();
    // COALESCE(null, 0) so category total for second asset = 0
    // But the grand total should only count non-null replacementCosts
    expect(report.totalReplacementCost).toBe(50000);
  });

  it('orders byCategory by total descending', () => {
    service.create({ ...BASE_ASSET, category: 'appliance', replacementCost: 50000 });
    service.create({ ...BASE_ASSET, name: 'Sofa', category: 'furniture', replacementCost: 200000 });
    service.create({ ...BASE_ASSET, name: 'Car', category: 'vehicle', replacementCost: 500000 });

    const report = service.getTotalValue();
    expect(report.byCategory[0]?.category).toBe('vehicle');
    expect(report.byCategory[1]?.category).toBe('furniture');
    expect(report.byCategory[2]?.category).toBe('appliance');
  });
});
