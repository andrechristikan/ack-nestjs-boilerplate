import { Module } from '@nestjs/common';
import { ConfigModule } from 'config/config.module';
import { DatabaseService } from 'database/database.service';

@Module({
    providers: [DatabaseService],
    exports: [DatabaseService],
    imports: [ConfigModule],
})
export class DatabaseModule {}
