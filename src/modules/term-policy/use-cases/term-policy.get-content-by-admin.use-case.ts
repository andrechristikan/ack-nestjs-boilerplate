import type { IAwsS3Presign } from '@common/aws/interfaces/aws.interface';
import { EnumMessageLanguage } from '@common/message/enums/message.enum';
import type { IResponseReturn } from '@common/response/interfaces/response.interface';
import { TermPolicyContentService } from '@modules/term-policy/services/term-policy.content.service';
import { Injectable } from '@nestjs/common';
import type { IAppUseCase } from '@app/interfaces/app.use-case.interface';

@Injectable()
export class TermPolicyGetContentByAdminUseCase implements IAppUseCase<
    [string, EnumMessageLanguage],
    IResponseReturn<IAwsS3Presign>
> {
    constructor(
        private readonly termPolicyContentService: TermPolicyContentService
    ) {}

    async execute(
        termPolicyId: string,
        language: EnumMessageLanguage
    ): Promise<IResponseReturn<IAwsS3Presign>> {
        const presign = await this.termPolicyContentService.getContentByAdmin(
            termPolicyId,
            language
        );

        return { data: presign };
    }
}
