import { AwsModule } from '@common/aws/aws.module';
import { EnumTermPolicyQueue } from '@modules/term-policy/enums/term-policy.enum';
import { TermPolicyQueueFactory } from '@modules/term-policy/factories/term-policy.queue.factory';
import { TermPolicyQueue } from '@modules/term-policy/queues/term-policy.queue';
import { TermPolicyAcceptanceAnalyticRepository } from '@modules/term-policy/repositories/term-policy.acceptance.analytic.repository';
import { TermPolicyAnalyticRepository } from '@modules/term-policy/repositories/term-policy.analytic.repository';
import { TermPolicyRepository } from '@modules/term-policy/repositories/term-policy.repository';
import { TermPolicyAcceptanceAnalyticService } from '@modules/term-policy/services/term-policy.acceptance.analytic.service';
import { TermPolicyAcceptanceService } from '@modules/term-policy/services/term-policy.acceptance.service';
import { TermPolicyAnalyticService } from '@modules/term-policy/services/term-policy.analytic.service';
import { TermPolicyContentService } from '@modules/term-policy/services/term-policy.content.service';
import { TermPolicyService } from '@modules/term-policy/services/term-policy.service';
import { TermPolicyUtil } from '@modules/term-policy/utils/term-policy.util';
import { BullModule } from '@nestjs/bullmq';
import { Global, Module } from '@nestjs/common';

/** Shared module: TermPolicyAcceptanceService for the term-policy guard and the user use cases, TermPolicyAcceptanceAnalyticService for the analytic services, TermPolicyUtil for the term-policy seed. */
@Global()
@Module({
    controllers: [],
    providers: [
        TermPolicyRepository,
        TermPolicyAnalyticRepository,
        TermPolicyAcceptanceAnalyticRepository,
        TermPolicyService,
        TermPolicyContentService,
        TermPolicyAcceptanceService,
        TermPolicyUtil,
        TermPolicyAnalyticService,
        TermPolicyAcceptanceAnalyticService,
        TermPolicyQueue,
    ],
    exports: [
        TermPolicyService,
        TermPolicyContentService,
        TermPolicyAcceptanceService,
        TermPolicyUtil,
        TermPolicyAnalyticService,
        TermPolicyAcceptanceAnalyticService,
        TermPolicyQueue,
    ],
    imports: [
        AwsModule,
        BullModule.registerQueueAsync({
            name: EnumTermPolicyQueue.termPolicy,
            useClass: TermPolicyQueueFactory,
        }),
    ],
})
export class TermPolicyModule {}
