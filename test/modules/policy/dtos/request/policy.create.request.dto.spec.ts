import {
    EnumPolicyAction,
    EnumPolicySubject,
} from '@generated/prisma-client/client';
import { PolicyCreateRequestSchema } from '@modules/policy/dtos/request/policy.create.request.dto';

describe('PolicyCreateRequestSchema', () => {
    const valid = {
        subject: EnumPolicySubject.User,
        action: [EnumPolicyAction.read],
    };

    it('accepts the minimal rule and leaves the optional fields undefined', () => {
        const parsed = PolicyCreateRequestSchema.parse(valid);

        expect(parsed).toEqual(valid);
        expect(parsed.conditions).toBeUndefined();
        expect(parsed.inverted).toBeUndefined();
    });

    it('accepts a full rule', () => {
        const full = {
            ...valid,
            conditions: { userId: '${userId}', status: 'active', level: 2 },
            inverted: true,
            reason: 'Only owners can update this user',
        };

        expect(PolicyCreateRequestSchema.parse(full)).toEqual(full);
    });

    it('accepts nested relation conditions', () => {
        const rule = {
            ...valid,
            conditions: {
                workspaceId: '${workspaceId}',
                members: { some: { userId: '${userId}' } },
                OR: [{ level: 2 }, { archived: null }, { open: true }],
            },
        };

        expect(PolicyCreateRequestSchema.parse(rule)).toEqual(rule);
    });

    it('accepts an unknown ${token} (fails closed at build)', () => {
        const rule = { ...valid, conditions: { userId: '${unknown}' } };

        expect(PolicyCreateRequestSchema.parse(rule)).toEqual(rule);
    });

    it('rejects a non-JSON value nested in conditions', () => {
        expect(
            PolicyCreateRequestSchema.safeParse({
                ...valid,
                conditions: { at: new Date() },
            }).success
        ).toBe(false);
    });

    it.each([
        { action: [] },
        { subject: 'unknown' },
        { subject: undefined },
        { conditions: [] },
        { conditions: 'x' },
        { conditions: 1 },
        { conditions: null },
        { inverted: 'yes' },
        { unknown: true },
    ])('rejects a rule with %o', override => {
        expect(
            PolicyCreateRequestSchema.safeParse({ ...valid, ...override })
                .success
        ).toBe(false);
    });
});
