import NavItem from './NavItem.jsx';

export default function Sidebar({ t, lang, setLang, page, setPage, setBookStep, logout }) {
  return (
    <aside className="sidebar">
      <div className="brand">
        <div className="brand-mark">F</div>
        <div className="brand-text">
          <b>FasalFlow</b>
          <span>{t.brandTag}</span>
        </div>
      </div>
      <nav className="primary-nav">
        <NavItem icon="dashboard" label={t.nav.dashboard} active={page === 'dashboard'} onClick={() => setPage('dashboard')} />
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
        <NavItem icon="payments" label={t.nav.payments} active={page === 'payments'} onClick={() => setPage('payments')} />
        <NavItem icon="notifications" label={t.nav.notifications} active={page === 'notifications'} onClick={() => setPage('notifications')} />
        <NavItem icon="profile" label={t.nav.profile} active={page === 'profile'} onClick={() => setPage('profile')} />
      </nav>
      <div className="sidebar-foot">
        <div className="lang-toggle">
          <button className={lang === 'en' ? 'active' : ''} onClick={() => setLang('en')}>
            EN
          </button>
          <button className={lang === 'te' ? 'active' : ''} onClick={() => setLang('te')}>
            తె
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
