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
        const result = TermPolicyContentRequestSchema.safeParse({
            ...payload,
            type: 'privacy',
        });

        expect(result.error?.issues).toEqual([
            expect.objectContaining({ path: [], code: 'unrecognized_keys' }),
        ]);
    });

    it('rejects a key failing the object-key pattern', () => {
        const result = TermPolicyContentRequestSchema.safeParse({
            ...payload,
            key: '',
        });

        expect(result.error?.issues).toEqual([
            expect.objectContaining({ path: ['key'], code: 'too_small' }),
            expect.objectContaining({ path: ['key'], code: 'invalid_format' }),
        ]);
    });
});
