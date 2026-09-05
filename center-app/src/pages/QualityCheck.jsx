import React, { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useQueue } from '../context/QueueContext';
import { evaluateCropQuality, CROP_QUALITY_RULES } from '../config/cropRules';
import './QualityCheck.css';

/*
  LAB EQUIPMENT INTEGRATION NOTE:
  Quality meters are not hardware-integrated in this prototype.
  Staff measure grain sample quality and log parameter values manually.
  The automated rules engine evaluates limits and suggests a decision, but staff MUST explicitly confirm.
*/

export default function QualityCheck() {
  const { tokenNumber } = useParams();
  const navigate = useNavigate();
  const { tokens, updateTokenQuality } = useQueue();

  const token = tokens.find((t) => String(t.token_number) === String(tokenNumber));

  if (!token) {
    return (
      <div className="quality-container">
        <div className="quality-error-card">
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

  const cropKey = String(token.crop || 'wheat').toLowerCase();
  const ruleConfig = CROP_QUALITY_RULES[cropKey] || CROP_QUALITY_RULES.wheat;

  // Form State for 7 Quality Parameters initialized from token or baseline defaults
  const [paramsData, setParamsData] = useState({
    moisture_percent: token.quality?.moisture_percent !== undefined ? String(token.quality.moisture_percent) : '12.0',
    foreign_matter_percent: token.quality?.foreign_matter_percent !== undefined ? String(token.quality.foreign_matter_percent) : '1.0',
    damaged_grains_percent: token.quality?.damaged_grains_percent !== undefined ? String(token.quality.damaged_grains_percent) : '1.0',
    slightly_damaged_percent: token.quality?.slightly_damaged_percent !== undefined ? String(token.quality.slightly_damaged_percent) : '2.0',
    shrivelled_broken_percent: token.quality?.shrivelled_broken_percent !== undefined ? String(token.quality.shrivelled_broken_percent) : '3.0',
    other_grains_percent: token.quality?.other_grains_percent !== undefined ? String(token.quality.other_grains_percent) : '1.0',
    weevilled_grains_percent: token.quality?.weevilled_grains_percent !== undefined ? String(token.quality.weevilled_grains_percent) : '0.0',
  });

  const [grade, setGrade] = useState(
    token.quality?.grade ? token.quality.grade : (ruleConfig.grades ? ruleConfig.grades[0] : 'FAQ Accepted')
  );

  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectionReason, setRejectionReason] = useState(
    token.quality?.rejection_reason || ''
  );
  const [errorMsg, setErrorMsg] = useState('');
  const [savedResult, setSavedResult] = useState(token.quality?.result || null);

  // Live Automatic Rule Evaluation
  const evalResult = evaluateCropQuality(cropKey, paramsData);

  const handleParamChange = (key, val) => {
    const cleaned = val === '' ? '' : val.replace(/^0+(?=\d)/, '');
    setParamsData((prev) => ({
      ...prev,
      [key]: cleaned,
    }));
  };

  const validateAllInputs = () => {
    for (const key of Object.keys(ruleConfig.parameters)) {
      const val = parseFloat(paramsData[key]);
      if (isNaN(val) || val < 0 || val > 100) {
        setErrorMsg(`Please enter a valid percentage (0 - 100%) for ${ruleConfig.parameters[key].label}.`);
        return false;
      }
    }
    return true;
  };

  // Staff Explicit Action: ACCEPT GRAIN
  const handleAccept = (e) => {
    e.preventDefault();
    setErrorMsg('');
    if (!validateAllInputs()) return;

    const qualityPayload = {
      ...paramsData,
      grade,
      result: 'ACCEPTED',
      rejection_reason: null,
      recommendation: evalResult.recommendation,
    };

    updateTokenQuality(token.token_number, qualityPayload);
    setSavedResult('ACCEPTED');
  };

  // Staff Explicit Action: REJECT GRAIN
  const handleRejectClick = (e) => {
    e.preventDefault();
    setErrorMsg('');
    if (!validateAllInputs()) return;
    setShowRejectModal(true);
  };

  const handleConfirmReject = (e) => {
    e.preventDefault();
    if (!rejectionReason.trim()) {
      setErrorMsg('A specific rejection reason is required for procurement audit compliance.');
      return;
    }

    const qualityPayload = {
      ...paramsData,
      grade: 'Rejected',
      result: 'REJECTED',
      rejection_reason: rejectionReason.trim(),
      recommendation: evalResult.recommendation,
    };

    updateTokenQuality(token.token_number, qualityPayload);
    setSavedResult('REJECTED');
    setShowRejectModal(false);
  };

  const measuredWeightKg = token.weight_details?.net_weight_kg || token.weight_details?.declared_weight_kg || 0;
  const measuredQuintals = token.weight_details?.accepted_quintals || (measuredWeightKg / 100);

  return (
    <div className="quality-container">
      <div className="quality-nav-bar">
        <Link to={`/tokens/${token.token_number}`} className="back-link">
          ← Back to Token #{token.token_number} Hub
        </Link>
        <span className="station-badge-quality">🔬 Quality Inspection Lab</span>
      </div>

      <div className="quality-card">
        {/* Token & Farmer Summary Header */}
        <div className="quality-card-header">
          <div>
            <span className="token-label">Token #{token.token_number} • {token.farmer_id}</span>
            <h1 className="farmer-name-title">{token.farmer_name}</h1>
          </div>
          <div className="crop-weight-summary">
            <span>Crop: <strong>{token.crop} ({token.variety || 'Standard'})</strong></span>
            <span className="weight-divider">•</span>
            <span>Measured: <strong>{measuredWeightKg.toLocaleString()} kg ({measuredQuintals} quintals)</strong></span>
          </div>
        </div>

        {/* Quality Standard Reference Note */}
        <div className="ref-info-bar">
          <span>📋 Standard Ruleset: <strong>{ruleConfig.standardName}</strong> (Configurable Baseline)</span>
        </div>

        {/* 7 Quality Parameters Form */}
        <form className="quality-form">
          <h2 className="section-subtitle">Sample Lab Analysis Parameters</h2>
          <div className="params-inputs-grid">
            {Object.keys(ruleConfig.parameters).map((paramKey) => {
              const config = ruleConfig.parameters[paramKey];
              return (
                <div className="form-group" key={paramKey}>
                  <label htmlFor={paramKey}>{config.label} <span className="req">*</span></label>
                  <div className="input-with-unit-sm">
                    <input
                      id={paramKey}
                      type="number"
                      step="0.1"
                      min="0"
                      max="100"
                      placeholder="e.g. 1.0"
                      value={paramsData[paramKey]}
                      onChange={(e) => handleParamChange(paramKey, e.target.value)}
                      disabled={Boolean(savedResult)}
                      required
                    />
                    <span className="unit-sm">%</span>
                  </div>
                  <span className="limit-hint">Limit: ≤ {config.limit}%</span>
                </div>
              );
            })}
          </div>

          {/* Grain Grade Classification Dropdown */}
          <div className="form-group grade-select-group">
            <label htmlFor="grade">Grain Classification / Variety Grade</label>
            <select
              id="grade"
              value={grade}
              onChange={(e) => setGrade(e.target.value)}
              disabled={Boolean(savedResult)}
              className="select-input"
            >
              {(ruleConfig.grades || ruleConfig.varieties || ['FAQ Accepted', 'Grade A', 'Grade B']).map((g) => (
                <option key={g} value={g}>{g}</option>
              ))}
            </select>
          </div>

          {/* Live Quality Rule Evaluation Engine Banner */}
          <div className="rule-engine-banner">
            <div className="engine-header">
              <span className="engine-title">🤖 Automated Quality Rule Recommendation</span>
              <span className={`rec-pill rec-${evalResult.recommendation.toLowerCase()}`}>
                {evalResult.recommendation === 'FAQ_ACCEPTED' && '🟢 FAQ ACCEPTED'}
                {evalResult.recommendation === 'ACCEPTED_WITH_DEDUCTION' && '🟡 ACCEPTED WITH DEDUCTION'}
                {evalResult.recommendation === 'REJECTED' && '🔴 REJECTED'}
              </span>
            </div>

            <p className="engine-reason">{evalResult.summaryReason}</p>

            {/* Parameter PASS/FAIL Breakdown */}
            <div className="eval-table">
              <div className="eval-table-header">
                <span>Parameter</span>
                <span>Measured Value</span>
                <span>Allowed Limit</span>
                <span>Rule Status</span>
              </div>
              {evalResult.parameterResults.map((item) => (
                <div key={item.key} className={`eval-row ${item.status === 'PASS' ? 'eval-pass' : 'eval-fail'}`}>
                  <span className="eval-param-label">{item.label}</span>
                  <span className="eval-val">{item.value}%</span>
                  <span className="eval-limit">≤ {item.limit}%</span>
                  <span className="eval-status-badge">
                    {item.status === 'PASS' ? '✓ PASS' : '❌ EXCEEDED'}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {errorMsg && <div className="error-banner">⚠️ {errorMsg}</div>}

          {/* Saved Result Confirmation View */}
          {savedResult === 'ACCEPTED' ? (
            <div className="result-banner accepted-banner">
              <div className="banner-left">
                <span className="banner-icon">🟢</span>
                <div>
                  <h3>Quality Inspection ACCEPTED ({grade})!</h3>
                  <p>Accepted Quantity: <strong>{measuredQuintals} quintals ({measuredWeightKg} kg)</strong></p>
                </div>
              </div>
              <button
                type="button"
                className="btn-proceed-payment"
                onClick={() => navigate(`/tokens/${token.token_number}/payment`)}
              >
                Proceed to Payment →
              </button>
            </div>
          ) : savedResult === 'REJECTED' ? (
            <div className="result-banner rejected-banner">
              <div className="banner-left">
                <span className="banner-icon">🔴</span>
                <div>
                  <h3>Quality Inspection REJECTED</h3>
                  <p>Reason: "{rejectionReason || token.quality?.rejection_reason}"</p>
                </div>
              </div>
              <Link to="/queue" className="btn-back-queue">
                ← Back to Live Queue
              </Link>
            </div>
          ) : showRejectModal ? (
            <div className="reject-reason-card">
              <label htmlFor="rejection_reason">Specify Rejection Reason <span className="req">*</span></label>
              <input
                id="rejection_reason"
                type="text"
                placeholder="e.g. Moisture content (15.5%) exceeds maximum 12.0% procurement limit."
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                required
                autoFocus
              />
              <div className="reject-actions">
                <button type="button" className="btn-confirm-reject" onClick={handleConfirmReject}>
                  Confirm & Record Rejection
                </button>
                <button type="button" className="btn-cancel-reject" onClick={() => setShowRejectModal(false)}>
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <div className="decision-actions">
              <button type="button" className="btn-decision btn-accept" onClick={handleAccept}>
                🟢 ACCEPT GRAIN (Staff Decision)
              </button>
              <button type="button" className="btn-decision btn-reject" onClick={handleRejectClick}>
                🔴 REJECT GRAIN (Staff Decision)
              </button>
            </div>
          )}
        </form>
      </div>

      <div className="lab-notice">
        <span className="notice-icon">🧪</span>
        <p>
          <strong>Decision Support Note:</strong> The automated rule engine provides an advisory recommendation based on configurable limits.
          Staff must explicitly click Accept or Reject to record the official procurement result.
        </p>
      </div>
    </div>
  );
}
