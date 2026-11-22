import { InjectQueue } from '@nestjs/bullmq';
import { Injectable } from '@nestjs/common';
import type { OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Queue } from 'bullmq';
import { QueueBase } from '@common/queue/bases/queue.base';
import {
    EnumUserAuthProcess,
    EnumUserQueue,
} from '@modules/user/enums/user.enum';
import { EnumQueuePriority } from '@common/queue/enums/queue.enum';
import type { ISessionRef } from '@modules/session/interfaces/session.interface';
import type { IUserPurgeLoginsEffect } from '@modules/user/interfaces/user.interface';

@Injectable()
export class UserAuthQueue extends QueueBase implements OnModuleInit {
    private readonly timezone: string;
    private readonly purgeExpiredCron: string;

    constructor(
        @InjectQueue(EnumUserQueue.userAuth)
        protected readonly queue: Queue,
        private readonly configService: ConfigService
    ) {
        super(queue);
        this.timezone = this.configService.get<string>('app.timezone')!;
        this.purgeExpiredCron = this.configService.get<string>(
            'user.purgeExpiredCron'
        )!;
    }

    async onModuleInit(): Promise<void> {
        await this.queue.upsertJobScheduler(
            EnumUserAuthProcess.purgeExpired,
            {
                pattern: this.purgeExpiredCron,
                tz: this.timezone,
            },
            {
                name: EnumUserAuthProcess.purgeExpired,
                data: {},
                opts: {
                    priority: EnumQueuePriority.low,
                },
            }
        );
    }

    purgeLoginsEffect(
        userId: string,
        sessions: ISessionRef[]
    ): IUserPurgeLoginsEffect {
        return {
            queue: EnumUserQueue.userAuth,
            name: EnumUserAuthProcess.purgeLogins,
            data: { userId, sessions },
            priority: EnumQueuePriority.high,
            idempotencyKey: null,
        };
    }
}
