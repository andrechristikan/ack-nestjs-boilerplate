import { ExecutionContext } from '@nestjs/common';
import { createMock } from '@golevelup/ts-jest';
import { Test, TestingModule } from '@nestjs/testing';
import { Response } from 'express';
import { IRequestApp } from 'src/common/request/interfaces/request.interface';
import { ConfigService } from '@nestjs/config';
import { AppUrlVersionMiddleware } from 'src/app/middlewares/app.url-version.middleware';
import { ENUM_APP_ENVIRONMENT } from 'src/app/enums/app.enum';

describe('AppUrlVersionMiddleware', () => {
    describe('Development Environment', () => {
        let middleware: AppUrlVersionMiddleware;

        const mockConfigService = {
            get: jest.fn().mockImplementation((key: string) => {
                switch (key) {
                    case 'app.env':
                        return ENUM_APP_ENVIRONMENT.DEVELOPMENT;
                    case 'app.globalPrefix':
                        return '/api';
                    case 'app.urlVersion.enable':
                        return true;
                    case 'app.urlVersion.prefix':
                        return 'v';
                    case 'app.urlVersion.version':
                        return '1';
                    default:
                        return null;
                }
            }),
        };

        beforeEach(async () => {
            const moduleRef: TestingModule = await Test.createTestingModule({
                providers: [
                    AppUrlVersionMiddleware,
                    {
                        provide: ConfigService,
                        useValue: mockConfigService,
                    },
                ],
            }).compile();

            middleware = moduleRef.get<AppUrlVersionMiddleware>(
                AppUrlVersionMiddleware
            );
        });

        it('should be defined', () => {
            expect(middleware).toBeDefined();
        });

        describe('use', () => {
            it('should put default api version if not in /api prefix', () => {
                const context = createMock<ExecutionContext>({
                    switchToHttp: jest.fn().mockReturnValue({
                        getRequest: jest.fn().mockReturnValue({
                            originalUrl: '/',
                        }),
                        getResponse: jest.fn(),
                    }),
                });
                const request = context
                    .switchToHttp()
                    .getRequest<IRequestApp>();
                const response = context.switchToHttp().getResponse<Response>();
                const next = jest.fn();

                middleware.use(request, response, next);

                expect(middleware['env']).toBe(
                    ENUM_APP_ENVIRONMENT.DEVELOPMENT
                );
                expect(middleware['globalPrefix']).toBe('/api');
                expect(middleware['urlVersionEnable']).toBe(true);
                expect(middleware['urlVersionPrefix']).toBe('v');
                expect(middleware['urlVersion']).toBe('1');
                expect(request.__version).toBe('1');
                expect(next).toHaveBeenCalled();
            });

            it('should put default api version base on /api/v{version} prefix', () => {
                const context = createMock<ExecutionContext>({
                    switchToHttp: jest.fn().mockReturnValue({
                        getRequest: jest.fn().mockReturnValue({
                            originalUrl: '/api/v2',
                        }),
                        getResponse: jest.fn(),
                    }),
                });
                const request = context
                    .switchToHttp()
                    .getRequest<IRequestApp>();
                const response = context.switchToHttp().getResponse<Response>();
                const next = jest.fn();

                middleware.use(request, response, next);

                expect(middleware['env']).toBe(
                    ENUM_APP_ENVIRONMENT.DEVELOPMENT
                );

                expect(middleware['globalPrefix']).toBe('/api');
                expect(middleware['urlVersionEnable']).toBe(true);
                expect(middleware['urlVersionPrefix']).toBe('v');
                expect(middleware['urlVersion']).toBe('1');
                expect(request.__version).toBe('2');
                expect(next).toHaveBeenCalled();
            });
        });
    });

    describe('Production Environment', () => {
        let middleware: AppUrlVersionMiddleware;

        const mockConfigService = {
            get: jest.fn().mockImplementation((key: string) => {
                switch (key) {
                    case 'app.env':
                        return ENUM_APP_ENVIRONMENT.PRODUCTION;
                    case 'app.globalPrefix':
                        return '';
                    case 'app.urlVersion.enable':
                        return true;
                    case 'app.urlVersion.prefix':
                        return 'v';
                    case 'app.urlVersion.version':
                        return '1';
                    default:
                        return null;
                }
            }),
        };

        beforeEach(async () => {
            const moduleRef: TestingModule = await Test.createTestingModule({
                providers: [
                    AppUrlVersionMiddleware,
                    {
                        provide: ConfigService,
                        useValue: mockConfigService,
                    },
                ],
            }).compile();

            middleware = moduleRef.get<AppUrlVersionMiddleware>(
                AppUrlVersionMiddleware
            );
        });

        it('should be defined', () => {
            expect(middleware).toBeDefined();
        });

        describe('use', () => {
            it('should put default api version base on /api/v{version} prefix', () => {
                const context = createMock<ExecutionContext>({
                    switchToHttp: jest.fn().mockReturnValue({
                        getRequest: jest.fn().mockReturnValue({
                            originalUrl: '/v2',
                        }),
                        getResponse: jest.fn(),
                    }),
                });
                const request = context
                    .switchToHttp()
                    .getRequest<IRequestApp>();
                const response = context.switchToHttp().getResponse<Response>();
                const next = jest.fn();

                middleware.use(request, response, next);

                expect(middleware['env']).toBe(ENUM_APP_ENVIRONMENT.PRODUCTION);
                expect(middleware['globalPrefix']).toBe('');
                expect(middleware['urlVersionEnable']).toBe(true);
                expect(middleware['urlVersionPrefix']).toBe('v');
                expect(middleware['urlVersion']).toBe('1');
                expect(request.__version).toBe('2');
                expect(next).toHaveBeenCalled();
            });
        });
    });
});
