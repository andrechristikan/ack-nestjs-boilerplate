import { mock } from 'vitest-mock-extended';
import type { MockProxy } from 'vitest-mock-extended';
import type { NextFunction, Response } from 'express';
import { RequestStoreService } from '@common/request/services/request.store.service';
import { RequestVersionStoreKey } from '@common/request/constants/request.constant';
import type { IRequestApp } from '@common/request/interfaces/request.interface';
import { createRequestUrlVersionMiddleware } from '@test/unit/helpers/test.unit.request.helper';

describe('RequestUrlVersionMiddleware', () => {
    const requestStoreService: MockProxy<RequestStoreService> =
        mock<RequestStoreService>();

    let res: Response;
    let next: NextFunction;

    beforeEach(() => {
        vi.resetAllMocks();

        res = {} as Response;
        next = vi.fn();
    });

    describe('use', () => {
        it('extracts the version segment from the URL when versioning is enabled and the prefix matches', async () => {
            const middleware = await createRequestUrlVersionMiddleware(
                true,
                requestStoreService
            );
            const req = {
                originalUrl: '/api/v2/users',
            } as unknown as IRequestApp;

            await middleware.use(req, res, next);

            expect(requestStoreService.set).toHaveBeenCalledWith(
                RequestVersionStoreKey,
                '2'
            );
            expect(next).toHaveBeenCalledTimes(1);
        });

        it('defaults to the configured version when versioning is disabled', async () => {
            const middleware = await createRequestUrlVersionMiddleware(
                false,
                requestStoreService
            );
            const req = {
                originalUrl: '/api/v2/users',
            } as unknown as IRequestApp;

            await middleware.use(req, res, next);

            expect(requestStoreService.set).toHaveBeenCalledWith(
                RequestVersionStoreKey,
                '1'
            );
        });

        it('defaults to the configured version when the URL does not carry the version prefix', async () => {
            const middleware = await createRequestUrlVersionMiddleware(
                true,
                requestStoreService
            );
            const req = {
                originalUrl: '/api/users',
            } as unknown as IRequestApp;

            await middleware.use(req, res, next);

            expect(requestStoreService.set).toHaveBeenCalledWith(
                RequestVersionStoreKey,
                '1'
            );
        });
    });
});
