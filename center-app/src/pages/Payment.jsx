import React, { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useQueue } from '../context/QueueContext';
import { calculateMspPayout, convertKgToQuintals } from '../services/procurementService';
import { CreditCard, ArrowLeft, CheckCircle2, AlertTriangle, Building, Banknote, ShieldCheck, Printer, ArrowRight } from 'lucide-react';
import './Payment.css';

export default function Payment() {
  const { tokenNumber } = useParams();
  const navigate = useNavigate();
  const { tokens, updatePaymentDetails } = useQueue();

  const token = tokens.find((t) => String(t.token_number) === String(tokenNumber));

  const initialDeduction = token?.payment?.quality_deduction ?? token?.quality?.suggested_deduction_rs ?? 0;
  const initialUtr = token?.payment?.transaction_id || `UTR${Date.now().toString().slice(-8)}`;

  const [qualityDeduction, setQualityDeduction] = useState(String(initialDeduction));
  const [utrRef, setUtrRef] = useState(initialUtr);
  const [errorMsg, setErrorMsg] = useState('');
  const [successToast, setSuccessToast] = useState(false);

  if (!token) {
    return (
      <div className="payment-container">
        <div className="payment-error-card">
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

  const acceptedKg = token.weight_details?.accepted_weight_kg || token.weight_details?.net_weight_kg || 2500;
  const acceptedQuintals = token.payment?.accepted_quintals || token.weight_details?.accepted_quintals || convertKgToQuintals(acceptedKg);

  const deductionNum = parseFloat(qualityDeduction) || 0;
  const localMspCalc = calculateMspPayout(acceptedKg, token.crop, token.quality?.grade || 'FAQ Accepted', deductionNum);

  // Prefer the authoritative MSP figures already computed server-side
  // (via GET /msp/{booking_id}) over the local demo rate table.
  const hasBackendMsp = token.payment?.msp_rate_per_quintal != null;
  const mspCalc = hasBackendMsp
    ? {
        acceptedQuintals,
        mspRatePerQuintal: token.payment.msp_rate_per_quintal,
        baseMspAmount: token.payment.base_amount,
        qualityDeduction: deductionNum,
        finalPayableAmount: Math.max(0, (token.payment.base_amount || 0) - deductionNum),
      }
    : localMspCalc;

  const isCompleted = token.payment?.status === 'COMPLETED';

  const handleProcessPayment = (e) => {
    e.preventDefault();
    setErrorMsg('');

    if (!utrRef.trim()) {
      setErrorMsg('Bank UTR reference number is required.');
      return;
    }

    const payload = {
      status: 'COMPLETED',
      final_amount: mspCalc.finalPayableAmount,
      transaction_id: utrRef.trim(),
      quality_deduction: deductionNum,
      payment_timestamp: new Date().toLocaleString(),
    };

    updatePaymentDetails(token.token_number, payload);
    setSuccessToast(true);

    setTimeout(() => {
      navigate('/queue');
    }, 1500);
  };

  return (
    <div className="payment-container">
      {/* Navigation Header */}
      <motion.div 
        initial={{ opacity: 0, y: -10 }} 
        animate={{ opacity: 1, y: 0 }}
        className="payment-nav-bar"
      >
        <Link to="/queue" className="back-link">
          <ArrowLeft size={16} />
          <span>Back to Live Queue</span>
        </Link>
        <div className="finance-badge">
          <CreditCard size={16} />
          <span>Direct Benefit Transfer (DBT) Counter</span>
        </div>
      </motion.div>

      {/* Header Banner Card */}
      <motion.div 
        initial={{ opacity: 0, y: 10 }} 
        animate={{ opacity: 1, y: 0 }}
        className="payment-header-card"
      >
        <div className="payment-header-left">
          <div className="token-pill font-mono">Token #{token.token_number}</div>
          <div>
            <h1 className="farmer-name">{token.farmer_name}</h1>
            <p className="farmer-meta-text">
              ID: <strong className="font-mono">{token.farmer_id}</strong> • Crop: <strong>{token.crop}</strong> • Bank Account: <strong className="font-mono">{token.bank_account_masked || 'XXXX XXXX 4521'}</strong>
            </p>
          </div>
        </div>
        <div className="dbt-pill">
          <ShieldCheck size={18} />
          <span>Aadhaar-Linked Bank Disbursal</span>
        </div>
      </motion.div>

      {/* Main Payment Layout */}
      <div className="payment-grid">
        {/* Left Column: Itemized MSP Payout Calculation */}
        <motion.div 
          initial={{ opacity: 0, x: -15 }} 
          animate={{ opacity: 1, x: 0 }}
          className="payment-calc-card"
        >
          <h2 className="calc-title">Itemized MSP Payout Breakdown</h2>
          <p className="calc-sub">Official MSP procurement calculation based on verified weight & lab report</p>

          <div className="payout-table-box">
            <div className="payout-row">
              <span className="p-label">Accepted Weight</span>
              <span className="p-val font-mono">{acceptedQuintals} quintals <span className="p-sub font-mono">({acceptedKg.toLocaleString()} kg)</span></span>
            </div>

            <div className="payout-row">
              <span className="p-label">Government MSP Rate ({token.crop})</span>
              <span className="p-val font-mono">₹{mspCalc.mspRatePerQuintal.toLocaleString()} / quintal</span>
            </div>

            <div className="payout-row highlight-row">
              <span className="p-label">Base Gross MSP Amount</span>
              <span className="p-val gross font-mono">₹{mspCalc.baseMspAmount.toLocaleString()}</span>
            </div>

            <div className="payout-row input-row">
              <span className="p-label">Quality Moisture / Grade Deduction (₹)</span>
              <input
                type="number"
                disabled={isCompleted}
                value={qualityDeduction}
                onChange={(e) => setQualityDeduction(e.target.value)}
                className="deduction-input font-mono"
              />
            </div>

            <div className="payout-row final-payable-row">
              <div>
                <span className="final-label font-mono">Total Payable Disbursement</span>
                <span className="final-sub">Directly transferred to farmer's bank account</span>
              </div>
              <span className="final-amount font-mono">₹{mspCalc.finalPayableAmount.toLocaleString()}</span>
            </div>
          </div>
        </motion.div>

        {/* Right Column: Bank Ref & Disbursement Action */}
        <motion.div 
          initial={{ opacity: 0, x: 15 }} 
          animate={{ opacity: 1, x: 0 }}
          className="payment-action-card"
        >
          <h2 className="action-card-title">Disbursement & Verification</h2>

          <div className="bank-account-box">
            <div className="b-box-header">
              <Building size={18} className="text-emerald-600" />
              <span>Verified Beneficiary Bank Account</span>
            </div>
            <div className="b-box-body">
              <div className="b-line">
                <span>Bank Name:</span>
                <strong>State Bank of India</strong>
              </div>
              <div className="b-line">
                <span>Account Number:</span>
                <strong className="font-mono">{token.bank_account_masked || 'XXXX XXXX 4521'}</strong>
              </div>
              <div className="b-line">
                <span>IFSC Code:</span>
                <strong className="font-mono">SBIN0004521</strong>
              </div>
            </div>
          </div>

          {!isCompleted ? (
            <form onSubmit={handleProcessPayment} className="disbursement-form">
              {errorMsg && (
                <div className="payment-error-banner">
                  <AlertTriangle size={16} />
                  <span>{errorMsg}</span>
                </div>
              )}

              <div className="utr-input-group">
                <label htmlFor="utr">Bank UTR Transaction Reference ID</label>
                <input
                  id="utr"
                  type="text"
                  placeholder="e.g. UTR89412574"
                  value={utrRef}
                  onChange={(e) => setUtrRef(e.target.value)}
                  className="font-mono"
                  required
                />
                <span className="field-hint">Auto-generated bank transaction identifier</span>
              </div>

              <button type="submit" className="btn-process-payout">
                <Banknote size={20} />
                <span>Disburse ₹{mspCalc.finalPayableAmount.toLocaleString()} via Direct Bank Transfer</span>
              </button>

              {successToast && (
                <motion.div initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} className="success-toast">
                  <CheckCircle2 size={18} />
                  <span>Payment completed successfully! Redirecting to queue...</span>
                </motion.div>
              )}
            </form>
          ) : (
            <div className="receipt-completed-box">
              <div className="receipt-status-pill font-mono">
                <CheckCircle2 size={18} />
                <span>PAYMENT COMPLETED & VERIFIED</span>
              </div>
              <div className="receipt-utr font-mono">
                <span>UTR Reference:</span>
                <strong>{token.payment?.transaction_id}</strong>
              </div>
              <button className="btn-print-receipt" onClick={() => window.print()}>
                <Printer size={16} />
                <span>Print Official Receipt</span>
              </button>
            </div>
          )}
        </motion.div>
      </div>
    </div>
  );
}
