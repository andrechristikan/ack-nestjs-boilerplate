import { Test } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { I18nService } from 'nestjs-i18n';
import { ValidationError } from 'class-validator';
import { MessageService } from 'src/common/message/services/message.service';
import { IValidationErrorImport } from 'src/common/error/interfaces/error.interface';
import { HelperArrayService } from 'src/common/helper/services/helper.array.service';

describe('MessageService', () => {
    let service: MessageService;

    const language = 'en';
    const language2 = 'id';
    const mockMessage = 'Localized Message';

    let validationError: ValidationError[];
    let validationError2: ValidationError[];
    let validationError3: ValidationError[];
    let validationError4: ValidationError[];
    let validationErrorImport: IValidationErrorImport[];

    beforeEach(async () => {
        const moduleRefRef = await Test.createTestingModule({
            providers: [
                MessageService,
                HelperArrayService,
                {
                    provide: I18nService,
                    useValue: {
                        translate: jest.fn().mockReturnValue(mockMessage),
                    },
                },
                {
                    provide: ConfigService,
                    useValue: {
                        get: jest.fn().mockImplementation((key: string) => {
                            switch (key) {
                                case 'message.language':
                                    return language;
                                case 'message.availableLanguage':
                                default:
                                    return [language, language2];
                            }
                        }),
                    },
                },
            ],
        }).compile();

        service = moduleRefRef.get<MessageService>(MessageService);

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

        validationError2 = [
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

        validationError3 = [
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

        validationError4 = [
            {
                target: {
                    email: 'admin-mail.com',
                    password: 'aaAA@@123444',
                    rememberMe: true,
                },
                value: 'admin-mail.com',
                property: 'email',
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
                            isString: 'mainBranch must be a string',
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
        expect(service).toBeDefined();
    });

    describe('getAvailableLanguages', () => {
        it('should return an array of available languages', () => {
            expect(service.getAvailableLanguages()).toEqual([
                language,
                language2,
            ]);
        });
    });

    describe('getLanguage', () => {
        it('should return the default language', () => {
            expect(service.getLanguage()).toEqual(language);
        });
    });

    describe('filterLanguage', () => {
        it('should return the same array of languages available', () => {
            const languages = service.filterLanguage([
                language,
                language,
                language2,
            ]);

            expect(languages.length).toEqual(2);
            expect(languages).toEqual([language, language2]);
        });
    });

    describe('setMessage', () => {
        it('should return the translated message for the given language and key', () => {
            expect(service.setMessage(language, 'test.message')).toEqual(
                mockMessage
            );
        });

        it('should include the properties in the translated message', () => {
            expect(
                service.setMessage(language, 'test.message', {
                    properties: { name: 'John' },
                })
            ).toEqual(mockMessage);
        });
    });

    describe('getRequestErrorsMessage', () => {
        it('should return an array of error messages corresponding to the validation errors', () => {
            const message = service.getRequestErrorsMessage(validationError);

            expect(message).toEqual([
                { message: 'Localized Message', property: 'email' },
            ]);
        });

        it('should return an array of error messages corresponding to the validation errors for nested object', () => {
            const message = service.getRequestErrorsMessage(validationError2);

            expect(message).toEqual([
                {
                    message: 'Localized Message',
                    property: 'email.email',
                },
            ]);
        });

        it('should return an array of error messages corresponding to the validation errors for deepest nested object', () => {
            const message = service.getRequestErrorsMessage(validationError3);

            expect(message).toEqual([
                {
                    message: 'Localized Message',
                    property: 'email.email.email',
                },
            ]);
        });

        it('should return an array of error messages corresponding to the validation without constraints field', () => {
            const message = service.getRequestErrorsMessage(validationError4);

            expect(message).toEqual([
                {
                    message: 'Localized Message',
                    property: 'email.email',
                },
            ]);
        });

        it('should return an array of multi error messages corresponding to the validation errors', () => {
            const message = service.getRequestErrorsMessage(validationError, {
                customLanguages: [language, language2],
            });

            expect(message).toEqual([
                {
                    message: {
                        en: 'Localized Message',
                        id: 'Localized Message',
                    },
                    property: 'email',
                },
            ]);
        });
    });

    describe('getImportErrorsMessage', () => {
        it('should return an array of error messages corresponding to the validation errors in the import', () => {
            const message = service.getImportErrorsMessage(
                validationErrorImport
            );

            expect(message.length).toEqual(validationErrorImport.length);
            expect(message[0].errors.length).toEqual(2);
            expect(message[0].file).toBeDefined();
            expect(message[0].row).toBeDefined();
        });
    });

    describe('get', () => {
        it('should return the translated message for the default language and key', () => {
            expect(service.get('test.message')).toEqual(mockMessage);
        });

        it('should include the properties in the translated message', () => {
            expect(
                service.get('test.message', { properties: { name: 'John' } })
            ).toEqual(mockMessage);
        });

        it('should return an object with translated messages for each language if custom languages are provided', () => {
            expect(
                service.get('test.message', {
                    customLanguages: [language, language2],
                })
            ).toEqual({ en: mockMessage, id: mockMessage });
        });
    });
});
