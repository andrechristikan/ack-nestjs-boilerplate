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
        subject: EnumPolicySubject.WorkspaceMember,
        action: [EnumPolicyAction.read],
        conditions: { workspaceId: '${workspaceId}' },
        inverted: false,
        reason: null,
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
                'createdAt',
                'createdBy',
                'updatedAt',
                'updatedBy',
            ].sort()
        );
        expect(parsed.conditions).toEqual({ workspaceId: '${workspaceId}' });
        expect(parsed.inverted).toBe(false);
        expect(parsed.reason).toBeNull();
    });

    it('parses null conditions and an inverted rule', () => {
        const parsed = PolicySchema.parse({
            ...policy,
            conditions: null,
            inverted: true,
        });

        expect(parsed.conditions).toBeNull();
    });

    it('declares conditions nullable so the OpenAPI shape admits null', () => {
        expect(PolicySchema.shape.conditions.def.type).toBe('nullable');
    });

    it.each([
        { inverted: undefined },
        { conditions: undefined },
        { conditions: [] },
        { conditions: 'x' },
    ])('rejects a row with %o', override => {
        expect(PolicySchema.safeParse({ ...policy, ...override }).success).toBe(
            false
        );
    });
});
