import { GUARDS_METADATA } from '@nestjs/common/constants';
import type { ExecutionContext, Type } from '@nestjs/common';
import { ClsServiceManager } from 'nestjs-cls';
import { mock } from 'vitest-mock-extended';
import type { MockProxy } from 'vitest-mock-extended';
import {
    EnumRoleType,
    EnumUserLoginFrom,
    EnumUserLoginWith,
    EnumUserSignUpFrom,
    EnumUserSignUpWith,
    EnumUserStatus,
} from '@generated/prisma-client/client';
import type { TwoFactor } from '@generated/prisma-client/client';
import {
    UserGuardIsVerifiedMetaKey,
    UserStoreKey,
} from '@modules/user/constants/user.constant';
import {
    UserCurrent,
    UserProtected,
} from '@modules/user/decorators/user.decorator';
import { UserGuard } from '@modules/user/guards/user.guard';
import type { IRoleWithPolicies } from '@modules/role/interfaces/role.interface';
import type { IUser } from '@modules/user/interfaces/user.interface';
import { getParamDecoratorFactory } from '@test/unit/helpers/test.unit.decorator.helper';
import {
    expectRequestContextMissingWithKey,
    expectRequestGuardMissingWithKey,
} from '@test/unit/helpers/test.unit.request.helper';
import {
    AuthJwtAccessProtected,
    AuthJwtRefreshProtected,
} from '@modules/auth/decorators/auth.jwt.decorator';
import { AuthJwtAccessGuard } from '@modules/auth/guards/jwt/auth.jwt.access.guard';
import { AuthJwtRefreshGuard } from '@modules/auth/guards/jwt/auth.jwt.refresh.guard';
import { RequestProtectedGuardMissingException } from '@common/request/exceptions/request.protected-guard-missing.exception';

