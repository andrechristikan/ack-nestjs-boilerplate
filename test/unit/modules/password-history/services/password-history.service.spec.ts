import { Test } from '@nestjs/testing';
import { mock } from 'vitest-mock-extended';
import type { MockProxy } from 'vitest-mock-extended';
import type { IDatabaseTransactionClient } from '@common/database/interfaces/database.client.interface';
import { EnumPaginationType } from '@common/pagination/enums/pagination.enum';
import type {
    IPaginationQueryCursorParams,
    IPaginationQueryOffsetParams,
} from '@common/pagination/interfaces/pagination.interface';
import type { IResponsePaginationReturn } from '@common/response/interfaces/response.interface';
import type { PasswordHistory, Prisma } from '@generated/prisma-client/client';
import { EnumPasswordHistoryType } from '@generated/prisma-client/client';
import { PasswordHistoryService } from '@modules/password-history/services/password-history.service';
import type {
    IPasswordHistoryCreate,
    IPasswordHistoryList,
} from '@modules/password-history/interfaces/password-history.interface';
import { PasswordHistoryRepository } from '@modules/password-history/repositories/password-history.repository';
import { AuthPasswordUtil } from '@modules/auth/utils/auth.password.util';
import { EnumUserStatusCodeError } from '@modules/user/enums/user.status-code.enum';

