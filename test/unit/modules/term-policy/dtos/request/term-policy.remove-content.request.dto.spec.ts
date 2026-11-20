import { EnumMessageLanguage } from '@common/message/enums/message.enum';
import { TermPolicyRemoveContentRequestSchema } from '@modules/term-policy/dtos/request/term-policy.remove-content.request.dto';

describe('TermPolicyRemoveContentRequestSchema', () => {
    const payload = { language: EnumMessageLanguage.en };

    it('parses a payload into exactly the declared fields', () => {
        const result = TermPolicyRemoveContentRequestSchema.parse(payload);

        expect(result).toEqual(payload);
    });

    it('rejects an undeclared key', () => {
        const result = TermPolicyRemoveContentRequestSchema.safeParse({
            ...payload,
            size: 1024,
        });

        expect(result.error?.issues).toEqual([
            expect.objectContaining({ path: [], code: 'unrecognized_keys' }),
        ]);
    });

    it('rejects a language outside EnumMessageLanguage', () => {
        const result = TermPolicyRemoveContentRequestSchema.safeParse({
            language: 'unknownLanguage',
        });

        expect(result.error?.issues).toEqual([
            expect.objectContaining({
                path: ['language'],
                code: 'invalid_value',
            }),
        ]);
    });
});
