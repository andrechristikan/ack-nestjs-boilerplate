import { AnalyticQueueFactory } from '@modules/analytic/factories/analytic.queue.factory';
import { AnalyticQueue } from '@modules/analytic/queues/analytic.queue';
import { EnumAnalyticQueue } from '@modules/analytic/enums/analytic.enum';
import { AnalyticCache } from '@modules/analytic/caches/analytic.cache';
import { AnalyticAuthRepository } from '@modules/analytic/repositories/analytic.auth.repository';
import { AnalyticApiKeyRepository } from '@modules/analytic/repositories/analytic.api-key.repository';
import { AnalyticApiKeyService } from '@modules/analytic/services/analytic.api-key.service';
import { AnalyticDeviceRepository } from '@modules/analytic/repositories/analytic.device.repository';
import { AnalyticDeviceService } from '@modules/analytic/services/analytic.device.service';
import { AnalyticAuthService } from '@modules/analytic/services/analytic.auth.service';
import { AnalyticFraudRepository } from '@modules/analytic/repositories/analytic.fraud.repository';
import { AnalyticAnomalyRepository } from '@modules/analytic/repositories/analytic.anomaly.repository';
import { AnalyticAnomalyService } from '@modules/analytic/services/analytic.anomaly.service';
import { AnalyticDateService } from '@modules/analytic/services/analytic.date.service';
import { AnalyticUserRepository } from '@modules/analytic/repositories/analytic.user.repository';
import { AnalyticUserService } from '@modules/analytic/services/analytic.user.service';
import { AnalyticPipelineUtil } from '@modules/analytic/utils/analytic.pipeline.util';
import { AnalyticTermPolicyRepository } from '@modules/analytic/repositories/analytic.term-policy.repository';
import { AnalyticTermPolicyService } from '@modules/analytic/services/analytic.term-policy.service';
import { AnalyticSnapshotRepository } from '@modules/analytic/repositories/analytic.snapshot.repository';
import { AnalyticFraudService } from '@modules/analytic/services/analytic.fraud.service';
import { AnalyticSnapshotService } from '@modules/analytic/services/analytic.snapshot.service';
import { AnalyticWorkspaceRepository } from '@modules/analytic/repositories/analytic.workspace.repository';
import { AnalyticWorkspaceService } from '@modules/analytic/services/analytic.workspace.service';
import { AnalyticProjectRepository } from '@modules/analytic/repositories/analytic.project.repository';
import { AnalyticProjectService } from '@modules/analytic/services/analytic.project.service';
import { AnalyticNotificationRepository } from '@modules/analytic/repositories/analytic.notification.repository';
import { AnalyticNotificationService } from '@modules/analytic/services/analytic.notification.service';
import { AnalyticDateUtil } from '@modules/analytic/utils/analytic.date.util';
import { AnalyticFraudUtil } from '@modules/analytic/utils/analytic.fraud.util';
import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';

@Module({
    controllers: [],
    providers: [
        AnalyticCache,
        AnalyticDateUtil,
        AnalyticFraudUtil,
        AnalyticPipelineUtil,
        AnalyticDateService,
        AnalyticAnomalyService,
        AnalyticFraudService,
        AnalyticSnapshotRepository,
        AnalyticAnomalyRepository,
        AnalyticFraudRepository,
        AnalyticAuthRepository,
        AnalyticUserRepository,
        AnalyticDeviceRepository,
        AnalyticApiKeyRepository,
        AnalyticTermPolicyRepository,
        AnalyticWorkspaceRepository,
        AnalyticProjectRepository,
        AnalyticNotificationRepository,
        AnalyticSnapshotService,
        AnalyticAuthService,
        AnalyticUserService,
        AnalyticDeviceService,
        AnalyticApiKeyService,
        AnalyticTermPolicyService,
        AnalyticWorkspaceService,
        AnalyticProjectService,
        AnalyticNotificationService,
        AnalyticQueue,
        {
            provide: EnumAnalyticQueue.analytic,
            useExisting: AnalyticQueue,
        },
    ],
    exports: [
        AnalyticDateService,
        AnalyticAnomalyService,
        AnalyticFraudService,
        AnalyticSnapshotService,
        AnalyticAuthService,
        AnalyticUserService,
        AnalyticDeviceService,
        AnalyticApiKeyService,
        AnalyticTermPolicyService,
        AnalyticWorkspaceService,
        AnalyticProjectService,
        AnalyticNotificationService,
        AnalyticQueue,
    ],
    imports: [
        BullModule.registerQueueAsync({
            name: EnumAnalyticQueue.analytic,
            useClass: AnalyticQueueFactory,
        }),
    ],
})
export class AnalyticModule {}
