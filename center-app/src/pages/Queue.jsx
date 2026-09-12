import React, { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useQueue } from '../context/QueueContext';
import StatusBadge from '../components/StatusBadge';
import { convertKgToQuintals } from '../services/procurementService';
import { Search, Filter, ArrowRight, SkipForward, CheckCircle2, Scale, FlaskConical, CreditCard, Sparkles } from 'lucide-react';
import './Queue.css';

export default function Queue() {
  const { tokens, updateTokenStage, skipToken } = useQueue();
  const [searchTerm, setSearchTerm] = useState('');
  const [stageFilter, setStageFilter] = useState('ALL');

  const filteredTokens = useMemo(() => {
    return tokens.filter((t) => {
      const search = searchTerm.toLowerCase();
      const matchSearch =
        String(t.farmer_name || '').toLowerCase().includes(search) ||
        String(t.farmer_id || '').toLowerCase().includes(search) ||
        String(t.token_number).includes(searchTerm);

      if (stageFilter === 'ALL') return matchSearch;
      if (stageFilter === 'WAITING') return matchSearch && (t.stage === 'WAITING' || t.stage === 'ARRIVED');
      if (stageFilter === 'WEIGHING') return matchSearch && t.stage === 'WEIGHING';
      if (stageFilter === 'QUALITY') return matchSearch && t.stage === 'QUALITY_CHECK';
      if (stageFilter === 'PAYMENT') return matchSearch && (t.stage === 'ACCEPTED' || t.stage === 'PAYMENT_PROCESSING');
      if (stageFilter === 'COMPLETED') return matchSearch && t.stage === 'PAYMENT_COMPLETED';
      if (stageFilter === 'REJECTED') return matchSearch && t.stage === 'REJECTED';

      return matchSearch;
    });
  }, [tokens, searchTerm, stageFilter]);

  const getStageAction = (token) => {
    switch (token.stage) {
      case 'WAITING':
        return (
          <button
            className="btn-action btn-arrive"
            onClick={() => updateTokenStage(token.token_number, 'ARRIVED')}
          >
            <CheckCircle2 size={15} />
            <span>Mark Arrived</span>
          </button>
        );
      case 'ARRIVED':
        return (
          <Link
            to={`/tokens/${token.token_number}/weighing`}
            className="btn-action btn-weigh"
          >
            <Scale size={15} />
            <span>Start Weighing</span>
            <ArrowRight size={14} />
          </Link>
        );
      case 'WEIGHING':
        return (
          <Link
            to={`/tokens/${token.token_number}/weighing`}
            className="btn-action btn-weigh"
          >
            <Scale size={15} />
            <span>Record Weight</span>
            <ArrowRight size={14} />
          </Link>
        );
      case 'QUALITY_CHECK':
        return (
          <Link
            to={`/tokens/${token.token_number}/quality`}
            className="btn-action btn-quality"
          >
            <FlaskConical size={15} />
            <span>Inspect Quality</span>
            <ArrowRight size={14} />
          </Link>
        );
      case 'ACCEPTED':
        return (
          <Link
            to={`/tokens/${token.token_number}/payment`}
            className="btn-action btn-payment"
          >
            <CreditCard size={15} />
            <span>Process Payment</span>
            <ArrowRight size={14} />
          </Link>
        );
      case 'PAYMENT_PROCESSING':
        return (
          <Link
            to={`/tokens/${token.token_number}/payment`}
            className="btn-action btn-payment"
          >
            <CreditCard size={15} />
            <span>Complete Payment</span>
            <ArrowRight size={14} />
          </Link>
        );
      case 'PAYMENT_COMPLETED':
        return (
          <span className="completed-label font-mono">
            <CheckCircle2 size={15} />
            <span>Paid Out ({token.payment?.transaction_id})</span>
          </span>
        );
      case 'REJECTED':
        return (
          <span className="rejected-label">
            🔴 Rejected
          </span>
        );
      default:
        return null;
    }
  };

  return (
    <div className="queue-container">
      {/* Header */}
      <motion.header 
        initial={{ opacity: 0, y: -10 }} 
        animate={{ opacity: 1, y: 0 }}
        className="queue-header"
      >
        <div>
          <div className="queue-header-badge">
            <Sparkles size={13} />
            <span>Live Shift Queue</span>
          </div>
          <h1 className="queue-title">Farmer Token Stream</h1>
          <p className="queue-subtext">Real-time tracking and stage management of procurement tokens</p>
        </div>
        <div className="queue-count-badge font-mono">
          <span>Total Tokens:</span>
          <strong>{tokens.length}</strong>
        </div>
      </motion.header>

      {/* Controls: Search & Stage Filter Bar */}
      <div className="queue-controls-card">
        <div className="search-box">
          <Search size={17} className="search-icon" />
          <input
            type="text"
            placeholder="Search farmer name, ID, or token #..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <div className="filter-tabs">
          <button
            className={`filter-tab ${stageFilter === 'ALL' ? 'active' : ''}`}
            onClick={() => setStageFilter('ALL')}
          >
            All ({tokens.length})
          </button>
          <button
            className={`filter-tab ${stageFilter === 'WAITING' ? 'active' : ''}`}
            onClick={() => setStageFilter('WAITING')}
          >
            Waiting ({tokens.filter((t) => t.stage === 'WAITING' || t.stage === 'ARRIVED').length})
          </button>
          <button
            className={`filter-tab ${stageFilter === 'WEIGHING' ? 'active' : ''}`}
            onClick={() => setStageFilter('WEIGHING')}
          >
            Weighing ({tokens.filter((t) => t.stage === 'WEIGHING').length})
          </button>
          <button
            className={`filter-tab ${stageFilter === 'QUALITY' ? 'active' : ''}`}
            onClick={() => setStageFilter('QUALITY')}
          >
            Quality ({tokens.filter((t) => t.stage === 'QUALITY_CHECK').length})
          </button>
          <button
            className={`filter-tab ${stageFilter === 'PAYMENT' ? 'active' : ''}`}
            onClick={() => setStageFilter('PAYMENT')}
          >
            Payment ({tokens.filter((t) => t.stage === 'ACCEPTED' || t.stage === 'PAYMENT_PROCESSING').length})
          </button>
          <button
            className={`filter-tab ${stageFilter === 'COMPLETED' ? 'active' : ''}`}
            onClick={() => setStageFilter('COMPLETED')}
          >
            Completed ({tokens.filter((t) => t.stage === 'PAYMENT_COMPLETED').length})
          </button>
        </div>
      </div>

      {/* Queue List Cards */}
      <div className="queue-list">
        <AnimatePresence>
          {filteredTokens.map((token, index) => {
            const declaredBags = token.weight_details?.declared_bags || 50;
            const declaredKg = token.weight_details?.declared_weight_kg || declaredBags * 50;
            const acceptedKg = token.weight_details?.accepted_weight_kg || token.weight_details?.net_weight_kg || 0;
            const acceptedQuintals = token.weight_details?.accepted_quintals || convertKgToQuintals(acceptedKg);

            return (
              <motion.div
                key={token.token_number}
                layout
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.2, delay: index * 0.03 }}
                className="queue-card"
              >
                <div className="queue-card-left">
                  <span className="queue-position font-mono">#{index + 1}</span>
                  <div className="token-number-box font-mono">
                    Token #{token.token_number}
                  </div>
                  <div className="farmer-info">
                    <Link to={`/tokens/${token.token_number}`} className="farmer-name-link">
                      {token.farmer_name}
                    </Link>
                    <span className="farmer-meta">
                      ID: <strong className="font-mono">{token.farmer_id}</strong> • {token.village}
                    </span>
                  </div>
                </div>

                <div className="queue-card-center">
                  <div className="crop-badge-box">
                    <span className="crop-name">{token.crop}</span>
                    <span className="crop-variety">{token.variety || 'Standard'}</span>
                  </div>
                  <div className="weight-badge-box">
                    <span className="w-primary font-mono">
                      {acceptedKg > 0
                        ? `${acceptedKg.toLocaleString()} kg (${acceptedQuintals} qtl)`
                        : `${declaredBags} bags (${declaredKg.toLocaleString()} kg)`}
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
                        <SkipForward size={14} />
                        <span>Skip</span>
                      </button>
                    )}
                  </div>
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>

        {filteredTokens.length === 0 && (
          <div className="queue-empty-state">
            <p>No tokens match the selected search/filter controls.</p>
          </div>
        )}
      </div>
    </div>
  );
}
