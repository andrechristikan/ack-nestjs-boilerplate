import { Test } from '@nestjs/testing';
import type { TestingModule } from '@nestjs/testing';
import type { Response } from 'express';
import { mock } from 'vitest-mock-extended';
import type { MockProxy } from 'vitest-mock-extended';

import { RequestLogStoreKey } from '@common/request/constants/request.constant';
import type {
    IRequestApp,
    IRequestLog,
} from '@common/request/interfaces/request.interface';
import { RequestRequestLogMiddleware } from '@common/request/middlewares/request.request-log.middleware';
import { RequestStoreService } from '@common/request/services/request.store.service';
import { RequestUtil } from '@common/request/utils/request.util';

describe('RequestRequestLogMiddleware', () => {
    const requestStoreService: MockProxy<RequestStoreService> =
        mock<RequestStoreService>();
    const requestUtil: MockProxy<RequestUtil> = mock<RequestUtil>();
    const response: MockProxy<Response> = mock<Response>();
    const next = vi.fn<() => void>();
    const request: MockProxy<IRequestApp> = mock<IRequestApp>({ headers: {} });
    const requestLog: IRequestLog = {
        userAgent: {},
        ipAddress: '203.0.113.10',
        geoLocation: null,
    };

    let middleware: RequestRequestLogMiddleware;

    beforeEach(async () => {
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
        middleware.use(request, response, next);

        expect(requestUtil.buildRequestLog).toHaveBeenCalledTimes(1);
        expect(requestUtil.buildRequestLog).toHaveBeenCalledWith(request);
        expect(requestStoreService.set).toHaveBeenCalledWith(
            RequestLogStoreKey,
            requestLog
        );
        expect(next).toHaveBeenCalledTimes(1);
    });
});
