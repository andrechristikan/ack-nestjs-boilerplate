import { GUARDS_METADATA } from '@nestjs/common/constants';
import type { ExecutionContext, Type } from '@nestjs/common';
import { ClsServiceManager } from 'nestjs-cls';
import { mock } from 'vitest-mock-extended';
import type { MockProxy } from 'vitest-mock-extended';
import { EnumAppEnvironment } from '@app/enums/app.enum';
import {
    RequestCustomTimeoutMetaKey,
    RequestCustomTimeoutValueMetaKey,
    RequestEnvMetaKey,
    RequestLanguageStoreKey,
    RequestLogStoreKey,
    RequestThrottleOptionsMetaKey,
} from '@common/request/constants/request.constant';
import {
    RequestContext,
    RequestEnvProtected,
    RequestThrottle,
    RequestTimeout,
} from '@common/request/decorators/request.decorator';
import { RequestEnvGuard } from '@common/request/guards/request.env.guard';
import { RequestThrottleUserGuard } from '@common/request/guards/request.throttle-user.guard';
import { getParamDecoratorFactory } from '@test/unit/helpers/test.unit.decorator.helper';
import {
    buildRequestLog,
    expectRequestContextMissingWithKey,
} from '@test/unit/helpers/test.unit.request.helper';
import { RequestEnvProtectedEmptyException } from '@common/request/exceptions/request.env-protected-empty.exception';
import { HttpStatus } from '@nestjs/common';
import { DocResponseEntryMetaKey } from '@common/doc/constants/doc.constant';
import type { IDocResponseEntry } from '@common/doc/interfaces/doc.interface';
import { EnumRequestStatusCodeError } from '@common/request/enums/request.status-code.enum';

describe('request.decorator', () => {
    describe('RequestTimeout', () => {
        it('sets the custom-timeout flag and value on the handler', () => {
            const target = {} as Type<unknown>;
            const descriptor: PropertyDescriptor = { value: vi.fn() };

            RequestTimeout('5s')(target, 'method', descriptor);

            expect(
                Reflect.getMetadata(
                    RequestCustomTimeoutMetaKey,
                    descriptor.value
                )
            ).toBe(true);
            expect(
                Reflect.getMetadata(
                    RequestCustomTimeoutValueMetaKey,
                    descriptor.value
                )
            ).toBe('5s');
        });
    });

    describe('RequestEnvProtected', () => {
        it('mounts RequestEnvGuard and the allowed environments on the handler', () => {
            const target = {} as Type<unknown>;
            const descriptor: PropertyDescriptor = { value: vi.fn() };

            RequestEnvProtected(
                EnumAppEnvironment.local,
                EnumAppEnvironment.development
            )(target, 'method', descriptor);

            expect(
                Reflect.getMetadata(GUARDS_METADATA, descriptor.value)
            ).toEqual([RequestEnvGuard]);
            expect(
                Reflect.getMetadata(RequestEnvMetaKey, descriptor.value)
            ).toEqual([
                EnumAppEnvironment.local,
                EnumAppEnvironment.development,
            ]);
        });

        it('documents the RequestEnvGuard not-allowed error', () => {
            const target = {} as Type<unknown>;
            const descriptor: PropertyDescriptor = { value: vi.fn() };

            RequestEnvProtected(EnumAppEnvironment.local)(
                target,
                'method',
                descriptor
            );

            const stored = Reflect.getMetadata(
                DocResponseEntryMetaKey,
                descriptor.value
            ) as IDocResponseEntry[];
            expect(stored).toEqual([
                {
                    httpStatus: HttpStatus.NOT_FOUND,
                    statusCode: EnumRequestStatusCodeError.envNotAllowed,
                    messagePath: 'http.clientError.notFound',
                },
            ]);
        });

        it('throws at evaluation when no environment is given', () => {
            expect(() => RequestEnvProtected()).toThrow(
                RequestEnvProtectedEmptyException
            );
            expect(() => RequestEnvProtected()).toThrow(
                'RequestEnvProtected needs at least one environment'
            );
        });
    });

    describe('RequestThrottle', () => {
        it('sets the throttle options and mounts RequestThrottleUserGuard on the handler', () => {
            const target = {} as Type<unknown>;
            const descriptor: PropertyDescriptor = { value: vi.fn() };
            const options = { user: true };

            RequestThrottle(options)(target, 'method', descriptor);

            expect(
                Reflect.getMetadata(
                    RequestThrottleOptionsMetaKey,
                    descriptor.value
                )
            ).toBe(options);
            expect(
                Reflect.getMetadata(GUARDS_METADATA, descriptor.value)
            ).toEqual([RequestThrottleUserGuard]);
        });
    });

    describe('RequestContext', () => {
        const clsService: MockProxy<
            ReturnType<typeof ClsServiceManager.getClsService>
        > = mock<ReturnType<typeof ClsServiceManager.getClsService>>();
        const executionContext: MockProxy<ExecutionContext> =
            mock<ExecutionContext>();
        const target = {} as Type<unknown>;
        RequestContext()(target, 'requestContext', 0);
        const factory = getParamDecoratorFactory(target, 'requestContext');
        const requestLog = buildRequestLog();

        beforeEach(() => {
            vi.resetAllMocks();
            vi.spyOn(ClsServiceManager, 'getClsService').mockReturnValue(
                clsService
            );
        });

        afterEach(() => {
            vi.restoreAllMocks();
        });

        it('throws RequestContextMissingException when the store holds no request log', () => {
            clsService.get.mockReturnValue(undefined);

            let thrown: unknown;
            try {
                factory(undefined, executionContext);
            } catch (error) {
                thrown = error;
            }

            expectRequestContextMissingWithKey(thrown, RequestLogStoreKey);
        });

        it('throws RequestContextMissingException when the store holds no language', () => {
            clsService.get.mockImplementation(key =>
                key === RequestLogStoreKey ? requestLog : undefined
            );

            let thrown: unknown;
            try {
                factory(undefined, executionContext);
            } catch (error) {
                thrown = error;
            }

            expectRequestContextMissingWithKey(thrown, RequestLanguageStoreKey);
        });

        it('returns the request log and the language from the store', () => {
            clsService.get.mockImplementation(key =>
                key === RequestLogStoreKey ? requestLog : 'en'
            );

            expect(factory(undefined, executionContext)).toEqual({
                requestLog,
                language: 'en',
            });
            expect(clsService.get).toHaveBeenCalledWith(RequestLogStoreKey);
            expect(clsService.get).toHaveBeenCalledWith(
                RequestLanguageStoreKey
            );
        });
    });
});
