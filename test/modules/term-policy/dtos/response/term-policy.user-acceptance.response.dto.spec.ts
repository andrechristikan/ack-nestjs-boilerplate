import { EnumAwsS3Accessibility } from '@common/aws/enums/aws.enum';
import { EnumMessageLanguage } from '@common/message/enums/message.enum';
import {
    EnumTermPolicyStatus,
    EnumTermPolicyType,
} from '@generated/prisma-client/client';
import { TermPolicyUserAcceptanceResponseSchema } from '@modules/term-policy/dtos/response/term-policy.user-acceptance.response.dto';

describe('TermPolicyUserAcceptanceResponseSchema', () => {
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
    const termPolicy = {
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
    const user = {
        id: 'user-1',
        createdAt: new Date('2026-01-01T00:00:00.000Z'),
        createdBy: null,
        updatedAt: new Date('2026-01-01T00:00:00.000Z'),
        updatedBy: null,
        deletedAt: null,
        deletedBy: null,
        name: 'Andre Christi',
        username: 'johnSmith123',
        photo: null,
    };
    const row = {
        id: 'acceptance-1',
        createdAt: new Date('2026-01-03T00:00:00.000Z'),
        createdBy: 'user-1',
        userId: 'user-1',
        user,
        termPolicyId: 'term-policy-1',
        termPolicy,
        acceptedAt: new Date('2026-01-03T00:00:00.000Z'),
    };

    it('parses a row into exactly the declared fields', () => {
        const result = TermPolicyUserAcceptanceResponseSchema.parse(row);

        expect(result).toEqual(row);
    });

    it('strips updatedAt, updatedBy, deletedAt and deletedBy inherited from DatabaseResponseSchema', () => {
        const result = TermPolicyUserAcceptanceResponseSchema.parse({
            ...row,
            updatedAt: new Date('2026-01-04T00:00:00.000Z'),
            updatedBy: 'user-1',
            deletedAt: null,
            deletedBy: null,
        });

        expect(result).toEqual(row);
    });
});
