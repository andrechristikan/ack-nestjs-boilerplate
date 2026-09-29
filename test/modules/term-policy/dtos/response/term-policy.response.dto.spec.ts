import { EnumAwsS3Accessibility } from '@common/aws/enums/aws.enum';
import { EnumMessageLanguage } from '@common/message/enums/message.enum';
import {
    EnumTermPolicyStatus,
    EnumTermPolicyType,
} from '@generated/prisma-client/client';
import { TermPolicyResponseSchema } from '@modules/term-policy/dtos/response/term-policy.response.dto';

describe('TermPolicyResponseSchema', () => {
    const content = {
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
    const row = {
        id: 'term-policy-1',
        createdAt: new Date('2026-01-01T00:00:00.000Z'),
        createdBy: 'user-1',
        updatedAt: new Date('2026-01-02T00:00:00.000Z'),
        updatedBy: 'user-1',
        type: EnumTermPolicyType.privacy,
        status: EnumTermPolicyStatus.published,
        contents: [content],
        version: 1,
        publishedAt: new Date('2026-01-02T00:00:00.000Z'),
    };

    it('parses a row into exactly the declared fields', () => {
        const result = TermPolicyResponseSchema.parse(row);

        expect(result).toEqual(row);
    });

    it('parses a null publishedAt for a draft row', () => {
        const result = TermPolicyResponseSchema.parse({
            ...row,
            status: EnumTermPolicyStatus.draft,
            publishedAt: null,
        });

        expect(result.publishedAt).toBeNull();
    });

    it('strips deletedAt and deletedBy inherited from DatabaseResponseSchema', () => {
        const result = TermPolicyResponseSchema.parse({
            ...row,
            deletedAt: null,
            deletedBy: null,
        });

        expect(result).toEqual(row);
    });
});
