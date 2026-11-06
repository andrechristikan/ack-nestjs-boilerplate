import { HealthIndicatorService } from '@nestjs/terminus';
import { mock } from 'vitest-mock-extended';
import type { MockProxy } from 'vitest-mock-extended';
import { buildConfigService } from '@test/unit/helpers/test.unit.config.helper';
import { createHealthJwksIndicator } from '@test/unit/helpers/test.unit.health.helper';
import { EnumHealthIndicatorKey } from '@modules/health/enums/health.enum';

describe('HealthJwksIndicator', () => {
    const healthIndicatorService: MockProxy<HealthIndicatorService> =
        mock<HealthIndicatorService>();
    const session = { up: vi.fn(), down: vi.fn() };
    const fetchMock = vi.fn<typeof fetch>();
    const jwksTimeoutInMs = 3000;
    const accessUri = 'https://issuer.example/access/jwks';
    const refreshUri = 'https://issuer.example/refresh/jwks';
    const jwksResponse = Response.json({ keys: [{ kid: 'key-1' }] });

    beforeEach(() => {
        vi.resetAllMocks();
        vi.stubGlobal('fetch', fetchMock);

        healthIndicatorService.check.mockReturnValue(session as never);
        fetchMock.mockResolvedValue(jwksResponse.clone());
    });

    afterEach(() => {
        vi.unstubAllGlobals();
    });

    describe('isHealthyAccessToken', () => {
        it('reports up when the access-token JWKS endpoint answers with a key set', async () => {
            const configService = buildConfigService({
                'auth.jwt.accessToken.jwksUri': accessUri,
                'health.jwksTimeoutInMs': jwksTimeoutInMs,
            });
            const indicator = await createHealthJwksIndicator(
                configService,
                healthIndicatorService
            );
            session.up.mockReturnValue({
                jwksAccessToken: { status: 'up' },
            });

            const result = await indicator.isHealthyAccessToken(
                EnumHealthIndicatorKey.jwksAccessToken
            );

            expect(result).toEqual({ jwksAccessToken: { status: 'up' } });
            expect(configService.get).toHaveBeenCalledWith(
                'auth.jwt.accessToken.jwksUri'
            );
            expect(configService.get).toHaveBeenCalledWith(
                'health.jwksTimeoutInMs'
            );
            expect(fetchMock).toHaveBeenCalledWith(accessUri, {
                signal: expect.any(AbortSignal),
            });
        });

        it('reports down when the access-token JWKS URI is not configured', async () => {
            const configService = buildConfigService({
                'health.jwksTimeoutInMs': jwksTimeoutInMs,
            });
            const indicator = await createHealthJwksIndicator(
                configService,
                healthIndicatorService
            );
            session.down.mockReturnValue({
                jwksAccessToken: { status: 'down' },
            });

            const result = await indicator.isHealthyAccessToken(
                EnumHealthIndicatorKey.jwksAccessToken
            );

            expect(result).toEqual({ jwksAccessToken: { status: 'down' } });
            expect(session.down).toHaveBeenCalledWith(
                'JWKS URI is not configured'
            );
            expect(fetchMock).not.toHaveBeenCalled();
        });
    });

    describe('isHealthyRefreshToken', () => {
        it('reports up when the refresh-token JWKS endpoint answers with a key set', async () => {
            const configService = buildConfigService({
                'auth.jwt.refreshToken.jwksUri': refreshUri,
                'health.jwksTimeoutInMs': jwksTimeoutInMs,
            });
            const indicator = await createHealthJwksIndicator(
                configService,
                healthIndicatorService
            );
            session.up.mockReturnValue({
                jwksRefreshToken: { status: 'up' },
            });

            const result = await indicator.isHealthyRefreshToken(
                EnumHealthIndicatorKey.jwksRefreshToken
            );

            expect(result).toEqual({ jwksRefreshToken: { status: 'up' } });
            expect(configService.get).toHaveBeenCalledWith(
                'auth.jwt.refreshToken.jwksUri'
            );
            expect(fetchMock).toHaveBeenCalledWith(refreshUri, {
                signal: expect.any(AbortSignal),
            });
        });

        it('reports down when the refresh-token JWKS URI is not a valid URL', async () => {
            const configService = buildConfigService({
                'auth.jwt.refreshToken.jwksUri': 'not-a-valid-url',
                'health.jwksTimeoutInMs': jwksTimeoutInMs,
            });
            const indicator = await createHealthJwksIndicator(
                configService,
                healthIndicatorService
            );
            session.down.mockReturnValue({
                jwksRefreshToken: { status: 'down' },
            });

            const result = await indicator.isHealthyRefreshToken(
                EnumHealthIndicatorKey.jwksRefreshToken
            );

            expect(result).toEqual({ jwksRefreshToken: { status: 'down' } });
            expect(session.down).toHaveBeenCalledWith(
                'JWKS URI is not a valid URL'
            );
            expect(fetchMock).not.toHaveBeenCalled();
        });
    });

    describe('checkUri', () => {
        const configValues = { 'health.jwksTimeoutInMs': jwksTimeoutInMs };

        it('reports down when the URI is empty', async () => {
            const configService = buildConfigService(configValues);
            const indicator = await createHealthJwksIndicator(
                configService,
                healthIndicatorService
            );
            session.down.mockReturnValue({ jwks: { status: 'down' } });

            const result = await indicator['checkUri'](
                EnumHealthIndicatorKey.jwksAccessToken,
                undefined
            );

            expect(result).toEqual({ jwks: { status: 'down' } });
            expect(session.down).toHaveBeenCalledWith(
                'JWKS URI is not configured'
            );
        });

        it('reports down when the URI is not a valid URL', async () => {
            const configService = buildConfigService(configValues);
            const indicator = await createHealthJwksIndicator(
                configService,
                healthIndicatorService
            );
            session.down.mockReturnValue({ jwks: { status: 'down' } });

            const result = await indicator['checkUri'](
                EnumHealthIndicatorKey.jwksAccessToken,
                'not-a-url'
            );

            expect(result).toEqual({ jwks: { status: 'down' } });
            expect(session.down).toHaveBeenCalledWith(
                'JWKS URI is not a valid URL'
            );
        });

        it('reports up when the endpoint answers with a key set', async () => {
            const configService = buildConfigService(configValues);
            const indicator = await createHealthJwksIndicator(
                configService,
                healthIndicatorService
            );
            session.up.mockReturnValue({ jwks: { status: 'up' } });

            const result = await indicator['checkUri'](
                EnumHealthIndicatorKey.jwksAccessToken,
                accessUri
            );

            expect(result).toEqual({ jwks: { status: 'up' } });
            expect(session.up).toHaveBeenCalledWith();
        });

        it('reports down with a fixed message when the endpoint answers with an error status', async () => {
            const configService = buildConfigService(configValues);
            const indicator = await createHealthJwksIndicator(
                configService,
                healthIndicatorService
            );
            fetchMock.mockResolvedValue(new Response(null, { status: 503 }));
            session.down.mockReturnValue({ jwks: { status: 'down' } });

            const result = await indicator['checkUri'](
                EnumHealthIndicatorKey.jwksAccessToken,
                accessUri
            );

            expect(result).toEqual({ jwks: { status: 'down' } });
            expect(session.down).toHaveBeenCalledWith(
                'JWKS endpoint is unreachable'
            );
        });

        it('reports down with a fixed message when the response carries no key set', async () => {
            const configService = buildConfigService(configValues);
            const indicator = await createHealthJwksIndicator(
                configService,
                healthIndicatorService
            );
            fetchMock.mockResolvedValue(Response.json({ keys: 'none' }));
            session.down.mockReturnValue({ jwks: { status: 'down' } });

            const result = await indicator['checkUri'](
                EnumHealthIndicatorKey.jwksAccessToken,
                accessUri
            );

            expect(result).toEqual({ jwks: { status: 'down' } });
            expect(session.down).toHaveBeenCalledWith(
                'JWKS endpoint is unreachable'
            );
        });

        it('reports down with a fixed message when the fetch rejects', async () => {
            const configService = buildConfigService(configValues);
            const indicator = await createHealthJwksIndicator(
                configService,
                healthIndicatorService
            );
            fetchMock.mockRejectedValue(new Error('connect ECONNREFUSED'));
            session.down.mockReturnValue({ jwks: { status: 'down' } });

            const result = await indicator['checkUri'](
                EnumHealthIndicatorKey.jwksAccessToken,
                accessUri
            );

            expect(result).toEqual({ jwks: { status: 'down' } });
            expect(session.down).toHaveBeenCalledWith(
                'JWKS endpoint is unreachable'
            );
        });
    });
});
