import { Injectable } from '@nestjs/common';
import { IHelperService } from 'src/common/helper/interfaces/helper.service.interface';

@Injectable()
export class HelperService implements IHelperService {
    async delay(ms: number): Promise<void> {
        return new Promise((resolve) => setTimeout(resolve, ms));
    }
}
