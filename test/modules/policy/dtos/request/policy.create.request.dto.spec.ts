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

    it.each([
        { action: [] },
        { subject: 'unknown' },
        { subject: undefined },
        { conditions: [] },
        { conditions: 'x' },
        { conditions: null },
        { conditions: { AND: [{ id: 'x' }] } },
        { conditions: { workspace: { id: 'x' } } },
        { conditions: { userId: '${unknown}' } },
        { inverted: 'yes' },
        { unknown: true },
    ])('rejects a rule with %o', override => {
        expect(
            PolicyCreateRequestSchema.safeParse({ ...valid, ...override })
                .success
        ).toBe(false);
    });
});
