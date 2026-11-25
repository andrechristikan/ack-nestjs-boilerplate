import { Test } from '@nestjs/testing';
import type { TestingModule } from '@nestjs/testing';
import { mock } from 'vitest-mock-extended';
import type { MockProxy } from 'vitest-mock-extended';
import type { IDatabaseTransactionClient } from '@common/database/interfaces/database.client.interface';
import { ConfigService } from '@nestjs/config';
import { DatabaseUniqueConstraintCode } from '@common/database/constants/database.constant';
import { buildConfigService } from '@test/unit/helpers/test.unit.config.helper';
import {
    TestUnitKitConfigValues,
    TestUnitKitProviders,
} from '@test/unit/helpers/test.unit.kit.helper';
import {
    EnumPolicyAction,
    EnumPolicySubject,
    EnumRoleType,
    Prisma,
} from '@generated/prisma-client/client';
import type { Policy } from '@generated/prisma-client/client';
import { PolicyService } from '@modules/policy/services/policy.service';
import { EnumPolicyStatusCodeError } from '@modules/policy/enums/policy.status-code.enum';
import { PolicyNotFoundException } from '@modules/policy/exceptions/policy.not-found.exception';
import { PolicyAbilityFactory } from '@modules/policy/factories/policy.ability.factory';
import { PolicyRepository } from '@modules/policy/repositories/policy.repository';
import type { PolicyRequestDto } from '@modules/policy/dtos/request/policy.request.dto';
import type { PolicyUpdateRequestDto } from '@modules/policy/dtos/request/policy.update.request.dto';
import type { IUser } from '@modules/user/interfaces/user.interface';
import { buildUser } from '@test/unit/helpers/test.unit.request.helper';

describe('PolicyService', () => {
    const policyAbilityFactory: MockProxy<PolicyAbilityFactory> =
        mock<PolicyAbilityFactory>();
    const policyRepository: MockProxy<PolicyRepository> =
        mock<PolicyRepository>();
    const tx: MockProxy<IDatabaseTransactionClient> =
        mock<IDatabaseTransactionClient>();

    let service: PolicyService;

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

    const baseUser: IUser = buildUser('user-1', 'andre@example.com');

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                PolicyService,
                {
                    provide: PolicyAbilityFactory,
                    useValue: policyAbilityFactory,
                },
                { provide: PolicyRepository, useValue: policyRepository },
                ...TestUnitKitProviders,
                {
                    provide: ConfigService,
                    useValue: buildConfigService(TestUnitKitConfigValues),
                },
            ],
        }).compile();

        service = module.get(PolicyService);
    });

    describe('validatePolicyGuard', () => {
        it('returns true for a superAdmin without checking required policies', () => {
            const user = {
                ...baseUser,
                role: { ...baseUser.role, type: EnumRoleType.superAdmin },
            };

            const result = service.validatePolicyGuard(user, [], []);

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
                service.validatePolicyGuard(user, [policy], required);
            } catch (error) {
                thrown = error;
            }

            expect(thrown).toMatchObject({
                module: 'policy',
                statusCode: EnumPolicyStatusCodeError.forbidden,
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

            const result = service.validatePolicyGuard(
                user,
                [policy],
                required
            );

            expect(result).toBe(true);
        });
    });

    describe('assertRoleTypeAllowed', () => {
        it('throws PolicyRoleTypeInvalidException for a user role', () => {
            expect(() =>
                service.assertRoleTypeAllowed(EnumRoleType.user)
            ).toThrow(
                expect.objectContaining({
                    module: 'policy',
                    statusCode: EnumPolicyStatusCodeError.roleTypeInvalid,
                })
            );
        });

        it.each([EnumRoleType.admin, EnumRoleType.superAdmin])(
            'passes a %s role',
            roleType => {
                expect(() =>
                    service.assertRoleTypeAllowed(roleType)
                ).not.toThrow();
            }
        );
    });

    describe('createByAdminInTx', () => {
        const body: PolicyRequestDto = {
            subject: EnumPolicySubject.user,
            action: [EnumPolicyAction.manage],
        };

        it('lets the repository rejection through unmapped', async () => {
            const collision = new Prisma.PrismaClientKnownRequestError(
                'subject collision',
                {
                    code: DatabaseUniqueConstraintCode,
                    clientVersion: 'test',
                    meta: { target: ['subject'] },
                }
            );
            policyRepository.createInTx.mockRejectedValue(collision);

            await expect(
                service.createByAdminInTx(tx, 'role-1', body)
            ).rejects.toBe(collision);
        });

        it('creates the policy for the role', async () => {
            policyRepository.createInTx.mockResolvedValue(policy);

            const result = await service.createByAdminInTx(tx, 'role-1', body);

            expect(result).toBe(policy);
            expect(policyRepository.createInTx).toHaveBeenCalledWith(
                tx,
                'role-1',
                body
            );
        });
    });

    describe('updateByAdminInTx', () => {
        const body: PolicyUpdateRequestDto = {
            action: [EnumPolicyAction.read],
        };

        it('passes the exception the guarded update rejects with', async () => {
            const failure = new PolicyNotFoundException();
            policyRepository.updateInTx.mockRejectedValue(failure);

            const promise = service.updateByAdminInTx(
                tx,
                'role-1',
                'policy-1',
                body
            );

            await expect(promise).rejects.toBe(failure);
            expect(policyRepository.updateInTx).toHaveBeenCalledWith(
                tx,
                'role-1',
                'policy-1',
                body
            );
        });

        it('updates the policy', async () => {
            policyRepository.updateInTx.mockResolvedValue(policy);

            const result = await service.updateByAdminInTx(
                tx,
                'role-1',
                'policy-1',
                body
            );

            expect(result).toBe(policy);
            expect(policyRepository.updateInTx).toHaveBeenCalledWith(
                tx,
                'role-1',
                'policy-1',
                body
            );
        });
    });

    describe('getOneByRoleAndId', () => {
        it('returns the row read on the client', async () => {
            policyRepository.findOneByRoleIdAndId.mockResolvedValue(policy);

            const result = await service.getOneByRoleAndId(
                'role-1',
                'policy-1'
            );

            expect(result).toBe(policy);
            expect(policyRepository.findOneByRoleIdAndId).toHaveBeenCalledWith(
                'role-1',
                'policy-1'
            );
        });

        it('throws PolicyNotFoundException when the row is absent', async () => {
            policyRepository.findOneByRoleIdAndId.mockResolvedValue(null);

            await expect(
                service.getOneByRoleAndId('role-1', 'policy-1')
            ).rejects.toMatchObject({
                module: 'policy',
                statusCode: EnumPolicyStatusCodeError.notFound,
            });
        });
    });

    describe('deleteByAdminInTx', () => {
        it('passes the exception the guarded delete rejects with', async () => {
            const failure = new PolicyNotFoundException();
            policyRepository.deleteInTx.mockRejectedValue(failure);

            await expect(
                service.deleteByAdminInTx(tx, 'role-1', 'policy-1')
            ).rejects.toBe(failure);
            expect(policyRepository.deleteInTx).toHaveBeenCalledWith(
                tx,
                'role-1',
                'policy-1'
            );
        });

        it('deletes the policy and returns the deleted row', async () => {
            policyRepository.deleteInTx.mockResolvedValue(policy);

            const result = await service.deleteByAdminInTx(
                tx,
                'role-1',
                'policy-1'
            );

            expect(result).toBe(policy);
            expect(policyRepository.deleteInTx).toHaveBeenCalledWith(
                tx,
                'role-1',
                'policy-1'
            );
        });
    });
});
