import { readFileSync } from 'fs';
import { join } from 'path';
import { Test } from '@nestjs/testing';
import { mock } from 'vitest-mock-extended';
import type { MockProxy } from 'vitest-mock-extended';
import { AppUnknownException } from '@app/exceptions/app.unknown.exception';
import { AwsSesService } from '@common/aws/services/aws.ses.service';
import { EnumNotificationKind } from '@modules/notification/enums/notification.enum';
import type { INotificationTemplateName } from '@modules/notification/interfaces/notification.interface';
import { NotificationTemplateService } from '@modules/notification/services/notification.template.service';

describe('NotificationTemplateService', () => {
    const awsSesService: MockProxy<AwsSesService> = mock<AwsSesService>();
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
            subject: 'Mobile Number Verified',
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
            name: EnumNotificationKind.processResult,
            file: 'notification.process-result.template.hbs',
            subject: '{{title}}',
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
                { provide: AwsSesService, useValue: awsSesService },
            ],
        }).compile();
        service = module.get(NotificationTemplateService);
    });

    describe('emailUpsert', () => {
        it.each(templates)(
            'upserts the $name template from $file',
            async ({ name, file, subject }) => {
                awsSesService.upsertTemplate.mockResolvedValue(undefined);

                await expect(
                    service.emailUpsert(name)
                ).resolves.toBeUndefined();
                expect(awsSesService.upsertTemplate).toHaveBeenCalledWith({
                    name,
                    subject,
                    htmlBody: readFileSync(join(templateDir, file), 'utf8'),
                });
            }
        );

        it('throws an AppUnknownException naming the upsert when the upsert call rejects', async () => {
            const error = new Error('ses down');
            awsSesService.upsertTemplate.mockRejectedValue(error);

            await expect(
                service.emailUpsert(EnumNotificationKind.workspaceInvite)
            ).rejects.toMatchObject({
                constructor: AppUnknownException,
                rawError: error,
                description: 'Failed to upsert workspace invite template',
            });
        });
    });

    describe('emailDelete', () => {
        it('deletes the template', async () => {
            awsSesService.deleteTemplate.mockResolvedValue({ $metadata: {} });

            await expect(
                service.emailDelete(EnumNotificationKind.welcome)
            ).resolves.toBeUndefined();
            expect(awsSesService.deleteTemplate).toHaveBeenCalledWith({
                name: EnumNotificationKind.welcome,
            });
        });

        it('throws an AppUnknownException naming the delete when the delete call rejects', async () => {
            const error = new Error('ses down');
            awsSesService.deleteTemplate.mockRejectedValue(error);

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
                awsSesService.deleteTemplate.mockRejectedValue(
                    new Error('ses down')
                );

                await expect(service.emailDelete(name)).rejects.toMatchObject({
                    description: `Failed to delete ${label} template`,
                });
            }
        );
    });
});
