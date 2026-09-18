import type { INestApplication } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { DatabaseUtil } from '@common/database/utils/database.util';
import { HelperHashService } from '@common/helper/services/helper.hash.service';
import { AuthPasswordUtil } from '@modules/auth/utils/auth.password.util';
import { AuthTwoFactorDomain } from '@modules/auth/domains/auth.two-factor.domain';
import {
    EnumUserSignUpFrom,
    EnumUserSignUpWith,
    EnumUserStatus,
    EnumVerificationType,
    User,
} from '@generated/prisma-client';
import { getPrismaClient } from '@test/e2e/support/prisma';
import { generateSync } from 'otplib';
import { ConfigService } from '@nestjs/config';

const DEFAULT_PASSWORD = 'E2eFixture1!Aa';

export interface IE2eUserFixture {
    id: string;
    email: string;
    username: string;
    password: string;
}

/**
 * Creates a real, active, verified `User` row with a known bcrypt-hashed password directly
 * through the app's real Prisma client and password hashing service — the credential-login
 * fixture every user-public spec needing a login-capable account reuses.
 */
export async function createActiveUser(
    app: INestApplication,
    overrides?: Partial<{
        email: string;
        username: string;
        password: string;
        isVerified: boolean;
        status: EnumUserStatus;
    }>
): Promise<IE2eUserFixture> {
    const prisma = getPrismaClient(app);
    const databaseUtil = app.get(DatabaseUtil);
    const authPasswordUtil = app.get(AuthPasswordUtil);

    const suffix = randomUUID().replaceAll('-', '').slice(0, 16);
    const email = overrides?.email ?? `e2e.user.${suffix}@example.com`;
    const username = overrides?.username ?? `e2euser${suffix}`;
    const passwordString = overrides?.password ?? DEFAULT_PASSWORD;

    const [role, country] = await Promise.all([
        prisma.role.findFirstOrThrow({ where: { name: 'user' } }),
        prisma.country.findFirstOrThrow({ where: { alpha2Code: 'ID' } }),
    ]);

    const userId = databaseUtil.createId();
    const password = authPasswordUtil.createPassword(userId, passwordString);

    const user: User = await prisma.user.create({
        data: {
            id: userId,
            name: 'E2E Fixture User',
            username,
            email,
            roleId: role.id,
            countryId: country.id,
            password: password.passwordHash,
            passwordExpired: password.passwordExpired,
            passwordCreated: password.passwordCreated,
            signUpFrom: EnumUserSignUpFrom.website,
            signUpWith: EnumUserSignUpWith.credential,
            status: overrides?.status ?? EnumUserStatus.active,
            isVerified: overrides?.isVerified ?? true,
            termsOfServiceAccepted: true,
            privacyAccepted: true,
            createdBy: userId,
        },
    });

    return {
        id: user.id,
        email: user.email,
        username: user.username,
        password: passwordString,
    };
}

/**
 * Deletes the fixture user. Every row referencing it (sessions, verifications, two-factor,
 * notifications, memberships, …) goes with it through the schema's `onDelete: Cascade`.
 */
export async function deleteUserFixture(
    app: INestApplication,
    userId: string
): Promise<void> {
    await getPrismaClient(app).user.deleteMany({ where: { id: userId } });
}

/**
 * Persists a real, usable email-verification token for the fixture user (same hashing the
 * verification domain applies) and returns the RAW token a spec sends in the request body.
 */
export async function createEmailVerificationToken(
    app: INestApplication,
    userId: string,
    email: string
): Promise<string> {
    const prisma = getPrismaClient(app);
    const helperHashService = app.get(HelperHashService);

    const token = randomUUID().replaceAll('-', '');
    const hashedToken = helperHashService.sha256Hash(token);
    const expiredAt = new Date(Date.now() + 60 * 60 * 1000);

    await prisma.verification.create({
        data: {
            userId,
            reference: `E2E-${randomUUID().slice(0, 8)}`,
            token: hashedToken,
            type: EnumVerificationType.email,
            to: email,
            expiredAt,
            createdBy: userId,
        },
    });

    return token;
}

/**
 * Persists a real, usable forgot-password token for the fixture user and returns the RAW
 * token a spec sends to the reset-password route.
 */
export async function createForgotPasswordToken(
    app: INestApplication,
    userId: string,
    email: string
): Promise<string> {
    const prisma = getPrismaClient(app);
    const helperHashService = app.get(HelperHashService);

    const token = randomUUID().replaceAll('-', '');
    const hashedToken = helperHashService.sha256Hash(token);
    const expiredAt = new Date(Date.now() + 60 * 60 * 1000);

    await prisma.forgotPassword.create({
        data: {
            userId,
            reference: `E2E-${randomUUID().slice(0, 8)}`,
            token: hashedToken,
            to: email,
            expiredAt,
            createdBy: userId,
        },
    });

    return token;
}

/**
 * Enables real, confirmed 2FA (TOTP) for the fixture user using the app's own encryption
 * service, and returns the plaintext secret a spec needs to derive a valid code.
 */
export async function enableTwoFactorForUser(
    app: INestApplication,
    userId: string,
    email: string
): Promise<{ secret: string }> {
    const prisma = getPrismaClient(app);
    const authTwoFactorDomain = app.get(AuthTwoFactorDomain);

    const { secret, iv, encryptedSecret } =
        await authTwoFactorDomain.setupTwoFactor(email);

    await prisma.twoFactor.create({
        data: {
            userId,
            secret: encryptedSecret,
            iv,
            enabled: true,
            requiredSetup: false,
            confirmedAt: new Date(),
            createdBy: userId,
        },
    });

    return { secret };
}

/**
 * Derives a currently-valid TOTP code for `secret`, using the same algorithm/digits/period the
 * app is configured with — the counterpart a spec needs to complete a login 2FA challenge.
 */
export function generateTwoFactorCode(
    app: INestApplication,
    secret: string
): string {
    const configService = app.get(ConfigService);

    return generateSync({
        secret,
        algorithm: configService.get('auth.twoFactor.algorithm')!,
        strategy: configService.get('auth.twoFactor.strategy')!,
        digits: configService.get<number>('auth.twoFactor.digits')!,
        period: configService.get<number>('auth.twoFactor.periodInSeconds')!,
    });
}
