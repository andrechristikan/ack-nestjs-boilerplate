import { EnumMessageLanguage } from '@common/message/enums/message.enum';
import { EnumTermPolicyType } from '@generated/prisma-client/client';
import { TermPolicyContentPresignRequestSchema } from '@modules/term-policy/dtos/request/term-policy.content-presign.request.dto';

describe('TermPolicyContentPresignRequestSchema', () => {
    const payload = {
        size: 1024,
        type: EnumTermPolicyType.privacy,
        language: EnumMessageLanguage.en,
        version: 1,
    };

    it('parses a payload into exactly the declared fields', () => {
        const result = TermPolicyContentPresignRequestSchema.parse(payload);

        expect(result).toEqual(payload);
    });

    it('rejects an undeclared key', () => {
        expect(() =>
            TermPolicyContentPresignRequestSchema.parse({
                ...payload,
                key: 'term-policies/privacy/v1/en.hbs',
            })
        ).toThrow();
    });

    it('rejects a non-integer version', () => {
        expect(() =>
            TermPolicyContentPresignRequestSchema.parse({
                ...payload,
                version: 1.5,
            })
        ).toThrow();
    });

    it('rejects a language outside EnumMessageLanguage', () => {
        expect(() =>
            TermPolicyContentPresignRequestSchema.parse({
                ...payload,
                language: 'unknownLanguage',
            })
        ).toThrow();
    });
});
