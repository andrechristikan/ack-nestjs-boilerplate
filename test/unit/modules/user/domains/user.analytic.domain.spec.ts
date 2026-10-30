import { HelperNumberService } from '@common/helper/services/helper.number.service';
import { Test } from '@nestjs/testing';
import type { TestingModule } from '@nestjs/testing';
import { mock } from 'vitest-mock-extended';
import type { MockProxy } from 'vitest-mock-extended';
import {
    EnumUserLoginFrom,
    EnumUserSignUpFrom,
    EnumUserSignUpWith,
    EnumUserStatus,
    Prisma,
} from '@generated/prisma-client/client';
import type { IPaginationQueryOffsetParams } from '@common/pagination/interfaces/pagination.interface';
import type { IResponsePaginationReturn } from '@common/response/interfaces/response.interface';
import { EnumPaginationType } from '@common/pagination/enums/pagination.enum';
import type { IAnalyticNearLockout } from '@modules/analytic/interfaces/analytic.anomaly.interface';
import { UserAnalyticDomain } from '@modules/user/domains/user.analytic.domain';
import { UserAnalyticRepository } from '@modules/user/repositories/user.analytic.repository';

describe('UserAnalyticDomain', () => {
    const userAnalyticRepository: MockProxy<UserAnalyticRepository> =
        mock<UserAnalyticRepository>();
    const helperNumberService: MockProxy<HelperNumberService> =
        mock<HelperNumberService>();

    let domain: UserAnalyticDomain;

    const startDate = new Date('2026-01-01T00:00:00.000Z');
    const endDate = new Date('2026-02-01T00:00:00.000Z');
    const now = new Date('2026-03-01T00:00:00.000Z');

    beforeEach(async () => {
        vi.resetAllMocks();

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                UserAnalyticDomain,
                {
                    provide: UserAnalyticRepository,
                    useValue: userAnalyticRepository,
                },
                { provide: HelperNumberService, useValue: helperNumberService },
            ],
        }).compile();
        domain = module.get(UserAnalyticDomain);
    });

    describe('getCountRegistrations', () => {
        it('delegates to the repository', async () => {
            userAnalyticRepository.countRegistrations.mockResolvedValue(5);

            await expect(
                domain.getCountRegistrations(startDate, endDate)
            ).resolves.toBe(5);
            expect(
                userAnalyticRepository.countRegistrations
            ).toHaveBeenCalledWith(startDate, endDate);
        });
    });

    describe('getChurnRate', () => {
        it('computes the rate from the deleted count and the total', async () => {
            userAnalyticRepository.countDeletedInRange.mockResolvedValue(2);
            userAnalyticRepository.countRegisteredUntil.mockResolvedValue(8);
            helperNumberService.percent.mockReturnValue(25);

            await expect(
                domain.getChurnRate(startDate, endDate)
            ).resolves.toEqual({
                count: 2,
                total: 8,
                rate: 25,
            });
            expect(helperNumberService.percent).toHaveBeenCalledWith(2, 8);
        });
    });

    describe('getCountByStatus', () => {
        it('delegates to the repository', async () => {
            userAnalyticRepository.countByStatus.mockResolvedValue(3);

            await expect(
                domain.getCountByStatus(EnumUserStatus.active)
            ).resolves.toBe(3);
            expect(userAnalyticRepository.countByStatus).toHaveBeenCalledWith(
                EnumUserStatus.active
            );
        });
    });

    describe('getGroupBySignUpWith', () => {
        it('delegates to the repository', async () => {
            const rows = [{ key: EnumUserSignUpWith.credential, count: 4 }];
            userAnalyticRepository.groupBySignUpWith.mockResolvedValue(rows);

            await expect(
                domain.getGroupBySignUpWith(startDate, endDate)
            ).resolves.toBe(rows);
            expect(
                userAnalyticRepository.groupBySignUpWith
            ).toHaveBeenCalledWith(startDate, endDate);
        });
    });

    describe('getGroupBySignUpFrom', () => {
        it('delegates to the repository', async () => {
            const rows = [{ key: EnumUserSignUpFrom.website, count: 4 }];
            userAnalyticRepository.groupBySignUpFrom.mockResolvedValue(rows);

            await expect(
                domain.getGroupBySignUpFrom(startDate, endDate)
            ).resolves.toBe(rows);
            expect(
                userAnalyticRepository.groupBySignUpFrom
            ).toHaveBeenCalledWith(startDate, endDate);
        });
    });

    describe('getGroupByStatus', () => {
        it('delegates to the repository', async () => {
            const rows = [{ key: EnumUserStatus.active, count: 4 }];
            userAnalyticRepository.groupByStatus.mockResolvedValue(rows);

            await expect(domain.getGroupByStatus()).resolves.toBe(rows);
        });
    });

    describe('getGroupByCountry', () => {
        it('delegates to the repository', async () => {
            const rows = [{ key: 'country-1', count: 4 }];
            userAnalyticRepository.groupByCountry.mockResolvedValue(rows);

            await expect(domain.getGroupByCountry()).resolves.toBe(rows);
        });
    });

    describe('getGroupByRole', () => {
        it('delegates to the repository', async () => {
            const rows = [{ key: 'role-1', count: 4 }];
            userAnalyticRepository.groupByRole.mockResolvedValue(rows);

            await expect(domain.getGroupByRole()).resolves.toBe(rows);
        });
    });

    describe('getEmailVerificationRate', () => {
        it('computes the rate over users who signed up inside the range', async () => {
            userAnalyticRepository.countVerifiedEmail.mockResolvedValue(6);
            userAnalyticRepository.countSignedUp.mockResolvedValue(12);
            helperNumberService.percent.mockReturnValue(50);

            await expect(
                domain.getEmailVerificationRate(startDate, endDate)
            ).resolves.toEqual({
                count: 6,
                total: 12,
                rate: 50,
            });
            expect(
                userAnalyticRepository.countVerifiedEmail
            ).toHaveBeenCalledWith(startDate, endDate);
            expect(userAnalyticRepository.countSignedUp).toHaveBeenCalledWith(
                startDate,
                endDate
            );
            expect(helperNumberService.percent).toHaveBeenCalledWith(6, 12);
        });

        it('passes open date bounds to the repository', async () => {
            userAnalyticRepository.countVerifiedEmail.mockResolvedValue(0);
            userAnalyticRepository.countSignedUp.mockResolvedValue(0);
            helperNumberService.percent.mockReturnValue(0);

            await expect(
                domain.getEmailVerificationRate(null, null)
            ).resolves.toEqual({
                count: 0,
                total: 0,
                rate: 0,
            });
            expect(userAnalyticRepository.countSignedUp).toHaveBeenCalledWith(
                null,
                null
            );
        });
    });

    describe('getCountPasswordExpired', () => {
        it('delegates to the repository', async () => {
            userAnalyticRepository.countPasswordExpired.mockResolvedValue(1);

            await expect(domain.getCountPasswordExpired(now)).resolves.toBe(1);
            expect(
                userAnalyticRepository.countPasswordExpired
            ).toHaveBeenCalledWith(now);
        });
    });

    describe('getCountActive', () => {
        it('delegates to the repository', async () => {
            userAnalyticRepository.countActive.mockResolvedValue(9);

            await expect(domain.getCountActive()).resolves.toBe(9);
        });
    });

    describe('getNearLockout', () => {
        it('delegates to the repository', async () => {
            const rows: IAnalyticNearLockout[] = [
                {
                    id: 'user-1',
                    email: 'user1@example.com',
                    passwordAttempt: 4,
                    lastLoginAt: now,
                    createdAt: now,
                },
            ];
            userAnalyticRepository.findNearLockout.mockResolvedValue(rows);

            await expect(domain.getNearLockout(4)).resolves.toBe(rows);
            expect(userAnalyticRepository.findNearLockout).toHaveBeenCalledWith(
                4
            );
        });
    });

    describe('getGroupPasswordAttemptBuckets', () => {
        it('delegates to the repository', async () => {
            const rows = [{ key: '1', count: 1 }];
            userAnalyticRepository.groupPasswordAttemptBuckets.mockResolvedValue(
                rows
            );

            await expect(domain.getGroupPasswordAttemptBuckets()).resolves.toBe(
                rows
            );
        });
    });

    describe('getOneById', () => {
        it('delegates to the repository', async () => {
            const row = {
                id: 'user-1',
                email: 'user1@example.com',
                passwordAttempt: 0,
            };
            userAnalyticRepository.findOneById.mockResolvedValue(row);

            await expect(domain.getOneById('user-1')).resolves.toBe(row);
            expect(userAnalyticRepository.findOneById).toHaveBeenCalledWith(
                'user-1'
            );
        });
    });

    describe('getListNearLockoutOffset', () => {
        it('delegates to the repository', async () => {
            const params: IPaginationQueryOffsetParams<Prisma.UserWhereInput> =
                {
                    skip: 0,
                    limit: 20,
                    orderBy: [],
                };
            const response: IResponsePaginationReturn<IAnalyticNearLockout> = {
                type: EnumPaginationType.offset,
                count: 0,
                perPage: 20,
                page: 1,
                totalPage: 0,
                hasNext: false,
                hasPrevious: false,
                data: [],
            };
            userAnalyticRepository.findNearLockoutOffset.mockResolvedValue(
                response
            );

            await expect(
                domain.getListNearLockoutOffset(4, params)
            ).resolves.toBe(response);
            expect(
                userAnalyticRepository.findNearLockoutOffset
            ).toHaveBeenCalledWith(4, params);
        });
    });

    describe('getGroupLoginSource', () => {
        it('delegates to the repository with the given range', async () => {
            const rows = [{ key: EnumUserLoginFrom.website, count: 3 }];
            userAnalyticRepository.groupLoginSource.mockResolvedValue(rows);

            await expect(
                domain.getGroupLoginSource(startDate, endDate)
            ).resolves.toBe(rows);
            expect(
                userAnalyticRepository.groupLoginSource
            ).toHaveBeenCalledWith(startDate, endDate);
        });
    });

    describe('getManyByIds', () => {
        it('delegates to the repository', async () => {
            const rows = [
                {
                    id: 'user-1',
                    email: 'user1@example.com',
                    passwordAttempt: 2,
                },
            ];
            userAnalyticRepository.findManyByIds.mockResolvedValue(rows);

            await expect(domain.getManyByIds(['user-1'])).resolves.toBe(rows);
            expect(userAnalyticRepository.findManyByIds).toHaveBeenCalledWith([
                'user-1',
            ]);
        });
    });
});
