import { Test } from '@nestjs/testing';
import type { TestingModule } from '@nestjs/testing';
import { mock } from 'vitest-mock-extended';
import type { MockProxy } from 'vitest-mock-extended';
import {
    EnumPolicyAction,
    EnumPolicySubject,
    type Policy,
} from '@generated/prisma-client/client';
import type { PolicyCreateRequestDto } from '@modules/policy/dtos/request/policy.create.request.dto';
import type { PolicyUpdateRequestDto } from '@modules/policy/dtos/request/policy.update.request.dto';
import { PolicyDomain } from '@modules/policy/domains/policy.domain';
import { PolicyHttpService } from '@modules/policy/services/policy.http.service';

describe('PolicyHttpService', () => {
    const policyDomain: MockProxy<PolicyDomain> = mock<PolicyDomain>();
    const now = new Date('2026-01-01T00:00:00.000Z');
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

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                PolicyHttpService,
                { provide: PolicyDomain, useValue: policyDomain },
            ],
        }).compile();

        service = module.get(PolicyHttpService);
    });

    it('wraps policies returned for a role', async () => {
        policyDomain.findManyByRole.mockResolvedValue([policy]);

        await expect(service.listByRole('role-id')).resolves.toEqual({
            data: { policies: [policy] },
        });
        expect(policyDomain.findManyByRole).toHaveBeenCalledWith('role-id');
    });

    it('wraps a created policy', async () => {
        policyDomain.createByAdmin.mockResolvedValue(policy);

        await expect(
            service.createByAdmin('role-id', createBody)
        ).resolves.toEqual({ data: policy });
        expect(policyDomain.createByAdmin).toHaveBeenCalledWith(
            'role-id',
            createBody
        );
    });

    it('wraps an updated policy', async () => {
        policyDomain.updateByAdmin.mockResolvedValue(policy);

        await expect(
            service.updateByAdmin('role-id', 'policy-id', updateBody)
        ).resolves.toEqual({ data: policy });
        expect(policyDomain.updateByAdmin).toHaveBeenCalledWith(
            'role-id',
            'policy-id',
            updateBody
        );
    });

    it('returns an empty response after deleting a policy', async () => {
        policyDomain.deleteByAdmin.mockResolvedValue(policy);

        await expect(
            service.deleteByAdmin('role-id', 'policy-id')
        ).resolves.toEqual({});
        expect(policyDomain.deleteByAdmin).toHaveBeenCalledWith(
            'role-id',
            'policy-id'
        );
    });
});
