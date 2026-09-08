import { useState } from 'react';
import { PAYMENT_STAGES } from '../services/paymentService.js';

export default function PaymentTrackerCard({ t, lang, booking, farmer, onViewReceipt, onSimulateFailure, onRetryPayment }) {
  if (!booking) return null;

  const currentStage = (booking.paymentStatus || 'purchase_recorded').toLowerCase();
  const isFailed = currentStage === 'payment_failed';

  const stageOrder = ['purchase_recorded', 'payment_initiated', 'bank_processing', 'credited'];

  const stageIndex = stageOrder.indexOf(currentStage);
  const activeStep = isFailed ? 2 : (stageIndex >= 0 ? stageIndex : 1);

  const stageLabels = {
    purchase_recorded: t.payStage1 || 'Purchase Recorded',
    payment_initiated: t.payStage2 || 'Payment Initiated',
    bank_processing: t.payStage4 || 'Bank Processing',
    credited: t.payStage5 || 'Payment Credited',
  };

  return (
    <div className="card payment-tracker-card" style={{ border: isFailed ? '2px solid var(--danger)' : '1px solid var(--border)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
        <div>
          <span style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.06em', color: 'var(--primary-accent)' }}>
            DBT Direct Benefit Transfer Pipeline
          </span>
          <h3 style={{ margin: '2px 0 0', fontSize: 18 }}>
            Token {booking.token} · ₹{(booking.price || 462400).toLocaleString('en-IN')}
          </h3>
        </div>

        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn btn-ghost" style={{ padding: '6px 12px', fontSize: 12 }} onClick={() => onViewReceipt(booking)}>
            📄 View Digital Receipt
          </button>
        </div>
      </div>

      {/* Payment Failure Alert Box */}
      {isFailed && (
        <div className="card" style={{ background: 'rgba(239, 68, 68, 0.08)', border: '1px solid var(--danger)', padding: 14, marginBottom: 16 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <div style={{ fontWeight: 700, color: 'var(--danger)', fontSize: 14 }}>
                ⛔ Payment Processing Failed
              </div>
              <div style={{ fontSize: 12.5, color: 'var(--text-main)', marginTop: 4 }}>
                <b>Reason:</b> {booking.failureReason || 'Bank branch IFSC migration in progress. Re-verification required.'}
              </div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>
                Ref ID: <span className="mono">{booking.failureRefId || 'ERR-PFMS-90412'}</span> · Helpdesk: 1800-180-1551
              </div>
            </div>
            <button className="btn btn-primary" style={{ padding: '6px 12px', fontSize: 12 }} onClick={() => onRetryPayment(booking.id)}>
              🔄 Re-Initiate Payout
            </button>
          </div>
        </div>
      )}

      {/* Interactive Progress Stepper */}
      {!isFailed && (
        <div className="payment-stepper" style={{ display: 'flex', justifyContent: 'space-between', position: 'relative', margin: '20px 0 16px' }}>
          {stageOrder.map((st, idx) => {
            const isCompleted = stageIndex >= idx;
            const isCurrent = stageIndex === idx;

            return (
              <div key={st} style={{ flex: 1, textAlign: 'center', position: 'relative' }}>
                <div
                  style={{
                    width: 28,
                    height: 28,
                    borderRadius: '50%',
                    margin: '0 auto 6px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 12,
                    fontWeight: 700,
                    background: isCompleted ? 'var(--success)' : 'var(--border)',
                    color: isCompleted ? '#fff' : 'var(--text-muted)',
                    boxShadow: isCurrent ? '0 0 0 4px rgba(16, 185, 129, 0.25)' : 'none',
                  }}
                >
                  {isCompleted ? '✓' : idx + 1}
                </div>
                <div style={{ fontSize: 11, fontWeight: isCurrent ? 700 : 500, color: isCurrent ? 'var(--text-main)' : 'var(--text-muted)' }}>
                  {stageLabels[st]}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Bank Destination Info */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--surface-elevated)', padding: '10px 14px', borderRadius: 8, fontSize: 12 }}>
        <div>
          <span style={{ color: 'var(--text-muted)' }}>Beneficiary Account: </span>
          <b className="mono">{farmer?.bankMasked || '•••• •••• 3422'}</b> ({booking.paymentMethod || 'Direct DBT'})
        </div>
        <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
          🔒 Protected DBT Disbursal
        </div>
      </div>
    </div>
  );
}
