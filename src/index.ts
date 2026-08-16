import { GovpExchangeClient, type ConnectorPlatform, type IssuanceInput } from '@gemacode/govp-connector-kit';

export type ConformanceCheck = { name: string; passed: boolean; detail: string };
export type ConformanceReport = {
  contract: 'org.govp.exchange/1'; connectorId: string; platform: ConnectorPlatform;
  startedAt: string; completedAt: string; passed: boolean; checks: ConformanceCheck[];
  notice: 'technical-contract-conformance-not-legal-certification';
};

export async function runConnectorConformance(options: {
  baseUrl: string; token: string; fetch?: typeof globalThis.fetch; externalId?: string;
}): Promise<ConformanceReport> {
  const startedAt = new Date().toISOString();
  const client = new GovpExchangeClient({ ...options, retries: 2, retryBaseMs: 5 });
  const identity = await client.inspectConnector();
  const externalId = options.externalId ?? `CONFORMANCE-${crypto.randomUUID()}`;
  const input: IssuanceInput = {
    issuer: { name: 'Emisor ficticio de conformidad' }, recipient: { name: 'Receptor ficticio de conformidad' },
    subject: { type: 'shipment', id: externalId, name: 'Expedición ficticia de conformidad' },
    requirement: 'Demostrar la expedición ficticia antes de aceptar la recepción.',
    evidence: [{ label: 'Huella ficticia de conformidad', sha256: 'c'.repeat(64) }],
    validUntil: new Date(Date.now() + 86_400_000).toISOString(),
    source: { platform: identity.connector.platform, externalId },
  };
  const key = `conformance:${externalId}`;
  const first = await client.issue(input, key);
  const replay = await client.issue(input, key);
  const before = await client.verify(first.govp.code);
  await client.revoke(first.govp.code, 'Fin de prueba técnica de conformidad.');
  const after = await client.verify(first.govp.code);
  const checks: ConformanceCheck[] = [
    { name: 'connector_identity', passed: identity.connector.status === undefined || identity.connector.status === 'active', detail: identity.connector.id },
    { name: 'new_issuance', passed: first.replayed === false, detail: first.govp.code },
    { name: 'idempotent_replay', passed: replay.replayed === true && replay.govp.code === first.govp.code, detail: replay.govp.code },
    { name: 'public_verification', passed: before.verification.status === 'valid' && before.verification.integrityValid, detail: before.verification.reasonCode },
    { name: 'revocation_publication', passed: after.verification.status === 'revoked' && after.verification.integrityValid, detail: after.verification.reasonCode },
  ];
  return { contract: 'org.govp.exchange/1', connectorId: identity.connector.id, platform: identity.connector.platform, startedAt, completedAt: new Date().toISOString(), passed: checks.every((check) => check.passed), checks, notice: 'technical-contract-conformance-not-legal-certification' };
}
