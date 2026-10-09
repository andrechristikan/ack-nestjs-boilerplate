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
import type { IActivityLogStaged } from '@modules/activity-log/interfaces/activity-log.interface';
import { UserStoreKey } from '@modules/user/constants/user.constant';
import { PolicyStoreKey } from '@modules/policy/constants/policy.constant';
import { expectRequestGuardMissingWithKey } from '@test/unit/helpers/test.unit.request.helper';
import { PolicyDomain } from '@modules/policy/domains/policy.domain';
import { EnumPolicyStatusCodeError } from '@modules/policy/enums/policy.status-code.enum';
import { PolicyAbilityFactory } from '@modules/policy/factories/policy.factory';
import { PolicyRepository } from '@modules/policy/repositories/policy.repository';
import type { PolicyRequestDto } from '@modules/policy/dtos/request/policy.request.dto';
import type { PolicyUpdateRequestDto } from '@modules/policy/dtos/request/policy.update.request.dto';
import { RoleDomain } from '@modules/role/domains/role.domain';
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

    const baseUser: IUser = {
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
            type: EnumRoleType.admin,
            createdAt: new Date('2026-01-01T00:00:00.000Z'),
            createdBy: null,
            updatedAt: new Date('2026-01-01T00:00:00.000Z'),
            updatedBy: null,
            policies: [policy],
        },
        twoFactor: null,
    };

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
        it('throws RequestGuardMissingException when the user store is empty', () => {
            let thrown: unknown;
            try {
                domain.validatePolicyGuard(null, [], []);
            } catch (error) {
                thrown = error;
            }

            expectRequestGuardMissingWithKey(thrown, UserStoreKey);
        });

        it('throws RequestGuardMissingException when the policy store is empty, even for a superAdmin', () => {
            const user = {
                ...baseUser,
                role: { ...baseUser.role, type: EnumRoleType.superAdmin },
            };

            let thrown: unknown;
            try {
                domain.validatePolicyGuard(user, null, []);
            } catch (error) {
                thrown = error;
            }

            expectRequestGuardMissingWithKey(thrown, PolicyStoreKey);
        });

        it('returns true for a superAdmin without checking required policies', () => {
            const user = {
                ...baseUser,
                role: { ...baseUser.role, type: EnumRoleType.superAdmin },
            };

            const result = domain.validatePolicyGuard(user, [], []);

            expect(result).toBe(true);
            expect(policyAbilityFactory.createByUser).not.toHaveBeenCalled();
        });

        it('throws PolicyForbiddenException when the built ability lacks a required policy', () => {
            const user = baseUser;
            const required: PolicyRequestDto[] = [
                {
                    subject: EnumPolicySubject.user,
                    action: [EnumPolicyAction.manage],
                },
            ];
            const ability = { can: vi.fn() };
            policyAbilityFactory.createByUser.mockReturnValue(ability as never);
            policyAbilityFactory.handlerPolicies.mockReturnValue(false);

            let thrown: unknown;
            try {
                domain.validatePolicyGuard(user, [policy], required);
            } catch (error) {
                thrown = error;
            }

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
            expect(policyAbilityFactory.createByUser).toHaveBeenCalledWith([
                policy,
            ]);
            expect(policyAbilityFactory.handlerPolicies).toHaveBeenCalledWith(
                ability,
                required
            );
        });

        it('returns true when the built ability holds every required policy', () => {
            const user = baseUser;
            const required: PolicyRequestDto[] = [
                {
                    subject: EnumPolicySubject.user,
                    action: [EnumPolicyAction.manage],
                },
            ];
            const ability = { can: vi.fn() };
            policyAbilityFactory.createByUser.mockReturnValue(ability as never);
            policyAbilityFactory.handlerPolicies.mockReturnValue(true);

            const result = domain.validatePolicyGuard(user, [policy], required);

            expect(result).toBe(true);
        });
    });

    describe('getManyByRole', () => {
        it('throws RoleNotFoundException when the role does not exist', async () => {
            roleDomain.existsById.mockResolvedValue(false);

            const promise = domain.getManyByRole('role-1');

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

            const result = await domain.getManyByRole('role-1');

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
            const preparedActivityLog: IActivityLogStaged = {
                action: EnumActivityLogAction.adminPolicyCreate,
                metadata: {},
                onError: false,
                userId: null,
                createdBy: null,
                workspaceId: null,
            };
            activityLogDomain.prepare.mockReturnValue(preparedActivityLog);

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
                preparedActivityLog,
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
            const preparedActivityLog: IActivityLogStaged = {
                action: EnumActivityLogAction.adminPolicyUpdate,
                metadata: {},
                onError: false,
                userId: null,
                createdBy: null,
                workspaceId: null,
            };
            activityLogDomain.prepare.mockReturnValue(preparedActivityLog);

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
                preparedActivityLog,
            ]);
        });
    });

    describe('deleteByAdmin', () => {
        it('throws RoleNotFoundException when the role does not exist', async () => {
            roleDomain.existsById.mockResolvedValue(false);

            const promise = domain.deleteByAdmin('role-1', 'policy-1');

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
            const preparedActivityLog: IActivityLogStaged = {
                action: EnumActivityLogAction.adminPolicyDelete,
                metadata: {},
                onError: false,
                userId: null,
                createdBy: null,
                workspaceId: null,
            };
            activityLogDomain.prepare.mockReturnValue(preparedActivityLog);

            const result = await domain.deleteByAdmin('role-1', 'policy-1');

            expect(result).toBe(policy);
            expect(policyRepository.delete).toHaveBeenCalledWith('policy-1');
            expect(activityLogDomain.prepare).toHaveBeenCalledWith({
                action: EnumActivityLogAction.adminPolicyDelete,
            });
            expect(activityLogDomain.stagePrepared).toHaveBeenCalledWith([
                preparedActivityLog,
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
