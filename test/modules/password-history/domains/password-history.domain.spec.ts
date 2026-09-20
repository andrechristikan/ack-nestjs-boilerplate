import { Test, type TestingModule } from '@nestjs/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { EnumPaginationType } from '@common/pagination/enums/pagination.enum';
import { PasswordHistoryRepository } from '@modules/password-history/repositories/password-history.repository';
import { PasswordHistoryDomain } from '@modules/password-history/domains/password-history.domain';

describe('PasswordHistoryDomain', () => {
    const passwordHistoryRepository = {
        findWithPaginationOffsetByAdmin:
            vi.fn<
                PasswordHistoryRepository['findWithPaginationOffsetByAdmin']
            >(),
        findWithPaginationCursor:
            vi.fn<PasswordHistoryRepository['findWithPaginationCursor']>(),
        findActiveUser: vi.fn<PasswordHistoryRepository['findActiveUser']>(),
    } satisfies Pick<
        PasswordHistoryRepository,
        | 'findWithPaginationOffsetByAdmin'
        | 'findWithPaginationCursor'
        | 'findActiveUser'
    >;

    let service: PasswordHistoryDomain;

    beforeEach(async () => {
        vi.resetAllMocks();
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
        ).toHaveBeenCalledWith('user-id', pagination);
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
});
