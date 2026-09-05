import React, { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useQueue } from '../context/QueueContext';
import { calculateMspPayout } from '../services/procurementService';
import './Payment.css';

/*
  PAYMENT GATEWAY INTEGRATION NOTE:
  No live Banking API / Public Financial Management System (PFMS) connected in prototype.
  Staff enter the bank reference UTR number manually upon transaction authorization.
*/

export default function Payment() {
  const { tokenNumber } = useParams();
  const navigate = useNavigate();
  const { tokens, updateTokenPayment } = useQueue();

  const token = tokens.find((t) => String(t.token_number) === String(tokenNumber));

  if (!token) {
    return (
      <div className="payment-container">
        <div className="payment-error-card">
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

  // Stage Guard: Payment requires ACCEPTED stage
  const isAcceptedStage =
    token.stage === 'ACCEPTED' || token.stage === 'PAYMENT_PROCESSING' || token.stage === 'PAYMENT_COMPLETED';

  if (!isAcceptedStage) {
    return (
      <div className="payment-container">
        <div className="payment-nav-bar">
          <Link to={`/tokens/${token.token_number}`} className="back-link">
            ← Back to Token #{token.token_number} Hub
          </Link>
        </div>
        <div className="guard-card">
          <div className="guard-icon">⏳</div>
          <h2>Payment Not Available</h2>
          <p>
            Token <strong>#{token.token_number}</strong> is currently at stage{' '}
            <span className="stage-guard-badge">{token.stage}</span>.
          </p>
          <p className="guard-subtext">
            Payment disbursement is only accessible after grain has passed quality inspection and has been explicitly{' '}
            <strong>ACCEPTED</strong> by procurement staff.
          </p>
          <div className="guard-actions">
            <Link to={`/tokens/${token.token_number}/quality`} className="btn-guard-primary">
              Go to Quality Check →
            </Link>
            <Link to="/queue" className="btn-guard-secondary">
              Back to Live Queue
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // Calculation parameters
  const acceptedKg = token.weight_details?.accepted_weight_kg || token.weight_details?.net_weight_kg || 0;
  const grade = token.quality?.grade || 'FAQ Accepted';
  const mspCalc = calculateMspPayout(acceptedKg, token.crop, grade, token.payment?.quality_deduction || 0);

  // Local Form State
  const [deductionInput, setDeductionInput] = useState(
    token.payment?.quality_deduction ? String(token.payment.quality_deduction) : '0'
  );

  const [paymentStatus, setPaymentStatus] = useState(
    token.payment?.status === 'NOT_STARTED' ? 'COMPLETED' : (token.payment?.status || 'COMPLETED')
  );

  const [utrNumber, setUtrNumber] = useState(
    token.payment?.transaction_id || `TXN-${Math.floor(100000 + Math.random() * 900000)}`
  );

  const [errorMsg, setErrorMsg] = useState('');
  const [isSaved, setIsSaved] = useState(token.stage === 'PAYMENT_COMPLETED');

  // Compute final amount considering any dynamic deduction typed by staff
  const currentDeduction = parseFloat(deductionInput) || 0;
  const finalPayableAmount = Math.max(0, mspCalc.baseMspAmount - currentDeduction);

  const handleDeductionChange = (e) => {
    const val = e.target.value;
    setDeductionInput(val === '' ? '' : val.replace(/^0+(?=\d)/, ''));
  };

  const handleUtrChange = (e) => {
    setUtrNumber(e.target.value);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setErrorMsg('');

    if (paymentStatus === 'COMPLETED' && !utrNumber.trim()) {
      setErrorMsg('A valid Bank Transaction ID / UTR Number is required to complete payment.');
      return;
    }

    updateTokenPayment(token.token_number, {
      amount: finalPayableAmount,
      status: paymentStatus,
      transaction_id: utrNumber.trim(),
    });

    setIsSaved(true);

    setTimeout(() => {
      navigate(`/tokens/${token.token_number}`);
    }, 1500);
  };

  return (
    <div className="payment-container">
      <div className="payment-nav-bar">
        <Link to={`/tokens/${token.token_number}`} className="back-link">
          ← Back to Token #{token.token_number} Hub
        </Link>
        <span className="station-badge-payment">💳 Payment & Disbursement</span>
      </div>

      <div className="payment-card">
        {/* Header Summary */}
        <div className="payment-card-header">
          <div>
            <span className="token-label">Token #{token.token_number} • {token.farmer_id}</span>
            <h1 className="farmer-name-title">{token.farmer_name}</h1>
            <span className="bank-account-sub">Bank Account: <strong>{token.bank_account_masked || 'XXXX XXXX 4521'}</strong></span>
          </div>
          <div className="payment-crop-tag">
            <span>{token.crop} ({grade})</span>
          </div>
        </div>

        {/* Transparent MSP Payout Calculation Card */}
        <div className="msp-calc-card">
          <h2 className="calc-title">MSP Payable Calculation (Standard Quintals Model)</h2>

          <div className="calc-grid">
            <div className="calc-row">
              <span className="calc-label">Net Accepted Weight</span>
              <span className="calc-val">{acceptedKg.toLocaleString()} kg</span>
            </div>

            <div className="calc-row">
              <span className="calc-label">Accepted Quintals (1 Quintal = 100 kg)</span>
              <span className="calc-val-highlight">{mspCalc.acceptedQuintals} quintals</span>
            </div>

            <div className="calc-row">
              <span className="calc-label">Applicable MSP Rate ({mspCalc.season})</span>
              <span className="calc-val">₹{mspCalc.mspRatePerQuintal.toLocaleString()} / quintal</span>
            </div>

            <div className="calc-row row-base">
              <span className="calc-label">Base MSP Amount</span>
              <span className="calc-val-bold">₹{mspCalc.baseMspAmount.toLocaleString()}</span>
            </div>

            <div className="calc-row">
              <span className="calc-label">Quality / Permitted Deductions (₹)</span>
              <div className="input-deduction-wrapper">
                <input
                  type="number"
                  min="0"
                  placeholder="0"
                  value={deductionInput}
                  onChange={handleDeductionChange}
                  disabled={isSaved}
                  className="input-deduction"
                />
              </div>
            </div>

            <div className="calc-row row-final">
              <span className="calc-label-final">Final Payable Amount</span>
              <span className="calc-val-final">₹{finalPayableAmount.toLocaleString()}</span>
            </div>
          </div>
        </div>

        {/* Payment Execution Form */}
        <form onSubmit={handleSubmit} className="payment-form">
          <div className="form-row-2">
            <div className="form-group">
              <label htmlFor="payment_status">Disbursement Status <span className="req">*</span></label>
              <select
                id="payment_status"
                value={paymentStatus}
                onChange={(e) => setPaymentStatus(e.target.value)}
                disabled={isSaved}
                className="select-input"
              >
                <option value="PROCESSING">Processing (Bank Transfer Initiated)</option>
                <option value="COMPLETED">Completed (Paid Out via UTR)</option>
              </select>
            </div>

            <div className="form-group">
              <label htmlFor="utr_number">Bank Transaction ID / UTR Ref <span className="req">*</span></label>
              <input
                id="utr_number"
                type="text"
                placeholder="e.g. TXN-564764"
                value={utrNumber}
                onChange={handleUtrChange}
                disabled={isSaved}
                required
              />
              <span className="field-hint">Bank payment reference number</span>
            </div>
          </div>

          {errorMsg && <div className="error-banner">⚠️ {errorMsg}</div>}

          {isSaved ? (
            <div className="result-payment-banner banner-completed">
              <div className="banner-content">
                <span className="banner-icon">✅</span>
                <div>
                  <h3>Payment Disbursement Completed!</h3>
                  <p>Paid Out: <strong>₹{finalPayableAmount.toLocaleString()}</strong> • UTR Ref: <strong>{utrNumber}</strong></p>
                  <p className="subtext">Token stage updated to <strong>PAYMENT_COMPLETED</strong>.</p>
                </div>
              </div>
              <button
                type="button"
                className="btn-back-queue-green"
                onClick={() => navigate(`/tokens/${token.token_number}`)}
              >
                View Token Hub →
              </button>
            </div>
          ) : (
            <button type="submit" className="btn-save-payment">
              Disburse Payment & Record UTR →
            </button>
          )}
        </form>
      </div>

      <div className="gateway-notice">
        <span className="notice-icon">🏦</span>
        <p>
          <strong>Bank / Payment Gateway Disclaimer:</strong> Bank payment gateway integration (e.g. PFMS/DBT Direct Transfer)
          is pending backend integration. Transaction reference numbers are recorded manually for prototype audit tracking.
        </p>
      </div>
    </div>
  );
}
