import { EnumPolicyAction } from '@generated/prisma-client/client';
import { PolicyUpdateRequestSchema } from '@modules/policy/dtos/request/policy.update.request.dto';

describe('PolicyUpdateRequestSchema', () => {
    const valid = {
        action: [EnumPolicyAction.read],
    };

    it('accepts the full rule without a subject', () => {
        const full = {
            ...valid,
            conditions: { userId: '${userId}' },
            inverted: false,
            reason: 'Only the owner can update this user',
        };

        expect(PolicyUpdateRequestSchema.parse(valid)).toEqual(valid);
        expect(PolicyUpdateRequestSchema.parse(full)).toEqual(full);
    });

    it.each([
        { subject: 'user' },
        { action: [] },
        { conditions: [] },
        { unknown: true },
    ])('rejects a body with %o', override => {
        expect(
            PolicyUpdateRequestSchema.safeParse({ ...valid, ...override })
                .success
        ).toBe(false);
    });
});
