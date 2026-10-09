import { Test } from '@nestjs/testing';
import type { TestingModule } from '@nestjs/testing';
import type { NextFunction, Response } from 'express';
import { v7 as uuid } from 'uuid';
import { mock } from 'vitest-mock-extended';
import type { MockProxy } from 'vitest-mock-extended';
import {
    RequestCorrelationIdHeaderName,
    RequestCorrelationIdStoreKey,
    RequestIdHeaderName,
    RequestIdStoreKey,
} from '@common/request/constants/request.constant';
import type { IRequestApp } from '@common/request/interfaces/request.interface';
import { RequestRequestIdMiddleware } from '@common/request/middlewares/request.request-id.middleware';
import { RequestStoreService } from '@common/request/services/request.store.service';

vi.mock('uuid', () => ({
    v7: vi.fn(),
}));

describe('RequestRequestIdMiddleware', () => {
    const requestStoreService: MockProxy<RequestStoreService> =
        mock<RequestStoreService>();
    const invalidInboundIds: Array<string | string[]> = [
        '',
        'a'.repeat(129),
        'bad value',
        'x\ny',
        ['a', 'b'],
    ];

    let middleware: RequestRequestIdMiddleware;
    let res: Response;
    let next: NextFunction;

    beforeEach(async () => {
        vi.resetAllMocks();
        (uuid as ReturnType<typeof vi.fn>)
            .mockReturnValueOnce('id-1')
            .mockReturnValueOnce('id-2');

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
        it('assigns a request id and a correlation id when no header is present', () => {
            const req = { headers: {} } as unknown as IRequestApp;

            middleware.use(req, res, next);

            expect(req.id).toBe('id-1');
            expect(req.headers[RequestIdHeaderName]).toBe('id-1');
            expect(req.correlationId).toBe('id-2');
            expect(req.headers[RequestCorrelationIdHeaderName]).toBe('id-2');
            expect(requestStoreService.set).toHaveBeenCalledWith(
                RequestIdStoreKey,
                'id-1'
            );
            expect(requestStoreService.set).toHaveBeenCalledWith(
                RequestCorrelationIdStoreKey,
                'id-2'
            );
            expect(next).toHaveBeenCalledTimes(1);
        });

        it('writes both store keys before calling next', () => {
            const req = { headers: {} } as unknown as IRequestApp;
            const order: string[] = [];
            requestStoreService.set.mockImplementation(key => {
                order.push(String(key));
            });
            (next as ReturnType<typeof vi.fn>).mockImplementation(() => {
                order.push('next');
            });

            middleware.use(req, res, next);

            expect(order).toEqual([
                RequestIdStoreKey,
                RequestCorrelationIdStoreKey,
                'next',
            ]);
        });

        it('keeps a valid inbound request id', () => {
            const req = {
                headers: { [RequestIdHeaderName]: 'client.ID_1-2' },
            } as unknown as IRequestApp;

            middleware.use(req, res, next);

            expect(req.id).toBe('client.ID_1-2');
            expect(req.headers[RequestIdHeaderName]).toBe('client.ID_1-2');
            expect(requestStoreService.set).toHaveBeenCalledWith(
                RequestIdStoreKey,
                'client.ID_1-2'
            );
            expect(uuid).toHaveBeenCalledTimes(1);
            expect(next).toHaveBeenCalledTimes(1);
        });

        it('keeps an inbound request id of 128 characters', () => {
            const requestId = 'a'.repeat(128);
            const req = {
                headers: { [RequestIdHeaderName]: requestId },
            } as unknown as IRequestApp;

            middleware.use(req, res, next);

            expect(req.id).toBe(requestId);
            expect(uuid).toHaveBeenCalledTimes(1);
            expect(next).toHaveBeenCalledTimes(1);
        });

        it.each(invalidInboundIds)(
            'replaces the invalid inbound request id %j',
            inbound => {
                const req = {
                    headers: { [RequestIdHeaderName]: inbound },
                } as unknown as IRequestApp;

                middleware.use(req, res, next);

                expect(req.id).toBe('id-1');
                expect(req.headers[RequestIdHeaderName]).toBe('id-1');
                expect(requestStoreService.set).toHaveBeenCalledWith(
                    RequestIdStoreKey,
                    'id-1'
                );
                expect(next).toHaveBeenCalledTimes(1);
            }
        );

        it('keeps a valid inbound correlation id', () => {
            const req = {
                headers: { [RequestCorrelationIdHeaderName]: 'abc.DEF_1-2' },
            } as unknown as IRequestApp;

            middleware.use(req, res, next);

            expect(req.correlationId).toBe('abc.DEF_1-2');
            expect(req.headers[RequestCorrelationIdHeaderName]).toBe(
                'abc.DEF_1-2'
            );
            expect(requestStoreService.set).toHaveBeenCalledWith(
                RequestCorrelationIdStoreKey,
                'abc.DEF_1-2'
            );
            expect(uuid).toHaveBeenCalledTimes(1);
            expect(next).toHaveBeenCalledTimes(1);
        });

        it('keeps an inbound correlation id of 128 characters', () => {
            const correlationId = 'a'.repeat(128);
            const req = {
                headers: { [RequestCorrelationIdHeaderName]: correlationId },
            } as unknown as IRequestApp;

            middleware.use(req, res, next);

            expect(req.correlationId).toBe(correlationId);
            expect(uuid).toHaveBeenCalledTimes(1);
            expect(next).toHaveBeenCalledTimes(1);
        });

        it.each(invalidInboundIds)(
            'replaces the invalid inbound correlation id %j',
            inbound => {
                const req = {
                    headers: { [RequestCorrelationIdHeaderName]: inbound },
                } as unknown as IRequestApp;

                middleware.use(req, res, next);

                expect(req.correlationId).toBe('id-2');
                expect(req.headers[RequestCorrelationIdHeaderName]).toBe(
                    'id-2'
                );
                expect(requestStoreService.set).toHaveBeenCalledWith(
                    RequestCorrelationIdStoreKey,
                    'id-2'
                );
                expect(next).toHaveBeenCalledTimes(1);
            }
        );
    });
});
