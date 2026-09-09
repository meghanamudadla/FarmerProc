import { receiptService } from '../services/receiptService.js';
import QR from '../components/QR.jsx';

export default function Receipt({
  t,
  lang,
  booking,
  farmer,
  onBack,
  onRaiseGrievance,
}) {
  if (!booking) {
    return (
      <div style={{ maxWidth: 900, margin: '0 auto', padding: '24px 16px' }}>
        <button className="btn btn-ghost" onClick={onBack} style={{ marginBottom: 16 }}>
          ← Back to Bookings
        </button>
        <div className="card empty-note">No receipt record selected or booking not found.</div>
      </div>
    );
  }

  const receipt = receiptService.generateReceipt({
    booking,
    farmer,
    qualityCheck: booking.qualityCheck,
    weighingRecord: booking.weighingRecord,
    centreName: 'Godavari Green Centre, Kakinada',
  });

  return (
    <div style={{ maxWidth: 920, margin: '0 auto', paddingBottom: 40 }}>
      {/* Top Navigation & Actions Bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12, marginBottom: 18 }}>
        <button
          className="btn btn-ghost"
          onClick={onBack}
          style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontWeight: 600, fontSize: 13 }}
        >
          ← {t.back || 'Back to Bookings'}
        </button>

        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          {onRaiseGrievance && (
            <button
              className="btn btn-ghost"
              style={{ color: 'var(--danger)', borderColor: 'rgba(239, 68, 68, 0.4)', fontSize: 12.5 }}
              onClick={() => onRaiseGrievance(receipt.token)}
            >
              🚨 Report Discrepancy (Grievance)
            </button>
          )}

          <button
            className="btn btn-primary"
            style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 13 }}
            onClick={() => window.print()}
          >
            🖨️ Print / Download PDF
          </button>
        </div>
      </div>

      {/* Official Printable Full-Page Receipt Card */}
      <div
        className="card receipt-paper-card"
        style={{
          border: '2px solid var(--border)',
          borderRadius: 12,
          padding: '32px 36px',
          boxShadow: 'var(--shadow-md)',
          background: 'var(--surface)',
          color: 'var(--ink)',
        }}
      >
        {/* Tricolor National Banner Ribbon */}
        <div style={{ height: 4, background: 'linear-gradient(90deg, #FF9933 0%, #FFFFFF 50%, #138808 100%)', borderRadius: 4, marginBottom: 20 }} />

        {/* Official Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '2px dashed var(--border)', paddingBottom: 20, marginBottom: 20, flexWrap: 'wrap', gap: 16 }}>
          <div>
            <div style={{ fontSize: 11.5, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '.08em', color: 'var(--primary-accent)' }}>
              🇮🇳 Government of India · Ministry of Agriculture & Farmers Welfare
            </div>
            <h1 style={{ margin: '6px 0 3px', fontSize: 24, fontWeight: 800, color: 'var(--ink)' }}>
              Official Procurement Digital Receipt
            </h1>
            <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>
              National Electronic Mandi (e-NAM / AgriStack) · {receipt.centreName}
            </div>
          </div>

          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '.05em' }}>
              RECEIPT IDENTIFIER
            </div>
            <div className="mono font-bold" style={{ fontSize: 17, color: 'var(--success)', marginTop: 2 }}>
              {receipt.receiptId}
            </div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>
              Certified on: <b>{receipt.formattedDate}</b>
            </div>
          </div>
        </div>

        {/* 4-Box Key Identification Grid */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
          gap: 14,
          background: 'var(--surface-2)',
          padding: '16px 20px',
          borderRadius: 10,
          border: '1px solid var(--border)',
          marginBottom: 24,
        }}>
          <div>
            <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: 11, fontWeight: 700, textTransform: 'uppercase' }}>FARMER NAME</span>
            <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--ink)', marginTop: 2 }}>{receipt.farmerName}</div>
          </div>
          <div>
            <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: 11, fontWeight: 700, textTransform: 'uppercase' }}>GOVT FARMER ID</span>
            <div className="mono font-bold" style={{ fontSize: 14, color: 'var(--ink)', marginTop: 2 }}>{receipt.farmerId}</div>
          </div>
          <div>
            <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: 11, fontWeight: 700, textTransform: 'uppercase' }}>PROCUREMENT TOKEN</span>
            <div className="mono font-bold" style={{ fontSize: 14, color: 'var(--primary-accent)', marginTop: 2 }}>{receipt.token}</div>
          </div>
          <div>
            <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: 11, fontWeight: 700, textTransform: 'uppercase' }}>DISBURSAL ACCOUNT</span>
            <div className="mono font-bold" style={{ fontSize: 14, color: 'var(--ink)', marginTop: 2 }}>{receipt.bankMasked}</div>
          </div>
        </div>

        {/* Certified Quality & Weighing Parameters Section */}
        <div style={{ marginBottom: 24 }}>
          <div style={{ fontSize: 13, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '.05em', color: 'var(--ink)', marginBottom: 10 }}>
            ⚖️ Certified Quality Assessment & Weighbridge Audit
          </div>

          <div className="table-wrap" style={{ border: '1px solid var(--border)', borderRadius: 8, overflow: 'hidden' }}>
            <table className="table" style={{ width: '100%', fontSize: 13, borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: 'var(--surface-2)' }}>
                  <th style={{ padding: '10px 14px', color: 'var(--ink)', fontWeight: 700 }}>Description / Verification Parameter</th>
                  <th style={{ padding: '10px 14px', color: 'var(--ink)', fontWeight: 700 }}>Certified Value</th>
                  <th style={{ padding: '10px 14px', color: 'var(--ink)', fontWeight: 700 }}>Official Authority Reference</th>
                </tr>
              </thead>
              <tbody>
                <tr style={{ borderBottom: '1px solid var(--border)' }}>
                  <td style={{ padding: '10px 14px', color: 'var(--ink)' }}>Crop Commodity & Variety</td>
                  <td style={{ padding: '10px 14px', color: 'var(--ink)', fontWeight: 700 }}>{receipt.cropName}</td>
                  <td style={{ padding: '10px 14px', color: 'var(--text-muted)' }}>National MSP Procurement Scheme</td>
                </tr>
                <tr style={{ borderBottom: '1px solid var(--border)' }}>
                  <td style={{ padding: '10px 14px', color: 'var(--ink)' }}>Quality Inspection Grade</td>
                  <td style={{ padding: '10px 14px' }}>
                    <span className="status-badge completed">{receipt.qualityGrade}</span>
                  </td>
                  <td style={{ padding: '10px 14px', color: 'var(--text-muted)' }} className="mono">{receipt.qualityCheckId}</td>
                </tr>
                <tr style={{ borderBottom: '1px solid var(--border)' }}>
                  <td style={{ padding: '10px 14px', color: 'var(--ink)' }}>Moisture Content (Digital Sensor)</td>
                  <td style={{ padding: '10px 14px', color: 'var(--ink)', fontWeight: 700 }}>{receipt.moisturePercentage}% (Govt Standard Limit: Max 12.0%)</td>
                  <td style={{ padding: '10px 14px', color: 'var(--text-muted)' }}>Mandi QC Officer: {receipt.inspectorName}</td>
                </tr>
                <tr style={{ borderBottom: '1px solid var(--border)' }}>
                  <td style={{ padding: '10px 14px', color: 'var(--ink)' }}>Gross Vehicle Weight (Loaded Truck)</td>
                  <td style={{ padding: '10px 14px', color: 'var(--ink)' }} className="mono font-bold">{receipt.grossWeight} Qtl</td>
                  <td style={{ padding: '10px 14px', color: 'var(--text-muted)' }}>Government Weighbridge Scale #1</td>
                </tr>
                <tr style={{ borderBottom: '1px solid var(--border)' }}>
                  <td style={{ padding: '10px 14px', color: 'var(--ink)' }}>Tare Weight (Empty Vehicle)</td>
                  <td style={{ padding: '10px 14px', color: 'var(--ink)' }} className="mono font-bold">{receipt.tareWeight} Qtl</td>
                  <td style={{ padding: '10px 14px', color: 'var(--text-muted)' }}>Certified Tare Scale</td>
                </tr>
                <tr style={{ background: 'rgba(16, 185, 129, 0.08)', fontWeight: 800 }}>
                  <td style={{ padding: '12px 14px', color: 'var(--ink)' }}>ACCEPTED NET PROCURED QUANTITY</td>
                  <td style={{ padding: '12px 14px', color: 'var(--success)', fontSize: 16 }} className="mono font-bold">
                    {receipt.netWeight} Quintals
                  </td>
                  <td style={{ padding: '12px 14px', color: 'var(--ink)' }} className="mono">{receipt.weighingRef}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* Financial Calculation & Direct Benefit Transfer Summary */}
        <div style={{
          background: 'var(--surface-2)',
          border: '1px solid var(--border)',
          borderRadius: 10,
          padding: '20px 24px',
          marginBottom: 24,
        }}>
          <div style={{ fontSize: 13, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '.05em', color: 'var(--ink)', marginBottom: 14 }}>
            💰 Direct Benefit Transfer (DBT) Calculation
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13.5, marginBottom: 8, color: 'var(--ink)' }}>
            <span>Gross Commodity Value ({receipt.netWeight} Qtl × ₹{receipt.applicablePrice.toLocaleString('en-IN')}/Qtl MSP):</span>
            <span className="mono font-bold" style={{ fontSize: 15 }}>₹{receipt.grossAmount.toLocaleString('en-IN')}</span>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, color: 'var(--text-muted)', marginBottom: 6 }}>
            <span>Less: Mandi Handling & Scale Calibration Fee (₹5/Qtl):</span>
            <span className="mono font-bold">- ₹{receipt.mandiCess.toLocaleString('en-IN')}</span>
          </div>

          {receipt.qualityDeduction > 0 && (
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, color: 'var(--text-muted)', marginBottom: 6 }}>
              <span>Less: Grade B Quality Adjustment:</span>
              <span className="mono font-bold">- ₹{receipt.qualityDeduction.toLocaleString('en-IN')}</span>
            </div>
          )}

          <div style={{ height: 1, background: 'var(--border)', margin: '12px 0' }} />

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10 }}>
            <div>
              <div style={{ fontSize: 14, fontWeight: 800, color: 'var(--ink)' }}>NET DISBURSAL TO AADHAAR-LINKED BANK:</div>
              <div style={{ fontSize: 11.5, color: 'var(--success)', fontWeight: 600, marginTop: 2 }}>
                ✓ Credited via Direct Benefit Transfer (DBT) · APB Route
              </div>
            </div>
            <div style={{ fontSize: 24, fontWeight: 900, color: 'var(--success)' }} className="mono">
              ₹{receipt.netPayableAmount.toLocaleString('en-IN')}
            </div>
          </div>
        </div>

        {/* Security, Verification QR & Statutory Mandate Footer */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          borderTop: '2px dashed var(--border)',
          paddingTop: 20,
          flexWrap: 'wrap',
          gap: 16,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <div style={{ width: 72, height: 72, background: '#ffffff', padding: 4, borderRadius: 8, border: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <QR payload={JSON.stringify({ r: receipt.receiptId, b: receipt.bookingId, a: receipt.netPayableAmount, f: receipt.farmerId })} size={64} />
            </div>
            <div style={{ maxWidth: 360 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--ink)' }}>
                🔒 Authoritative Electronic Record (IT Act § 65B)
              </div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>
                Generated digitally upon weighbridge tare completion. Validated by Mandi Authority. No manual signature required.
              </div>
            </div>
          </div>

          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
              MANDI SUPERINTENDENT SEAL
            </div>
            <div style={{ fontSize: 13, fontWeight: 800, color: 'var(--primary-accent)', marginTop: 2 }}>
              ✓ Digitally Signed & Sealed
            </div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
              East Godavari District Mandi Command
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
