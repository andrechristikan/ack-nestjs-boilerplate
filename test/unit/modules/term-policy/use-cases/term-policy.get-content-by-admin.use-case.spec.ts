import { Test } from '@nestjs/testing';
import type { TestingModule } from '@nestjs/testing';
import { mock } from 'vitest-mock-extended';
import type { MockProxy } from 'vitest-mock-extended';
import type { IAwsS3Presign } from '@common/aws/interfaces/aws.interface';
import { EnumMessageLanguage } from '@common/message/enums/message.enum';
import { TermPolicyContentService } from '@modules/term-policy/services/term-policy.content.service';
import { TermPolicyGetContentByAdminUseCase } from '@modules/term-policy/use-cases/term-policy.get-content-by-admin.use-case';

describe('TermPolicyGetContentByAdminUseCase', () => {
    const termPolicyContentService: MockProxy<TermPolicyContentService> =
        mock<TermPolicyContentService>();

    const presign: IAwsS3Presign = {
        key: 'term-policies/privacy/v1/en.hbs',
        mime: 'text/plain',
        extension: 'hbs',
        presignUrl: 'https://s3.example.com/presign',
        expiredInSeconds: 900,
    };

    let useCase: TermPolicyGetContentByAdminUseCase;

    beforeEach(async () => {
        vi.resetAllMocks();

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                TermPolicyGetContentByAdminUseCase,
                {
                    provide: TermPolicyContentService,
                    useValue: termPolicyContentService,
                },
            ],
        }).compile();

        useCase = module.get(TermPolicyGetContentByAdminUseCase);
    });

    describe('execute', () => {
        it('wraps the resolved presign in the response envelope', async () => {
            termPolicyContentService.getContentByAdmin.mockResolvedValue(
                presign
            );

            const result = await useCase.execute(
                'term-policy-1',
                EnumMessageLanguage.en
            );

            expect(result).toEqual({ data: presign });
            expect(
                termPolicyContentService.getContentByAdmin
            ).toHaveBeenCalledWith('term-policy-1', EnumMessageLanguage.en);
        });
    });
});
