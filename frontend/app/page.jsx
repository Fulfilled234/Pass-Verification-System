'use client';

import { useState } from 'react';
import { TopBar } from '@/components/TopBar';
import { IconAlertCircle, IconBadge, IconSpinner } from '@/components/icons';
import { createPass } from '@/lib/api';

function todayIsoDate() {
  return new Date().toISOString().slice(0, 10);
}

function formatDate(value) {
  return new Date(value).toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

export default function CreatePassPage() {
  const [guestName, setGuestName] = useState('');
  const [hostReference, setHostReference] = useState('');
  const [validDate, setValidDate] = useState(todayIsoDate());
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [pass, setPass] = useState(null);

  async function handleSubmit(event) {
    event.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      const { status, data } = await createPass({
        guest_name: guestName,
        host_reference: hostReference,
        valid_date: validDate,
      });

      if (status === 201) {
        setPass(data);
        setGuestName('');
        setHostReference('');
      } else {
        setError(data.error || 'Could not create the pass.');
      }
    } catch {
      setError('Could not reach the API. Check that the backend is running.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="shell">
      <TopBar />

      <div className="page-head">
        <p className="eyebrow">Issue pass</p>
        <h1>Generate an entry pass</h1>
        <p>Create a pass for a guest. The code below is what the verifier will check at entry.</p>
      </div>

      <div className="grid-two">
        <div className="panel">
          {error && (
            <div className="error-banner">
              <IconAlertCircle width={16} height={16} />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <div className="field">
              <label htmlFor="guest_name">Guest name</label>
              <input
                id="guest_name"
                type="text"
                required
                value={guestName}
                onChange={(e) => setGuestName(e.target.value)}
                placeholder="Guest full name"
              />
            </div>

            <div className="field">
              <label htmlFor="host_reference">Host / reference</label>
              <input
                id="host_reference"
                type="text"
                required
                value={hostReference}
                onChange={(e) => setHostReference(e.target.value)}
                placeholder="Who invited this guest"
              />
              <p className="field-hint">Shown to the verifier alongside the pass.</p>
            </div>

            <div className="field">
              <label htmlFor="valid_date">Valid date</label>
              <input
                id="valid_date"
                type="date"
                required
                value={validDate}
                onChange={(e) => setValidDate(e.target.value)}
              />
              <p className="field-hint">The pass expires automatically after this date.</p>
            </div>

            <button className="btn-primary" type="submit" disabled={submitting}>
              {submitting ? (
                <>
                  <IconSpinner width={16} height={16} className="spin" />
                  Generating...
                </>
              ) : (
                'Generate pass'
              )}
            </button>
          </form>
        </div>

        <div className="stub">
          {pass ? (
            <>
              <div className="stub-head">
                <span>Entry pass</span>
                <span className="badge badge-pending">{pass.status}</span>
              </div>
              <div className="stub-body">
                <dl className="stub-row">
                  <dt>Guest</dt>
                  <dd>{pass.guest_name}</dd>
                </dl>
                <dl className="stub-row">
                  <dt>Host / reference</dt>
                  <dd>{pass.host_reference}</dd>
                </dl>
                <dl className="stub-row">
                  <dt>Valid date</dt>
                  <dd>{formatDate(pass.valid_date)}</dd>
                </dl>
              </div>
              <div className="stub-tear" />
              <div className="stub-code">
                <span className="code-label">Entry code</span>
                <span className="code-value">{pass.code}</span>
              </div>
            </>
          ) : (
            <div className="stub-empty">
              <IconBadge width={22} height={22} />
              <p>The generated pass will appear here.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
