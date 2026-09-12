import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Building2, MapPin, Warehouse, PlusCircle, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { getCenters, createCenter } from '../api/centersApi';
import './Capacity.css';

const EMPTY_FORM = { name: '', location: '', district: '', capacity: '100' };

export default function Centers() {
  const [centers, setCenters] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');

  const [form, setForm] = useState(EMPTY_FORM);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [justCreated, setJustCreated] = useState(false);

  function loadCenters() {
    setLoading(true);
    setLoadError('');
    getCenters()
      .then((list) => setCenters(Array.isArray(list) ? list : []))
      .catch((err) => setLoadError(err.message || 'Could not load procurement centers.'))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    loadCenters();
  }, []);

  function handleChange(e) {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setSubmitError('');

    if (!form.name.trim()) {
      setSubmitError('Centre name is required.');
      return;
    }

    setSubmitting(true);
    try {
      await createCenter({
        name: form.name.trim(),
        location: form.location.trim() || null,
        district: form.district.trim() || null,
        capacity: parseInt(form.capacity, 10) || 100,
      });
      setForm(EMPTY_FORM);
      setJustCreated(true);
      setTimeout(() => setJustCreated(false), 3000);
      loadCenters();
    } catch (err) {
      setSubmitError(err.message || 'Could not create procurement centre.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="capacity-container">
      <motion.header
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="capacity-header-card"
      >
        <div>
          <div className="capacity-header-badge">
            <Building2 size={13} />
            <span>Procurement Network</span>
          </div>
          <h1 className="capacity-title">Procurement Centres</h1>
          <p className="capacity-subtext">Create and manage the mandi centres farmers can book slots at</p>
        </div>
      </motion.header>

      <motion.form
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        onSubmit={handleSubmit}
        className="capacity-form-card"
      >
        <div className="form-card-header">
          <h2 className="form-card-title">Add a New Centre</h2>
          <p className="form-card-subtitle">This centre appears immediately in the Farmer Portal's Find Centres page</p>
        </div>

        <div className="form-grid">
          <div className="form-group full-width">
            <label htmlFor="name">
              <Building2 size={15} />
              <span>Centre Name</span>
            </label>
            <input
              id="name"
              type="text"
              name="name"
              placeholder="e.g. Kakinada APMC Mandi Centre"
              value={form.name}
              onChange={handleChange}
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="district">
              <MapPin size={15} />
              <span>District</span>
            </label>
            <input
              id="district"
              type="text"
              name="district"
              placeholder="e.g. East Godavari"
              value={form.district}
              onChange={handleChange}
            />
          </div>

          <div className="form-group">
            <label htmlFor="capacity">
              <Warehouse size={15} />
              <span>Daily Farmer Capacity</span>
            </label>
            <input
              id="capacity"
              type="number"
              name="capacity"
              min="1"
              placeholder="e.g. 100"
              value={form.capacity}
              onChange={handleChange}
              className="font-mono"
            />
          </div>

          <div className="form-group full-width">
            <label htmlFor="location">
              <MapPin size={15} />
              <span>Address / Location</span>
            </label>
            <input
              id="location"
              type="text"
              name="location"
              placeholder="e.g. NH-16 Bypass Road, Market Yard-2, Kakinada"
              value={form.location}
              onChange={handleChange}
            />
          </div>
        </div>

        {submitError && (
          <div className="capacity-error-banner">
            <AlertTriangle size={16} />
            <span>{submitError}</span>
          </div>
        )}

        <div className="form-actions">
          <button type="submit" className="btn-update-capacity" disabled={submitting}>
            <PlusCircle size={18} />
            <span>{submitting ? 'Creating...' : 'Create Procurement Centre'}</span>
          </button>

          {justCreated && (
            <motion.span initial={{ opacity: 0, x: 5 }} animate={{ opacity: 1, x: 0 }} className="update-toast">
              <CheckCircle2 size={14} style={{ marginRight: 4 }} />
              Centre created!
            </motion.span>
          )}
        </div>
      </motion.form>

      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        className="capacity-form-card"
      >
        <div className="form-card-header">
          <h2 className="form-card-title">Existing Centres ({centers.length})</h2>
          <p className="form-card-subtitle">Live from the backend database</p>
        </div>

        {loading ? (
          <div className="field-hint">Loading centres...</div>
        ) : loadError ? (
          <div className="capacity-error-banner">
            <AlertTriangle size={16} />
            <span>{loadError}</span>
          </div>
        ) : centers.length === 0 ? (
          <div className="field-hint">No procurement centres yet. Create one above.</div>
        ) : (
          <div style={{ display: 'grid', gap: 10 }}>
            {centers.map((c) => (
              <div
                key={c.id}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '12px 16px',
                  border: '1px solid var(--border, #e2e8f0)',
                  borderRadius: 10,
                  flexWrap: 'wrap',
                  gap: 8,
                }}
              >
                <div>
                  <div style={{ fontWeight: 700 }}>{c.name}</div>
                  <div style={{ fontSize: 12.5, color: '#64748b' }}>
                    {c.location || 'No address set'} {c.district ? `· ${c.district}` : ''}
                  </div>
                </div>
                <div style={{ fontSize: 12.5, fontFamily: 'monospace', color: '#334155' }}>
                  Capacity: {c.capacity}/day · ID #{c.id}
                </div>
              </div>
            ))}
          </div>
        )}
      </motion.div>
    </div>
  );
}
