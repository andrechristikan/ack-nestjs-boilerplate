import { Module } from '@nestjs/common';
import { ConfigModule } from 'config/config.module';
import { LanguageService } from 'language/language.service';

@Module({
    providers: [LanguageService],
    exports: [LanguageService],
    imports: [ConfigModule],
})
export class LanguageModule {}
