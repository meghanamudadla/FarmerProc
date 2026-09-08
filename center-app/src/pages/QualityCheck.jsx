import React, { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useQueue } from '../context/QueueContext';
import { evaluateQualityRules } from '../services/procurementService';
import { FlaskConical, ArrowLeft, CheckCircle2, XCircle, AlertTriangle, ArrowRight, ShieldCheck, Sparkles, HelpCircle } from 'lucide-react';
import './QualityCheck.css';

export default function QualityCheck() {
  const { tokenNumber } = useParams();
  const navigate = useNavigate();
  const { tokens, updateQualityCheck } = useQueue();

  const token = tokens.find((t) => String(t.token_number) === String(tokenNumber));

  const initialQuality = token?.quality || {};

  const [formState, setFormState] = useState({
    moisture_percent: String(initialQuality.moisture_percent ?? 11.5),
    foreign_matter_percent: String(initialQuality.foreign_matter_percent ?? 0.8),
    damaged_grains_percent: String(initialQuality.damaged_grains_percent ?? 1.2),
    slightly_damaged_percent: String(initialQuality.slightly_damaged_percent ?? 1.5),
    shrivelled_broken_percent: String(initialQuality.shrivelled_broken_percent ?? 2.0),
    other_grains_percent: String(initialQuality.other_grains_percent ?? 0.5),
    weevilled_grains_percent: String(initialQuality.weevilled_grains_percent ?? 0.2),
    grade: initialQuality.grade || 'FAQ Grade A',
  });

  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectReasonInput, setRejectReasonInput] = useState('');
  const [successToast, setSuccessToast] = useState('');

  if (!token) {
    return (
      <div className="quality-container">
        <div className="quality-error-card">
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

  // Parse numeric values
  const numericValues = {
    moisture_percent: parseFloat(formState.moisture_percent) || 0,
    foreign_matter_percent: parseFloat(formState.foreign_matter_percent) || 0,
    damaged_grains_percent: parseFloat(formState.damaged_grains_percent) || 0,
    slightly_damaged_percent: parseFloat(formState.slightly_damaged_percent) || 0,
    shrivelled_broken_percent: parseFloat(formState.shrivelled_broken_percent) || 0,
    other_grains_percent: parseFloat(formState.other_grains_percent) || 0,
    weevilled_grains_percent: parseFloat(formState.weevilled_grains_percent) || 0,
    crop: token.crop,
  };

  // Live Rule Engine Evaluation
  const evalResult = evaluateQualityRules(numericValues);

  const handleChange = (e) => {
    const { name, value } = e.target;
    const cleaned = name === 'grade' ? value : value === '' ? '' : value.replace(/^0+(?=\d)/, '');
    setFormState((prev) => ({
      ...prev,
      [name]: cleaned,
    }));
  };

  const handleDecision = (resultType, customReason = '') => {
    const payload = {
      moisture_percent: numericValues.moisture_percent,
      foreign_matter_percent: numericValues.foreign_matter_percent,
      damaged_grains_percent: numericValues.damaged_grains_percent,
      slightly_damaged_percent: numericValues.slightly_damaged_percent,
      shrivelled_broken_percent: numericValues.shrivelled_broken_percent,
      other_grains_percent: numericValues.other_grains_percent,
      weevilled_grains_percent: numericValues.weevilled_grains_percent,
      grade: formState.grade,
      result: resultType,
      rejection_reason: customReason || (resultType === 'REJECTED' ? evalResult.reason : null),
      suggested_deduction_rs: evalResult.suggestedDeductionRs || 0,
    };

    updateQualityCheck(token.token_number, payload);
    setSuccessToast(`Quality report recorded as [${resultType}]. Redirecting...`);

    setTimeout(() => {
      if (resultType === 'REJECTED') {
        navigate('/queue');
      } else {
        navigate(`/tokens/${token.token_number}/payment`);
      }
    }, 1200);
  };

  return (
    <div className="quality-container">
      {/* Navigation Header */}
      <motion.div 
        initial={{ opacity: 0, y: -10 }} 
        animate={{ opacity: 1, y: 0 }}
        className="quality-nav-bar"
      >
        <Link to="/queue" className="back-link">
          <ArrowLeft size={16} />
          <span>Back to Live Queue</span>
        </Link>
        <div className="lab-badge">
          <FlaskConical size={16} />
          <span>Lab Inspection Station #1</span>
        </div>
      </motion.div>

      {/* Main Banner Header */}
      <motion.div 
        initial={{ opacity: 0, y: 10 }} 
        animate={{ opacity: 1, y: 0 }}
        className="quality-header-card"
      >
        <div className="quality-header-left">
          <div className="token-pill font-mono">Token #{token.token_number}</div>
          <div>
            <h1 className="farmer-name">{token.farmer_name}</h1>
            <p className="farmer-meta-text">
              Crop: <strong>{token.crop} ({token.variety})</strong> • Net Weighed:{' '}
              <strong className="font-mono">{token.weight_details?.net_weight_kg || 2500} kg</strong>
            </p>
          </div>
        </div>
        <div className="msp-standard-badge">
          <ShieldCheck size={18} />
          <span>Government MSP FAQ Rules Active</span>
        </div>
      </motion.div>

      {/* Quality Grid Layout */}
      <div className="quality-grid">
        {/* Left Column: 7 Parameters Lab Form */}
        <motion.div 
          initial={{ opacity: 0, x: -15 }} 
          animate={{ opacity: 1, x: 0 }}
          className="quality-form-card"
        >
          <div className="card-heading-row">
            <div>
              <h2 className="form-card-title">Grain Quality Lab Measurements</h2>
              <p className="form-card-subtitle">Enter physical moisture content & foreign impurity percentages</p>
            </div>
            <div className="grade-selector-group">
              <label htmlFor="grade">Grain Grade Classification</label>
              <select id="grade" name="grade" value={formState.grade} onChange={handleChange}>
                <option value="FAQ Grade A">FAQ Grade A (Premium)</option>
                <option value="FAQ Grade B">FAQ Grade B (Standard)</option>
                <option value="Non-Standard">Under-spec (Deduction)</option>
              </select>
            </div>
          </div>

          <div className="params-inputs-grid">
            <div className="param-field-box">
              <div className="param-label-row">
                <label htmlFor="moisture_percent">Moisture Content (%)</label>
                <span className={`limit-tag ${numericValues.moisture_percent > 12 ? 'over' : 'ok'}`}>
                  Limit ≤ 12%
                </span>
              </div>
              <input
                id="moisture_percent"
                type="number"
                step="0.1"
                name="moisture_percent"
                value={formState.moisture_percent}
                onChange={handleChange}
                required
              />
            </div>

            <div className="param-field-box">
              <div className="param-label-row">
                <label htmlFor="foreign_matter_percent">Foreign Matter (%)</label>
                <span className={`limit-tag ${numericValues.foreign_matter_percent > 1 ? 'over' : 'ok'}`}>
                  Limit ≤ 1.0%
                </span>
              </div>
              <input
                id="foreign_matter_percent"
                type="number"
                step="0.1"
                name="foreign_matter_percent"
                value={formState.foreign_matter_percent}
                onChange={handleChange}
                required
              />
            </div>

            <div className="param-field-box">
              <div className="param-label-row">
                <label htmlFor="damaged_grains_percent">Damaged Grains (%)</label>
                <span className={`limit-tag ${numericValues.damaged_grains_percent > 2 ? 'over' : 'ok'}`}>
                  Limit ≤ 2.0%
                </span>
              </div>
              <input
                id="damaged_grains_percent"
                type="number"
                step="0.1"
                name="damaged_grains_percent"
                value={formState.damaged_grains_percent}
                onChange={handleChange}
                required
              />
            </div>

            <div className="param-field-box">
              <div className="param-label-row">
                <label htmlFor="slightly_damaged_percent">Slightly Damaged (%)</label>
                <span className={`limit-tag ${numericValues.slightly_damaged_percent > 4 ? 'over' : 'ok'}`}>
                  Limit ≤ 4.0%
                </span>
              </div>
              <input
                id="slightly_damaged_percent"
                type="number"
                step="0.1"
                name="slightly_damaged_percent"
                value={formState.slightly_damaged_percent}
                onChange={handleChange}
                required
              />
            </div>

            <div className="param-field-box">
              <div className="param-label-row">
                <label htmlFor="shrivelled_broken_percent">Shrivelled / Broken (%)</label>
                <span className={`limit-tag ${numericValues.shrivelled_broken_percent > 6 ? 'over' : 'ok'}`}>
                  Limit ≤ 6.0%
                </span>
              </div>
              <input
                id="shrivelled_broken_percent"
                type="number"
                step="0.1"
                name="shrivelled_broken_percent"
                value={formState.shrivelled_broken_percent}
                onChange={handleChange}
                required
              />
            </div>

            <div className="param-field-box">
              <div className="param-label-row">
                <label htmlFor="other_grains_percent">Other Food Grains (%)</label>
                <span className={`limit-tag ${numericValues.other_grains_percent > 2 ? 'over' : 'ok'}`}>
                  Limit ≤ 2.0%
                </span>
              </div>
              <input
                id="other_grains_percent"
                type="number"
                step="0.1"
                name="other_grains_percent"
                value={formState.other_grains_percent}
                onChange={handleChange}
                required
              />
            </div>

            <div className="param-field-box full-width">
              <div className="param-label-row">
                <label htmlFor="weevilled_grains_percent">Weevilled Grains (%)</label>
                <span className={`limit-tag ${numericValues.weevilled_grains_percent > 1 ? 'over' : 'ok'}`}>
                  Limit ≤ 1.0%
                </span>
              </div>
              <input
                id="weevilled_grains_percent"
                type="number"
                step="0.1"
                name="weevilled_grains_percent"
                value={formState.weevilled_grains_percent}
                onChange={handleChange}
                required
              />
            </div>
          </div>
        </motion.div>

        {/* Right Column: Rule Engine Recommendation & Staff Actions */}
        <motion.div 
          initial={{ opacity: 0, x: 15 }} 
          animate={{ opacity: 1, x: 0 }}
          className="quality-preview-card"
        >
          <div className="recommendation-hero-box">
            <div className="rec-header font-mono">
              <Sparkles size={16} />
              <span>Automated Rule Engine Result</span>
            </div>

            {evalResult.result === 'FAQ_ACCEPTED' && (
              <div className="res-badge res-green font-mono">
                <CheckCircle2 size={24} />
                <div>
                  <div className="res-title">🟢 FAQ ACCEPTED (Full MSP)</div>
                  <p className="res-sub">Grain meets standard government MSP specifications.</p>
                </div>
              </div>
            )}

            {evalResult.result === 'DEDUCTION_APPLIED' && (
              <div className="res-badge res-yellow font-mono">
                <AlertTriangle size={24} />
                <div>
                  <div className="res-title">🟡 DEDUCTION APPLIED</div>
                  <p className="res-sub">Moisture exceeds 12%. Suggested deduction: ₹{evalResult.suggestedDeductionRs} / quintal.</p>
                </div>
              </div>
            )}

            {evalResult.result === 'REJECTED' && (
              <div className="res-badge res-red font-mono">
                <XCircle size={24} />
                <div>
                  <div className="res-title">🔴 REJECTED</div>
                  <p className="res-sub">Reason: "{evalResult.reason}"</p>
                </div>
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="decision-actions-card">
            <h4 className="actions-title">Confirm Staff Decision</h4>

            <button
              className="btn-decision btn-accept"
              onClick={() => handleDecision('FAQ_ACCEPTED')}
            >
              <CheckCircle2 size={18} />
              <span>Accept (Full MSP Payout)</span>
              <ArrowRight size={16} />
            </button>

            {evalResult.result === 'DEDUCTION_APPLIED' && (
              <button
                className="btn-decision btn-deduct"
                onClick={() => handleDecision('DEDUCTION_APPLIED')}
              >
                <AlertTriangle size={18} />
                <span>Accept with Quality Deduction</span>
                <ArrowRight size={16} />
              </button>
            )}

            <button
              className="btn-decision btn-reject"
              onClick={() => setShowRejectModal(true)}
            >
              <XCircle size={18} />
              <span>Reject Procurement Batch</span>
            </button>
          </div>

          {successToast && (
            <motion.div initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} className="success-toast">
              <CheckCircle2 size={18} />
              <span>{successToast}</span>
            </motion.div>
          )}
        </motion.div>
      </div>

      {/* Reject Modal */}
      {showRejectModal && (
        <div className="modal-backdrop">
          <div className="modal-card">
            <h3>🔴 Reject Procurement Batch</h3>
            <p>Please enter the specific lab reason for rejecting Token #{token.token_number}:</p>
            <textarea
              rows="3"
              placeholder="e.g. Moisture level 16.5% exceeds maximum allowed tolerance of 14%."
              value={rejectReasonInput}
              onChange={(e) => setRejectReasonInput(e.target.value)}
            />
            <div className="modal-actions">
              <button className="btn-cancel" onClick={() => setShowRejectModal(false)}>
                Cancel
              </button>
              <button
                className="btn-confirm-reject"
                onClick={() => handleDecision('REJECTED', rejectReasonInput || evalResult.reason)}
              >
                Confirm Rejection
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
