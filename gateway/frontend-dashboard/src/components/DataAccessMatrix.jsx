import { useState, useEffect } from 'react';
import { api } from '../api.js';
import LoadingSpinner from '../components/LoadingSpinner.jsx';
import EmptyState from '../components/EmptyState.jsx';
import { Grid3x3 } from 'lucide-react';
import './DataAccessMatrix.css';

const categoryShort = {
  customer_profile: 'Profiles',
  customer_contact: 'Contacts',
  customer_address: 'Addresses',
  order_data: 'Orders',
  payment_data: 'Payments',
  identity_data: 'Identity',
  analytics_data: 'Analytics',
  authentication_data: 'Auth',
  internal_data: 'Internal',
};

export default function DataAccessMatrix() {
  const [matrix, setMatrix] = useState(null);
  const [loading, setLoading] = useState(true);
  const [hoveredCell, setHoveredCell] = useState(null);

  useEffect(() => {
    api.get('/dashboard/data-access-matrix')
      .then((data) => setMatrix(data))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <LoadingSpinner size={16} />;
  if (!matrix || matrix.matrix.length === 0) {
    return <EmptyState icon={Grid3x3} title="No access data" />;
  }

  return (
    <div className="matrix-container">
      <div className="matrix-scroll">
        <table className="matrix-table">
          <thead>
            <tr>
              <th className="matrix-corner">Integration</th>
              {matrix.categories.map((cat) => (
                <th key={cat} className="matrix-col-header">
                  {categoryShort[cat] || cat}
                </th>
              ))}
              <th className="matrix-summary-header">Permitted</th>
              <th className="matrix-summary-header">Used</th>
              <th className="matrix-summary-header">Unused</th>
            </tr>
          </thead>
          <tbody>
            {matrix.matrix.map((row) => (
              <tr key={row.integrationId}>
                <td className="matrix-row-header">
                  <span className="matrix-intg-name">{row.name}</span>
                  <span className={`matrix-intg-risk matrix-intg-risk--${row.riskLevel}`}>
                    {row.riskLevel}
                  </span>
                </td>
                {row.cells.map((cell) => {
                  const cellClass = getCellClass(cell);
                  return (
                    <td
                      key={cell.category}
                      className={`matrix-cell ${cellClass}`}
                      onMouseEnter={() => setHoveredCell({ row: row.name, ...cell })}
                      onMouseLeave={() => setHoveredCell(null)}
                    >
                      {cell.permitted && cell.accessed && (
                        <span className="matrix-dot matrix-dot--active" />
                      )}
                      {cell.permitted && !cell.accessed && (
                        <span className="matrix-dot matrix-dot--permitted" />
                      )}
                      {!cell.permitted && cell.accessed && (
                        <span className="matrix-dot matrix-dot--unauthorized" />
                      )}
                      {!cell.permitted && !cell.accessed && (
                        <span className="matrix-dot matrix-dot--none" />
                      )}
                    </td>
                  );
                })}
                <td className="matrix-summary">{row.permittedCount}</td>
                <td className="matrix-summary">{row.accessedCount}</td>
                <td className={`matrix-summary ${row.unusedAccess > 3 ? 'matrix-summary--warn' : ''}`}>
                  {row.unusedAccess}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="matrix-legend">
        <span className="matrix-legend-item">
          <span className="matrix-dot matrix-dot--active" /> Permitted &amp; Used
        </span>
        <span className="matrix-legend-item">
          <span className="matrix-dot matrix-dot--permitted" /> Permitted, Not Used
        </span>
        <span className="matrix-legend-item">
          <span className="matrix-dot matrix-dot--unauthorized" /> Unauthorized Access
        </span>
        <span className="matrix-legend-item">
          <span className="matrix-dot matrix-dot--none" /> No Access
        </span>
      </div>

      {hoveredCell && (
        <div className="matrix-tooltip">
          <strong>{hoveredCell.row}</strong> x <strong>{categoryShort[hoveredCell.category] || hoveredCell.category}</strong>
          {hoveredCell.permitted && (
            <span> -- {hoveredCell.action} allowed ({hoveredCell.sensitivity})</span>
          )}
          {!hoveredCell.permitted && (
            <span> -- no permission</span>
          )}
          {hoveredCell.accessed && (
            <span> -- {hoveredCell.accessCount} accesses{hoveredCell.hasAnomaly ? ' (anomaly)' : ''}</span>
          )}
        </div>
      )}
    </div>
  );
}

function getCellClass(cell) {
  if (!cell.permitted && cell.accessed) return 'matrix-cell--unauthorized';
  if (cell.permitted && cell.accessed) return 'matrix-cell--active';
  if (cell.permitted && !cell.accessed) return 'matrix-cell--permitted';
  return 'matrix-cell--none';
}
