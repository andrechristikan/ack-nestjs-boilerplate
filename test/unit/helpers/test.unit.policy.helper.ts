import type { MockProxy } from 'vitest-mock-extended';
import { RequestStoreService } from '@common/request/services/request.store.service';
import {
    EnumPolicyAction,
    EnumPolicySubject,
} from '@generated/prisma-client/client';
import { EnumPolicyConditionPlaceholder } from '@modules/policy/enums/policy.enum';
import { PolicyAbilityFactory } from '@modules/policy/factories/policy.ability.factory';
import type {
    IPolicyRule,
    IPolicyAbility,
    IPolicyContext,
} from '@modules/policy/interfaces/policy.interface';

/** A persisted rule that allows `read` on `User`; override any field. */
export function buildPolicyRule(
    overrides: Partial<IPolicyRule> = {}
): IPolicyRule {
    return {
        subject: EnumPolicySubject.User,
        action: [EnumPolicyAction.read],
        conditions: null,
        inverted: false,
        reason: null,
        ...overrides,
    };
}

/** The ability the real factory builds from `rules`, with the caller `user-1` and workspace `workspace-1`. */
export function buildPolicyAbility(rules: IPolicyRule[]): IPolicyAbility {
    const factory = new PolicyAbilityFactory();

    return factory.build(rules, {
        [EnumPolicyConditionPlaceholder.userId]: 'user-1',
        [EnumPolicyConditionPlaceholder.workspaceId]: 'workspace-1',
        [EnumPolicyConditionPlaceholder.projectId]: null,
    });
}

/** Makes the doubled request store answer each key from `values` and `null` for any other. */
export function stubRequestStore(
    requestStoreService: MockProxy<RequestStoreService>,
    values: Record<string, unknown>
): void {
    requestStoreService.get.mockImplementation(
        key => (values[key] ?? null) as never
    );
}

/** The policy context `PolicyAbilityGuard` stores, wrapping `ability`. */
export function buildPolicyContext(ability: IPolicyAbility): IPolicyContext {
    return { ability };
}
