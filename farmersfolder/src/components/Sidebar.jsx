import NavItem from './NavItem.jsx';

export default function Sidebar({ t, lang, setLang, page, setPage, setBookStep, logout, theme, toggleTheme }) {
  return (
    <aside className="sidebar">
      <div className="brand">
        <div className="brand-mark">K</div>
        <div className="brand-text">
          <b>KisanSeva</b>
          <span>{t.brandTag}</span>
        </div>
      </div>
      <nav className="primary-nav">
        <NavItem icon="dashboard" label={t.nav.dashboard} active={page === 'dashboard'} onClick={() => setPage('dashboard')} />
        <NavItem icon="findCentres" label={t.nav.findCentres || 'Find Centres'} active={page === 'findCentres'} onClick={() => setPage('findCentres')} />
        <NavItem icon="myCrops" label={t.nav.myCrops || 'My Crops'} active={page === 'myCrops'} onClick={() => setPage('myCrops')} />
        <NavItem
          icon="book"
          label={t.nav.book}
          active={page === 'book'}
          onClick={() => {
            setPage('book');
            setBookStep(1);
          }}
        />
        <NavItem icon="bookings" label={t.nav.bookings} active={page === 'bookings'} onClick={() => setPage('bookings')} />
        <NavItem icon="queue" label={t.nav.queue} active={page === 'queue'} onClick={() => setPage('queue')} />
        <NavItem
          icon="mandiStaff"
          label={lang === 'en' ? 'Mandi Staff Console' : (lang === 'te' ? 'మండి స్టాఫ్' : 'मंडी स्टाफ')}
          active={page === 'mandiStaff'}
          onClick={() => setPage('mandiStaff')}
        />
        <NavItem icon="payments" label={t.nav.payments} active={page === 'payments'} onClick={() => setPage('payments')} />
        <NavItem icon="grievances" label={t.nav.grievances || 'Grievances'} active={page === 'grievances'} onClick={() => setPage('grievances')} />
        <NavItem icon="notifications" label={t.nav.notifications} active={page === 'notifications'} onClick={() => setPage('notifications')} />
        <NavItem icon="profile" label={t.nav.profile} active={page === 'profile'} onClick={() => setPage('profile')} />
      </nav>
      <div className="sidebar-foot">
        <div className="theme-toggle-wrap" style={{ display: 'flex', marginBottom: 2 }}>
          <button
            onClick={toggleTheme}
            style={{
              flex: 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 6,
              padding: '6px 8px',
              borderRadius: 8,
              border: '1px solid var(--border)',
              background: 'var(--surface-2)',
              color: 'var(--ink)',
              fontSize: 12,
              fontWeight: 600,
              cursor: 'pointer'
            }}
            title={theme === 'dark' ? 'Switch to Light Theme' : 'Switch to Dark Theme'}
          >
            {theme === 'dark' ? '☀️ Light' : '🌙 Dark'}
          </button>
        </div>
        <div className="lang-toggle">
          <button className={lang === 'en' ? 'active' : ''} onClick={() => setLang('en')}>
            EN
          </button>
          <button className={lang === 'te' ? 'active' : ''} onClick={() => setLang('te')}>
            తె
          </button>
          <button className={lang === 'hi' ? 'active' : ''} onClick={() => setLang('hi')}>
            हि
          </button>
        </div>
        <button className="logout-btn" onClick={logout}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
            <polyline points="16 17 21 12 16 7" />
            <line x1="21" y1="12" x2="9" y2="12" />
          </svg>
          <span className="nav-label">{lang === 'en' ? 'Log out' : 'లాగ్ అవుట్'}</span>
        </button>
      </div>
    </aside>
  );
}
