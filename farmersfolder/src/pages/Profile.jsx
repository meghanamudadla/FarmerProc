import { useState } from 'react';
import MobileUpdateModal from '../components/MobileUpdateModal.jsx';

export default function Profile({
  t, lang, setLang, farmer, editingProfile, setEditingProfile,
  profileDraft, setProfileDraft, setProfileDraftFromFarmer, saveProfile,
  onUpdateMobile, addNotif, formatMobile,
}) {
  const [isMobileModalOpen, setIsMobileModalOpen] = useState(false);

  return (
    <div className="card pad-lg" style={{ maxWidth: 640 }}>
      <div className="section-title">
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <h2 style={{ fontSize: 18 }}>👤 {t.profileTitle}</h2>
            <span className="badge success">
              <span className="badge-dot"></span>
              {farmer.verificationStatus === 'verified' ? 'Verified Farmer' : 'Verified Profile'}
            </span>
          </div>
          <div style={{ fontSize: 12, color: 'var(--ink-muted)', marginTop: 2 }}>
            AgriStack KISAN Registry Token: <span className="mono" style={{ fontWeight: 600 }}>{farmer.farmerId || 'FARM-91234567'}</span>
          </div>
        </div>

        {!editingProfile && (
          <button
            className="btn btn-ghost"
            onClick={() => {
              setProfileDraftFromFarmer();
              setEditingProfile(true);
            }}
          >
            ✏️ {t.editProfile}
          </button>
        )}
      </div>

      <div className="hint ok" style={{ background: 'var(--surface-2)', padding: '10px 14px', borderRadius: 8, marginBottom: 16 }}>
        🔒 <strong>Security & Compliance Notice:</strong> Sensitive bank information is masked. Farmer ID and verified land ownership records are immutable.
      </div>

      {!editingProfile ? (
        <>
          <div className="detail-grid" style={{ gap: '14px 18px', marginBottom: 16 }}>
            <div className="detail-item">
              <div className="dl">Farmer ID (AgriStack)</div>
              <div className="dv mono" style={{ color: 'var(--accent)', fontWeight: 700 }}>
                {farmer.farmerId || 'FARM-91234567'} 🔒
              </div>
            </div>

            <div className="detail-item">
              <div className="dl">{t.fullName || 'Full Name'}</div>
              <div className="dv">{farmer.fullName}</div>
            </div>

            <div className="detail-item">
              <div className="dl">{t.mobile}</div>
              <div className="dv" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span className="mono">{farmer.mobile}</span>
                <button
                  className="dd-link"
                  style={{ fontSize: 11.5 }}
                  onClick={() => setIsMobileModalOpen(true)}
                >
                  (Update via OTP)
                </button>
              </div>
            </div>

            <div className="detail-item">
              <div className="dl">Village / Mandal</div>
              <div className="dv">{farmer.village || 'Kakinada'}</div>
            </div>

            <div className="detail-item">
              <div className="dl">District / State</div>
              <div className="dv">{farmer.district || 'East Godavari'}, {farmer.state || 'Andhra Pradesh'}</div>
            </div>

            <div className="detail-item">
              <div className="dl">Preferred Language</div>
              <div className="dv">{lang === 'en' ? '🇬🇧 English' : lang === 'te' ? '🇮🇳 తెలుగు (Telugu)' : '🇮🇳 हिंदी (Hindi)'}</div>
            </div>

            <div className="detail-item">
              <div className="dl">Verification Status</div>
              <div className="dv mono" style={{ fontWeight: 700, color: 'var(--success)' }}>
                ✓ {farmer.verificationStatus.toUpperCase()}
              </div>
            </div>

            <div className="detail-item">
              <div className="dl">Account Status</div>
              <div className="dv mono" style={{ fontWeight: 700, color: 'var(--success)' }}>
                ● {farmer.accountStatus.toUpperCase()}
              </div>
            </div>

            <div className="detail-item">
              <div className="dl">{t.landArea} (Verified)</div>
              <div className="dv mono" style={{ fontWeight: 700 }}>
                {farmer.landAcres ? `${farmer.landAcres} Acres` : <span style={{ color: 'var(--critical)' }}>{t.notProvided}</span>} 🔒
              </div>
            </div>

            <div className="detail-item">
              <div className="dl">Queue Priority Status</div>
              <div className="dv">
                {farmer.landAcres && parseFloat(farmer.landAcres) < 1 ? (
                  <span
                    className="badge"
                    style={{ fontSize: 12, fontWeight: 700, background: 'var(--accent-soft)', color: 'var(--accent)' }}
                    title="Small & marginal farmers (under 1 acre) get bounded-fairness priority in the mandi queue"
                  >
                    🌱 Priority Lane Eligible (Small/Marginal Farmer)
                  </span>
                ) : (
                  <span className="badge neutral" style={{ fontSize: 12, fontWeight: 700 }}>
                    Standard FCFS Queue
                  </span>
                )}
              </div>
            </div>

            <div className="detail-item">
              <div className="dl">Direct Payout Bank Account</div>
              <div className="dv mono" style={{ letterSpacing: '.05em' }}>
                {farmer.bankMasked || '•••• •••• 3422'} (SBI)
              </div>
            </div>

            <div className="detail-item">
              <div className="dl">Aadhaar (Last 4)</div>
              <div className="dv mono">•••• {farmer.aadhaarLast4 || '4321'}</div>
            </div>
          </div>
        </>
      ) : (
        <>
          <div className="field">
            <label>{t.fullName || 'Full Name'} (Verified Name)</label>
            <input type="text" value={profileDraft.fullName} onChange={(e) => setProfileDraft({ ...profileDraft, fullName: e.target.value })} />
          </div>

          <div className="field">
            <label>{t.mobile} (Use OTP flow for updating mobile number)</label>
            <input type="text" value={farmer.mobile} disabled style={{ opacity: 0.7 }} />
          </div>

          <div className="field-row">
            <div className="field">
              <label>Village</label>
              <input
                type="text"
                value={profileDraft.village || ''}
                onChange={(e) => setProfileDraft({ ...profileDraft, village: e.target.value })}
                placeholder="Kakinada"
              />
            </div>
            <div className="field">
              <label>District</label>
              <input
                type="text"
                value={profileDraft.district || ''}
                onChange={(e) => setProfileDraft({ ...profileDraft, district: e.target.value })}
                placeholder="East Godavari"
              />
            </div>
          </div>

          <div className="field-row">
            <div className="field">
              <label>State</label>
              <input
                type="text"
                value={profileDraft.state || 'Andhra Pradesh'}
                onChange={(e) => setProfileDraft({ ...profileDraft, state: e.target.value })}
              />
            </div>
            <div className="field">
              <label>Preferred Language</label>
              <select value={lang} onChange={(e) => setLang(e.target.value)}>
                <option value="en">🇬🇧 English</option>
                <option value="te">🇮🇳 తెలుగు (Telugu)</option>
                <option value="hi">🇮🇳 हिंदी (Hindi)</option>
              </select>
            </div>
          </div>

          <div className="field">
            <label>{t.landArea} (Locked by Govt Registry)</label>
            <input type="number" value={profileDraft.landAcres} disabled style={{ opacity: 0.7 }} />
            <div className="hint">Land ownership details are verified from land records and cannot be directly modified.</div>
          </div>

          <div className="btn-row">
            <button className="btn btn-ghost" onClick={() => setEditingProfile(false)}>
              {t.back}
            </button>
            <button className="btn btn-primary" onClick={saveProfile}>
              ✓ {t.saveProfile}
            </button>
          </div>
        </>
      )}

      {/* Modal for 2-step OTP Mobile Update */}
      <MobileUpdateModal
        t={t}
        lang={lang}
        isOpen={isMobileModalOpen}
        onClose={() => setIsMobileModalOpen(false)}
        onUpdateMobile={onUpdateMobile}
        addNotif={addNotif}
        formatMobile={formatMobile}
      />
    </div>
  );
}
