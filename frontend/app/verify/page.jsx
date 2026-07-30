'use client';

import { useState } from 'react';
import { TopBar } from '@/components/TopBar';
import {
  IconAlertCircle,
  IconCheckCircle,
  IconScan,
  IconSpinner,
} from '@/components/icons';
import { verifyPass } from '@/lib/api';

const READOUT_COPY = {
  VERIFIED: { label: 'Verified', tone: 'readout-verified', icon: IconCheckCircle },
  ALREADY_USED: { label: 'Already used', tone: 'readout-blocked', icon: IconAlertCircle },
  EXPIRED: { label: 'Expired', tone: 'readout-blocked', icon: IconAlertCircle },
  NOT_FOUND: { label: 'Code not found', tone: 'readout-blocked', icon: IconAlertCircle },
};

function classifyResponse(httpStatus, body) {
  if (httpStatus === 200) return 'VERIFIED';
  if (httpStatus === 404) return 'NOT_FOUND';
  if (httpStatus === 409 && /expired/i.test(body.error || '')) return 'EXPIRED';
  if (httpStatus === 409) return 'ALREADY_USED';
  return null;
}

export default function VerifyPassPage() {
  const [code, setCode] = useState('');
  const [checking, setChecking] = useState(false);
  const [networkError, setNetworkError] = useState(null);
  const [outcome, setOutcome] = useState(null);

  async function handleSubmit(event) {
    event.preventDefault();
    if (!code.trim()) return;

    setChecking(true);
    setNetworkError(null);

    try {
      const { status, data } = await verifyPass(code.trim());
      const kind = classifyResponse(status, data);

      if (!kind) {
        setNetworkError(data.error || 'Unexpected response from the API.');
        setOutcome(null);
      } else {
        setOutcome({ kind, pass: data.pass });
      }
    } catch {
      setNetworkError('Could not reach the API. Check that the backend is running.');
      setOutcome(null);
    } finally {
      setChecking(false);
    }
  }

  const readout = outcome ? READOUT_COPY[outcome.kind] : null;
  const Icon = readout ? readout.icon : IconScan;

  return (
    <div className="shell">
      <TopBar />

      <div className="page-head">
        <p className="eyebrow">Verify pass</p>
        <h1>Check a pass at entry</h1>
        <p>Enter the code from the guest&apos;s pass to mark it used.</p>
      </div>

      <div className="console" style={{ maxWidth: 520 }}>
        <form className="console-input" onSubmit={handleSubmit}>
          <input
            type="text"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            placeholder="ENTRY CODE"
            autoComplete="off"
            autoCapitalize="characters"
          />
          <button type="submit" disabled={checking || !code.trim()}>
            {checking ? <IconSpinner width={16} height={16} className="spin" /> : <IconScan width={16} height={16} />}
            Check
          </button>
        </form>

        <div className="readout">
          {networkError && (
            <div className="error-banner" style={{ width: '100%' }}>
              <IconAlertCircle width={16} height={16} />
              <span>{networkError}</span>
            </div>
          )}

          {!networkError && !outcome && (
            <div className="readout-idle">
              <IconScan width={28} height={28} />
              <p>Awaiting a code.</p>
            </div>
          )}

          {!networkError && outcome && (
            <>
              <div className={`readout-status ${readout.tone}`}>
                <Icon width={20} height={20} />
                {readout.label}
              </div>
              {outcome.pass && (
                <>
                  <div className="readout-guest">{outcome.pass.guest_name}</div>
                  <div className="readout-detail">
                    Host / reference: {outcome.pass.host_reference}
                  </div>
                  <div className="readout-detail">Code: {outcome.pass.code}</div>
                </>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
