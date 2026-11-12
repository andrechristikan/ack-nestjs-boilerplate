import { Test } from '@nestjs/testing';
import type { TestingModule } from '@nestjs/testing';
import { mock } from 'vitest-mock-extended';
import type { MockProxy } from 'vitest-mock-extended';
import { EnumQueuePriority } from '@common/queue/enums/queue.enum';
import type { IOutboxEffect } from '@modules/outbox/interfaces/outbox.interface';
import { OutboxService } from '@modules/outbox/services/outbox.service';
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
import { UserService } from '@modules/user/services/user.service';
import { UserImportByAdminUseCase } from '@modules/user/use-cases/user.import-by-admin.use-case';
import { buildRequestContext } from '@test/unit/helpers/test.unit.request.helper';

describe('UserImportByAdminUseCase', () => {
    const userService: MockProxy<UserService> = mock<UserService>();
    const userImportService: MockProxy<UserImportService> =
        mock<UserImportService>();
    const outboxService: MockProxy<OutboxService> = mock<OutboxService>();
    let useCase: UserImportByAdminUseCase;

    const context = buildRequestContext('admin-bramble');
    const importEffect: IOutboxEffect = {
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
            context,
        },
        priority: EnumQueuePriority.medium,
        idempotencyKey: null,
    };

    beforeEach(async () => {
        vi.resetAllMocks();

        outboxService.add.mockResolvedValue('outbox-bramble');
        userService.importByAdminEffect.mockReturnValue(importEffect);

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                UserImportByAdminUseCase,
                { provide: UserService, useValue: userService },
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
            await expect(useCase.execute(rows, context)).resolves.toEqual({
                data: { outboxId: 'outbox-bramble' },
            });

            expect(userService.importByAdminEffect).toHaveBeenCalledWith(
                imported,
                context
            );
            expect(outboxService.add).toHaveBeenCalledWith(importEffect);
        });

        it('runs the email, username, and row checks in order before adding the effect', async () => {
            await useCase.execute(rows, context);

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

            await expect(useCase.execute(rows, context)).rejects.toMatchObject({
                module: 'user',
                statusCode: EnumUserStatusCodeError.importEmailExist,
                statusCodeKey:
                    EnumUserStatusCodeError[
                        EnumUserStatusCodeError.importEmailExist
                    ],
                messagePath: 'user.error.importEmailExist',
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

            await expect(useCase.execute(rows, context)).rejects.toMatchObject({
                module: 'user',
                statusCode: EnumUserStatusCodeError.importUsernameExist,
                messagePath: 'user.error.importUsernameExist',
            });
            expect(outboxService.add).not.toHaveBeenCalled();
            expect(userService.importByAdminEffect).not.toHaveBeenCalled();
        });

        it('throws the bad-word error and adds no effect when a username holds a bad word', async () => {
            userImportService.assertImportByAdminRows.mockImplementation(() => {
                throw new UserUsernameContainBadWordException();
            });

            await expect(useCase.execute(rows, context)).rejects.toMatchObject({
                module: 'user',
                statusCode: EnumUserStatusCodeError.usernameContainBadWord,
            });
            expect(outboxService.add).not.toHaveBeenCalled();
        });
    });
});
