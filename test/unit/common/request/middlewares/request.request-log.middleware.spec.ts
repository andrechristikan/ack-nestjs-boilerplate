import { Test } from '@nestjs/testing';
import type { TestingModule } from '@nestjs/testing';
import { mock } from 'vitest-mock-extended';
import type { MockProxy } from 'vitest-mock-extended';
import type { NextFunction, Response } from 'express';
import { RequestLogStoreKey } from '@common/request/constants/request.constant';
import { RequestStoreService } from '@common/request/services/request.store.service';
import { RequestUtil } from '@common/request/utils/request.util';
import type { IRequestApp } from '@common/request/interfaces/request.interface';
import { RequestRequestLogMiddleware } from '@common/request/middlewares/request.request-log.middleware';

describe('RequestRequestLogMiddleware', () => {
    const requestStoreService: MockProxy<RequestStoreService> =
        mock<RequestStoreService>();

    let middleware: RequestRequestLogMiddleware;
    let res: Response;
    let next: NextFunction;

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                RequestRequestLogMiddleware,
                {
                    provide: RequestStoreService,
                    useValue: requestStoreService,
                },
                RequestUtil,
            ],
        }).compile();

        middleware = module.get(RequestRequestLogMiddleware);

        res = {} as Response;
        next = vi.fn();
    });

    describe('use', () => {
        it('builds the request log once and stores it in a context whose every other field is null', () => {
            const req = {
                headers: { 'user-agent': 'curl/8.0.0' },
                ip: '127.0.0.1',
            } as unknown as IRequestApp;

            middleware.use(req, res, next);

            expect(requestStoreService.set).toHaveBeenCalledWith(
                RequestLogStoreKey,
                {
                    userAgent: expect.objectContaining({ ua: 'curl/8.0.0' }),
                    ipAddress: '127.0.0.1',
                    geoLocation: null,
                }
            );
            expect(next).toHaveBeenCalledTimes(1);
        });
    });
});
