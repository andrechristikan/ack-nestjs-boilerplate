import { NestFactory } from '@nestjs/core';
import { CommandModule, CommandService } from 'nestjs-command';
import { AppModule } from 'src/app/app.module';

(async () => {
    const app = await NestFactory.createApplicationContext(AppModule, {
        logger: false
    });
    app.select(CommandModule).get(CommandService).exec();
})();
