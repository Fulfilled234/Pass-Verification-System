const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

async function parseResponse(res) {
  const data = await res.json();
  return { status: res.status, data };
}

export async function createPass({ guest_name, host_reference, valid_date }) {
  const res = await fetch(`${API_BASE_URL}/passes`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ guest_name, host_reference, valid_date }),
  });
  return parseResponse(res);
}

export async function verifyPass(code) {
  const res = await fetch(`${API_BASE_URL}/passes/verify`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ code }),
  });
  return parseResponse(res);
}
