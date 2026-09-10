import { useState, useMemo } from 'react';
import StatTile from '../components/StatTile.jsx';
import { CropRepository, CROP_STATUS, ELIGIBILITY_STATUS } from '../services/cropRepository.js';
import AddCropModal from '../components/AddCropModal.jsx';
import EditCropModal from '../components/EditCropModal.jsx';
import CropDetailsModal from '../components/CropDetailsModal.jsx';
import EligibilityDetailsModal from '../components/EligibilityDetailsModal.jsx';

export default function MyCrops({ t, lang, farmer, crops = [], setCrops, onBookSlotForCrop, bookings = [] }) {
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [editingCrop, setEditingCrop] = useState(null);
  const [selectedCropDetail, setSelectedCropDetail] = useState(null);
  const [selectedCropEligibility, setSelectedCropEligibility] = useState(null);
  const [statusMessage, setStatusMessage] = useState(null);

  // Search, Filter & Sort State (Sections 35 & 36)
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL'); // 'ALL' | 'ACTIVE' | 'PENDING' | 'COMPLETED' | 'INACTIVE'
  const [sortBy, setSortBy] = useState('RECENT'); // 'RECENT' | 'OLDEST' | 'NAME' | 'REMAINING'

  // Summary Metrics (Section 4)
  const totalRegisteredCount = crops.length;
  const inactiveCropsCount = crops.filter((c) => c.status === CROP_STATUS.INACTIVE || c.status === CROP_STATUS.ARCHIVED).length;
  const activeCropsCount = crops.filter((c) => c.status === CROP_STATUS.ACTIVE && c.remainingQuantity > 0).length;
  const completedCropsCount = crops.filter(
    (c) => c.status !== CROP_STATUS.INACTIVE && c.status !== CROP_STATUS.ARCHIVED && (c.status === CROP_STATUS.COMPLETED || c.remainingQuantity === 0)
  ).length;
  const totalRemainingQty = crops
    .filter((c) => c.status === CROP_STATUS.ACTIVE)
    .reduce((sum, c) => sum + (parseFloat(c.remainingQuantity) || 0), 0);

  // Filter & Search Logic
  const filteredCrops = useMemo(() => {
    return crops
      .filter((c) => {
        // Search filter (Section 35)
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase().trim();
          const matchName = c.cropName?.toLowerCase().includes(q);
          const matchSeason = c.season?.toLowerCase().includes(q);
          const matchPlot = c.plotReference?.toLowerCase().includes(q);
          if (!matchName && !matchSeason && !matchPlot) return false;
        }

        // Status tab filter
        if (statusFilter === 'ACTIVE') return c.status === CROP_STATUS.ACTIVE && c.remainingQuantity > 0;
        if (statusFilter === 'PENDING') {
          return (
            c.status !== CROP_STATUS.INACTIVE &&
            c.status !== CROP_STATUS.ARCHIVED &&
            (c.eligibilityStatus === ELIGIBILITY_STATUS.PENDING || c.eligibilityStatus === ELIGIBILITY_STATUS.VERIFICATION_REQUIRED)
          );
        }
        if (statusFilter === 'COMPLETED') {
          return (
            c.status !== CROP_STATUS.INACTIVE &&
            c.status !== CROP_STATUS.ARCHIVED &&
            (c.status === CROP_STATUS.COMPLETED || c.remainingQuantity === 0)
          );
        }
        if (statusFilter === 'INACTIVE') return c.status === CROP_STATUS.INACTIVE || c.status === CROP_STATUS.ARCHIVED;
        return true; // 'ALL'
      })
      .sort((a, b) => {
        // Sorting logic (Section 36)
        if (sortBy === 'RECENT') {
          return (b.registrationDate || b.createdAt || '').localeCompare(a.registrationDate || a.createdAt || '');
        }
        if (sortBy === 'OLDEST') {
          return (a.registrationDate || a.createdAt || '').localeCompare(b.registrationDate || b.createdAt || '');
        }
        if (sortBy === 'NAME') {
          return (a.cropName || '').localeCompare(b.cropName || '');
        }
        if (sortBy === 'REMAINING') {
          return (b.remainingQuantity || 0) - (a.remainingQuantity || 0);
        }
        return 0;
      });
  }, [crops, searchQuery, statusFilter, sortBy]);

  function handleAddCrop(newRecord) {
    setCrops((prev) => [newRecord, ...prev]);
    const addedFormatted = CropRepository.formatCropDate(newRecord.registrationDate);
    setStatusMessage({
      type: 'success',
      text: `✓ "${newRecord.cropName}" registered successfully for ${farmer?.fullName || 'Farmer'} (Added on: ${addedFormatted}).`,
    });
    setTimeout(() => setStatusMessage(null), 6000);
  }

  function handleSaveCrop(updatedCrop) {
    setCrops((prev) => prev.map((c) => (c.cropRecordId === updatedCrop.cropRecordId ? updatedCrop : c)));
    if (selectedCropDetail && selectedCropDetail.cropRecordId === updatedCrop.cropRecordId) {
      setSelectedCropDetail(updatedCrop);
    }
    setStatusMessage({
      type: 'success',
      text: `✓ "${updatedCrop.cropName}" was updated successfully.`,
    });
    setTimeout(() => setStatusMessage(null), 6000);
  }

  function handleDeactivate(cropRecord) {
    const res = CropRepository.deactivateCrop(
      cropRecord.cropRecordId,
      farmer?.farmerId || 'FRM-10245'
    );

    if (!res.success) {
      setStatusMessage({
        type: 'critical',
        text: `⛔ ${res.message}`,
      });
      setTimeout(() => setStatusMessage(null), 8000);
      return;
    }

    setCrops((prev) =>
      prev.map((c) =>
        (c.cropRecordId === cropRecord.cropRecordId || c.id === cropRecord.cropRecordId)
          ? { ...c, status: CROP_STATUS.INACTIVE }
          : c
      )
    );
    if (selectedCropDetail && (selectedCropDetail.cropRecordId === cropRecord.cropRecordId || selectedCropDetail.id === cropRecord.cropRecordId)) {
      setSelectedCropDetail((prev) => (prev ? { ...prev, status: CROP_STATUS.INACTIVE } : null));
    }

    setStatusMessage({
      type: 'info',
      text: res.message,
    });
    setTimeout(() => setStatusMessage(null), 6000);
  }

  function handleReactivate(cropRecord) {
    const res = CropRepository.reactivateCrop(
      cropRecord.cropRecordId,
      farmer?.farmerId || 'FRM-10245'
    );

    if (!res.success) {
      setStatusMessage({
        type: 'critical',
        text: `⛔ ${res.message}`,
      });
      setTimeout(() => setStatusMessage(null), 8000);
      return;
    }

    setCrops((prev) =>
      prev.map((c) =>
        (c.cropRecordId === cropRecord.cropRecordId || c.id === cropRecord.cropRecordId)
          ? res.crop
          : c
      )
    );
    if (selectedCropDetail && (selectedCropDetail.cropRecordId === cropRecord.cropRecordId || selectedCropDetail.id === cropRecord.cropRecordId)) {
      setSelectedCropDetail(res.crop);
    }

    setStatusMessage({
      type: 'success',
      text: res.message,
    });
    setTimeout(() => setStatusMessage(null), 6000);
  }

  function handleDelete(cropRecord) {
    const res = CropRepository.deleteCrop(
      cropRecord.cropRecordId,
      farmer?.farmerId || 'FRM-10245'
    );

    if (!res.success) {
      setStatusMessage({
        type: 'critical',
        text: `⛔ ${res.message}`,
      });
      setTimeout(() => setStatusMessage(null), 8000);
      return;
    }

    setCrops((prev) =>
      prev.filter(
        (c) => c.cropRecordId !== cropRecord.cropRecordId && c.id !== cropRecord.cropRecordId
      )
    );
    if (selectedCropDetail && (selectedCropDetail.cropRecordId === cropRecord.cropRecordId || selectedCropDetail.id === cropRecord.cropRecordId)) {
      setSelectedCropDetail(null);
    }

    setStatusMessage({
      type: 'success',
      text: res.message,
    });
    setTimeout(() => setStatusMessage(null), 6000);
  }

  return (
    <>
      <div className="section-title">
        <div>
          <h2>🌾 {t.myCropsTitle || 'My Registered Crops'}</h2>
          <div style={{ fontSize: 13, color: 'var(--ink-muted)', marginTop: 2 }}>
            Single source of truth for farmer crop registrations, government quota, and procurement tracking.
          </div>
        </div>
        <button className="btn btn-primary" onClick={() => setIsAddOpen(true)}>
          ➕ {t.addCrop || 'Add Crop'}
        </button>
      </div>

      {statusMessage && (
        <div
          className="hint"
          style={{
            background:
              statusMessage.type === 'success'
                ? 'var(--accent-soft)'
                : statusMessage.type === 'critical'
                ? 'var(--critical-soft)'
                : 'var(--surface-2)',
            color:
              statusMessage.type === 'success'
                ? 'var(--accent)'
                : statusMessage.type === 'critical'
                ? 'var(--critical)'
                : 'var(--ink)',
            padding: '12px 16px',
            borderRadius: 8,
            marginBottom: 16,
            borderLeft: `4px solid ${
              statusMessage.type === 'success'
                ? 'var(--accent)'
                : statusMessage.type === 'critical'
                ? 'var(--critical)'
                : 'var(--border)'
            }`,
            fontWeight: 600,
            fontSize: 13.5,
          }}
        >
          {statusMessage.text}
        </div>
      )}

      {/* Summary Tiles Row (Section 4) */}
      <div className="grid-3" style={{ gridTemplateColumns: 'repeat(4, 1fr)', marginBottom: 20 }}>
        <StatTile label="Registered Crops" value={String(totalRegisteredCount)} icon="myCrops" iconTone="violet" />
        <StatTile label="Active Crops" value={String(activeCropsCount)} tone="accent" icon="dashboard" iconTone="teal" />
        <StatTile label="Completed Crops" value={String(completedCropsCount)} icon="bookings" iconTone="amber" />
        <StatTile
          label="Total Remaining Quota"
          value={`${totalRemainingQty} Qtl`}
          tone={totalRemainingQty > 0 ? 'accent' : 'warn'}
          icon="payments"
          iconTone={totalRemainingQty > 0 ? 'teal' : 'critical'}
        />
      </div>

      {/* Search, Filter Tabs & Sort Controls (Sections 35 & 36) */}
      <div
        className="card"
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: 12,
          padding: '12px 16px',
          marginBottom: 16,
          background: 'var(--surface)',
          border: '1px solid var(--border)',
        }}
      >
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
          {/* Status Tabs */}
          {[
            { id: 'ALL', label: `All (${totalRegisteredCount})` },
            { id: 'ACTIVE', label: `Active (${activeCropsCount})` },
            { id: 'PENDING', label: 'Pending Eligibility' },
            { id: 'COMPLETED', label: `Completed (${completedCropsCount})` },
            { id: 'INACTIVE', label: `Inactive (${inactiveCropsCount})` },
          ].map((tab) => (
            <button
              key={tab.id}
              className={`badge-filter ${statusFilter === tab.id ? 'active' : ''}`}
              style={{ padding: '5px 12px', fontSize: 12.5 }}
              onClick={() => setStatusFilter(tab.id)}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
          {/* Instant Search */}
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search crop name..."
            style={{ padding: '6px 12px', fontSize: 13, minWidth: 200, borderRadius: 6 }}
          />

          {/* Sort Dropdown */}
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            style={{ padding: '6px 10px', fontSize: 12.5, borderRadius: 6 }}
          >
            <option value="RECENT">Recently Added</option>
            <option value="OLDEST">Oldest Added</option>
            <option value="NAME">Name A-Z</option>
            <option value="REMAINING">Remaining Quota</option>
          </select>
        </div>
      </div>

      {/* Crops List (Section 4 & 48) */}
      {filteredCrops.length === 0 ? (
        <div className="card empty-note" style={{ textAlign: 'center', padding: '40px 20px', border: '1px solid var(--border)' }}>
          <div style={{ fontSize: 36, marginBottom: 12 }}>🌱</div>
          <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 6 }}>
            {crops.length === 0 ? 'No crops are registered yet.' : 'No crops match the selected filter.'}
          </h3>
          <p style={{ color: 'var(--ink-muted)', fontSize: 13, maxWidth: 480, margin: '0 auto 16px' }}>
            {crops.length === 0
              ? 'Register your agricultural crops with KisanSeva to unlock government procurement slots and direct benefit transfers.'
              : 'Try clearing the search query or switching to the "All" filter tab.'}
          </p>
          {crops.length === 0 ? (
            <button className="btn btn-primary" onClick={() => setIsAddOpen(true)}>
              ➕ Register Your First Crop
            </button>
          ) : (
            <button
              className="btn btn-ghost"
              onClick={() => {
                setSearchQuery('');
                setStatusFilter('ALL');
              }}
            >
              Clear Filters
            </button>
          )}
        </div>
      ) : (
        <div className="grid-2" style={{ gridTemplateColumns: '1fr', gap: 16 }}>
          {filteredCrops.map((c) => {
            const isCustom = c.cropSource === 'CUSTOM';
            const isInactive = c.status === CROP_STATUS.INACTIVE || c.status === CROP_STATUS.ARCHIVED;
            const isCompleted = !isInactive && (c.status === CROP_STATUS.COMPLETED || c.remainingQuantity === 0);
            const formattedDate = CropRepository.formatCropDate(c.registrationDate);
            
            const rawEntitlement = parseFloat(c.entitlementQuantity != null ? c.entitlementQuantity : c.eligibleQty) || 0;
            const rawProcured = parseFloat(c.procuredQuantity != null ? c.procuredQuantity : c.alreadyProcuredQty) || 0;
            const displayEntitlement = Math.max(rawEntitlement, rawProcured);
            const displayProcured = rawProcured;
            const displayRemaining = isCompleted ? 0 : Math.max(0, displayEntitlement - displayProcured);
            const procuredPct =
              displayEntitlement > 0
                ? Math.min(100, Math.round((displayProcured / displayEntitlement) * 100))
                : (isCompleted ? 100 : 0);

            return (
              <div
                className="card"
                key={c.cropRecordId}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 12,
                  border: isInactive
                    ? '1.5px solid rgba(239, 68, 68, 0.4)'
                    : isCompleted
                    ? '1.5px solid rgba(22, 163, 74, 0.35)'
                    : '1px solid var(--border)',
                  borderLeft: isInactive
                    ? '5px solid var(--critical, #EF4444)'
                    : isCompleted
                    ? '5px solid var(--success, #16A34A)'
                    : '1px solid var(--border)',
                  background: 'var(--surface)',
                  boxShadow: isInactive || isCompleted ? '0 2px 8px rgba(0, 0, 0, 0.08)' : undefined,
                  opacity: isInactive ? 0.85 : 1,
                  position: 'relative',
                }}
              >
                {/* Header Row */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div
                      className="avatar"
                      style={{
                        width: 44,
                        height: 44,
                        background: isInactive
                          ? 'rgba(239, 68, 68, 0.12)'
                          : isCompleted
                          ? 'rgba(22, 163, 74, 0.14)'
                          : 'var(--accent-soft)',
                        color: isInactive
                          ? 'var(--critical, #EF4444)'
                          : isCompleted
                          ? 'var(--success, #16A34A)'
                          : 'var(--accent)',
                        fontSize: 20,
                        borderRadius: 8,
                        border: isInactive
                          ? '1px solid rgba(239, 68, 68, 0.25)'
                          : isCompleted
                          ? '1px solid rgba(22, 163, 74, 0.25)'
                          : undefined,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      {isInactive ? '⏸️' : isCompleted ? '🌾' : isCustom ? '🌿' : '🌾'}
                    </div>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                        <span style={{ fontSize: 17, fontWeight: 700, color: 'var(--ink)' }}>{c.cropName}</span>
                        {isCustom ? (
                          <span className="badge" style={{ background: '#E0F2FE', color: '#0369A1', fontSize: 11 }}>
                            Custom Crop
                          </span>
                        ) : (
                          <span className="badge" style={{ background: 'var(--surface-2)', color: 'var(--ink-muted)', border: '1px solid var(--border)', fontSize: 11 }}>
                            MSP Crop
                          </span>
                        )}
                        {isInactive ? (
                          <span
                            className="badge critical"
                            style={{
                              fontSize: 11,
                              fontWeight: 700,
                              letterSpacing: '0.03em',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: 4,
                            }}
                          >
                            ⏸️ INACTIVE
                          </span>
                        ) : isCompleted ? (
                          <span
                            className="badge success"
                            style={{
                              fontSize: 11,
                              fontWeight: 700,
                              letterSpacing: '0.03em',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: 4,
                            }}
                          >
                            ✓ COMPLETED
                          </span>
                        ) : (
                          <span className="badge success" style={{ fontSize: 11, fontWeight: 700 }}>
                            {c.status}
                          </span>
                        )}
                      </div>
                      <div style={{ fontSize: 12, color: 'var(--ink-muted)', marginTop: 3 }}>
                        Added on: <strong>{formattedDate}</strong> · ID: <span className="mono">{c.cropRecordId}</span> · {c.season}
                        {isInactive ? (
                          <span style={{ color: 'var(--critical)', fontWeight: 600, marginLeft: 6 }}>
                            · Currently Deactivated
                          </span>
                        ) : isCompleted ? (
                          <span style={{ color: 'var(--success)', fontWeight: 600, marginLeft: 6 }}>
                            · Quota Fulfilled
                          </span>
                        ) : null}
                      </div>
                    </div>
                  </div>

                  {/* Status Badges & Actions */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                    {isInactive ? (
                      <span
                        className="badge critical"
                        style={{
                          padding: '6px 12px',
                          fontSize: 12,
                          fontWeight: 600,
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 6,
                        }}
                      >
                        <span className="badge-dot" style={{ background: 'var(--critical)' }}></span>
                        Deactivated
                      </span>
                    ) : isCompleted ? (
                      <span
                        className="badge success"
                        style={{
                          padding: '6px 12px',
                          fontSize: 12,
                          fontWeight: 600,
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 6,
                        }}
                      >
                        <span className="badge-dot" style={{ background: 'var(--success)' }}></span>
                        ✓ 100% Procured
                      </span>
                    ) : (
                      <span className={`badge ${c.eligibilityStatus === ELIGIBILITY_STATUS.ELIGIBLE ? 'success' : c.eligibilityStatus === ELIGIBILITY_STATUS.NOT_ELIGIBLE ? 'critical' : 'warn'}`}>
                        <span className="badge-dot"></span>
                        {c.eligibilityStatus === ELIGIBILITY_STATUS.ELIGIBLE
                          ? '✓ Eligible'
                          : c.eligibilityStatus === ELIGIBILITY_STATUS.NOT_ELIGIBLE
                          ? '✕ Not Eligible'
                          : '⏳ Verification Pending'}
                      </span>
                    )}

                    <button
                      type="button"
                      className="btn btn-ghost"
                      style={{ padding: '6px 12px', fontSize: 12, border: '1px solid var(--border)' }}
                      onClick={() => setSelectedCropDetail(c)}
                    >
                      👁️ {t.viewDetails || 'View Details'}
                    </button>

                    <button
                      type="button"
                      className="btn btn-ghost"
                      style={{ padding: '6px 12px', fontSize: 12, border: '1px solid var(--border)' }}
                      onClick={() => setEditingCrop(c)}
                      title="Edit crop details"
                    >
                      ✏️ Edit
                    </button>

                    <button
                      type="button"
                      className="btn btn-ghost"
                      style={{ padding: '6px 12px', fontSize: 12, border: '1px solid var(--border)' }}
                      onClick={() => setSelectedCropEligibility(c)}
                    >
                      📊 {t.viewEligibility || 'Eligibility'}
                    </button>

                    {!isCompleted && !isInactive && displayRemaining > 0 && (
                      <button
                        type="button"
                        className="btn btn-primary"
                        style={{ padding: '6px 14px', fontSize: 12 }}
                        onClick={() => onBookSlotForCrop && onBookSlotForCrop(c)}
                      >
                        📅 Book Slot
                      </button>
                    )}

                    {isInactive ? (
                      <button
                        type="button"
                        className="btn btn-primary"
                        style={{ padding: '6px 12px', fontSize: 12 }}
                        title="Reactivate this crop"
                        onClick={() => handleReactivate(c)}
                      >
                        ▶️ Reactivate
                      </button>
                    ) : (
                      <button
                        type="button"
                        className="btn btn-ghost"
                        style={{ padding: '6px 10px', fontSize: 12, color: '#D97706', border: '1px solid var(--border)' }}
                        title="Deactivate crop (archive without losing data)"
                        onClick={() => {
                          if (window.confirm(`Are you sure you want to deactivate "${c.cropName}"? It will be archived and hidden from slot booking, and can be reactivated anytime.`)) {
                            handleDeactivate(c);
                          }
                        }}
                      >
                        ⏸️ Deactivate
                      </button>
                    )}

                    <button
                      type="button"
                      className="btn btn-ghost"
                      style={{ padding: '6px 10px', fontSize: 12, color: 'var(--critical)', border: '1px solid var(--border)' }}
                      title="Permanently delete crop"
                      onClick={() => {
                        if (window.confirm(`Are you sure you want to permanently delete "${c.cropName}"? This action cannot be undone.`)) {
                          handleDelete(c);
                        }
                      }}
                    >
                      🗑️ Delete
                    </button>
                  </div>
                </div>

                {/* Deactivated Notice Banner */}
                {isInactive && (
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      flexWrap: 'wrap',
                      gap: 8,
                      padding: '8px 14px',
                      background: 'rgba(239, 68, 68, 0.08)',
                      border: '1px solid rgba(239, 68, 68, 0.25)',
                      borderRadius: 8,
                      fontSize: 12.5,
                      color: 'var(--critical)',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span>⏸️</span>
                      <span>
                        <strong>Crop Deactivated:</strong> This crop is archived and temporarily inactive. Click Reactivate to make it active again.
                      </span>
                    </div>
                    <button
                      type="button"
                      className="btn btn-ghost"
                      style={{ padding: '4px 10px', fontSize: 11.5, background: 'var(--surface)' }}
                      onClick={() => handleReactivate(c)}
                    >
                      ▶️ Reactivate Now
                    </button>
                  </div>
                )}

                {/* Completed Government Procurement Notice Banner */}
                {isCompleted && (
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      flexWrap: 'wrap',
                      gap: 8,
                      padding: '8px 14px',
                      background: 'rgba(22, 163, 74, 0.08)',
                      border: '1px solid rgba(22, 163, 74, 0.22)',
                      borderRadius: 8,
                      fontSize: 12.5,
                      color: 'var(--ink)',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ fontSize: 16 }}>✅</span>
                      <span>
                        <strong style={{ color: 'var(--success)' }}>Procurement Cycle Completed:</strong> Full entitled quota has been procured and recorded at the mandi centre.
                      </span>
                    </div>
                    <span className="mono" style={{ fontSize: 11.5, color: 'var(--ink-muted)', fontWeight: 600 }}>
                      Record Archived · Quota Closed
                    </span>
                  </div>
                )}

                <div className="divider" style={{ margin: '2px 0' }}></div>

                {/* Metrics Grid (Section 4 & 48) */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '10px 14px', fontSize: 13 }}>
                  <div>
                    <div className="label" style={{ color: 'var(--ink-muted)', fontSize: 11, marginBottom: 3 }}>Plot & Land Area</div>
                    <div className="mono" style={{ fontWeight: 600, color: 'var(--ink)' }}>
                      {c.plotReference || 'Main Plot'} ({c.landArea} Acres)
                    </div>
                  </div>
                  <div>
                    <div className="label" style={{ color: 'var(--ink-muted)', fontSize: 11, marginBottom: 3 }}>Government Entitlement</div>
                    <div className="mono" style={{ fontWeight: 700, color: 'var(--accent)' }}>
                      {displayEntitlement} Qtl
                    </div>
                  </div>
                  <div>
                    <div className="label" style={{ color: 'var(--ink-muted)', fontSize: 11, marginBottom: 3 }}>Finalized Procured</div>
                    <div className="mono" style={{ fontWeight: 600, color: isCompleted ? 'var(--success)' : 'var(--ink)' }}>
                      {displayProcured} Qtl {isCompleted && '✓'}
                    </div>
                  </div>
                  <div>
                    <div className="label" style={{ color: 'var(--ink-muted)', fontSize: 11, marginBottom: 3 }}>Remaining Quota</div>
                    <div
                      className="mono"
                      style={{
                        fontWeight: 700,
                        color: isCompleted ? 'var(--success)' : displayRemaining > 0 ? 'var(--success)' : 'var(--critical)',
                      }}
                    >
                      {isCompleted ? '0 Qtl (Completed)' : `${displayRemaining} Qtl`}
                    </div>
                  </div>
                </div>

                {/* Progress Bar (Section 48) */}
                <div style={{ marginTop: 2 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11.5, color: 'var(--ink-muted)', marginBottom: 4 }}>
                    <span style={{ fontWeight: isCompleted ? 600 : 400, color: isCompleted ? 'var(--success)' : 'var(--ink-muted)' }}>
                      {isCompleted ? '✓ Procurement Fully Completed (100%)' : `Procurement Progress (${procuredPct}%)`}
                    </span>
                    <span className="mono" style={{ fontWeight: 600, color: 'var(--ink)' }}>
                      {displayProcured} / {displayEntitlement} Qtl
                    </span>
                  </div>
                  <div style={{ height: 7, background: 'var(--surface-2)', borderRadius: 10, overflow: 'hidden' }}>
                    <div
                      style={{
                        width: `${isCompleted ? 100 : procuredPct}%`,
                        height: '100%',
                        background: isCompleted ? 'var(--success, #16A34A)' : 'var(--accent)',
                        borderRadius: 10,
                        transition: 'width .3s ease',
                      }}
                    ></div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modals */}
      <AddCropModal
        t={t}
        lang={lang}
        farmer={farmer}
        isOpen={isAddOpen}
        onClose={() => setIsAddOpen(false)}
        onAddCrop={handleAddCrop}
        onSelectExistingCrop={(existing) => {
          setSelectedCropDetail(existing);
        }}
      />

      <CropDetailsModal
        t={t}
        lang={lang}
        cropRecord={selectedCropDetail}
        bookings={bookings}
        onClose={() => setSelectedCropDetail(null)}
        onOpenEligibility={(cropRec) => setSelectedCropEligibility(cropRec)}
        onEditCrop={(cropRec) => {
          setSelectedCropDetail(null);
          setEditingCrop(cropRec);
        }}
        onDeactivateCrop={(cropRec) => handleDeactivate(cropRec)}
        onReactivateCrop={(cropRec) => handleReactivate(cropRec)}
        onDeleteCrop={(cropRec) => handleDelete(cropRec)}
        onBookSlotForCrop={(cropRec) => {
          setSelectedCropDetail(null);
          if (onBookSlotForCrop) onBookSlotForCrop(cropRec);
        }}
      />

      <EditCropModal
        t={t}
        lang={lang}
        farmer={farmer}
        cropRecord={editingCrop}
        isOpen={!!editingCrop}
        onClose={() => setEditingCrop(null)}
        onSaveCrop={handleSaveCrop}
      />

      <EligibilityDetailsModal
        t={t}
        lang={lang}
        farmer={farmer}
        cropRecord={selectedCropEligibility}
        onClose={() => setSelectedCropEligibility(null)}
      />
    </>
  );
}