describe('user.decorator', () => {
    describe('UserProtected', () => {
        it('mounts UserGuard and sets the verified flag to true by default', () => {
            const target = {} as Type<unknown>;
            const descriptor: PropertyDescriptor = { value: vi.fn() };
            AuthJwtAccessProtected()(target, 'method', descriptor);

            UserProtected()(target, 'method', descriptor);

            expect(
                Reflect.getMetadata(GUARDS_METADATA, descriptor.value)
            ).toEqual([AuthJwtAccessGuard, UserGuard]);
            expect(
                Reflect.getMetadata(
                    UserGuardIsVerifiedMetaKey,
                    descriptor.value
                )
            ).toBe(true);
        });

        it('accepts the JWT refresh guard below it', () => {
            const target = {} as Type<unknown>;
            const descriptor: PropertyDescriptor = { value: vi.fn() };
            AuthJwtRefreshProtected()(target, 'method', descriptor);

            UserProtected()(target, 'method', descriptor);

            expect(
                Reflect.getMetadata(GUARDS_METADATA, descriptor.value)
            ).toEqual([AuthJwtRefreshGuard, UserGuard]);
        });

        it('throws at decoration when no JWT guard is below it', () => {
            const target = {} as Type<unknown>;
            const descriptor: PropertyDescriptor = { value: vi.fn() };

            expect(() => {
                UserProtected()(target, 'method', descriptor);
            }).toThrow(RequestProtectedGuardMissingException);
            expect(() => {
                UserProtected()(target, 'method', descriptor);
            }).toThrow(
                'UserProtected needs AuthJwtAccessGuard or AuthJwtRefreshGuard applied below it'
            );
        });

        it('sets the verified flag to false when passed false', () => {
            const target = {} as Type<unknown>;
            const descriptor: PropertyDescriptor = { value: vi.fn() };
            AuthJwtAccessProtected()(target, 'method', descriptor);

            UserProtected(false)(target, 'method', descriptor);

            expect(
                Reflect.getMetadata(
                    UserGuardIsVerifiedMetaKey,
                    descriptor.value
                )
            ).toBe(false);
        });
    });

    describe('UserCurrent', () => {
        const clsService: MockProxy<
            ReturnType<typeof ClsServiceManager.getClsService>
        > = mock<ReturnType<typeof ClsServiceManager.getClsService>>();
        const executionContext: MockProxy<ExecutionContext> =
            mock<ExecutionContext>();

        const role: IRoleWithPolicies = {
            id: 'role-clockwork',
            name: 'user',
            description: null,
            type: EnumRoleType.user,
            createdAt: new Date('2026-01-01T00:00:00.000Z'),
            createdBy: null,
            updatedAt: new Date('2026-01-01T00:00:00.000Z'),
            updatedBy: null,
            policies: [],
        };
        const twoFactor: TwoFactor = {
            id: 'two-factor-clockwork',
            userId: 'user-clockwork',
            secret: null,
            pendingSecret: null,
            backupCodes: [],
            enabled: false,
            requiredSetup: false,
            confirmedAt: null,
            lastUsedAt: null,
            attempt: 0,
            createdAt: new Date('2026-01-01T00:00:00.000Z'),
            createdBy: null,
            updatedAt: new Date('2026-01-01T00:00:00.000Z'),
            updatedBy: null,
        };
        const user: IUser = {
            id: 'user-clockwork',
            name: 'Turing Orchard',
            username: 'turingOrchard',
            isVerified: true,
            verifiedAt: new Date('2026-01-01T00:00:00.000Z'),
            email: 'turing@example.com',
            roleId: 'role-clockwork',
            password: 'hashed-password',
            passwordExpired: new Date('2026-06-01T00:00:00.000Z'),
            passwordCreated: new Date('2026-01-01T00:00:00.000Z'),
            passwordAttempt: 0,
            signUpAt: new Date('2026-01-01T00:00:00.000Z'),
            signUpFrom: EnumUserSignUpFrom.website,
            signUpWith: EnumUserSignUpWith.credential,
            status: EnumUserStatus.active,
            gender: null,
            countryId: 'country-clockwork',
            lastLoginAt: null,
            lastIPAddress: null,
            lastLoginFrom: EnumUserLoginFrom.website,
            lastLoginWith: EnumUserLoginWith.credential,
            lastWorkspaceId: null,
            lastWorkspaceChangedAt: null,
            termPolicy: {
                termsOfService: true,
                privacy: true,
                marketing: false,
                cookies: false,
            },
            photo: null,
            createdAt: new Date('2026-01-01T00:00:00.000Z'),
            createdBy: null,
            updatedAt: new Date('2026-01-01T00:00:00.000Z'),
            updatedBy: null,
            deletedAt: null,
            deletedBy: null,
            role,
            twoFactor,
        };

        beforeEach(() => {
            vi.resetAllMocks();
            vi.spyOn(ClsServiceManager, 'getClsService').mockReturnValue(
                clsService
            );
        });

        afterEach(() => {
            vi.restoreAllMocks();
        });

        it('throws RequestGuardMissingException when the stored user is undefined', () => {
            const target = {} as Type<unknown>;
            UserCurrent()(target, 'undefinedUser', 0);
            const factory = getParamDecoratorFactory(target, 'undefinedUser');
            clsService.get.mockReturnValue(undefined);

            let thrown: unknown;
            try {
                factory(undefined, executionContext);
            } catch (error) {
                thrown = error;
            }

            expectRequestGuardMissingWithKey(thrown, UserStoreKey);
        });

        it('throws RequestGuardMissingException when the stored user is null', () => {
            const target = {} as Type<unknown>;
            UserCurrent()(target, 'nullUser', 0);
            const factory = getParamDecoratorFactory(target, 'nullUser');
            clsService.get.mockReturnValue(null);

            let thrown: unknown;
            try {
                factory(undefined, executionContext);
            } catch (error) {
                thrown = error;
            }

            expectRequestGuardMissingWithKey(thrown, UserStoreKey);
        });

        it('returns the whole user when no field is requested', () => {
            const target = {} as Type<unknown>;
            UserCurrent()(target, 'wholeUser', 0);
            const factory = getParamDecoratorFactory(target, 'wholeUser');
            clsService.get.mockReturnValue(user);

            expect(factory(undefined, executionContext)).toBe(user);
        });

        it('returns the whole user when the field is null', () => {
            const target = {} as Type<unknown>;
            UserCurrent()(target, 'nullField', 0);
            const factory = getParamDecoratorFactory(target, 'nullField');
            clsService.get.mockReturnValue(user);

            expect(factory(null, executionContext)).toBe(user);
        });

        it('returns the requested field when it is present', () => {
            const target = {} as Type<unknown>;
            UserCurrent()(target, 'presentField', 0);
            const factory = getParamDecoratorFactory(target, 'presentField');
            clsService.get.mockReturnValue(user);

            expect(factory('username', executionContext)).toBe(user.username);
        });

        it('throws RequestContextMissingException when the requested field is undefined', () => {
            const target = {} as Type<unknown>;
            UserCurrent()(target, 'undefinedField', 0);
            const factory = getParamDecoratorFactory(target, 'undefinedField');
            clsService.get.mockReturnValue({ ...user, gender: undefined });

            let thrown: unknown;
            try {
                factory('gender', executionContext);
            } catch (error) {
                thrown = error;
            }

            expectRequestContextMissingWithKey(
                thrown,
                `${UserStoreKey}.gender`
            );
        });

        it('throws RequestContextMissingException when the requested field is null', () => {
            const target = {} as Type<unknown>;
            UserCurrent()(target, 'nullFieldValue', 0);
            const factory = getParamDecoratorFactory(target, 'nullFieldValue');
            clsService.get.mockReturnValue(user);

            let thrown: unknown;
            try {
                factory('gender', executionContext);
            } catch (error) {
                thrown = error;
            }

            expectRequestContextMissingWithKey(
                thrown,
                `${UserStoreKey}.gender`
            );
        });
    });
});
