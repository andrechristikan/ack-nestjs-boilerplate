import { Test } from '@nestjs/testing';
import type { TestingModule } from '@nestjs/testing';
import { mock } from 'vitest-mock-extended';
import type { MockProxy } from 'vitest-mock-extended';
import { EnumNotificationChannel } from '@generated/prisma-client/client';
import { EnumAnalyticStatusCodeError } from '@modules/analytic/enums/analytic.status-code.enum';
import { AnalyticInvalidDateRangeException } from '@modules/analytic/exceptions/analytic.invalid-date-range.exception';
import { AnalyticDateService } from '@modules/analytic/services/analytic.date.service';
import { AnalyticNotificationService } from '@modules/analytic/services/analytic.notification.service';
import { AnalyticNotificationDeliveryUseCase } from '@modules/analytic/use-cases/analytic.notification-delivery.use-case';

describe('AnalyticNotificationDeliveryUseCase', () => {
    const analyticNotificationService: MockProxy<AnalyticNotificationService> =
        mock<AnalyticNotificationService>();

    const analyticDateService: MockProxy<AnalyticDateService> =
        mock<AnalyticDateService>();

    const startDate: Date = new Date('2026-01-01T00:00:00.000Z');

    const endDate: Date = new Date('2026-01-08T00:00:00.000Z');

    let useCase: AnalyticNotificationDeliveryUseCase;

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                AnalyticNotificationDeliveryUseCase,
                {
                    provide: AnalyticNotificationService,
                    useValue: analyticNotificationService,
                },
                { provide: AnalyticDateService, useValue: analyticDateService },
            ],
        }).compile();

        useCase = module.get(AnalyticNotificationDeliveryUseCase);
    });

    describe('execute', () => {
        it('passes the validated range to the service and wraps the result', async () => {
            const delivery = {
                channels: [
                    {
                        channel: EnumNotificationChannel.email,
                        total: 3,
                        sent: 1,
                        failed: 1,
                        pending: 1,
                    },
                ],
            };
            analyticDateService.requireRange.mockReturnValue({
                startDate,
                endDate,
            });
            analyticNotificationService.getNotificationDelivery.mockResolvedValue(
                delivery
            );

            const result = await useCase.execute({ startDate, endDate });

            expect(result).toEqual({ data: delivery });
            expect(analyticDateService.requireRange).toHaveBeenCalledWith(
                startDate,
                endDate
            );
            expect(
                analyticNotificationService.getNotificationDelivery
            ).toHaveBeenCalledWith(startDate, endDate);
        });

        it('throws the range exception before the service is called', async () => {
            analyticDateService.requireRange.mockImplementation(() => {
                throw new AnalyticInvalidDateRangeException();
            });

            await expect(
                useCase.execute({ startDate: endDate, endDate: startDate })
            ).rejects.toMatchObject({
                module: 'analytic',
                statusCode: EnumAnalyticStatusCodeError.invalidDateRange,
            });
            expect(
                analyticNotificationService.getNotificationDelivery
            ).not.toHaveBeenCalled();
        });
    });
});
