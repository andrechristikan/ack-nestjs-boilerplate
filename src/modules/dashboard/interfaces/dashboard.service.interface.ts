import { DashboardDto } from 'src/modules/dashboard/dtos/dashboard.dto';
import { DashboardSerialization } from 'src/modules/dashboard/serializations/dashboard.serialization';

export interface IDashboardService {
    getStartAndEndDate(date?: DashboardDto): DashboardSerialization;
}
