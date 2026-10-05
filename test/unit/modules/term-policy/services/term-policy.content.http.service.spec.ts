import { Test } from '@nestjs/testing';
import type { TestingModule } from '@nestjs/testing';
import { mock } from 'vitest-mock-extended';
import type { MockProxy } from 'vitest-mock-extended';
import type { IAwsS3Presign } from '@common/aws/interfaces/aws.interface';
import { EnumMessageLanguage } from '@common/message/enums/message.enum';
import { EnumTermPolicyType } from '@generated/prisma-client/client';
import { TermPolicyContentDomain } from '@modules/term-policy/domains/term-policy.content.domain';
import { TermPolicyContentHttpService } from '@modules/term-policy/services/term-policy.content.http.service';
import type { TermPolicyContentPresignRequestDto } from '@modules/term-policy/dtos/request/term-policy.content-presign.request.dto';
import type { TermPolicyContentRequestDto } from '@modules/term-policy/dtos/request/term-policy.content.request.dto';

describe('TermPolicyContentHttpService', () => {
    const termPolicyContentDomain: MockProxy<TermPolicyContentDomain> =
        mock<TermPolicyContentDomain>();

    const presign: IAwsS3Presign = {
        key: 'term-policies/privacy/v1/en.hbs',
        mime: 'text/plain',
        extension: 'hbs',
        presignUrl: 'https://s3.example.com/presign',
        expiredInSeconds: 900,
    };

    let service: TermPolicyContentHttpService;

    beforeEach(async () => {
        vi.resetAllMocks();

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                TermPolicyContentHttpService,
                {
                    provide: TermPolicyContentDomain,
                    useValue: termPolicyContentDomain,
                },
            ],
        }).compile();

        service = module.get(TermPolicyContentHttpService);
    });

    describe('generateContentPresignByAdmin', () => {
        it('wraps the generated presign in the response envelope', async () => {
            const body: TermPolicyContentPresignRequestDto = {
                type: EnumTermPolicyType.privacy,
                version: 1,
                language: EnumMessageLanguage.en,
                size: 1024,
            };
            termPolicyContentDomain.generateContentPresignByAdmin.mockResolvedValue(
                presign
            );

            const result = await service.generateContentPresignByAdmin(body);

            expect(result).toEqual({ data: presign });
            expect(
                termPolicyContentDomain.generateContentPresignByAdmin
            ).toHaveBeenCalledWith(body);
        });
    });

    describe('updateContentByAdmin', () => {
        it('returns nothing after updating the content', async () => {
            const body: TermPolicyContentRequestDto = {
                language: EnumMessageLanguage.en,
                size: 1024,
                key: 'term-policies/privacy/v1/en.hbs',
            };
            termPolicyContentDomain.updateContentByAdmin.mockResolvedValue(
                undefined
            );

            const result = await service.updateContentByAdmin(
                'term-policy-1',
                body
            );

            expect(result).toBeUndefined();
            expect(
                termPolicyContentDomain.updateContentByAdmin
            ).toHaveBeenCalledWith('term-policy-1', body);
        });
    });

    describe('addContentByAdmin', () => {
        it('returns nothing after adding the content', async () => {
            const body: TermPolicyContentRequestDto = {
                language: EnumMessageLanguage.en,
                size: 1024,
                key: 'term-policies/privacy/v1/en.hbs',
            };
            termPolicyContentDomain.addContentByAdmin.mockResolvedValue(
                undefined
            );

            const result = await service.addContentByAdmin(
                'term-policy-1',
                body
            );

            expect(result).toBeUndefined();
            expect(
                termPolicyContentDomain.addContentByAdmin
            ).toHaveBeenCalledWith('term-policy-1', body);
        });
    });

    describe('removeContentByAdmin', () => {
        it('returns nothing after removing the content', async () => {
            termPolicyContentDomain.removeContentByAdmin.mockResolvedValue(
                undefined
            );

            const result = await service.removeContentByAdmin('term-policy-1', {
                language: EnumMessageLanguage.en,
            });

            expect(result).toBeUndefined();
            expect(
                termPolicyContentDomain.removeContentByAdmin
            ).toHaveBeenCalledWith('term-policy-1', EnumMessageLanguage.en);
        });
    });

    describe('getContentByAdmin', () => {
        it('wraps the resolved presign in the response envelope', async () => {
            termPolicyContentDomain.getContentByAdmin.mockResolvedValue(
                presign
            );

            const result = await service.getContentByAdmin(
                'term-policy-1',
                EnumMessageLanguage.en
            );

            expect(result).toEqual({ data: presign });
            expect(
                termPolicyContentDomain.getContentByAdmin
            ).toHaveBeenCalledWith('term-policy-1', EnumMessageLanguage.en);
        });
    });
});
