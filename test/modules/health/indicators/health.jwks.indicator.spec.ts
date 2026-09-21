import { ConfigService } from '@nestjs/config';

import { HealthJwksIndicator } from '@modules/health/indicators/health.jwks.indicator';
import { createHealthIndicatorHarness } from '@test/modules/health/indicators/health.indicator.spec-helper';

describe('HealthJwksIndicator', () => {
    const get = vi.fn();
    const config = { get } as unknown as ConfigService;

    beforeEach(() => vi.resetAllMocks());

    it('reports both configured token URIs up with exact keys', async () => {
        const { health, up } = createHealthIndicatorHarness();
        const indicator = new HealthJwksIndicator(config, health);
        get.mockReturnValue('https://example.com/.well-known/jwks.json');
        await expect(indicator.isHealthyAccessToken('access')).resolves.toBe(
            up
        );
        await expect(indicator.isHealthyRefreshToken('refresh')).resolves.toBe(
            up
        );
        expect(health.check).toHaveBeenNthCalledWith(1, 'access');
        expect(health.check).toHaveBeenNthCalledWith(2, 'refresh');
    });

    it('reports a missing URI down', async () => {
        const { health, session, down } = createHealthIndicatorHarness();
        const indicator = new HealthJwksIndicator(config, health);
        get.mockReturnValue(undefined);
        await expect(indicator.isHealthyAccessToken('access')).resolves.toBe(
            down
        );
        expect(session.down).toHaveBeenCalledWith('JWKS URI is not configured');
    });

    it('reports an invalid URI down', async () => {
        const { health, session, down } = createHealthIndicatorHarness();
        const indicator = new HealthJwksIndicator(config, health);
        get.mockReturnValue('not a url');
        await expect(indicator.isHealthyRefreshToken('refresh')).resolves.toBe(
            down
        );
        expect(session.down).toHaveBeenCalledWith(
            'JWKS URI is not a valid URL'
        );
    });

    it.each([
        [new Error('failure'), 'failure'],
        ['failure', 'Unknown error'],
    ])('maps unexpected URI errors', async (error, message) => {
        const { health, session, down } = createHealthIndicatorHarness();
        const indicator = new HealthJwksIndicator(config, health);
        const url = vi.fn(function () {
            throw error;
        });
        const originalUrl = URL;
        get.mockReturnValue('https://example.com');
        vi.stubGlobal('URL', url);
        try {
            await expect(
                indicator.isHealthyAccessToken('access')
            ).resolves.toBe(down);
            expect(url).toHaveBeenCalledWith('https://example.com');
            expect(session.down).toHaveBeenCalledWith(
                `HealthJwksIndicator Failed - ${message}`
            );
        } finally {
            vi.stubGlobal('URL', originalUrl);
        }
    });
});
