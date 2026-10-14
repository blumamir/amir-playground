const SEQUENCE_IP = process.env.SEQUENCE_SERVICE_IP || "10.0.1.200";
const SEQUENCE_PORT = Number(process.env.SEQUENCE_SERVICE_PORT || 8082);
const TRIGGER_IP = process.env.TRIGGER_SERVICE_IP || "10.0.1.200";
const TRIGGER_PORT = Number(process.env.TRIGGER_SERVICE_PORT || 8083);

export function serviceConfig() {
  return {
    sequence: `${SEQUENCE_IP}:${SEQUENCE_PORT}`,
    trigger: `${TRIGGER_IP}:${TRIGGER_PORT}`,
  };
}

async function httpJson(method, url, body) {
  let res;
  try {
    res = await fetch(url, {
      method,
      headers: body ? { "Content-Type": "application/json" } : undefined,
      body: body ? JSON.stringify(body) : undefined,
      signal: AbortSignal.timeout(10_000),
    });
  } catch (err) {
    const cause = err.cause?.code || err.cause?.message || err.message;
    throw new Error(`${method} ${url} failed (${cause})`);
  }
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`${method} ${url} -> ${res.status} ${text}`);
  }
  return res.status;
}

/**
 * PUT sequence then POST trigger.
 * @param {object} sequence SequencePerThing
 * @param {string} [triggerName="amir-playground"]
 */
export async function sendAndTrigger(sequence, triggerName = "amir-playground-v2") {
  const seqUrl = `http://${SEQUENCE_IP}:${SEQUENCE_PORT}/triggers/${triggerName}`;
  const trigUrl = `http://${TRIGGER_IP}:${TRIGGER_PORT}/trigger/${triggerName}`;

  const putStatus = await httpJson("PUT", seqUrl, sequence);
  const postStatus = await httpJson("POST", trigUrl, { start_offset_ms: 0 });

  return { putStatus, postStatus, triggerName, ...serviceConfig() };
}
