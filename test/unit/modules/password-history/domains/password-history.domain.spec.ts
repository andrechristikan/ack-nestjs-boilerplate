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
import { PasswordHistoryDomain } from '@modules/password-history/domains/password-history.domain';
import type { IPasswordHistoryList } from '@modules/password-history/interfaces/password-history.interface';
import { PasswordHistoryRepository } from '@modules/password-history/repositories/password-history.repository';

describe('PasswordHistoryDomain', () => {
    const passwordHistoryRepository: MockProxy<PasswordHistoryRepository> =
        mock<PasswordHistoryRepository>();
    let domain: PasswordHistoryDomain;

    beforeEach(async () => {
        vi.resetAllMocks();
        const module = await Test.createTestingModule({
            providers: [
                PasswordHistoryDomain,
                {
                    provide: PasswordHistoryRepository,
                    useValue: passwordHistoryRepository,
                },
            ],
        }).compile();
        domain = module.get(PasswordHistoryDomain);
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

            const result = await domain.getListOffsetByAdmin(
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
                { limit: 20, orderBy: [] };
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

            const result = await domain.getListCursor('user-id', pagination);

            expect(result).toBe(paginationResult);
            expect(
                passwordHistoryRepository.findWithPaginationCursor
            ).toHaveBeenCalledWith('user-id', pagination);
        });
    });

    describe('getActiveByUser', () => {
        it('returns the active password history rows for the user', async () => {
            const histories: PasswordHistory[] = [
                {
                    id: 'history-id',
                    userId: 'user-id',
                    password: 'hashed',
                    type: EnumPasswordHistoryType.profile,
                    expiredAt: new Date('2024-02-01T00:00:00.000Z'),
                    createdAt: new Date('2024-01-01T00:00:00.000Z'),
                    createdBy: 'user-id',
                },
            ];
            passwordHistoryRepository.findActiveUser.mockResolvedValue(
                histories
            );

            const result = await domain.getActiveByUser('user-id');

            expect(result).toBe(histories);
            expect(
                passwordHistoryRepository.findActiveUser
            ).toHaveBeenCalledWith('user-id');
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

            const result = await domain.createInTx(
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
});
