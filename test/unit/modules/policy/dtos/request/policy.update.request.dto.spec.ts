import { EnumPolicyAction } from '@generated/prisma-client/client';
import { PolicyUpdateRequestSchema } from '@modules/policy/dtos/request/policy.update.request.dto';

describe('PolicyUpdateRequestSchema', () => {
    const payload = { action: [EnumPolicyAction.manage] };

    it('parses a payload into exactly the declared fields', () => {
        const result = PolicyUpdateRequestSchema.parse(payload);

        expect(result).toEqual(payload);
    });

    it('rejects subject as an undeclared key', () => {
        const result = PolicyUpdateRequestSchema.safeParse({
            ...payload,
            subject: 'user',
        });

        expect(result.error?.issues).toEqual([
            expect.objectContaining({ path: [], code: 'unrecognized_keys' }),
        ]);
    });

    it('rejects an empty action list', () => {
        const result = PolicyUpdateRequestSchema.safeParse({ action: [] });

        expect(result.error?.issues).toEqual([
            expect.objectContaining({ path: ['action'], code: 'too_small' }),
        ]);
    });
});
