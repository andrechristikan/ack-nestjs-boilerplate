import { createMock } from '@golevelup/ts-vitest';
import { ConfigService } from '@nestjs/config';
import { Test, type TestingModule } from '@nestjs/testing';
import type { CorsOptions } from 'cors';
import type { Request, Response } from 'express';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { RequestCorsMiddleware } from '@common/request/middlewares/request.cors.middleware';

const corsMocks = vi.hoisted(() => ({
    factory: vi.fn(),
}));

vi.mock(import('cors'), () => ({
    default: corsMocks.factory,
}));

describe('RequestCorsMiddleware', () => {
    const configService: Pick<ConfigService, 'get'> = { get: vi.fn() };
    const configGet = vi.mocked(configService.get);
    let capturedOptions: CorsOptions;

    async function createMiddleware(
        allowedOrigin: string | boolean | string[]
    ) {
        configGet.mockImplementation(key => {
            const values: Record<string, unknown> = {
                'request.cors.allowedOrigin': allowedOrigin,
                'request.cors.allowedMethod': ['GET', 'POST'],
                'request.cors.allowedHeader': ['content-type'],
                'request.cors.exposedHeader': ['x-request-id'],
            };
            return values[key];
        });
        const moduleRef: TestingModule = await Test.createTestingModule({
            providers: [
                RequestCorsMiddleware,
                { provide: ConfigService, useValue: configService },
            ],
        }).compile();
        return moduleRef.get(RequestCorsMiddleware);
    }

    beforeEach(() => {
        vi.resetAllMocks();
        corsMocks.factory.mockImplementation(options => {
            capturedOptions = options ?? {};
            return vi.fn((_request, _response, next) => next());
        });
    });

    it('disables credentials for a wildcard origin', async () => {
        const middleware = await createMiddleware('*');

        middleware.use(createMock<Request>(), createMock<Response>(), vi.fn());

        expect(capturedOptions).toMatchObject({
            credentials: false,
            methods: ['GET', 'POST'],
            allowedHeaders: ['content-type'],
            exposedHeaders: ['x-request-id'],
            maxAge: 86400,
        });
        await expect(validateOrigin(undefined)).resolves.toBe(true);
        await expect(validateOrigin('https://any.example')).resolves.toBe(true);
    });

    it.each([
        ['https://api.example.com', true],
        ['https://other.example.com', false],
        ['https://api.example.com/path', false],
    ])('validates exact origin %s as %s', async (origin, allowed) => {
        const middleware = await createMiddleware('api.example.com');
        middleware.use(createMock<Request>(), createMock<Response>(), vi.fn());

        await expect(validateOrigin(origin)).resolves.toBe(allowed);
        expect(capturedOptions.credentials).toBe(true);
    });

    it.each([
        ['https://sub.example.com', true],
        ['https://example.com', true],
        ['https://example.net', false],
        ['https://sub.example.com:3000', false],
    ])('validates wildcard origin %s as %s', async (origin, allowed) => {
        const middleware = await createMiddleware(['*.example.com']);
        middleware.use(createMock<Request>(), createMock<Response>(), vi.fn());

        await expect(validateOrigin(origin)).resolves.toBe(allowed);
    });

    function validateOrigin(origin: string | undefined): Promise<boolean> {
        if (typeof capturedOptions.origin !== 'function') {
            throw new Error('CORS origin validator was not configured');
        }

        const originValidator = capturedOptions.origin;
        return new Promise((resolve, reject) => {
            originValidator(origin, (error: Error | null, allowed) => {
                if (error) reject(error);
                else resolve(Boolean(allowed));
            });
        });
    }
});
