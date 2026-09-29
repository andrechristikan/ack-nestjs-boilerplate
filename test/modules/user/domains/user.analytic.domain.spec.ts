import { Test } from '@nestjs/testing';
import type { TestingModule } from '@nestjs/testing';
import { mock } from 'vitest-mock-extended';
import type { MockProxy } from 'vitest-mock-extended';
import {
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
            ],
        }).compile();
        domain = module.get(UserAnalyticDomain);
    });

    describe('countRegistrations', () => {
        it('delegates to the repository', async () => {
            userAnalyticRepository.countRegistrations.mockResolvedValue(5);

            await expect(
                domain.countRegistrations(startDate, endDate)
            ).resolves.toBe(5);
            expect(
                userAnalyticRepository.countRegistrations
            ).toHaveBeenCalledWith(startDate, endDate);
        });
    });

    describe('churnRate', () => {
        it('computes the rate when total is not zero', async () => {
            userAnalyticRepository.countDeletedInRange.mockResolvedValue(2);
            userAnalyticRepository.countRegisteredUntil.mockResolvedValue(8);

            await expect(domain.churnRate(startDate, endDate)).resolves.toEqual(
                {
                    count: 2,
                    total: 8,
                    rate: 25,
                }
            );
        });

        it('returns a zero rate when total is zero', async () => {
            userAnalyticRepository.countDeletedInRange.mockResolvedValue(0);
            userAnalyticRepository.countRegisteredUntil.mockResolvedValue(0);

            await expect(domain.churnRate(startDate, endDate)).resolves.toEqual(
                {
                    count: 0,
                    total: 0,
                    rate: 0,
                }
            );
        });
    });

    describe('countByStatus', () => {
        it('delegates to the repository', async () => {
            userAnalyticRepository.countByStatus.mockResolvedValue(3);

            await expect(
                domain.countByStatus(EnumUserStatus.active)
            ).resolves.toBe(3);
            expect(userAnalyticRepository.countByStatus).toHaveBeenCalledWith(
                EnumUserStatus.active
            );
        });
    });

    describe('groupBySignUpWith', () => {
        it('delegates to the repository', async () => {
            const rows = [{ key: EnumUserSignUpWith.credential, count: 4 }];
            userAnalyticRepository.groupBySignUpWith.mockResolvedValue(rows);

            await expect(
                domain.groupBySignUpWith(startDate, endDate)
            ).resolves.toBe(rows);
            expect(
                userAnalyticRepository.groupBySignUpWith
            ).toHaveBeenCalledWith(startDate, endDate);
        });
    });

    describe('groupBySignUpFrom', () => {
        it('delegates to the repository', async () => {
            const rows = [{ key: EnumUserSignUpFrom.website, count: 4 }];
            userAnalyticRepository.groupBySignUpFrom.mockResolvedValue(rows);

            await expect(
                domain.groupBySignUpFrom(startDate, endDate)
            ).resolves.toBe(rows);
            expect(
                userAnalyticRepository.groupBySignUpFrom
            ).toHaveBeenCalledWith(startDate, endDate);
        });
    });

    describe('groupByStatus', () => {
        it('delegates to the repository', async () => {
            const rows = [{ key: EnumUserStatus.active, count: 4 }];
            userAnalyticRepository.groupByStatus.mockResolvedValue(rows);

            await expect(domain.groupByStatus()).resolves.toBe(rows);
        });
    });

    describe('groupByCountry', () => {
        it('delegates to the repository', async () => {
            const rows = [{ key: 'country-1', count: 4 }];
            userAnalyticRepository.groupByCountry.mockResolvedValue(rows);

            await expect(domain.groupByCountry()).resolves.toBe(rows);
        });
    });

    describe('groupByRole', () => {
        it('delegates to the repository', async () => {
            const rows = [{ key: 'role-1', count: 4 }];
            userAnalyticRepository.groupByRole.mockResolvedValue(rows);

            await expect(domain.groupByRole()).resolves.toBe(rows);
        });
    });

    describe('emailVerificationRate', () => {
        it('computes the rate when total is not zero', async () => {
            userAnalyticRepository.countVerifiedEmail.mockResolvedValue(6);
            userAnalyticRepository.countActive.mockResolvedValue(12);

            await expect(domain.emailVerificationRate()).resolves.toEqual({
                count: 6,
                total: 12,
                rate: 50,
            });
        });

        it('returns a zero rate when total is zero', async () => {
            userAnalyticRepository.countVerifiedEmail.mockResolvedValue(0);
            userAnalyticRepository.countActive.mockResolvedValue(0);

            await expect(domain.emailVerificationRate()).resolves.toEqual({
                count: 0,
                total: 0,
                rate: 0,
            });
        });
    });

    describe('countPasswordExpired', () => {
        it('delegates to the repository', async () => {
            userAnalyticRepository.countPasswordExpired.mockResolvedValue(1);

            await expect(domain.countPasswordExpired(now)).resolves.toBe(1);
            expect(
                userAnalyticRepository.countPasswordExpired
            ).toHaveBeenCalledWith(now);
        });
    });

    describe('countActive', () => {
        it('delegates to the repository', async () => {
            userAnalyticRepository.countActive.mockResolvedValue(9);

            await expect(domain.countActive()).resolves.toBe(9);
        });
    });

    describe('findNearLockout', () => {
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

            await expect(domain.findNearLockout(4)).resolves.toBe(rows);
            expect(userAnalyticRepository.findNearLockout).toHaveBeenCalledWith(
                4
            );
        });
    });

    describe('groupPasswordAttemptBuckets', () => {
        it('delegates to the repository', async () => {
            const rows = [{ key: '1', count: 1 }];
            userAnalyticRepository.groupPasswordAttemptBuckets.mockResolvedValue(
                rows
            );

            await expect(domain.groupPasswordAttemptBuckets()).resolves.toBe(
                rows
            );
        });
    });

    describe('findOneById', () => {
        it('delegates to the repository', async () => {
            const row = {
                id: 'user-1',
                email: 'user1@example.com',
                passwordAttempt: 0,
            };
            userAnalyticRepository.findOneById.mockResolvedValue(row);

            await expect(domain.findOneById('user-1')).resolves.toBe(row);
            expect(userAnalyticRepository.findOneById).toHaveBeenCalledWith(
                'user-1'
            );
        });
    });

    describe('listNearLockoutOffset', () => {
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
            userAnalyticRepository.listNearLockoutOffset.mockResolvedValue(
                response
            );

            await expect(domain.listNearLockoutOffset(4, params)).resolves.toBe(
                response
            );
            expect(
                userAnalyticRepository.listNearLockoutOffset
            ).toHaveBeenCalledWith(4, params);
        });
    });

    describe('findSignUpsInRange', () => {
        it('delegates to the repository', async () => {
            const rows = [
                {
                    id: 'user-1',
                    email: 'user1@example.com',
                    signUpAt: now,
                    signUpFrom: EnumUserSignUpFrom.website,
                },
            ];
            userAnalyticRepository.findSignUpsInRange.mockResolvedValue(rows);

            await expect(
                domain.findSignUpsInRange(startDate, endDate)
            ).resolves.toBe(rows);
            expect(
                userAnalyticRepository.findSignUpsInRange
            ).toHaveBeenCalledWith(startDate, endDate);
        });
    });
});
