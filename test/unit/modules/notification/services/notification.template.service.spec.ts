import { readFileSync } from 'fs';
import { join } from 'path';
import { Test } from '@nestjs/testing';
import { mock } from 'vitest-mock-extended';
import type { MockProxy } from 'vitest-mock-extended';
import { TemplateDoesNotExistException } from '@aws-sdk/client-ses';
import type { GetTemplateCommandOutput } from '@aws-sdk/client-ses';
import { AppUnknownException } from '@app/exceptions/app.unknown.exception';
import { AwsSESService } from '@common/aws/services/aws.ses.service';
import { EnumNotificationKind } from '@modules/notification/enums/notification.enum';
import type { INotificationTemplateName } from '@modules/notification/interfaces/notification.interface';
import { NotificationTemplateService } from '@modules/notification/services/notification.template.service';

describe('NotificationTemplateService', () => {
    const awsSESService: MockProxy<AwsSESService> = mock<AwsSESService>();
    const templateDir = join(
        import.meta.dirname,
        '../../../../../src/modules/notification/templates'
    );
    const templates: {
        name: INotificationTemplateName;
        file: string;
        subject: string;
    }[] = [
        {
            name: EnumNotificationKind.welcome,
            file: 'notification.welcome.template.hbs',
            subject: 'Welcome',
        },
        {
            name: EnumNotificationKind.welcomeSocial,
            file: 'notification.welcome-social.template.hbs',
            subject: 'Welcome Social',
        },
        {
            name: EnumNotificationKind.welcomeByAdmin,
            file: 'notification.welcome-by-admin.template.hbs',
            subject: 'Welcome By Admin',
        },
        {
            name: EnumNotificationKind.verificationEmail,
            file: 'notification.verification-email.template.hbs',
            subject: 'Email Verification',
        },
        {
            name: EnumNotificationKind.verifiedEmail,
            file: 'notification.verified-email.template.hbs',
            subject: 'Email Verified',
        },
        {
            name: EnumNotificationKind.verifiedMobileNumber,
            file: 'notification.verified-mobile-number.template.hbs',
            subject: 'MobileNumber Verified',
        },
        {
            name: EnumNotificationKind.changePassword,
            file: 'notification.change-password.template.hbs',
            subject: 'Change Password',
        },
        {
            name: EnumNotificationKind.temporaryPasswordByAdmin,
            file: 'notification.temporary-password-by-admin.template.hbs',
            subject: 'Temporary Password By Admin',
        },
        {
            name: EnumNotificationKind.resetPassword,
            file: 'notification.reset-password.template.hbs',
            subject: 'Reset Password',
        },
        {
            name: EnumNotificationKind.forgotPassword,
            file: 'notification.forgot-password.template.hbs',
            subject: 'Forgot Password',
        },
        {
            name: EnumNotificationKind.resetMfaByAdmin,
            file: 'notification.reset-mfa-by-admin.template.hbs',
            subject: 'Reset Two Factor By Admin',
        },
        {
            name: EnumNotificationKind.reauthenticationOtp,
            file: 'notification.reauthentication-otp.template.hbs',
            subject: 'Confirmation Code',
        },
        {
            name: EnumNotificationKind.loginLocked,
            file: 'notification.login-locked.template.hbs',
            subject: 'Login Locked',
        },
        {
            name: EnumNotificationKind.newDeviceLogin,
            file: 'notification.new-device-login.template.hbs',
            subject: 'Device Login',
        },
        {
            name: EnumNotificationKind.publishTermPolicy,
            file: 'notification.publish-term-policy.template.hbs',
            subject: 'Publish Term Policy',
        },
        {
            name: EnumNotificationKind.userImportResult,
            file: 'notification.user-import-result.template.hbs',
            subject: 'User Import Result',
        },
        {
            name: EnumNotificationKind.userExportResult,
            file: 'notification.user-export-result.template.hbs',
            subject: 'User Export Result',
        },
        {
            name: EnumNotificationKind.workspaceInvite,
            file: 'notification.workspace-invite.template.hbs',
            subject: 'Workspace Invitation',
        },
        {
            name: EnumNotificationKind.workspaceJoinRequest,
            file: 'notification.workspace-join-request.template.hbs',
            subject: 'New Workspace Join Request',
        },
        {
            name: EnumNotificationKind.workspaceJoinAccepted,
            file: 'notification.workspace-join-accepted.template.hbs',
            subject: 'Workspace Join Request Accepted',
        },
        {
            name: EnumNotificationKind.workspaceJoinRejected,
            file: 'notification.workspace-join-rejected.template.hbs',
            subject: 'Workspace Join Request Rejected',
        },
    ];
    const labels: [INotificationTemplateName, string][] = [
        [EnumNotificationKind.welcome, 'welcome'],
        [EnumNotificationKind.welcomeSocial, 'welcome social'],
        [EnumNotificationKind.welcomeByAdmin, 'welcome by admin'],
        [EnumNotificationKind.verificationEmail, 'verification email'],
        [EnumNotificationKind.verifiedEmail, 'verified email'],
        [EnumNotificationKind.verifiedMobileNumber, 'verified mobile number'],
        [EnumNotificationKind.changePassword, 'change password'],
        [
            EnumNotificationKind.temporaryPasswordByAdmin,
            'temporary password by admin',
        ],
        [EnumNotificationKind.resetPassword, 'reset password'],
        [EnumNotificationKind.forgotPassword, 'forgot password'],
        [EnumNotificationKind.resetMfaByAdmin, 'reset mfa by admin'],
        [EnumNotificationKind.newDeviceLogin, 'new device login'],
        [EnumNotificationKind.publishTermPolicy, 'publish term policy'],
        [EnumNotificationKind.workspaceInvite, 'workspace invite'],
        [EnumNotificationKind.workspaceJoinRequest, 'workspace join request'],
        [EnumNotificationKind.workspaceJoinAccepted, 'workspace join accepted'],
        [EnumNotificationKind.workspaceJoinRejected, 'workspace join rejected'],
    ];
    let service: NotificationTemplateService;

    beforeEach(async () => {
        const module = await Test.createTestingModule({
            providers: [
                NotificationTemplateService,
                { provide: AwsSESService, useValue: awsSESService },
            ],
        }).compile();
        service = module.get(NotificationTemplateService);
    });

    describe('emailImport', () => {
        it.each(templates)(
            'creates the $name template from $file',
            async ({ name, file, subject }) => {
                awsSESService.createTemplate.mockResolvedValue({
                    $metadata: {},
                });

                await expect(
                    service.emailImport(name)
                ).resolves.toBeUndefined();
                expect(awsSESService.createTemplate).toHaveBeenCalledWith({
                    name,
                    subject,
                    htmlBody: readFileSync(join(templateDir, file), 'utf8'),
                });
            }
        );

        it('throws an AppUnknownException naming the import when the create call rejects', async () => {
            const error = new Error('ses down');
            awsSESService.createTemplate.mockRejectedValue(error);

            await expect(
                service.emailImport(EnumNotificationKind.workspaceInvite)
            ).rejects.toMatchObject({
                constructor: AppUnknownException,
                rawError: error,
                description: 'Failed to import workspace invite template',
            });
        });
    });

    describe('getEmail', () => {
        it('returns the template from SES', async () => {
            const template: GetTemplateCommandOutput = {
                $metadata: {},
                Template: { TemplateName: EnumNotificationKind.welcome },
            };
            awsSESService.getTemplate.mockResolvedValue(template);

            const result = await service.getEmail(EnumNotificationKind.welcome);

            expect(result).toBe(template);
            expect(awsSESService.getTemplate).toHaveBeenCalledWith({
                name: EnumNotificationKind.welcome,
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
                service.getEmail(EnumNotificationKind.welcome)
            ).resolves.toBeNull();
        });

        it('throws an AppUnknownException naming the get for any other error', async () => {
            const error = new Error('ses down');
            awsSESService.getTemplate.mockRejectedValue(error);

            await expect(
                service.getEmail(EnumNotificationKind.welcome)
            ).rejects.toMatchObject({
                constructor: AppUnknownException,
                rawError: error,
                description: 'Failed to get welcome template',
            });
        });
    });

    describe('emailDelete', () => {
        it('deletes the template', async () => {
            awsSESService.deleteTemplate.mockResolvedValue({ $metadata: {} });

            await expect(
                service.emailDelete(EnumNotificationKind.welcome)
            ).resolves.toBeUndefined();
            expect(awsSESService.deleteTemplate).toHaveBeenCalledWith({
                name: EnumNotificationKind.welcome,
            });
        });

        it('throws an AppUnknownException naming the delete when the delete call rejects', async () => {
            const error = new Error('ses down');
            awsSESService.deleteTemplate.mockRejectedValue(error);

            await expect(
                service.emailDelete(EnumNotificationKind.welcome)
            ).rejects.toMatchObject({
                constructor: AppUnknownException,
                rawError: error,
                description: 'Failed to delete welcome template',
            });
        });

        it.each(labels)(
            'names the lowercase words of %s in the failure',
            async (name, label) => {
                awsSESService.deleteTemplate.mockRejectedValue(
                    new Error('ses down')
                );

                await expect(service.emailDelete(name)).rejects.toMatchObject({
                    description: `Failed to delete ${label} template`,
                });
            }
        );
    });
});
