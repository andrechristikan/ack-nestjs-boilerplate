import { InjectQueue } from '@nestjs/bullmq';
import { Injectable } from '@nestjs/common';
import { Queue } from 'bullmq';
import { ConfigService } from '@nestjs/config';
import { HelperEncryptionService } from '@common/helper/services/helper.encryption.service';
import { UserImportEncryptionPurpose } from '@modules/user/constants/user.constant';
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
export class UserQueue extends QueueBase {
    private readonly encryptionSecret: string;

    constructor(
        @InjectQueue(EnumUserQueue.user)
        protected override readonly queue: Queue,
        private readonly configService: ConfigService,
        private readonly helperEncryptionService: HelperEncryptionService
    ) {
        super(queue);

        this.encryptionSecret = this.configService.get<string>(
            'app.encryptionSecret'
        )!;
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
            data: {
                rows: rows.map(({ email, ...row }) => {
                    const encryptedEmail =
                        this.helperEncryptionService.aes256Encrypt(
                            email,
                            this.encryptionSecret,
                            UserImportEncryptionPurpose,
                            activityLog.actorUserId
                        );

                    return { ...row, encryptedEmail };
                }),
                activityLog,
                created: null,
            },
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
