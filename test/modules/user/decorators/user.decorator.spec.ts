import { GUARDS_METADATA, ROUTE_ARGS_METADATA } from '@nestjs/common/constants';
import type { ExecutionContext, Type } from '@nestjs/common';
import { ClsServiceManager } from 'nestjs-cls';
import { mock } from 'vitest-mock-extended';
import {
    EnumRoleType,
    EnumUserLoginFrom,
    EnumUserLoginWith,
    EnumUserSignUpFrom,
    EnumUserSignUpWith,
    EnumUserStatus,
} from '@generated/prisma-client/client';
import type { TwoFactor } from '@generated/prisma-client/client';
import { UserGuardIsVerifiedMetaKey } from '@modules/user/constants/user.constant';
import {
    UserCurrent,
    UserProtected,
} from '@modules/user/decorators/user.decorator';
import { UserGuard } from '@modules/user/guards/user.guard';
import { RequestContextMissingException } from '@common/request/exceptions/request.context-missing.exception';
import { EnumRequestStatusCodeError } from '@common/request/enums/request.status-code.enum';
import type { IRoleWithPolicies } from '@modules/role/interfaces/role.interface';
import type { IUser } from '@modules/user/interfaces/user.interface';

describe('user.decorator', () => {
    describe('UserProtected', () => {
        it('mounts UserGuard and sets the verified flag to true by default', () => {
            const target = {} as Type<unknown>;
            const descriptor: PropertyDescriptor = { value: (): void => {} };

            UserProtected()(target, 'method', descriptor);

            expect(
                Reflect.getMetadata(GUARDS_METADATA, descriptor.value)
            ).toEqual([UserGuard]);
            expect(
                Reflect.getMetadata(
                    UserGuardIsVerifiedMetaKey,
                    descriptor.value
                )
            ).toBe(true);
        });

        it('sets the verified flag to false when passed false', () => {
            const target = {} as Type<unknown>;
            const descriptor: PropertyDescriptor = { value: (): void => {} };

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
        const clsService =
            mock<ReturnType<typeof ClsServiceManager.getClsService>>();
        const executionContext = mock<ExecutionContext>();

        function extractFactory(
            propertyKey: string
        ): (data: unknown, ctx: ExecutionContext) => unknown {
            const target = {} as Type<unknown>;

            UserCurrent()(target, propertyKey, 0);

            const metadata = Reflect.getMetadata(
                ROUTE_ARGS_METADATA,
                target.constructor,
                propertyKey
            ) as Record<
                string,
                { factory: (data: unknown, ctx: ExecutionContext) => unknown }
            >;
            const [paramMetadata] = Object.values(metadata);

            return paramMetadata.factory;
        }

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

        function expectContextMissingException(thrown: unknown): void {
            expect(thrown).toBeInstanceOf(RequestContextMissingException);
            expect(thrown).toMatchObject({
                module: 'request',
                statusCode: EnumRequestStatusCodeError.contextMissing,
                statusCodeKey:
                    EnumRequestStatusCodeError[
                        EnumRequestStatusCodeError.contextMissing
                    ],
                messagePath: 'request.error.contextMissing',
            });
        }

        beforeEach(() => {
            vi.resetAllMocks();
            vi.spyOn(ClsServiceManager, 'getClsService').mockReturnValue(
                clsService
            );
        });

        afterEach(() => {
            vi.restoreAllMocks();
        });

        it('throws RequestContextMissingException when the stored user is undefined', () => {
            const factory = extractFactory('undefinedUser');
            clsService.get.mockReturnValue(undefined);

            let thrown: unknown;
            try {
                factory(undefined, executionContext);
            } catch (error) {
                thrown = error;
            }

            expectContextMissingException(thrown);
        });

        it('throws RequestContextMissingException when the stored user is null', () => {
            const factory = extractFactory('nullUser');
            clsService.get.mockReturnValue(null);

            let thrown: unknown;
            try {
                factory(undefined, executionContext);
            } catch (error) {
                thrown = error;
            }

            expectContextMissingException(thrown);
        });

        it('returns the whole user when no field is requested', () => {
            const factory = extractFactory('wholeUser');
            clsService.get.mockReturnValue(user);

            expect(factory(undefined, executionContext)).toBe(user);
        });

        it('returns the whole user when the field is null', () => {
            const factory = extractFactory('nullField');
            clsService.get.mockReturnValue(user);

            expect(factory(null, executionContext)).toBe(user);
        });

        it('returns the requested field when it is present', () => {
            const factory = extractFactory('presentField');
            clsService.get.mockReturnValue(user);

            expect(factory('username', executionContext)).toBe(user.username);
        });

        it('throws RequestContextMissingException when the requested field is undefined', () => {
            const factory = extractFactory('undefinedField');
            clsService.get.mockReturnValue({ ...user, gender: undefined });

            let thrown: unknown;
            try {
                factory('gender', executionContext);
            } catch (error) {
                thrown = error;
            }

            expectContextMissingException(thrown);
        });

        it('throws RequestContextMissingException when the requested field is null', () => {
            const factory = extractFactory('nullFieldValue');
            clsService.get.mockReturnValue(user);

            let thrown: unknown;
            try {
                factory('gender', executionContext);
            } catch (error) {
                thrown = error;
            }

            expectContextMissingException(thrown);
        });
    });
});
