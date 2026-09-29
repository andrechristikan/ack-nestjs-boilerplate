import { HttpStatus } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import type { TestingModule } from '@nestjs/testing';
import { mock } from 'vitest-mock-extended';
import type { MockProxy } from 'vitest-mock-extended';
import {
    EnumActivityLogAction,
    EnumPolicyAction,
    EnumPolicySubject,
    EnumRoleType,
    EnumUserGender,
    EnumUserSignUpFrom,
    EnumUserSignUpWith,
    EnumUserStatus,
} from '@generated/prisma-client/client';
import type { Policy } from '@generated/prisma-client/client';
import { ActivityLogDomain } from '@modules/activity-log/domains/activity-log.domain';
import type { IActivityLogStagedEvent } from '@modules/activity-log/interfaces/activity-log.interface';
import { AuthJwtAccessTokenInvalidException } from '@modules/auth/exceptions/auth.jwt-access-token-invalid.exception';
import { EnumAuthStatusCodeError } from '@modules/auth/enums/auth.status-code.enum';
import { PolicyDomain } from '@modules/policy/domains/policy.domain';
import { PolicyExistException } from '@modules/policy/exceptions/policy.exist.exception';
import { PolicyForbiddenException } from '@modules/policy/exceptions/policy.forbidden.exception';
import { PolicyNotFoundException } from '@modules/policy/exceptions/policy.not-found.exception';
import { PolicyPredefinedNotFoundException } from '@modules/policy/exceptions/policy.predefined-not-found.exception';
import { EnumPolicyStatusCodeError } from '@modules/policy/enums/policy.status-code.enum';
import { PolicyAbilityFactory } from '@modules/policy/factories/policy.factory';
import { PolicyRepository } from '@modules/policy/repositories/policy.repository';
import type { PolicyRequestDto } from '@modules/policy/dtos/request/policy.request.dto';
import type { PolicyUpdateRequestDto } from '@modules/policy/dtos/request/policy.update.request.dto';
import { RoleDomain } from '@modules/role/domains/role.domain';
import { RoleNotFoundException } from '@modules/role/exceptions/role.not-found.exception';
import { EnumRoleStatusCodeError } from '@modules/role/enums/role.status-code.enum';
import type { IUser } from '@modules/user/interfaces/user.interface';

