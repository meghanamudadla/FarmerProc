import React, { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useQueue } from '../context/QueueContext';
import { convertKgToQuintals } from '../services/procurementService';
import { Scale, ArrowLeft, CheckCircle2, AlertTriangle, ArrowRight, Truck, Info } from 'lucide-react';
import './Weighing.css';

export default function Weighing() {
  const { tokenNumber } = useParams();
  const navigate = useNavigate();
  const { tokens, updateWeightDetails } = useQueue();

  const token = tokens.find((t) => String(t.token_number) === String(tokenNumber));

  const initialDeclaredBags = token?.weight_details?.declared_bags || 50;
  const initialBagWeightKg = token?.weight_details?.bag_weight_kg || 50;
  const initialDeclaredKg = token?.weight_details?.declared_weight_kg || initialDeclaredBags * initialBagWeightKg;

  const [declaredBags, setDeclaredBags] = useState(String(initialDeclaredBags));
  const [bagWeightKg, setBagWeightKg] = useState(String(initialBagWeightKg));
  const [grossWeightKg, setGrossWeightKg] = useState(String(token?.weight_details?.gross_weight_kg || ''));
  const [tareWeightKg, setTareWeightKg] = useState(String(token?.weight_details?.tare_weight_kg || ''));

  const [errorMsg, setErrorMsg] = useState('');
  const [successToast, setSuccessToast] = useState(false);

  if (!token) {
    return (
      <div className="weighing-container">
        <div className="weighing-error-card">
          <AlertTriangle size={32} className="text-red-500" />
          <h2>Token Not Found</h2>
          <p>No procurement token matches <strong>#{tokenNumber}</strong>.</p>
          <Link to="/queue" className="btn-back">
            <ArrowLeft size={15} />
            <span>Back to Live Queue</span>
          </Link>
        </div>
      </div>
    );
  }

  // Live Numeric Calculations
  const bagsNum = parseInt(declaredBags, 10) || 0;
  const bagWtNum = parseFloat(bagWeightKg) || 0;
  const declaredTotalKg = bagsNum * bagWtNum;
  const declaredQuintals = convertKgToQuintals(declaredTotalKg);

  const grossNum = parseFloat(grossWeightKg) || 0;
  const tareNum = parseFloat(tareWeightKg) || 0;
  const calculatedNetKg = Math.max(0, grossNum - tareNum);
  const calculatedNetQuintals = convertKgToQuintals(calculatedNetKg);

  const handleNumericChange = (setter) => (e) => {
    const val = e.target.value;
    const cleaned = val === '' ? '' : val.replace(/^0+(?=\d)/, '');
    setter(cleaned);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setErrorMsg('');

    if (grossNum <= 0) {
      setErrorMsg('Gross weight must be greater than 0 kg.');
      return;
    }
    if (tareNum < 0) {
      setErrorMsg('Tare weight cannot be negative.');
      return;
    }
    if (grossNum <= tareNum) {
      setErrorMsg('Gross weight must be strictly greater than Tare weight.');
      return;
    }

    const payload = {
      declared_bags: bagsNum,
      bag_weight_kg: bagWtNum,
      declared_weight_kg: declaredTotalKg,
      gross_weight_kg: grossNum,
      tare_weight_kg: tareNum,
      net_weight_kg: calculatedNetKg,
      net_quintals: calculatedNetQuintals,
      accepted_weight_kg: calculatedNetKg,
      accepted_quintals: calculatedNetQuintals,
    };

    updateWeightDetails(token.token_number, payload);
    setSuccessToast(true);

    setTimeout(() => {
      navigate(`/tokens/${token.token_number}/quality`);
    }, 1200);
  };

  return (
    <div className="weighing-container">
      {/* Top Header */}
      <motion.div 
        initial={{ opacity: 0, y: -10 }} 
        animate={{ opacity: 1, y: 0 }}
        className="weighing-nav-bar"
      >
        <Link to="/queue" className="back-link">
          <ArrowLeft size={16} />
          <span>Back to Live Queue</span>
        </Link>
        <div className="station-badge">
          <Scale size={16} />
          <span>Station: Weighbridge Counter #1</span>
        </div>
      </motion.div>

      {/* Main Banner Card */}
      <motion.div 
        initial={{ opacity: 0, y: 10 }} 
        animate={{ opacity: 1, y: 0 }}
        className="weighing-header-card"
      >
        <div className="weighing-header-left">
          <div className="token-pill font-mono">Token #{token.token_number}</div>
          <div>
            <h1 className="farmer-name">{token.farmer_name}</h1>
            <p className="farmer-meta-text">
              ID: <strong className="font-mono">{token.farmer_id}</strong> • Crop: <strong>{token.crop} ({token.variety})</strong> • {token.village}
            </p>
          </div>
        </div>
        <div className="truck-illustration-badge">
          <Truck size={20} />
          <span>Vehicle Load Scale</span>
        </div>
      </motion.div>

      {/* Form & Formula Grid */}
      <div className="weighing-grid">
        {/* Left Column: Input Form */}
        <motion.form 
          initial={{ opacity: 0, x: -15 }} 
          animate={{ opacity: 1, x: 0 }}
          onSubmit={handleSubmit} 
          className="weighing-form-card"
        >
          <h2 className="form-card-title">Weighbridge Scale Inputs</h2>
          <p className="form-card-subtitle">Enter actual scale measurements from calibrated weighbridge console</p>

          {errorMsg && (
            <div className="weighing-error-banner">
              <AlertTriangle size={16} />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Section 1: Declared Bag Parameters */}
          <div className="form-section">
            <h3 className="section-label">1. Farmer Declared Quantity</h3>
            <div className="form-row-2col">
              <div className="input-group">
                <label htmlFor="declared_bags">Bag Count (Bags)</label>
                <input
                  id="declared_bags"
                  type="number"
                  min="1"
                  value={declaredBags}
                  onChange={handleNumericChange(setDeclaredBags)}
                  required
                />
              </div>
              <div className="input-group">
                <label htmlFor="bag_weight_kg">Weight Per Bag (kg)</label>
                <input
                  id="bag_weight_kg"
                  type="number"
                  min="1"
                  value={bagWeightKg}
                  onChange={handleNumericChange(setBagWeightKg)}
                  required
                />
              </div>
            </div>
            <div className="declared-total-pill">
              <span>Declared Total:</span>
              <strong className="font-mono">{declaredTotalKg.toLocaleString()} kg ({declaredQuintals} quintals)</strong>
            </div>
          </div>

          {/* Section 2: Scale Gross and Tare Weights */}
          <div className="form-section">
            <h3 className="section-label">2. Weighbridge Scale Measurements</h3>
            <div className="form-row-2col">
              <div className="input-group">
                <label htmlFor="gross_weight_kg">Gross Weight (Loaded Scale kg)</label>
                <input
                  id="gross_weight_kg"
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="e.g. 5250"
                  value={grossWeightKg}
                  onChange={handleNumericChange(setGrossWeightKg)}
                  required
                />
                <span className="field-sub">Weight of vehicle/gunny bags loaded</span>
              </div>
              <div className="input-group">
                <label htmlFor="tare_weight_kg">Tare Weight (Empty Scale kg)</label>
                <input
                  id="tare_weight_kg"
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="e.g. 250"
                  value={tareWeightKg}
                  onChange={handleNumericChange(setTareWeightKg)}
                  required
                />
                <span className="field-sub">Weight of empty vehicle or tare containers</span>
              </div>
            </div>
          </div>

          <div className="form-actions">
            <button type="submit" className="btn-submit-weight">
              <CheckCircle2 size={18} />
              <span>Record Net Weight & Proceed to Quality Check</span>
              <ArrowRight size={16} />
            </button>
          </div>

          {successToast && (
            <motion.div initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} className="success-toast">
              <CheckCircle2 size={18} />
              <span>Net weight recorded! Redirecting to Quality Inspection...</span>
            </motion.div>
          )}
        </motion.form>

        {/* Right Column: Real-Time Calculated Formula Card */}
        <motion.div 
          initial={{ opacity: 0, x: 15 }} 
          animate={{ opacity: 1, x: 0 }}
          className="weighing-preview-card"
        >
          <h2 className="preview-card-title">Live Measurement Output</h2>

          <div className="net-weight-hero-box">
            <span className="net-hero-label">Calculated Net Grain Weight</span>
            <div className="net-hero-value font-mono">
              {calculatedNetKg.toLocaleString()} <span className="unit font-mono">kg</span>
            </div>
            <div className="net-hero-quintals font-mono">
              = {calculatedNetQuintals} quintals
            </div>
          </div>

          <div className="formula-breakdown-box">
            <h4 className="formula-title">
              <Info size={15} />
              <span>Calculation Formula</span>
            </h4>
            <div className="formula-line font-mono">
              Net Weight = Gross Weight ({grossNum.toLocaleString()} kg) - Tare Weight ({tareNum.toLocaleString()} kg)
            </div>
          </div>

          {/* Declared vs Measured Comparison */}
          <div className="comparison-box">
            <h4 className="comparison-title">Quantity Discrepancy Check</h4>
            <div className="comparison-row">
              <span>Declared Total:</span>
              <strong className="font-mono">{declaredTotalKg.toLocaleString()} kg</strong>
            </div>
            <div className="comparison-row">
              <span>Measured Net:</span>
              <strong className="font-mono">{calculatedNetKg.toLocaleString()} kg</strong>
            </div>
            <div className="comparison-row variance-row">
              <span>Variance:</span>
              <strong className={`font-mono ${calculatedNetKg - declaredTotalKg < 0 ? 'text-amber-600' : 'text-emerald-600'}`}>
                {(calculatedNetKg - declaredTotalKg).toLocaleString()} kg ({((calculatedNetKg - declaredTotalKg) / (declaredTotalKg || 1) * 100).toFixed(1)}%)
              </strong>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
