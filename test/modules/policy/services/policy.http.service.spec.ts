import { Test } from '@nestjs/testing';
import type { TestingModule } from '@nestjs/testing';
import { mock } from 'vitest-mock-extended';
import type { MockProxy } from 'vitest-mock-extended';
import { subject } from '@casl/ability';
import { RequestContextMissingException } from '@common/request/exceptions/request.context-missing.exception';
import {
    EnumPolicyAction,
    EnumPolicySubject,
    EnumRoleScope,
    type Policy,
} from '@generated/prisma-client/client';
import { PolicyAbilityStoreKey } from '@modules/policy/constants/policy.constant';
import { PolicyAbilityDomain } from '@modules/policy/domains/policy.ability.domain';
import { PolicyForbiddenException } from '@modules/policy/exceptions/policy.forbidden.exception';
import type { PolicyCreateRequestDto } from '@modules/policy/dtos/request/policy.create.request.dto';
import type { PolicyUpdateRequestDto } from '@modules/policy/dtos/request/policy.update.request.dto';
import { PolicyDomain } from '@modules/policy/domains/policy.domain';
import { PolicyHttpService } from '@modules/policy/services/policy.http.service';
import { RoleDomain } from '@modules/role/domains/role.domain';
import type { IRoleWithPolicies } from '@modules/role/interfaces/role.interface';

