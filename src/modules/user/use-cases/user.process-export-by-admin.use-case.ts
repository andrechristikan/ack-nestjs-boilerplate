import type { IAppUseCase } from '@app/interfaces/app.use-case.interface';
import { AppBaseException } from '@app/exceptions/app.base.exception';
import { AwsS3Service } from '@common/aws/services/aws.s3.service';
import { DatabaseService } from '@common/database/services/database.service';
import { FileService } from '@common/file/services/file.service';
import { HelperDateService } from '@common/helper/services/helper.date.service';
import { HelperStringService } from '@common/helper/services/helper.string.service';
import { MessageService } from '@common/message/services/message.service';
import { OutboxService } from '@common/outbox/services/outbox.service';
import { QueueException } from '@common/queue/exceptions/queue.exception';
import {
    EnumActivityLogAction,
    EnumAwsS3Accessibility,
} from '@generated/prisma-client/client';
import { ActivityLogQueue } from '@modules/activity-log/queues/activity-log.queue';
import { EnumNotificationKind } from '@modules/notification/enums/notification.enum';
import { NotificationQueue } from '@modules/notification/queues/notification.queue';
import type {
    IUserExport,
    IUserExportByAdminPayload,
    IUserExportByAdminQueueResponse,
    IUserExportUploaded,
} from '@modules/user/interfaces/user.interface';
import { UserImportService } from '@modules/user/services/user.import.service';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class UserProcessExportByAdminUseCase implements IAppUseCase<
    [string, IUserExportByAdminPayload],
    IUserExportByAdminQueueResponse
> {
    private readonly temporaryPath: string;
    private readonly pathPattern: string;
    private readonly presignExpiresInSeconds: number;

    constructor(
        private readonly userImportService: UserImportService,
        private readonly fileService: FileService,
        private readonly awsS3Service: AwsS3Service,
        private readonly activityLogQueue: ActivityLogQueue,
        private readonly notificationQueue: NotificationQueue,
        private readonly databaseService: DatabaseService,
        private readonly outboxService: OutboxService,
        private readonly helperStringService: HelperStringService,
        private readonly helperDateService: HelperDateService,
        private readonly messageService: MessageService,
        private readonly configService: ConfigService
    ) {
        this.temporaryPath = this.configService.get<string>(
            'aws.s3.temporaryPath'
        )!;
        this.pathPattern = this.configService.get<string>(
            'user.export.pathPattern'
        )!;
        this.presignExpiresInSeconds = this.configService.get<number>(
            'user.export.presignExpiresInSeconds'
        )!;
    }

    private async uploadExport(
        outboxId: string,
        { status, roleId, countryId }: IUserExportByAdminPayload
    ): Promise<IUserExportUploaded> {
        const users = await this.userImportService.exportByAdmin(
            status,
            roleId,
            countryId
        );
        const rows: IUserExport[] = users.map(user => ({
            id: user.id,
            createdAt: user.createdAt,
            createdBy: user.createdBy,
            updatedAt: user.updatedAt,
            updatedBy: user.updatedBy,
            deletedAt: user.deletedAt,
            deletedBy: user.deletedBy,
            name: user.name,
            username: user.username,
            isVerified: user.isVerified,
            verifiedAt: user.verifiedAt,
            email: user.email,
            roleId: user.roleId,
            status: user.status,
            countryId: user.countryId,
            photo: user.photo?.completedUrl ?? null,
            role: user.role.name,
        }));
        const csv = this.fileService.writeCsv<IUserExport>(rows);
        const file = Buffer.from(csv);
        const key = this.helperStringService.fillPattern(this.pathPattern, {
            temporaryPath: this.temporaryPath,
            outboxId,
        });
        const options = { access: EnumAwsS3Accessibility.private };

        const stored = await this.awsS3Service.putItem(
            { key, file, size: file.byteLength },
            { ...options, forceUpdate: true }
        );
        if (stored === null) {
            const message = this.messageService.setMessage(
                'user.queue.error.exportFailed'
            );

            throw new QueueException(message, true);
        }

        const presign = await this.awsS3Service.presignGetItem(key, {
            ...options,
            expiredInSeconds: this.presignExpiresInSeconds,
        });
        if (presign === null) {
            const message = this.messageService.setMessage(
                'user.queue.error.exportFailed'
            );

            throw new QueueException(message, true);
        }

        const now = this.helperDateService.now();
        const duration = this.helperDateService.createDuration({
            seconds: this.presignExpiresInSeconds,
        });
        const expiresAt = this.helperDateService.forward(now, duration);
        const expiredAt = this.helperDateService.formatToIso(expiresAt);

        return { count: rows.length, link: presign.presignUrl, expiredAt };
    }

    async execute(
        outboxId: string,
        payload: IUserExportByAdminPayload
    ): Promise<IUserExportByAdminQueueResponse> {
        const { activityLog, exported: recorded } = payload;
        const message = this.messageService.setMessage(
            'user.queue.exportByAdmin'
        );
        if (recorded !== null) {
            return { message, exported: recorded };
        }

        let uploaded: IUserExportUploaded;
        try {
            uploaded = await this.uploadExport(outboxId, payload);
        } catch (error: unknown) {
            if (
                error instanceof AppBaseException ||
                error instanceof QueueException
            ) {
                throw error;
            }

            const message = this.messageService.setMessage(
                'user.queue.error.exportFailed'
            );

            throw new QueueException(message, true, error);
        }

        const { count, link, expiredAt } = uploaded;
        await this.databaseService.withTransaction(async tx => {
            const notification = this.notificationQueue.notify(
                EnumNotificationKind.userExportResult,
                {
                    userId: activityLog.actorUserId,
                    proceedBy: activityLog.actorUserId,
                    reference: outboxId,
                    link,
                    count,
                    expiredAt,
                }
            );
            const entry = this.activityLogQueue.recordEffectFromPayload(
                activityLog,
                {
                    action: EnumActivityLogAction.adminUserExported,
                    metadata: { count },
                }
            );
            await Promise.all([
                this.outboxService.addManyInTx(tx, [notification, entry]),
                this.outboxService.updateDataInTx(tx, outboxId, {
                    exported: count,
                }),
            ]);
        });

        return { message, exported: count };
    }
}
