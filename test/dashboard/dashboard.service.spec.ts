import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import { DashboardService } from 'src/common/dashboard/services/dashboard.service';
import { HelperDateService } from 'src/common/helper/services/helper.date.service';
import { HelperNumberService } from 'src/common/helper/services/helper.number.service';

describe('DashboardService', () => {
    let service: DashboardService;

    beforeEach(async () => {
        const moduleRef: TestingModule = await Test.createTestingModule({
            providers: [
                DashboardService,
                HelperNumberService,
                HelperDateService,
                {
                    provide: ConfigService,
                    useValue: {
                        get: jest.fn().mockImplementation((key: string) => {
                            switch (key) {
                                case 'app.tz':
                                default:
                                    return 'UTC';
                            }
                        }),
                    },
                },
            ],
            imports: [],
        }).compile();

        service = moduleRef.get<DashboardService>(DashboardService);
    });

    it('should be defined', () => {
        expect(service).toBeDefined();
    });

    describe('getStartAndEndDate', () => {
        it('should return current month start and end dates if no start and end dates are provided', async () => {
            const today = new Date();
            const startDate = new Date(
                today.getFullYear(),
                today.getMonth(),
                1,
                0,
                0,
                0,
                0
            );
            const endDate = new Date(
                today.getFullYear(),
                today.getMonth() + 1,
                0,
                23,
                59,
                59,
                999
            );

            const result = service.getStartAndEndDate();

            expect(result.startDate).toEqual(startDate);
            expect(result.endDate).toEqual(endDate);
        });

        it('should return start and end dates as provided', async () => {
            const today = new Date();
            const startDate = new Date(
                today.getFullYear(),
                today.getMonth(),
                1,
                0,
                0,
                0,
                0
            );
            const endDate = new Date(
                today.getFullYear(),
                today.getMonth() + 1,
                0,
                23,
                59,
                59,
                999
            );

            const result = service.getStartAndEndDate({
                startDate,
                endDate,
            });

            expect(result.startDate).toEqual(startDate);
            expect(result.endDate).toEqual(endDate);
        });

        it('should return start date as current day of month if not provided', async () => {
            const today = new Date();
            const startDate = new Date(
                today.getFullYear(),
                today.getMonth(),
                1,
                0,
                0,
                0,
                0
            );
            const endDate = new Date(
                today.getFullYear(),
                today.getMonth() + 1,
                0,
                23,
                59,
                59,
                999
            );

            const result = service.getStartAndEndDate({ endDate });

            expect(result.startDate).toEqual(startDate);
            expect(result.endDate).toEqual(endDate);
        });

        it('should return end date as current day of month if not provided', async () => {
            const today = new Date();
            const startDate = new Date(
                today.getFullYear(),
                today.getMonth(),
                1,
                0,
                0,
                0,
                0
            );
            const endDate = new Date(
                today.getFullYear(),
                today.getMonth() + 1,
                0,
                23,
                59,
                59,
                999
            );

            const result = service.getStartAndEndDate({ startDate });

            expect(result.startDate).toEqual(startDate);
            expect(result.endDate).toEqual(endDate);
        });
    });

    describe('getPercentage', () => {
        it('should return the percentage of the value in total', async () => {
            const value = 2;
            const total = 10;
            const expectedPercentage = 20;
            const result = service.getPercentage(value, total);

            expect(result).toEqual(expectedPercentage);
        });
    });
});
