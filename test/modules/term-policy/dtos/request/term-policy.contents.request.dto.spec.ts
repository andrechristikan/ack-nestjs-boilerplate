import { EnumMessageLanguage } from '@common/message/enums/message.enum';
import { TermPolicyContentsRequestSchema } from '@modules/term-policy/dtos/request/term-policy.contents.request.dto';
describe('TermPolicyContentsRequestSchema', () => {
    const content = {
        language: EnumMessageLanguage.en,
        size: 1,
        key: 'term-policies/privacy/v1/en.hbs',
    };
    it('accepts one content per language', () =>
        expect(
            TermPolicyContentsRequestSchema.safeParse({ contents: [content] })
                .success
        ).toBe(true));
    it.each([
        { contents: [] },
        { contents: [content, content] },
        { contents: [content], unknown: true },
    ])('rejects empty, duplicate, or unknown input', input =>
        expect(TermPolicyContentsRequestSchema.safeParse(input).success).toBe(
            false
        )
    );
});
