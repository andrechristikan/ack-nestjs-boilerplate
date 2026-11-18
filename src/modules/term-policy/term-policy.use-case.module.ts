import { ActivityLogModule } from '@modules/activity-log/activity-log.module';
import { NotificationModule } from '@modules/notification/notification.module';
import { TermPolicyGetListUserAcceptedUseCase } from '@modules/term-policy/use-cases/term-policy.get-list-user-accepted.use-case';
import { TermPolicyGetListUserPendingUseCase } from '@modules/term-policy/use-cases/term-policy.get-list-user-pending.use-case';
import { TermPolicyUserAcceptUseCase } from '@modules/term-policy/use-cases/term-policy.user-accept.use-case';
import { TermPolicyGenerateContentPresignByAdminUseCase } from '@modules/term-policy/use-cases/term-policy.generate-content-presign-by-admin.use-case';
import { TermPolicyUpdateContentByAdminUseCase } from '@modules/term-policy/use-cases/term-policy.update-content-by-admin.use-case';
import { TermPolicyAddContentByAdminUseCase } from '@modules/term-policy/use-cases/term-policy.add-content-by-admin.use-case';
import { TermPolicyRemoveContentByAdminUseCase } from '@modules/term-policy/use-cases/term-policy.remove-content-by-admin.use-case';
import { TermPolicyGetContentByAdminUseCase } from '@modules/term-policy/use-cases/term-policy.get-content-by-admin.use-case';
import { TermPolicyGetListByAdminUseCase } from '@modules/term-policy/use-cases/term-policy.get-list-by-admin.use-case';
import { TermPolicyGetListPublishedUseCase } from '@modules/term-policy/use-cases/term-policy.get-list-published.use-case';
import { TermPolicyCreateByAdminUseCase } from '@modules/term-policy/use-cases/term-policy.create-by-admin.use-case';
import { TermPolicyDeleteByAdminUseCase } from '@modules/term-policy/use-cases/term-policy.delete-by-admin.use-case';
import { TermPolicyPublishByAdminUseCase } from '@modules/term-policy/use-cases/term-policy.publish-by-admin.use-case';
import { TermPolicyResendEmailByAdminUseCase } from '@modules/term-policy/use-cases/term-policy.resend-email-by-admin.use-case';
import { TermPolicyProcessDeleteContentUseCase } from '@modules/term-policy/use-cases/term-policy.process-delete-content.use-case';
import { TermPolicyProcessPublishUseCase } from '@modules/term-policy/use-cases/term-policy.process-publish.use-case';
import { UserModule } from '@modules/user/user.module';
import { Module } from '@nestjs/common';

@Module({
    controllers: [],
    providers: [
        TermPolicyGetListUserAcceptedUseCase,
        TermPolicyGetListUserPendingUseCase,
        TermPolicyUserAcceptUseCase,
        TermPolicyGenerateContentPresignByAdminUseCase,
        TermPolicyUpdateContentByAdminUseCase,
        TermPolicyAddContentByAdminUseCase,
        TermPolicyRemoveContentByAdminUseCase,
        TermPolicyGetContentByAdminUseCase,
        TermPolicyGetListByAdminUseCase,
        TermPolicyGetListPublishedUseCase,
        TermPolicyCreateByAdminUseCase,
        TermPolicyDeleteByAdminUseCase,
        TermPolicyPublishByAdminUseCase,
        TermPolicyResendEmailByAdminUseCase,
        TermPolicyProcessDeleteContentUseCase,
        TermPolicyProcessPublishUseCase,
    ],
    exports: [
        TermPolicyGetListUserAcceptedUseCase,
        TermPolicyGetListUserPendingUseCase,
        TermPolicyUserAcceptUseCase,
        TermPolicyGenerateContentPresignByAdminUseCase,
        TermPolicyUpdateContentByAdminUseCase,
        TermPolicyAddContentByAdminUseCase,
        TermPolicyRemoveContentByAdminUseCase,
        TermPolicyGetContentByAdminUseCase,
        TermPolicyGetListByAdminUseCase,
        TermPolicyGetListPublishedUseCase,
        TermPolicyCreateByAdminUseCase,
        TermPolicyDeleteByAdminUseCase,
        TermPolicyPublishByAdminUseCase,
        TermPolicyResendEmailByAdminUseCase,
        TermPolicyProcessDeleteContentUseCase,
        TermPolicyProcessPublishUseCase,
    ],
    imports: [ActivityLogModule, NotificationModule, UserModule],
})
export class TermPolicyUseCaseModule {}
