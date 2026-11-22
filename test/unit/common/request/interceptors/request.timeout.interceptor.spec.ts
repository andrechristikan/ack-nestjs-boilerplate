import type { CallHandler, ExecutionContext } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Test } from '@nestjs/testing';
import type { TestingModule } from '@nestjs/testing';
import { Reflector } from '@nestjs/core';
import { TimeoutError, of } from 'rxjs';
import { mock } from 'vitest-mock-extended';
import type { MockProxy } from 'vitest-mock-extended';
import {
    RequestCustomTimeoutMetaKey,
    RequestCustomTimeoutValueMetaKey,
} from '@common/request/constants/request.constant';
import { EnumRequestStatusCodeError } from '@common/request/enums/request.status-code.enum';
import { RequestTimeoutInterceptor } from '@common/request/interceptors/request.timeout.interceptor';
import {
    buildErrorObservable,
    subscribeError,
    subscribeNext,
} from '@test/unit/helpers/test.unit.observable.helper';

describe('RequestTimeoutInterceptor', () => {
    const configGet = vi.fn<(key: string) => number | undefined>();
    const configService: MockProxy<ConfigService> = mock<ConfigService>({
        get: configGet as ConfigService['get'],
    });
    const reflector: MockProxy<Reflector> = mock<Reflector>();
    let interceptor: RequestTimeoutInterceptor;

    beforeEach(async () => {
        vi.resetAllMocks();
        configGet.mockReturnValue(30000);
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                RequestTimeoutInterceptor,
                { provide: ConfigService, useValue: configService },
                { provide: Reflector, useValue: reflector },
            ],
        }).compile();
        interceptor = module.get(RequestTimeoutInterceptor);
    });

    describe('intercept', () => {
        it('reads the max timeout from the config service once, in the constructor', () => {
            expect(configGet).toHaveBeenCalledWith('request.timeoutInMs');
        });

        it('hands off untouched for a non-http execution context', async () => {
            const executionContext: MockProxy<ExecutionContext> =
                mock<ExecutionContext>();
            const callHandler: MockProxy<CallHandler> = mock<CallHandler>();
            executionContext.getType.mockReturnValue('rpc');
            callHandler.handle.mockReturnValue(of('handled'));

            const result = await subscribeNext(
                interceptor.intercept(executionContext, callHandler)
            );

            expect(result).toBe('handled');
            expect(reflector.get).not.toHaveBeenCalled();
        });

        it('applies the global timeout when the handler carries no custom timeout', async () => {
            const executionContext: MockProxy<ExecutionContext> =
                mock<ExecutionContext>();
            const callHandler: MockProxy<CallHandler> = mock<CallHandler>();
            const handler = vi.fn();
            executionContext.getType.mockReturnValue('http');
            executionContext.getHandler.mockReturnValue(handler);
            reflector.get.mockReturnValue(false);
            callHandler.handle.mockReturnValue(of('handled'));

            const result = await subscribeNext(
                interceptor.intercept(executionContext, callHandler)
            );

            expect(result).toBe('handled');
            expect(reflector.get).toHaveBeenCalledWith(
                RequestCustomTimeoutMetaKey,
                handler
            );
            expect(reflector.get).not.toHaveBeenCalledWith(
                RequestCustomTimeoutValueMetaKey,
                handler
            );
        });

        it('applies the handler-declared timeout when the handler carries @RequestTimeout', async () => {
            const executionContext: MockProxy<ExecutionContext> =
                mock<ExecutionContext>();
            const callHandler: MockProxy<CallHandler> = mock<CallHandler>();
            const handler = vi.fn();
            executionContext.getType.mockReturnValue('http');
            executionContext.getHandler.mockReturnValue(handler);
            reflector.get.mockImplementation((key: unknown) => {
                if (key === RequestCustomTimeoutMetaKey) {
                    return true;
                }
                if (key === RequestCustomTimeoutValueMetaKey) {
                    return '5s';
                }
                return undefined;
            });
            callHandler.handle.mockReturnValue(of('handled'));

            const result = await subscribeNext(
                interceptor.intercept(executionContext, callHandler)
            );

            expect(result).toBe('handled');
            expect(reflector.get).toHaveBeenCalledWith(
                RequestCustomTimeoutValueMetaKey,
                handler
            );
        });
    });

    describe('handleTimeoutRequest', () => {
        it('passes a value through when the source resolves inside the timeout', async () => {
            const callHandler: MockProxy<CallHandler> = mock<CallHandler>();
            callHandler.handle.mockReturnValue(of('handled'));

            const result = await subscribeNext(
                interceptor['handleTimeoutRequest'](callHandler, 30000)
            );

            expect(result).toBe('handled');
        });

        it('maps a TimeoutError into RequestTimeoutException', async () => {
            const callHandler: MockProxy<CallHandler> = mock<CallHandler>();
            callHandler.handle.mockReturnValue(
                buildErrorObservable(new TimeoutError())
            );

            const error = await subscribeError(
                interceptor['handleTimeoutRequest'](callHandler, 30000)
            );

            expect(error).toMatchObject({
                module: 'request',
                statusCode: EnumRequestStatusCodeError.timeout,
                statusCodeKey:
                    EnumRequestStatusCodeError[
                        EnumRequestStatusCodeError.timeout
                    ],
                messagePath: 'http.clientError.requestTimeOut',
            });
        });

        it('re-throws an error that is not a TimeoutError', async () => {
            const callHandler: MockProxy<CallHandler> = mock<CallHandler>();
            const originalError = new Error('boom');
            callHandler.handle.mockReturnValue(
                buildErrorObservable(originalError)
            );

            const error = await subscribeError(
                interceptor['handleTimeoutRequest'](callHandler, 30000)
            );

            expect(error).toBe(originalError);
        });
    });
});
