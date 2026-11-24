import { HealthIndicatorService } from '@nestjs/terminus';
import {
    HttpClient,
    HttpNetworkError,
    HttpResponseError,
} from '@nestjs/http-client';
import { mock } from 'vitest-mock-extended';
import type { MockProxy } from 'vitest-mock-extended';
import { buildConfigService } from '@test/unit/helpers/test.unit.config.helper';
import { createHealthJwksIndicator } from '@test/unit/helpers/test.unit.health.helper';
import { EnumHealthIndicatorKey } from '@modules/health/enums/health.enum';

describe('HealthJwksIndicator', () => {
    const healthIndicatorService: MockProxy<HealthIndicatorService> =
        mock<HealthIndicatorService>();
    const session = { up: vi.fn(), down: vi.fn() };
    const httpClient: MockProxy<HttpClient> = mock<HttpClient>();
    const accessUri = 'https://issuer.example/access/jwks';
    const refreshUri = 'https://issuer.example/refresh/jwks';
    const jwksResponse = { data: { keys: [{ kid: 'key-1' }] } };

    beforeEach(() => {
        healthIndicatorService.check.mockReturnValue(session as never);
        httpClient.get.mockResolvedValue(jwksResponse as never);
    });

    describe('isHealthyAccessToken', () => {
        it('reports up when the access-token JWKS endpoint answers with a key set', async () => {
            const configService = buildConfigService({
                'auth.jwt.accessToken.jwksUri': accessUri,
            });
            const indicator = await createHealthJwksIndicator(
                configService,
                healthIndicatorService,
                httpClient
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
            expect(httpClient.get).toHaveBeenCalledWith(accessUri);
        });
    });

    describe('isHealthyRefreshToken', () => {
        it('reports up when the refresh-token JWKS endpoint answers with a key set', async () => {
            const configService = buildConfigService({
                'auth.jwt.refreshToken.jwksUri': refreshUri,
            });
            const indicator = await createHealthJwksIndicator(
                configService,
                healthIndicatorService,
                httpClient
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
            expect(httpClient.get).toHaveBeenCalledWith(refreshUri);
        });
    });

    describe('checkUri', () => {
        const configValues = {};

        it('reports up when the endpoint answers with a key set', async () => {
            const configService = buildConfigService(configValues);
            const indicator = await createHealthJwksIndicator(
                configService,
                healthIndicatorService,
                httpClient
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
                healthIndicatorService,
                httpClient
            );
            httpClient.get.mockRejectedValue(
                new HttpResponseError({
                    method: 'GET',
                    url: accessUri,
                    status: 503,
                })
            );
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
                healthIndicatorService,
                httpClient
            );
            httpClient.get.mockResolvedValue({
                data: { keys: 'none' },
            } as never);
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

        it('reports down with a fixed message when the endpoint answers with a redirect', async () => {
            const configService = buildConfigService(configValues);
            const indicator = await createHealthJwksIndicator(
                configService,
                healthIndicatorService,
                httpClient
            );
            httpClient.get.mockRejectedValue(
                new HttpNetworkError({
                    method: 'GET',
                    url: accessUri,
                    cause: new TypeError('redirect mode is set to error'),
                })
            );
            session.down.mockReturnValue({ jwks: { status: 'down' } });

            const result = await indicator['checkUri'](
                EnumHealthIndicatorKey.jwksAccessToken,
                accessUri
            );

            expect(result).toEqual({ jwks: { status: 'down' } });
            expect(httpClient.get).toHaveBeenCalledWith(accessUri);
            expect(session.down).toHaveBeenCalledWith(
                'JWKS endpoint is unreachable'
            );
        });

        it('reports down with a fixed message when the request rejects', async () => {
            const configService = buildConfigService(configValues);
            const indicator = await createHealthJwksIndicator(
                configService,
                healthIndicatorService,
                httpClient
            );
            httpClient.get.mockRejectedValue(new Error('connect ECONNREFUSED'));
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
