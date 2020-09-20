import { Module } from '@nestjs/common';
import { ConfigModule } from 'common/config/config.module';
import { LanguageService } from 'components/language/language.service';

@Module({
    providers: [LanguageService],
    exports: [LanguageService],
    imports: [ConfigModule],
})
export class LanguageModule {}
