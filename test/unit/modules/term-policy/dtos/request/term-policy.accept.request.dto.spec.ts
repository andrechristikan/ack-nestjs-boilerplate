import { EnumTermPolicyType } from '@generated/prisma-client/client';
import { TermPolicyAcceptRequestSchema } from '@modules/term-policy/dtos/request/term-policy.accept.request.dto';

describe('TermPolicyAcceptRequestSchema', () => {
    const payload = { type: EnumTermPolicyType.privacy };

    it('parses a payload into exactly the declared fields', () => {
        const result = TermPolicyAcceptRequestSchema.parse(payload);

        expect(result).toEqual(payload);
    });

    it('rejects an undeclared key', () => {
        expect(() =>
            TermPolicyAcceptRequestSchema.parse({
                ...payload,
                version: 1,
            })
        ).toThrow();
    });

    it('rejects a type outside EnumTermPolicyType', () => {
        expect(() =>
            TermPolicyAcceptRequestSchema.parse({ type: 'unknownType' })
        ).toThrow();
    });
});
