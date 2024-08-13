import { faker } from '@faker-js/faker';
import { createMock } from '@golevelup/ts-jest';
import { CallHandler, ExecutionContext } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import { Response } from 'express';
import { lastValueFrom, of } from 'rxjs';
import { HelperDateService } from 'src/common/helper/services/helper.date.service';
import { ENUM_MESSAGE_LANGUAGE } from 'src/common/message/enums/message.enum';
import { MessageService } from 'src/common/message/services/message.service';
import { ENUM_PAGINATION_ORDER_DIRECTION_TYPE } from 'src/common/pagination/enums/pagination.enum';
import {
    RESPONSE_MESSAGE_PATH_META_KEY,
    RESPONSE_MESSAGE_PROPERTIES_META_KEY,
} from 'src/common/response/constants/response.constant';
import { ResponsePagingInterceptor } from 'src/common/response/interceptors/response.paging.interceptor';

describe('ResponsePagingInterceptor', () => {
    let interceptor: ResponsePagingInterceptor;

    const mockHelperDateService = {
        createTimestamp: jest.fn(),
    };

    const mockMessageService = {
        getLanguage: jest.fn().mockReturnValue(ENUM_MESSAGE_LANGUAGE.EN),
        setMessage: jest.fn().mockReturnValue('default message'),
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
                ResponsePagingInterceptor,
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

        interceptor = moduleRef.get<ResponsePagingInterceptor>(
            ResponsePagingInterceptor
        );
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

    it('should throw an error if data is undefined', async () => {
        jest.spyOn(interceptor['reflector'], 'get').mockImplementation(
            (key: string) => {
                switch (key) {
                    case RESPONSE_MESSAGE_PATH_META_KEY:
                        return 'default';
                    case RESPONSE_MESSAGE_PROPERTIES_META_KEY:
                        return undefined;
                    default:
                        return null;
                }
            }
        );

        const res = { headers: {}, data: undefined } as unknown as Response;
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

        try {
            await lastValueFrom(interceptor.intercept(executionContext, next));
        } catch (err) {
            expect(err).toBeInstanceOf(Error);
            expect(err.message).toBe(
                'ResponsePaging must instanceof IResponsePaging'
            );
        }
    });

    it('should throw an error if data is not array', async () => {
        jest.spyOn(interceptor['reflector'], 'get').mockImplementation(
            (key: string) => {
                switch (key) {
                    case RESPONSE_MESSAGE_PATH_META_KEY:
                        return 'default';
                    case RESPONSE_MESSAGE_PROPERTIES_META_KEY:
                        return undefined;
                    default:
                        return null;
                }
            }
        );

        const res = { headers: {}, data: '' } as unknown as Response;
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
                    data: {},
                }),
        };

        try {
            await lastValueFrom(interceptor.intercept(executionContext, next));
        } catch (err) {
            expect(err).toBeInstanceOf(Error);
            expect(err.message).toBe(
                'Field data must in array and can not be empty'
            );
        }
    });

    describe('should return response as ResponsePagingDto', () => {
        it('with data without no filters and no search', async () => {
            jest.spyOn(interceptor['reflector'], 'get').mockImplementation(
                (key: string) => {
                    switch (key) {
                        case RESPONSE_MESSAGE_PATH_META_KEY:
                            return 'default';
                        case RESPONSE_MESSAGE_PROPERTIES_META_KEY:
                            return undefined;
                        default:
                            return null;
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
                        __pagination: {
                            search: undefined,
                            filters: undefined,
                            page: 1,
                            perPage: 10,
                            orderBy: 'createdAt',
                            orderDirection:
                                ENUM_PAGINATION_ORDER_DIRECTION_TYPE.ASC,
                            availableSearch: [],
                            availableOrderBy: ['createAt'],
                            availableOrderDirection: Object.values(
                                ENUM_PAGINATION_ORDER_DIRECTION_TYPE
                            ),
                        },
                        body: {},
                        query: {},
                    }),
                    getResponse: jest.fn().mockReturnValue(res),
                }),
            });

            const next: CallHandler = {
                handle: () =>
                    of({
                        _pagination: {
                            total: 10,
                            totalPage: 1,
                        },
                        data: [
                            {
                                _id: faker.string.uuid(),
                            },
                        ],
                    }),
            };

            const result = await lastValueFrom(
                interceptor.intercept(executionContext, next)
            );

            expect(result).toBeDefined();
            expect(result.statusCode).toBeDefined();
            expect(result.message).toBeDefined();
            expect(result._metadata).toBeDefined();
            expect(result._metadata.pagination).toBeDefined();
            expect(result._metadata.pagination.search).toBeUndefined();
            expect(result._metadata.pagination.filters).toBeUndefined();
            expect(result._metadata.pagination.page).toBeDefined();
            expect(result._metadata.pagination.perPage).toBeDefined();
            expect(result._metadata.pagination.orderBy).toBeDefined();
            expect(result._metadata.pagination.orderDirection).toBeDefined();
            expect(result._metadata.pagination.availableSearch).toBeDefined();
            expect(result._metadata.pagination.availableOrderBy).toBeDefined();
            expect(
                result._metadata.pagination.availableOrderDirection
            ).toBeDefined();
            expect(result._metadata.pagination.total).toBeDefined();
            expect(result._metadata.pagination.totalPage).toBeDefined();
            expect(result.data).toBeDefined();
            expect(result.data.length).toBe(1);
            expect(result.data[0]._id).toBeDefined();
        });

        it('with data with filters and search', async () => {
            jest.spyOn(interceptor['reflector'], 'get').mockImplementation(
                (key: string) => {
                    switch (key) {
                        case RESPONSE_MESSAGE_PATH_META_KEY:
                            return 'default';
                        case RESPONSE_MESSAGE_PROPERTIES_META_KEY:
                            return undefined;
                        default:
                            return null;
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
                        __pagination: {
                            search: 'test',
                            filters: {
                                status: 'statusTest',
                            },
                            page: 1,
                            perPage: 10,
                            orderBy: 'createdAt',
                            orderDirection:
                                ENUM_PAGINATION_ORDER_DIRECTION_TYPE.ASC,
                            availableSearch: [],
                            availableOrderBy: ['createAt'],
                            availableOrderDirection: Object.values(
                                ENUM_PAGINATION_ORDER_DIRECTION_TYPE
                            ),
                        },
                        body: {},
                        query: {},
                    }),
                    getResponse: jest.fn().mockReturnValue(res),
                }),
            });

            const next: CallHandler = {
                handle: () =>
                    of({
                        _pagination: {
                            total: 10,
                            totalPage: 1,
                        },
                        data: [
                            {
                                _id: faker.string.uuid(),
                            },
                        ],
                    }),
            };

            const result = await lastValueFrom(
                interceptor.intercept(executionContext, next)
            );

            expect(result).toBeDefined();
            expect(result.statusCode).toBeDefined();
            expect(result.message).toBeDefined();
            expect(result._metadata).toBeDefined();
            expect(result._metadata.pagination).toBeDefined();
            expect(result._metadata.pagination.search).toBeDefined();
            expect(result._metadata.pagination.filters).toBeDefined();
            expect(result._metadata.pagination.page).toBeDefined();
            expect(result._metadata.pagination.perPage).toBeDefined();
            expect(result._metadata.pagination.orderBy).toBeDefined();
            expect(result._metadata.pagination.orderDirection).toBeDefined();
            expect(result._metadata.pagination.availableSearch).toBeDefined();
            expect(result._metadata.pagination.availableOrderBy).toBeDefined();
            expect(
                result._metadata.pagination.availableOrderDirection
            ).toBeDefined();
            expect(result._metadata.pagination.total).toBeDefined();
            expect(result._metadata.pagination.totalPage).toBeDefined();
            expect(result.data).toBeDefined();
            expect(result.data.length).toBe(1);
            expect(result.data[0]._id).toBeDefined();
        });
    });
});
