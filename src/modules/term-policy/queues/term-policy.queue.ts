import { DatabaseUtil } from '@common/database/utils/database.util';
import { HelperStringService } from '@common/helper/services/helper.string.service';
import { QueueBase } from '@common/queue/bases/queue.base';
import { EnumQueuePriority } from '@common/queue/enums/queue.enum';
import {
    EnumTermPolicyProcess,
    EnumTermPolicyQueue,
} from '@modules/term-policy/enums/term-policy.enum';
import type {
    ITermPolicyDeleteContentEffect,
    ITermPolicyPublishEffect,
    ITermPolicyPublishInput,
    ITermPolicyPublishPayload,
} from '@modules/term-policy/interfaces/term-policy.interface';
import { InjectQueue } from '@nestjs/bullmq';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Queue } from 'bullmq';

@Injectable()
export class TermPolicyQueue extends QueueBase {
    private readonly publishPattern: string;
    private readonly resendPublishPattern: string;

    constructor(
        @InjectQueue(EnumTermPolicyQueue.termPolicy)
        protected override readonly queue: Queue,
        private readonly configService: ConfigService,
        private readonly databaseUtil: DatabaseUtil,
        private readonly helperStringService: HelperStringService
    ) {
        super(queue);
        this.publishPattern = this.configService.get<string>(
            'termPolicy.idempotencyKey.publishPattern'
        )!;
        this.resendPublishPattern = this.configService.get<string>(
            'termPolicy.idempotencyKey.resendPublishPattern'
        )!;
    }

    publishEffect(
        payload: ITermPolicyPublishPayload,
        proceedBy: string
    ): ITermPolicyPublishEffect {
        const idempotencyKey = this.helperStringService.fillPattern(
            this.publishPattern,
            {
                process: EnumTermPolicyProcess.publish,
                termPolicyId: payload.termPolicyId,
            }
        );

        return {
            queue: EnumTermPolicyQueue.termPolicy,
            name: EnumTermPolicyProcess.publish,
            data: { proceedBy, data: payload },
            priority: EnumQueuePriority.medium,
            idempotencyKey,
        };
    }

    /** Draws one fresh nonce and puts it in the effect's data and its key. */
    resendPublishEffect(
        payload: ITermPolicyPublishInput,
        proceedBy: string
    ): ITermPolicyPublishEffect {
        const resendNonce = this.databaseUtil.createId();
        const idempotencyKey = this.helperStringService.fillPattern(
            this.resendPublishPattern,
            {
                process: EnumTermPolicyProcess.publish,
                termPolicyId: payload.termPolicyId,
                resendNonce,
            }
        );

        return {
            queue: EnumTermPolicyQueue.termPolicy,
            name: EnumTermPolicyProcess.publish,
            data: { proceedBy, data: { ...payload, resendNonce } },
            priority: EnumQueuePriority.medium,
            idempotencyKey,
        };
    }

    deleteContentEffect(keys: string[]): ITermPolicyDeleteContentEffect {
        return {
            queue: EnumTermPolicyQueue.termPolicy,
            name: EnumTermPolicyProcess.deleteContent,
            data: { keys },
            priority: EnumQueuePriority.low,
            idempotencyKey: null,
        };
    }
}
