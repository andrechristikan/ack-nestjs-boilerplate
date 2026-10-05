import { Test } from '@nestjs/testing';
import type { TestingModule } from '@nestjs/testing';
import { mock } from 'vitest-mock-extended';
import type { MockProxy } from 'vitest-mock-extended';
import {
    EnumPolicyAction,
    EnumPolicySubject,
} from '@generated/prisma-client/client';
import type { Policy } from '@generated/prisma-client/client';
import { PolicyDomain } from '@modules/policy/domains/policy.domain';
import { PolicyHttpService } from '@modules/policy/services/policy.http.service';
import type { PolicyRequestDto } from '@modules/policy/dtos/request/policy.request.dto';
import type { PolicyUpdateRequestDto } from '@modules/policy/dtos/request/policy.update.request.dto';

describe('PolicyHttpService', () => {
    const policyDomain: MockProxy<PolicyDomain> = mock<PolicyDomain>();

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

    describe('listByRole', () => {
        it('wraps the policies found for the role in the response envelope', async () => {
            policyDomain.getManyByRole.mockResolvedValue([policy]);

            const result = await service.listByRole('role-1');

            expect(result).toEqual({ data: { policies: [policy] } });
            expect(policyDomain.getManyByRole).toHaveBeenCalledWith('role-1');
        });
    });

    describe('createByAdmin', () => {
        it('wraps the created policy in the response envelope', async () => {
            const body: PolicyRequestDto = {
                subject: EnumPolicySubject.user,
                action: [EnumPolicyAction.manage],
            };
            policyDomain.createByAdmin.mockResolvedValue(policy);

            const result = await service.createByAdmin('role-1', body);

            expect(result).toEqual({ data: policy });
            expect(policyDomain.createByAdmin).toHaveBeenCalledWith(
                'role-1',
                body
            );
        });
    });

    describe('updateByAdmin', () => {
        it('wraps the updated policy in the response envelope', async () => {
            const body: PolicyUpdateRequestDto = {
                action: [EnumPolicyAction.read],
            };
            policyDomain.updateByAdmin.mockResolvedValue(policy);

            const result = await service.updateByAdmin(
                'role-1',
                'policy-1',
                body
            );

            expect(result).toEqual({ data: policy });
            expect(policyDomain.updateByAdmin).toHaveBeenCalledWith(
                'role-1',
                'policy-1',
                body
            );
        });
    });

    describe('deleteByAdmin', () => {
        it('returns nothing after deleting the policy', async () => {
            policyDomain.deleteByAdmin.mockResolvedValue(policy);

            const result = await service.deleteByAdmin('role-1', 'policy-1');

            expect(result).toBeUndefined();
            expect(policyDomain.deleteByAdmin).toHaveBeenCalledWith(
                'role-1',
                'policy-1'
            );
        });
    });
});
