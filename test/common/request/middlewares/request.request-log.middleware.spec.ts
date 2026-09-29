import { Test } from '@nestjs/testing';
import type { TestingModule } from '@nestjs/testing';
import { mock } from 'vitest-mock-extended';
import type { MockProxy } from 'vitest-mock-extended';
import type { NextFunction, Response } from 'express';
import { RequestLogStoreKey } from '@common/request/constants/request.constant';
import { RequestStoreService } from '@common/request/services/request.store.service';
import { RequestUtil } from '@common/request/utils/request.util';
import type {
    IRequestApp,
    IRequestLog,
} from '@common/request/interfaces/request.interface';
import { RequestRequestLogMiddleware } from '@common/request/middlewares/request.request-log.middleware';

describe('RequestRequestLogMiddleware', () => {
    const requestStoreService: MockProxy<RequestStoreService> =
        mock<RequestStoreService>();
    const requestUtil: MockProxy<RequestUtil> = mock<RequestUtil>();

    let middleware: RequestRequestLogMiddleware;
    let res: Response;
    let next: NextFunction;

    beforeEach(async () => {
        vi.resetAllMocks();

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                RequestRequestLogMiddleware,
                {
                    provide: RequestStoreService,
                    useValue: requestStoreService,
                },
                { provide: RequestUtil, useValue: requestUtil },
            ],
        }).compile();

        middleware = module.get(RequestRequestLogMiddleware);

        res = {} as Response;
        next = vi.fn();
    });

    describe('use', () => {
        it('builds and stores the request log once per request', () => {
            const req = {} as unknown as IRequestApp;
            const requestLog: IRequestLog = {
                userAgent: {
                    ua: null,
                    browser: null,
                    cpu: null,
                    device: null,
                    engine: null,
                    os: null,
                },
                ipAddress: '127.0.0.1',
                geoLocation: null,
            };
            requestUtil.buildRequestLog.mockReturnValue(requestLog);

            middleware.use(req, res, next);

            expect(requestUtil.buildRequestLog).toHaveBeenCalledWith(req);
            expect(requestStoreService.set).toHaveBeenCalledWith(
                RequestLogStoreKey,
                requestLog
            );
            expect(next).toHaveBeenCalledTimes(1);
        });
    });
});
