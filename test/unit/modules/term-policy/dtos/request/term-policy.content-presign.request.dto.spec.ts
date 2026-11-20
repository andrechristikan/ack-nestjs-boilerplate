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
        const result = TermPolicyContentPresignRequestSchema.safeParse({
            ...payload,
            key: 'term-policies/privacy/v1/en.hbs',
        });

        expect(result.error?.issues).toEqual([
            expect.objectContaining({ path: [], code: 'unrecognized_keys' }),
        ]);
    });

    it('rejects a non-integer version', () => {
        const result = TermPolicyContentPresignRequestSchema.safeParse({
            ...payload,
            version: 1.5,
        });

        expect(result.error?.issues).toEqual([
            expect.objectContaining({
                path: ['version'],
                code: 'invalid_type',
            }),
        ]);
    });

    it('rejects a version below 1', () => {
        const result = TermPolicyContentPresignRequestSchema.safeParse({
            ...payload,
            version: 0,
        });

        expect(result.error?.issues).toEqual([
            expect.objectContaining({ path: ['version'], code: 'too_small' }),
        ]);
    });

    it('rejects a size of 0', () => {
        const result = TermPolicyContentPresignRequestSchema.safeParse({
            ...payload,
            size: 0,
        });

        expect(result.error?.issues).toEqual([
            expect.objectContaining({ path: ['size'], code: 'too_small' }),
        ]);
    });

    it('rejects a language outside EnumMessageLanguage', () => {
        const result = TermPolicyContentPresignRequestSchema.safeParse({
            ...payload,
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
