import React, { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useQueue } from '../context/QueueContext';
import { calculateNetWeight, convertKgToQuintals, validateWeighmentInputs } from '../services/procurementService';
import './Weighing.css';

/*
  HARDWARE INTEGRATION NOTE:
  No physical weighbridge API connected in this prototype.
  Staff manually input Gross and Tare weights from the weighbridge terminal.
  The system automatically calculates Net Weight (KG & Quintals).
*/

export default function Weighing() {
  const { tokenNumber } = useParams();
  const navigate = useNavigate();
  const { tokens, updateTokenWeighment } = useQueue();

  const token = tokens.find((t) => String(t.token_number) === String(tokenNumber));

  if (!token) {
    return (
      <div className="weighing-container">
        <div className="weighing-error-card">
          <div className="error-icon">⚠️</div>
          <h2>Token Not Found</h2>
          <p>No procurement token matches <strong>#{tokenNumber}</strong>.</p>
          <Link to="/queue" className="btn-back">
            ← Back to Live Queue
          </Link>
        </div>
      </div>
    );
  }

  const { weight_details } = token;
  const declaredBags = weight_details?.declared_bags || 50;
  const bagWeightKg = weight_details?.bag_weight_kg || 50;
  const declaredKg = weight_details?.declared_weight_kg || declaredBags * bagWeightKg;
  const declaredQuintals = convertKgToQuintals(declaredKg);

  // Form State initialized from token or sensible defaults
  const [weighedBags, setWeighedBags] = useState(
    weight_details?.weighed_bags ? String(weight_details.weighed_bags) : String(declaredBags)
  );
  const [grossWeight, setGrossWeight] = useState(
    weight_details?.gross_weight_kg ? String(weight_details.gross_weight_kg) : String(declaredKg + 50)
  );
  const [tareWeight, setTareWeight] = useState(
    weight_details?.tare_weight_kg !== undefined ? String(weight_details.tare_weight_kg) : '50'
  );

  const [errorMsg, setErrorMsg] = useState('');
  const [isSaved, setIsSaved] = useState(false);

  // Computed Net Weight and Quintals in Real Time
  const currentNetKg = calculateNetWeight(grossWeight, tareWeight);
  const currentQuintals = convertKgToQuintals(currentNetKg);

  const handleBagsChange = (e) => {
    const val = e.target.value;
    setWeighedBags(val === '' ? '' : val.replace(/^0+(?=\d)/, ''));
  };

  const handleGrossChange = (e) => {
    const val = e.target.value;
    setGrossWeight(val === '' ? '' : val.replace(/^0+(?=\d)/, ''));
  };

  const handleTareChange = (e) => {
    const val = e.target.value;
    setTareWeight(val === '' ? '' : val.replace(/^0+(?=\d)/, ''));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setErrorMsg('');

    const validation = validateWeighmentInputs(grossWeight, tareWeight, weighedBags);
    if (!validation.isValid) {
      setErrorMsg(validation.error);
      return;
    }

    updateTokenWeighment(token.token_number, {
      weighed_bags: parseInt(weighedBags, 10),
      gross_weight_kg: parseFloat(grossWeight),
      tare_weight_kg: parseFloat(tareWeight),
    });

    setIsSaved(true);

    setTimeout(() => {
      navigate(`/tokens/${token.token_number}`);
    }, 1500);
  };

  return (
    <div className="weighing-container">
      <div className="weighing-nav-bar">
        <Link to={`/tokens/${token.token_number}`} className="back-link">
          ← Back to Token #{token.token_number} Hub
        </Link>
        <span className="station-badge">⚖️ Weighbridge Station</span>
      </div>

      <div className="weighing-card">
        <div className="weighing-header">
          <div>
            <span className="token-label">Token #{token.token_number} • {token.farmer_id}</span>
            <h1 className="farmer-name-title">{token.farmer_name}</h1>
          </div>
          <div className="crop-tag">
            <span>Crop: <strong>{token.crop} ({token.variety || 'Standard'})</strong></span>
          </div>
        </div>

        {/* Declared Reference Specs */}
        <div className="reference-box">
          <div className="ref-item">
            <span className="ref-label">Declared Bag Count</span>
            <span className="ref-value">{declaredBags} bags ({bagWeightKg} kg/bag)</span>
          </div>
          <div className="ref-item">
            <span className="ref-label">Declared Total Weight</span>
            <span className="ref-value">{declaredKg.toLocaleString()} kg ({declaredQuintals} quintals)</span>
          </div>
        </div>

        {/* Actual Weighbridge Measurement Form */}
        <form onSubmit={handleSubmit} className="weighing-form">
          <div className="form-row-weigh">
            <div className="form-group">
              <label htmlFor="weighed_bags">Actual Weighed Bags <span className="req">*</span></label>
              <input
                id="weighed_bags"
                type="number"
                min="1"
                step="1"
                placeholder="e.g. 98"
                value={weighedBags}
                onChange={handleBagsChange}
                disabled={isSaved}
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="gross_weight">Gross Weight (KG) <span className="req">*</span></label>
              <div className="input-with-unit">
                <input
                  id="gross_weight"
                  type="number"
                  min="1"
                  step="1"
                  placeholder="e.g. 4950"
                  value={grossWeight}
                  onChange={handleGrossChange}
                  disabled={isSaved}
                  required
                />
                <span className="input-unit">kg</span>
              </div>
              <span className="field-hint">Truck/cart + produce total weight</span>
            </div>

            <div className="form-group">
              <label htmlFor="tare_weight">Tare Weight (KG) <span className="req">*</span></label>
              <div className="input-with-unit">
                <input
                  id="tare_weight"
                  type="number"
                  min="0"
                  step="1"
                  placeholder="e.g. 100"
                  value={tareWeight}
                  onChange={handleTareChange}
                  disabled={isSaved}
                  required
                />
                <span className="input-unit">kg</span>
              </div>
              <span className="field-hint">Empty vehicle/gunny bags tare</span>
            </div>
          </div>

          {/* Real-time Net Weight Calculation Result Display */}
          <div className="net-weight-summary-card">
            <div className="net-metric-box">
              <span className="net-label">Formula: Net Weight = Gross Weight - Tare Weight</span>
              <div className="net-values-row">
                <div className="net-val-item">
                  <span className="net-sub">Net Weight (KG)</span>
                  <span className="net-big-kg">{currentNetKg.toLocaleString()} kg</span>
                </div>
                <div className="net-divider">=</div>
                <div className="net-val-item">
                  <span className="net-sub">Net Weight (Quintals)</span>
                  <span className="net-big-quintals">{currentQuintals} quintals</span>
                </div>
              </div>
            </div>
          </div>

          {errorMsg && <div className="error-banner">⚠️ {errorMsg}</div>}

          {isSaved ? (
            <div className="success-banner">
              <span className="success-icon">🟢</span>
              <div className="success-text">
                <h3>Weighment Recorded Successfully ({currentNetKg} kg / {currentQuintals} quintals)!</h3>
                <p>Stage advanced to <strong>QUALITY_CHECK</strong>. Redirecting to Token Hub...</p>
              </div>
              <button
                type="button"
                className="btn-continue"
                onClick={() => navigate(`/tokens/${token.token_number}`)}
              >
                Continue Now →
              </button>
            </div>
          ) : (
            <div className="form-actions">
              <button type="submit" className="btn-save-weight">
                Save Weighbridge Record & Proceed →
              </button>
              <Link to={`/tokens/${token.token_number}`} className="btn-cancel">
                Cancel
              </Link>
            </div>
          )}
        </form>
      </div>

      <div className="hardware-notice">
        <span className="notice-icon">🔌</span>
        <p>
          <strong>Hardware Integration Note:</strong> Electronic weighbridge indicator integration pending backend integration.
          Gross and Tare weights manually recorded by staff.
        </p>
      </div>
    </div>
  );
}
