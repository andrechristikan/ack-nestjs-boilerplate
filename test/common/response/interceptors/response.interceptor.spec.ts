import { faker } from '@faker-js/faker';
import { createMock } from '@golevelup/ts-jest';
import { CallHandler, ExecutionContext } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import { Response } from 'express';
import { lastValueFrom, of } from 'rxjs';
import { HelperDateService } from 'src/common/helper/services/helper.date.service';
import { MessageService } from 'src/common/message/services/message.service';
import {
    RESPONSE_MESSAGE_PATH_META_KEY,
    RESPONSE_MESSAGE_PROPERTIES_META_KEY,
} from 'src/common/response/constants/response.constant';
import { ResponseInterceptor } from 'src/common/response/interceptors/response.interceptor';

describe('ResponseInterceptor', () => {
    let interceptor: ResponseInterceptor;

    const mockHelperDateService = {
        createTimestamp: jest.fn(),
    };

    const mockMessageService = {
        getLanguage: jest.fn(),
        setMessage: jest.fn().mockReturnValue(''),
    };

    const mockConfigService = {
        get: jest.fn().mockImplementation((key: string) => {
            switch (key) {
                case 'app.versioning.version':
                    return '1';
                case 'app.repoVersion':
                    return '1.0.0';
                default:
                    return null;
            }
        }),
    };

    beforeEach(async () => {
        const moduleRef: TestingModule = await Test.createTestingModule({
            providers: [
                ResponseInterceptor,
                {
                    provide: HelperDateService,
                    useValue: mockHelperDateService,
                },
                {
                    provide: MessageService,
                    useValue: mockMessageService,
                },
                {
                    provide: ConfigService,
                    useValue: mockConfigService,
                },
            ],
        }).compile();

        interceptor = moduleRef.get<ResponseInterceptor>(ResponseInterceptor);
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    it('should be defined', () => {
        expect(interceptor).toBeDefined();
    });

    it('should next if not http', async () => {
        const executionContext = createMock<ExecutionContext>({});
        const next: CallHandler = {
            handle: jest.fn(),
        };

        interceptor.intercept(executionContext, next);
        expect(next.handle).toHaveBeenCalled();
    });

    describe('should return response as ResponseDto', () => {
        it('with data', async () => {
            jest.spyOn(interceptor['reflector'], 'get').mockImplementation(
                (key: string) => {
                    switch (key) {
                        case RESPONSE_MESSAGE_PATH_META_KEY:
                            return 'default';
                        case RESPONSE_MESSAGE_PROPERTIES_META_KEY:
                            return undefined;
                        default:
                            return true;
                    }
                }
            );

            const res = {
                headers: {},
                data: [],
                statusCode: 200,
            } as unknown as Response;
            const headers = {} as Record<string, string>;
            res.json = jest.fn();
            res.status = jest.fn(() => res);

            res.setHeader = jest
                .fn()
                .mockImplementation((key: string, value: string) => {
                    headers[key] = value;

                    return res;
                });
            res.getHeader = jest
                .fn()
                .mockImplementation((key: string) => headers[key]);

            const executionContext = createMock<ExecutionContext>({
                getType: () => 'http',
                switchToHttp: jest.fn().mockReturnValue({
                    getRequest: jest.fn().mockReturnValue({
                        body: {},
                    }),
                    getResponse: jest.fn().mockReturnValue(res),
                }),
            });

            const next: CallHandler = {
                handle: () =>
                    of({
                        data: {
                            _id: faker.string.uuid(),
                        },
                    }),
            };

            const result = await lastValueFrom(
                interceptor.intercept(executionContext, next)
            );

            expect(result).toBeDefined();
            expect(result.statusCode).toBeDefined();
            expect(result.message).toBeDefined();
            expect(result._metadata).toBeDefined();
            expect(result.data).toBeDefined();
            expect(result.data._id).toBeDefined();
        });

        it('without data', async () => {
            jest.spyOn(interceptor['reflector'], 'get').mockImplementation(
                (key: string) => {
                    switch (key) {
                        case RESPONSE_MESSAGE_PATH_META_KEY:
                            return 'default';
                        case RESPONSE_MESSAGE_PROPERTIES_META_KEY:
                            return undefined;
                        default:
                            return true;
                    }
                }
            );

            const res = {
                headers: {},
                data: [],
                statusCode: 200,
            } as unknown as Response;
            const headers = {} as Record<string, string>;
            res.json = jest.fn();
            res.status = jest.fn(() => res);

            res.setHeader = jest
                .fn()
                .mockImplementation((key: string, value: string) => {
                    headers[key] = value;

                    return res;
                });
            res.getHeader = jest
                .fn()
                .mockImplementation((key: string) => headers[key]);

            const executionContext = createMock<ExecutionContext>({
                getType: () => 'http',
                switchToHttp: jest.fn().mockReturnValue({
                    getRequest: jest.fn().mockReturnValue({
                        body: {},
                    }),
                    getResponse: jest.fn().mockReturnValue(res),
                }),
            });

            const next: CallHandler = {
                handle: () => of(undefined),
            };

            const result = await lastValueFrom(
                interceptor.intercept(executionContext, next)
            );

            expect(result).toBeDefined();
            expect(result.statusCode).toBeDefined();
            expect(result.message).toBeDefined();
            expect(result._metadata).toBeDefined();
            expect(result.data).toBeUndefined();
        });
    });
});
