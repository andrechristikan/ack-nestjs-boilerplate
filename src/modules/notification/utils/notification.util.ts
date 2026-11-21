import { HelperDateService } from '@common/helper/services/helper.date.service';
import { HelperEncryptionService } from '@common/helper/services/helper.encryption.service';
import { HelperStringService } from '@common/helper/services/helper.string.service';
import { EnumNotificationChannel } from '@generated/prisma-client/client';
import { NotificationPayloadEncryptionPurpose } from '@modules/notification/constants/notification.constant';
import { NotificationKindContract } from '@modules/notification/contracts/notification.kind.contract';
import { NotificationSettingContract } from '@modules/notification/contracts/notification.setting.contract';
import type {
    INotificationContext,
    INotificationSealedRecord,
    INotificationUserSettingPreference,
    INotificationWorkspaceInviteFields,
} from '@modules/notification/interfaces/notification.interface';
import {
    EnumNotificationKind,
    EnumNotificationStep,
} from '@modules/notification/enums/notification.enum';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class NotificationUtil {
    private readonly encryptionSecret: string;
    private readonly stepPattern: string;

    constructor(
        private readonly configService: ConfigService,
        private readonly helperEncryptionService: HelperEncryptionService,
        private readonly helperDateService: HelperDateService,
        private readonly helperStringService: HelperStringService
    ) {
        this.encryptionSecret = this.configService.get<string>(
            'app.encryptionSecret'
        )!;
        this.stepPattern = this.configService.get<string>(
            'notification.idempotencyKey.stepPattern'
        )!;
    }

    private pickFields(
        fields: string[],
        context: INotificationSealedRecord,
        username: string
    ): Record<string, string> {
        const picked: Record<string, string> = { username };
        for (const field of fields) {
            picked[field] = String(context[field]);
        }

        return picked;
    }

    resolveChannels(
        kind: EnumNotificationKind,
        settings: INotificationUserSettingPreference[]
    ): EnumNotificationChannel[] {
        const { type, isMandatory, pendingChannels, deliveredChannels } =
            NotificationKindContract[kind];
        const channels = [...pendingChannels, ...deliveredChannels];
        const configurable = NotificationSettingContract.find(
            contract => contract.type === type
        );
        if (isMandatory || !configurable) {
            return channels;
        }

        const configurableChannels = new Set<EnumNotificationChannel>(
            configurable.channels
        );
        const disabled = new Set(
            settings
                .filter(
                    setting =>
                        setting.type === type &&
                        !setting.isActive &&
                        configurableChannels.has(setting.channel)
                )
                .map(setting => setting.channel)
        );

        const surviving = channels.filter(channel => !disabled.has(channel));
        const hasUserFacingChannel = surviving.some(
            channel => channel !== EnumNotificationChannel.silent
        );

        return hasUserFacingChannel ? surviving : [];
    }

    toSealedField(field: string): string {
        const head = field.charAt(0).toUpperCase();

        return `encrypted${head}${field.slice(1)}`;
    }

    /** Returns the context with each secret field of the kind decrypted from its `encrypted<Field>` value. */
    openContext(
        kind: EnumNotificationKind,
        sealed: INotificationSealedRecord,
        encryptionContext: string
    ): INotificationSealedRecord {
        const { secrets } = NotificationKindContract[kind];
        const opened: INotificationSealedRecord = {};
        const openFieldBySealedField = new Map<string, string>();
        for (const openField of secrets) {
            const sealedField = this.toSealedField(openField);
            openFieldBySealedField.set(sealedField, openField);
        }

        for (const [field, value] of Object.entries(sealed)) {
            const openField = openFieldBySealedField.get(field) ?? null;
            if (openField === null) {
                opened[field] = value;

                continue;
            }

            opened[openField] = this.decryptPayload(
                String(value),
                encryptionContext
            );
        }

        return opened;
    }

    /** The context values the kind's `metadataFields` name, plus `username`. */
    toMetadata(
        kind: EnumNotificationKind,
        context: INotificationSealedRecord,
        username: string
    ): Record<string, string> {
        const { metadataFields } = NotificationKindContract[kind];

        return this.pickFields(metadataFields, context, username);
    }

    /** The context values the kind's `templateFields` name, plus `username`, with each `dateFields` value in RFC 2822. */
    toTemplateData(
        kind: EnumNotificationKind,
        context: INotificationSealedRecord,
        username: string
    ): Record<string, string> {
        const { templateFields } = NotificationKindContract[kind];
        const picked = this.pickFields(templateFields, context, username);

        return this.toDisplayProperties(kind, picked);
    }

    /** The properties with each of the kind's `dateFields` value formatted from ISO to RFC 2822, for text a person reads. */
    toDisplayProperties<T extends string | number | boolean | Date>(
        kind: EnumNotificationKind,
        properties: Record<string, T>
    ): Record<string, T | string> {
        const { dateFields } = NotificationKindContract[kind];
        const displayed: Record<string, T | string> = { ...properties };
        for (const field of dateFields) {
            const value = properties[field];
            if (typeof value === 'string') {
                const date = this.helperDateService.createFromIso(value);
                displayed[field] = this.helperDateService.formatToRFC2822(date);
            }
        }

        return displayed;
    }

    decryptPayload(encrypted: string, context: string): string {
        return this.helperEncryptionService.aes256Decrypt(
            encrypted,
            this.encryptionSecret,
            NotificationPayloadEncryptionPurpose,
            context
        );
    }

    encryptPayload(value: string, context: string): string {
        return this.helperEncryptionService.aes256Encrypt(
            value,
            this.encryptionSecret,
            NotificationPayloadEncryptionPurpose,
            context
        );
    }

    /** The context with each secret field renamed `encrypted<Field>` and encrypted against the encryption context. */
    sealContext(
        context: INotificationContext | INotificationWorkspaceInviteFields,
        secrets: string[],
        encryptionContext: string
    ): INotificationSealedRecord {
        const sealed: INotificationSealedRecord = {};
        const secretFields = new Set(secrets);
        for (const [field, value] of Object.entries(context)) {
            const isSecret = secretFields.has(field);
            if (!isSecret) {
                sealed[field] = value;

                continue;
            }

            const sealedField = this.toSealedField(field);
            sealed[sealedField] = this.encryptPayload(value, encryptionContext);
        }

        return sealed;
    }

    toStepKey(notificationId: string, step: EnumNotificationStep): string {
        return this.helperStringService.fillPattern(this.stepPattern, {
            notificationId,
            step,
        });
    }
}
