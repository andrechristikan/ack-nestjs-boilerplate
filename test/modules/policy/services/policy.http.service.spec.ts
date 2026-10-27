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
import { RoleNotFoundException } from '@modules/role/exceptions/role.not-found.exception';
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
        policyRevision: 0,
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
        it('passes { role: scope(read, Role) } as additionalWhere', async () => {
            const scopeWhere = { scope: EnumRoleScope.platform };
            policyAbilityDomain.scope.mockReturnValue(scopeWhere);
            policyDomain.findManyByRole.mockResolvedValue([policy]);

            await expect(service.listByAdmin('role-id')).resolves.toEqual({
                data: { policies: [policy] },
            });
            expect(policyAbilityDomain.scope).toHaveBeenCalledWith(
                EnumPolicyAction.read,
                EnumPolicySubject.Role
            );
            expect(policyDomain.findManyByRole).toHaveBeenCalledWith(
                'role-id',
                { role: scopeWhere }
            );
        });

        it('throws PolicyForbiddenException and never lists when the ability has no Role read rule', async () => {
            policyAbilityDomain.scope.mockImplementation(() => {
                throw new PolicyForbiddenException();
            });

            await expect(service.listByAdmin('role-id')).rejects.toThrow(
                PolicyForbiddenException
            );
            expect(policyDomain.findManyByRole).not.toHaveBeenCalled();
        });
    });

    describe('listBySystem', () => {
        it('lists with an empty where and never touches the ability', async () => {
            policyDomain.findManyByRole.mockResolvedValue([policy]);

            await expect(service.listBySystem('role-id')).resolves.toEqual({
                data: { policies: [policy] },
            });
            expect(policyDomain.findManyByRole).toHaveBeenCalledWith(
                'role-id',
                {}
            );
            expect(policyAbilityDomain.scope).not.toHaveBeenCalled();
        });
    });

    describe.each([
        {
            method: 'createByAdmin',
            call: () => service.createByAdmin('role-id', createBody),
            domainMethod: 'createByAdmin',
            domainArgs: [role, createBody],
        },
        {
            method: 'updateByAdmin',
            call: () =>
                service.updateByAdmin('role-id', 'policy-id', updateBody),
            domainMethod: 'updateByAdmin',
            domainArgs: [role, 'policy-id', updateBody],
        },
        {
            method: 'deleteByAdmin',
            call: () => service.deleteByAdmin('role-id', 'policy-id'),
            domainMethod: 'deleteByAdmin',
            domainArgs: [role, 'policy-id'],
        },
    ] as const)('$method', ({ call, domainMethod, domainArgs }) => {
        beforeEach(() => {
            policyDomain[domainMethod].mockResolvedValue(policy);
        });

        it('loads the role by identity and authorizes update on that role', async () => {
            await call();

            expect(roleDomain.getOne).toHaveBeenCalledWith('role-id');
            expect(policyAbilityDomain.authorize).toHaveBeenCalledWith(
                EnumPolicyAction.update,
                subject(EnumPolicySubject.Role, role)
            );
            expect(policyAbilityDomain.scope).not.toHaveBeenCalled();
        });

        it('propagates RoleNotFoundException from the identity load and does not call the domain', async () => {
            roleDomain.getOne.mockRejectedValue(new RoleNotFoundException());

            await expect(call()).rejects.toThrow(RoleNotFoundException);
            expect(roleDomain.getOne).toHaveBeenCalledWith('role-id');
            expect(policyAbilityDomain.authorize).not.toHaveBeenCalled();
            expect(policyDomain[domainMethod]).not.toHaveBeenCalled();
        });

        it('throws 403 when authorize(update, subject(Role, role)) denies and does not call the domain', async () => {
            policyAbilityDomain.authorize.mockImplementation(() => {
                throw new PolicyForbiddenException();
            });

            await expect(call()).rejects.toThrow(PolicyForbiddenException);
            expect(roleDomain.getOne).toHaveBeenCalledWith('role-id');
            expect(policyAbilityDomain.authorize).toHaveBeenCalledWith(
                EnumPolicyAction.update,
                subject(EnumPolicySubject.Role, role)
            );
            expect(policyDomain[domainMethod]).not.toHaveBeenCalled();
        });

        it('throws RequestContextMissingException and writes nothing when no ability is stored', async () => {
            policyAbilityDomain.authorize.mockImplementation(() => {
                throw new RequestContextMissingException(PolicyAbilityStoreKey);
            });

            await expect(call()).rejects.toThrow(
                RequestContextMissingException
            );
            expect(roleDomain.getOne).toHaveBeenCalledWith('role-id');
            expect(policyDomain[domainMethod]).not.toHaveBeenCalled();
        });

        it('passes the loaded role to the domain', async () => {
            await call();

            expect(policyDomain[domainMethod]).toHaveBeenCalledWith(
                ...domainArgs
            );
        });
    });
});
