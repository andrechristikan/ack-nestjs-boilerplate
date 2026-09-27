import { EnumPolicyAction } from '@generated/prisma-client/client';
import { PolicyUpdateRequestSchema } from '@modules/policy/dtos/request/policy.update.request.dto';

describe('PolicyUpdateRequestSchema', () => {
    const valid = {
        action: [EnumPolicyAction.read],
        priority: 2,
    };

    it('accepts the full rule without a subject', () => {
        const full = {
            ...valid,
            conditions: { userId: '${user.id}' },
            inverted: false,
            reason: 'why',
        };

        expect(PolicyUpdateRequestSchema.parse(valid)).toEqual(valid);
        expect(PolicyUpdateRequestSchema.parse(full)).toEqual(full);
    });

    it.each([
        { subject: 'user' },
        { priority: 0 },
        { priority: undefined },
        { action: [] },
        { conditions: [] },
        { reason: 'r'.repeat(501) },
        { unknown: true },
    ])('rejects a body with %o', override => {
        expect(
            PolicyUpdateRequestSchema.safeParse({ ...valid, ...override })
                .success
        ).toBe(false);
    });
});
