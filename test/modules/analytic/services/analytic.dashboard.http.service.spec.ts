import { PaginationQueryUtil } from '@common/pagination/utils/pagination.query.util';
import { RequestStoreService } from '@common/request/services/request.store.service';
import { EnumPaginationType } from '@common/pagination/enums/pagination.enum';
import { Test } from '@nestjs/testing';
import type { TestingModule } from '@nestjs/testing';
import { mock } from 'vitest-mock-extended';
import type { MockProxy } from 'vitest-mock-extended';
import { AnalyticDashboardDomain } from '@modules/analytic/domains/analytic.dashboard.domain';
import { AnalyticDashboardHttpService } from '@modules/analytic/services/analytic.dashboard.http.service';
import { AnalyticDateDomain } from '@modules/analytic/domains/analytic.date.domain';

describe('AnalyticDashboardHttpService', () => {
    const analyticDashboardDomain: MockProxy<AnalyticDashboardDomain> =
        mock<AnalyticDashboardDomain>();
    const analyticDateDomain: MockProxy<AnalyticDateDomain> =
        mock<AnalyticDateDomain>();
    const paginationQueryUtil: MockProxy<PaginationQueryUtil> =
        mock<PaginationQueryUtil>();
    const requestStoreService: MockProxy<RequestStoreService> =
        mock<RequestStoreService>();

    const startDate: Date = new Date('2026-01-01T00:00:00.000Z');
    const endDate: Date = new Date('2026-02-01T00:00:00.000Z');
    const pagination = {
        skip: 0,
        limit: 20,
        orderBy: [],
    };

    let service: AnalyticDashboardHttpService;

    beforeEach(async () => {
        vi.resetAllMocks();
        paginationQueryUtil.offset.mockReturnValue({
            params: pagination,
            storePatch: {},
        } as never);

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                AnalyticDashboardHttpService,
                {
                    provide: AnalyticDashboardDomain,
                    useValue: analyticDashboardDomain,
                },
                { provide: AnalyticDateDomain, useValue: analyticDateDomain },
                {
                    provide: PaginationQueryUtil,
                    useValue: paginationQueryUtil,
                },
                {
                    provide: RequestStoreService,
                    useValue: requestStoreService,
                },
            ],
        }).compile();

        service = module.get(AnalyticDashboardHttpService);
    });

    describe('usersRegistrations', () => {
        it('wraps the domain result in the response envelope', async () => {
            analyticDateDomain.requireRange.mockReturnValue({
                startDate,
                endDate,
            });
            analyticDashboardDomain.usersRegistrations.mockResolvedValue({
                count: 12,
            });

            const result = await service.usersRegistrations(startDate, endDate);

            expect(result).toEqual({ data: { count: 12 } });
            expect(
                analyticDashboardDomain.usersRegistrations
            ).toHaveBeenCalledWith(startDate, endDate);
        });
        it('passes null when dates are omitted', async () => {
            analyticDateDomain.requireRange.mockReturnValue({
                startDate,
                endDate,
            });
            analyticDashboardDomain.usersRegistrations.mockResolvedValue(
                {} as never
            );

            await service.usersRegistrations();

            expect(analyticDateDomain.requireRange).toHaveBeenCalledWith(
                null,
                null
            );
        });
    });

    describe('usersChurn', () => {
        it('wraps the domain result in the response envelope', async () => {
            analyticDateDomain.requireRange.mockReturnValue({
                startDate,
                endDate,
            });
            analyticDashboardDomain.usersChurn.mockResolvedValue({
                count: 4,
                total: 10,
                rate: 0.4,
            });

            const result = await service.usersChurn(startDate, endDate);

            expect(result).toEqual({
                data: { count: 4, total: 10, rate: 0.4 },
            });
            expect(analyticDashboardDomain.usersChurn).toHaveBeenCalledWith(
                startDate,
                endDate
            );
        });
        it('passes null when dates are omitted', async () => {
            analyticDateDomain.requireRange.mockReturnValue({
                startDate,
                endDate,
            });
            analyticDashboardDomain.usersChurn.mockResolvedValue({} as never);

            await service.usersChurn();

            expect(analyticDateDomain.requireRange).toHaveBeenCalledWith(
                null,
                null
            );
        });
    });

    describe('usersBlocked', () => {
        it('wraps the domain result in the response envelope', async () => {
            analyticDateDomain.requireRange.mockReturnValue({
                startDate,
                endDate,
            });
            analyticDashboardDomain.usersBlocked.mockResolvedValue({
                trend: 3,
                current: 5,
            });

            const result = await service.usersBlocked(startDate, endDate);

            expect(result).toEqual({ data: { trend: 3, current: 5 } });
            expect(analyticDashboardDomain.usersBlocked).toHaveBeenCalledWith(
                startDate,
                endDate
            );
        });
        it('passes null when dates are omitted', async () => {
            analyticDateDomain.requireRange.mockReturnValue({
                startDate,
                endDate,
            });
            analyticDashboardDomain.usersBlocked.mockResolvedValue({} as never);

            await service.usersBlocked();

            expect(analyticDateDomain.requireRange).toHaveBeenCalledWith(
                null,
                null
            );
        });
    });

    describe('usersSignUpWith', () => {
        it('wraps the domain result in the response envelope', async () => {
            analyticDateDomain.optionalRange.mockReturnValue({
                startDate,
                endDate,
            });
            analyticDashboardDomain.usersSignUpWith.mockResolvedValue({
                buckets: [{ key: 'key-1', count: 7 }],
            });

            const result = await service.usersSignUpWith(startDate, endDate);

            expect(result).toEqual({
                data: { buckets: [{ key: 'key-1', count: 7 }] },
            });
            expect(
                analyticDashboardDomain.usersSignUpWith
            ).toHaveBeenCalledWith(startDate, endDate);
        });
        it('passes undefined dates when the optional range is empty', async () => {
            analyticDateDomain.optionalRange.mockReturnValue({
                startDate: null,
                endDate: null,
            });
            analyticDashboardDomain.usersSignUpWith.mockResolvedValue(
                {} as never
            );

            await service.usersSignUpWith();

            expect(
                analyticDashboardDomain.usersSignUpWith
            ).toHaveBeenCalledWith(undefined, undefined);
        });
    });

    describe('usersSignUpFrom', () => {
        it('wraps the domain result in the response envelope', async () => {
            analyticDateDomain.optionalRange.mockReturnValue({
                startDate,
                endDate,
            });
            analyticDashboardDomain.usersSignUpFrom.mockResolvedValue({
                buckets: [{ key: 'key-1', count: 7 }],
            });

            const result = await service.usersSignUpFrom(startDate, endDate);

            expect(result).toEqual({
                data: { buckets: [{ key: 'key-1', count: 7 }] },
            });
            expect(
                analyticDashboardDomain.usersSignUpFrom
            ).toHaveBeenCalledWith(startDate, endDate);
        });
        it('passes undefined dates when the optional range is empty', async () => {
            analyticDateDomain.optionalRange.mockReturnValue({
                startDate: null,
                endDate: null,
            });
            analyticDashboardDomain.usersSignUpFrom.mockResolvedValue(
                {} as never
            );

            await service.usersSignUpFrom();

            expect(
                analyticDashboardDomain.usersSignUpFrom
            ).toHaveBeenCalledWith(undefined, undefined);
        });
    });

    describe('usersEmailVerification', () => {
        it('wraps the domain result in the response envelope', async () => {
            analyticDateDomain.optionalRange.mockReturnValue({
                startDate,
                endDate,
            });
            analyticDashboardDomain.usersEmailVerification.mockResolvedValue({
                count: 4,
                total: 10,
                rate: 0.4,
            });

            const result = await service.usersEmailVerification(
                startDate,
                endDate
            );

            expect(result).toEqual({
                data: { count: 4, total: 10, rate: 0.4 },
            });
            expect(
                analyticDashboardDomain.usersEmailVerification
            ).toHaveBeenCalledWith(startDate, endDate);
        });
        it('passes undefined dates when the optional range is empty', async () => {
            analyticDateDomain.optionalRange.mockReturnValue({
                startDate: null,
                endDate: null,
            });
            analyticDashboardDomain.usersEmailVerification.mockResolvedValue(
                {} as never
            );

            await service.usersEmailVerification();

            expect(
                analyticDashboardDomain.usersEmailVerification
            ).toHaveBeenCalledWith(undefined, undefined);
        });
    });

    describe('usersMobileVerification', () => {
        it('wraps the domain result in the response envelope', async () => {
            analyticDateDomain.optionalRange.mockReturnValue({
                startDate,
                endDate,
            });
            analyticDashboardDomain.usersMobileVerification.mockResolvedValue({
                count: 4,
                total: 10,
                rate: 0.4,
            });

            const result = await service.usersMobileVerification(
                startDate,
                endDate
            );

            expect(result).toEqual({
                data: { count: 4, total: 10, rate: 0.4 },
            });
            expect(
                analyticDashboardDomain.usersMobileVerification
            ).toHaveBeenCalledWith(startDate, endDate);
        });
        it('passes undefined dates when the optional range is empty', async () => {
            analyticDateDomain.optionalRange.mockReturnValue({
                startDate: null,
                endDate: null,
            });
            analyticDashboardDomain.usersMobileVerification.mockResolvedValue(
                {} as never
            );

            await service.usersMobileVerification();

            expect(
                analyticDashboardDomain.usersMobileVerification
            ).toHaveBeenCalledWith(undefined, undefined);
        });
    });

    describe('usersStatusDistribution', () => {
        it('wraps the domain result in the response envelope', async () => {
            analyticDashboardDomain.usersStatusDistribution.mockResolvedValue({
                buckets: [{ key: 'key-1', count: 7 }],
            });

            const result = await service.usersStatusDistribution();

            expect(result).toEqual({
                data: { buckets: [{ key: 'key-1', count: 7 }] },
            });
            expect(
                analyticDashboardDomain.usersStatusDistribution
            ).toHaveBeenCalledWith();
        });
    });

    describe('usersCountryDistribution', () => {
        it('wraps the domain result in the response envelope', async () => {
            analyticDashboardDomain.usersCountryDistribution.mockResolvedValue({
                buckets: [{ key: 'key-1', count: 7 }],
            });

            const result = await service.usersCountryDistribution();

            expect(result).toEqual({
                data: { buckets: [{ key: 'key-1', count: 7 }] },
            });
            expect(
                analyticDashboardDomain.usersCountryDistribution
            ).toHaveBeenCalledWith();
        });
    });

    describe('usersRoleDistribution', () => {
        it('wraps the domain result in the response envelope', async () => {
            analyticDashboardDomain.usersRoleDistribution.mockResolvedValue({
                buckets: [{ key: 'key-1', count: 7 }],
            });

            const result = await service.usersRoleDistribution();

            expect(result).toEqual({
                data: { buckets: [{ key: 'key-1', count: 7 }] },
            });
            expect(
                analyticDashboardDomain.usersRoleDistribution
            ).toHaveBeenCalledWith();
        });
    });

    describe('usersSelfDelete', () => {
        it('wraps the domain result in the response envelope', async () => {
            analyticDateDomain.requireRange.mockReturnValue({
                startDate,
                endDate,
            });
            analyticDashboardDomain.usersSelfDelete.mockResolvedValue({
                count: 12,
            });

            const result = await service.usersSelfDelete(startDate, endDate);

            expect(result).toEqual({ data: { count: 12 } });
            expect(
                analyticDashboardDomain.usersSelfDelete
            ).toHaveBeenCalledWith(startDate, endDate);
        });
        it('passes null when dates are omitted', async () => {
            analyticDateDomain.requireRange.mockReturnValue({
                startDate,
                endDate,
            });
            analyticDashboardDomain.usersSelfDelete.mockResolvedValue(
                {} as never
            );

            await service.usersSelfDelete();

            expect(analyticDateDomain.requireRange).toHaveBeenCalledWith(
                null,
                null
            );
        });
    });

    describe('usersClaimUsername', () => {
        it('wraps the domain result in the response envelope', async () => {
            analyticDateDomain.requireRange.mockReturnValue({
                startDate,
                endDate,
            });
            analyticDashboardDomain.usersClaimUsername.mockResolvedValue({
                count: 12,
            });

            const result = await service.usersClaimUsername(startDate, endDate);

            expect(result).toEqual({ data: { count: 12 } });
            expect(
                analyticDashboardDomain.usersClaimUsername
            ).toHaveBeenCalledWith(startDate, endDate);
        });
        it('passes null when dates are omitted', async () => {
            analyticDateDomain.requireRange.mockReturnValue({
                startDate,
                endDate,
            });
            analyticDashboardDomain.usersClaimUsername.mockResolvedValue(
                {} as never
            );

            await service.usersClaimUsername();

            expect(analyticDateDomain.requireRange).toHaveBeenCalledWith(
                null,
                null
            );
        });
    });

    describe('usersMobileChurn', () => {
        it('wraps the domain result in the response envelope', async () => {
            analyticDateDomain.requireRange.mockReturnValue({
                startDate,
                endDate,
            });
            analyticDashboardDomain.usersMobileChurn.mockResolvedValue({
                added: 1,
                updated: 2,
                deleted: 3,
            });

            const result = await service.usersMobileChurn(startDate, endDate);

            expect(result).toEqual({
                data: { added: 1, updated: 2, deleted: 3 },
            });
            expect(
                analyticDashboardDomain.usersMobileChurn
            ).toHaveBeenCalledWith(startDate, endDate);
        });
        it('passes null when dates are omitted', async () => {
            analyticDateDomain.requireRange.mockReturnValue({
                startDate,
                endDate,
            });
            analyticDashboardDomain.usersMobileChurn.mockResolvedValue(
                {} as never
            );

            await service.usersMobileChurn();

            expect(analyticDateDomain.requireRange).toHaveBeenCalledWith(
                null,
                null
            );
        });
    });

    describe('authLoginFrequency', () => {
        it('wraps the domain result in the response envelope', async () => {
            analyticDateDomain.requireRange.mockReturnValue({
                startDate,
                endDate,
            });
            analyticDashboardDomain.authLoginFrequency.mockResolvedValue({
                count: 12,
            });

            const result = await service.authLoginFrequency(startDate, endDate);

            expect(result).toEqual({ data: { count: 12 } });
            expect(
                analyticDashboardDomain.authLoginFrequency
            ).toHaveBeenCalledWith(startDate, endDate);
        });
        it('passes null when dates are omitted', async () => {
            analyticDateDomain.requireRange.mockReturnValue({
                startDate,
                endDate,
            });
            analyticDashboardDomain.authLoginFrequency.mockResolvedValue(
                {} as never
            );

            await service.authLoginFrequency();

            expect(analyticDateDomain.requireRange).toHaveBeenCalledWith(
                null,
                null
            );
        });
    });

    describe('authLoginMethod', () => {
        it('wraps the domain result in the response envelope', async () => {
            analyticDateDomain.optionalRange.mockReturnValue({
                startDate,
                endDate,
            });
            analyticDashboardDomain.authLoginMethod.mockResolvedValue({
                buckets: [{ key: 'key-1', count: 7 }],
            });

            const result = await service.authLoginMethod(startDate, endDate);

            expect(result).toEqual({
                data: { buckets: [{ key: 'key-1', count: 7 }] },
            });
            expect(
                analyticDashboardDomain.authLoginMethod
            ).toHaveBeenCalledWith(startDate, endDate);
        });
        it('passes undefined dates when the optional range is empty', async () => {
            analyticDateDomain.optionalRange.mockReturnValue({
                startDate: null,
                endDate: null,
            });
            analyticDashboardDomain.authLoginMethod.mockResolvedValue(
                {} as never
            );

            await service.authLoginMethod();

            expect(
                analyticDashboardDomain.authLoginMethod
            ).toHaveBeenCalledWith(undefined, undefined);
        });
    });

    describe('authLoginSource', () => {
        it('wraps the domain result in the response envelope', async () => {
            analyticDateDomain.optionalRange.mockReturnValue({
                startDate,
                endDate,
            });
            analyticDashboardDomain.authLoginSource.mockResolvedValue({
                buckets: [{ key: 'key-1', count: 7 }],
            });

            const result = await service.authLoginSource(startDate, endDate);

            expect(result).toEqual({
                data: { buckets: [{ key: 'key-1', count: 7 }] },
            });
            expect(
                analyticDashboardDomain.authLoginSource
            ).toHaveBeenCalledWith(startDate, endDate);
        });
        it('passes undefined dates when the optional range is empty', async () => {
            analyticDateDomain.optionalRange.mockReturnValue({
                startDate: null,
                endDate: null,
            });
            analyticDashboardDomain.authLoginSource.mockResolvedValue(
                {} as never
            );

            await service.authLoginSource();

            expect(
                analyticDashboardDomain.authLoginSource
            ).toHaveBeenCalledWith(undefined, undefined);
        });
    });

    describe('authLockout', () => {
        it('wraps the domain result in the response envelope', async () => {
            analyticDateDomain.requireRange.mockReturnValue({
                startDate,
                endDate,
            });
            analyticDashboardDomain.authLockout.mockResolvedValue({
                failed: 6,
                maxAttempt: 3,
            });

            const result = await service.authLockout(startDate, endDate);

            expect(result).toEqual({ data: { failed: 6, maxAttempt: 3 } });
            expect(analyticDashboardDomain.authLockout).toHaveBeenCalledWith(
                startDate,
                endDate
            );
        });
        it('passes null when dates are omitted', async () => {
            analyticDateDomain.requireRange.mockReturnValue({
                startDate,
                endDate,
            });
            analyticDashboardDomain.authLockout.mockResolvedValue({} as never);

            await service.authLockout();

            expect(analyticDateDomain.requireRange).toHaveBeenCalledWith(
                null,
                null
            );
        });
    });

    describe('authSessionRevoke', () => {
        it('wraps the domain result in the response envelope', async () => {
            analyticDateDomain.requireRange.mockReturnValue({
                startDate,
                endDate,
            });
            analyticDashboardDomain.authSessionRevoke.mockResolvedValue({
                count: 12,
            });

            const result = await service.authSessionRevoke(startDate, endDate);

            expect(result).toEqual({ data: { count: 12 } });
            expect(
                analyticDashboardDomain.authSessionRevoke
            ).toHaveBeenCalledWith(startDate, endDate);
        });
        it('passes null when dates are omitted', async () => {
            analyticDateDomain.requireRange.mockReturnValue({
                startDate,
                endDate,
            });
            analyticDashboardDomain.authSessionRevoke.mockResolvedValue(
                {} as never
            );

            await service.authSessionRevoke();

            expect(analyticDateDomain.requireRange).toHaveBeenCalledWith(
                null,
                null
            );
        });
    });

    describe('authConcurrentSessions', () => {
        it('wraps the domain result in the response envelope', async () => {
            analyticDashboardDomain.authConcurrentSessions.mockResolvedValue({
                buckets: [{ key: 'key-1', count: 7 }],
            });

            const result = await service.authConcurrentSessions();

            expect(result).toEqual({
                data: { buckets: [{ key: 'key-1', count: 7 }] },
            });
            expect(
                analyticDashboardDomain.authConcurrentSessions
            ).toHaveBeenCalledWith();
        });
    });

    describe('authSessionsGeo', () => {
        it('wraps the domain result in the response envelope', async () => {
            analyticDateDomain.optionalRange.mockReturnValue({
                startDate,
                endDate,
            });
            analyticDashboardDomain.authSessionsGeo.mockResolvedValue({
                buckets: [{ key: 'key-1', count: 7 }],
            });

            const result = await service.authSessionsGeo(startDate, endDate);

            expect(result).toEqual({
                data: { buckets: [{ key: 'key-1', count: 7 }] },
            });
            expect(
                analyticDashboardDomain.authSessionsGeo
            ).toHaveBeenCalledWith(startDate, endDate);
        });
        it('passes undefined dates when the optional range is empty', async () => {
            analyticDateDomain.optionalRange.mockReturnValue({
                startDate: null,
                endDate: null,
            });
            analyticDashboardDomain.authSessionsGeo.mockResolvedValue(
                {} as never
            );

            await service.authSessionsGeo();

            expect(
                analyticDashboardDomain.authSessionsGeo
            ).toHaveBeenCalledWith(undefined, undefined);
        });
    });

    describe('authSessionsUserAgent', () => {
        it('wraps the domain result in the response envelope', async () => {
            analyticDateDomain.optionalRange.mockReturnValue({
                startDate,
                endDate,
            });
            analyticDashboardDomain.authSessionsUserAgent.mockResolvedValue({
                buckets: [{ key: 'key-1', count: 7 }],
            });

            const result = await service.authSessionsUserAgent(
                startDate,
                endDate
            );

            expect(result).toEqual({
                data: { buckets: [{ key: 'key-1', count: 7 }] },
            });
            expect(
                analyticDashboardDomain.authSessionsUserAgent
            ).toHaveBeenCalledWith(startDate, endDate);
        });
        it('passes undefined dates when the optional range is empty', async () => {
            analyticDateDomain.optionalRange.mockReturnValue({
                startDate: null,
                endDate: null,
            });
            analyticDashboardDomain.authSessionsUserAgent.mockResolvedValue(
                {} as never
            );

            await service.authSessionsUserAgent();

            expect(
                analyticDashboardDomain.authSessionsUserAgent
            ).toHaveBeenCalledWith(undefined, undefined);
        });
    });

    describe('authRefreshTokenVolume', () => {
        it('wraps the domain result in the response envelope', async () => {
            analyticDateDomain.requireRange.mockReturnValue({
                startDate,
                endDate,
            });
            analyticDashboardDomain.authRefreshTokenVolume.mockResolvedValue({
                count: 12,
            });

            const result = await service.authRefreshTokenVolume(
                startDate,
                endDate
            );

            expect(result).toEqual({ data: { count: 12 } });
            expect(
                analyticDashboardDomain.authRefreshTokenVolume
            ).toHaveBeenCalledWith(startDate, endDate);
        });
        it('passes null when dates are omitted', async () => {
            analyticDateDomain.requireRange.mockReturnValue({
                startDate,
                endDate,
            });
            analyticDashboardDomain.authRefreshTokenVolume.mockResolvedValue(
                {} as never
            );

            await service.authRefreshTokenVolume();

            expect(analyticDateDomain.requireRange).toHaveBeenCalledWith(
                null,
                null
            );
        });
    });

    describe('authLogoutRate', () => {
        it('wraps the domain result in the response envelope', async () => {
            analyticDateDomain.requireRange.mockReturnValue({
                startDate,
                endDate,
            });
            analyticDashboardDomain.authLogoutRate.mockResolvedValue({
                count: 12,
            });

            const result = await service.authLogoutRate(startDate, endDate);

            expect(result).toEqual({ data: { count: 12 } });
            expect(analyticDashboardDomain.authLogoutRate).toHaveBeenCalledWith(
                startDate,
                endDate
            );
        });
        it('passes null when dates are omitted', async () => {
            analyticDateDomain.requireRange.mockReturnValue({
                startDate,
                endDate,
            });
            analyticDashboardDomain.authLogoutRate.mockResolvedValue(
                {} as never
            );

            await service.authLogoutRate();

            expect(analyticDateDomain.requireRange).toHaveBeenCalledWith(
                null,
                null
            );
        });
    });

    describe('authVerificationFunnel', () => {
        it('wraps the domain result in the response envelope', async () => {
            analyticDateDomain.requireRange.mockReturnValue({
                startDate,
                endDate,
            });
            analyticDashboardDomain.authVerificationFunnel.mockResolvedValue({
                email: { used: 1, unused: 2, total: 3, rate: 0.33 },
                mobile: { used: 4, unused: 1, total: 5, rate: 0.8 },
            });

            const result = await service.authVerificationFunnel(
                startDate,
                endDate
            );

            expect(result).toEqual({
                data: {
                    email: { used: 1, unused: 2, total: 3, rate: 0.33 },
                    mobile: { used: 4, unused: 1, total: 5, rate: 0.8 },
                },
            });
            expect(
                analyticDashboardDomain.authVerificationFunnel
            ).toHaveBeenCalledWith(startDate, endDate);
        });
        it('passes null when dates are omitted', async () => {
            analyticDateDomain.requireRange.mockReturnValue({
                startDate,
                endDate,
            });
            analyticDashboardDomain.authVerificationFunnel.mockResolvedValue(
                {} as never
            );

            await service.authVerificationFunnel();

            expect(analyticDateDomain.requireRange).toHaveBeenCalledWith(
                null,
                null
            );
        });
    });

    describe('authPasswordExpiry', () => {
        it('wraps the domain result in the response envelope', async () => {
            analyticDashboardDomain.authPasswordExpiry.mockResolvedValue({
                expired: 2,
                total: 10,
                compliant: 8,
                rate: 0.8,
            });

            const result = await service.authPasswordExpiry();

            expect(result).toEqual({
                data: { expired: 2, total: 10, compliant: 8, rate: 0.8 },
            });
            expect(
                analyticDashboardDomain.authPasswordExpiry
            ).toHaveBeenCalledWith();
        });
    });

    describe('authPasswordChange', () => {
        it('wraps the domain result in the response envelope', async () => {
            analyticDateDomain.requireRange.mockReturnValue({
                startDate,
                endDate,
            });
            analyticDashboardDomain.authPasswordChange.mockResolvedValue({
                count: 12,
            });

            const result = await service.authPasswordChange(startDate, endDate);

            expect(result).toEqual({ data: { count: 12 } });
            expect(
                analyticDashboardDomain.authPasswordChange
            ).toHaveBeenCalledWith(startDate, endDate);
        });
        it('passes null when dates are omitted', async () => {
            analyticDateDomain.requireRange.mockReturnValue({
                startDate,
                endDate,
            });
            analyticDashboardDomain.authPasswordChange.mockResolvedValue(
                {} as never
            );

            await service.authPasswordChange();

            expect(analyticDateDomain.requireRange).toHaveBeenCalledWith(
                null,
                null
            );
        });
    });

    describe('authForgotPasswordConversion', () => {
        it('wraps the domain result in the response envelope', async () => {
            analyticDateDomain.requireRange.mockReturnValue({
                startDate,
                endDate,
            });
            analyticDashboardDomain.authForgotPasswordConversion.mockResolvedValue(
                { created: 5, used: 2, rate: 0.4 }
            );

            const result = await service.authForgotPasswordConversion(
                startDate,
                endDate
            );

            expect(result).toEqual({
                data: { created: 5, used: 2, rate: 0.4 },
            });
            expect(
                analyticDashboardDomain.authForgotPasswordConversion
            ).toHaveBeenCalledWith(startDate, endDate);
        });
        it('passes null when dates are omitted', async () => {
            analyticDateDomain.requireRange.mockReturnValue({
                startDate,
                endDate,
            });
            analyticDashboardDomain.authForgotPasswordConversion.mockResolvedValue(
                {} as never
            );

            await service.authForgotPasswordConversion();

            expect(analyticDateDomain.requireRange).toHaveBeenCalledWith(
                null,
                null
            );
        });
    });

    describe('authAdminForcePassword', () => {
        it('wraps the domain result in the response envelope', async () => {
            analyticDateDomain.requireRange.mockReturnValue({
                startDate,
                endDate,
            });
            analyticDashboardDomain.authAdminForcePassword.mockResolvedValue({
                count: 12,
            });

            const result = await service.authAdminForcePassword(
                startDate,
                endDate
            );

            expect(result).toEqual({ data: { count: 12 } });
            expect(
                analyticDashboardDomain.authAdminForcePassword
            ).toHaveBeenCalledWith(startDate, endDate);
        });
        it('passes null when dates are omitted', async () => {
            analyticDateDomain.requireRange.mockReturnValue({
                startDate,
                endDate,
            });
            analyticDashboardDomain.authAdminForcePassword.mockResolvedValue(
                {} as never
            );

            await service.authAdminForcePassword();

            expect(analyticDateDomain.requireRange).toHaveBeenCalledWith(
                null,
                null
            );
        });
    });

    describe('authTwoFactorAdoption', () => {
        it('wraps the domain result in the response envelope', async () => {
            analyticDashboardDomain.authTwoFactorAdoption.mockResolvedValue({
                enabled: 3,
                total: 9,
                rate: 0.33,
            });

            const result = await service.authTwoFactorAdoption();

            expect(result).toEqual({
                data: { enabled: 3, total: 9, rate: 0.33 },
            });
            expect(
                analyticDashboardDomain.authTwoFactorAdoption
            ).toHaveBeenCalledWith();
        });
    });

    describe('authTwoFactorAdminReset', () => {
        it('wraps the domain result in the response envelope', async () => {
            analyticDateDomain.requireRange.mockReturnValue({
                startDate,
                endDate,
            });
            analyticDashboardDomain.authTwoFactorAdminReset.mockResolvedValue({
                count: 12,
            });

            const result = await service.authTwoFactorAdminReset(
                startDate,
                endDate
            );

            expect(result).toEqual({ data: { count: 12 } });
            expect(
                analyticDashboardDomain.authTwoFactorAdminReset
            ).toHaveBeenCalledWith(startDate, endDate);
        });
        it('passes null when dates are omitted', async () => {
            analyticDateDomain.requireRange.mockReturnValue({
                startDate,
                endDate,
            });
            analyticDashboardDomain.authTwoFactorAdminReset.mockResolvedValue(
                {} as never
            );

            await service.authTwoFactorAdminReset();

            expect(analyticDateDomain.requireRange).toHaveBeenCalledWith(
                null,
                null
            );
        });
    });

    describe('authTwoFactorVerifySuccess', () => {
        it('wraps the domain result in the response envelope', async () => {
            analyticDateDomain.requireRange.mockReturnValue({
                startDate,
                endDate,
            });
            analyticDashboardDomain.authTwoFactorVerifySuccess.mockResolvedValue(
                { count: 12 }
            );

            const result = await service.authTwoFactorVerifySuccess(
                startDate,
                endDate
            );

            expect(result).toEqual({ data: { count: 12 } });
            expect(
                analyticDashboardDomain.authTwoFactorVerifySuccess
            ).toHaveBeenCalledWith(startDate, endDate);
        });
        it('passes null when dates are omitted', async () => {
            analyticDateDomain.requireRange.mockReturnValue({
                startDate,
                endDate,
            });
            analyticDashboardDomain.authTwoFactorVerifySuccess.mockResolvedValue(
                {} as never
            );

            await service.authTwoFactorVerifySuccess();

            expect(analyticDateDomain.requireRange).toHaveBeenCalledWith(
                null,
                null
            );
        });
    });

    describe('authBackupCodeRegeneration', () => {
        it('wraps the domain result in the response envelope', async () => {
            analyticDateDomain.requireRange.mockReturnValue({
                startDate,
                endDate,
            });
            analyticDashboardDomain.authBackupCodeRegeneration.mockResolvedValue(
                { count: 12 }
            );

            const result = await service.authBackupCodeRegeneration(
                startDate,
                endDate
            );

            expect(result).toEqual({ data: { count: 12 } });
            expect(
                analyticDashboardDomain.authBackupCodeRegeneration
            ).toHaveBeenCalledWith(startDate, endDate);
        });
        it('passes null when dates are omitted', async () => {
            analyticDateDomain.requireRange.mockReturnValue({
                startDate,
                endDate,
            });
            analyticDashboardDomain.authBackupCodeRegeneration.mockResolvedValue(
                {} as never
            );

            await service.authBackupCodeRegeneration();

            expect(analyticDateDomain.requireRange).toHaveBeenCalledWith(
                null,
                null
            );
        });
    });

    describe('authTwoFactorAttempt', () => {
        it('wraps the domain result in the response envelope', async () => {
            analyticDashboardDomain.authTwoFactorAttempt.mockResolvedValue({
                usersWithAttempts: 2,
                totalAttempts: 5,
            });

            const result = await service.authTwoFactorAttempt();

            expect(result).toEqual({
                data: { usersWithAttempts: 2, totalAttempts: 5 },
            });
            expect(
                analyticDashboardDomain.authTwoFactorAttempt
            ).toHaveBeenCalledWith();
        });
    });

    describe('devicesRegistration', () => {
        it('wraps the domain result in the response envelope', async () => {
            analyticDateDomain.requireRange.mockReturnValue({
                startDate,
                endDate,
            });
            analyticDashboardDomain.devicesRegistration.mockResolvedValue({
                count: 12,
            });

            const result = await service.devicesRegistration(
                startDate,
                endDate
            );

            expect(result).toEqual({ data: { count: 12 } });
            expect(
                analyticDashboardDomain.devicesRegistration
            ).toHaveBeenCalledWith(startDate, endDate);
        });
        it('passes null when dates are omitted', async () => {
            analyticDateDomain.requireRange.mockReturnValue({
                startDate,
                endDate,
            });
            analyticDashboardDomain.devicesRegistration.mockResolvedValue(
                {} as never
            );

            await service.devicesRegistration();

            expect(analyticDateDomain.requireRange).toHaveBeenCalledWith(
                null,
                null
            );
        });
    });

    describe('devicesPlatform', () => {
        it('wraps the domain result in the response envelope', async () => {
            analyticDashboardDomain.devicesPlatform.mockResolvedValue({
                buckets: [{ key: 'key-1', count: 7 }],
            });

            const result = await service.devicesPlatform();

            expect(result).toEqual({
                data: { buckets: [{ key: 'key-1', count: 7 }] },
            });
            expect(
                analyticDashboardDomain.devicesPlatform
            ).toHaveBeenCalledWith();
        });
    });

    describe('devicesPushToken', () => {
        it('wraps the domain result in the response envelope', async () => {
            analyticDashboardDomain.devicesPushToken.mockResolvedValue({
                count: 4,
                total: 10,
                rate: 0.4,
            });

            const result = await service.devicesPushToken();

            expect(result).toEqual({
                data: { count: 4, total: 10, rate: 0.4 },
            });
            expect(
                analyticDashboardDomain.devicesPushToken
            ).toHaveBeenCalledWith();
        });
    });

    describe('devicesInfoRefresh', () => {
        it('wraps the domain result in the response envelope', async () => {
            analyticDateDomain.requireRange.mockReturnValue({
                startDate,
                endDate,
            });
            analyticDashboardDomain.devicesInfoRefresh.mockResolvedValue({
                count: 12,
            });

            const result = await service.devicesInfoRefresh(startDate, endDate);

            expect(result).toEqual({ data: { count: 12 } });
            expect(
                analyticDashboardDomain.devicesInfoRefresh
            ).toHaveBeenCalledWith(startDate, endDate);
        });
        it('passes null when dates are omitted', async () => {
            analyticDateDomain.requireRange.mockReturnValue({
                startDate,
                endDate,
            });
            analyticDashboardDomain.devicesInfoRefresh.mockResolvedValue(
                {} as never
            );

            await service.devicesInfoRefresh();

            expect(analyticDateDomain.requireRange).toHaveBeenCalledWith(
                null,
                null
            );
        });
    });

    describe('devicesSessionRatio', () => {
        it('wraps the domain result in the response envelope', async () => {
            analyticDashboardDomain.devicesSessionRatio.mockResolvedValue({
                sessions: 10,
                devices: 5,
                ratio: 2,
            });

            const result = await service.devicesSessionRatio();

            expect(result).toEqual({
                data: { sessions: 10, devices: 5, ratio: 2 },
            });
            expect(
                analyticDashboardDomain.devicesSessionRatio
            ).toHaveBeenCalledWith();
        });
    });

    describe('devicesPerUser', () => {
        it('wraps the domain result in the response envelope', async () => {
            analyticDashboardDomain.devicesPerUser.mockResolvedValue({
                buckets: [{ key: 'key-1', count: 7 }],
            });

            const result = await service.devicesPerUser();

            expect(result).toEqual({
                data: { buckets: [{ key: 'key-1', count: 7 }] },
            });
            expect(
                analyticDashboardDomain.devicesPerUser
            ).toHaveBeenCalledWith();
        });
    });

    describe('devicesInactivity', () => {
        it('wraps the domain result in the response envelope', async () => {
            analyticDashboardDomain.devicesInactivity.mockResolvedValue({
                count: 12,
            });

            const result = await service.devicesInactivity();

            expect(result).toEqual({ data: { count: 12 } });
            expect(
                analyticDashboardDomain.devicesInactivity
            ).toHaveBeenCalledWith();
        });
    });

    describe('apiKeysLifecycle', () => {
        it('wraps the domain result in the response envelope', async () => {
            analyticDateDomain.requireRange.mockReturnValue({
                startDate,
                endDate,
            });
            analyticDashboardDomain.apiKeysLifecycle.mockResolvedValue({
                created: 1,
                reset: 2,
                updated: 3,
                deleted: 4,
            });

            const result = await service.apiKeysLifecycle(startDate, endDate);

            expect(result).toEqual({
                data: { created: 1, reset: 2, updated: 3, deleted: 4 },
            });
            expect(
                analyticDashboardDomain.apiKeysLifecycle
            ).toHaveBeenCalledWith(startDate, endDate);
        });
        it('passes null when dates are omitted', async () => {
            analyticDateDomain.requireRange.mockReturnValue({
                startDate,
                endDate,
            });
            analyticDashboardDomain.apiKeysLifecycle.mockResolvedValue(
                {} as never
            );

            await service.apiKeysLifecycle();

            expect(analyticDateDomain.requireRange).toHaveBeenCalledWith(
                null,
                null
            );
        });
    });

    describe('apiKeysActiveExpired', () => {
        it('wraps the domain result in the response envelope', async () => {
            analyticDashboardDomain.apiKeysActiveExpired.mockResolvedValue({
                active: 6,
                expired: 1,
            });

            const result = await service.apiKeysActiveExpired();

            expect(result).toEqual({ data: { active: 6, expired: 1 } });
            expect(
                analyticDashboardDomain.apiKeysActiveExpired
            ).toHaveBeenCalledWith();
        });
    });

    describe('apiKeysTypeMix', () => {
        it('wraps the domain result in the response envelope', async () => {
            analyticDashboardDomain.apiKeysTypeMix.mockResolvedValue({
                buckets: [{ key: 'key-1', count: 7 }],
            });

            const result = await service.apiKeysTypeMix();

            expect(result).toEqual({
                data: { buckets: [{ key: 'key-1', count: 7 }] },
            });
            expect(
                analyticDashboardDomain.apiKeysTypeMix
            ).toHaveBeenCalledWith();
        });
    });

    describe('termPoliciesAcceptanceRate', () => {
        it('wraps the domain result in the response envelope', async () => {
            analyticDateDomain.optionalRange.mockReturnValue({
                startDate,
                endDate,
            });
            analyticDashboardDomain.termPoliciesAcceptanceRate.mockResolvedValue(
                { acceptances: 4, users: 8, published: 2, rate: 0.5 }
            );

            const result = await service.termPoliciesAcceptanceRate(
                startDate,
                endDate
            );

            expect(result).toEqual({
                data: { acceptances: 4, users: 8, published: 2, rate: 0.5 },
            });
            expect(
                analyticDashboardDomain.termPoliciesAcceptanceRate
            ).toHaveBeenCalledWith(startDate, endDate);
        });
        it('passes undefined dates when the optional range is empty', async () => {
            analyticDateDomain.optionalRange.mockReturnValue({
                startDate: null,
                endDate: null,
            });
            analyticDashboardDomain.termPoliciesAcceptanceRate.mockResolvedValue(
                {} as never
            );

            await service.termPoliciesAcceptanceRate();

            expect(
                analyticDashboardDomain.termPoliciesAcceptanceRate
            ).toHaveBeenCalledWith(undefined, undefined);
        });
    });

    describe('termPoliciesTimeToAccept', () => {
        it('wraps the domain result in the response envelope', async () => {
            analyticDateDomain.optionalRange.mockReturnValue({
                startDate,
                endDate,
            });
            analyticDashboardDomain.termPoliciesTimeToAccept.mockResolvedValue({
                count: 3,
                averageMs: 1500,
            });

            const result = await service.termPoliciesTimeToAccept(
                startDate,
                endDate
            );

            expect(result).toEqual({ data: { count: 3, averageMs: 1500 } });
            expect(
                analyticDashboardDomain.termPoliciesTimeToAccept
            ).toHaveBeenCalledWith(startDate, endDate);
        });
        it('passes undefined dates when the optional range is empty', async () => {
            analyticDateDomain.optionalRange.mockReturnValue({
                startDate: null,
                endDate: null,
            });
            analyticDashboardDomain.termPoliciesTimeToAccept.mockResolvedValue(
                {} as never
            );

            await service.termPoliciesTimeToAccept();

            expect(
                analyticDashboardDomain.termPoliciesTimeToAccept
            ).toHaveBeenCalledWith(undefined, undefined);
        });
    });

    describe('workspacesCreation', () => {
        it('wraps the domain result in the response envelope', async () => {
            analyticDateDomain.requireRange.mockReturnValue({
                startDate,
                endDate,
            });
            analyticDashboardDomain.workspacesCreation.mockResolvedValue({
                count: 12,
            });

            const result = await service.workspacesCreation(startDate, endDate);

            expect(result).toEqual({ data: { count: 12 } });
            expect(
                analyticDashboardDomain.workspacesCreation
            ).toHaveBeenCalledWith(startDate, endDate);
        });
        it('passes null when dates are omitted', async () => {
            analyticDateDomain.requireRange.mockReturnValue({
                startDate,
                endDate,
            });
            analyticDashboardDomain.workspacesCreation.mockResolvedValue(
                {} as never
            );

            await service.workspacesCreation();

            expect(analyticDateDomain.requireRange).toHaveBeenCalledWith(
                null,
                null
            );
        });
    });

    describe('workspacesVisibility', () => {
        it('wraps the domain result in the response envelope', async () => {
            analyticDashboardDomain.workspacesVisibility.mockResolvedValue({
                buckets: [{ key: 'key-1', count: 7 }],
            });

            const result = await service.workspacesVisibility();

            expect(result).toEqual({
                data: { buckets: [{ key: 'key-1', count: 7 }] },
            });
            expect(
                analyticDashboardDomain.workspacesVisibility
            ).toHaveBeenCalledWith();
        });
    });

    describe('workspacesInviteFunnel', () => {
        it('wraps the domain result in the response envelope', async () => {
            analyticDateDomain.requireRange.mockReturnValue({
                startDate,
                endDate,
            });
            analyticDashboardDomain.workspacesInviteFunnel.mockResolvedValue([
                { status: 'pending', count: 2 },
            ]);

            const result = await service.workspacesInviteFunnel(
                startDate,
                endDate
            );

            expect(result).toEqual({
                data: { statuses: [{ status: 'pending', count: 2 }] },
            });
            expect(
                analyticDashboardDomain.workspacesInviteFunnel
            ).toHaveBeenCalledWith(startDate, endDate);
        });
        it('passes null when dates are omitted', async () => {
            analyticDateDomain.requireRange.mockReturnValue({
                startDate,
                endDate,
            });
            analyticDashboardDomain.workspacesInviteFunnel.mockResolvedValue(
                {} as never
            );

            await service.workspacesInviteFunnel();

            expect(analyticDateDomain.requireRange).toHaveBeenCalledWith(
                null,
                null
            );
        });
    });

    describe('workspacesJoinOutcomes', () => {
        it('wraps the domain result in the response envelope', async () => {
            analyticDateDomain.requireRange.mockReturnValue({
                startDate,
                endDate,
            });
            analyticDashboardDomain.workspacesJoinOutcomes.mockResolvedValue([
                { status: 'pending', count: 2 },
            ]);

            const result = await service.workspacesJoinOutcomes(
                startDate,
                endDate
            );

            expect(result).toEqual({
                data: { statuses: [{ status: 'pending', count: 2 }] },
            });
            expect(
                analyticDashboardDomain.workspacesJoinOutcomes
            ).toHaveBeenCalledWith(startDate, endDate);
        });
        it('passes null when dates are omitted', async () => {
            analyticDateDomain.requireRange.mockReturnValue({
                startDate,
                endDate,
            });
            analyticDashboardDomain.workspacesJoinOutcomes.mockResolvedValue(
                {} as never
            );

            await service.workspacesJoinOutcomes();

            expect(analyticDateDomain.requireRange).toHaveBeenCalledWith(
                null,
                null
            );
        });
    });

    describe('workspacesMembership', () => {
        it('returns the domain page unchanged', async () => {
            const page = {
                type: EnumPaginationType.offset as const,
                count: 1,
                perPage: 20,
                page: 1,
                totalPage: 1,
                hasNext: false,
                hasPrevious: false,
                data: [{ workspaceId: 'workspace-1', count: 3 }],
            };
            analyticDashboardDomain.workspacesMembership.mockResolvedValue(
                page
            );

            const result = await service.workspacesMembership({
                page: 1,
                perPage: 20,
            });

            expect(result).toEqual(page);
            expect(
                analyticDashboardDomain.workspacesMembership
            ).toHaveBeenCalledWith(pagination);
        });
    });

    describe('workspacesActivityVolume', () => {
        it('returns the domain page unchanged', async () => {
            analyticDateDomain.requireRange.mockReturnValue({
                startDate,
                endDate,
            });
            const page = {
                type: EnumPaginationType.offset as const,
                count: 1,
                perPage: 20,
                page: 1,
                totalPage: 1,
                hasNext: false,
                hasPrevious: false,
                data: [{ workspaceId: 'workspace-1', count: 3 }],
            };
            analyticDashboardDomain.workspacesActivityVolume.mockResolvedValue(
                page
            );

            const result = await service.workspacesActivityVolume({
                startDate,
                endDate,
                page: 1,
                perPage: 20,
            });

            expect(result).toEqual(page);
            expect(
                analyticDashboardDomain.workspacesActivityVolume
            ).toHaveBeenCalledWith(startDate, endDate, pagination);
        });
        it('passes null dates when query dates are omitted', async () => {
            analyticDateDomain.requireRange.mockReturnValue({
                startDate,
                endDate,
            });
            const page = {
                type: EnumPaginationType.offset as const,
                count: 0,
                perPage: 20,
                page: 1,
                totalPage: 0,
                hasNext: false,
                hasPrevious: false,
                data: [],
            };
            analyticDashboardDomain.workspacesActivityVolume.mockResolvedValue(
                page
            );

            await service.workspacesActivityVolume({
                page: 1,
                perPage: 20,
            } as never);

            expect(analyticDateDomain.requireRange).toHaveBeenCalledWith(
                null,
                null
            );
        });
    });

    describe('projectsCreation', () => {
        it('wraps the domain result in the response envelope', async () => {
            analyticDateDomain.requireRange.mockReturnValue({
                startDate,
                endDate,
            });
            analyticDashboardDomain.projectsCreation.mockResolvedValue({
                created: 2,
                perWorkspace: [{ workspaceId: 'workspace-1', count: 2 }],
            });

            const result = await service.projectsCreation(startDate, endDate);

            expect(result).toEqual({
                data: {
                    created: 2,
                    perWorkspace: [{ workspaceId: 'workspace-1', count: 2 }],
                },
            });
            expect(
                analyticDashboardDomain.projectsCreation
            ).toHaveBeenCalledWith(startDate, endDate);
        });
        it('passes null when dates are omitted', async () => {
            analyticDateDomain.requireRange.mockReturnValue({
                startDate,
                endDate,
            });
            analyticDashboardDomain.projectsCreation.mockResolvedValue(
                {} as never
            );

            await service.projectsCreation();

            expect(analyticDateDomain.requireRange).toHaveBeenCalledWith(
                null,
                null
            );
        });
    });

    describe('projectsMembership', () => {
        it('returns the domain page unchanged', async () => {
            const page = {
                type: EnumPaginationType.offset as const,
                count: 1,
                perPage: 20,
                page: 1,
                totalPage: 1,
                hasNext: false,
                hasPrevious: false,
                data: [{ projectId: 'project-1', count: 4 }],
            };
            analyticDashboardDomain.projectsMembership.mockResolvedValue(page);

            const result = await service.projectsMembership({
                page: 1,
                perPage: 20,
            });

            expect(result).toEqual(page);
            expect(
                analyticDashboardDomain.projectsMembership
            ).toHaveBeenCalledWith(pagination);
        });
    });
});
