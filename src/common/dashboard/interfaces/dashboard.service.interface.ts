import { DashboardDto } from 'src/common/dashboard/dtos/dashboard';
import {
    IDashboardStartAndEnd,
    IDashboardStartAndEndDate,
    IDashboardStartAndEndYear,
} from 'src/common/dashboard/interfaces/dashboard.interface';

export interface IDashboardService {
    getStartAndEndDate(date: DashboardDto): Promise<IDashboardStartAndEndDate>;

    getMonths(): Promise<number[]>;

    getStartAndEndYear({
        startDate,
        endDate,
    }: IDashboardStartAndEndDate): Promise<IDashboardStartAndEndYear>;

    getStartAndEndMonth({
        month,
        year,
    }: IDashboardStartAndEnd): Promise<IDashboardStartAndEndDate>;

    getPercentage(value: number, total: number): Promise<number>;
}
