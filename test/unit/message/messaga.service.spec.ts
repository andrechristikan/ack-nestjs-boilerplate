import { Test } from '@nestjs/testing';
import { ValidationError } from 'class-validator';
import { CommonModule } from 'src/common/common.module';
import { IValidationErrorImport } from 'src/common/error/error.interface';
import { MessageService } from 'src/common/message/services/message.service';

describe('MessageService', () => {
    let messageService: MessageService;

    let validationError: ValidationError[];
    let validationErrorTwo: ValidationError[];
    let validationErrorThree: ValidationError[];
    let validationErrorConstrainEmpty: ValidationError[];
    let validationErrorImport: IValidationErrorImport[];

    beforeEach(async () => {
        const moduleRef = await Test.createTestingModule({
            imports: [CommonModule],
        }).compile();

        messageService = moduleRef.get<MessageService>(MessageService);

        validationError = [
            {
                target: {
                    email: 'admin-mail.com',
                    password: 'aaAA@@123444',
                    rememberMe: true,
                },
                value: 'admin-mail.com',
                property: 'email',
                children: [],
                constraints: { isEmail: 'email must be an email' },
            },
        ];

        validationErrorTwo = [
            {
                target: {
                    email: 'admin-mail.com',
                    password: 'aaAA@@123444',
                    rememberMe: true,
                },
                value: 'admin-mail.com',
                property: 'email',
                constraints: { isEmail: 'email must be an email' },
                children: [
                    {
                        target: {
                            email: 'admin-mail.com',
                            password: 'aaAA@@123444',
                            rememberMe: true,
                        },
                        value: 'admin-mail.com',
                        property: 'email',
                        constraints: {
                            isEmail: 'email must be an email',
                        },
                        children: [],
                    },
                ],
            },
        ];

        validationErrorThree = [
            {
                target: {
                    email: 'admin-mail.com',
                    password: 'aaAA@@123444',
                    rememberMe: true,
                },
                value: 'admin-mail.com',
                property: 'email',
                constraints: { isEmail: 'email must be an email' },
                children: [
                    {
                        target: {
                            email: 'admin-mail.com',
                            password: 'aaAA@@123444',
                            rememberMe: true,
                        },
                        value: 'admin-mail.com',
                        property: 'email',
                        constraints: {
                            isEmail: 'email must be an email',
                        },
                        children: [
                            {
                                target: {
                                    email: 'admin-mail.com',
                                    password: 'aaAA@@123444',
                                    rememberMe: true,
                                },
                                value: 'admin-mail.com',
                                property: 'email',
                                constraints: {
                                    isEmail: 'email must be an email',
                                },
                                children: [],
                            },
                        ],
                    },
                ],
            },
        ];

        validationErrorConstrainEmpty = [
            {
                target: {
                    email: 'admin-mail.com',
                    password: 'aaAA@@123444',
                    rememberMe: true,
                },
                value: 'admin-mail.com',
                property: 'email',
                children: [],
            },
        ];

        validationErrorImport = [
            {
                row: 0,
                file: 'error.xlsx',
                errors: [
                    {
                        target: {
                            number: 1,
                            area: 'area',
                            city: 'area timur',
                            gps: { latitude: 6.1754, longitude: 106.8272 },
                            address: 'address 1',
                            tags: ['test', 'lala'],
                        },
                        property: 'mainBranch',
                        children: [],
                        constraints: {
                            isNotEmpty: 'mainBranch should not be empty',
                            isString: 'mainBranch must be a string',
                        },
                    },
                ],
            },
            {
                row: 1,
                file: 'error.xlsx',
                errors: [
                    {
                        target: {
                            number: 2,
                            area: 'area',
                            city: 'area timur',
                            tags: [],
                        },
                        property: 'mainBranch',
                        children: [],
                        constraints: {
                            isNotEmpty: 'mainBranch should not be empty',
                            isString: 'mainBranch must be a string',
                        },
                    },
                ],
            },
            {
                row: 2,
                file: 'error.xlsx',
                errors: [
                    {
                        target: {
                            number: null,
                            area: 'area',
                            city: 'area timur',
                            address: 'address 3',
                            tags: ['test'],
                        },
                        value: null,
                        property: 'number',
                        children: [],
                        constraints: {
                            min: 'number must not be less than 0',
                            isNumber:
                                'number must be a number conforming to the specified constraints',
                        },
                    },
                    {
                        target: {
                            number: null,
                            area: 'area',
                            city: 'area timur',
                            address: 'address 3',
                            tags: ['test'],
                        },
                        property: 'mainBranch',
                        children: [],
                        constraints: {
                            isNotEmpty: 'mainBranch should not be empty',
                            isString: 'mainBranch must be a string',
                        },
                    },
                ],
            },
            {
                row: 3,
                file: 'error.xlsx',
                errors: [
                    {
                        target: {
                            number: 4,
                            area: 'area',
                            city: 'area timur',
                            gps: { latitude: 6.1754, longitude: 106.8273 },
                            address: 'address 4',
                            tags: ['hand', 'test'],
                        },
                        property: 'mainBranch',
                        children: [],
                        constraints: {
                            isNotEmpty: 'mainBranch should not be empty',
                            isString: 'mainBranch must be a string',
                        },
                    },
                ],
            },
            {
                row: 4,
                file: 'error.xlsx',
                errors: [
                    {
                        target: {
                            number: null,
                            area: 'area',
                            city: 'area timur',
                            tags: ['lala'],
                        },
                        value: null,
                        property: 'number',
                        children: [],
                        constraints: {
                            min: 'number must not be less than 0',
                            isNumber:
                                'number must be a number conforming to the specified constraints',
                        },
                    },
                    {
                        target: {
                            number: null,
                            area: 'area',
                            city: 'area timur',
                            tags: ['lala'],
                        },
                        property: 'mainBranch',
                        children: [],
                        constraints: {
                            isNotEmpty: 'mainBranch should not be empty',
                            isString: 'mainBranch must be a string',
                        },
                    },
                ],
            },
            {
                row: 5,
                file: 'error.xlsx',
                errors: [
                    {
                        target: {
                            number: 6,
                            area: 'area',
                            city: 'area timur',
                            gps: { latitude: 6.1754, longitude: 106.8273 },
                            address: 'address 6',
                            tags: [],
                        },
                        property: 'mainBranch',
                        children: [],
                        constraints: {
                            isNotEmpty: 'mainBranch should not be empty',
                            isString: 'mainBranch must be a string',
                        },
                    },
                ],
            },
        ];
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
        it('should be called', async () => {
            const test = jest.spyOn(messageService, 'getRequestErrorsMessage');

            await messageService.getRequestErrorsMessage(validationError);
            expect(test).toHaveBeenCalledWith(validationError);
        });

        it('single message should be success', async () => {
            const message = await messageService.getRequestErrorsMessage(
                validationError,
                ['en']
            );
            jest.spyOn(
                messageService,
                'getRequestErrorsMessage'
            ).mockImplementation(async () => message);

            expect(
                await messageService.getRequestErrorsMessage(validationError, [
                    'en',
                ])
            ).toBe(message);
        });

        it('multi message should be success', async () => {
            const message = await messageService.getRequestErrorsMessage(
                validationError,
                ['en', 'id']
            );
            jest.spyOn(
                messageService,
                'getRequestErrorsMessage'
            ).mockImplementation(async () => message);

            expect(
                await messageService.getRequestErrorsMessage(validationError, [
                    'en',
                    'id',
                ])
            ).toBe(message);
        });

        it('multi message if there has some undefined value should be success', async () => {
            const message = await messageService.getRequestErrorsMessage(
                validationError,
                [undefined, 'id']
            );
            jest.spyOn(
                messageService,
                'getRequestErrorsMessage'
            ).mockImplementation(async () => message);

            expect(
                await messageService.getRequestErrorsMessage(validationError, [
                    undefined,
                    'id',
                ])
            ).toBe(message);
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

        it('two children should be success', async () => {
            const message = await messageService.getRequestErrorsMessage(
                validationErrorTwo
            );
            jest.spyOn(
                messageService,
                'getRequestErrorsMessage'
            ).mockImplementation(async () => message);

            expect(
                await messageService.getRequestErrorsMessage(validationErrorTwo)
            ).toBe(message);
        });

        it('three children should be success', async () => {
            const message = await messageService.getRequestErrorsMessage(
                validationErrorThree
            );
            jest.spyOn(
                messageService,
                'getRequestErrorsMessage'
            ).mockImplementation(async () => message);

            expect(
                await messageService.getRequestErrorsMessage(
                    validationErrorThree
                )
            ).toBe(message);
        });

        it('empty constrain should be success', async () => {
            const message = await messageService.getRequestErrorsMessage(
                validationErrorConstrainEmpty
            );
            jest.spyOn(
                messageService,
                'getRequestErrorsMessage'
            ).mockImplementation(async () => message);

            expect(
                await messageService.getRequestErrorsMessage(
                    validationErrorConstrainEmpty
                )
            ).toBe(message);
        });
    });

    describe('getImportErrorsMessage', () => {
        it('should be called', async () => {
            const test = jest.spyOn(messageService, 'getImportErrorsMessage');

            await messageService.getImportErrorsMessage(validationErrorImport);
            expect(test).toHaveBeenCalled();
        });

        it('should be success', async () => {
            const languages = messageService.getImportErrorsMessage(
                validationErrorImport
            );
            jest.spyOn(
                messageService,
                'getImportErrorsMessage'
            ).mockImplementation(() => languages);

            expect(
                messageService.getImportErrorsMessage(validationErrorImport)
            ).toBe(languages);
        });

        it('should be success with options', async () => {
            const languages = messageService.getImportErrorsMessage(
                validationErrorImport,
                ['en', 'id']
            );
            jest.spyOn(
                messageService,
                'getImportErrorsMessage'
            ).mockImplementation(() => languages);

            expect(
                messageService.getImportErrorsMessage(validationErrorImport, [
                    'en',
                    'id',
                ])
            ).toBe(languages);
        });
    });
});
