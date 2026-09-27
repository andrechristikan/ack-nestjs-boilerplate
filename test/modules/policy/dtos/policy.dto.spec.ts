import {
    EnumPolicyAction,
    EnumPolicySubject,
} from '@generated/prisma-client/client';
import { PolicySchema } from '@modules/policy/dtos/policy.dto';

describe('PolicySchema', () => {
    const now = new Date('2026-01-01T00:00:00.000Z');
    const policy = {
        id: 'policy-id',
        roleId: 'role-id',
        subject: EnumPolicySubject.workspaceMember,
        action: [EnumPolicyAction.read],
        conditions: { workspaceId: '${workspace.id}' },
        inverted: false,
        reason: null,
        priority: 1,
        createdAt: now,
        createdBy: null,
        updatedAt: now,
        updatedBy: null,
    };

    it('returns exactly the declared fields and strips an undeclared one', () => {
        const parsed = PolicySchema.parse({
            ...policy,
            roleId: 'role-id',
            extra: 1,
        });

        expect(Object.keys(parsed).sort()).toEqual(
            [
                'id',
                'subject',
                'action',
                'conditions',
                'inverted',
                'reason',
                'priority',
                'createdAt',
                'createdBy',
                'updatedAt',
                'updatedBy',
            ].sort()
        );
        expect(parsed.conditions).toEqual({ workspaceId: '${workspace.id}' });
        expect(parsed.priority).toBe(1);
        expect(parsed.inverted).toBe(false);
    });

    it('parses null conditions and a set reason', () => {
        const parsed = PolicySchema.parse({
            ...policy,
            conditions: null,
            inverted: true,
            reason: 'blocked',
        });

        expect(parsed.conditions).toBeNull();
        expect(parsed.reason).toBe('blocked');
    });

    it('accepts the INT4 maximum priority', () => {
        const parsed = PolicySchema.parse({ ...policy, priority: 99 });

        expect(parsed.priority).toBe(99);
    });

    it('declares conditions nullable so the OpenAPI shape admits null', () => {
        expect(PolicySchema.shape.conditions.def.type).toBe('nullable');
    });

    it.each([
        { priority: undefined },
        { priority: 1.5 },
        { priority: 2147483648 },
        { inverted: undefined },
        { conditions: undefined },
        { conditions: [] },
        { conditions: 'x' },
        { reason: 'r'.repeat(501) },
        { reason: undefined },
    ])('rejects a row with %o', override => {
        expect(PolicySchema.safeParse({ ...policy, ...override }).success).toBe(
            false
        );
    });
});
