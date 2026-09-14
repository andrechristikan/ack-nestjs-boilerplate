import { readFileSync } from 'fs';
import { Test, type TestingModule } from '@nestjs/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { AwsS3Service } from '@common/aws/services/aws.s3.service';
import { EnumAwsS3Accessibility } from '@common/aws/enums/aws.enum';
import { EnumMessageLanguage } from '@common/message/enums/message.enum';
import { EnumTermPolicyType } from '@generated/prisma-client';
import { TermPolicyTemplateService } from '@modules/term-policy/services/term-policy.template.service';
import { TermPolicyUtil } from '@modules/term-policy/utils/term-policy.util';

vi.mock(import('fs'), () => ({
    readFileSync: vi.fn(),
}));

describe('TermPolicyTemplateService', () => {
    const termPolicyUtil = {
        createRandomFilenameContentWithPath:
            vi.fn<TermPolicyUtil['createRandomFilenameContentWithPath']>(),
    } satisfies Pick<TermPolicyUtil, 'createRandomFilenameContentWithPath'>;
    const awsS3Service = {
        putItem: vi.fn<AwsS3Service['putItem']>(),
    } satisfies Pick<AwsS3Service, 'putItem'>;

    let service: TermPolicyTemplateService;

    beforeEach(async () => {
        vi.resetAllMocks();
        const moduleRef: TestingModule = await Test.createTestingModule({
            providers: [
                TermPolicyTemplateService,
                { provide: TermPolicyUtil, useValue: termPolicyUtil },
                { provide: AwsS3Service, useValue: awsS3Service },
            ],
        }).compile();
        service = moduleRef.get(TermPolicyTemplateService);
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
            { forceUpdate: true }
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
