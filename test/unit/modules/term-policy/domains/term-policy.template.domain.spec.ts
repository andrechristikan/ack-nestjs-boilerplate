import { Test } from '@nestjs/testing';
import type { TestingModule } from '@nestjs/testing';
import { mock } from 'vitest-mock-extended';
import type { MockProxy } from 'vitest-mock-extended';
import { EnumAwsS3Accessibility } from '@common/aws/enums/aws.enum';
import type { IAwsS3 } from '@common/aws/interfaces/aws.interface';
import { AwsS3Service } from '@common/aws/services/aws.s3.service';
import { EnumMessageLanguage } from '@common/message/enums/message.enum';
import { EnumTermPolicyType } from '@generated/prisma-client/client';
import { TermPolicyTemplateDomain } from '@modules/term-policy/domains/term-policy.template.domain';
import { TermPolicyUtil } from '@modules/term-policy/utils/term-policy.util';

const { readFileSync } = vi.hoisted(() => ({ readFileSync: vi.fn() }));

vi.mock('fs', async importOriginal => ({
    ...(await importOriginal<typeof import('fs')>()),
    readFileSync,
}));

describe('TermPolicyTemplateDomain', () => {
    const termPolicyUtil: MockProxy<TermPolicyUtil> = mock<TermPolicyUtil>();
    const awsS3Service: MockProxy<AwsS3Service> = mock<AwsS3Service>();

    const privateItem: IAwsS3 = {
        bucket: 'sample-bucket',
        key: 'term-policies/termsOfService/1/en.hbs',
        cdnUrl: null,
        completedUrl: 'https://s3.example.com/private/en.hbs',
        mime: 'text/plain',
        extension: 'hbs',
        access: EnumAwsS3Accessibility.private,
        size: 512,
    };
    const publicItem: IAwsS3 = {
        ...privateItem,
        access: EnumAwsS3Accessibility.public,
        completedUrl: 'https://s3.example.com/public/en.hbs',
    };

    let domain: TermPolicyTemplateDomain;

    type ImportMethod =
        | 'importTermsOfService'
        | 'importPrivacy'
        | 'importCookie'
        | 'importMarketing';

    const cases: {
        method: ImportMethod;
        type: EnumTermPolicyType;
        templateFile: string;
    }[] = [
        {
            method: 'importTermsOfService',
            type: EnumTermPolicyType.termsOfService,
            templateFile: 'term-policy.term.en.hbs',
        },
        {
            method: 'importPrivacy',
            type: EnumTermPolicyType.privacy,
            templateFile: 'term-policy.privacy.en.hbs',
        },
        {
            method: 'importCookie',
            type: EnumTermPolicyType.cookies,
            templateFile: 'term-policy.cookies.en.hbs',
        },
        {
            method: 'importMarketing',
            type: EnumTermPolicyType.marketing,
            templateFile: 'term-policy.marketing.en.hbs',
        },
    ];

    beforeEach(async () => {
        vi.resetAllMocks();

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                TermPolicyTemplateDomain,
                { provide: TermPolicyUtil, useValue: termPolicyUtil },
                { provide: AwsS3Service, useValue: awsS3Service },
            ],
        }).compile();

        domain = module.get(TermPolicyTemplateDomain);
    });

    describe.each(cases)('$method', ({ method, type, templateFile }) => {
        it('uploads the template privately then copies it to the public path', async () => {
            const templateContent = Buffer.from('<html></html>');
            readFileSync.mockReturnValue(templateContent);
            termPolicyUtil.createRandomFilenameContentWithPath.mockReturnValue(
                'term-policies/type/1/en.hbs'
            );
            awsS3Service.putItem.mockResolvedValue(privateItem);
            termPolicyUtil.getContentPublicPath.mockReturnValue(
                'public/term-policies/type/1'
            );
            awsS3Service.copyItem.mockResolvedValue(publicItem);

            const result = await domain[method]();

            expect(result).toBe(publicItem);
            expect(readFileSync).toHaveBeenCalledWith(
                expect.stringContaining(templateFile)
            );
            expect(
                termPolicyUtil.createRandomFilenameContentWithPath
            ).toHaveBeenCalledWith(type, 1, EnumMessageLanguage.en, {
                extension: 'hbs',
            });
            expect(awsS3Service.putItem).toHaveBeenCalledWith(
                {
                    file: templateContent,
                    key: 'term-policies/type/1/en.hbs',
                    size: templateContent.length,
                },
                {
                    forceUpdate: true,
                    access: EnumAwsS3Accessibility.private,
                }
            );
            expect(termPolicyUtil.getContentPublicPath).toHaveBeenCalledWith(
                type,
                1
            );
            expect(awsS3Service.copyItem).toHaveBeenCalledWith(
                privateItem,
                'public/term-policies/type/1',
                {
                    accessFrom: EnumAwsS3Accessibility.private,
                    accessTo: EnumAwsS3Accessibility.public,
                }
            );
        });

        it('returns null without copying when the private upload fails', async () => {
            readFileSync.mockReturnValue(Buffer.from('<html></html>'));
            termPolicyUtil.createRandomFilenameContentWithPath.mockReturnValue(
                'term-policies/type/1/en.hbs'
            );
            awsS3Service.putItem.mockResolvedValue(null);

            const result = await domain[method]();

            expect(result).toBeNull();
            expect(awsS3Service.copyItem).not.toHaveBeenCalled();
        });

        it('rethrows when reading the template fails', async () => {
            const readError = new Error('read failed');
            readFileSync.mockImplementation(() => {
                throw readError;
            });

            await expect(domain[method]()).rejects.toBe(readError);
        });
    });
});
