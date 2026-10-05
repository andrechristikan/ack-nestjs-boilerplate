import { Test } from '@nestjs/testing';
import { mock } from 'vitest-mock-extended';
import type { MockProxy } from 'vitest-mock-extended';
import type { GetTemplateCommandOutput } from '@aws-sdk/client-ses';
import { AwsSESService } from '@common/aws/services/aws.ses.service';
import { EnumNotificationProcess } from '@modules/notification/enums/notification.enum';
import { NotificationTemplateAccountDomain } from '@modules/notification/domains/notification.template.account.domain';

describe('NotificationTemplateAccountDomain', () => {
    const awsSESService: MockProxy<AwsSESService> = mock<AwsSESService>();
    let domain: NotificationTemplateAccountDomain;

    beforeEach(async () => {
        vi.resetAllMocks();
        const module = await Test.createTestingModule({
            providers: [
                NotificationTemplateAccountDomain,
                { provide: AwsSESService, useValue: awsSESService },
            ],
        }).compile();
        domain = module.get(NotificationTemplateAccountDomain);
    });

    describe('emailImportWelcome', () => {
        it('creates the welcome template and returns true', async () => {
            awsSESService.createTemplate.mockResolvedValue({
                $metadata: {},
            });

            const result = await domain.emailImportWelcome();

            expect(result).toBe(true);
            expect(awsSESService.createTemplate).toHaveBeenCalledWith({
                name: EnumNotificationProcess.welcome,
                subject: 'Welcome',
                htmlBody: expect.any(String),
            });
        });

        it('returns false when the create call rejects', async () => {
            awsSESService.createTemplate.mockRejectedValue(new Error('down'));

            const result = await domain.emailImportWelcome();

            expect(result).toBe(false);
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

        it('returns null when the get call rejects', async () => {
            awsSESService.getTemplate.mockRejectedValue(new Error('missing'));

            const result = await domain.emailGetWelcome();

            expect(result).toBeNull();
        });
    });

    describe('emailDeleteWelcome', () => {
        it('deletes the welcome template and returns true', async () => {
            awsSESService.deleteTemplate.mockResolvedValue({ $metadata: {} });

            const result = await domain.emailDeleteWelcome();

            expect(result).toBe(true);
            expect(awsSESService.deleteTemplate).toHaveBeenCalledWith({
                name: EnumNotificationProcess.welcome,
            });
        });

        it('returns false when the delete call rejects', async () => {
            awsSESService.deleteTemplate.mockRejectedValue(new Error('down'));

            const result = await domain.emailDeleteWelcome();

            expect(result).toBe(false);
        });
    });

    describe('emailImportWelcomeSocial', () => {
        it('creates the welcome social template and returns true', async () => {
            awsSESService.createTemplate.mockResolvedValue({
                $metadata: {},
            });

            const result = await domain.emailImportWelcomeSocial();

            expect(result).toBe(true);
            expect(awsSESService.createTemplate).toHaveBeenCalledWith({
                name: EnumNotificationProcess.welcomeSocial,
                subject: 'Welcome Social',
                htmlBody: expect.any(String),
            });
        });

        it('returns false when the create call rejects', async () => {
            awsSESService.createTemplate.mockRejectedValue(new Error('down'));

            const result = await domain.emailImportWelcomeSocial();

            expect(result).toBe(false);
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

        it('returns null when the get call rejects', async () => {
            awsSESService.getTemplate.mockRejectedValue(new Error('missing'));

            const result = await domain.emailGetWelcomeSocial();

            expect(result).toBeNull();
        });
    });

    describe('emailDeleteWelcomeSocial', () => {
        it('deletes the welcome social template and returns true', async () => {
            awsSESService.deleteTemplate.mockResolvedValue({ $metadata: {} });

            const result = await domain.emailDeleteWelcomeSocial();

            expect(result).toBe(true);
            expect(awsSESService.deleteTemplate).toHaveBeenCalledWith({
                name: EnumNotificationProcess.welcomeSocial,
            });
        });

        it('returns false when the delete call rejects', async () => {
            awsSESService.deleteTemplate.mockRejectedValue(new Error('down'));

            const result = await domain.emailDeleteWelcomeSocial();

            expect(result).toBe(false);
        });
    });

    describe('emailImportWelcomeByAdmin', () => {
        it('creates the welcome by admin template and returns true', async () => {
            awsSESService.createTemplate.mockResolvedValue({
                $metadata: {},
            });

            const result = await domain.emailImportWelcomeByAdmin();

            expect(result).toBe(true);
            expect(awsSESService.createTemplate).toHaveBeenCalledWith({
                name: EnumNotificationProcess.welcomeByAdmin,
                subject: 'Welcome By Admin',
                htmlBody: expect.any(String),
            });
        });

        it('returns false when the create call rejects', async () => {
            awsSESService.createTemplate.mockRejectedValue(new Error('down'));

            const result = await domain.emailImportWelcomeByAdmin();

            expect(result).toBe(false);
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

        it('returns null when the get call rejects', async () => {
            awsSESService.getTemplate.mockRejectedValue(new Error('missing'));

            const result = await domain.emailGetWelcomeByAdmin();

            expect(result).toBeNull();
        });
    });

    describe('emailDeleteWelcomeByAdmin', () => {
        it('deletes the welcome by admin template and returns true', async () => {
            awsSESService.deleteTemplate.mockResolvedValue({ $metadata: {} });

            const result = await domain.emailDeleteWelcomeByAdmin();

            expect(result).toBe(true);
            expect(awsSESService.deleteTemplate).toHaveBeenCalledWith({
                name: EnumNotificationProcess.welcomeByAdmin,
            });
        });

        it('returns false when the delete call rejects', async () => {
            awsSESService.deleteTemplate.mockRejectedValue(new Error('down'));

            const result = await domain.emailDeleteWelcomeByAdmin();

            expect(result).toBe(false);
        });
    });

    describe('emailImportVerificationEmail', () => {
        it('creates the verification email template and returns true', async () => {
            awsSESService.createTemplate.mockResolvedValue({
                $metadata: {},
            });

            const result = await domain.emailImportVerificationEmail();

            expect(result).toBe(true);
            expect(awsSESService.createTemplate).toHaveBeenCalledWith({
                name: EnumNotificationProcess.verificationEmail,
                subject: 'Email Verification',
                htmlBody: expect.any(String),
            });
        });

        it('returns false when the create call rejects', async () => {
            awsSESService.createTemplate.mockRejectedValue(new Error('down'));

            const result = await domain.emailImportVerificationEmail();

            expect(result).toBe(false);
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

        it('returns null when the get call rejects', async () => {
            awsSESService.getTemplate.mockRejectedValue(new Error('missing'));

            const result = await domain.emailGetVerificationEmail();

            expect(result).toBeNull();
        });
    });

    describe('emailDeleteVerificationEmail', () => {
        it('deletes the verification email template and returns true', async () => {
            awsSESService.deleteTemplate.mockResolvedValue({ $metadata: {} });

            const result = await domain.emailDeleteVerificationEmail();

            expect(result).toBe(true);
            expect(awsSESService.deleteTemplate).toHaveBeenCalledWith({
                name: EnumNotificationProcess.verificationEmail,
            });
        });

        it('returns false when the delete call rejects', async () => {
            awsSESService.deleteTemplate.mockRejectedValue(new Error('down'));

            const result = await domain.emailDeleteVerificationEmail();

            expect(result).toBe(false);
        });
    });

    describe('emailImportVerifiedEmail', () => {
        it('creates the verified email template and returns true', async () => {
            awsSESService.createTemplate.mockResolvedValue({
                $metadata: {},
            });

            const result = await domain.emailImportVerifiedEmail();

            expect(result).toBe(true);
            expect(awsSESService.createTemplate).toHaveBeenCalledWith({
                name: EnumNotificationProcess.verifiedEmail,
                subject: 'Email Verified',
                htmlBody: expect.any(String),
            });
        });

        it('returns false when the create call rejects', async () => {
            awsSESService.createTemplate.mockRejectedValue(new Error('down'));

            const result = await domain.emailImportVerifiedEmail();

            expect(result).toBe(false);
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

        it('returns null when the get call rejects', async () => {
            awsSESService.getTemplate.mockRejectedValue(new Error('missing'));

            const result = await domain.emailGetVerifiedEmail();

            expect(result).toBeNull();
        });
    });

    describe('emailDeleteVerifiedEmail', () => {
        it('deletes the verified email template and returns true', async () => {
            awsSESService.deleteTemplate.mockResolvedValue({ $metadata: {} });

            const result = await domain.emailDeleteVerifiedEmail();

            expect(result).toBe(true);
            expect(awsSESService.deleteTemplate).toHaveBeenCalledWith({
                name: EnumNotificationProcess.verifiedEmail,
            });
        });

        it('returns false when the delete call rejects', async () => {
            awsSESService.deleteTemplate.mockRejectedValue(new Error('down'));

            const result = await domain.emailDeleteVerifiedEmail();

            expect(result).toBe(false);
        });
    });

    describe('emailImportVerifiedMobileNumber', () => {
        it('creates the verified mobile number template and returns true', async () => {
            awsSESService.createTemplate.mockResolvedValue({
                $metadata: {},
            });

            const result = await domain.emailImportVerifiedMobileNumber();

            expect(result).toBe(true);
            expect(awsSESService.createTemplate).toHaveBeenCalledWith({
                name: EnumNotificationProcess.verifiedMobileNumber,
                subject: 'MobileNumber Verified',
                htmlBody: expect.any(String),
            });
        });

        it('returns false when the create call rejects', async () => {
            awsSESService.createTemplate.mockRejectedValue(new Error('down'));

            const result = await domain.emailImportVerifiedMobileNumber();

            expect(result).toBe(false);
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

        it('returns null when the get call rejects', async () => {
            awsSESService.getTemplate.mockRejectedValue(new Error('missing'));

            const result = await domain.emailGetVerifiedMobileNumber();

            expect(result).toBeNull();
        });
    });

    describe('emailDeleteVerifiedMobileNumber', () => {
        it('deletes the verified mobile number template and returns true', async () => {
            awsSESService.deleteTemplate.mockResolvedValue({ $metadata: {} });

            const result = await domain.emailDeleteVerifiedMobileNumber();

            expect(result).toBe(true);
            expect(awsSESService.deleteTemplate).toHaveBeenCalledWith({
                name: EnumNotificationProcess.verifiedMobileNumber,
            });
        });

        it('returns false when the delete call rejects', async () => {
            awsSESService.deleteTemplate.mockRejectedValue(new Error('down'));

            const result = await domain.emailDeleteVerifiedMobileNumber();

            expect(result).toBe(false);
        });
    });
});
