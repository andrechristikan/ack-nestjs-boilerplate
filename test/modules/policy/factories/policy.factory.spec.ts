import { Test } from '@nestjs/testing';
import type { TestingModule } from '@nestjs/testing';
import {
    EnumPolicyAction,
    EnumPolicySubject,
} from '@generated/prisma-client/client';
import type { Policy } from '@generated/prisma-client/client';
import { PolicyAbilityFactory } from '@modules/policy/factories/policy.factory';
import type { PolicyRequestDto } from '@modules/policy/dtos/request/policy.request.dto';
import type { IPolicyAbilitySubject } from '@modules/policy/interfaces/policy.interface';

describe('PolicyAbilityFactory', () => {
    let factory: PolicyAbilityFactory;

    const buildPolicy = (overrides: Partial<Policy> = {}): Policy => ({
        id: 'policy-1',
        createdAt: new Date('2026-01-01T00:00:00.000Z'),
        createdBy: null,
        updatedAt: new Date('2026-01-01T00:00:00.000Z'),
        updatedBy: null,
        roleId: 'role-1',
        subject: EnumPolicySubject.user,
        action: [EnumPolicyAction.manage],
        ...overrides,
    });

    beforeEach(async () => {
        vi.resetAllMocks();

        const module: TestingModule = await Test.createTestingModule({
            providers: [PolicyAbilityFactory],
        }).compile();

        factory = module.get(PolicyAbilityFactory);
    });

    describe('createForUser', () => {
        it('builds an ability that can act on a subject a policy grants', () => {
            const ability = factory.createForUser([
                buildPolicy({ subject: EnumPolicySubject.user }),
            ]);

            expect(
                ability.can(EnumPolicyAction.manage, EnumPolicySubject.user)
            ).toBe(true);
        });

        it('builds an ability that cannot act on a subject no policy grants', () => {
            const ability = factory.createForUser([]);

            expect(
                ability.can(EnumPolicyAction.manage, EnumPolicySubject.user)
            ).toBe(false);
        });

        it('detects the subject type of an object instance through its constructor', () => {
            const ability = factory.createForUser([
                buildPolicy({ subject: EnumPolicySubject.user }),
            ]);
            const userInstance = {
                constructor: EnumPolicySubject.user,
            } as unknown as IPolicyAbilitySubject;

            expect(ability.can(EnumPolicyAction.manage, userInstance)).toBe(
                true
            );
        });

        it('denies an object instance whose constructor matches no granted subject', () => {
            const ability = factory.createForUser([
                buildPolicy({ subject: EnumPolicySubject.user }),
            ]);
            const roleInstance = {
                constructor: EnumPolicySubject.role,
            } as unknown as IPolicyAbilitySubject;

            expect(ability.can(EnumPolicyAction.manage, roleInstance)).toBe(
                false
            );
        });
    });

    describe('handlerPolicies', () => {
        it('returns true when every required action on every subject is held', () => {
            const ability = factory.createForUser([
                buildPolicy({
                    subject: EnumPolicySubject.user,
                    action: [EnumPolicyAction.manage],
                }),
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
            const ability = factory.createForUser([
                buildPolicy({
                    subject: EnumPolicySubject.user,
                    action: [EnumPolicyAction.read],
                }),
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
            const ability = factory.createForUser([]);

            expect(factory.handlerPolicies(ability, [])).toBe(true);
        });
    });
});
