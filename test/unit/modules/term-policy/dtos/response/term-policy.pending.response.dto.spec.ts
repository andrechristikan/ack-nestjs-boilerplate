import { EnumTermPolicyType } from '@generated/prisma-client/client';
import { TermPolicyPendingResponseSchema } from '@modules/term-policy/dtos/response/term-policy.pending.response.dto';

describe('TermPolicyPendingResponseSchema', () => {
    const ref = {
        id: 'term-policy-1',
        type: EnumTermPolicyType.privacy,
        version: 2,
    };

    it('parses pending refs into exactly the declared fields', () => {
        const result = TermPolicyPendingResponseSchema.parse({
            termPolicies: [{ ...ref, status: 'published' }],
        });

        expect(result).toEqual({ termPolicies: [ref] });
    });

    it('parses an empty list', () => {
        const result = TermPolicyPendingResponseSchema.parse({
            termPolicies: [],
        });

        expect(result.termPolicies).toEqual([]);
    });

    it('rejects an unknown type', () => {
        const result = TermPolicyPendingResponseSchema.safeParse({
            termPolicies: [{ ...ref, type: 'unknown' }],
        });

        expect(result.success).toBe(false);
    });
});
