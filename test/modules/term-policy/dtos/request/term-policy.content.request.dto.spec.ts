import { EnumMessageLanguage } from '@common/message/enums/message.enum';
import { TermPolicyContentRequestSchema } from '@modules/term-policy/dtos/request/term-policy.content.request.dto';
describe('TermPolicyContentRequestSchema', () => {
    const valid = {
        language: EnumMessageLanguage.en,
        size: 1,
        key: 'term-policies/privacy/v1/en.hbs',
    };
    it('accepts valid localized content', () =>
        expect(TermPolicyContentRequestSchema.parse(valid)).toEqual(valid));
    it.each([
        { ...valid, key: 'secret?.hbs' },
        { ...valid, size: 1.5 },
        { ...valid, unknown: true },
    ])('rejects malformed or unknown input', input =>
        expect(TermPolicyContentRequestSchema.safeParse(input).success).toBe(
            false
        )
    );
});
