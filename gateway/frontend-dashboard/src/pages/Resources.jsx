import { useState, useEffect } from 'react';
import { api } from '../api.js';
import { useAuth } from '../store.jsx';
import LoadingSpinner from '../components/LoadingSpinner.jsx';
import EmptyState from '../components/EmptyState.jsx';
import Modal from '../components/Modal.jsx';
import { Database, Plus, Pencil, Trash2 } from 'lucide-react';
import './Resources.css';

const sensitivityColors = {
  public: 'var(--green)',
  internal: 'var(--blue)',
  confidential: 'var(--amber)',
  restricted: 'var(--red)',
};

const categorySuggestions = [
  'customer_profile', 'customer_contact', 'customer_address',
  'order_data', 'payment_data', 'identity_data',
  'analytics_data', 'authentication_data', 'internal_data',
  'inventory_data', 'shipping_data', 'support_tickets',
  'user_activity', 'session_data', 'marketing_data',
];

export default function Resources() {
  const [resources, setResources] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ name: '', category: '', sensitivity: 'internal', description: '' });
  const [formError, setFormError] = useState('');
  const [formSaving, setFormSaving] = useState(false);
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';

  async function fetchResources() {
    try {
      const { resources } = await api.get('/resources');
      setResources(resources);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchResources();
  }, []);

  function openCreate() {
    setForm({ name: '', category: '', sensitivity: 'internal', description: '' });
    setEditing(null);
    setShowCreate(true);
  }

  function openEdit(r) {
    setForm({ name: r.name, category: r.category, sensitivity: r.sensitivity, description: r.description || '' });
    setEditing(r);
    setShowCreate(true);
  }

  function closeModal() {
    setShowCreate(false);
    setEditing(null);
    setFormError('');
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setFormError('');
    setFormSaving(true);
    try {
      if (editing) {
        await api.patch(`/resources/${editing.id}`, form);
      } else {
        await api.post('/resources', form);
      }
      closeModal();
      setLoading(true);
      await fetchResources();
    } catch (err) {
      setFormError(err.message);
    } finally {
      setFormSaving(false);
    }
  }

  async function handleDelete(r) {
    if (!confirm(`Delete "${r.name}"? This will also remove any permissions using it.`)) return;
    try {
      await api.delete(`/resources/${r.id}`);
      setLoading(true);
      await fetchResources();
    } catch (err) {
      alert(err.message);
    }
  }

  if (loading) return <LoadingSpinner />;

  return (
    <div className="resources-page">
      <div className="resources-header">
        <div className="resources-header-left">
          <h1>Data Resources</h1>
          <span className="resources-header-count">{resources.length} total</span>
        </div>
        {isAdmin && (
          <button className="btn btn-primary" onClick={openCreate}>
            <Plus size={14} style={{ marginRight: 4, verticalAlign: -2 }} />
            New Resource
          </button>
        )}
      </div>

      {resources.length === 0 ? (
        <div className="resources-empty">
          <EmptyState
            icon={Database}
            title="No resources yet"
            description="Define the data categories your integrations can access. You can use predefined categories or create your own."
          />
          {isAdmin && (
            <button className="btn btn-primary" style={{ marginTop: 12 }} onClick={openCreate}>
              <Plus size={14} style={{ marginRight: 4, verticalAlign: -2 }} />
              Create Your First Resource
            </button>
          )}
        </div>
      ) : (
        <div className="resources-table-wrap">
          <table className="resources-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Category</th>
                <th>Sensitivity</th>
                <th>Description</th>
                {isAdmin && <th style={{ width: 80 }}></th>}
              </tr>
            </thead>
            <tbody>
              {resources.map((r) => (
                <tr key={r.id}>
                  <td className="resources-name">{r.name}</td>
                  <td><code className="resources-category">{r.category}</code></td>
                  <td>
                    <span
                      className="resources-sensitivity"
                      style={{ color: sensitivityColors[r.sensitivity] }}
                    >
                      {r.sensitivity}
                    </span>
                  </td>
                  <td className="resources-desc">{r.description || '--'}</td>
                  {isAdmin && (
                    <td className="resources-actions">
                      <button className="resources-action-btn" onClick={() => openEdit(r)} title="Edit">
                        <Pencil size={13} />
                      </button>
                      <button className="resources-action-btn resources-action-danger" onClick={() => handleDelete(r)} title="Delete">
                        <Trash2 size={13} />
                      </button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showCreate && (
        <Modal title={editing ? 'Edit Data Resource' : 'New Data Resource'} onClose={closeModal}>
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label className="form-label">Name</label>
              <input
                className="form-input"
                type="text"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="e.g. customer_addresses"
                required
                autoFocus
              />
              <span className="form-hint">A unique identifier for this resource</span>
            </div>

            <div className="form-group">
              <label className="form-label">Category</label>
              <input
                className="form-input"
                type="text"
                value={form.category}
                onChange={(e) => setForm({ ...form, category: e.target.value })}
                placeholder="e.g. customer_data, payment_info, user_analytics"
                required
                list="category-suggestions"
              />
              <datalist id="category-suggestions">
                {categorySuggestions.map((c) => (
                  <option key={c} value={c} />
                ))}
              </datalist>
              <span className="form-hint">Type any category — use predefined ones or create your own</span>
            </div>

            <div className="form-group">
              <label className="form-label">Sensitivity</label>
              <select
                className="form-select"
                value={form.sensitivity}
                onChange={(e) => setForm({ ...form, sensitivity: e.target.value })}
              >
                <option value="public">Public — openly available</option>
                <option value="internal">Internal — company internal</option>
                <option value="confidential">Confidential — sensitive data</option>
                <option value="restricted">Restricted — highly sensitive</option>
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Description (optional)</label>
              <input
                className="form-input"
                type="text"
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                placeholder="What data does this resource contain?"
              />
            </div>

            {formError && <div className="form-error">{formError}</div>}

            <div className="form-actions">
              <button type="button" className="btn btn-ghost" onClick={closeModal}>
                Cancel
              </button>
              <button type="submit" className="btn btn-primary" disabled={formSaving}>
                {formSaving ? 'Saving...' : editing ? 'Update' : 'Create'}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
