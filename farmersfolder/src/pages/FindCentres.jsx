import { useState, useMemo } from 'react';
import { useRealCentres } from '../services/realCentres.js';
import { CentreService } from '../services/centreService.js';
import CentreCard from '../components/CentreCard.jsx';
import CompareCentresModal from '../components/CompareCentresModal.jsx';
import CentreDetailsModal from '../components/CentreDetailsModal.jsx';

export default function FindCentres({ t, lang, farmer, onSelectCentreForBooking }) {
  const { centres: CENTRES, loading: centresLoading, error: centresError } = useRealCentres();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [sortBy, setSortBy] = useState('nearest');
  const [useGps, setUseGps] = useState(false);
  const [gpsLoading, setGpsLoading] = useState(false);
  const [comparedCentreIds, setComparedCentreIds] = useState([]);
  const [selectedDetailCentre, setSelectedDetailCentre] = useState(null);
  const [isCompareModalOpen, setIsCompareModalOpen] = useState(false);

  // GPS Location Trigger
  function handleToggleGps() {
    if (!useGps) {
      if ('geolocation' in navigator) {
        setGpsLoading(true);
        navigator.geolocation.getCurrentPosition(
          (pos) => {
            setGpsLoading(false);
            setUseGps(true);
          },
          (err) => {
            setGpsLoading(false);
            alert('GPS permission denied or unavailable. Falling back to village/district location.');
          }
        );
      } else {
        alert('Geolocation is not supported by your browser.');
      }
    } else {
      setUseGps(false);
    }
  }

  // Filter & Search
  const filteredCentres = useMemo(() => {
    return CENTRES.filter((c) => {
      const nameMatch = (c[lang] || c.en).toLowerCase().includes(searchTerm.toLowerCase());
      const villageMatch = (c.village || '').toLowerCase().includes(searchTerm.toLowerCase());
      const districtMatch = (c.district || '').toLowerCase().includes(searchTerm.toLowerCase());
      const pinMatch = (c.pin || '').includes(searchTerm);
      const matchesSearch = nameMatch || villageMatch || districtMatch || pinMatch;

      const matchesStatus = statusFilter === 'ALL' || c.operatingStatus === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [CENTRES, searchTerm, statusFilter, lang]);

  // Sort
  const sortedCentres = useMemo(() => {
    return CentreService.sortCentres(filteredCentres, sortBy);
  }, [filteredCentres, sortBy]);

  // Compare Toggle
  function handleToggleCompare(centre) {
    if (comparedCentreIds.includes(centre.id)) {
      setComparedCentreIds(comparedCentreIds.filter((id) => id !== centre.id));
    } else {
      if (comparedCentreIds.length >= 3) {
        alert('You can compare a maximum of 3 procurement centres side-by-side.');
        return;
      }
      const nextIds = [...comparedCentreIds, centre.id];
      setComparedCentreIds(nextIds);
      // If 2 or more centres are selected, automatically open comparison modal
      if (nextIds.length >= 2) {
        setIsCompareModalOpen(true);
      }
    }
  }

  const comparedCentres = CENTRES.filter((c) => comparedCentreIds.includes(c.id));

  return (
    <>
      {/* Header Title */}
      <div className="section-title">
        <div>
          <h2>🏢 {t.findCentresTitle || 'Find & Compare Procurement Centres'}</h2>
          <div style={{ fontSize: 13, color: 'var(--ink-muted)', marginTop: 2 }}>
            {t.findCentresSub || 'Compare nearby mandis, live queue congestion, and operational capacity.'}
          </div>
        </div>
      </div>

      {/* Discovery & Filter Bar */}
      <div className="card" style={{ marginBottom: 18, padding: '16px 18px', border: '1px solid var(--border)' }}>
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
          {/* Search Box */}
          <div style={{ flex: 2, minWidth: 240 }}>
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder={t.searchPlacePlaceholder || 'Search village, district, or PIN (e.g. Kakinada, 533001)...'}
            />
          </div>

          {/* GPS Toggle */}
          <button
            className={`btn ${useGps ? 'btn-primary' : 'btn-ghost'}`}
            onClick={handleToggleGps}
            disabled={gpsLoading}
            style={{ padding: '10px 14px', fontSize: 13 }}
          >
            {gpsLoading ? '⏳ Locating...' : useGps ? '📍 GPS Active' : '📡 Use My GPS'}
          </button>

          {/* Status Filter */}
          <div style={{ flex: 1, minWidth: 140 }}>
            <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
              <option value="ALL">All Statuses</option>
              <option value="OPEN">OPEN Only</option>
              <option value="FULL">FULL Only</option>
              <option value="MAINTENANCE">MAINTENANCE</option>
            </select>
          </div>

          {/* Sort By Dropdown */}
          <div style={{ flex: 1, minWidth: 160 }}>
            <select value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
              <option value="nearest">Sort: Nearest Distance</option>
              <option value="queue">Sort: Shortest Queue</option>
              <option value="wait">Sort: Shortest Wait Time</option>
              <option value="availability">Sort: Highest Availability</option>
            </select>
          </div>
        </div>

        {/* Quick Filter Chips */}
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 12, paddingTop: 12, borderTop: '1px solid var(--border)' }}>
          <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--ink-muted)', alignSelf: 'center' }}>
            Quick Filters:
          </span>
          {[
            { id: 'ALL', label: `All Mandis (${CENTRES.length})` },
            { id: 'OPEN', label: '🟢 Open Mandis' },
            { id: 'NEAR', label: '📍 Nearest' },
            { id: 'LOW_WAIT', label: '⚡ Shortest Wait' },
          ].map((chip) => (
            <button
              key={chip.id}
              className={`badge-filter ${
                (chip.id === 'ALL' && statusFilter === 'ALL' && sortBy === 'nearest' && !useGps) ||
                (chip.id === 'OPEN' && statusFilter === 'OPEN') ||
                (chip.id === 'NEAR' && sortBy === 'nearest' && useGps) ||
                (chip.id === 'LOW_WAIT' && sortBy === 'wait')
                  ? 'active'
                  : ''
              }`}
              onClick={() => {
                if (chip.id === 'ALL') {
                  setStatusFilter('ALL');
                  setSortBy('nearest');
                  setSearchTerm('');
                  setUseGps(false);
                } else if (chip.id === 'OPEN') {
                  setStatusFilter('OPEN');
                } else if (chip.id === 'NEAR') {
                  setSortBy('nearest');
                  setUseGps(true);
                } else if (chip.id === 'LOW_WAIT') {
                  setSortBy('wait');
                }
              }}
            >
              {chip.label}
            </button>
          ))}
        </div>
      </div>

      {/* Results List */}
      {centresLoading ? (
        <div className="card empty-note" style={{ textAlign: 'center', padding: '32px 20px' }}>
          ⏳ Loading procurement centres from the mandi server...
        </div>
      ) : centresError ? (
        <div className="hint error" style={{ padding: '14px 16px', borderRadius: 8 }}>
          ⚠️ {centresError}
        </div>
      ) : sortedCentres.length === 0 ? (
        <div className="card empty-note" style={{ textAlign: 'center', padding: '32px 20px' }}>
          🔍 No procurement centres found matching your search. Try changing your search query or filters.
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(380px, 1fr))', gap: 16 }}>
          {sortedCentres.map((centre) => (
            <CentreCard
              key={centre.id}
              t={t}
              lang={lang}
              centre={centre}
              isCompared={comparedCentreIds.includes(centre.id)}
              onToggleCompare={handleToggleCompare}
              onViewDetails={(c) => setSelectedDetailCentre(c)}
              onSelectForBooking={(c) => onSelectCentreForBooking(c)}
            />
          ))}
        </div>
      )}

      {/* Sticky Bottom Comparison Floating Bar */}
      {comparedCentreIds.length > 0 && (
        <div
          style={{
            position: 'fixed',
            bottom: 24,
            left: '50%',
            transform: 'translateX(-50%)',
            zIndex: 90,
            background: 'var(--surface)',
            border: '2px solid var(--accent)',
            borderRadius: 100,
            padding: '8px 20px',
            boxShadow: '0 20px 40px rgba(15, 23, 42, 0.25)',
            display: 'flex',
            alignItems: 'center',
            gap: 14,
            animation: 'fadeIn 0.2s ease-out',
          }}
        >
          <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--ink)' }}>
            📊 {comparedCentreIds.length} {comparedCentreIds.length === 1 ? 'centre' : 'centres'} selected
          </span>
          <button
            className="btn btn-primary"
            style={{ padding: '6px 14px', fontSize: 12.5 }}
            onClick={() => setIsCompareModalOpen(true)}
          >
            {t.compareCentres || 'Compare Now'} ({comparedCentreIds.length}) →
          </button>
          <button
            className="btn btn-ghost"
            style={{ padding: '4px 8px', fontSize: 11, borderRadius: '50%', width: 26, height: 26, minWidth: 26, color: 'var(--critical)' }}
            onClick={() => {
              setComparedCentreIds([]);
              setIsCompareModalOpen(false);
            }}
            title="Clear comparison selection"
          >
            ✕
          </button>
        </div>
      )}

      {/* Modals */}
      <CompareCentresModal
        t={t}
        lang={lang}
        isOpen={isCompareModalOpen}
        comparedCentres={comparedCentres}
        allCentres={CENTRES}
        onClose={() => setIsCompareModalOpen(false)}
        onRemoveCentre={(id) => setComparedCentreIds((prev) => prev.filter((cid) => cid !== id))}
        onClearAll={() => {
          setComparedCentreIds([]);
          setIsCompareModalOpen(false);
        }}
        onAddCentre={(id) => {
          if (comparedCentreIds.length < 3 && !comparedCentreIds.includes(id)) {
            setComparedCentreIds((prev) => [...prev, id]);
          }
        }}
        onSelectCentre={(c) => onSelectCentreForBooking(c)}
      />

      <CentreDetailsModal
        t={t}
        lang={lang}
        centre={selectedDetailCentre}
        onClose={() => setSelectedDetailCentre(null)}
        onSelectForBooking={(c) => onSelectCentreForBooking(c)}
      />
    </>
  );
}
