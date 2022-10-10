import { ConfigModule } from '@nestjs/config';
import { Test } from '@nestjs/testing';
import { HelperModule } from 'src/common/helper/helper.module';
import { MessageModule } from 'src/common/message/message.module';
import { MessageEnumService } from 'src/common/message/services/message.enum.service';
import configs from 'src/configs';

describe('MessageEnumService', () => {
    let messageEnumService: MessageEnumService;

    beforeEach(async () => {
        const moduleRef = await Test.createTestingModule({
            imports: [
                ConfigModule.forRoot({
                    load: configs,
                    isGlobal: true,
                    cache: true,
                    envFilePath: ['.env'],
                    expandVariables: true,
                }),
                HelperModule,
                MessageModule,
            ],
        }).compile();

        messageEnumService =
            moduleRef.get<MessageEnumService>(MessageEnumService);
    });

    describe('getLanguages', () => {
        it('should be called', async () => {
            const test = jest.spyOn(messageEnumService, 'getLanguages');

            await messageEnumService.getLanguages();
            expect(test).toHaveBeenCalled();
        });

        it('should be success', async () => {
            const languages = messageEnumService.getLanguages();
            jest.spyOn(messageEnumService, 'getLanguages').mockImplementation(
                () => languages
            );

            expect(messageEnumService.getLanguages()).toBe(languages);
        });
    });
});
