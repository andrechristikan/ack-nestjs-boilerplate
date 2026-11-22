import { EnumMessageLanguage } from '@common/message/enums/message.enum';
import { TermPolicyContentRequestSchema } from '@modules/term-policy/dtos/request/term-policy.content.request.dto';

describe('TermPolicyContentRequestSchema', () => {
    const payload = {
        language: EnumMessageLanguage.en,
        size: 1024,
        key: 'term-policies/privacy/v1/en.hbs',
    };

    it('parses a payload into exactly the declared fields', () => {
        const result = TermPolicyContentRequestSchema.parse(payload);

        expect(result).toEqual(payload);
    });

    it('rejects an undeclared key', () => {
        expect(() =>
            TermPolicyContentRequestSchema.parse({
                ...payload,
                type: 'privacy',
            })
        ).toThrow();
    });

    it('rejects a key failing the object-key pattern', () => {
        expect(() =>
            TermPolicyContentRequestSchema.parse({ ...payload, key: '' })
        ).toThrow();
    });
});
