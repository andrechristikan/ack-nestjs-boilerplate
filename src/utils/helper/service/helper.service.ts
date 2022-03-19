import { Injectable } from '@nestjs/common';

@Injectable()
export class HelperService {
    async delay(ms: number): Promise<void> {
        return new Promise((resolve) => setTimeout(resolve, ms));
    }
}