describe('PolicyDomain', () => {
    const policyAbilityFactory: MockProxy<PolicyAbilityFactory> =
        mock<PolicyAbilityFactory>();
    const policyRepository: MockProxy<PolicyRepository> =
        mock<PolicyRepository>();
    const roleDomain: MockProxy<RoleDomain> = mock<RoleDomain>();
    const activityLogDomain: MockProxy<ActivityLogDomain> =
        mock<ActivityLogDomain>();

    let domain: PolicyDomain;

    const policy: Policy = {
        id: 'policy-1',
        createdAt: new Date('2026-01-01T00:00:00.000Z'),
        createdBy: null,
        updatedAt: new Date('2026-01-01T00:00:00.000Z'),
        updatedBy: null,
        roleId: 'role-1',
        subject: EnumPolicySubject.user,
        action: [EnumPolicyAction.manage],
    };

    const buildUser = (roleType: EnumRoleType): IUser => ({
        id: 'user-1',
        name: 'Andre Christi',
        username: 'johnSmith123',
        isVerified: true,
        verifiedAt: new Date('2026-01-01T00:00:00.000Z'),
        email: 'andre@example.com',
        roleId: 'role-1',
        password: 'hashed-password',
        passwordExpired: null,
        passwordCreated: new Date('2026-01-01T00:00:00.000Z'),
        passwordAttempt: 0,
        signUpAt: new Date('2026-01-01T00:00:00.000Z'),
        signUpFrom: EnumUserSignUpFrom.website,
        signUpWith: EnumUserSignUpWith.credential,
        status: EnumUserStatus.active,
        gender: EnumUserGender.male,
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
            cookies: false,
        },
        photo: null,
        createdAt: new Date('2026-01-01T00:00:00.000Z'),
        createdBy: null,
        updatedAt: new Date('2026-01-01T00:00:00.000Z'),
        updatedBy: null,
        deletedAt: null,
        deletedBy: null,
        role: {
            id: 'role-1',
            name: 'Admin',
            description: null,
            type: roleType,
            createdAt: new Date('2026-01-01T00:00:00.000Z'),
            createdBy: null,
            updatedAt: new Date('2026-01-01T00:00:00.000Z'),
            updatedBy: null,
            policies: [policy],
        },
        twoFactor: null,
    });

    beforeEach(async () => {
        vi.resetAllMocks();

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                PolicyDomain,
                {
                    provide: PolicyAbilityFactory,
                    useValue: policyAbilityFactory,
                },
                { provide: PolicyRepository, useValue: policyRepository },
                { provide: RoleDomain, useValue: roleDomain },
                { provide: ActivityLogDomain, useValue: activityLogDomain },
            ],
        }).compile();

        domain = module.get(PolicyDomain);
    });

    describe('validatePolicyGuard', () => {
        it('throws AuthJwtAccessTokenInvalidException when no user is present', () => {
            let thrown: unknown;
            try {
                domain.validatePolicyGuard(null, [], []);
            } catch (error) {
                thrown = error;
            }

            expect(thrown).toBeInstanceOf(AuthJwtAccessTokenInvalidException);
            expect(thrown).toMatchObject({
                module: 'auth',
                statusCode: EnumAuthStatusCodeError.jwtAccessTokenInvalid,
                statusCodeKey:
                    EnumAuthStatusCodeError[
                        EnumAuthStatusCodeError.jwtAccessTokenInvalid
                    ],
                httpStatus: HttpStatus.UNAUTHORIZED,
                messagePath: 'auth.error.accessTokenUnauthorized',
            });
        });

        it('returns true for a superAdmin without checking required policies', () => {
            const user = buildUser(EnumRoleType.superAdmin);

            const result = domain.validatePolicyGuard(user, [], []);

            expect(result).toBe(true);
            expect(policyAbilityFactory.createForUser).not.toHaveBeenCalled();
        });

        it('throws PolicyPredefinedNotFoundException when no required policies are declared', () => {
            const user = buildUser(EnumRoleType.admin);

            let thrown: unknown;
            try {
                domain.validatePolicyGuard(user, [], []);
            } catch (error) {
                thrown = error;
            }

            expect(thrown).toBeInstanceOf(PolicyPredefinedNotFoundException);
            expect(thrown).toMatchObject({
                module: 'policy',
                statusCode: EnumPolicyStatusCodeError.predefinedNotFound,
                statusCodeKey:
                    EnumPolicyStatusCodeError[
                        EnumPolicyStatusCodeError.predefinedNotFound
                    ],
                httpStatus: HttpStatus.INTERNAL_SERVER_ERROR,
                messagePath: 'policy.error.predefinedNotFound',
            });
        });

        it('throws PolicyForbiddenException when the built ability lacks a required policy', () => {
            const user = buildUser(EnumRoleType.admin);
            const required: PolicyRequestDto[] = [
                {
                    subject: EnumPolicySubject.user,
                    action: [EnumPolicyAction.manage],
                },
            ];
            const ability = { can: vi.fn() };
            policyAbilityFactory.createForUser.mockReturnValue(
                ability as never
            );
            policyAbilityFactory.handlerPolicies.mockReturnValue(false);

            let thrown: unknown;
            try {
                domain.validatePolicyGuard(user, [policy], required);
            } catch (error) {
                thrown = error;
            }

            expect(thrown).toBeInstanceOf(PolicyForbiddenException);
            expect(thrown).toMatchObject({
                module: 'policy',
                statusCode: EnumPolicyStatusCodeError.forbidden,
                statusCodeKey:
                    EnumPolicyStatusCodeError[
                        EnumPolicyStatusCodeError.forbidden
                    ],
                httpStatus: HttpStatus.FORBIDDEN,
                messagePath: 'policy.error.forbidden',
            });
            expect(policyAbilityFactory.createForUser).toHaveBeenCalledWith([
                policy,
            ]);
            expect(policyAbilityFactory.handlerPolicies).toHaveBeenCalledWith(
                ability,
                required
            );
        });

        it('defaults policies to an empty array before building the ability', () => {
            const user = buildUser(EnumRoleType.admin);
            const required: PolicyRequestDto[] = [
                {
                    subject: EnumPolicySubject.user,
                    action: [EnumPolicyAction.manage],
                },
            ];
            const ability = { can: vi.fn() };
            policyAbilityFactory.createForUser.mockReturnValue(
                ability as never
            );
            policyAbilityFactory.handlerPolicies.mockReturnValue(true);

            domain.validatePolicyGuard(user, null, required);

            expect(policyAbilityFactory.createForUser).toHaveBeenCalledWith([]);
        });

        it('returns true when the built ability holds every required policy', () => {
            const user = buildUser(EnumRoleType.admin);
            const required: PolicyRequestDto[] = [
                {
                    subject: EnumPolicySubject.user,
                    action: [EnumPolicyAction.manage],
                },
            ];
            const ability = { can: vi.fn() };
            policyAbilityFactory.createForUser.mockReturnValue(
                ability as never
            );
            policyAbilityFactory.handlerPolicies.mockReturnValue(true);

            const result = domain.validatePolicyGuard(user, [policy], required);

            expect(result).toBe(true);
        });
    });

    describe('findManyByRole', () => {
        it('throws RoleNotFoundException when the role does not exist', async () => {
            roleDomain.existsById.mockResolvedValue(false);

            const promise = domain.findManyByRole('role-1');

            await expect(promise).rejects.toBeInstanceOf(RoleNotFoundException);
            await expect(promise).rejects.toMatchObject({
                module: 'role',
                statusCode: EnumRoleStatusCodeError.notFound,
                statusCodeKey:
                    EnumRoleStatusCodeError[EnumRoleStatusCodeError.notFound],
                httpStatus: HttpStatus.NOT_FOUND,
                messagePath: 'role.error.notFound',
            });
            expect(policyRepository.findManyByRoleId).not.toHaveBeenCalled();
        });

        it('returns the policies for the role once it exists', async () => {
            roleDomain.existsById.mockResolvedValue(true);
            policyRepository.findManyByRoleId.mockResolvedValue([policy]);

            const result = await domain.findManyByRole('role-1');

            expect(result).toEqual([policy]);
            expect(policyRepository.findManyByRoleId).toHaveBeenCalledWith(
                'role-1'
            );
        });
    });

    describe('createByAdmin', () => {
        const body: PolicyRequestDto = {
            subject: EnumPolicySubject.user,
            action: [EnumPolicyAction.manage],
        };

        it('throws RoleNotFoundException when the role does not exist', async () => {
            roleDomain.existsById.mockResolvedValue(false);

            const promise = domain.createByAdmin('role-1', body);

            await expect(promise).rejects.toBeInstanceOf(RoleNotFoundException);
            await expect(promise).rejects.toMatchObject({
                module: 'role',
                statusCode: EnumRoleStatusCodeError.notFound,
                statusCodeKey:
                    EnumRoleStatusCodeError[EnumRoleStatusCodeError.notFound],
                httpStatus: HttpStatus.NOT_FOUND,
                messagePath: 'role.error.notFound',
            });
            expect(
                policyRepository.existsByRoleIdAndSubject
            ).not.toHaveBeenCalled();
        });

        it('throws PolicyExistException when the role already grants the subject', async () => {
            roleDomain.existsById.mockResolvedValue(true);
            policyRepository.existsByRoleIdAndSubject.mockResolvedValue(true);

            const promise = domain.createByAdmin('role-1', body);

            await expect(promise).rejects.toBeInstanceOf(PolicyExistException);
            await expect(promise).rejects.toMatchObject({
                module: 'policy',
                statusCode: EnumPolicyStatusCodeError.exist,
                statusCodeKey:
                    EnumPolicyStatusCodeError[EnumPolicyStatusCodeError.exist],
                httpStatus: HttpStatus.CONFLICT,
                messagePath: 'policy.error.exist',
            });
            expect(policyRepository.create).not.toHaveBeenCalled();
        });

        it('creates the policy and stages the admin-policy-create activity log', async () => {
            roleDomain.existsById.mockResolvedValue(true);
            policyRepository.existsByRoleIdAndSubject.mockResolvedValue(false);
            policyRepository.create.mockResolvedValue(policy);
            const preparedEvent: IActivityLogStagedEvent = {
                action: EnumActivityLogAction.adminPolicyCreate,
                metadata: {},
                onError: false,
            };
            activityLogDomain.prepare.mockReturnValue(preparedEvent);

            const result = await domain.createByAdmin('role-1', body);

            expect(result).toBe(policy);
            expect(policyRepository.create).toHaveBeenCalledWith(
                'role-1',
                body
            );
            expect(activityLogDomain.prepare).toHaveBeenCalledWith({
                action: EnumActivityLogAction.adminPolicyCreate,
            });
            expect(activityLogDomain.stagePrepared).toHaveBeenCalledWith([
                preparedEvent,
            ]);
        });
    });

    describe('updateByAdmin', () => {
        const body: PolicyUpdateRequestDto = {
            action: [EnumPolicyAction.read],
        };

        it('throws RoleNotFoundException when the role does not exist', async () => {
            roleDomain.existsById.mockResolvedValue(false);

            const promise = domain.updateByAdmin('role-1', 'policy-1', body);

            await expect(promise).rejects.toBeInstanceOf(RoleNotFoundException);
            await expect(promise).rejects.toMatchObject({
                module: 'role',
                statusCode: EnumRoleStatusCodeError.notFound,
                statusCodeKey:
                    EnumRoleStatusCodeError[EnumRoleStatusCodeError.notFound],
                httpStatus: HttpStatus.NOT_FOUND,
                messagePath: 'role.error.notFound',
            });
            expect(policyRepository.existsByRoleIdAndId).not.toHaveBeenCalled();
        });

        it('throws PolicyNotFoundException when the policy does not exist under the role', async () => {
            roleDomain.existsById.mockResolvedValue(true);
            policyRepository.existsByRoleIdAndId.mockResolvedValue(false);

            const promise = domain.updateByAdmin('role-1', 'policy-1', body);

            await expect(promise).rejects.toBeInstanceOf(
                PolicyNotFoundException
            );
            await expect(promise).rejects.toMatchObject({
                module: 'policy',
                statusCode: EnumPolicyStatusCodeError.notFound,
                statusCodeKey:
                    EnumPolicyStatusCodeError[
                        EnumPolicyStatusCodeError.notFound
                    ],
                httpStatus: HttpStatus.NOT_FOUND,
                messagePath: 'policy.error.notFound',
            });
            expect(policyRepository.update).not.toHaveBeenCalled();
        });

        it('updates the policy and stages the admin-policy-update activity log', async () => {
            roleDomain.existsById.mockResolvedValue(true);
            policyRepository.existsByRoleIdAndId.mockResolvedValue(true);
            policyRepository.update.mockResolvedValue(policy);
            const preparedEvent: IActivityLogStagedEvent = {
                action: EnumActivityLogAction.adminPolicyUpdate,
                metadata: {},
                onError: false,
            };
            activityLogDomain.prepare.mockReturnValue(preparedEvent);

            const result = await domain.updateByAdmin(
                'role-1',
                'policy-1',
                body
            );

            expect(result).toBe(policy);
            expect(policyRepository.update).toHaveBeenCalledWith(
                'policy-1',
                body
            );
            expect(activityLogDomain.prepare).toHaveBeenCalledWith({
                action: EnumActivityLogAction.adminPolicyUpdate,
            });
            expect(activityLogDomain.stagePrepared).toHaveBeenCalledWith([
                preparedEvent,
            ]);
        });
    });

    describe('deleteByAdmin', () => {
        it('throws RoleNotFoundException when the role does not exist', async () => {
            roleDomain.existsById.mockResolvedValue(false);

            const promise = domain.deleteByAdmin('role-1', 'policy-1');

            await expect(promise).rejects.toBeInstanceOf(RoleNotFoundException);
            await expect(promise).rejects.toMatchObject({
                module: 'role',
                statusCode: EnumRoleStatusCodeError.notFound,
                statusCodeKey:
                    EnumRoleStatusCodeError[EnumRoleStatusCodeError.notFound],
                httpStatus: HttpStatus.NOT_FOUND,
                messagePath: 'role.error.notFound',
            });
            expect(policyRepository.existsByRoleIdAndId).not.toHaveBeenCalled();
        });

        it('throws PolicyNotFoundException when the policy does not exist under the role', async () => {
            roleDomain.existsById.mockResolvedValue(true);
            policyRepository.existsByRoleIdAndId.mockResolvedValue(false);

            const promise = domain.deleteByAdmin('role-1', 'policy-1');

            await expect(promise).rejects.toBeInstanceOf(
                PolicyNotFoundException
            );
            await expect(promise).rejects.toMatchObject({
                module: 'policy',
                statusCode: EnumPolicyStatusCodeError.notFound,
                statusCodeKey:
                    EnumPolicyStatusCodeError[
                        EnumPolicyStatusCodeError.notFound
                    ],
                httpStatus: HttpStatus.NOT_FOUND,
                messagePath: 'policy.error.notFound',
            });
            expect(policyRepository.delete).not.toHaveBeenCalled();
        });

        it('deletes the policy and stages the admin-policy-delete activity log', async () => {
            roleDomain.existsById.mockResolvedValue(true);
            policyRepository.existsByRoleIdAndId.mockResolvedValue(true);
            policyRepository.delete.mockResolvedValue(policy);
            const preparedEvent: IActivityLogStagedEvent = {
                action: EnumActivityLogAction.adminPolicyDelete,
                metadata: {},
                onError: false,
            };
            activityLogDomain.prepare.mockReturnValue(preparedEvent);

            const result = await domain.deleteByAdmin('role-1', 'policy-1');

            expect(result).toBe(policy);
            expect(policyRepository.delete).toHaveBeenCalledWith('policy-1');
            expect(activityLogDomain.prepare).toHaveBeenCalledWith({
                action: EnumActivityLogAction.adminPolicyDelete,
            });
            expect(activityLogDomain.stagePrepared).toHaveBeenCalledWith([
                preparedEvent,
            ]);
        });
    });

    describe('validateRoleExists', () => {
        it('resolves when the role exists', async () => {
            roleDomain.existsById.mockResolvedValue(true);

            await expect(
                domain['validateRoleExists']('role-1')
            ).resolves.toBeUndefined();
        });

        it('throws RoleNotFoundException when the role does not exist', async () => {
            roleDomain.existsById.mockResolvedValue(false);

            const promise = domain['validateRoleExists']('role-1');

            await expect(promise).rejects.toBeInstanceOf(RoleNotFoundException);
            await expect(promise).rejects.toMatchObject({
                module: 'role',
                statusCode: EnumRoleStatusCodeError.notFound,
                statusCodeKey:
                    EnumRoleStatusCodeError[EnumRoleStatusCodeError.notFound],
                httpStatus: HttpStatus.NOT_FOUND,
                messagePath: 'role.error.notFound',
            });
        });
    });
});
