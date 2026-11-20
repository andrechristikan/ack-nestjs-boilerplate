import type { IUserImportByAdminEffect } from '@modules/user/interfaces/user.interface';
import { Test } from '@nestjs/testing';
import type { TestingModule } from '@nestjs/testing';
import { mock } from 'vitest-mock-extended';
import type { MockProxy } from 'vitest-mock-extended';
import { EnumQueuePriority } from '@common/queue/enums/queue.enum';
import { OutboxService } from '@common/outbox/services/outbox.service';
import { EnumUserProcess, EnumUserQueue } from '@modules/user/enums/user.enum';
import { UserImportEmailExistException } from '@modules/user/exceptions/user.import-email-exist.exception';
import { UserImportUsernameExistException } from '@modules/user/exceptions/user.import-username-exist.exception';
import { UserUsernameContainBadWordException } from '@modules/user/exceptions/user.username-contain-bad-word.exception';
import { EnumUserStatusCodeError } from '@modules/user/enums/user.status-code.enum';
import type { UserImportRequestDto } from '@modules/user/dtos/request/user.import.request.dto';
import type {
    IUserImport,
    IUserImportUsernameChecks,
} from '@modules/user/interfaces/user.interface';
import { UserImportService } from '@modules/user/services/user.import.service';
import { UserQueue } from '@modules/user/queues/user.queue';
import { ActivityLogQueue } from '@modules/activity-log/queues/activity-log.queue';
import { UserImportByAdminUseCase } from '@modules/user/use-cases/user.import-by-admin.use-case';
import {
    buildUser,
    buildRequestContext,
    buildApiKeyContext,
    buildUserContext,
    buildAuthJwtAccessContext,
} from '@test/unit/helpers/test.unit.request.helper';

