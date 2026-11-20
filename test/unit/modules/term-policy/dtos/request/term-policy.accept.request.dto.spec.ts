import { EnumTermPolicyType } from '@generated/prisma-client/client';
import { TermPolicyAcceptRequestSchema } from '@modules/term-policy/dtos/request/term-policy.accept.request.dto';

describe('TermPolicyAcceptRequestSchema', () => {
    const payload = { type: EnumTermPolicyType.privacy };

    it('parses a payload into exactly the declared fields', () => {
        const result = TermPolicyAcceptRequestSchema.parse(payload);

        expect(result).toEqual(payload);
    });

    it('rejects an undeclared key', () => {
        const result = TermPolicyAcceptRequestSchema.safeParse({
            ...payload,
            version: 1,
        });

        expect(result.error?.issues).toEqual([
            expect.objectContaining({ path: [], code: 'unrecognized_keys' }),
        ]);
    });

    it('rejects a type outside EnumTermPolicyType', () => {
        const result = TermPolicyAcceptRequestSchema.safeParse({
            type: 'unknownType',
        });

        expect(result.error?.issues).toEqual([
            expect.objectContaining({ path: ['type'], code: 'invalid_value' }),
        ]);
    });
});
