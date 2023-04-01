import { ConfigModule } from '@nestjs/config';
import { Test } from '@nestjs/testing';
import { ValidationError } from 'class-validator';
import {
    IErrors,
    IErrorsImport,
    IValidationErrorImport,
} from 'src/common/error/interfaces/error.interface';
import { HelperModule } from 'src/common/helper/helper.module';
import { ENUM_MESSAGE_LANGUAGE } from 'src/common/message/constants/message.enum.constant';
import { IMessage } from 'src/common/message/interfaces/message.interface';
import { MessageModule } from 'src/common/message/message.module';
import { MessageService } from 'src/common/message/services/message.service';
import configs from 'src/configs';

describe('MessageService', () => {
    let messageService: MessageService;

    let validationError: ValidationError[];
    let validationErrorTwo: ValidationError[];
    let validationErrorThree: ValidationError[];
    let validationErrorConstrainEmpty: ValidationError[];
    let validationErrorImport: IValidationErrorImport[];

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

    afterEach(async () => {
        jest.clearAllMocks();
    });

    it('should be defined', () => {
        expect(messageService).toBeDefined();
    });

    describe('getAvailableLanguages', () => {
        it('should be success', async () => {
            const result: string[] =
                await messageService.getAvailableLanguages();

            jest.spyOn(
                messageService,
                'getAvailableLanguages'
            ).mockReturnValueOnce(result as any);

            expect(result).toBeTruthy();
            expect(result).toBeTruthy();
        });
    });

    describe('get', () => {
        it('should be success', async () => {
            const result: string | IMessage = await messageService.get(
                'test.hello'
            );

            jest.spyOn(messageService, 'get').mockReturnValueOnce(
                result as any
            );

            expect(result).toBeTruthy();
        });
    });

    describe('getRequestErrorsMessage', () => {
        it('single message should be success', async () => {
            const result: IErrors[] =
                await messageService.getRequestErrorsMessage(validationError, [
                    'en',
                ]);

            jest.spyOn(
                messageService,
                'getRequestErrorsMessage'
            ).mockReturnValueOnce(result as any);

            expect(result).toBeTruthy();
        });

        it('multi message should be success', async () => {
            const result: IErrors[] =
                await messageService.getRequestErrorsMessage(validationError, [
                    'en',
                    'id',
                ]);

            jest.spyOn(
                messageService,
                'getRequestErrorsMessage'
            ).mockReturnValueOnce(result as any);

            expect(result).toBeTruthy();
        });

        it('multi message if there has some undefined value should be success', async () => {
            const result: IErrors[] =
                await messageService.getRequestErrorsMessage(validationError, [
                    undefined,
                    'id',
                ]);

            jest.spyOn(
                messageService,
                'getRequestErrorsMessage'
            ).mockReturnValueOnce(result as any);

            expect(result).toBeTruthy();
        });

        it('should be success', async () => {
            const result: IErrors[] =
                await messageService.getRequestErrorsMessage(validationError);

            jest.spyOn(
                messageService,
                'getRequestErrorsMessage'
            ).mockReturnValueOnce(result as any);

            expect(result).toBeTruthy();
        });

        it('should be success', async () => {
            const result: IErrors[] =
                await messageService.getRequestErrorsMessage(validationError);

            jest.spyOn(
                messageService,
                'getRequestErrorsMessage'
            ).mockReturnValueOnce(result as any);

            expect(result).toBeTruthy();
        });

        it('two children should be success', async () => {
            const result: IErrors[] =
                await messageService.getRequestErrorsMessage(
                    validationErrorTwo
                );

            jest.spyOn(
                messageService,
                'getRequestErrorsMessage'
            ).mockReturnValueOnce(result as any);

            expect(result).toBeTruthy();
        });

        it('three children should be success', async () => {
            const result: IErrors[] =
                await messageService.getRequestErrorsMessage(
                    validationErrorThree
                );

            jest.spyOn(
                messageService,
                'getRequestErrorsMessage'
            ).mockReturnValueOnce(result as any);

            expect(result).toBeTruthy();
        });

        it('empty constrain should be success', async () => {
            const result: IErrors[] =
                await messageService.getRequestErrorsMessage(
                    validationErrorConstrainEmpty
                );
            jest.spyOn(
                messageService,
                'getRequestErrorsMessage'
            ).mockReturnValueOnce(result as any);

            expect(result).toBeTruthy();
        });
    });

    describe('getImportErrorsMessage', () => {
        it('should be success', async () => {
            const result: IErrorsImport[] =
                await messageService.getImportErrorsMessage(
                    validationErrorImport
                );

            jest.spyOn(
                messageService,
                'getImportErrorsMessage'
            ).mockReturnValueOnce(result as any);

            expect(result).toBeTruthy();
        });

        it('should be success with options', async () => {
            const result: IErrorsImport[] =
                await messageService.getImportErrorsMessage(
                    validationErrorImport,
                    ['en', 'id']
                );

            jest.spyOn(
                messageService,
                'getImportErrorsMessage'
            ).mockReturnValueOnce(result as any);

            expect(result).toBeTruthy();
        });
    });
});
