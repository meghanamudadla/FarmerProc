import { cropById } from '../data/domain.js';

export default function ProcurementReceiptCard({ t, lang, booking, farmer }) {
  if (!booking || booking.status !== 'completed' || !booking.weighingRecord) {
    return null;
  }

  const crop = cropById(booking.cropId);
  const cropLabel = crop ? crop[lang] : (booking.cropLabel || 'Crop Produce');
  const qc = booking.qualityCheck || {
    qualityCheckId: 'QC-849102',
    qualityGrade: 'GRADE_A',
    moisturePercentage: 11.5,
    foreignMatterPercentage: 1.2,
    inspectorName: 'Officer K. Sharma',
  };
  const wb = booking.weighingRecord || {
    weighingRef: 'WB-2026-44091',
    grossWeight: 75.0,
    tareWeight: 5.0,
    netWeight: 70.0,
    operatorName: 'Officer M. Rao',
  };

  return (
    <div className="card procurement-receipt-card" style={{ border: '2px solid var(--success)', background: 'var(--surface)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <div>
          <span style={{ fontSize: 10, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '.08em', color: 'var(--success)' }}>
            Official Procurement Certificate
          </span>
          <h4 style={{ margin: '3px 0 0', fontSize: 16 }}>Procurement Finalized · {booking.token}</h4>
        </div>
        <span className="status-badge completed" style={{ fontSize: 11 }}>
          CERTIFIED
        </span>
      </div>

      {/* Grid: Quality & Weighing Details */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12, marginBottom: 14 }}>
        {/* Quality Certificate Box */}
        <div style={{ background: 'var(--surface-elevated)', padding: 12, borderRadius: 10, border: '1px solid var(--border)' }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', marginBottom: 4 }}>
            🧪 Quality Inspection
          </div>
          <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--primary-accent)' }}>
            {qc.qualityGrade} ({cropLabel})
          </div>
          <div style={{ fontSize: 11.5, color: 'var(--text-main)', marginTop: 4 }}>
            Moisture: <b>{qc.moisturePercentage}%</b> · Impurities: <b>{qc.foreignMatterPercentage}%</b>
          </div>
          <div style={{ fontSize: 10.5, color: 'var(--text-muted)', marginTop: 4 }}>
            Inspector: {qc.inspectorName} ({qc.qualityCheckId})
          </div>
        </div>

        {/* Weighbridge Slip Box */}
        <div style={{ background: 'var(--surface-elevated)', padding: 12, borderRadius: 10, border: '1px solid var(--border)' }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', marginBottom: 4 }}>
            ⚖️ Weighbridge Net Weight
          </div>
          <div style={{ fontSize: 18, fontWeight: 800, color: 'var(--success)' }} className="mono">
            {wb.netWeight} Qtl
          </div>
          <div style={{ fontSize: 11.5, color: 'var(--text-main)', marginTop: 2 }}>
            Gross: {wb.grossWeight} Qtl · Tare: {wb.tareWeight} Qtl
          </div>
          <div style={{ fontSize: 10.5, color: 'var(--text-muted)', marginTop: 4 }}>
            Ref: <span className="mono">{wb.weighingRef}</span> ({wb.operatorName})
          </div>
        </div>
      </div>

      {/* Payout Calculation Bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(16, 185, 129, 0.08)', padding: '10px 14px', borderRadius: 8, border: '1px solid rgba(16, 185, 129, 0.25)' }}>
        <div>
          <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Approved Procurement Payout (Phase 8 Ready)</div>
          <div style={{ fontSize: 18, fontWeight: 800, color: 'var(--success)' }} className="mono">
            ₹{booking.price?.toLocaleString('en-IN')}
          </div>
        </div>
        <button className="btn btn-ghost" style={{ fontSize: 11.5, padding: '5px 10px' }} onClick={() => window.print()}>
          🖨️ Print Weight Slip
        </button>
      </div>
    </div>
  );
}
