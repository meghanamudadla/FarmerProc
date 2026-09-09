import { receiptService } from '../services/receiptService.js';
import QR from './QR.jsx';

export default function DigitalReceiptModal({ t, lang, isOpen, onClose, booking, farmer }) {
  if (!isOpen || !booking) return null;

  const receipt = receiptService.generateReceipt({
    booking,
    farmer,
    qualityCheck: booking.qualityCheck,
    weighingRecord: booking.weighingRecord,
    centreName: 'Godavari Green Centre, Kakinada',
  });

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-card receipt-modal-paper" style={{ maxWidth: 620, padding: '28px 32px' }} onClick={(e) => e.stopPropagation()}>
        {/* Receipt Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '2px dashed var(--border)', paddingBottom: 16, marginBottom: 16 }}>
          <div>
            <div style={{ fontSize: 11, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '.08em', color: 'var(--primary-accent)' }}>
              Government of India · Ministry of Agriculture
            </div>
            <h2 style={{ margin: '4px 0 2px', fontSize: 20, color: 'var(--text-main)' }}>
              Official Procurement Digital Receipt
            </h2>
            <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
              {receipt.centreName} · Mandi Station
            </div>
          </div>

          <div style={{ textAlign: 'right' }}>
            <button className="btn btn-ghost" style={{ padding: '4px 8px', marginBottom: 6 }} onClick={onClose}>✕</button>
            <div className="mono" style={{ fontSize: 13, fontWeight: 700, color: 'var(--success)' }}>
              {receipt.receiptId}
            </div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{receipt.formattedDate}</div>
          </div>
        </div>

        {/* Farmer & Booking Identity Row */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 12, background: 'var(--surface-elevated)', padding: 12, borderRadius: 8, marginBottom: 16, fontSize: 12 }}>
          <div>
            <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: 10.5 }}>FARMER NAME</span>
            <b>{receipt.farmerName}</b>
          </div>
          <div>
            <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: 10.5 }}>FARMER ID</span>
            <b className="mono">{receipt.farmerId}</b>
          </div>
          <div>
            <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: 10.5 }}>TOKEN</span>
            <b className="mono">{receipt.token}</b>
          </div>
          <div>
            <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: 10.5 }}>CREDIT ACCOUNT</span>
            <b className="mono">{receipt.bankMasked}</b>
          </div>
        </div>

        {/* Quality & Weighbridge Breakdown Table */}
        <table className="table" style={{ width: '100%', fontSize: 12.5, marginBottom: 16 }}>
          <thead>
            <tr>
              <th>Description / Parameter</th>
              <th>Certified Value</th>
              <th>Reference ID</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Crop Variety</td>
              <td><b>{receipt.cropName}</b></td>
              <td>Govt MSP Scheme</td>
            </tr>
            <tr>
              <td>Quality Grade</td>
              <td><span className="status-badge completed">{receipt.qualityGrade}</span></td>
              <td className="mono">{receipt.qualityCheckId}</td>
            </tr>
            <tr>
              <td>Moisture Content</td>
              <td>{receipt.moisturePercentage}% (Max: 12.0%)</td>
              <td>Inspector: {receipt.inspectorName}</td>
            </tr>
            <tr>
              <td>Gross Weight (Loaded)</td>
              <td className="mono">{receipt.grossWeight} Qtl</td>
              <td>Weighbridge Scale #1</td>
            </tr>
            <tr>
              <td>Tare Weight (Container/Empty)</td>
              <td className="mono">{receipt.tareWeight} Qtl</td>
              <td>Certified Scale</td>
            </tr>
            <tr style={{ background: 'rgba(16, 185, 129, 0.06)', fontWeight: 700 }}>
              <td>ACCEPTED NET WEIGHT</td>
              <td className="mono" style={{ color: 'var(--success)', fontSize: 14 }}>{receipt.netWeight} Qtl</td>
              <td className="mono">{receipt.weighingRef}</td>
            </tr>
          </tbody>
        </table>

        {/* Financial Calculation Box */}
        <div className="card" style={{ background: 'var(--surface)', border: '1px solid var(--border)', padding: 14, marginBottom: 16 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 6 }}>
            <span>Gross Procurement Value ({receipt.netWeight} Qtl × ₹{receipt.applicablePrice.toLocaleString('en-IN')}/Qtl):</span>
            <span className="mono font-bold">₹{receipt.grossAmount.toLocaleString('en-IN')}</span>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: 'var(--text-muted)', marginBottom: 4 }}>
            <span>Less: Mandi Handling & Weighing Cess (₹5/Qtl):</span>
            <span className="mono">- ₹{receipt.mandiCess.toLocaleString('en-IN')}</span>
          </div>

          {receipt.qualityDeduction > 0 && (
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: 'var(--text-muted)', marginBottom: 4 }}>
              <span>Less: Grade B Quality Adjustment (2%):</span>
              <span className="mono">- ₹{receipt.qualityDeduction.toLocaleString('en-IN')}</span>
            </div>
          )}

          <div style={{ height: 1, background: 'var(--border)', margin: '8px 0' }} />

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: 14, fontWeight: 800 }}>NET PAYABLE TO BANK ACCOUNT:</span>
            <span style={{ fontSize: 20, fontWeight: 800, color: 'var(--success)' }} className="mono">
              ₹{receipt.netPayableAmount.toLocaleString('en-IN')}
            </span>
          </div>
        </div>

        {/* Security & Verification Footer */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '2px dashed var(--border)', paddingTop: 14 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ width: 56, height: 56, background: '#fff', padding: 4, borderRadius: 6, border: '1px solid var(--border)' }}>
              <QR payload={JSON.stringify({ r: receipt.receiptId, b: receipt.bookingId, a: receipt.netPayableAmount })} size={48} />
            </div>
            <div style={{ fontSize: 10.5, color: 'var(--text-muted)', maxWidth: 280 }}>
              🔒 <b>Digitally Signed & Certified:</b> Validated under National Agriculture Procurement Guidelines. No physical stamp needed.
            </div>
          </div>

          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn btn-primary" style={{ padding: '8px 16px', fontSize: 13 }} onClick={() => window.print()}>
              🖨️ Print / Download PDF
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
