import React from 'react';
import { Link } from 'react-router-dom';
import { useQueue } from '../context/QueueContext';
import StatusBadge from '../components/StatusBadge';
import { convertKgToQuintals } from '../services/procurementService';
import './Queue.css';

export default function Queue() {
  const { tokens, updateTokenStage, skipToken } = useQueue();

  const getStageAction = (token) => {
    switch (token.stage) {
      case 'WAITING':
        return (
          <button
            className="btn-action btn-arrive"
            onClick={() => updateTokenStage(token.token_number, 'ARRIVED')}
          >
            Mark Arrived
          </button>
        );
      case 'ARRIVED':
        return (
          <Link
            to={`/tokens/${token.token_number}/weighing`}
            className="btn-action btn-weigh"
          >
            Start Weighing →
          </Link>
        );
      case 'WEIGHING':
        return (
          <Link
            to={`/tokens/${token.token_number}/weighing`}
            className="btn-action btn-weigh"
          >
            Record Weight →
          </Link>
        );
      case 'QUALITY_CHECK':
        return (
          <Link
            to={`/tokens/${token.token_number}/quality`}
            className="btn-action btn-quality"
          >
            Inspect Quality →
          </Link>
        );
      case 'ACCEPTED':
        return (
          <Link
            to={`/tokens/${token.token_number}/payment`}
            className="btn-action btn-payment"
          >
            Process Payment →
          </Link>
        );
      case 'PAYMENT_PROCESSING':
        return (
          <Link
            to={`/tokens/${token.token_number}/payment`}
            className="btn-action btn-payment"
          >
            Complete Payment →
          </Link>
        );
      case 'PAYMENT_COMPLETED':
        return <span className="completed-label">✓ Paid Out ({token.payment?.transaction_id})</span>;
      case 'REJECTED':
        return <span className="rejected-label">🔴 Rejected</span>;
      default:
        return null;
    }
  };

  return (
    <div className="queue-container">
      {/* Header */}
      <header className="queue-header">
        <div>
          <h1 className="queue-title">Live Procurement Queue</h1>
          <p className="queue-subtext">Real-time status of all active farmer tokens in the procurement center</p>
        </div>
        <div className="queue-count-badge">
          Total Tokens: <strong>{tokens.length}</strong>
        </div>
      </header>

      {/* Queue List Table / Cards */}
      <div className="queue-list">
        {tokens.map((token, index) => {
          const declaredBags = token.weight_details?.declared_bags || 50;
          const declaredKg = token.weight_details?.declared_weight_kg || declaredBags * 50;
          const acceptedKg = token.weight_details?.accepted_weight_kg || token.weight_details?.net_weight_kg || 0;
          const acceptedQuintals = token.weight_details?.accepted_quintals || convertKgToQuintals(acceptedKg);

          return (
            <div key={token.token_number} className="queue-card">
              <div className="queue-card-left">
                <span className="queue-position">#{index + 1}</span>
                <div className="token-number-box">Token #{token.token_number}</div>
                <div className="farmer-info">
                  <Link to={`/tokens/${token.token_number}`} className="farmer-name-link">
                    {token.farmer_name}
                  </Link>
                  <span className="farmer-meta">
                    ID: {token.farmer_id} • {token.village}
                  </span>
                </div>
              </div>

              <div className="queue-card-center">
                <div className="crop-badge-box">
                  <span className="crop-name">{token.crop}</span>
                  <span className="crop-variety">{token.variety || 'Standard'}</span>
                </div>
                <div className="weight-badge-box">
                  <span className="w-primary">
                    {acceptedKg > 0
                      ? `${acceptedKg.toLocaleString()} kg (${acceptedQuintals} qtl)`
                      : `${declaredBags} bags (${declaredKg.toLocaleString()} kg declared)`}
                  </span>
                  <span className="w-sub">
                    {acceptedKg > 0 ? `Net Weighed` : `Declared Quantity`}
                  </span>
                </div>
              </div>

              <div className="queue-card-right">
                <StatusBadge status={token.stage} />

                <div className="action-buttons-group">
                  {getStageAction(token)}
                  
                  {token.stage !== 'PAYMENT_COMPLETED' && token.stage !== 'REJECTED' && (
                    <button
                      className="btn-skip"
                      onClick={() => skipToken(token.token_number)}
                      title="Skip position in queue"
                    >
                      Skip ↷
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
