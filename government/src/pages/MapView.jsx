import React, { useState, useMemo } from 'react';
import { MapContainer, TileLayer, CircleMarker, Popup } from 'react-leaflet';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import StatusBadge from '../components/StatusBadge';
import { CENTERS, getDistrictName, getStatusColor } from '../data/mockData';

export default function MapView() {
  const navigate = useNavigate();
  const { user, isDistrictAdmin } = useAuth();
  const [layer, setLayer] = useState('status'); // 'status' or 'volume'

  const centers = useMemo(() => {
    if (isDistrictAdmin && user.district) {
      return CENTERS.filter(c => c.district === user.district);
    }
    return CENTERS;
  }, [isDistrictAdmin, user]);

  // Default center of map (India approximate center)
  const mapCenter = centers.length > 0
    ? [centers.reduce((s, c) => s + c.lat, 0) / centers.length, centers.reduce((s, c) => s + c.lng, 0) / centers.length]
    : [20.5937, 78.9629];

  const getMarkerRadius = (center) => {
    if (layer === 'volume') {
      return Math.max(8, Math.min(25, center.todayArrivals / 10));
    }
    return center.status === 'congested' ? 15 : center.status === 'busy' ? 12 : 10;
  };

  const getMarkerColor = (center) => {
    if (layer === 'volume') {
      const intensity = center.todayArrivals;
      if (intensity > 150) return '#ef4444';
      if (intensity > 80) return '#f59e0b';
      return '#3b82f6';
    }
    return getStatusColor(center.status);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-text-primary">State Map View</h1>
          <p className="text-xs text-text-muted mt-0.5">{centers.length} centers mapped • Click markers for details</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setLayer('status')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${layer === 'status' ? 'bg-accent-blue text-white' : 'bg-bg-card text-text-secondary border border-gray-700 hover:bg-bg-hover'}`}
          >
            🚦 Status
          </button>
          <button
            onClick={() => setLayer('volume')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${layer === 'volume' ? 'bg-accent-blue text-white' : 'bg-bg-card text-text-secondary border border-gray-700 hover:bg-bg-hover'}`}
          >
            📊 Volume
          </button>
        </div>
      </div>

      {/* Legend */}
      <div className="flex items-center gap-4 text-xs text-text-secondary">
        {layer === 'status' ? (
          <>
            <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-status-normal" /> Normal</span>
            <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-status-busy" /> Busy</span>
            <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-status-congested" /> Congested</span>
            <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-status-offline" /> Offline</span>
          </>
        ) : (
          <>
            <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-accent-blue" /> Low (&lt;80)</span>
            <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-status-busy" /> Medium (80-150)</span>
            <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-status-congested" /> High (&gt;150)</span>
          </>
        )}
      </div>

      {/* Map */}
      <div className="rounded-xl overflow-hidden border border-gray-800" style={{ height: '550px' }}>
        <MapContainer center={mapCenter} zoom={6} style={{ height: '100%', width: '100%' }} scrollWheelZoom={true}>
          <TileLayer
            url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
            attribution='&copy; <a href="https://carto.com/">CARTO</a>'
          />
          {centers.map(center => (
            <CircleMarker
              key={center.id}
              center={[center.lat, center.lng]}
              radius={getMarkerRadius(center)}
              pathOptions={{
                color: getMarkerColor(center),
                fillColor: getMarkerColor(center),
                fillOpacity: 0.6,
                weight: 2,
              }}
            >
              <Popup>
                <div className="min-w-48">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-semibold text-sm">{center.name}</span>
                  </div>
                  <div className="text-xs space-y-1 mb-3">
                    <div className="flex justify-between"><span className="text-gray-400">District</span><span>{getDistrictName(center.district)}</span></div>
                    <div className="flex justify-between"><span className="text-gray-400">Queue</span><span className="font-bold">{center.queueLength}</span></div>
                    <div className="flex justify-between"><span className="text-gray-400">Wait</span><span>{center.expectedWait}m</span></div>
                    <div className="flex justify-between"><span className="text-gray-400">Capacity</span><span>{center.capacityPercent}%</span></div>
                    <div className="flex justify-between"><span className="text-gray-400">Arrivals</span><span>{center.todayArrivals}</span></div>
                    <div className="flex justify-between"><span className="text-gray-400">Staff</span><span>{center.staffOnDuty}</span></div>
                  </div>
                  <button
                    onClick={() => navigate(`/centers/${center.id}`)}
                    className="w-full text-center text-xs bg-blue-600 text-white py-1.5 rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    View Full Center →
                  </button>
                </div>
              </Popup>
            </CircleMarker>
          ))}
        </MapContainer>
      </div>
    </div>
  );
}
