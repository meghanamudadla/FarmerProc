import { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import { CentreService } from '../services/centreService.js';

export default function CentresMap({
  t,
  lang,
  centres = [],
  onViewDetails,
  onSelectForBooking,
  farmer,
}) {
  const mapContainerRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const markersLayerRef = useRef(null);
  const [selectedCentre, setSelectedCentre] = useState(null);

  // Status colors & labels
  const getStatusTheme = (status) => {
    switch (status) {
      case 'OPEN':
        return { color: '#059669', bg: '#ecfdf5', label: lang === 'en' ? 'OPEN' : 'తెరిచి ఉంది', icon: '🟢' };
      case 'FULL':
        return { color: '#dc2626', bg: '#fef2f2', label: lang === 'en' ? 'CAPACITY FULL' : 'పూర్తిగా నిండింది', icon: '🔴' };
      case 'MAINTENANCE':
        return { color: '#d97706', bg: '#fffbeb', label: lang === 'en' ? 'MAINTENANCE' : 'నిర్వహణలో ఉంది', icon: '🟡' };
      default:
        return { color: '#6b7280', bg: '#f3f4f6', label: lang === 'en' ? 'CLOSED' : 'మూసివేయబడింది', icon: '⚪' };
    }
  };

  useEffect(() => {
    if (!mapContainerRef.current) return;

    // Destroy previous map instance if it exists
    if (mapInstanceRef.current) {
      mapInstanceRef.current.remove();
      mapInstanceRef.current = null;
    }

    // Default center: Andhra Pradesh Godavari agricultural corridor
    const defaultLat = 16.9891;
    const defaultLng = 82.2475;

    const map = L.map(mapContainerRef.current, {
      center: [defaultLat, defaultLng],
      zoom: 10,
      zoomControl: true,
      scrollWheelZoom: true,
    });

    mapInstanceRef.current = map;

    // Clean, high-performance Voyager map tiles (No API key needed)
    L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/">CARTO</a>',
      maxZoom: 19,
      subdomains: 'abcd',
    }).addTo(map);

    const markersGroup = L.featureGroup().addTo(map);
    markersLayerRef.current = markersGroup;

    return () => {
      map.remove();
      mapInstanceRef.current = null;
    };
  }, []);

  // Update markers when centres change
  useEffect(() => {
    const map = mapInstanceRef.current;
    const markersGroup = markersLayerRef.current;
    if (!map || !markersGroup) return;

    markersGroup.clearLayers();

    const validCentres = centres.filter((c) => {
      const lat = c.latitude || c.lat;
      const lng = c.longitude || c.lng;
      return typeof lat === 'number' && typeof lng === 'number';
    });

    if (validCentres.length === 0) return;

    validCentres.forEach((centre) => {
      const lat = centre.latitude || centre.lat;
      const lng = centre.longitude || centre.lng;
      const statusTheme = getStatusTheme(centre.operatingStatus);
      const name = centre[lang] || centre.en || 'Procurement Center';
      const queue = centre.currentQueue != null ? centre.currentQueue : 0;
      const waitMins = CentreService.calculateEstWaitTime(queue, centre.numberOfCounters || 3);

      // Custom pulsing HTML marker
      const customIcon = L.divIcon({
        className: 'custom-mandi-marker',
        html: `
          <div style="
            position: relative;
            cursor: pointer;
            transform: translate(-50%, -50%);
            display: flex;
            flex-direction: column;
            align-items: center;
          ">
            <div style="
              background: ${statusTheme.color};
              color: #ffffff;
              padding: 4px 8px;
              border-radius: 12px;
              font-size: 11px;
              font-weight: 700;
              box-shadow: 0 4px 10px rgba(0,0,0,0.25);
              white-space: nowrap;
              border: 2px solid #ffffff;
              display: flex;
              align-items: center;
              gap: 4px;
            ">
              <span>${statusTheme.icon}</span>
              <span>${name.split(' ')[0]}</span>
              <span style="background: rgba(255,255,255,0.25); padding: 1px 4px; border-radius: 6px; font-size: 10px;">
                ${queue} in queue
              </span>
            </div>
            <div style="
              width: 0;
              height: 0;
              border-left: 6px solid transparent;
              border-right: 6px solid transparent;
              border-top: 7px solid ${statusTheme.color};
            "></div>
          </div>
        `,
        iconSize: [0, 0],
      });

      const marker = L.marker([lat, lng], { icon: customIcon });

      marker.on('click', () => {
        setSelectedCentre(centre);
      });

      marker.addTo(markersGroup);
    });

    // Fit map bounds around all markers
    try {
      const bounds = markersGroup.getBounds();
      if (bounds.isValid()) {
        map.fitBounds(bounds, { padding: [50, 50], maxZoom: 13 });
      }
    } catch (e) {}
  }, [centres, lang]);

  return (
    <div style={{ position: 'relative', width: '100%', height: '580px', borderRadius: '16px', overflow: 'hidden', border: '1px solid var(--border)', boxShadow: '0 8px 24px rgba(0,0,0,0.06)' }}>
      {/* Map Canvas Container */}
      <div ref={mapContainerRef} style={{ width: '100%', height: '100%', zIndex: 1 }} />

      {/* Top Floating GIS Legend Bar */}
      <div
        style={{
          position: 'absolute',
          top: 14,
          left: 14,
          zIndex: 1000,
          background: 'rgba(255, 255, 255, 0.95)',
          backdropFilter: 'blur(8px)',
          border: '1px solid rgba(0, 0, 0, 0.1)',
          borderRadius: '12px',
          padding: '8px 14px',
          boxShadow: '0 4px 14px rgba(0,0,0,0.12)',
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          flexWrap: 'wrap',
          fontSize: '12px',
          color: '#1f2937',
        }}
      >
        <div style={{ fontWeight: 700, color: '#065f46', display: 'flex', alignItems: 'center', gap: 4 }}>
          <span>🌾 Mandi GIS Live</span>
        </div>
        <div style={{ width: 1, height: 16, background: '#e5e7eb' }} />
        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#059669' }} />
          <span>{lang === 'en' ? 'Open (<30m wait)' : 'ఓపెన్ (<30 ని)'}</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#d97706' }} />
          <span>{lang === 'en' ? 'Busy (30-60m wait)' : 'రద్దీ (30-60 ని)'}</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#dc2626' }} />
          <span>{lang === 'en' ? 'Full (>60m wait)' : 'పూర్తిగా నిండింది'}</span>
        </div>
      </div>

      {/* Floating Center Details Overlay Card (when clicked on marker) */}
      {selectedCentre && (
        <div
          style={{
            position: 'absolute',
            bottom: 16,
            left: '50%',
            transform: 'translateX(-50%)',
            width: '92%',
            maxWidth: '520px',
            zIndex: 1000,
            background: 'rgba(255, 255, 255, 0.98)',
            backdropFilter: 'blur(10px)',
            borderRadius: '14px',
            padding: '16px 18px',
            border: '1.5px solid #059669',
            boxShadow: '0 20px 40px rgba(0, 0, 0, 0.22)',
            animation: 'fadeIn 0.2s ease-out',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 2 }}>
                <span
                  style={{
                    padding: '2px 8px',
                    borderRadius: '6px',
                    fontSize: '11px',
                    fontWeight: 700,
                    background: getStatusTheme(selectedCentre.operatingStatus).bg,
                    color: getStatusTheme(selectedCentre.operatingStatus).color,
                    border: `1px solid ${getStatusTheme(selectedCentre.operatingStatus).color}`,
                  }}
                >
                  {getStatusTheme(selectedCentre.operatingStatus).icon} {selectedCentre.operatingStatus}
                </span>
                <span style={{ fontSize: '12px', fontWeight: 600, color: '#4b5563' }}>
                  📍 {selectedCentre.distanceKm ? `${selectedCentre.distanceKm} km away` : `${selectedCentre.district} (${selectedCentre.pin || ''})`}
                </span>
              </div>
              <h3 style={{ fontSize: '16px', fontWeight: 700, margin: '4px 0 2px', color: '#111827' }}>
                {selectedCentre[lang] || selectedCentre.en}
              </h3>
              <div style={{ fontSize: '12px', color: '#6b7280' }}>
                {selectedCentre.address || `${selectedCentre.village}, ${selectedCentre.district}`}
              </div>
            </div>
            <button
              onClick={() => setSelectedCentre(null)}
              style={{
                background: 'none',
                border: 'none',
                fontSize: '16px',
                cursor: 'pointer',
                color: '#9ca3af',
                padding: '2px 6px',
              }}
            >
              ✕
            </button>
          </div>

          {/* Quick Metrics */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, margin: '12px 0', background: '#f9fafb', padding: '8px 10px', borderRadius: '8px' }}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '10.5px', color: '#6b7280' }}>{t.congestionLabel || 'Queue'}</div>
              <div style={{ fontSize: '14px', fontWeight: 800, color: '#111827' }}>
                {selectedCentre.currentQueue || 0} {lang === 'en' ? 'trucks' : 'ట్రాక్టర్లు'}
              </div>
            </div>
            <div style={{ textAlign: 'center', borderLeft: '1px solid #e5e7eb', borderRight: '1px solid #e5e7eb' }}>
              <div style={{ fontSize: '10.5px', color: '#6b7280' }}>{t.estWait || 'Est. Wait'}</div>
              <div style={{ fontSize: '14px', fontWeight: 800, color: '#059669' }}>
                ~{CentreService.calculateEstWaitTime(selectedCentre.currentQueue || 0, selectedCentre.numberOfCounters || 3)} min
              </div>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '10.5px', color: '#6b7280' }}>{t.dailyCap || 'Counters'}</div>
              <div style={{ fontSize: '14px', fontWeight: 800, color: '#111827' }}>
                {selectedCentre.numberOfCounters || 3} Active
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div style={{ display: 'flex', gap: 10, marginTop: 10 }}>
            <button
              className="btn btn-ghost"
              style={{ flex: 1, padding: '8px 12px', fontSize: '12.5px', justifyContent: 'center' }}
              onClick={() => {
                if (onViewDetails) onViewDetails(selectedCentre);
              }}
            >
              🔍 {lang === 'en' ? 'View Details' : 'వివరాలు'}
            </button>
            <button
              className="btn btn-primary"
              style={{ flex: 1.5, padding: '8px 14px', fontSize: '12.5px', justifyContent: 'center' }}
              disabled={selectedCentre.operatingStatus === 'MAINTENANCE' || selectedCentre.operatingStatus === 'CLOSED'}
              onClick={() => {
                if (onSelectForBooking) onSelectForBooking(selectedCentre);
              }}
            >
              📅 {lang === 'en' ? 'Book Slot Here' : 'ఇక్కడ స్లాట్ బుక్ చేయండి'} →
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
