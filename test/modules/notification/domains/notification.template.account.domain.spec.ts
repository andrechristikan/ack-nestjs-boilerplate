import { mock } from 'vitest-mock-extended';
import type { MockProxy } from 'vitest-mock-extended';
import { readFileSync } from 'fs';
import { join } from 'path';

import { AwsSESService } from '@common/aws/services/aws.ses.service';
import { NotificationTemplateAccountDomain } from '@modules/notification/domains/notification.template.account.domain';
import { EnumNotificationProcess } from '@modules/notification/enums/notification.enum';

describe('NotificationTemplateAccountDomain', () => {
    const awsSESService: MockProxy<AwsSESService> = mock<AwsSESService>();
    const service = new NotificationTemplateAccountDomain(awsSESService);
    const cases = [
        {
            name: EnumNotificationProcess.welcome,
            subject: 'Welcome',
            filename: 'notification.welcome.template.hbs',
            import: () => service.emailImportWelcome(),
            get: () => service.emailGetWelcome(),
            remove: () => service.emailDeleteWelcome(),
        },
        {
            name: EnumNotificationProcess.welcomeSocial,
            subject: 'Welcome Social',
            filename: 'notification.welcome-social.template.hbs',
            import: () => service.emailImportWelcomeSocial(),
            get: () => service.emailGetWelcomeSocial(),
            remove: () => service.emailDeleteWelcomeSocial(),
        },
        {
            name: EnumNotificationProcess.welcomeByAdmin,
            subject: 'Welcome By Admin',
            filename: 'notification.welcome-by-admin.template.hbs',
            import: () => service.emailImportWelcomeByAdmin(),
            get: () => service.emailGetWelcomeByAdmin(),
            remove: () => service.emailDeleteWelcomeByAdmin(),
        },
        {
            name: EnumNotificationProcess.verificationEmail,
            subject: 'Email Verification',
            filename: 'notification.verification-email.template.hbs',
            import: () => service.emailImportVerificationEmail(),
            get: () => service.emailGetVerificationEmail(),
            remove: () => service.emailDeleteVerificationEmail(),
        },
        {
            name: EnumNotificationProcess.verifiedEmail,
            subject: 'Email Verified',
            filename: 'notification.verified-email.template.hbs',
            import: () => service.emailImportVerifiedEmail(),
            get: () => service.emailGetVerifiedEmail(),
            remove: () => service.emailDeleteVerifiedEmail(),
        },
        {
            name: EnumNotificationProcess.verifiedMobileNumber,
            subject: 'MobileNumber Verified',
            filename: 'notification.verified-mobile-number.template.hbs',
            import: () => service.emailImportVerifiedMobileNumber(),
            get: () => service.emailGetVerifiedMobileNumber(),
            remove: () => service.emailDeleteVerifiedMobileNumber(),
        },
    ];

    it.each(cases)('imports the $name template', async entry => {
        await expect(entry.import()).resolves.toBe(true);
        expect(awsSESService.createTemplate).toHaveBeenCalledWith({
            name: entry.name,
            subject: entry.subject,
            htmlBody: readFileSync(
                join(
                    process.cwd(),
                    'src/modules/notification/templates',
                    entry.filename
                ),
                'utf8'
            ),
        });
    });

    it.each(cases)('returns false when $name import fails', async entry => {
        awsSESService.createTemplate.mockRejectedValue(new Error('SES down'));
        await expect(entry.import()).resolves.toBe(false);
    });

    it.each(cases)('gets the $name template', async entry => {
        const template =
            mock<Awaited<ReturnType<AwsSESService['getTemplate']>>>();
        awsSESService.getTemplate.mockResolvedValue(template);
        await expect(entry.get()).resolves.toBe(template);
        expect(awsSESService.getTemplate).toHaveBeenCalledWith({
            name: entry.name,
        });
    });

    it.each(cases)('returns null when $name lookup fails', async entry => {
        awsSESService.getTemplate.mockRejectedValue(new Error('SES down'));
        await expect(entry.get()).resolves.toBeNull();
    });

    it.each(cases)('deletes the $name template', async entry => {
        await expect(entry.remove()).resolves.toBe(true);
        expect(awsSESService.deleteTemplate).toHaveBeenCalledWith({
            name: entry.name,
        });
    });

    it.each(cases)('returns false when $name deletion fails', async entry => {
        awsSESService.deleteTemplate.mockRejectedValue(new Error('SES down'));
        await expect(entry.remove()).resolves.toBe(false);
    });
});