describe('UserImportByAdminUseCase', () => {
    const userQueue: MockProxy<UserQueue> = mock<UserQueue>();
    const activityLogQueue: MockProxy<ActivityLogQueue> =
        mock<ActivityLogQueue>();
    const userImportService: MockProxy<UserImportService> =
        mock<UserImportService>();
    const outboxService: MockProxy<OutboxService> = mock<OutboxService>();
    let useCase: UserImportByAdminUseCase;

    const requestContext = buildRequestContext();
    const apiKeyContext = buildApiKeyContext();
    const userContext = buildUserContext(
        buildUser('admin-bramble', 'admin-bramble@example.com')
    );
    const authContext = buildAuthJwtAccessContext(userContext.user.id);
    const importEffect: IUserImportByAdminEffect = {
        queue: EnumUserQueue.user,
        name: EnumUserProcess.importByAdmin,
        data: {
            rows: [
                {
                    username: 'bramble2fox',
                    email: 'bramble@example.com',
                    name: null,
                },
            ],
            activityLog: {
                apiKeyId: apiKeyContext.apiKey.id,
                actorUserId: authContext.userId,
                workspaceId: null,
                requestLog: requestContext.requestLog,
            },
            created: null,
        },
        priority: EnumQueuePriority.medium,
        idempotencyKey: null,
    };

    beforeEach(async () => {
        outboxService.add.mockResolvedValue('outbox-bramble');
        activityLogQueue.toPayload.mockReturnValue(
            importEffect.data.activityLog
        );
        userQueue.importByAdminEffect.mockReturnValue(importEffect);

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                UserImportByAdminUseCase,
                { provide: UserQueue, useValue: userQueue },
                { provide: ActivityLogQueue, useValue: activityLogQueue },
                { provide: UserImportService, useValue: userImportService },
                { provide: OutboxService, useValue: outboxService },
            ],
        }).compile();
        useCase = module.get(UserImportByAdminUseCase);
    });

    describe('execute', () => {
        const rows: UserImportRequestDto[] = [
            {
                username: 'bramble2fox',
                email: 'bramble@example.com' as Lowercase<string>,
            },
        ];
        const imported: IUserImport[] = [
            {
                username: 'bramble2fox',
                email: 'bramble@example.com',
                name: null,
            },
        ];
        const usernameChecks: IUserImportUsernameChecks = {
            existing: [],
            badWords: [false],
        };

        beforeEach(() => {
            userImportService.getExistingEmails.mockResolvedValue([]);
            userImportService.getUsernameChecks.mockResolvedValue(
                usernameChecks
            );
        });

        it('adds one importByAdmin effect holding the rows and the context and answers its outbox id', async () => {
            await expect(
                useCase.execute(
                    requestContext,
                    apiKeyContext,
                    authContext,
                    rows
                )
            ).resolves.toEqual({
                data: { outboxId: 'outbox-bramble' },
            });

            expect(activityLogQueue.toPayload).toHaveBeenCalledWith(
                requestContext,
                apiKeyContext,
                authContext,
                null
            );
            expect(userQueue.importByAdminEffect).toHaveBeenCalledWith(
                imported,
                importEffect.data.activityLog
            );
            expect(outboxService.add).toHaveBeenCalledWith(importEffect);
        });

        it('runs the email, username, and row checks in order before adding the effect', async () => {
            await useCase.execute(
                requestContext,
                apiKeyContext,
                authContext,
                rows
            );

            expect(userImportService.getExistingEmails).toHaveBeenCalledWith([
                'bramble@example.com',
            ]);
            expect(userImportService.getUsernameChecks).toHaveBeenCalledWith([
                'bramble2fox',
            ]);
            expect(
                userImportService.assertEmailsAvailable
            ).toHaveBeenCalledWith([]);
            expect(
                userImportService.assertImportByAdminRows
            ).toHaveBeenCalledWith(imported, usernameChecks);
            expect(
                userImportService.assertEmailsAvailable
            ).toHaveBeenCalledBefore(userImportService.assertImportByAdminRows);
            expect(
                userImportService.assertImportByAdminRows
            ).toHaveBeenCalledBefore(outboxService.add);
        });

        it('throws the email error and adds no effect when an email exists', async () => {
            userImportService.getExistingEmails.mockResolvedValue([
                'bramble@example.com',
            ]);
            userImportService.assertEmailsAvailable.mockImplementation(() => {
                throw new UserImportEmailExistException('bramble@example.com');
            });

            await expect(
                useCase.execute(
                    requestContext,
                    apiKeyContext,
                    authContext,
                    rows
                )
            ).rejects.toMatchObject({
                module: 'user',
                statusCode: EnumUserStatusCodeError.importEmailExist,
            });
            expect(
                userImportService.assertImportByAdminRows
            ).not.toHaveBeenCalled();
            expect(outboxService.add).not.toHaveBeenCalled();
        });

        it('throws the username error and adds no effect when a row check fails', async () => {
            userImportService.assertImportByAdminRows.mockImplementation(() => {
                throw new UserImportUsernameExistException('bramble2fox');
            });

            await expect(
                useCase.execute(
                    requestContext,
                    apiKeyContext,
                    authContext,
                    rows
                )
            ).rejects.toMatchObject({
                module: 'user',
                statusCode: EnumUserStatusCodeError.importUsernameExist,
            });
            expect(outboxService.add).not.toHaveBeenCalled();
            expect(userQueue.importByAdminEffect).not.toHaveBeenCalled();
        });

        it('throws the bad-word error and adds no effect when a username holds a bad word', async () => {
            userImportService.assertImportByAdminRows.mockImplementation(() => {
                throw new UserUsernameContainBadWordException();
            });

            await expect(
                useCase.execute(
                    requestContext,
                    apiKeyContext,
                    authContext,
                    rows
                )
            ).rejects.toMatchObject({
                module: 'user',
                statusCode: EnumUserStatusCodeError.usernameContainBadWord,
            });
            expect(outboxService.add).not.toHaveBeenCalled();
        });
    });
});
