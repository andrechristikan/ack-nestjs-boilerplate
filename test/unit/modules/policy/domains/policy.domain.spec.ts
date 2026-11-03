import { HttpStatus } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import type { TestingModule } from '@nestjs/testing';
import { mock } from 'vitest-mock-extended';
import type { MockProxy } from 'vitest-mock-extended';
import { AppUnknownException } from '@app/exceptions/app.unknown.exception';
import { DatabaseUtil } from '@common/database/utils/database.util';
import {
    EnumPolicyAction,
    EnumPolicySubject,
    EnumRoleType,
    EnumUserGender,
    EnumUserSignUpFrom,
    EnumUserSignUpWith,
    EnumUserStatus,
} from '@generated/prisma-client/client';
import type { Policy } from '@generated/prisma-client/client';
import { PolicyDomain } from '@modules/policy/domains/policy.domain';
import { EnumPolicyStatusCodeError } from '@modules/policy/enums/policy.status-code.enum';
import { PolicyAbilityFactory } from '@modules/policy/factories/policy.factory';
import { PolicyRepository } from '@modules/policy/repositories/policy.repository';
import type { PolicyRequestDto } from '@modules/policy/dtos/request/policy.request.dto';
import type { PolicyUpdateRequestDto } from '@modules/policy/dtos/request/policy.update.request.dto';
import type { IUser } from '@modules/user/interfaces/user.interface';

describe('PolicyDomain', () => {
    const policyAbilityFactory: MockProxy<PolicyAbilityFactory> =
        mock<PolicyAbilityFactory>();
    const policyRepository: MockProxy<PolicyRepository> =
        mock<PolicyRepository>();
    const databaseUtil: MockProxy<DatabaseUtil> = mock<DatabaseUtil>();

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
                { provide: DatabaseUtil, useValue: databaseUtil },
            ],
        }).compile();

        domain = module.get(PolicyDomain);
    });

    describe('validatePolicyGuard', () => {
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
        it('returns the policies of the role', async () => {
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

        it('throws PolicyExistException when the create collides on the subject index, with no read before the write', async () => {
            const collision = new Error('subject collision');
            policyRepository.create.mockRejectedValue(collision);
            databaseUtil.isUniqueCollision.mockReturnValue(true);

            const promise = domain.createByAdmin('role-1', body);

            await expect(promise).rejects.toMatchObject({
                module: 'policy',
                statusCode: EnumPolicyStatusCodeError.exist,
                statusCodeKey:
                    EnumPolicyStatusCodeError[EnumPolicyStatusCodeError.exist],
                httpStatus: HttpStatus.CONFLICT,
                messagePath: 'policy.error.exist',
            });
            expect(databaseUtil.isUniqueCollision).toHaveBeenCalledWith(
                collision,
                'subject'
            );
        });

        it('wraps a non-collision create error in AppUnknownException', async () => {
            const otherError = new Error('unexpected');
            policyRepository.create.mockRejectedValue(otherError);
            databaseUtil.isUniqueCollision.mockReturnValue(false);

            await expect(
                domain.createByAdmin('role-1', body)
            ).rejects.toMatchObject({
                constructor: AppUnknownException,
                rawError: otherError,
            });
        });

        it('creates the policy for the role', async () => {
            policyRepository.create.mockResolvedValue(policy);

            const result = await domain.createByAdmin('role-1', body);

            expect(result).toBe(policy);
            expect(policyRepository.create).toHaveBeenCalledWith(
                'role-1',
                body
            );
        });
    });

    describe('updateByAdmin', () => {
        const body: PolicyUpdateRequestDto = {
            action: [EnumPolicyAction.read],
        };

        it('throws PolicyNotFoundException when the policy does not exist under the role', async () => {
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
            expect(policyRepository.existsByRoleIdAndId).toHaveBeenCalledWith(
                'role-1',
                'policy-1'
            );
            expect(policyRepository.update).not.toHaveBeenCalled();
        });

        it('updates the policy', async () => {
            policyRepository.existsByRoleIdAndId.mockResolvedValue(true);
            policyRepository.update.mockResolvedValue(policy);

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
        });
    });

    describe('deleteByAdmin', () => {
        it('throws PolicyNotFoundException when the policy does not exist under the role', async () => {
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

        it('deletes the policy', async () => {
            policyRepository.existsByRoleIdAndId.mockResolvedValue(true);
            policyRepository.delete.mockResolvedValue(policy);

            const result = await domain.deleteByAdmin('role-1', 'policy-1');

            expect(result).toBe(policy);
            expect(policyRepository.delete).toHaveBeenCalledWith('policy-1');
        });
    });
});
