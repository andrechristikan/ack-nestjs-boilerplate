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
            ],
            imports: [],
        }).compile();

        service = moduleRef.get<DashboardService>(DashboardService);
    });

    it('should be defined', () => {
        expect(service).toBeDefined();
    });

    describe('getStartAndEndDate', () => {
        it('should return current year start and end dates if no start and end dates are provided', async () => {
            const startDate = new Date(new Date().setMonth(0, 1));
            const endDate = new Date(new Date().setMonth(11, 31));
            const expectedStartDate = new Date(startDate.setHours(0, 0, 0, 0));
            const expectedEndDate = new Date(endDate.setHours(23, 59, 59, 999));

            const result = service.getStartAndEndDate({});

            expect(result.startDate).toEqual(expectedStartDate);
            expect(result.endDate).toEqual(expectedEndDate);
        });

        it('should return start and end dates as provided', async () => {
            const startDate = new Date(2022, 5, 15);
            const endDate = new Date(2022, 5, 20);
            const expectedStartDate = new Date(startDate.setHours(0, 0, 0, 0));
            const expectedEndDate = new Date(endDate.setHours(23, 59, 59, 999));

            const result = service.getStartAndEndDate({
                startDate,
                endDate,
            });

            expect(result.startDate).toEqual(expectedStartDate);
            expect(result.endDate).toEqual(expectedEndDate);
        });

        it('should return start date as current day start if not provided', async () => {
            const endDate = new Date(2022, 5, 15);
            const startDate = new Date();
            const expectedStartDate = new Date(startDate.setHours(0, 0, 0, 0));
            const expectedEndDate = new Date(endDate.setHours(23, 59, 59, 999));

            const result = service.getStartAndEndDate({ endDate });

            expect(result.startDate).toEqual(expectedStartDate);
            expect(result.endDate).toEqual(expectedEndDate);
        });

        it('should return end date as current day end if not provided', async () => {
            const startDate = new Date(2022, 5, 15);
            const endDate = new Date();
            const expectedStartDate = new Date(startDate.setHours(0, 0, 0, 0));
            const expectedEndDate = new Date(endDate.setHours(23, 59, 59, 999));

            const result = service.getStartAndEndDate({ startDate });

            expect(result.startDate).toEqual(expectedStartDate);
            expect(result.endDate).toEqual(expectedEndDate);
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
