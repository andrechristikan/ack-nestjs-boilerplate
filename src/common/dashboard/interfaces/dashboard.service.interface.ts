import { DashboardDto } from 'src/common/dashboard/dtos/dashboard';
import {
    IDashboardStartAndEnd,
    IDashboardStartAndEndDate,
    IDashboardStartAndEndYear,
} from 'src/common/dashboard/interfaces/dashboard.interface';

export interface IDashboardService {
    getStartAndEndDate(date?: DashboardDto): Promise<IDashboardStartAndEndDate>;
    getMonths(): Promise<number[]>;
    getStartAndEndYear(
        date: IDashboardStartAndEndDate
    ): Promise<IDashboardStartAndEndYear>;
    getStartAndEndMonth(
        date: IDashboardStartAndEnd
    ): Promise<IDashboardStartAndEndDate>;
    getPercentage(value: number, total: number): Promise<number>;
}
