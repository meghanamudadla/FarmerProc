/**
 * Maps a backend Crop record (crop_name, quantity, remaining_quantity, ...)
 * into the richer local shape MyCrops/AddCropModal/BookSlot already use.
 */
export function normalizeRealCrop(c) {
  const quantity = c.quantity || 0;
  const remaining = c.remaining_quantity != null ? c.remaining_quantity : quantity;
  return {
    cropRecordId: 'crop_' + c.id,
    backendCropId: c.id,
    farmerId: String(c.farmer_id),
    cropId: 'real-' + c.id,
    cropName: c.crop_name,
    normalizedCropName: (c.crop_name || '').trim().toLowerCase(),
    cropSource: 'PREDEFINED',
    registrationDate: (c.created_at || '').slice(0, 10),
    season: c.season || 'Kharif 2026',
    plotReference: c.variety || 'Main Holding',
    landArea: 0,
    expectedQty: quantity,
    entitlementQuantity: quantity,
    eligibleQty: quantity,
    procuredQuantity: Math.max(0, quantity - remaining),
    alreadyProcuredQty: Math.max(0, quantity - remaining),
    remainingQuantity: remaining,
    eligibilityStatus: 'ELIGIBLE',
    status: c.status || 'ACTIVE',
    completedDate: null,
    notes: '',
    createdAt: (c.created_at || '').slice(0, 10),
    updatedAt: (c.created_at || '').slice(0, 10),
    isRealCrop: true,
  };
}
