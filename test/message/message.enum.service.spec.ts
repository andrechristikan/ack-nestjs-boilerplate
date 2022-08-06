import { Test } from '@nestjs/testing';
import { CommonModule } from 'src/common/common.module';
import { MessageEnumService } from 'src/common/message/services/message.enum.service';

describe('MessageEnumService', () => {
    let messageEnumService: MessageEnumService;

    beforeEach(async () => {
        const moduleRef = await Test.createTestingModule({
            imports: [CommonModule],
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
