import {
    CallHandler,
    ExecutionContext,
    RequestTimeoutException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createMock } from '@golevelup/ts-jest';
import { throwError } from 'rxjs';
import { Test, TestingModule } from '@nestjs/testing';
import { RequestTimeoutInterceptor } from 'src/common/request/interceptors/request.timeout.interceptor';
import { marbles } from 'rxjs-marbles/jest';
import { REQUEST_CUSTOM_TIMEOUT_VALUE_META_KEY } from 'src/common/request/constants/request.constant';
import { ENUM_REQUEST_STATUS_CODE_ERROR } from 'src/common/request/enums/request.status-code.enum';

describe('RequestTimeoutInterceptor', () => {
    let interceptor: RequestTimeoutInterceptor;

    beforeEach(async () => {
        const moduleRef: TestingModule = await Test.createTestingModule({
            providers: [
                RequestTimeoutInterceptor,
                {
                    provide: ConfigService,
                    useValue: {
                        get: jest.fn().mockImplementation((key: string) => {
                            switch (key) {
                                default:
                                    return 2000;
                            }
                        }),
                    },
                },
            ],
        }).compile();

        interceptor = moduleRef.get<RequestTimeoutInterceptor>(
            RequestTimeoutInterceptor
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

    describe('Default timeout', () => {
        it(
            'should success',
            marbles(m => {
                const executionContext = createMock<ExecutionContext>({
                    getType: () => 'http',
                });

                const next: CallHandler = {
                    handle: () => m.cold('(e|)'),
                };

                const handler = interceptor.intercept(executionContext, next);
                const expected = m.cold('(e|)');

                m.expect(handler).toBeObservable(expected);
            })
        );

        it(
            `should forward the error thrown`,
            marbles(m => {
                const executionContext = createMock<ExecutionContext>({
                    getType: () => 'http',
                });

                const error = new Error('something');
                const next = {
                    handle: () => throwError(() => error),
                };

                const handlerData$ = interceptor.intercept(
                    executionContext,
                    next
                );

                /** Marble emitting an error after `TIMEOUT`ms. */
                const expected$ = m.cold(`#`, undefined, error);
                m.expect(handlerData$).toBeObservable(expected$);
            })
        );

        it(
            'should throw RequestTimeoutException (HTTP 408) error',
            marbles(m => {
                const executionContext = createMock<ExecutionContext>({
                    getType: () => 'http',
                });

                const next: CallHandler = {
                    handle: () => m.cold('3000ms |'),
                };

                const handler = interceptor.intercept(executionContext, next);
                const expected = m.cold(
                    '2000ms #',
                    undefined,
                    new RequestTimeoutException({
                        statusCode: ENUM_REQUEST_STATUS_CODE_ERROR.TIMEOUT,
                        message: 'http.clientError.requestTimeOut',
                    })
                );

                m.expect(handler).toBeObservable(expected);
            })
        );
    });

    describe('Custom timeout', () => {
        it(
            'should success',
            marbles(m => {
                jest.spyOn(interceptor['reflector'], 'get').mockImplementation(
                    (key: string) => {
                        switch (key) {
                            case REQUEST_CUSTOM_TIMEOUT_VALUE_META_KEY:
                                return '1s';
                            default:
                                return true;
                        }
                    }
                );

                const executionContext = createMock<ExecutionContext>({
                    getType: () => 'http',
                });

                const next: CallHandler = {
                    handle: () => m.cold('(e|)'),
                };

                const handler = interceptor.intercept(executionContext, next);
                const expected = m.cold('(e|)');

                m.expect(handler).toBeObservable(expected);
            })
        );

        it(
            `should forward the error thrown`,
            marbles(m => {
                jest.spyOn(interceptor['reflector'], 'get').mockImplementation(
                    (key: string) => {
                        switch (key) {
                            case REQUEST_CUSTOM_TIMEOUT_VALUE_META_KEY:
                                return '1s';
                            default:
                                return true;
                        }
                    }
                );

                const executionContext = createMock<ExecutionContext>({
                    getType: () => 'http',
                });

                const error = new Error('something');
                const next = {
                    handle: () => throwError(() => error),
                };

                const handlerData$ = interceptor.intercept(
                    executionContext,
                    next
                );

                const expected$ = m.cold(`#`, undefined, error);
                m.expect(handlerData$).toBeObservable(expected$);
            })
        );

        it(
            'should throw RequestTimeoutException (HTTP 408) error',
            marbles(m => {
                jest.spyOn(interceptor['reflector'], 'get').mockImplementation(
                    (key: string) => {
                        switch (key) {
                            case REQUEST_CUSTOM_TIMEOUT_VALUE_META_KEY:
                                return '1s';
                            default:
                                return true;
                        }
                    }
                );

                const executionContext = createMock<ExecutionContext>({
                    getType: () => 'http',
                });

                const next: CallHandler = {
                    handle: () => m.cold('3000ms |'),
                };

                const handler = interceptor.intercept(executionContext, next);
                const expected = m.cold(
                    '1000ms #',
                    undefined,
                    new RequestTimeoutException({
                        statusCode: ENUM_REQUEST_STATUS_CODE_ERROR.TIMEOUT,
                        message: 'http.clientError.requestTimeOut',
                    })
                );

                m.expect(handler).toBeObservable(expected);
            })
        );
    });
});
