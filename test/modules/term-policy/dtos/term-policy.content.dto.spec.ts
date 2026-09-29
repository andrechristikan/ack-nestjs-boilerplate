import { EnumAwsS3Accessibility } from '@common/aws/enums/aws.enum';
import { EnumMessageLanguage } from '@common/message/enums/message.enum';
import { TermPolicyContentSchema } from '@modules/term-policy/dtos/term-policy.content.dto';

describe('TermPolicyContentSchema', () => {
    const row = {
        bucket: 'sample-bucket',
        key: 'term-policies/privacy/v1/en.hbs',
        cdnUrl: 'https://cdn.example.com/en.hbs',
        completedUrl: 'https://cdn.example.com/en.hbs',
        mime: 'text/plain',
        extension: 'hbs',
        access: EnumAwsS3Accessibility.public,
        size: 1024,
        language: EnumMessageLanguage.en,
    };

    it('parses a row into exactly the declared fields', () => {
        const result = TermPolicyContentSchema.parse(row);

        expect(result).toEqual(row);
    });

    it('parses a null cdnUrl', () => {
        const result = TermPolicyContentSchema.parse({
            ...row,
            cdnUrl: null,
        });

        expect(result).toEqual({ ...row, cdnUrl: null });
    });

    it('strips an undeclared key', () => {
        const result = TermPolicyContentSchema.parse({
            ...row,
            data: 'stream',
        });

        expect(result).toEqual(row);
    });
});
