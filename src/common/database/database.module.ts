import { Module } from '@nestjs/common';
import { ConfigModule } from 'common/config/config.module';
import { DatabaseService } from 'common/database/database.service';

@Module({
    providers: [DatabaseService],
    exports: [DatabaseService],
    imports: [ConfigModule],
})
export class DatabaseModule {}
