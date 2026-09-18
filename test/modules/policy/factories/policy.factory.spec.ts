import { describe, expect, it } from 'vitest';

import {
    EnumPolicyAction,
    EnumPolicySubject,
    type Policy,
} from '@generated/prisma-client';
import { PolicyAbilityFactory } from '@modules/policy/factories/policy.factory';

describe('PolicyAbilityFactory', () => {
    const factory = new PolicyAbilityFactory();
    const now = new Date('2026-01-01T00:00:00.000Z');
    const policy = {
        id: 'policy-id',
        roleId: 'role-id',
        subject: EnumPolicySubject.user,
        action: [EnumPolicyAction.read, EnumPolicyAction.update],
        createdAt: now,
        createdBy: null,
        updatedAt: now,
        updatedBy: null,
    } satisfies Policy;

    it('constructs abilities from the project policy rows', () => {
        const ability = factory.createForUser([policy]);

        expect(ability.can(EnumPolicyAction.read, EnumPolicySubject.user)).toBe(
            true
        );
        expect(
            ability.can(EnumPolicyAction.delete, EnumPolicySubject.user)
        ).toBe(false);
        expect(ability.can(EnumPolicyAction.read, EnumPolicySubject.role)).toBe(
            false
        );
    });

    it('requires every action across every declared subject', () => {
        const ability = factory.createForUser([policy]);

        expect(
            factory.handlerPolicies(ability, [
                {
                    subject: EnumPolicySubject.user,
                    action: [EnumPolicyAction.read, EnumPolicyAction.update],
                },
            ])
        ).toBe(true);
        expect(
            factory.handlerPolicies(ability, [
                {
                    subject: EnumPolicySubject.user,
                    action: [EnumPolicyAction.read, EnumPolicyAction.delete],
                },
            ])
        ).toBe(false);
    });

    it('applies an all-subject manage rule using CASL semantics', () => {
        const ability = factory.createForUser([
            {
                ...policy,
                subject: EnumPolicySubject.all,
                action: [EnumPolicyAction.manage],
            },
        ]);

        expect(
            factory.handlerPolicies(ability, [
                {
                    subject: EnumPolicySubject.apiKey,
                    action: [EnumPolicyAction.delete],
                },
            ])
        ).toBe(true);
    });
});
