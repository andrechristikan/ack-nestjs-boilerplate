import { Test } from '@nestjs/testing';
import type { TestingModule } from '@nestjs/testing';
import { mock } from 'vitest-mock-extended';
import type { MockProxy } from 'vitest-mock-extended';

import type { IDatabaseTransactionClient } from '@common/database/interfaces/database.client.interface';
import { EnumPaginationType } from '@common/pagination/enums/pagination.enum';
import { EnumPasswordHistoryType } from '@generated/prisma-client/client';
import type { PasswordHistory } from '@generated/prisma-client/client';
import { PasswordHistoryRepository } from '@modules/password-history/repositories/password-history.repository';
import { PasswordHistoryDomain } from '@modules/password-history/domains/password-history.domain';

describe('PasswordHistoryDomain', () => {
    const passwordHistoryRepository: MockProxy<PasswordHistoryRepository> =
        mock<PasswordHistoryRepository>();

    let service: PasswordHistoryDomain;

    beforeEach(async () => {
        passwordHistoryRepository.findWithPaginationOffsetByAdmin.mockResolvedValue(
            {
                type: EnumPaginationType.offset,
                data: [],
                count: 0,
                perPage: 10,
                hasNext: false,
                hasPrevious: false,
                page: 1,
                totalPage: 0,
            }
        );
        passwordHistoryRepository.findWithPaginationCursor.mockResolvedValue({
            type: EnumPaginationType.cursor,
            data: [],
            perPage: 10,
            hasNext: false,
        });
        passwordHistoryRepository.findActiveUser.mockResolvedValue([]);

        const moduleRef: TestingModule = await Test.createTestingModule({
            providers: [
                PasswordHistoryDomain,
                {
                    provide: PasswordHistoryRepository,
                    useValue: passwordHistoryRepository,
                },
            ],
        }).compile();

        service = moduleRef.get(PasswordHistoryDomain);
    });

    it('delegates admin offset pagination to the repository', async () => {
        const pagination = { skip: 0, limit: 10 };

        await expect(
            service.getListOffsetByAdmin('user-id', pagination)
        ).resolves.toMatchObject({
            type: EnumPaginationType.offset,
            data: [],
        });
        expect(
            passwordHistoryRepository.findWithPaginationOffsetByAdmin
        ).toHaveBeenCalledWith('user-id', pagination, undefined);
    });

    it('forwards the accessible where as the trailing repository argument of the admin list', async () => {
        const pagination = { skip: 0, limit: 10 };
        const accessibleWhere = { userId: 'user-id' };

        await service.getListOffsetByAdmin(
            'user-id',
            pagination,
            accessibleWhere
        );

        expect(
            passwordHistoryRepository.findWithPaginationOffsetByAdmin
        ).toHaveBeenCalledWith('user-id', pagination, accessibleWhere);
    });

    it('delegates cursor pagination to the repository', async () => {
        const pagination = { cursor: 'cursor', limit: 10 };

        await expect(
            service.getListCursor('user-id', pagination)
        ).resolves.toMatchObject({
            type: EnumPaginationType.cursor,
            data: [],
        });
        expect(
            passwordHistoryRepository.findWithPaginationCursor
        ).toHaveBeenCalledWith('user-id', pagination);
    });

    it('delegates active history lookup to the repository', async () => {
        await expect(service.getActiveByUser('user-id')).resolves.toEqual([]);
        expect(passwordHistoryRepository.findActiveUser).toHaveBeenCalledWith(
            'user-id'
        );
    });

    it('delegates the transactional create to the repository', async () => {
        const tx = mock<IDatabaseTransactionClient>();
        const created = mock<PasswordHistory>();
        const expiredAt = new Date('2026-06-01T00:00:00.000Z');
        const createdAt = new Date('2026-01-01T00:00:00.000Z');
        passwordHistoryRepository.createInTx.mockResolvedValue(created);

        await expect(
            service.createInTx(
                tx,
                'user-id',
                'hash',
                EnumPasswordHistoryType.signUp,
                expiredAt,
                createdAt,
                'actor-id'
            )
        ).resolves.toBe(created);
        expect(passwordHistoryRepository.createInTx).toHaveBeenCalledWith(
            tx,
            'user-id',
            'hash',
            EnumPasswordHistoryType.signUp,
            expiredAt,
            createdAt,
            'actor-id'
        );
    });
});
