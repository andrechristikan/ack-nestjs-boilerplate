import { EnumMessageLanguage } from '@common/message/enums/message.enum';
import { TermPolicyRemoveContentRequestSchema } from '@modules/term-policy/dtos/request/term-policy.remove-content.request.dto';

describe('TermPolicyRemoveContentRequestSchema', () => {
    const payload = { language: EnumMessageLanguage.en };

    it('parses a payload into exactly the declared fields', () => {
        const result = TermPolicyRemoveContentRequestSchema.parse(payload);

        expect(result).toEqual(payload);
    });

    it('rejects an undeclared key', () => {
        expect(() =>
            TermPolicyRemoveContentRequestSchema.parse({
                ...payload,
                size: 1024,
            })
        ).toThrow();
    });

    it('rejects a language outside EnumMessageLanguage', () => {
        expect(() =>
            TermPolicyRemoveContentRequestSchema.parse({
                language: 'unknownLanguage',
            })
        ).toThrow();
    });
});
