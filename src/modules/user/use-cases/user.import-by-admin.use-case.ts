import { AppBaseException } from '@app/exceptions/app.base.exception';
import { AppUnknownException } from '@app/exceptions/app.unknown.exception';
import { DatabaseUniqueValueGenerationFailedException } from '@common/database/exceptions/database.unique-value-generation-failed.exception';
import { DatabaseUtil } from '@common/database/utils/database.util';
import { HelperDateService } from '@common/helper/services/helper.date.service';
import type { IResponseReturn } from '@common/response/interfaces/response.interface';
import type { EnumActivityLogAction } from '@generated/prisma-client/client';
import { ActivityLogService } from '@modules/activity-log/services/activity-log.service';
import type { IActivityLogStageInput } from '@modules/activity-log/interfaces/activity-log.interface';
import { CountryService } from '@modules/country/services/country.service';
import { EnumNotificationKind } from '@modules/notification/enums/notification.enum';
import { NotificationService } from '@modules/notification/services/notification.service';
import type { IOutboxEffect } from '@modules/outbox/interfaces/outbox.interface';
import { OutboxService } from '@modules/outbox/services/outbox.service';
import { RoleService } from '@modules/role/services/role.service';
import { TermPolicyAcceptanceService } from '@modules/term-policy/services/term-policy.acceptance.service';
import { UserImportService } from '@modules/user/services/user.import.service';
import type { UserImportRequestDto } from '@modules/user/dtos/request/user.import.request.dto';
import type {
    IUser,
    IUserCreateWithWorkspaceInput,
} from '@modules/user/interfaces/user.interface';
import { UserCreateUtil } from '@modules/user/utils/user.create.util';
import { UserRegistrationService } from '@modules/user/services/user.registration.service';
import { WorkspaceService } from '@modules/workspace/services/workspace.service';
import { WorkspaceUtil } from '@modules/workspace/utils/workspace.util';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { IAppUseCase } from '@app/interfaces/app.use-case.interface';

@Injectable()
export class UserImportByAdminUseCase implements IAppUseCase<
    [UserImportRequestDto[], string],
    IResponseReturn<void>
> {
    private readonly userRoleName: string;
    private readonly userCountryName: string;
    private readonly createBulkTimeoutInMs: number;

    constructor(
        private readonly userImportService: UserImportService,
        private readonly workspaceService: WorkspaceService,
        private readonly roleService: RoleService,
        private readonly countryService: CountryService,
        private readonly activityLogService: ActivityLogService,
        private readonly notificationService: NotificationService,
        private readonly userCreateUtil: UserCreateUtil,
        private readonly userRegistrationService: UserRegistrationService,
        private readonly termPolicyAcceptanceService: TermPolicyAcceptanceService,
        private readonly workspaceUtil: WorkspaceUtil,
        private readonly outboxService: OutboxService,
        private readonly databaseUtil: DatabaseUtil,
        private readonly helperDateService: HelperDateService,
        private readonly configService: ConfigService
    ) {
        this.userRoleName =
            this.configService.get<string>('user.default.role')!;
        this.userCountryName = this.configService.get<string>(
            'user.default.country'
        )!;
        this.createBulkTimeoutInMs = this.configService.get<number>(
            'user.create.bulkTimeoutInMs'
        )!;
    }

    private stageActivities(
        stages: IActivityLogStageInput<EnumActivityLogAction>[]
    ): void {
        const activityLogs = stages.map(stage =>
            this.activityLogService.prepare(stage)
        );

        this.activityLogService.stagePrepared(activityLogs);
    }

    private async createAdminUsers(
        inputs: IUserCreateWithWorkspaceInput[],
        effects: IOutboxEffect[],
        timeoutInMs: number
    ): Promise<IUser[]> {
        const attempts = this.workspaceUtil.countSlugAttempts(inputs);
        const termPolicyAcceptances =
            this.userCreateUtil.buildTermPolicyAcceptanceEntries(inputs);

        for (let attempt = 0; attempt < attempts; attempt++) {
            try {
                return await this.outboxService.withTransaction(
                    async tx => {
                        const users =
                            await this.userRegistrationService.createInTx(
                                tx,
                                inputs
                            );

                        const ownedUsers = this.workspaceUtil.buildOwnedUsers(
                            inputs,
                            attempt
                        );
                        await this.workspaceService.createOwnedForUsersInTx(
                            tx,
                            ownedUsers
                        );
                        await this.termPolicyAcceptanceService.acceptPublishedManyInTx(
                            tx,
                            termPolicyAcceptances
                        );
                        await this.outboxService.addManyInTx(tx, effects);

                        return users;
                    },
                    { timeout: timeoutInMs }
                );
            } catch (error: unknown) {
                const isSlugCollision = this.databaseUtil.isUniqueCollision(
                    error,
                    'slug'
                );
                if (isSlugCollision) {
                    continue;
                }

                const mapped = this.userCreateUtil.mapCreateCollision(error);
                if (mapped instanceof AppBaseException) {
                    throw mapped;
                }

                throw new AppUnknownException(mapped);
            }
        }

        throw new DatabaseUniqueValueGenerationFailedException();
    }

    async execute(
        data: UserImportRequestDto[],
        createdBy: string
    ): Promise<IResponseReturn<void>> {
        const rows = data.map(({ email, name, username }) => ({
            email,
            name: name ?? null,
            username,
        }));
        const emails = rows.map(item => item.email);
        const usernames = rows.map(item => item.username);
        // Sequential by design: gate before the work it guards
        const [existingEmails, usernameChecks] = await Promise.all([
            this.userImportService.getExistingEmails(emails),
            this.userImportService.getUsernameChecks(usernames),
        ]);
        this.userImportService.assertEmailsAvailable(existingEmails);

        const [role, countryId] = await Promise.all([
            this.roleService.getByName(this.userRoleName),
            this.countryService.getIdByAlpha2Code(this.userCountryName),
        ]);

        const { inputs, passwordHasheds, passwordStrings } =
            await this.userImportService.prepareImportByAdmin(
                rows,
                createdBy,
                role,
                countryId,
                usernameChecks
            );
        const effects = inputs.map((input, index) => {
            const passwordCreatedAt = this.helperDateService.formatToIso(
                passwordHasheds[index]!.passwordCreated
            );
            const passwordExpiredAt = this.helperDateService.formatToIso(
                passwordHasheds[index]!.passwordExpired
            );

            return this.notificationService.notify(
                EnumNotificationKind.welcomeByAdmin,
                {
                    userId: input.userId,
                    proceedBy: createdBy,
                    password: passwordStrings[index]!,
                    passwordCreatedAt,
                    passwordExpiredAt,
                }
            );
        });
        const users = await this.createAdminUsers(
            inputs,
            effects,
            this.createBulkTimeoutInMs
        );
        const stages = this.userImportService.buildImportByAdminStages(
            inputs,
            users
        );
        this.stageActivities(stages);

        return {};
    }
}
