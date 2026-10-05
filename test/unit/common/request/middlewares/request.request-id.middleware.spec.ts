import { Test } from '@nestjs/testing';
import type { TestingModule } from '@nestjs/testing';
import { mock } from 'vitest-mock-extended';
import type { MockProxy } from 'vitest-mock-extended';
import type { NextFunction, Response } from 'express';
import { v7 as uuid } from 'uuid';
import {
    RequestCorrelationIdHeaderName,
    RequestCorrelationIdStoreKey,
    RequestIdHeaderName,
    RequestIdStoreKey,
} from '@common/request/constants/request.constant';
import { RequestStoreService } from '@common/request/services/request.store.service';
import type { IRequestApp } from '@common/request/interfaces/request.interface';
import { RequestRequestIdMiddleware } from '@common/request/middlewares/request.request-id.middleware';

vi.mock('uuid', () => ({
    v7: vi.fn(),
}));

describe('RequestRequestIdMiddleware', () => {
    const requestStoreService: MockProxy<RequestStoreService> =
        mock<RequestStoreService>();

    let middleware: RequestRequestIdMiddleware;
    let res: Response;
    let next: NextFunction;

    beforeEach(async () => {
        vi.resetAllMocks();

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                RequestRequestIdMiddleware,
                {
                    provide: RequestStoreService,
                    useValue: requestStoreService,
                },
            ],
        }).compile();

        middleware = module.get(RequestRequestIdMiddleware);

        res = {} as Response;
        next = vi.fn();
    });

    describe('use', () => {
        it('assigns a fresh request id and generates a correlation id when none is present', () => {
            (uuid as ReturnType<typeof vi.fn>)
                .mockReturnValueOnce('req-id-1')
                .mockReturnValueOnce('corr-id-1');
            const req = { headers: {} } as unknown as IRequestApp;

            middleware.use(req, res, next);

            expect(req.id).toBe('req-id-1');
            expect(req.headers[RequestIdHeaderName]).toBe('req-id-1');
            expect(req.correlationId).toBe('corr-id-1');
            expect(req.headers[RequestCorrelationIdHeaderName]).toBe(
                'corr-id-1'
            );
            expect(requestStoreService.set).toHaveBeenCalledWith(
                RequestIdStoreKey,
                'req-id-1'
            );
            expect(requestStoreService.set).toHaveBeenCalledWith(
                RequestCorrelationIdStoreKey,
                'corr-id-1'
            );
            expect(next).toHaveBeenCalledTimes(1);
        });

        it('reuses an existing string correlation id header', () => {
            (uuid as ReturnType<typeof vi.fn>).mockReturnValueOnce('req-id-2');
            const req = {
                headers: {
                    [RequestCorrelationIdHeaderName]: 'existing-corr-id',
                },
            } as unknown as IRequestApp;

            middleware.use(req, res, next);

            expect(req.correlationId).toBe('existing-corr-id');
            expect(req.headers[RequestCorrelationIdHeaderName]).toBe(
                'existing-corr-id'
            );
            expect(uuid).toHaveBeenCalledTimes(1);
        });

        it('generates a new correlation id when the header is not a string', () => {
            (uuid as ReturnType<typeof vi.fn>)
                .mockReturnValueOnce('req-id-3')
                .mockReturnValueOnce('corr-id-3');
            const req = {
                headers: { [RequestCorrelationIdHeaderName]: ['a', 'b'] },
            } as unknown as IRequestApp;

            middleware.use(req, res, next);

            expect(req.correlationId).toBe('corr-id-3');
            expect(req.headers[RequestCorrelationIdHeaderName]).toBe(
                'corr-id-3'
            );
        });
    });
});
