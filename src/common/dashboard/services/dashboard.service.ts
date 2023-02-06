import { DashboardDto } from 'src/common/dashboard/dtos/dashboard';
import {
    IDashboardStartAndEnd,
    IDashboardStartAndEndDate,
    IDashboardStartAndEndYear,
} from 'src/common/dashboard/interfaces/dashboard.interface';
import { IDashboardService } from 'src/common/dashboard/interfaces/dashboard.service.interface';
import { HelperDateService } from 'src/common/helper/services/helper.date.service';
import { HelperNumberService } from 'src/common/helper/services/helper.number.service';

export class DashboardService implements IDashboardService {
    constructor(
        private readonly helperDateService: HelperDateService,
        private readonly helperNumberService: HelperNumberService
    ) {}

    async getStartAndEndDate(
        date: DashboardDto
    ): Promise<IDashboardStartAndEndDate> {
        const today = this.helperDateService.create();
        let { startDate, endDate } = date;

        if (!startDate && !endDate) {
            startDate = this.helperDateService.startOfYear(today);
            endDate = this.helperDateService.endOfYear(today);
        } else {
            if (!startDate) {
                startDate = this.helperDateService.startOfDay();
            } else {
                startDate = this.helperDateService.startOfDay(startDate);
            }

            if (!endDate) {
                endDate = this.helperDateService.endOfDay();
            } else {
                endDate = this.helperDateService.endOfDay(endDate);
            }
        }

        return {
            startDate,
            endDate,
        };
    }

    async getMonths(): Promise<number[]> {
        return [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];
    }

    async getStartAndEndYear({
        startDate,
        endDate,
    }: IDashboardStartAndEndDate): Promise<IDashboardStartAndEndYear> {
        return {
            startYear: startDate.getFullYear(),
            endYear: endDate.getFullYear(),
        };
    }

    async getStartAndEndMonth({
        month,
        year,
    }: IDashboardStartAndEnd): Promise<IDashboardStartAndEndDate> {
        const monthString = `${month}`.padStart(2, '0');
        const date: Date = this.helperDateService.create(
            `${year}-${monthString}-01`
        );

        const startDate = this.helperDateService.startOfMonth(date);
        const endDate = this.helperDateService.endOfMonth(date);

        return {
            startDate,
            endDate,
        };
    }

    async getPercentage(value: number, total: number): Promise<number> {
        return this.helperNumberService.percent(value, total);
    }
}
