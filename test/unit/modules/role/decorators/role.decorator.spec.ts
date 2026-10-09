import { HttpStatus } from '@nestjs/common';
import { EnumUserStatusCodeError } from '@modules/user/enums/user.status-code.enum';
import { DocResponseEntryMetaKey } from '@common/doc/constants/doc.constant';
import type { IDocResponseEntry } from '@common/doc/interfaces/doc.interface';
import { GUARDS_METADATA } from '@nestjs/common/constants';
import type { ExecutionContext, Type } from '@nestjs/common';
import { ClsServiceManager } from 'nestjs-cls';
import { mock } from 'vitest-mock-extended';
import type { MockProxy } from 'vitest-mock-extended';
import {
    EnumRoleType,
    EnumUserSignUpFrom,
    EnumUserSignUpWith,
    EnumUserStatus,
} from '@generated/prisma-client/client';
import { RoleRequiredMetaKey } from '@modules/role/constants/role.constant';
import {
    RoleCurrent,
    RoleProtected,
} from '@modules/role/decorators/role.decorator';
import { RoleGuard } from '@modules/role/guards/role.guard';
import type { IRoleWithPolicies } from '@modules/role/interfaces/role.interface';
import { UserStoreKey } from '@modules/user/constants/user.constant';
import type { IUser } from '@modules/user/interfaces/user.interface';
import { getParamDecoratorFactory } from '@test/unit/helpers/test.unit.decorator.helper';
import { expectRequestContextMissingWithKey } from '@test/unit/helpers/test.unit.request.helper';
import { RoleProtectedEmptyException } from '@modules/role/exceptions/role.protected-empty.exception';

