/**
 * Shared scaffolding for the seven data-management screens of FR1.
 *
 * Each entity differs only in its columns, its form fields and its endpoint, so those are
 * the only things a page supplies. Writing seven bespoke screens would mean seven copies
 * of the same list/create/edit/delete logic, and seven places for a bug to hide.
 */
import { useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api, ApiError } from '../api/client';
import { useAuth } from '../auth/AuthContext';
import { PageHeader } from './Shell';

export interface Column<T> {
  header: string;
  render: (row: T) => ReactNode;
  numeric?: boolean;
}

interface ResourcePageProps<T, F> {
  title: string;
  description: string;
  endpoint: string;
  columns: Column<T>[];
  /** Fresh form state for a new record. */
  emptyForm: F;
  /** Maps an existing record back into form state for editing. */
  toForm: (row: T) => F;
  /** Renders the form fields. */
  renderForm: (form: F, update: (patch: Partial<F>) => void) => ReactNode;
  rowKey: (row: T) => string;
  rowLabel: (row: T) => string;
}

export function ResourcePage<T, F extends object>({
  title,
  description,
  endpoint,
  columns,
  emptyForm,
  toForm,
  renderForm,
  rowKey,
  rowLabel,
}: ResourcePageProps<T, F>) {
  const { isAdmin } = useAuth();
  const queryClient = useQueryClient();

  const [form, setForm] = useState<F>(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [error, setError] = useState<ApiError | Error | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const { data: rows = [], isLoading } = useQuery({
    queryKey: [endpoint],
    queryFn: () => api.get<T[]>(endpoint),
  });

  const invalidate = () => {
    // Several entities reference each other (a course's department, a batch's programme),
    // so any write can change what another screen's dropdown should offer.
    queryClient.invalidateQueries();
  };

  const reset = () => {
    setForm(emptyForm);
    setEditingId(null);
    setError(null);
  };

  const save = useMutation({
    mutationFn: (payload: F) =>
      editingId ? api.put<T>(`${endpoint}/${editingId}`, payload) : api.post<T>(endpoint, payload),
    onSuccess: () => {
      setNotice(editingId ? 'Changes saved.' : 'Record created.');
      reset();
      invalidate();
    },
    onError: (e: Error) => setError(e),
  });

  const remove = useMutation({
    mutationFn: (id: string) => api.delete(`${endpoint}/${id}`),
    onSuccess: () => {
      setNotice('Record deleted.');
      invalidate();
    },
    onError: (e: Error) => setError(e),
  });

  const fieldErrors = useMemo(
    () => (error instanceof ApiError ? (error.details ?? []) : []),
    [error],
  );

  return (
    <>
      <PageHeader title={title} description={description} />
      <div className="page-body">
        {notice && <div className="banner success">{notice}</div>}
        {error && (
          <div className="banner error">
            {error.message}
            {fieldErrors.length > 0 && (
              <ul>
                {fieldErrors.map((f) => (
                  <li key={f.field}>
                    <strong>{f.field}</strong>: {f.message}
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}

        {isAdmin && (
          <div className="card">
            <h3>{editingId ? `Edit ${title.toLowerCase().replace(/s$/, '')}` : `Add ${title.toLowerCase().replace(/s$/, '')}`}</h3>
            <p className="hint">
              Fields are validated in the browser and again on the server, using the same rules.
            </p>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                setNotice(null);
                setError(null);
                save.mutate(form);
              }}
            >
              {renderForm(form, (patch) => setForm((current) => ({ ...current, ...patch })))}
              <div className="row" style={{ marginTop: 6 }}>
                <button className="primary" type="submit" disabled={save.isPending}>
                  {save.isPending ? 'Saving...' : editingId ? 'Save changes' : 'Create'}
                </button>
                {editingId && (
                  <button type="button" onClick={reset}>
                    Cancel
                  </button>
                )}
              </div>
            </form>
          </div>
        )}

        <div className="card">
          <div className="spread">
            <h3 style={{ margin: 0 }}>
              {title} <span className="muted" style={{ fontWeight: 400 }}>({rows.length})</span>
            </h3>
          </div>

          {isLoading ? (
            <p className="muted">Loading...</p>
          ) : rows.length === 0 ? (
            <p className="muted">Nothing registered yet.</p>
          ) : (
            <div className="scroll-x">
              <table className="data">
                <thead>
                  <tr>
                    {columns.map((c) => (
                      <th key={c.header} className={c.numeric ? 'numeric' : undefined}>
                        {c.header}
                      </th>
                    ))}
                    {isAdmin && <th style={{ width: 150 }}>Actions</th>}
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row) => (
                    <tr key={rowKey(row)}>
                      {columns.map((c) => (
                        <td key={c.header} className={c.numeric ? 'numeric' : undefined}>
                          {c.render(row)}
                        </td>
                      ))}
                      {isAdmin && (
                        <td>
                          <div className="row">
                            <button
                              className="small"
                              onClick={() => {
                                setForm(toForm(row));
                                setEditingId(rowKey(row));
                                setNotice(null);
                                setError(null);
                                window.scrollTo({ top: 0, behavior: 'smooth' });
                              }}
                            >
                              Edit
                            </button>
                            <button
                              className="small danger"
                              onClick={() => {
                                if (confirm(`Delete "${rowLabel(row)}"? This cannot be undone.`)) {
                                  setNotice(null);
                                  setError(null);
                                  remove.mutate(rowKey(row));
                                }
                              }}
                            >
                              Delete
                            </button>
                          </div>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </>
  );
}

/** Small labelled input helper, so the entity pages stay declarative. */
export function Field({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <div className="field">
      <label>{label}</label>
      {children}
    </div>
  );
}
