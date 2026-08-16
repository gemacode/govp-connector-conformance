import { describe, expect, it } from 'vitest';
import { registerConnector } from '@gemacode/govp-connector-kit';
import { createExchangeSimulator } from '@gemacode/govp-connector-kit/simulator';
import { runConnectorConformance } from './index.js';

describe('runner independiente de conformidad', () => {
  it('completa el ciclo y etiqueta correctamente su alcance', async () => {
    const simulator = createExchangeSimulator();
    const registration = await registerConnector('http://localhost/api/exchange', { platform: 'odoo', label: 'Conector ficticio', siteUrl: 'https://conformance.invalid' }, simulator.fetch);
    const report = await runConnectorConformance({ baseUrl: 'http://localhost/api/exchange', token: registration.apiToken, fetch: simulator.fetch, externalId: 'RUN-001' });
    expect(report.passed).toBe(true);
    expect(report.checks).toHaveLength(5);
    expect(report.notice).toBe('technical-contract-conformance-not-legal-certification');
  });
});
