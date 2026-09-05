import Icon from './Icon.jsx';

export default function NavItem({ icon, label, active, onClick }) {
  return (
    <button className={'nav-item' + (active ? ' active' : '')} onClick={onClick}>
      <Icon name={icon} />
      <span className="nav-label">{label}</span>
    </button>
  );
}
