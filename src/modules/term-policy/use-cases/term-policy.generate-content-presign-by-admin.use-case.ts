import type { IAwsS3Presign } from '@common/aws/interfaces/aws.interface';
import type { IResponseReturn } from '@common/response/interfaces/response.interface';
import type { TermPolicyContentPresignRequestDto } from '@modules/term-policy/dtos/request/term-policy.content-presign.request.dto';
import { TermPolicyContentService } from '@modules/term-policy/services/term-policy.content.service';
import { Injectable } from '@nestjs/common';
import type { IAppUseCase } from '@app/interfaces/app.use-case.interface';

@Injectable()
export class TermPolicyGenerateContentPresignByAdminUseCase implements IAppUseCase<
    [TermPolicyContentPresignRequestDto],
    IResponseReturn<IAwsS3Presign>
> {
    constructor(
        private readonly termPolicyContentService: TermPolicyContentService
    ) {}

    async execute(
        body: TermPolicyContentPresignRequestDto
    ): Promise<IResponseReturn<IAwsS3Presign>> {
        const presign =
            await this.termPolicyContentService.generateContentPresignByAdmin(
                body
            );

        return { data: presign };
    }
}
