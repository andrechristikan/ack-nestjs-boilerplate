import { EnumMessageLanguage } from '@common/message/enums/message.enum';
import { TermPolicyRemoveContentRequestSchema } from '@modules/term-policy/dtos/request/term-policy.remove-content.request.dto';
describe('TermPolicyRemoveContentRequestSchema', () => {
    it('accepts a supported language', () =>
        expect(
            TermPolicyRemoveContentRequestSchema.safeParse({
                language: EnumMessageLanguage.en,
            }).success
        ).toBe(true));
    it.each([
        { language: 'xx' },
        { language: EnumMessageLanguage.en, unknown: true },
    ])('rejects invalid or unknown input', input =>
        expect(
            TermPolicyRemoveContentRequestSchema.safeParse(input).success
        ).toBe(false)
    );
});
