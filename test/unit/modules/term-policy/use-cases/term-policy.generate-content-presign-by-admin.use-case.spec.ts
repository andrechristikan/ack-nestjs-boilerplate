import { Test } from '@nestjs/testing';
import type { TestingModule } from '@nestjs/testing';
import { mock } from 'vitest-mock-extended';
import type { MockProxy } from 'vitest-mock-extended';
import type { IAwsS3Presign } from '@common/aws/interfaces/aws.interface';
import { EnumMessageLanguage } from '@common/message/enums/message.enum';
import { EnumTermPolicyType } from '@generated/prisma-client/client';
import { TermPolicyContentService } from '@modules/term-policy/services/term-policy.content.service';
import { TermPolicyGenerateContentPresignByAdminUseCase } from '@modules/term-policy/use-cases/term-policy.generate-content-presign-by-admin.use-case';
import type { TermPolicyContentPresignRequestDto } from '@modules/term-policy/dtos/request/term-policy.content-presign.request.dto';

describe('TermPolicyGenerateContentPresignByAdminUseCase', () => {
    const termPolicyContentService: MockProxy<TermPolicyContentService> =
        mock<TermPolicyContentService>();

    const presign: IAwsS3Presign = {
        key: 'term-policies/privacy/v1/en.hbs',
        mime: 'text/plain',
        extension: 'hbs',
        presignUrl: 'https://s3.example.com/presign',
        expiredInSeconds: 900,
    };

    let useCase: TermPolicyGenerateContentPresignByAdminUseCase;

    beforeEach(async () => {
        vi.resetAllMocks();

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                TermPolicyGenerateContentPresignByAdminUseCase,
                {
                    provide: TermPolicyContentService,
                    useValue: termPolicyContentService,
                },
            ],
        }).compile();

        useCase = module.get(TermPolicyGenerateContentPresignByAdminUseCase);
    });

    describe('execute', () => {
        it('wraps the generated presign in the response envelope', async () => {
            const body: TermPolicyContentPresignRequestDto = {
                type: EnumTermPolicyType.privacy,
                version: 1,
                language: EnumMessageLanguage.en,
                size: 1024,
            };
            termPolicyContentService.generateContentPresignByAdmin.mockResolvedValue(
                presign
            );

            const result = await useCase.execute(body);

            expect(result).toEqual({ data: presign });
            expect(
                termPolicyContentService.generateContentPresignByAdmin
            ).toHaveBeenCalledWith(body);
        });
    });
});
