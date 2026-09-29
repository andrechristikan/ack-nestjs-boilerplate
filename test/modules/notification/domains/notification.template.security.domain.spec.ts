import { Test } from '@nestjs/testing';
import { mock } from 'vitest-mock-extended';
import type { GetTemplateCommandOutput } from '@aws-sdk/client-ses';
import { AwsSESService } from '@common/aws/services/aws.ses.service';
import { EnumNotificationProcess } from '@modules/notification/enums/notification.enum';
import { NotificationTemplateSecurityDomain } from '@modules/notification/domains/notification.template.security.domain';

describe('NotificationTemplateSecurityDomain', () => {
    const awsSESService = mock<AwsSESService>();
    let domain: NotificationTemplateSecurityDomain;

    beforeEach(async () => {
        vi.resetAllMocks();
        const module = await Test.createTestingModule({
            providers: [
                NotificationTemplateSecurityDomain,
                { provide: AwsSESService, useValue: awsSESService },
            ],
        }).compile();
        domain = module.get(NotificationTemplateSecurityDomain);
    });

    describe('emailImportChangePassword', () => {
        it('creates the change password template and returns true', async () => {
            awsSESService.createTemplate.mockResolvedValue({
                $metadata: {},
            });

            const result = await domain.emailImportChangePassword();

            expect(result).toBe(true);
            expect(awsSESService.createTemplate).toHaveBeenCalledWith({
                name: EnumNotificationProcess.changePassword,
                subject: 'Change Password',
                htmlBody: expect.any(String),
            });
        });

        it('returns false when the create call rejects', async () => {
            awsSESService.createTemplate.mockRejectedValue(new Error('down'));

            const result = await domain.emailImportChangePassword();

            expect(result).toBe(false);
        });
    });

    describe('emailGetChangePassword', () => {
        it('returns the change password template from SES', async () => {
            const template: GetTemplateCommandOutput = {
                $metadata: {},
                Template: { TemplateName: 'changePassword' },
            };
            awsSESService.getTemplate.mockResolvedValue(template);

            const result = await domain.emailGetChangePassword();

            expect(result).toBe(template);
            expect(awsSESService.getTemplate).toHaveBeenCalledWith({
                name: EnumNotificationProcess.changePassword,
            });
        });

        it('returns null when the get call rejects', async () => {
            awsSESService.getTemplate.mockRejectedValue(new Error('missing'));

            const result = await domain.emailGetChangePassword();

            expect(result).toBeNull();
        });
    });

    describe('emailDeleteChangePassword', () => {
        it('deletes the change password template and returns true', async () => {
            awsSESService.deleteTemplate.mockResolvedValue({ $metadata: {} });

            const result = await domain.emailDeleteChangePassword();

            expect(result).toBe(true);
            expect(awsSESService.deleteTemplate).toHaveBeenCalledWith({
                name: EnumNotificationProcess.changePassword,
            });
        });

        it('returns false when the delete call rejects', async () => {
            awsSESService.deleteTemplate.mockRejectedValue(new Error('down'));

            const result = await domain.emailDeleteChangePassword();

            expect(result).toBe(false);
        });
    });

    describe('emailImportTemporaryPasswordByAdmin', () => {
        it('creates the temporary password by admin template and returns true', async () => {
            awsSESService.createTemplate.mockResolvedValue({
                $metadata: {},
            });

            const result = await domain.emailImportTemporaryPasswordByAdmin();

            expect(result).toBe(true);
            expect(awsSESService.createTemplate).toHaveBeenCalledWith({
                name: EnumNotificationProcess.temporaryPasswordByAdmin,
                subject: 'Temporary Password By Admin',
                htmlBody: expect.any(String),
            });
        });

        it('returns false when the create call rejects', async () => {
            awsSESService.createTemplate.mockRejectedValue(new Error('down'));

            const result = await domain.emailImportTemporaryPasswordByAdmin();

            expect(result).toBe(false);
        });
    });

    describe('emailGetTemporaryPasswordByAdmin', () => {
        it('returns the temporary password by admin template from SES', async () => {
            const template: GetTemplateCommandOutput = {
                $metadata: {},
                Template: { TemplateName: 'temporaryPasswordByAdmin' },
            };
            awsSESService.getTemplate.mockResolvedValue(template);

            const result = await domain.emailGetTemporaryPasswordByAdmin();

            expect(result).toBe(template);
            expect(awsSESService.getTemplate).toHaveBeenCalledWith({
                name: EnumNotificationProcess.temporaryPasswordByAdmin,
            });
        });

        it('returns null when the get call rejects', async () => {
            awsSESService.getTemplate.mockRejectedValue(new Error('missing'));

            const result = await domain.emailGetTemporaryPasswordByAdmin();

            expect(result).toBeNull();
        });
    });

    describe('emailDeleteTemporaryPasswordByAdmin', () => {
        it('deletes the temporary password by admin template and returns true', async () => {
            awsSESService.deleteTemplate.mockResolvedValue({ $metadata: {} });

            const result = await domain.emailDeleteTemporaryPasswordByAdmin();

            expect(result).toBe(true);
            expect(awsSESService.deleteTemplate).toHaveBeenCalledWith({
                name: EnumNotificationProcess.temporaryPasswordByAdmin,
            });
        });

        it('returns false when the delete call rejects', async () => {
            awsSESService.deleteTemplate.mockRejectedValue(new Error('down'));

            const result = await domain.emailDeleteTemporaryPasswordByAdmin();

            expect(result).toBe(false);
        });
    });

    describe('emailImportResetPassword', () => {
        it('creates the reset password template and returns true', async () => {
            awsSESService.createTemplate.mockResolvedValue({
                $metadata: {},
            });

            const result = await domain.emailImportResetPassword();

            expect(result).toBe(true);
            expect(awsSESService.createTemplate).toHaveBeenCalledWith({
                name: EnumNotificationProcess.resetPassword,
                subject: 'Reset Password',
                htmlBody: expect.any(String),
            });
        });

        it('returns false when the create call rejects', async () => {
            awsSESService.createTemplate.mockRejectedValue(new Error('down'));

            const result = await domain.emailImportResetPassword();

            expect(result).toBe(false);
        });
    });

    describe('emailGetResetPassword', () => {
        it('returns the reset password template from SES', async () => {
            const template: GetTemplateCommandOutput = {
                $metadata: {},
                Template: { TemplateName: 'resetPassword' },
            };
            awsSESService.getTemplate.mockResolvedValue(template);

            const result = await domain.emailGetResetPassword();

            expect(result).toBe(template);
            expect(awsSESService.getTemplate).toHaveBeenCalledWith({
                name: EnumNotificationProcess.resetPassword,
            });
        });

        it('returns null when the get call rejects', async () => {
            awsSESService.getTemplate.mockRejectedValue(new Error('missing'));

            const result = await domain.emailGetResetPassword();

            expect(result).toBeNull();
        });
    });

    describe('emailDeleteResetPassword', () => {
        it('deletes the reset password template and returns true', async () => {
            awsSESService.deleteTemplate.mockResolvedValue({ $metadata: {} });

            const result = await domain.emailDeleteResetPassword();

            expect(result).toBe(true);
            expect(awsSESService.deleteTemplate).toHaveBeenCalledWith({
                name: EnumNotificationProcess.resetPassword,
            });
        });

        it('returns false when the delete call rejects', async () => {
            awsSESService.deleteTemplate.mockRejectedValue(new Error('down'));

            const result = await domain.emailDeleteResetPassword();

            expect(result).toBe(false);
        });
    });

    describe('emailImportForgotPassword', () => {
        it('creates the forgot password template and returns true', async () => {
            awsSESService.createTemplate.mockResolvedValue({
                $metadata: {},
            });

            const result = await domain.emailImportForgotPassword();

            expect(result).toBe(true);
            expect(awsSESService.createTemplate).toHaveBeenCalledWith({
                name: EnumNotificationProcess.forgotPassword,
                subject: 'Forgot Password',
                htmlBody: expect.any(String),
            });
        });

        it('returns false when the create call rejects', async () => {
            awsSESService.createTemplate.mockRejectedValue(new Error('down'));

            const result = await domain.emailImportForgotPassword();

            expect(result).toBe(false);
        });
    });

    describe('emailGetForgotPassword', () => {
        it('returns the forgot password template from SES', async () => {
            const template: GetTemplateCommandOutput = {
                $metadata: {},
                Template: { TemplateName: 'forgotPassword' },
            };
            awsSESService.getTemplate.mockResolvedValue(template);

            const result = await domain.emailGetForgotPassword();

            expect(result).toBe(template);
            expect(awsSESService.getTemplate).toHaveBeenCalledWith({
                name: EnumNotificationProcess.forgotPassword,
            });
        });

        it('returns null when the get call rejects', async () => {
            awsSESService.getTemplate.mockRejectedValue(new Error('missing'));

            const result = await domain.emailGetForgotPassword();

            expect(result).toBeNull();
        });
    });

    describe('emailDeleteForgotPassword', () => {
        it('deletes the forgot password template and returns true', async () => {
            awsSESService.deleteTemplate.mockResolvedValue({ $metadata: {} });

            const result = await domain.emailDeleteForgotPassword();

            expect(result).toBe(true);
            expect(awsSESService.deleteTemplate).toHaveBeenCalledWith({
                name: EnumNotificationProcess.forgotPassword,
            });
        });

        it('returns false when the delete call rejects', async () => {
            awsSESService.deleteTemplate.mockRejectedValue(new Error('down'));

            const result = await domain.emailDeleteForgotPassword();

            expect(result).toBe(false);
        });
    });

    describe('emailImportResetTwoFactorByAdmin', () => {
        it('creates the reset two factor by admin template and returns true', async () => {
            awsSESService.createTemplate.mockResolvedValue({
                $metadata: {},
            });

            const result = await domain.emailImportResetTwoFactorByAdmin();

            expect(result).toBe(true);
            expect(awsSESService.createTemplate).toHaveBeenCalledWith({
                name: EnumNotificationProcess.resetTwoFactorByAdmin,
                subject: 'Reset Two Factor By Admin',
                htmlBody: expect.any(String),
            });
        });

        it('returns false when the create call rejects', async () => {
            awsSESService.createTemplate.mockRejectedValue(new Error('down'));

            const result = await domain.emailImportResetTwoFactorByAdmin();

            expect(result).toBe(false);
        });
    });

    describe('emailGetResetTwoFactorByAdmin', () => {
        it('returns the reset two factor by admin template from SES', async () => {
            const template: GetTemplateCommandOutput = {
                $metadata: {},
                Template: { TemplateName: 'resetTwoFactorByAdmin' },
            };
            awsSESService.getTemplate.mockResolvedValue(template);

            const result = await domain.emailGetResetTwoFactorByAdmin();

            expect(result).toBe(template);
            expect(awsSESService.getTemplate).toHaveBeenCalledWith({
                name: EnumNotificationProcess.resetTwoFactorByAdmin,
            });
        });

        it('returns null when the get call rejects', async () => {
            awsSESService.getTemplate.mockRejectedValue(new Error('missing'));

            const result = await domain.emailGetResetTwoFactorByAdmin();

            expect(result).toBeNull();
        });
    });

    describe('emailDeleteResetTwoFactorByAdmin', () => {
        it('deletes the reset two factor by admin template and returns true', async () => {
            awsSESService.deleteTemplate.mockResolvedValue({ $metadata: {} });

            const result = await domain.emailDeleteResetTwoFactorByAdmin();

            expect(result).toBe(true);
            expect(awsSESService.deleteTemplate).toHaveBeenCalledWith({
                name: EnumNotificationProcess.resetTwoFactorByAdmin,
            });
        });

        it('returns false when the delete call rejects', async () => {
            awsSESService.deleteTemplate.mockRejectedValue(new Error('down'));

            const result = await domain.emailDeleteResetTwoFactorByAdmin();

            expect(result).toBe(false);
        });
    });

    describe('emailImportNewDeviceLogin', () => {
        it('creates the new device login template and returns true', async () => {
            awsSESService.createTemplate.mockResolvedValue({
                $metadata: {},
            });

            const result = await domain.emailImportNewDeviceLogin();

            expect(result).toBe(true);
            expect(awsSESService.createTemplate).toHaveBeenCalledWith({
                name: EnumNotificationProcess.newDeviceLogin,
                subject: 'Device Login',
                htmlBody: expect.any(String),
            });
        });

        it('returns false when the create call rejects', async () => {
            awsSESService.createTemplate.mockRejectedValue(new Error('down'));

            const result = await domain.emailImportNewDeviceLogin();

            expect(result).toBe(false);
        });
    });

    describe('emailGetNewDeviceLogin', () => {
        it('returns the new device login template from SES', async () => {
            const template: GetTemplateCommandOutput = {
                $metadata: {},
                Template: { TemplateName: 'newDeviceLogin' },
            };
            awsSESService.getTemplate.mockResolvedValue(template);

            const result = await domain.emailGetNewDeviceLogin();

            expect(result).toBe(template);
            expect(awsSESService.getTemplate).toHaveBeenCalledWith({
                name: EnumNotificationProcess.newDeviceLogin,
            });
        });

        it('returns null when the get call rejects', async () => {
            awsSESService.getTemplate.mockRejectedValue(new Error('missing'));

            const result = await domain.emailGetNewDeviceLogin();

            expect(result).toBeNull();
        });
    });

    describe('emailDeleteNewDeviceLogin', () => {
        it('deletes the new device login template and returns true', async () => {
            awsSESService.deleteTemplate.mockResolvedValue({ $metadata: {} });

            const result = await domain.emailDeleteNewDeviceLogin();

            expect(result).toBe(true);
            expect(awsSESService.deleteTemplate).toHaveBeenCalledWith({
                name: EnumNotificationProcess.newDeviceLogin,
            });
        });

        it('returns false when the delete call rejects', async () => {
            awsSESService.deleteTemplate.mockRejectedValue(new Error('down'));

            const result = await domain.emailDeleteNewDeviceLogin();

            expect(result).toBe(false);
        });
    });
});
