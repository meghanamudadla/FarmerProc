export default function TopBar({
  t, lang, page, farmer, role,
  profileMenuOpen, setProfileMenuOpen,
  changingNumber, setChangingNumber,
  newMobileDraft, setNewMobileDraft, formatMobile, saveNewMobile,
  setPage, logout, onOpenSecurityTests,
  theme, toggleTheme,
}) {
  const initials = farmer.fullName.split(' ').map((w) => w[0]).join('').slice(0, 2);

  return (
    <div className="topbar">
      <div>
        <div className="greeting">{t.greeting(farmer.fullName.split(' ')[0])}</div>
        <div className="subtext">{page === 'dashboard' ? t.dashSub : page === 'book' ? t.bookSlotTag : ''}</div>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        {/* Dark / Light Mode Toggle Button */}
        <button
          className="btn btn-ghost"
          style={{
            padding: '6px 12px',
            fontSize: 12,
            border: '1.5px solid var(--border)',
            background: 'var(--surface)',
            display: 'flex',
            alignItems: 'center',
            gap: 6
          }}
          onClick={toggleTheme}
          title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
          aria-label="Toggle dark/light theme"
        >
          <span>{theme === 'dark' ? '☀️' : '🌙'}</span>
          <span style={{ fontWeight: 600 }}>
            {theme === 'dark'
              ? (lang === 'te' ? 'లైట్ మోడ్' : lang === 'hi' ? 'लाइट मोड' : 'Light Mode')
              : (lang === 'te' ? 'డార్క్ మోడ్' : lang === 'hi' ? 'डार्क मोड' : 'Dark Mode')}
          </span>
        </button>

        {/* Phase 12 Security & Test Suite Action Button */}
        <button
          className="btn btn-ghost"
          style={{ padding: '6px 12px', fontSize: 12, border: '1.5px solid var(--border)', background: 'var(--surface-elevated)' }}
          onClick={onOpenSecurityTests}
        >
          🛡️ Security & Test Suite
        </button>

        <div className="profile-trigger-wrap">
          <button className="farmer-chip" onClick={() => setProfileMenuOpen((o) => !o)}>
          <div className="avatar">{initials}</div>
          <div style={{ textAlign: 'left' }}>
            <div style={{ fontWeight: 600, fontSize: 13 }}>{farmer.fullName}</div>
            <div style={{ fontSize: 11, color: 'var(--ink-muted)' }}>{role === 'farmer' ? t.roleFarmer : role}</div>
          </div>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginLeft: 2, opacity: 0.6 }}>
            <polyline points={profileMenuOpen ? '18 15 12 9 6 15' : '6 9 12 15 18 9'} />
          </svg>
        </button>

        {profileMenuOpen && (
          <div className="profile-dropdown">
            <div className="profile-dd-head">
              <div className="avatar" style={{ width: 44, height: 44, fontSize: 15 }}>
                {initials}
              </div>
              <div>
                <div style={{ fontWeight: 700, fontSize: 15 }}>{farmer.fullName}</div>
                <div style={{ fontSize: 11.5, color: 'var(--ink-muted)' }}>
                  {t.roleFarmer} · {[farmer.village, farmer.district].filter(Boolean).join(', ') || '—'}
                </div>
              </div>
            </div>

            <div className="profile-dd-row">
              <span className="profile-dd-label">{t.mobile}</span>
              {!changingNumber ? (
                <span className="profile-dd-value">
                  {farmer.mobile}
                  <button
                    className="dd-link"
                    onClick={() => {
                      setChangingNumber(true);
                      setNewMobileDraft('');
                    }}
                  >
                    {lang === 'en' ? 'Change' : 'మార్చండి'}
                  </button>
                </span>
              ) : (
                <span className="profile-dd-value" style={{ flexDirection: 'column', alignItems: 'flex-end', gap: 6 }}>
                  <input
                    type="tel"
                    inputMode="numeric"
                    value={newMobileDraft}
                    onChange={(e) => setNewMobileDraft(formatMobile(e.target.value))}
                    placeholder="98765 43210"
                    style={{ width: 150, padding: '6px 8px', fontSize: 12.5 }}
                  />
                  <span style={{ display: 'flex', gap: 6 }}>
                    <button className="dd-link" onClick={() => setChangingNumber(false)}>
                      {lang === 'en' ? 'Cancel' : 'రద్దు'}
                    </button>
                    <button className="dd-link" style={{ color: 'var(--accent)' }} disabled={newMobileDraft.replace(/\D/g, '').length !== 10} onClick={saveNewMobile}>
                      {lang === 'en' ? 'Save' : 'సేవ్'}
                    </button>
                  </span>
                </span>
              )}
            </div>
            <div className="profile-dd-row">
              <span className="profile-dd-label">{t.landArea}</span>
              <span className="profile-dd-value">{farmer.landAcres ? `${farmer.landAcres} acres` : t.notProvided}</span>
            </div>
            <div className="profile-dd-row">
              <span className="profile-dd-label">{t.primaryCrop}</span>
              <span className="profile-dd-value">{farmer.primaryCrop || (lang === 'en' ? 'Not set' : 'సెట్ చేయలేదు')}</span>
            </div>
            <div className="profile-dd-row">
              <span className="profile-dd-label">{lang === 'en' ? 'Farmer ID' : 'ఫార్మర్ ఐడి'}</span>
              <span className="profile-dd-value">{farmer.farmerId || (lang === 'en' ? 'Not linked' : 'లింక్ లేదు')}</span>
            </div>
            <div className="profile-dd-row">
              <span className="profile-dd-label">{lang === 'te' ? 'థీమ్' : lang === 'hi' ? 'थीम' : 'Theme'}</span>
              <span className="profile-dd-value">
                <button
                  className="dd-link"
                  style={{ display: 'flex', alignItems: 'center', gap: 4 }}
                  onClick={toggleTheme}
                >
                  {theme === 'dark' ? '☀️ ' + (lang === 'te' ? 'లైట్ మోడ్' : lang === 'hi' ? 'लाइट' : 'Light') : '🌙 ' + (lang === 'te' ? 'డార్క్ మోడ్' : lang === 'hi' ? 'डार्क' : 'Dark')}
                </button>
              </span>
            </div>
            <div className="profile-dd-row">
              <span className="profile-dd-label">{lang === 'en' ? 'Aadhaar' : 'ఆధార్'}</span>
              <span className="profile-dd-value mono">{farmer.aadhaarLast4 ? `•••• ${farmer.aadhaarLast4}` : '—'}</span>
            </div>

            <div className="profile-dd-actions">
              <button
                className="btn btn-ghost"
                style={{ flex: 1, justifyContent: 'center', padding: '8px 6px', fontSize: 12.5 }}
                onClick={() => {
                  setPage('profile');
                  setProfileMenuOpen(false);
                }}
              >
                ✎ {t.editProfile}
              </button>
              <button className="btn btn-danger" style={{ flex: 1, justifyContent: 'center', padding: '8px 6px', fontSize: 12.5 }} onClick={logout}>
                {lang === 'en' ? 'Log out' : 'లాగ్ అవుట్'}
              </button>
            </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
