import { Test } from '@nestjs/testing';
import { mock } from 'vitest-mock-extended';
import type { MockProxy } from 'vitest-mock-extended';
import { TemplateDoesNotExistException } from '@aws-sdk/client-ses';
import type { GetTemplateCommandOutput } from '@aws-sdk/client-ses';
import { AppUnknownException } from '@app/exceptions/app.unknown.exception';
import { AwsSESService } from '@common/aws/services/aws.ses.service';
import { EnumNotificationProcess } from '@modules/notification/enums/notification.enum';
import { NotificationTemplateSecurityDomain } from '@modules/notification/domains/notification.template.security.domain';
import { MessageService } from '@common/message/services/message.service';

describe('NotificationTemplateSecurityDomain', () => {
    const messageService: MockProxy<MessageService> = mock<MessageService>();
    const awsSESService: MockProxy<AwsSESService> = mock<AwsSESService>();
    let domain: NotificationTemplateSecurityDomain;

    beforeEach(async () => {
        vi.resetAllMocks();
        messageService.setMessage.mockImplementation((path: string) => path);
        const module = await Test.createTestingModule({
            providers: [
                { provide: MessageService, useValue: messageService },
                NotificationTemplateSecurityDomain,
                { provide: AwsSESService, useValue: awsSESService },
            ],
        }).compile();
        domain = module.get(NotificationTemplateSecurityDomain);
    });

    describe('emailImportChangePassword', () => {
        it('creates the change password template', async () => {
            awsSESService.createTemplate.mockResolvedValue({
                $metadata: {},
            });

            await expect(
                domain.emailImportChangePassword()
            ).resolves.toBeUndefined();
            expect(awsSESService.createTemplate).toHaveBeenCalledWith({
                name: EnumNotificationProcess.changePassword,
                subject: 'Change Password',
                htmlBody: expect.any(String),
            });
        });

        it('throws an AppUnknownException chaining the rejection when the create call rejects', async () => {
            const error = new Error('down');
            awsSESService.createTemplate.mockRejectedValue(error);

            await expect(
                domain.emailImportChangePassword()
            ).rejects.toMatchObject({
                constructor: AppUnknownException,
                rawError: error,
            });
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

        it('returns null for the template-not-found answer', async () => {
            awsSESService.getTemplate.mockRejectedValue(
                new TemplateDoesNotExistException({
                    message: 'missing',
                    $metadata: {},
                })
            );

            await expect(domain.emailGetChangePassword()).resolves.toBeNull();
        });

        it('throws an AppUnknownException chaining the rejection for any other error', async () => {
            const error = new Error('ses down');
            awsSESService.getTemplate.mockRejectedValue(error);

            await expect(domain.emailGetChangePassword()).rejects.toMatchObject(
                {
                    constructor: AppUnknownException,
                    rawError: error,
                }
            );
        });
    });

    describe('emailDeleteChangePassword', () => {
        it('deletes the change password template', async () => {
            awsSESService.deleteTemplate.mockResolvedValue({ $metadata: {} });

            await expect(
                domain.emailDeleteChangePassword()
            ).resolves.toBeUndefined();
            expect(awsSESService.deleteTemplate).toHaveBeenCalledWith({
                name: EnumNotificationProcess.changePassword,
            });
        });

        it('throws an AppUnknownException chaining the rejection when the delete call rejects', async () => {
            const error = new Error('down');
            awsSESService.deleteTemplate.mockRejectedValue(error);

            await expect(
                domain.emailDeleteChangePassword()
            ).rejects.toMatchObject({
                constructor: AppUnknownException,
                rawError: error,
            });
        });
    });

    describe('emailImportTemporaryPasswordByAdmin', () => {
        it('creates the temporary password by admin template', async () => {
            awsSESService.createTemplate.mockResolvedValue({
                $metadata: {},
            });

            await expect(
                domain.emailImportTemporaryPasswordByAdmin()
            ).resolves.toBeUndefined();
            expect(awsSESService.createTemplate).toHaveBeenCalledWith({
                name: EnumNotificationProcess.temporaryPasswordByAdmin,
                subject: 'Temporary Password By Admin',
                htmlBody: expect.any(String),
            });
        });

        it('throws an AppUnknownException chaining the rejection when the create call rejects', async () => {
            const error = new Error('down');
            awsSESService.createTemplate.mockRejectedValue(error);

            await expect(
                domain.emailImportTemporaryPasswordByAdmin()
            ).rejects.toMatchObject({
                constructor: AppUnknownException,
                rawError: error,
            });
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

        it('returns null for the template-not-found answer', async () => {
            awsSESService.getTemplate.mockRejectedValue(
                new TemplateDoesNotExistException({
                    message: 'missing',
                    $metadata: {},
                })
            );

            await expect(
                domain.emailGetTemporaryPasswordByAdmin()
            ).resolves.toBeNull();
        });

        it('throws an AppUnknownException chaining the rejection for any other error', async () => {
            const error = new Error('ses down');
            awsSESService.getTemplate.mockRejectedValue(error);

            await expect(
                domain.emailGetTemporaryPasswordByAdmin()
            ).rejects.toMatchObject({
                constructor: AppUnknownException,
                rawError: error,
            });
        });
    });

    describe('emailDeleteTemporaryPasswordByAdmin', () => {
        it('deletes the temporary password by admin template', async () => {
            awsSESService.deleteTemplate.mockResolvedValue({ $metadata: {} });

            await expect(
                domain.emailDeleteTemporaryPasswordByAdmin()
            ).resolves.toBeUndefined();
            expect(awsSESService.deleteTemplate).toHaveBeenCalledWith({
                name: EnumNotificationProcess.temporaryPasswordByAdmin,
            });
        });

        it('throws an AppUnknownException chaining the rejection when the delete call rejects', async () => {
            const error = new Error('down');
            awsSESService.deleteTemplate.mockRejectedValue(error);

            await expect(
                domain.emailDeleteTemporaryPasswordByAdmin()
            ).rejects.toMatchObject({
                constructor: AppUnknownException,
                rawError: error,
            });
        });
    });

    describe('emailImportResetPassword', () => {
        it('creates the reset password template', async () => {
            awsSESService.createTemplate.mockResolvedValue({
                $metadata: {},
            });

            await expect(
                domain.emailImportResetPassword()
            ).resolves.toBeUndefined();
            expect(awsSESService.createTemplate).toHaveBeenCalledWith({
                name: EnumNotificationProcess.resetPassword,
                subject: 'Reset Password',
                htmlBody: expect.any(String),
            });
        });

        it('throws an AppUnknownException chaining the rejection when the create call rejects', async () => {
            const error = new Error('down');
            awsSESService.createTemplate.mockRejectedValue(error);

            await expect(
                domain.emailImportResetPassword()
            ).rejects.toMatchObject({
                constructor: AppUnknownException,
                rawError: error,
            });
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

        it('returns null for the template-not-found answer', async () => {
            awsSESService.getTemplate.mockRejectedValue(
                new TemplateDoesNotExistException({
                    message: 'missing',
                    $metadata: {},
                })
            );

            await expect(domain.emailGetResetPassword()).resolves.toBeNull();
        });

        it('throws an AppUnknownException chaining the rejection for any other error', async () => {
            const error = new Error('ses down');
            awsSESService.getTemplate.mockRejectedValue(error);

            await expect(domain.emailGetResetPassword()).rejects.toMatchObject({
                constructor: AppUnknownException,
                rawError: error,
            });
        });
    });

    describe('emailDeleteResetPassword', () => {
        it('deletes the reset password template', async () => {
            awsSESService.deleteTemplate.mockResolvedValue({ $metadata: {} });

            await expect(
                domain.emailDeleteResetPassword()
            ).resolves.toBeUndefined();
            expect(awsSESService.deleteTemplate).toHaveBeenCalledWith({
                name: EnumNotificationProcess.resetPassword,
            });
        });

        it('throws an AppUnknownException chaining the rejection when the delete call rejects', async () => {
            const error = new Error('down');
            awsSESService.deleteTemplate.mockRejectedValue(error);

            await expect(
                domain.emailDeleteResetPassword()
            ).rejects.toMatchObject({
                constructor: AppUnknownException,
                rawError: error,
            });
        });
    });

    describe('emailImportForgotPassword', () => {
        it('creates the forgot password template', async () => {
            awsSESService.createTemplate.mockResolvedValue({
                $metadata: {},
            });

            await expect(
                domain.emailImportForgotPassword()
            ).resolves.toBeUndefined();
            expect(awsSESService.createTemplate).toHaveBeenCalledWith({
                name: EnumNotificationProcess.forgotPassword,
                subject: 'Forgot Password',
                htmlBody: expect.any(String),
            });
        });

        it('throws an AppUnknownException chaining the rejection when the create call rejects', async () => {
            const error = new Error('down');
            awsSESService.createTemplate.mockRejectedValue(error);

            await expect(
                domain.emailImportForgotPassword()
            ).rejects.toMatchObject({
                constructor: AppUnknownException,
                rawError: error,
            });
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

        it('returns null for the template-not-found answer', async () => {
            awsSESService.getTemplate.mockRejectedValue(
                new TemplateDoesNotExistException({
                    message: 'missing',
                    $metadata: {},
                })
            );

            await expect(domain.emailGetForgotPassword()).resolves.toBeNull();
        });

        it('throws an AppUnknownException chaining the rejection for any other error', async () => {
            const error = new Error('ses down');
            awsSESService.getTemplate.mockRejectedValue(error);

            await expect(domain.emailGetForgotPassword()).rejects.toMatchObject(
                {
                    constructor: AppUnknownException,
                    rawError: error,
                }
            );
        });
    });

    describe('emailDeleteForgotPassword', () => {
        it('deletes the forgot password template', async () => {
            awsSESService.deleteTemplate.mockResolvedValue({ $metadata: {} });

            await expect(
                domain.emailDeleteForgotPassword()
            ).resolves.toBeUndefined();
            expect(awsSESService.deleteTemplate).toHaveBeenCalledWith({
                name: EnumNotificationProcess.forgotPassword,
            });
        });

        it('throws an AppUnknownException chaining the rejection when the delete call rejects', async () => {
            const error = new Error('down');
            awsSESService.deleteTemplate.mockRejectedValue(error);

            await expect(
                domain.emailDeleteForgotPassword()
            ).rejects.toMatchObject({
                constructor: AppUnknownException,
                rawError: error,
            });
        });
    });

    describe('emailImportResetTwoFactorByAdmin', () => {
        it('creates the reset two factor by admin template', async () => {
            awsSESService.createTemplate.mockResolvedValue({
                $metadata: {},
            });

            await expect(
                domain.emailImportResetTwoFactorByAdmin()
            ).resolves.toBeUndefined();
            expect(awsSESService.createTemplate).toHaveBeenCalledWith({
                name: EnumNotificationProcess.resetTwoFactorByAdmin,
                subject: 'Reset Two Factor By Admin',
                htmlBody: expect.any(String),
            });
        });

        it('throws an AppUnknownException chaining the rejection when the create call rejects', async () => {
            const error = new Error('down');
            awsSESService.createTemplate.mockRejectedValue(error);

            await expect(
                domain.emailImportResetTwoFactorByAdmin()
            ).rejects.toMatchObject({
                constructor: AppUnknownException,
                rawError: error,
            });
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

        it('returns null for the template-not-found answer', async () => {
            awsSESService.getTemplate.mockRejectedValue(
                new TemplateDoesNotExistException({
                    message: 'missing',
                    $metadata: {},
                })
            );

            await expect(
                domain.emailGetResetTwoFactorByAdmin()
            ).resolves.toBeNull();
        });

        it('throws an AppUnknownException chaining the rejection for any other error', async () => {
            const error = new Error('ses down');
            awsSESService.getTemplate.mockRejectedValue(error);

            await expect(
                domain.emailGetResetTwoFactorByAdmin()
            ).rejects.toMatchObject({
                constructor: AppUnknownException,
                rawError: error,
            });
        });
    });

    describe('emailDeleteResetTwoFactorByAdmin', () => {
        it('deletes the reset two factor by admin template', async () => {
            awsSESService.deleteTemplate.mockResolvedValue({ $metadata: {} });

            await expect(
                domain.emailDeleteResetTwoFactorByAdmin()
            ).resolves.toBeUndefined();
            expect(awsSESService.deleteTemplate).toHaveBeenCalledWith({
                name: EnumNotificationProcess.resetTwoFactorByAdmin,
            });
        });

        it('throws an AppUnknownException chaining the rejection when the delete call rejects', async () => {
            const error = new Error('down');
            awsSESService.deleteTemplate.mockRejectedValue(error);

            await expect(
                domain.emailDeleteResetTwoFactorByAdmin()
            ).rejects.toMatchObject({
                constructor: AppUnknownException,
                rawError: error,
            });
        });
    });

    describe('emailImportNewDeviceLogin', () => {
        it('creates the new device login template', async () => {
            awsSESService.createTemplate.mockResolvedValue({
                $metadata: {},
            });

            await expect(
                domain.emailImportNewDeviceLogin()
            ).resolves.toBeUndefined();
            expect(awsSESService.createTemplate).toHaveBeenCalledWith({
                name: EnumNotificationProcess.newDeviceLogin,
                subject: 'Device Login',
                htmlBody: expect.any(String),
            });
        });

        it('throws an AppUnknownException chaining the rejection when the create call rejects', async () => {
            const error = new Error('down');
            awsSESService.createTemplate.mockRejectedValue(error);

            await expect(
                domain.emailImportNewDeviceLogin()
            ).rejects.toMatchObject({
                constructor: AppUnknownException,
                rawError: error,
            });
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

        it('returns null for the template-not-found answer', async () => {
            awsSESService.getTemplate.mockRejectedValue(
                new TemplateDoesNotExistException({
                    message: 'missing',
                    $metadata: {},
                })
            );

            await expect(domain.emailGetNewDeviceLogin()).resolves.toBeNull();
        });

        it('throws an AppUnknownException chaining the rejection for any other error', async () => {
            const error = new Error('ses down');
            awsSESService.getTemplate.mockRejectedValue(error);

            await expect(domain.emailGetNewDeviceLogin()).rejects.toMatchObject(
                {
                    constructor: AppUnknownException,
                    rawError: error,
                }
            );
        });
    });

    describe('emailDeleteNewDeviceLogin', () => {
        it('deletes the new device login template', async () => {
            awsSESService.deleteTemplate.mockResolvedValue({ $metadata: {} });

            await expect(
                domain.emailDeleteNewDeviceLogin()
            ).resolves.toBeUndefined();
            expect(awsSESService.deleteTemplate).toHaveBeenCalledWith({
                name: EnumNotificationProcess.newDeviceLogin,
            });
        });

        it('throws an AppUnknownException chaining the rejection when the delete call rejects', async () => {
            const error = new Error('down');
            awsSESService.deleteTemplate.mockRejectedValue(error);

            await expect(
                domain.emailDeleteNewDeviceLogin()
            ).rejects.toMatchObject({
                constructor: AppUnknownException,
                rawError: error,
            });
        });
    });
});
