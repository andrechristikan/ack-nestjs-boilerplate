import type { IAwsS3Presign } from '@common/aws/interfaces/aws.interface';
import { HelperDateService } from '@common/helper/services/helper.date.service';
import { EnumMessageLanguage } from '@common/message/enums/message.enum';
import type { IResponseReturn } from '@common/response/interfaces/response.interface';
import type { TermPolicyContentPresignRequestDto } from '@modules/term-policy/dtos/request/term-policy.content-presign.request.dto';
import type { TermPolicyContentRequestDto } from '@modules/term-policy/dtos/request/term-policy.content.request.dto';
import type { TermPolicyRemoveContentRequestDto } from '@modules/term-policy/dtos/request/term-policy.remove-content.request.dto';
import { EnumActivityLogAction } from '@generated/prisma-client/client';
import type { TermPolicy } from '@generated/prisma-client/client';
import { ActivityLogDomain } from '@modules/activity-log/domains/activity-log.domain';
import type { IActivityLogStaged } from '@modules/activity-log/interfaces/activity-log.interface';
import { TermPolicyContentDomain } from '@modules/term-policy/domains/term-policy.content.domain';
import { TermPolicyUtil } from '@modules/term-policy/utils/term-policy.util';
import { Injectable } from '@nestjs/common';

@Injectable()
export class TermPolicyContentHttpService {
    constructor(
        private readonly termPolicyContentDomain: TermPolicyContentDomain,
        private readonly termPolicyUtil: TermPolicyUtil,
        private readonly activityLogDomain: ActivityLogDomain,
        private readonly helperDateService: HelperDateService
    ) {}

    private prepareActivityLog(
        action: EnumActivityLogAction,
        termPolicy: TermPolicy
    ): IActivityLogStaged {
        const timestamp = this.helperDateService.create();
        const metadata = this.termPolicyUtil.mapActivityLogMetadata(
            termPolicy,
            timestamp
        );

        return this.activityLogDomain.prepare({
            action,
            metadata,
        });
    }

    async generateContentPresignByAdmin(
        body: TermPolicyContentPresignRequestDto
    ): Promise<IResponseReturn<IAwsS3Presign>> {
        const presign =
            await this.termPolicyContentDomain.generateContentPresignByAdmin(
                body
            );

        return { data: presign };
    }

    async updateContentByAdmin(
        termPolicyId: string,
        body: TermPolicyContentRequestDto
    ): Promise<IResponseReturn<void>> {
        const termPolicy =
            await this.termPolicyContentDomain.updateContentByAdmin(
                termPolicyId,
                body
            );
        const activityLogs = [
            this.prepareActivityLog(
                EnumActivityLogAction.adminTermPolicyUpdateContent,
                termPolicy
            ),
        ];
        this.activityLogDomain.stagePrepared(activityLogs);

        return {};
    }

    async addContentByAdmin(
        termPolicyId: string,
        body: TermPolicyContentRequestDto
    ): Promise<IResponseReturn<void>> {
        const termPolicy = await this.termPolicyContentDomain.addContentByAdmin(
            termPolicyId,
            body
        );
        const activityLogs = [
            this.prepareActivityLog(
                EnumActivityLogAction.adminTermPolicyAddContent,
                termPolicy
            ),
        ];
        this.activityLogDomain.stagePrepared(activityLogs);

        return {};
    }

    async removeContentByAdmin(
        termPolicyId: string,
        { language }: TermPolicyRemoveContentRequestDto
    ): Promise<IResponseReturn<void>> {
        const termPolicy =
            await this.termPolicyContentDomain.removeContentByAdmin(
                termPolicyId,
                language
            );
        const activityLogs = [
            this.prepareActivityLog(
                EnumActivityLogAction.adminTermPolicyRemoveContent,
                termPolicy
            ),
        ];
        this.activityLogDomain.stagePrepared(activityLogs);

        return {};
    }

    async getContentByAdmin(
        termPolicyId: string,
        language: EnumMessageLanguage
    ): Promise<IResponseReturn<IAwsS3Presign>> {
        const presign = await this.termPolicyContentDomain.getContentByAdmin(
            termPolicyId,
            language
        );

        return { data: presign };
    }
}
