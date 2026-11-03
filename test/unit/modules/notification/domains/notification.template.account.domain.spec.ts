import { Test } from '@nestjs/testing';
import { mock } from 'vitest-mock-extended';
import type { MockProxy } from 'vitest-mock-extended';
import { TemplateDoesNotExistException } from '@aws-sdk/client-ses';
import type { GetTemplateCommandOutput } from '@aws-sdk/client-ses';
import { AppUnknownException } from '@app/exceptions/app.unknown.exception';
import { AwsSESService } from '@common/aws/services/aws.ses.service';
import { EnumNotificationProcess } from '@modules/notification/enums/notification.enum';
import { NotificationTemplateAccountDomain } from '@modules/notification/domains/notification.template.account.domain';
import { MessageService } from '@common/message/services/message.service';

describe('NotificationTemplateAccountDomain', () => {
    const messageService: MockProxy<MessageService> = mock<MessageService>();
    const awsSESService: MockProxy<AwsSESService> = mock<AwsSESService>();
    let domain: NotificationTemplateAccountDomain;

    beforeEach(async () => {
        vi.resetAllMocks();
        messageService.setMessage.mockImplementation((path: string) => path);
        const module = await Test.createTestingModule({
            providers: [
                { provide: MessageService, useValue: messageService },
                NotificationTemplateAccountDomain,
                { provide: AwsSESService, useValue: awsSESService },
            ],
        }).compile();
        domain = module.get(NotificationTemplateAccountDomain);
    });

    describe('emailImportWelcome', () => {
        it('creates the welcome template', async () => {
            awsSESService.createTemplate.mockResolvedValue({
                $metadata: {},
            });

            await expect(domain.emailImportWelcome()).resolves.toBeUndefined();
            expect(awsSESService.createTemplate).toHaveBeenCalledWith({
                name: EnumNotificationProcess.welcome,
                subject: 'Welcome',
                htmlBody: expect.any(String),
            });
        });

        it('throws an AppUnknownException chaining the rejection when the create call rejects', async () => {
            const error = new Error('down');
            awsSESService.createTemplate.mockRejectedValue(error);

            await expect(domain.emailImportWelcome()).rejects.toMatchObject({
                constructor: AppUnknownException,
                rawError: error,
            });
        });
    });

    describe('emailGetWelcome', () => {
        it('returns the welcome template from SES', async () => {
            const template: GetTemplateCommandOutput = {
                $metadata: {},
                Template: { TemplateName: 'welcome' },
            };
            awsSESService.getTemplate.mockResolvedValue(template);

            const result = await domain.emailGetWelcome();

            expect(result).toBe(template);
            expect(awsSESService.getTemplate).toHaveBeenCalledWith({
                name: EnumNotificationProcess.welcome,
            });
        });

        it('returns null for the template-not-found answer', async () => {
            awsSESService.getTemplate.mockRejectedValue(
                new TemplateDoesNotExistException({
                    message: 'missing',
                    $metadata: {},
                })
            );

            await expect(domain.emailGetWelcome()).resolves.toBeNull();
        });

        it('throws an AppUnknownException chaining the rejection for any other error', async () => {
            const error = new Error('ses down');
            awsSESService.getTemplate.mockRejectedValue(error);

            await expect(domain.emailGetWelcome()).rejects.toMatchObject({
                constructor: AppUnknownException,
                rawError: error,
            });
        });
    });

    describe('emailDeleteWelcome', () => {
        it('deletes the welcome template', async () => {
            awsSESService.deleteTemplate.mockResolvedValue({ $metadata: {} });

            await expect(domain.emailDeleteWelcome()).resolves.toBeUndefined();
            expect(awsSESService.deleteTemplate).toHaveBeenCalledWith({
                name: EnumNotificationProcess.welcome,
            });
        });

        it('throws an AppUnknownException chaining the rejection when the delete call rejects', async () => {
            const error = new Error('down');
            awsSESService.deleteTemplate.mockRejectedValue(error);

            await expect(domain.emailDeleteWelcome()).rejects.toMatchObject({
                constructor: AppUnknownException,
                rawError: error,
            });
        });
    });

    describe('emailImportWelcomeSocial', () => {
        it('creates the welcome social template', async () => {
            awsSESService.createTemplate.mockResolvedValue({
                $metadata: {},
            });

            await expect(
                domain.emailImportWelcomeSocial()
            ).resolves.toBeUndefined();
            expect(awsSESService.createTemplate).toHaveBeenCalledWith({
                name: EnumNotificationProcess.welcomeSocial,
                subject: 'Welcome Social',
                htmlBody: expect.any(String),
            });
        });

        it('throws an AppUnknownException chaining the rejection when the create call rejects', async () => {
            const error = new Error('down');
            awsSESService.createTemplate.mockRejectedValue(error);

            await expect(
                domain.emailImportWelcomeSocial()
            ).rejects.toMatchObject({
                constructor: AppUnknownException,
                rawError: error,
            });
        });
    });

    describe('emailGetWelcomeSocial', () => {
        it('returns the welcome social template from SES', async () => {
            const template: GetTemplateCommandOutput = {
                $metadata: {},
                Template: { TemplateName: 'welcomeSocial' },
            };
            awsSESService.getTemplate.mockResolvedValue(template);

            const result = await domain.emailGetWelcomeSocial();

            expect(result).toBe(template);
            expect(awsSESService.getTemplate).toHaveBeenCalledWith({
                name: EnumNotificationProcess.welcomeSocial,
            });
        });

        it('returns null for the template-not-found answer', async () => {
            awsSESService.getTemplate.mockRejectedValue(
                new TemplateDoesNotExistException({
                    message: 'missing',
                    $metadata: {},
                })
            );

            await expect(domain.emailGetWelcomeSocial()).resolves.toBeNull();
        });

        it('throws an AppUnknownException chaining the rejection for any other error', async () => {
            const error = new Error('ses down');
            awsSESService.getTemplate.mockRejectedValue(error);

            await expect(domain.emailGetWelcomeSocial()).rejects.toMatchObject({
                constructor: AppUnknownException,
                rawError: error,
            });
        });
    });

    describe('emailDeleteWelcomeSocial', () => {
        it('deletes the welcome social template', async () => {
            awsSESService.deleteTemplate.mockResolvedValue({ $metadata: {} });

            await expect(
                domain.emailDeleteWelcomeSocial()
            ).resolves.toBeUndefined();
            expect(awsSESService.deleteTemplate).toHaveBeenCalledWith({
                name: EnumNotificationProcess.welcomeSocial,
            });
        });

        it('throws an AppUnknownException chaining the rejection when the delete call rejects', async () => {
            const error = new Error('down');
            awsSESService.deleteTemplate.mockRejectedValue(error);

            await expect(
                domain.emailDeleteWelcomeSocial()
            ).rejects.toMatchObject({
                constructor: AppUnknownException,
                rawError: error,
            });
        });
    });

    describe('emailImportWelcomeByAdmin', () => {
        it('creates the welcome by admin template', async () => {
            awsSESService.createTemplate.mockResolvedValue({
                $metadata: {},
            });

            await expect(
                domain.emailImportWelcomeByAdmin()
            ).resolves.toBeUndefined();
            expect(awsSESService.createTemplate).toHaveBeenCalledWith({
                name: EnumNotificationProcess.welcomeByAdmin,
                subject: 'Welcome By Admin',
                htmlBody: expect.any(String),
            });
        });

        it('throws an AppUnknownException chaining the rejection when the create call rejects', async () => {
            const error = new Error('down');
            awsSESService.createTemplate.mockRejectedValue(error);

            await expect(
                domain.emailImportWelcomeByAdmin()
            ).rejects.toMatchObject({
                constructor: AppUnknownException,
                rawError: error,
            });
        });
    });

    describe('emailGetWelcomeByAdmin', () => {
        it('returns the welcome by admin template from SES', async () => {
            const template: GetTemplateCommandOutput = {
                $metadata: {},
                Template: { TemplateName: 'welcomeByAdmin' },
            };
            awsSESService.getTemplate.mockResolvedValue(template);

            const result = await domain.emailGetWelcomeByAdmin();

            expect(result).toBe(template);
            expect(awsSESService.getTemplate).toHaveBeenCalledWith({
                name: EnumNotificationProcess.welcomeByAdmin,
            });
        });

        it('returns null for the template-not-found answer', async () => {
            awsSESService.getTemplate.mockRejectedValue(
                new TemplateDoesNotExistException({
                    message: 'missing',
                    $metadata: {},
                })
            );

            await expect(domain.emailGetWelcomeByAdmin()).resolves.toBeNull();
        });

        it('throws an AppUnknownException chaining the rejection for any other error', async () => {
            const error = new Error('ses down');
            awsSESService.getTemplate.mockRejectedValue(error);

            await expect(domain.emailGetWelcomeByAdmin()).rejects.toMatchObject(
                {
                    constructor: AppUnknownException,
                    rawError: error,
                }
            );
        });
    });

    describe('emailDeleteWelcomeByAdmin', () => {
        it('deletes the welcome by admin template', async () => {
            awsSESService.deleteTemplate.mockResolvedValue({ $metadata: {} });

            await expect(
                domain.emailDeleteWelcomeByAdmin()
            ).resolves.toBeUndefined();
            expect(awsSESService.deleteTemplate).toHaveBeenCalledWith({
                name: EnumNotificationProcess.welcomeByAdmin,
            });
        });

        it('throws an AppUnknownException chaining the rejection when the delete call rejects', async () => {
            const error = new Error('down');
            awsSESService.deleteTemplate.mockRejectedValue(error);

            await expect(
                domain.emailDeleteWelcomeByAdmin()
            ).rejects.toMatchObject({
                constructor: AppUnknownException,
                rawError: error,
            });
        });
    });

    describe('emailImportVerificationEmail', () => {
        it('creates the verification email template', async () => {
            awsSESService.createTemplate.mockResolvedValue({
                $metadata: {},
            });

            await expect(
                domain.emailImportVerificationEmail()
            ).resolves.toBeUndefined();
            expect(awsSESService.createTemplate).toHaveBeenCalledWith({
                name: EnumNotificationProcess.verificationEmail,
                subject: 'Email Verification',
                htmlBody: expect.any(String),
            });
        });

        it('throws an AppUnknownException chaining the rejection when the create call rejects', async () => {
            const error = new Error('down');
            awsSESService.createTemplate.mockRejectedValue(error);

            await expect(
                domain.emailImportVerificationEmail()
            ).rejects.toMatchObject({
                constructor: AppUnknownException,
                rawError: error,
            });
        });
    });

    describe('emailGetVerificationEmail', () => {
        it('returns the verification email template from SES', async () => {
            const template: GetTemplateCommandOutput = {
                $metadata: {},
                Template: { TemplateName: 'verificationEmail' },
            };
            awsSESService.getTemplate.mockResolvedValue(template);

            const result = await domain.emailGetVerificationEmail();

            expect(result).toBe(template);
            expect(awsSESService.getTemplate).toHaveBeenCalledWith({
                name: EnumNotificationProcess.verificationEmail,
            });
        });

        it('returns null for the template-not-found answer', async () => {
            awsSESService.getTemplate.mockRejectedValue(
                new TemplateDoesNotExistException({
                    message: 'missing',
                    $metadata: {},
                })
            );

            await expect(
                domain.emailGetVerificationEmail()
            ).resolves.toBeNull();
        });

        it('throws an AppUnknownException chaining the rejection for any other error', async () => {
            const error = new Error('ses down');
            awsSESService.getTemplate.mockRejectedValue(error);

            await expect(
                domain.emailGetVerificationEmail()
            ).rejects.toMatchObject({
                constructor: AppUnknownException,
                rawError: error,
            });
        });
    });

    describe('emailDeleteVerificationEmail', () => {
        it('deletes the verification email template', async () => {
            awsSESService.deleteTemplate.mockResolvedValue({ $metadata: {} });

            await expect(
                domain.emailDeleteVerificationEmail()
            ).resolves.toBeUndefined();
            expect(awsSESService.deleteTemplate).toHaveBeenCalledWith({
                name: EnumNotificationProcess.verificationEmail,
            });
        });

        it('throws an AppUnknownException chaining the rejection when the delete call rejects', async () => {
            const error = new Error('down');
            awsSESService.deleteTemplate.mockRejectedValue(error);

            await expect(
                domain.emailDeleteVerificationEmail()
            ).rejects.toMatchObject({
                constructor: AppUnknownException,
                rawError: error,
            });
        });
    });

    describe('emailImportVerifiedEmail', () => {
        it('creates the verified email template', async () => {
            awsSESService.createTemplate.mockResolvedValue({
                $metadata: {},
            });

            await expect(
                domain.emailImportVerifiedEmail()
            ).resolves.toBeUndefined();
            expect(awsSESService.createTemplate).toHaveBeenCalledWith({
                name: EnumNotificationProcess.verifiedEmail,
                subject: 'Email Verified',
                htmlBody: expect.any(String),
            });
        });

        it('throws an AppUnknownException chaining the rejection when the create call rejects', async () => {
            const error = new Error('down');
            awsSESService.createTemplate.mockRejectedValue(error);

            await expect(
                domain.emailImportVerifiedEmail()
            ).rejects.toMatchObject({
                constructor: AppUnknownException,
                rawError: error,
            });
        });
    });

    describe('emailGetVerifiedEmail', () => {
        it('returns the verified email template from SES', async () => {
            const template: GetTemplateCommandOutput = {
                $metadata: {},
                Template: { TemplateName: 'verifiedEmail' },
            };
            awsSESService.getTemplate.mockResolvedValue(template);

            const result = await domain.emailGetVerifiedEmail();

            expect(result).toBe(template);
            expect(awsSESService.getTemplate).toHaveBeenCalledWith({
                name: EnumNotificationProcess.verifiedEmail,
            });
        });

        it('returns null for the template-not-found answer', async () => {
            awsSESService.getTemplate.mockRejectedValue(
                new TemplateDoesNotExistException({
                    message: 'missing',
                    $metadata: {},
                })
            );

            await expect(domain.emailGetVerifiedEmail()).resolves.toBeNull();
        });

        it('throws an AppUnknownException chaining the rejection for any other error', async () => {
            const error = new Error('ses down');
            awsSESService.getTemplate.mockRejectedValue(error);

            await expect(domain.emailGetVerifiedEmail()).rejects.toMatchObject({
                constructor: AppUnknownException,
                rawError: error,
            });
        });
    });

    describe('emailDeleteVerifiedEmail', () => {
        it('deletes the verified email template', async () => {
            awsSESService.deleteTemplate.mockResolvedValue({ $metadata: {} });

            await expect(
                domain.emailDeleteVerifiedEmail()
            ).resolves.toBeUndefined();
            expect(awsSESService.deleteTemplate).toHaveBeenCalledWith({
                name: EnumNotificationProcess.verifiedEmail,
            });
        });

        it('throws an AppUnknownException chaining the rejection when the delete call rejects', async () => {
            const error = new Error('down');
            awsSESService.deleteTemplate.mockRejectedValue(error);

            await expect(
                domain.emailDeleteVerifiedEmail()
            ).rejects.toMatchObject({
                constructor: AppUnknownException,
                rawError: error,
            });
        });
    });

    describe('emailImportVerifiedMobileNumber', () => {
        it('creates the verified mobile number template', async () => {
            awsSESService.createTemplate.mockResolvedValue({
                $metadata: {},
            });

            await expect(
                domain.emailImportVerifiedMobileNumber()
            ).resolves.toBeUndefined();
            expect(awsSESService.createTemplate).toHaveBeenCalledWith({
                name: EnumNotificationProcess.verifiedMobileNumber,
                subject: 'MobileNumber Verified',
                htmlBody: expect.any(String),
            });
        });

        it('throws an AppUnknownException chaining the rejection when the create call rejects', async () => {
            const error = new Error('down');
            awsSESService.createTemplate.mockRejectedValue(error);

            await expect(
                domain.emailImportVerifiedMobileNumber()
            ).rejects.toMatchObject({
                constructor: AppUnknownException,
                rawError: error,
            });
        });
    });

    describe('emailGetVerifiedMobileNumber', () => {
        it('returns the verified mobile number template from SES', async () => {
            const template: GetTemplateCommandOutput = {
                $metadata: {},
                Template: { TemplateName: 'verifiedMobileNumber' },
            };
            awsSESService.getTemplate.mockResolvedValue(template);

            const result = await domain.emailGetVerifiedMobileNumber();

            expect(result).toBe(template);
            expect(awsSESService.getTemplate).toHaveBeenCalledWith({
                name: EnumNotificationProcess.verifiedMobileNumber,
            });
        });

        it('returns null for the template-not-found answer', async () => {
            awsSESService.getTemplate.mockRejectedValue(
                new TemplateDoesNotExistException({
                    message: 'missing',
                    $metadata: {},
                })
            );

            await expect(
                domain.emailGetVerifiedMobileNumber()
            ).resolves.toBeNull();
        });

        it('throws an AppUnknownException chaining the rejection for any other error', async () => {
            const error = new Error('ses down');
            awsSESService.getTemplate.mockRejectedValue(error);

            await expect(
                domain.emailGetVerifiedMobileNumber()
            ).rejects.toMatchObject({
                constructor: AppUnknownException,
                rawError: error,
            });
        });
    });

    describe('emailDeleteVerifiedMobileNumber', () => {
        it('deletes the verified mobile number template', async () => {
            awsSESService.deleteTemplate.mockResolvedValue({ $metadata: {} });

            await expect(
                domain.emailDeleteVerifiedMobileNumber()
            ).resolves.toBeUndefined();
            expect(awsSESService.deleteTemplate).toHaveBeenCalledWith({
                name: EnumNotificationProcess.verifiedMobileNumber,
            });
        });

        it('throws an AppUnknownException chaining the rejection when the delete call rejects', async () => {
            const error = new Error('down');
            awsSESService.deleteTemplate.mockRejectedValue(error);

            await expect(
                domain.emailDeleteVerifiedMobileNumber()
            ).rejects.toMatchObject({
                constructor: AppUnknownException,
                rawError: error,
            });
        });
    });
});
