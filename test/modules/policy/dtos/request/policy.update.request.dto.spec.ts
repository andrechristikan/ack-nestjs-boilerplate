import { EnumPolicyAction } from '@generated/prisma-client/client';
import { PolicyUpdateRequestSchema } from '@modules/policy/dtos/request/policy.update.request.dto';

describe('PolicyUpdateRequestSchema', () => {
    const payload = { action: [EnumPolicyAction.manage] };

    it('parses a payload into exactly the declared fields', () => {
        const result = PolicyUpdateRequestSchema.parse(payload);

        expect(result).toEqual(payload);
    });

    it('rejects subject as an undeclared key', () => {
        expect(() =>
            PolicyUpdateRequestSchema.parse({
                ...payload,
                subject: 'user',
            })
        ).toThrow();
    });

    it('rejects an empty action list', () => {
        expect(() => PolicyUpdateRequestSchema.parse({ action: [] })).toThrow();
    });
});
