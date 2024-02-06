import { Injectable } from '@nestjs/common';
import { HelperDateService } from 'src/common/helper/services/helper.date.service';
import { DashboardDto } from 'src/modules/dashboard/dtos/dashboard.dto';
import { IDashboardService } from 'src/modules/dashboard/interfaces/dashboard.service.interface';
import { DashboardSerialization } from 'src/modules/dashboard/serializations/dashboard.serialization';

@Injectable()
export class DashboardService implements IDashboardService {
    constructor(private readonly helperDateService: HelperDateService) {}

    getStartAndEndDate(date?: DashboardDto): DashboardSerialization {
        const today = this.helperDateService.create();

        if (!date) {
            const startDate = this.helperDateService.startOfMonth(today);
            const endDate = this.helperDateService.endOfMonth(today);

            return {
                startDate,
                endDate,
            };
        }
        let { startDate, endDate } = date;

        if (!startDate) {
            startDate = this.helperDateService.startOfMonth();
        } else {
            startDate = this.helperDateService.startOfDay(startDate);
        }

        if (!endDate) {
            endDate = this.helperDateService.endOfMonth();
        } else {
            endDate = this.helperDateService.endOfDay(endDate);
        }

        return {
            startDate,
            endDate,
        };
    }
}
