import { createMock } from '@golevelup/ts-vitest';
import { Test, type TestingModule } from '@nestjs/testing';
import type { Response } from 'express';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
    RequestCorrelationIdStoreKey,
    RequestIdStoreKey,
} from '@common/request/constants/request.constant';
import type { IRequestApp } from '@common/request/interfaces/request.interface';
import { RequestRequestIdMiddleware } from '@common/request/middlewares/request.request-id.middleware';
import { RequestStoreService } from '@common/request/services/request.store.service';

const uuidState = vi.hoisted(() => ({ values: [] as string[] }));

vi.mock(import('uuid'), () => ({
    v7: () => uuidState.values.shift() ?? 'generated-request-id',
}));

describe('RequestRequestIdMiddleware', () => {
    const requestStoreService: Pick<RequestStoreService, 'set'> = {
        set: vi.fn(),
    };
    const requestStoreSet = vi.mocked(requestStoreService.set);
    const next = vi.fn<() => void>();
    let middleware: RequestRequestIdMiddleware;

    beforeEach(async () => {
        vi.resetAllMocks();
        uuidState.values = ['generated-request-id'];
        const moduleRef: TestingModule = await Test.createTestingModule({
            providers: [
                RequestRequestIdMiddleware,
                { provide: RequestStoreService, useValue: requestStoreService },
            ],
        }).compile();
        middleware = moduleRef.get(RequestRequestIdMiddleware);
    });

    it('generates a request id and preserves an incoming correlation id', () => {
        const request = createMock<IRequestApp>({
            headers: { 'x-correlation-id': 'incoming-correlation-id' },
        });

        middleware.use(request, createMock<Response>(), next);

        expect(request.id).toBe('generated-request-id');
        expect(request.correlationId).toBe('incoming-correlation-id');
        expect(requestStoreSet).toHaveBeenCalledWith(
            RequestIdStoreKey,
            'generated-request-id'
        );
        expect(requestStoreSet).toHaveBeenCalledWith(
            RequestCorrelationIdStoreKey,
            'incoming-correlation-id'
        );
        expect(next).toHaveBeenCalledTimes(1);
    });

    it('generates a correlation id when the incoming header is absent', () => {
        uuidState.values = ['generated-request-id', 'generated-correlation-id'];
        const request = createMock<IRequestApp>({ headers: {} });

        middleware.use(request, createMock<Response>(), next);

        expect(request.correlationId).toBe('generated-correlation-id');
        expect(request.headers['x-correlation-id']).toBe(
            'generated-correlation-id'
        );
    });
});
