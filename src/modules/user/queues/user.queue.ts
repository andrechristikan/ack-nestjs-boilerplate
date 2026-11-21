import { InjectQueue } from '@nestjs/bullmq';
import { Injectable } from '@nestjs/common';
import type { OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Queue } from 'bullmq';
import { QueueBase } from '@common/queue/bases/queue.base';
import { EnumUserProcess, EnumUserQueue } from '@modules/user/enums/user.enum';
import { EnumQueuePriority } from '@common/queue/enums/queue.enum';
import type {
    EnumUserStatus,
    UserPhoto,
} from '@generated/prisma-client/client';
import type { IActivityLogActorPayload } from '@modules/activity-log/interfaces/activity-log.interface';
import type {
    IUserDeletePhotoEffect,
    IUserDeleteSelfEffect,
    IUserExportByAdminEffect,
    IUserImport,
    IUserImportByAdminEffect,
} from '@modules/user/interfaces/user.interface';

@Injectable()
export class UserQueue extends QueueBase implements OnModuleInit {
    private readonly timezone: string;
    private readonly purgeExpiredCron: string;

    constructor(
        @InjectQueue(EnumUserQueue.user)
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
            EnumUserProcess.purgeExpired,
            {
                pattern: this.purgeExpiredCron,
                tz: this.timezone,
            },
            {
                name: EnumUserProcess.purgeExpired,
                data: {},
                opts: {
                    priority: EnumQueuePriority.low,
                },
            }
        );
    }

    deletePhotoEffect(
        userId: string,
        photo: UserPhoto
    ): IUserDeletePhotoEffect {
        return {
            queue: EnumUserQueue.user,
            name: EnumUserProcess.deletePhoto,
            data: { userId, key: photo.key, access: photo.access },
            priority: EnumQueuePriority.low,
            idempotencyKey: null,
        };
    }

    importByAdminEffect(
        rows: IUserImport[],
        activityLog: IActivityLogActorPayload
    ): IUserImportByAdminEffect {
        return {
            queue: EnumUserQueue.user,
            name: EnumUserProcess.importByAdmin,
            data: { rows, activityLog, created: null },
            priority: EnumQueuePriority.medium,
            idempotencyKey: null,
        };
    }

    exportByAdminEffect(
        status: EnumUserStatus[],
        roleId: string | null,
        countryId: string | null,
        activityLog: IActivityLogActorPayload
    ): IUserExportByAdminEffect {
        return {
            queue: EnumUserQueue.user,
            name: EnumUserProcess.exportByAdmin,
            data: { status, roleId, countryId, activityLog, exported: null },
            priority: EnumQueuePriority.medium,
            idempotencyKey: null,
        };
    }

    deleteSelfEffect(
        userId: string,
        ownedWorkspaceIds: string[],
        activityLog: IActivityLogActorPayload
    ): IUserDeleteSelfEffect {
        return {
            queue: EnumUserQueue.user,
            name: EnumUserProcess.deleteSelf,
            data: { userId, ownedWorkspaceIds, activityLog },
            priority: EnumQueuePriority.high,
            idempotencyKey: null,
        };
    }
}
