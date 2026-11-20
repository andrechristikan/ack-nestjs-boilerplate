import type { CallHandler, ExecutionContext } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Test } from '@nestjs/testing';
import type { TestingModule } from '@nestjs/testing';
import { Reflector } from '@nestjs/core';
import { NEVER, TimeoutError, of } from 'rxjs';
import { mock } from 'vitest-mock-extended';
import type { MockProxy } from 'vitest-mock-extended';
import { RequestCustomTimeoutMetaKey } from '@common/request/constants/request.constant';
import { EnumRequestStatusCodeError } from '@common/request/enums/request.status-code.enum';
import { RequestTimeoutInterceptor } from '@common/request/interceptors/request.timeout.interceptor';
import {
    buildErrorObservable,
    subscribeError,
    subscribeNext,
} from '@test/unit/helpers/test.unit.observable.helper';
import { buildConfigService } from '@test/unit/helpers/test.unit.config.helper';

describe('RequestTimeoutInterceptor', () => {
    let configService: MockProxy<ConfigService>;
    const reflector: MockProxy<Reflector> = mock<Reflector>();
    let interceptor: RequestTimeoutInterceptor;

    beforeEach(async () => {
        configService = buildConfigService({
            'request.timeoutInMs': 30000,
        });
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
        it('reads request.timeoutInMs from the config service once, in the constructor', () => {
            expect(configService.get).toHaveBeenCalledWith(
                'request.timeoutInMs'
            );
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

        describe('with a http context and a source that never emits', () => {
            const executionContext: MockProxy<ExecutionContext> =
                mock<ExecutionContext>();
            const callHandler: MockProxy<CallHandler> = mock<CallHandler>();

            beforeAll(() => {
                vi.useFakeTimers();
            });

            afterAll(() => {
                vi.useRealTimers();
            });

            beforeEach(() => {
                executionContext.getType.mockReturnValue('http');
                executionContext.getHandler.mockReturnValue(vi.fn());
                callHandler.handle.mockReturnValue(NEVER);
            });

            it('throws RequestTimeoutException at the handler-declared 5s and not before', async () => {
                reflector.get.mockImplementation((key: unknown) =>
                    key === RequestCustomTimeoutMetaKey ? true : '5s'
                );
                const onError = vi.fn();
                interceptor
                    .intercept(executionContext, callHandler)
                    .subscribe({ error: onError });

                await vi.advanceTimersByTimeAsync(4_999);
                expect(onError).not.toHaveBeenCalled();

                await vi.advanceTimersByTimeAsync(1);
                expect(onError).toHaveBeenCalledTimes(1);
                expect(onError).toHaveBeenCalledWith(
                    expect.objectContaining({
                        module: 'request',
                        statusCode: EnumRequestStatusCodeError.timeout,
                    })
                );
            });

            it('throws RequestTimeoutException at request.timeoutInMs when the handler declares none, not at 5s', async () => {
                reflector.get.mockReturnValue(false);
                const onError = vi.fn();
                interceptor
                    .intercept(executionContext, callHandler)
                    .subscribe({ error: onError });

                await vi.advanceTimersByTimeAsync(5_000);
                expect(onError).not.toHaveBeenCalled();

                await vi.advanceTimersByTimeAsync(24_999);
                expect(onError).not.toHaveBeenCalled();

                await vi.advanceTimersByTimeAsync(1);
                expect(onError).toHaveBeenCalledTimes(1);
                expect(onError).toHaveBeenCalledWith(
                    expect.objectContaining({
                        module: 'request',
                        statusCode: EnumRequestStatusCodeError.timeout,
                    })
                );
            });
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