describe('PolicyHttpService', () => {
    const policyDomain: MockProxy<PolicyDomain> = mock<PolicyDomain>();
    const roleDomain: MockProxy<RoleDomain> = mock<RoleDomain>();
    const policyAbilityDomain: MockProxy<PolicyAbilityDomain> =
        mock<PolicyAbilityDomain>();
    const now = new Date('2026-01-01T00:00:00.000Z');
    const role = {
        id: 'role-id',
        scope: EnumRoleScope.platform,
        key: 'admin',
        name: 'Admin',
        description: null,
        createdAt: now,
        createdBy: null,
        updatedAt: now,
        updatedBy: null,
        policies: [],
    } satisfies IRoleWithPolicies;
    const policy = {
        id: 'policy-id',
        roleId: 'role-id',
        subject: EnumPolicySubject.User,
        action: [EnumPolicyAction.read],
        conditions: null,
        inverted: false,
        reason: null,
        createdAt: now,
        createdBy: null,
        updatedAt: now,
        updatedBy: null,
    } satisfies Policy;
    const createBody: PolicyCreateRequestDto = {
        subject: EnumPolicySubject.User,
        action: [EnumPolicyAction.read],
    };
    const updateBody: PolicyUpdateRequestDto = {
        action: [EnumPolicyAction.update],
        inverted: true,
        reason: 'blocked',
    };
    let service: PolicyHttpService;

    beforeEach(async () => {
        vi.resetAllMocks();
        roleDomain.getOne.mockResolvedValue(role);

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                PolicyHttpService,
                { provide: PolicyDomain, useValue: policyDomain },
                { provide: RoleDomain, useValue: roleDomain },
                { provide: PolicyAbilityDomain, useValue: policyAbilityDomain },
            ],
        }).compile();

        service = module.get(PolicyHttpService);
    });

    describe('listByAdmin', () => {
        it('requests the Role read where and forwards it to the domain', async () => {
            const accessibleWhere = { scope: EnumRoleScope.platform };
            policyAbilityDomain.accessibleWhere.mockReturnValue(
                accessibleWhere
            );
            policyDomain.findManyByRole.mockResolvedValue([policy]);

            await expect(service.listByAdmin('role-id')).resolves.toEqual({
                data: { policies: [policy] },
            });
            expect(policyAbilityDomain.accessibleWhere).toHaveBeenCalledWith(
                EnumPolicyAction.read,
                EnumPolicySubject.Role
            );
            expect(policyDomain.findManyByRole).toHaveBeenCalledWith(
                'role-id',
                accessibleWhere
            );
        });

        it('throws PolicyForbiddenException and never lists when the ability has no Role read rule', async () => {
            policyAbilityDomain.accessibleWhere.mockImplementation(() => {
                throw new PolicyForbiddenException();
            });

            await expect(service.listByAdmin('role-id')).rejects.toThrow(
                PolicyForbiddenException
            );
            expect(policyDomain.findManyByRole).not.toHaveBeenCalled();
        });
    });

    describe('listBySystem', () => {
        it('lists without a where and never touches the ability', async () => {
            policyDomain.findManyByRole.mockResolvedValue([policy]);

            await expect(service.listBySystem('role-id')).resolves.toEqual({
                data: { policies: [policy] },
            });
            expect(policyDomain.findManyByRole).toHaveBeenCalledWith('role-id');
            expect(policyAbilityDomain.accessibleWhere).not.toHaveBeenCalled();
        });
    });

    describe('createByAdmin', () => {
        it('checks update on the owning role and wraps the created policy', async () => {
            policyDomain.createByAdmin.mockResolvedValue(policy);

            await expect(
                service.createByAdmin('role-id', createBody)
            ).resolves.toEqual({ data: policy });
            expect(roleDomain.getOne).toHaveBeenCalledWith('role-id');
            expect(policyAbilityDomain.assertCan).toHaveBeenCalledWith(
                EnumPolicyAction.update,
                subject(EnumPolicySubject.Role, role)
            );
            expect(policyDomain.createByAdmin).toHaveBeenCalledWith(
                'role-id',
                createBody
            );
        });

        it('throws PolicyForbiddenException and never creates when the role record is denied', async () => {
            policyAbilityDomain.assertCan.mockImplementation(() => {
                throw new PolicyForbiddenException();
            });

            await expect(
                service.createByAdmin('role-id', createBody)
            ).rejects.toThrow(PolicyForbiddenException);
            expect(policyDomain.createByAdmin).not.toHaveBeenCalled();
        });

        it('throws RequestContextMissingException and writes nothing when no ability is stored', async () => {
            policyAbilityDomain.assertCan.mockImplementation(() => {
                throw new RequestContextMissingException(PolicyAbilityStoreKey);
            });

            await expect(
                service.createByAdmin('role-id', createBody)
            ).rejects.toThrow(RequestContextMissingException);
            expect(policyDomain.createByAdmin).not.toHaveBeenCalled();
        });
    });

    describe('updateByAdmin', () => {
        it('checks update on the owning role before updating', async () => {
            policyDomain.updateByAdmin.mockResolvedValue(policy);

            await expect(
                service.updateByAdmin('role-id', 'policy-id', updateBody)
            ).resolves.toEqual({ data: policy });

            expect(roleDomain.getOne).toHaveBeenCalledWith('role-id');
            expect(policyAbilityDomain.assertCan).toHaveBeenCalledWith(
                EnumPolicyAction.update,
                subject(EnumPolicySubject.Role, role)
            );
            expect(policyDomain.updateByAdmin).toHaveBeenCalledWith(
                'role-id',
                'policy-id',
                updateBody
            );
        });

        it('throws PolicyForbiddenException and never updates when the role record is denied', async () => {
            policyAbilityDomain.assertCan.mockImplementation(() => {
                throw new PolicyForbiddenException();
            });

            await expect(
                service.updateByAdmin('role-id', 'policy-id', updateBody)
            ).rejects.toThrow(PolicyForbiddenException);
            expect(policyDomain.updateByAdmin).not.toHaveBeenCalled();
        });

        it('throws RequestContextMissingException and writes nothing when no ability is stored', async () => {
            policyAbilityDomain.assertCan.mockImplementation(() => {
                throw new RequestContextMissingException(PolicyAbilityStoreKey);
            });

            await expect(
                service.updateByAdmin('role-id', 'policy-id', updateBody)
            ).rejects.toThrow(RequestContextMissingException);
            expect(policyDomain.updateByAdmin).not.toHaveBeenCalled();
        });
    });

    describe('deleteByAdmin', () => {
        it('checks update on the owning role and returns an empty response after deleting', async () => {
            policyDomain.deleteByAdmin.mockResolvedValue(policy);

            await expect(
                service.deleteByAdmin('role-id', 'policy-id')
            ).resolves.toEqual({});

            expect(roleDomain.getOne).toHaveBeenCalledWith('role-id');
            expect(policyAbilityDomain.assertCan).toHaveBeenCalledWith(
                EnumPolicyAction.update,
                subject(EnumPolicySubject.Role, role)
            );
            expect(policyDomain.deleteByAdmin).toHaveBeenCalledWith(
                'role-id',
                'policy-id'
            );
        });

        it('throws PolicyForbiddenException and never deletes when the role record is denied', async () => {
            policyAbilityDomain.assertCan.mockImplementation(() => {
                throw new PolicyForbiddenException();
            });

            await expect(
                service.deleteByAdmin('role-id', 'policy-id')
            ).rejects.toThrow(PolicyForbiddenException);
            expect(policyDomain.deleteByAdmin).not.toHaveBeenCalled();
        });

        it('throws RequestContextMissingException when no ability is stored', async () => {
            policyAbilityDomain.assertCan.mockImplementation(() => {
                throw new RequestContextMissingException(PolicyAbilityStoreKey);
            });

            await expect(
                service.deleteByAdmin('role-id', 'policy-id')
            ).rejects.toThrow(RequestContextMissingException);
            expect(policyDomain.deleteByAdmin).not.toHaveBeenCalled();
        });
    });
});