describe('role.decorator', () => {
    describe('RoleProtected', () => {
        it('mounts RoleGuard and the required role types on the handler', () => {
            const target = {} as Type<unknown>;
            const descriptor: PropertyDescriptor = { value: vi.fn() };

            RoleProtected(EnumRoleType.admin, EnumRoleType.user)(
                target,
                'method',
                descriptor
            );

            expect(
                Reflect.getMetadata(GUARDS_METADATA, descriptor.value)
            ).toEqual([RoleGuard]);
            expect(
                Reflect.getMetadata(RoleRequiredMetaKey, descriptor.value)
            ).toEqual([EnumRoleType.admin, EnumRoleType.user]);
        });

        it('documents the missing user store at 401', () => {
            const target = {} as Type<unknown>;
            const descriptor: PropertyDescriptor = { value: vi.fn() };

            RoleProtected(EnumRoleType.admin)(target, 'method', descriptor);

            const stored = Reflect.getMetadata(
                DocResponseEntryMetaKey,
                descriptor.value
            ) as IDocResponseEntry[];
            expect(stored).toEqual(
                expect.arrayContaining([
                    expect.objectContaining({
                        httpStatus: HttpStatus.UNAUTHORIZED,
                        messagePath: 'user.error.guardMissing',
                    }),
                ])
            );
        });

        it('throws at evaluation when no role is given', () => {
            expect(() => RoleProtected()).toThrow(RoleProtectedEmptyException);
            expect(() => RoleProtected()).toThrow(
                'RoleProtected needs at least one role'
            );
        });
    });

    describe('RoleCurrent', () => {
        const clsService: MockProxy<
            ReturnType<typeof ClsServiceManager.getClsService>
        > = mock<ReturnType<typeof ClsServiceManager.getClsService>>();
        const executionContext: MockProxy<ExecutionContext> =
            mock<ExecutionContext>();
        const now = new Date('2026-01-01T00:00:00.000Z');
        const role: IRoleWithPolicies = {
            id: 'role-1',
            name: 'manager',
            description: null,
            type: EnumRoleType.user,
            createdAt: now,
            createdBy: null,
            updatedAt: now,
            updatedBy: null,
            policies: [],
        };
        const user: IUser = {
            id: 'user-1',
            name: null,
            username: 'johnson',
            isVerified: false,
            verifiedAt: null,
            email: 'john@example.com',
            roleId: role.id,
            password: null,
            passwordExpired: null,
            passwordCreated: null,
            passwordAttempt: null,
            signUpAt: now,
            signUpFrom: EnumUserSignUpFrom.website,
            signUpWith: EnumUserSignUpWith.credential,
            status: EnumUserStatus.active,
            gender: null,
            countryId: 'country-1',
            lastLoginAt: null,
            lastIPAddress: null,
            lastLoginFrom: null,
            lastLoginWith: null,
            lastWorkspaceId: null,
            lastWorkspaceChangedAt: null,
            termPolicy: {
                termsOfService: true,
                privacy: true,
                marketing: false,
                cookies: true,
            },
            photo: null,
            createdAt: now,
            createdBy: null,
            updatedAt: now,
            updatedBy: null,
            deletedAt: null,
            deletedBy: null,
            role,
            twoFactor: null,
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

        it('throws UserGuardMissingException when the user store is undefined', () => {
            clsService.get.mockReturnValue(undefined);
            const target = {} as Type<unknown>;
            RoleCurrent()(target, 'roleCurrent', 0);
            const factory = getParamDecoratorFactory(target, 'roleCurrent');

            let thrown: unknown;
            try {
                factory(undefined, executionContext);
            } catch (error) {
                thrown = error;
            }

            expect(thrown).toMatchObject({
                module: 'user',
                statusCode: EnumUserStatusCodeError.guardMissing,
                statusCodeKey:
                    EnumUserStatusCodeError[
                        EnumUserStatusCodeError.guardMissing
                    ],
                messagePath: 'user.error.guardMissing',
                httpStatus: HttpStatus.UNAUTHORIZED,
            });
        });

        it('throws UserGuardMissingException when the user store is null', () => {
            clsService.get.mockReturnValue(null);
            const target = {} as Type<unknown>;
            RoleCurrent()(target, 'roleCurrent', 0);
            const factory = getParamDecoratorFactory(target, 'roleCurrent');

            let thrown: unknown;
            try {
                factory(undefined, executionContext);
            } catch (error) {
                thrown = error;
            }

            expect(thrown).toMatchObject({
                module: 'user',
                statusCode: EnumUserStatusCodeError.guardMissing,
                statusCodeKey:
                    EnumUserStatusCodeError[
                        EnumUserStatusCodeError.guardMissing
                    ],
                messagePath: 'user.error.guardMissing',
                httpStatus: HttpStatus.UNAUTHORIZED,
            });
        });

        it('returns the whole role when no field is requested', () => {
            clsService.get.mockReturnValue(user);
            const target = {} as Type<unknown>;
            RoleCurrent()(target, 'roleCurrent', 0);
            const factory = getParamDecoratorFactory(target, 'roleCurrent');

            expect(factory(undefined, executionContext)).toBe(role);
        });

        it('returns one field of the role when a field is requested', () => {
            clsService.get.mockReturnValue(user);
            const target = {} as Type<unknown>;
            RoleCurrent()(target, 'roleCurrent', 0);
            const factory = getParamDecoratorFactory(target, 'roleCurrent');

            expect(factory('name', executionContext)).toBe(role.name);
        });

        it('throws RequestContextMissingException when the requested field is undefined', () => {
            clsService.get.mockReturnValue({
                ...user,
                role: { ...role, createdBy: undefined },
            } as unknown as IUser);
            const target = {} as Type<unknown>;
            RoleCurrent()(target, 'roleCurrent', 0);
            const factory = getParamDecoratorFactory(target, 'roleCurrent');

            let thrown: unknown;
            try {
                factory('createdBy', executionContext);
            } catch (error) {
                thrown = error;
            }

            expectRequestContextMissingWithKey(
                thrown,
                `${UserStoreKey}.role.createdBy`
            );
        });

        it('throws RequestContextMissingException when the requested field is null', () => {
            clsService.get.mockReturnValue(user);
            const target = {} as Type<unknown>;
            RoleCurrent()(target, 'roleCurrent', 0);
            const factory = getParamDecoratorFactory(target, 'roleCurrent');

            let thrown: unknown;
            try {
                factory('description', executionContext);
            } catch (error) {
                thrown = error;
            }

            expectRequestContextMissingWithKey(
                thrown,
                `${UserStoreKey}.role.description`
            );
        });
    });
});
