import { ExecutionContext, HttpStatus } from '@nestjs/common';
import { createMock } from '@golevelup/ts-jest';
import { Test } from '@nestjs/testing';
import { IRequestApp } from 'src/common/request/interfaces/request.interface';
import { ConfigService } from '@nestjs/config';
import { Response } from 'express';
import { AppCorsMiddleware } from 'src/app/middlewares/app.cors.middleware';
import cors from 'cors';
import { ENUM_APP_ENVIRONMENT } from 'src/app/enums/app.enum';

/* eslint-disable */
jest.mock('cors', () =>
    jest.fn().mockImplementation((a, b, c: () => null) => jest.fn())
);
/* eslint-enable */

describe('AppCorsMiddleware On Development', () => {
    const allowMethod = ['GET'];
    const allowOrigin = 'example.com';
    const allowHeader = ['Accept'];

    let middleware: AppCorsMiddleware;

    const mockConfigService = {
        get: jest.fn().mockImplementation((key: string) => {
            switch (key) {
                case 'app.env':
                    return ENUM_APP_ENVIRONMENT.DEVELOPMENT;
                case 'middleware.cors.allowOrigin':
                    return allowOrigin;
                case 'middleware.cors.allowMethod':
                    return allowMethod;
                default:
                    return allowHeader;
            }
        }),
    };

    beforeEach(async () => {
        const moduleRef = await Test.createTestingModule({
            providers: [
                AppCorsMiddleware,
                {
                    provide: ConfigService,
                    useValue: mockConfigService,
                },
            ],
        }).compile();

        middleware = moduleRef.get<AppCorsMiddleware>(AppCorsMiddleware);
    });

    it('should be defined', () => {
        expect(middleware).toBeDefined();
    });

    describe('use', () => {
        it('should allow * on development env', () => {
            const context = createMock<ExecutionContext>();
            const request = context.switchToHttp().getRequest<IRequestApp>();
            const response = context.switchToHttp().getResponse<Response>();
            const next = jest.fn();

            middleware.use(request, response, next);

            expect(cors).toHaveBeenCalledWith({
                origin: '*',
                methods: allowMethod,
                allowedHeaders: allowHeader,
                preflightContinue: false,
                credentials: true,
                optionsSuccessStatus: HttpStatus.NO_CONTENT,
            });
        });
    });
});

describe('AppCorsMiddleware On Production', () => {
    const allowMethod = ['GET'];
    const allowOrigin = 'example.com';
    const allowHeader = ['Accept'];

    let middleware: AppCorsMiddleware;

    const mockConfigService = {
        get: jest.fn().mockImplementation((key: string) => {
            switch (key) {
                case 'app.env':
                    return ENUM_APP_ENVIRONMENT.PRODUCTION;
                case 'middleware.cors.allowOrigin':
                    return allowOrigin;
                case 'middleware.cors.allowMethod':
                    return allowMethod;
                default:
                    return allowHeader;
            }
        }),
    };

    beforeEach(async () => {
        const moduleRef = await Test.createTestingModule({
            providers: [
                AppCorsMiddleware,
                {
                    provide: ConfigService,
                    useValue: mockConfigService,
                },
            ],
        }).compile();

        middleware = moduleRef.get<AppCorsMiddleware>(AppCorsMiddleware);
    });

    it('should be defined', () => {
        expect(middleware).toBeDefined();
    });

    describe('use', () => {
        it('should allow origin from configs on production env', () => {
            const context = createMock<ExecutionContext>({
                switchToHttp: jest.fn().mockReturnValue({
                    getRequest: jest.fn().mockReturnValue({
                        body: {},
                        headers: {},
                    }),
                    getResponse: jest.fn().mockReturnValue({
                        setHeader: jest.fn(),
                        getHeader: jest.fn(),
                    }),
                }),
            });
            const request = context.switchToHttp().getRequest<IRequestApp>();
            const response = context.switchToHttp().getResponse<Response>();
            const next = jest.fn();

            middleware.use(request, response, next);

            expect(cors).toHaveBeenCalledWith({
                origin: allowOrigin,
                methods: allowMethod,
                allowedHeaders: allowHeader,
                preflightContinue: false,
                credentials: true,
                optionsSuccessStatus: HttpStatus.NO_CONTENT,
            });
        });
    });
});
