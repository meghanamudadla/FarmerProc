import Icon from './Icon.jsx';

export default function StatTile({ label, value, tone, icon, iconTone = 'violet' }) {
  return (
    <div className="card stat-tile">
      {icon && (
        <div className={'stat-tile-icon ' + iconTone}>
          <Icon name={icon} />
        </div>
      )}
      <div className="stat-tile-body">
        <div className="label">{label}</div>
        <div className={'value' + (tone ? ' ' + tone : '')}>{value}</div>
      </div>
    </div>
  );
}
