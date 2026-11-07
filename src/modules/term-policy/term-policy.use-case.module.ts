import { NotificationModule } from '@modules/notification/notification.module';
import { TermPolicyProcessor } from '@modules/term-policy/processors/term-policy.processor';
import { TermPolicyModule } from '@modules/term-policy/term-policy.module';
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
import { TermPolicyProcessCopyContentUseCase } from '@modules/term-policy/use-cases/term-policy.process-copy-content.use-case';
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
        TermPolicyProcessCopyContentUseCase,
        TermPolicyProcessor,
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
        TermPolicyProcessCopyContentUseCase,
    ],
    imports: [TermPolicyModule, NotificationModule],
})
export class TermPolicyUseCaseModule {}
