import { Test } from '@nestjs/testing';
import type { TestingModule } from '@nestjs/testing';
import {
    EnumPolicyAction,
    EnumPolicySubject,
} from '@generated/prisma-client/client';
import type { Policy } from '@generated/prisma-client/client';
import { PolicyAbilityFactory } from '@modules/policy/factories/policy.factory';
import type { PolicyRequestDto } from '@modules/policy/dtos/request/policy.request.dto';

describe('PolicyAbilityFactory', () => {
    let factory: PolicyAbilityFactory;

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

    beforeEach(async () => {
        vi.resetAllMocks();

        const module: TestingModule = await Test.createTestingModule({
            providers: [PolicyAbilityFactory],
        }).compile();

        factory = module.get(PolicyAbilityFactory);
    });

    describe('createByUser', () => {
        it('builds an ability that can act on a subject a policy grants', () => {
            const ability = factory.createByUser([
                { ...policy, subject: EnumPolicySubject.user },
            ]);

            expect(
                ability.can(EnumPolicyAction.manage, EnumPolicySubject.user)
            ).toBe(true);
        });

        it('builds an ability that cannot act on a subject no policy grants', () => {
            const ability = factory.createByUser([]);

            expect(
                ability.can(EnumPolicyAction.manage, EnumPolicySubject.user)
            ).toBe(false);
        });
    });

    describe('handlerPolicies', () => {
        it('returns true when every required action on every subject is held', () => {
            const ability = factory.createByUser([
                {
                    ...policy,
                    subject: EnumPolicySubject.user,
                    action: [EnumPolicyAction.manage],
                },
            ]);
            const required: PolicyRequestDto[] = [
                {
                    subject: EnumPolicySubject.user,
                    action: [EnumPolicyAction.manage],
                },
            ];

            expect(factory.handlerPolicies(ability, required)).toBe(true);
        });

        it('returns false when one required action on one subject is missing', () => {
            const ability = factory.createByUser([
                {
                    ...policy,
                    subject: EnumPolicySubject.user,
                    action: [EnumPolicyAction.read],
                },
            ]);
            const required: PolicyRequestDto[] = [
                {
                    subject: EnumPolicySubject.user,
                    action: [EnumPolicyAction.manage],
                },
            ];

            expect(factory.handlerPolicies(ability, required)).toBe(false);
        });

        it('returns true for an empty required policy list', () => {
            const ability = factory.createByUser([]);

            expect(factory.handlerPolicies(ability, [])).toBe(true);
        });
    });
});
