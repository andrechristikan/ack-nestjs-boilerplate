import { DashboardDto } from 'src/common/dashboard/dtos/dashboard';
import { IDashboardStartAndEndDate } from 'src/common/dashboard/interfaces/dashboard.interface';

export interface IDashboardService {
    getStartAndEndDate(date?: DashboardDto): IDashboardStartAndEndDate;
    getPercentage(value: number, total: number): number;
}
