import { readFileSync } from 'fs';
import { join } from 'path';
import { mock } from 'vitest-mock-extended';
import type { MockProxy } from 'vitest-mock-extended';

import { AwsSESService } from '@common/aws/services/aws.ses.service';
import { NotificationTemplateSecurityDomain } from '@modules/notification/domains/notification.template.security.domain';
import { EnumNotificationProcess } from '@modules/notification/enums/notification.enum';

describe('NotificationTemplateSecurityDomain', () => {
    const awsSESService: MockProxy<AwsSESService> = mock<AwsSESService>();
    const service = new NotificationTemplateSecurityDomain(awsSESService);
    const cases = [
        [
            'ChangePassword',
            EnumNotificationProcess.changePassword,
            'Change Password',
            'notification.change-password.template.hbs',
        ],
        [
            'TemporaryPasswordByAdmin',
            EnumNotificationProcess.temporaryPasswordByAdmin,
            'Temporary Password By Admin',
            'notification.temporary-password-by-admin.template.hbs',
        ],
        [
            'ResetPassword',
            EnumNotificationProcess.resetPassword,
            'Reset Password',
            'notification.reset-password.template.hbs',
        ],
        [
            'ForgotPassword',
            EnumNotificationProcess.forgotPassword,
            'Forgot Password',
            'notification.forgot-password.template.hbs',
        ],
        [
            'ResetTwoFactorByAdmin',
            EnumNotificationProcess.resetTwoFactorByAdmin,
            'Reset Two Factor By Admin',
            'notification.reset-two-factor-by-admin.template.hbs',
        ],
        [
            'NewDeviceLogin',
            EnumNotificationProcess.newDeviceLogin,
            'Device Login',
            'notification.new-device-login.template.hbs',
        ],
    ] as const;

    it.each(cases)(
        'imports, gets, and deletes %s',
        async (suffix, name, subject, filename) => {
            const template =
                mock<Awaited<ReturnType<AwsSESService['getTemplate']>>>();
            awsSESService.getTemplate.mockResolvedValue(template);
            await expect(service[`emailImport${suffix}`]()).resolves.toBe(true);
            expect(awsSESService.createTemplate).toHaveBeenCalledWith({
                name,
                subject,
                htmlBody: readFileSync(
                    join(
                        process.cwd(),
                        'src/modules/notification/templates',
                        filename
                    ),
                    'utf8'
                ),
            });
            await expect(service[`emailGet${suffix}`]()).resolves.toBe(
                template
            );
            expect(awsSESService.getTemplate).toHaveBeenCalledWith({ name });
            await expect(service[`emailDelete${suffix}`]()).resolves.toBe(true);
            expect(awsSESService.deleteTemplate).toHaveBeenCalledWith({ name });
        }
    );

    it.each(cases)('maps provider failures for %s', async suffix => {
        awsSESService.createTemplate.mockRejectedValue(new Error('SES down'));
        await expect(service[`emailImport${suffix}`]()).resolves.toBe(false);
        awsSESService.getTemplate.mockRejectedValue(new Error('SES down'));
        await expect(service[`emailGet${suffix}`]()).resolves.toBeNull();
        awsSESService.deleteTemplate.mockRejectedValue(new Error('SES down'));
        await expect(service[`emailDelete${suffix}`]()).resolves.toBe(false);
    });
});
