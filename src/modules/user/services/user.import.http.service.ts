import type { IResponseReturn } from '@common/response/interfaces/response.interface';
import { EnumFileExtensionDocument } from '@common/file/enums/file.enum';
import { FileService } from '@common/file/services/file.service';
import { HelperDateService } from '@common/helper/services/helper.date.service';
import { PaginationStoreKey } from '@common/pagination/constants/pagination.constant';
import { PaginationQueryUtil } from '@common/pagination/utils/pagination.query.util';
import { RequestStoreService } from '@common/request/services/request.store.service';
import type { IResponseFileReturn } from '@common/response/interfaces/response.interface';
import { EnumActivityLogAction, Prisma } from '@generated/prisma-client/client';
import { ActivityLogDomain } from '@modules/activity-log/domains/activity-log.domain';
import { EnumNotificationKind } from '@modules/notification/enums/notification.enum';
import { NotificationQueue } from '@modules/notification/queues/notification.queue';
import { NotificationUtil } from '@modules/notification/utils/notification.util';
import { EnumUserCreateMode } from '@modules/user/enums/user.enum';
import { UserOnboardingUtil } from '@modules/user/utils/user.onboarding.util';
import { UserDefaultStatus } from '@modules/user/constants/user.list.constant';
import type { UserExportRequestDto } from '@modules/user/dtos/request/user.export.request.dto';
import type { UserImportRequestDto } from '@modules/user/dtos/request/user.import.request.dto';
import type { UserExportResponseDto } from '@modules/user/dtos/response/user.export.response.dto';
import { OnboardingDomain } from '@modules/onboarding/domains/onboarding.domain';
import { UserImportDomain } from '@modules/user/domains/user.import.domain';
import { Injectable } from '@nestjs/common';

@Injectable()
export class UserImportHttpService {
    constructor(
        private readonly userImportDomain: UserImportDomain,
        private readonly onboardingDomain: OnboardingDomain,
        private readonly activityLogDomain: ActivityLogDomain,
        private readonly userOnboardingUtil: UserOnboardingUtil,
        private readonly notificationQueue: NotificationQueue,
        private readonly notificationUtil: NotificationUtil,
        private readonly helperDateService: HelperDateService,
        private readonly fileService: FileService,
        private readonly paginationQueryUtil: PaginationQueryUtil,
        private readonly requestStoreService: RequestStoreService
    ) {}

    async importByAdmin(
        data: UserImportRequestDto[],
        createdBy: string
    ): Promise<IResponseReturn<void>> {
        const { inputs, users, passwordHasheds, passwordStrings } =
            await this.onboardingDomain.importByAdmin(
                data.map(({ email, name, username }) => ({
                    email,
                    name: name ?? null,
                    username,
                })),
                createdBy
            );
        const stages = this.userOnboardingUtil.buildActivityStages(
            EnumUserCreateMode.admin,
            inputs,
            users,
            EnumActivityLogAction.adminUserImport
        );
        const activityLogs = stages.map(stage =>
            this.activityLogDomain.prepare(stage)
        );

        this.activityLogDomain.stagePrepared(activityLogs);

        const items = users.map((created, index) => {
            const passwordCreatedAt = this.helperDateService.formatToIso(
                passwordHasheds[index]!.passwordCreated
            );
            const passwordExpiredAt = this.helperDateService.formatToIso(
                passwordHasheds[index]!.passwordExpired
            );
            const recipient = this.notificationUtil.mapRecipient(
                created,
                EnumNotificationKind.welcomeByAdmin,
                [],
                []
            );

            return {
                recipient,
                data: {
                    password: passwordStrings[index]!,
                    passwordCreatedAt,
                    passwordExpiredAt,
                },
            };
        });

        await this.notificationQueue.sendWelcomeByAdminBulk(items, createdBy);

        return {};
    }

    async exportByAdmin(
        query: UserExportRequestDto
    ): Promise<IResponseFileReturn> {
        const status = this.paginationQueryUtil.inEnum(
            Prisma.UserScalarFieldEnum.status,
            query.status,
            UserDefaultStatus
        );
        const roleId = this.paginationQueryUtil.equalString(
            Prisma.UserScalarFieldEnum.roleId,
            query.roleId
        );
        const countryId = this.paginationQueryUtil.equalString(
            Prisma.UserScalarFieldEnum.countryId,
            query.countryId
        );
        this.requestStoreService.merge(PaginationStoreKey, {
            filters: {
                ...(status?.storeFilter ?? {}),
                ...(roleId?.storeFilter ?? {}),
                ...(countryId?.storeFilter ?? {}),
            },
        });

        const data = await this.userImportDomain.exportByAdmin(
            status?.where ?? null,
            roleId?.where ?? null,
            countryId?.where ?? null
        );

        const users: UserExportResponseDto[] = data.map(user => ({
            id: user.id,
            createdAt: user.createdAt,
            createdBy: user.createdBy,
            updatedAt: user.updatedAt,
            updatedBy: user.updatedBy,
            deletedAt: user.deletedAt,
            deletedBy: user.deletedBy,
            name: user.name,
            username: user.username as Lowercase<string>,
            isVerified: user.isVerified,
            verifiedAt: user.verifiedAt,
            email: user.email as Lowercase<string>,
            roleId: user.roleId,
            status: user.status,
            countryId: user.countryId,
            photo: user.photo?.completedUrl ?? null,
            role: user.role.name,
        }));

        const csv = this.fileService.writeCsv<UserExportResponseDto>(users);

        return {
            data: csv,
            extension: EnumFileExtensionDocument.csv,
        };
    }
}
