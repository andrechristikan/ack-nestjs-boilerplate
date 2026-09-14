import { createMock } from '@golevelup/ts-vitest';
import { readFileSync } from 'fs';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { AwsS3Service } from '@common/aws/services/aws.s3.service';
import { EnumAwsS3Accessibility } from '@common/aws/enums/aws.enum';
import { EnumMessageLanguage } from '@common/message/enums/message.enum';
import { EnumTermPolicyType } from '@generated/prisma-client';
import { TermPolicyTemplateDomain } from '@modules/term-policy/domains/term-policy.template.domain';
import { TermPolicyUtil } from '@modules/term-policy/utils/term-policy.util';

vi.mock(import('fs'), () => ({
    readFileSync: vi.fn(),
}));

describe('TermPolicyTemplateDomain', () => {
    const termPolicyUtil = createMock<TermPolicyUtil>();
    const awsS3Service = createMock<AwsS3Service>();

    let service: TermPolicyTemplateDomain;

    beforeEach(async () => {
        vi.resetAllMocks();
        service = new TermPolicyTemplateDomain(termPolicyUtil, awsS3Service);
    });

    it('imports the privacy template under its generated storage key', async () => {
        const template = Buffer.from('privacy template');
        const uploaded = {
            bucket: 'bucket',
            key: 'terms/privacy/1/en.hbs',
            cdnUrl: null,
            completedUrl: 'https://bucket/en.hbs',
            mime: 'text/x-handlebars-template',
            extension: 'hbs',
            access: EnumAwsS3Accessibility.private,
            size: template.length,
        };
        vi.mocked(readFileSync).mockReturnValue(template);
        termPolicyUtil.createRandomFilenameContentWithPath.mockReturnValue(
            uploaded.key
        );
        awsS3Service.putItem.mockResolvedValue(uploaded);
        termPolicyUtil.getContentPublicPath.mockReturnValue(uploaded.key);
        awsS3Service.copyItem.mockResolvedValue(uploaded);

        await expect(service.importPrivacy()).resolves.toBe(uploaded);
        expect(
            termPolicyUtil.createRandomFilenameContentWithPath
        ).toHaveBeenCalledWith(
            EnumTermPolicyType.privacy,
            1,
            EnumMessageLanguage.en,
            expect.objectContaining({ extension: 'hbs' })
        );
        expect(awsS3Service.putItem).toHaveBeenCalledWith(
            {
                file: template,
                key: uploaded.key,
                size: template.length,
            },
            {
                forceUpdate: true,
                access: EnumAwsS3Accessibility.private,
            }
        );
        expect(awsS3Service.copyItem).toHaveBeenCalledWith(
            uploaded,
            uploaded.key,
            {
                accessFrom: EnumAwsS3Accessibility.private,
                accessTo: EnumAwsS3Accessibility.public,
            }
        );
    });

    it('propagates a template read failure without attempting upload', async () => {
        const failure = new Error('template missing');
        vi.mocked(readFileSync).mockImplementation(() => {
            throw failure;
        });

        await expect(service.importPrivacy()).rejects.toBe(failure);
        expect(awsS3Service.putItem).not.toHaveBeenCalled();
    });
});
