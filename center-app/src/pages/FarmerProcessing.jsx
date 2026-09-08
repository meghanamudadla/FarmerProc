import React from 'react';
import { useParams, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useQueue } from '../context/QueueContext';
import StatusBadge from '../components/StatusBadge';
import { convertKgToQuintals, calculateMspPayout } from '../services/procurementService';
import { ArrowLeft, Scale, FlaskConical, CreditCard, Clock, CheckCircle2, XCircle, Building, User, MapPin, Phone, History, Sparkles, ArrowRight } from 'lucide-react';
import './FarmerProcessing.css';

export default function FarmerProcessing() {
  const { tokenNumber } = useParams();
  const { tokens } = useQueue();

  const token = tokens.find((t) => String(t.token_number) === String(tokenNumber));

  if (!token) {
    return (
      <div className="processing-container">
        <div className="processing-error-card">
          <XCircle size={32} className="text-red-500" />
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

  const { weight_details, quality, payment, audit_trail } = token;

  // Weight derivations
  const declaredBags = weight_details?.declared_bags || 50;
  const bagWeightKg = weight_details?.bag_weight_kg || 50;
  const declaredKg = weight_details?.declared_weight_kg || declaredBags * bagWeightKg;
  const declaredQuintals = convertKgToQuintals(declaredKg);

  const grossKg = weight_details?.gross_weight_kg || 0;
  const tareKg = weight_details?.tare_weight_kg || 0;
  const netKg = weight_details?.net_weight_kg || 0;
  const netQuintals = convertKgToQuintals(netKg);
  const acceptedKg = weight_details?.accepted_weight_kg || 0;
  const acceptedQuintals = weight_details?.accepted_quintals || convertKgToQuintals(acceptedKg);

  // MSP Payout derivations
  const mspCalc = calculateMspPayout(acceptedKg, token.crop, quality?.grade || 'FAQ Accepted', payment?.quality_deduction || 0);

  // Define Stage Timeline Steps
  const STAGE_ORDER = [
    { key: 'WAITING', label: 'Token Issued' },
    { key: 'WEIGHING', label: 'Weighbridge' },
    { key: 'QUALITY_CHECK', label: 'Lab Quality' },
    { key: 'ACCEPTED', label: 'Quality Accepted' },
    { key: 'PAYMENT_PROCESSING', label: 'Payment Processing' },
    { key: 'PAYMENT_COMPLETED', label: 'Payment Completed' },
  ];

  const getStageIndex = (stageKey) => {
    if (stageKey === 'REJECTED') return -1;
    const idx = STAGE_ORDER.findIndex((s) => s.key === stageKey);
    return idx === -1 ? 0 : idx;
  };

  const currentStageIndex = getStageIndex(token.stage);

  return (
    <div className="processing-container">
      {/* Top Header Navigation */}
      <motion.div 
        initial={{ opacity: 0, y: -10 }} 
        animate={{ opacity: 1, y: 0 }}
        className="processing-nav-bar"
      >
        <Link to="/queue" className="back-link">
          <ArrowLeft size={16} />
          <span>Back to Live Queue</span>
        </Link>
        <div className="nav-actions">
          <StatusBadge status={token.stage} />
        </div>
      </motion.div>

      {/* Main Token Hub Banner Card */}
      <motion.div 
        initial={{ opacity: 0, y: 10 }} 
        animate={{ opacity: 1, y: 0 }}
        className="hub-header-card"
      >
        <div className="hub-header-left">
          <div className="token-badge-large font-mono">Token #{token.token_number}</div>
          <div>
            <h1 className="farmer-name-large">{token.farmer_name}</h1>
            <p className="farmer-meta-sub">
              ID: <strong className="font-mono">{token.farmer_id}</strong> • Crop: <strong>{token.crop} ({token.variety})</strong> • Mobile: <strong>{token.mobile || 'N/A'}</strong> • {token.village}, {token.district}
            </p>
          </div>
        </div>
        <div className="bank-account-pill font-mono">
          <Building size={16} />
          <span>Bank Account: <strong>{token.bank_account_masked || 'XXXX XXXX 4521'}</strong></span>
        </div>
      </motion.div>

      {/* Stage Progression Timeline Bar */}
      <motion.div 
        initial={{ opacity: 0, y: 15 }} 
        animate={{ opacity: 1, y: 0 }}
        className="timeline-card"
      >
        <div className="timeline-title-row">
          <Sparkles size={16} className="text-emerald-600" />
          <h3 className="timeline-title">Procurement Stage Progression</h3>
        </div>

        {token.stage === 'REJECTED' ? (
          <div className="rejected-stage-banner font-mono">
            <XCircle size={20} />
            <div>
              <strong>PROCUREMENT REJECTED AT QUALITY INSPECTION</strong>
              <p>Reason: "{quality?.rejection_reason || 'Failed quality limits'}"</p>
            </div>
          </div>
        ) : (
          <div className="timeline-stepper">
            {STAGE_ORDER.map((step, idx) => {
              const isDone = idx <= currentStageIndex;
              const isCurrent = idx === currentStageIndex;
              return (
                <div
                  key={step.key}
                  className={`step-item ${isDone ? 'step-done' : ''} ${isCurrent ? 'step-current' : ''}`}
                >
                  <div className="step-circle font-mono">{isDone ? '✓' : idx + 1}</div>
                  <span className="step-label">{step.label}</span>
                </div>
              );
            })}
          </div>
        )}
      </motion.div>

      {/* Detailed Grid Layout */}
      <div className="hub-grid-layout">
        {/* Left Column: Weight & Quality */}
        <div className="hub-col">
          {/* Quantity & Weight Model Breakdown */}
          <motion.div initial={{ opacity: 0, x: -15 }} animate={{ opacity: 1, x: 0 }} className="hub-card">
            <div className="hub-card-header">
              <h2><Scale size={18} /> Quantity & Weight Model</h2>
              <Link to={`/tokens/${token.token_number}/weighing`} className="btn-card-action">
                <span>{netKg > 0 ? 'Edit Weight' : 'Start Weighing'}</span>
                <ArrowRight size={14} />
              </Link>
            </div>

            <div className="weight-grid-2x2">
              <div className="w-box">
                <span className="w-label">Declared Bag Count</span>
                <span className="w-val font-mono">{declaredBags} bags ({bagWeightKg} kg/bag)</span>
              </div>
              <div className="w-box">
                <span className="w-label">Declared Total Weight</span>
                <span className="w-val font-mono">{declaredKg.toLocaleString()} kg ({declaredQuintals} qtl)</span>
              </div>
              <div className="w-box">
                <span className="w-label">Weighbridge (Gross / Tare)</span>
                <span className="w-val font-mono">Gross: {grossKg} kg | Tare: {tareKg} kg</span>
              </div>
              <div className="w-box w-box-highlight">
                <span className="w-label">Net Measured Weight</span>
                <span className="w-val-big font-mono">{netKg.toLocaleString()} kg ({netQuintals} qtl)</span>
              </div>
            </div>

            <div className="accepted-weight-bar font-mono">
              <span>Accepted Procurement Weight:</span>
              <strong>{acceptedKg.toLocaleString()} kg ({acceptedQuintals} quintals)</strong>
            </div>
          </motion.div>

          {/* Quality Inspection Summary */}
          <motion.div initial={{ opacity: 0, x: -15 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.1 }} className="hub-card">
            <div className="hub-card-header">
              <h2><FlaskConical size={18} /> Quality Inspection Parameters</h2>
              <Link to={`/tokens/${token.token_number}/quality`} className="btn-card-action">
                <span>{quality?.result !== 'NOT_TESTED' ? 'View/Edit Report' : 'Inspect Quality'}</span>
                <ArrowRight size={14} />
              </Link>
            </div>

            <div className="quality-hub-summary">
              <div className="quality-header-row">
                <span className="q-grade">Grade: <strong>{quality?.grade || 'Pending Inspection'}</strong></span>
                <span className={`q-result-badge q-res-${String(quality?.result).toLowerCase()} font-mono`}>
                  Result: {quality?.result || 'NOT_TESTED'}
                </span>
              </div>

              {/* 7 Quality Parameters Summary Table */}
              <div className="q-params-list font-mono">
                <div className="q-param-chip">Moisture: <strong>{quality?.moisture_percent || 0}%</strong></div>
                <div className="q-param-chip">Foreign Matter: <strong>{quality?.foreign_matter_percent || 0}%</strong></div>
                <div className="q-param-chip">Damaged: <strong>{quality?.damaged_grains_percent || 0}%</strong></div>
                <div className="q-param-chip">Slightly Damaged: <strong>{quality?.slightly_damaged_percent || 0}%</strong></div>
                <div className="q-param-chip">Shrivelled/Broken: <strong>{quality?.shrivelled_broken_percent || 0}%</strong></div>
                <div className="q-param-chip">Other Grains: <strong>{quality?.other_grains_percent || 0}%</strong></div>
                <div className="q-param-chip">Weevilled: <strong>{quality?.weevilled_grains_percent || 0}%</strong></div>
              </div>

              {quality?.rejection_reason && (
                <div className="rejection-note-box">
                  <strong>Rejection Rationale:</strong> "{quality.rejection_reason}"
                </div>
              )}
            </div>
          </motion.div>
        </div>

        {/* Right Column: Payout & Audit Trail */}
        <div className="hub-col">
          {/* MSP Payout Card */}
          <motion.div initial={{ opacity: 0, x: 15 }} animate={{ opacity: 1, x: 0 }} className="hub-card">
            <div className="hub-card-header">
              <h2><CreditCard size={18} /> MSP Payout & Disbursement</h2>
              {token.stage === 'ACCEPTED' || token.stage === 'PAYMENT_PROCESSING' || token.stage === 'PAYMENT_COMPLETED' ? (
                <Link to={`/tokens/${token.token_number}/payment`} className="btn-card-action">
                  <span>{payment?.status === 'COMPLETED' ? 'View Receipt' : 'Process Payment'}</span>
                  <ArrowRight size={14} />
                </Link>
              ) : null}
            </div>

            <div className="payment-hub-summary font-mono">
              <div className="p-row">
                <span>Accepted Quantity</span>
                <strong>{acceptedQuintals} qtl ({acceptedKg} kg)</strong>
              </div>
              <div className="p-row">
                <span>MSP Rate</span>
                <strong>₹{mspCalc.mspRatePerQuintal.toLocaleString()} / qtl</strong>
              </div>
              <div className="p-row">
                <span>Base MSP Amount</span>
                <strong>₹{mspCalc.baseMspAmount.toLocaleString()}</strong>
              </div>
              <div className="p-row">
                <span>Quality Deductions</span>
                <strong className="deduction-val">- ₹{(payment?.quality_deduction || 0).toLocaleString()}</strong>
              </div>
              <div className="p-row p-final-row">
                <span>Final Payable Payout</span>
                <strong className="p-final-val">₹{(payment?.final_amount || mspCalc.finalPayableAmount).toLocaleString()}</strong>
              </div>

              <div className="utr-status-box">
                <div>
                  <span className="utr-sub">Payment Status</span>
                  <span className={`p-status-pill status-${String(payment?.status).toLowerCase()}`}>
                    {payment?.status || 'NOT_STARTED'}
                  </span>
                </div>
                <div>
                  <span className="utr-sub">UTR Ref ID</span>
                  <span className="utr-code">{payment?.transaction_id || 'Pending Disbursement'}</span>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Audit Trail Card */}
          <motion.div initial={{ opacity: 0, x: 15 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.1 }} className="hub-card">
            <div className="hub-card-header">
              <h2><History size={18} /> Chronological Audit Log</h2>
              <span className="audit-count font-mono">{(audit_trail || []).length} Entries</span>
            </div>

            <div className="audit-timeline">
              {(audit_trail || []).map((entry) => (
                <div key={entry.id} className="audit-item">
                  <div className="audit-left">
                    <span className="audit-time font-mono">{entry.timestamp}</span>
                    <span className="audit-role">{entry.role}</span>
                  </div>
                  <div className="audit-right">
                    <span className="audit-event-title">{entry.event}</span>
                    <p className="audit-details">{entry.details}</p>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
