import { ActivityLogModule } from '@modules/activity-log/activity-log.module';
import { AwsModule } from '@common/aws/aws.module';
import { NotificationModule } from '@modules/notification/notification.module';
import { EnumTermPolicyQueue } from '@modules/term-policy/enums/term-policy.enum';
import { TermPolicyQueueFactory } from '@modules/term-policy/factories/term-policy.queue.factory';
import { TermPolicyQueue } from '@modules/term-policy/queues/term-policy.queue';
import { TermPolicyRecipientRepository } from '@modules/term-policy/repositories/term-policy.recipient.repository';
import { TermPolicyRepository } from '@modules/term-policy/repositories/term-policy.repository';
import { TermPolicyAcceptanceService } from '@modules/term-policy/services/term-policy.acceptance.service';
import { TermPolicyContentService } from '@modules/term-policy/services/term-policy.content.service';
import { TermPolicyRecipientService } from '@modules/term-policy/services/term-policy.recipient.service';
import { TermPolicyService } from '@modules/term-policy/services/term-policy.service';
import { TermPolicyUtil } from '@modules/term-policy/utils/term-policy.util';
import { BullModule } from '@nestjs/bullmq';
import { Global, Module } from '@nestjs/common';
import type { DynamicModule } from '@nestjs/common';

/** Shared module: TermPolicyAcceptanceService for the term-policy guard and the user use cases, TermPolicyRecipientService for the notification use cases, TermPolicyUtil for the term-policy seed. */
@Global()
@Module({})
export class TermPolicyModule {
    static forRoot(): DynamicModule {
        return {
            module: TermPolicyModule,
            controllers: [],
            providers: [
                TermPolicyRepository,
                TermPolicyRecipientRepository,
                TermPolicyService,
                TermPolicyRecipientService,
                TermPolicyContentService,
                TermPolicyAcceptanceService,
                TermPolicyUtil,
                TermPolicyQueue,
                {
                    provide: EnumTermPolicyQueue.termPolicy,
                    useExisting: TermPolicyQueue,
                },
            ],
            exports: [
                TermPolicyService,
                TermPolicyRecipientService,
                TermPolicyContentService,
                TermPolicyAcceptanceService,
                TermPolicyUtil,
                TermPolicyQueue,
            ],
            imports: [
                ActivityLogModule,
                AwsModule,
                NotificationModule,
                BullModule.registerQueueAsync({
                    name: EnumTermPolicyQueue.termPolicy,
                    useClass: TermPolicyQueueFactory,
                }),
            ],
        };
    }
}
