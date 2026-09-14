import { createMock } from '@golevelup/ts-vitest';
import { Test, type TestingModule } from '@nestjs/testing';
import type { Response } from 'express';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { RequestLogStoreKey } from '@common/request/constants/request.constant';
import type {
    IRequestApp,
    IRequestLog,
} from '@common/request/interfaces/request.interface';
import { RequestRequestLogMiddleware } from '@common/request/middlewares/request.request-log.middleware';
import { RequestStoreService } from '@common/request/services/request.store.service';
import { RequestUtil } from '@common/request/utils/request.util';

describe('RequestRequestLogMiddleware', () => {
    const requestStoreService: Pick<RequestStoreService, 'set'> = {
        set: vi.fn(),
    };
    const requestStoreSet = vi.mocked(requestStoreService.set);
    const requestUtil = {
        buildRequestLog: vi.fn<RequestUtil['buildRequestLog']>(),
    } satisfies Pick<RequestUtil, 'buildRequestLog'>;
    const next = vi.fn<() => void>();
    const request = createMock<IRequestApp>({ headers: {} });
    const requestLog: IRequestLog = {
        userAgent: {},
        ipAddress: '203.0.113.10',
        geoLocation: null,
    };

    let middleware: RequestRequestLogMiddleware;

    beforeEach(async () => {
        vi.resetAllMocks();
        requestUtil.buildRequestLog.mockReturnValue(requestLog);
        const moduleRef: TestingModule = await Test.createTestingModule({
            providers: [
                RequestRequestLogMiddleware,
                { provide: RequestStoreService, useValue: requestStoreService },
                { provide: RequestUtil, useValue: requestUtil },
            ],
        }).compile();
        middleware = moduleRef.get(RequestRequestLogMiddleware);
    });

    it('computes and stores request log context once', () => {
        middleware.use(request, createMock<Response>(), next);

        expect(requestUtil.buildRequestLog).toHaveBeenCalledTimes(1);
        expect(requestUtil.buildRequestLog).toHaveBeenCalledWith(request);
        expect(requestStoreSet).toHaveBeenCalledWith(
            RequestLogStoreKey,
            requestLog
        );
        expect(next).toHaveBeenCalledTimes(1);
    });
});
