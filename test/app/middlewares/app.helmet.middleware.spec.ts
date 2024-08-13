import { ExecutionContext } from '@nestjs/common';
import { createMock } from '@golevelup/ts-jest';
import { Test, TestingModule } from '@nestjs/testing';
import { Response } from 'express';
import { IRequestApp } from 'src/common/request/interfaces/request.interface';
import { AppHelmetMiddleware } from 'src/app/middlewares/app.helmet.middleware';
import helmet from 'helmet';

/* eslint-disable */
jest.mock('helmet', () =>
    jest.fn().mockImplementation((a, b, c: () => null) => jest.fn())
);
/* eslint-enable */

describe('AppHelmetMiddleware', () => {
    let middleware: AppHelmetMiddleware;

    beforeEach(async () => {
        const moduleRef: TestingModule = await Test.createTestingModule({
            providers: [AppHelmetMiddleware],
        }).compile();

        middleware = moduleRef.get<AppHelmetMiddleware>(AppHelmetMiddleware);
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

            expect(helmet).toHaveBeenCalled();
        });
    });
});
