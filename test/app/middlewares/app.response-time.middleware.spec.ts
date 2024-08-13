import { ExecutionContext } from '@nestjs/common';
import { createMock } from '@golevelup/ts-jest';
import { Response } from 'express';
import { IRequestApp } from 'src/common/request/interfaces/request.interface';
import { Test, TestingModule } from '@nestjs/testing';
import { AppResponseTimeMiddleware } from 'src/app/middlewares/app.response-time.middleware';
import responseTime from 'response-time';

/* eslint-disable */
jest.mock('response-time', () =>
    jest.fn().mockImplementation((a, b, c: () => null) => jest.fn())
);
/* eslint-enable */

describe('AppResponseTimeMiddleware', () => {
    let middleware: AppResponseTimeMiddleware;

    beforeEach(async () => {
        const moduleRef: TestingModule = await Test.createTestingModule({
            providers: [AppResponseTimeMiddleware],
        }).compile();

        middleware = moduleRef.get<AppResponseTimeMiddleware>(
            AppResponseTimeMiddleware
        );
    });

    it('should be defined', () => {
        expect(middleware).toBeDefined();
    });

    describe('use', () => {
        it('should execute next', () => {
            const context = createMock<ExecutionContext>();
            const request = context.switchToHttp().getRequest<IRequestApp>();
            const response = context.switchToHttp().getResponse<Response>();
            const next = jest.fn();

            middleware.use(request, response, next);

            expect(responseTime).toHaveBeenCalled();
        });
    });
});
