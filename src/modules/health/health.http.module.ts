import { HealthModule } from '@modules/health/health.module';
import { HealthHttpService } from '@modules/health/services/health.http.service';
import { Module } from '@nestjs/common';

@Module({
    controllers: [],
    providers: [HealthHttpService],
    exports: [HealthHttpService],
    imports: [HealthModule],
})
export class HealthHttpModule {}
