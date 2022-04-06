import { Test } from '@nestjs/testing';
import { BaseModule } from 'src/core/core.module';
import { MessageService } from 'src/message/service/message.service';

describe('MessageService', () => {
    let messageService: MessageService;

    beforeEach(async () => {
        const moduleRef = await Test.createTestingModule({
            imports: [BaseModule],
        }).compile();

        messageService = moduleRef.get<MessageService>(MessageService);
    });

    it('should be defined', () => {
        expect(messageService).toBeDefined();
    });

    describe('get', () => {
        it('should be called', async () => {
            const test = jest.spyOn(messageService, 'get');

            await messageService.get('test.hello');
            expect(test).toHaveBeenCalledWith('test.hello');
        });

        it('should be success', async () => {
            const message = messageService.get('test.hello');
            jest.spyOn(messageService, 'get').mockImplementation(() => message);

            expect(messageService.get('test.hello')).toBe(message);
        });
    });

    describe('getRequestErrorsMessage', () => {
        const validationError = [
            {
                target: {
                    email: 'adminmail.com',
                    password: 'aaAA@@123444',
                    rememberMe: true,
                },
                value: 'adminmail.com',
                property: 'email',
                children: [],
                constraints: { isEmail: 'email must be an email' },
            },
        ];

        it('should be called', async () => {
            const test = jest.spyOn(messageService, 'getRequestErrorsMessage');

            await messageService.getRequestErrorsMessage(validationError);
            expect(test).toHaveBeenCalledWith(validationError);
        });

        it('should be success', async () => {
            const message = await messageService.getRequestErrorsMessage(
                validationError
            );
            jest.spyOn(
                messageService,
                'getRequestErrorsMessage'
            ).mockImplementation(async () => message);

            expect(
                await messageService.getRequestErrorsMessage(validationError)
            ).toBe(message);
        });
    });

    describe('getLanguages', () => {
        it('should be called', async () => {
            const test = jest.spyOn(messageService, 'getLanguages');

            await messageService.getLanguages();
            expect(test).toHaveBeenCalled();
        });

        it('should be success', async () => {
            const languages = messageService.getLanguages();
            jest.spyOn(messageService, 'getLanguages').mockImplementation(
                () => languages
            );

            expect(messageService.getLanguages()).toBe(languages);
        });
    });
});
