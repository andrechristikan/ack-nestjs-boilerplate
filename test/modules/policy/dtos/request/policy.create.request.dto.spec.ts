import {
    EnumPolicyAction,
    EnumPolicySubject,
} from '@generated/prisma-client/client';
import { PolicyCreateRequestSchema } from '@modules/policy/dtos/request/policy.create.request.dto';

describe('PolicyCreateRequestSchema', () => {
    const valid = {
        subject: EnumPolicySubject.user,
        action: [EnumPolicyAction.read],
        priority: 1,
    };

    it('accepts the minimal rule and leaves the optional fields undefined', () => {
        const parsed = PolicyCreateRequestSchema.parse(valid);

        expect(parsed).toEqual(valid);
        expect(parsed.conditions).toBeUndefined();
        expect(parsed.inverted).toBeUndefined();
        expect(parsed.reason).toBeUndefined();
    });

    it('accepts a full rule', () => {
        const full = {
            ...valid,
            conditions: { userId: '${user.id}', AND: [{ id: 'x' }] },
            inverted: true,
            reason: 'r'.repeat(500),
        };

        expect(PolicyCreateRequestSchema.parse(full)).toEqual(full);
    });

    it.each([
        { priority: 0 },
        { priority: -1 },
        { priority: 1.5 },
        { priority: undefined },
        { action: [] },
        { subject: 'unknown' },
        { subject: undefined },
        { conditions: [] },
        { conditions: 'x' },
        { conditions: null },
        { reason: 'r'.repeat(501) },
        { reason: null },
        { inverted: 'yes' },
        { unknown: true },
    ])('rejects a rule with %o', override => {
        expect(
            PolicyCreateRequestSchema.safeParse({ ...valid, ...override })
                .success
        ).toBe(false);
    });
});