describe('PasswordHistoryService', () => {
    const passwordHistoryRepository: MockProxy<PasswordHistoryRepository> =
        mock<PasswordHistoryRepository>();
    const authPasswordUtil: MockProxy<AuthPasswordUtil> =
        mock<AuthPasswordUtil>();
    let service: PasswordHistoryService;

    beforeEach(async () => {
        vi.resetAllMocks();
        const module = await Test.createTestingModule({
            providers: [
                PasswordHistoryService,
                {
                    provide: PasswordHistoryRepository,
                    useValue: passwordHistoryRepository,
                },
                { provide: AuthPasswordUtil, useValue: authPasswordUtil },
            ],
        }).compile();
        service = module.get(PasswordHistoryService);
    });

    describe('getListOffsetByAdmin', () => {
        it('returns the offset-paginated list from the repository', async () => {
            const pagination: IPaginationQueryOffsetParams<Prisma.PasswordHistoryWhereInput> =
                { skip: 0, limit: 20, orderBy: [] };
            const paginationResult: IResponsePaginationReturn<IPasswordHistoryList> =
                {
                    type: EnumPaginationType.offset,
                    count: 0,
                    perPage: 20,
                    page: 1,
                    totalPage: 0,
                    hasNext: false,
                    hasPrevious: false,
                    data: [],
                };
            passwordHistoryRepository.findWithPaginationOffsetByAdmin.mockResolvedValue(
                paginationResult
            );

            const result = await service.getListOffsetByAdmin(
                'user-id',
                pagination
            );

            expect(result).toBe(paginationResult);
            expect(
                passwordHistoryRepository.findWithPaginationOffsetByAdmin
            ).toHaveBeenCalledWith('user-id', pagination);
        });
    });

    describe('getListCursor', () => {
        it('returns the cursor-paginated list from the repository', async () => {
            const pagination: IPaginationQueryCursorParams<Prisma.PasswordHistoryWhereInput> =
                {
                    fingerprint: 'aaaaaaaaaaaaaaaa',
                    limit: 20,
                    orderBy: [],
                };
            const paginationResult: IResponsePaginationReturn<IPasswordHistoryList> =
                {
                    type: EnumPaginationType.cursor,
                    perPage: 20,
                    hasNext: false,
                    data: [],
                };
            passwordHistoryRepository.findWithPaginationCursor.mockResolvedValue(
                paginationResult
            );

            const result = await service.getListCursor('user-id', pagination);

            expect(result).toBe(paginationResult);
            expect(
                passwordHistoryRepository.findWithPaginationCursor
            ).toHaveBeenCalledWith('user-id', pagination);
        });
    });

    describe('createInTx', () => {
        it('creates the password history row inside the transaction', async () => {
            const tx = {} as IDatabaseTransactionClient;
            const expiredAt = new Date('2024-02-01T00:00:00.000Z');
            const createdAt = new Date('2024-01-01T00:00:00.000Z');
            const created: PasswordHistory = {
                id: 'history-id',
                userId: 'user-id',
                password: 'hashed',
                type: EnumPasswordHistoryType.admin,
                expiredAt,
                createdAt,
                createdBy: 'admin-id',
            };
            passwordHistoryRepository.createInTx.mockResolvedValue(created);

            const result = await service.createInTx(
                tx,
                'user-id',
                'hashed',
                EnumPasswordHistoryType.admin,
                expiredAt,
                createdAt,
                'admin-id'
            );

            expect(result).toBe(created);
            expect(passwordHistoryRepository.createInTx).toHaveBeenCalledWith(
                tx,
                'user-id',
                'hashed',
                EnumPasswordHistoryType.admin,
                expiredAt,
                createdAt,
                'admin-id'
            );
        });
    });

    describe('createManyInTx', () => {
        const tx = {} as IDatabaseTransactionClient;
        const entries: IPasswordHistoryCreate[] = [
            {
                userId: 'user-one',
                password: 'hashed-one',
                type: EnumPasswordHistoryType.admin,
                expiredAt: new Date('2024-02-01T00:00:00.000Z'),
                createdAt: new Date('2024-01-01T00:00:00.000Z'),
                createdBy: 'admin-id',
            },
            {
                userId: 'user-two',
                password: 'hashed-two',
                type: EnumPasswordHistoryType.admin,
                expiredAt: new Date('2024-02-01T00:00:00.000Z'),
                createdAt: new Date('2024-01-01T00:00:00.000Z'),
                createdBy: 'admin-id',
            },
        ];

        it('writes every entry in one repository statement', async () => {
            await service.createManyInTx(tx, entries);

            expect(
                passwordHistoryRepository.createManyInTx
            ).toHaveBeenCalledTimes(1);
            expect(
                passwordHistoryRepository.createManyInTx
            ).toHaveBeenCalledWith(tx, entries);
        });

        it('issues no statement for an empty list', async () => {
            await service.createManyInTx(tx, []);

            expect(
                passwordHistoryRepository.createManyInTx
            ).not.toHaveBeenCalled();
        });
    });

    describe('assertNew', () => {
        const history: PasswordHistory = {
            id: 'history-id',
            userId: 'user-id',
            password: 'hashed-old',
            type: EnumPasswordHistoryType.profile,
            expiredAt: new Date('2026-06-01T00:00:00.000Z'),
            createdAt: new Date('2026-01-01T00:00:00.000Z'),
            createdBy: 'user-id',
        };

        it('passes when the new password repeats no history entry', async () => {
            passwordHistoryRepository.findActiveUser.mockResolvedValue([
                history,
            ]);
            authPasswordUtil.checkPasswordPeriod.mockResolvedValue(null);

            await expect(
                service.assertNew('user-id', 'new-password')
            ).resolves.toBeUndefined();
            expect(authPasswordUtil.checkPasswordPeriod).toHaveBeenCalledWith(
                [history],
                'new-password'
            );
        });

        it('throws UserPasswordMustNewException with the period when the new password repeats a history entry', async () => {
            passwordHistoryRepository.findActiveUser.mockResolvedValue([
                history,
            ]);
            authPasswordUtil.checkPasswordPeriod.mockResolvedValue(history);
            authPasswordUtil.getPasswordPeriodInDays.mockReturnValue(90);

            await expect(
                service.assertNew('user-id', 'old-password')
            ).rejects.toMatchObject({
                module: 'user',
                statusCode: EnumUserStatusCodeError.passwordMustNew,
                messagePath: 'user.error.passwordMustNew',
                messageProperties: { period: 90 },
            });
        });
    });
});
