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

    afterEach(async () => {
        jest.clearAllMocks();
    });

    it('should be defined', () => {
        expect(messageEnumService).toBeDefined();
    });

    describe('getLanguages', () => {
        it('should be success', async () => {
            const result: string[] = await messageEnumService.getLanguages();

            jest.spyOn(
                messageEnumService,
                'getLanguages'
            ).mockRejectedValueOnce(result as any);

            expect(result).toBeTruthy();
        });
    });
});
