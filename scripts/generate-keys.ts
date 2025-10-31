import crypto from 'crypto';
import fs from 'fs';
import path, { join } from 'path';

/**
 * Utility class for generating and managing JWT ES512 key pairs and JWKS.
 * Handles creation, rollback, and environment configuration updates for JWT authentication keys.
 */
class JwtKeysGenerator {
    private readonly keyDir: string;
    private readonly jwksOutputPath: string;
    private readonly accessTokenPrivateKeyPath: string;
    private readonly accessTokenPublicKeyPath: string;
    private readonly refreshTokenPrivateKeyPath: string;
    private readonly refreshTokenPublicKeyPath: string;

    constructor(keyDir: string) {
        this.keyDir = keyDir;
        this.accessTokenPrivateKeyPath = path.join(
            this.keyDir,
            'access-token.pem'
        );
        this.accessTokenPublicKeyPath = path.join(
            this.keyDir,
            'access-token.pub'
        );
        this.refreshTokenPrivateKeyPath = path.join(
            this.keyDir,
            'refresh-token.pem'
        );
        this.refreshTokenPublicKeyPath = path.join(
            this.keyDir,
            'refresh-token.pub'
        );
        this.jwksOutputPath = path.join(this.keyDir, 'jwks.json');
    }

    /**
     * Creates directory if it doesn't exist.
     * @param dir - Directory path to create
     */
    ensureDir(dir: string): void {
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }
    }

    /**
     * Generates ES512 elliptic curve key pair and returns the key strings.
     * @param privateKeyPath - Path to save private key (optional for file creation)
     * @param publicKeyPath - Path to save public key (optional for file creation)
     * @param saveToFile - Whether to save keys to files (default: true)
     * @returns Object containing private and public key strings
     */
    generateES512KeyPair(
        privateKeyPath?: string,
        publicKeyPath?: string,
        saveToFile: boolean = true
    ): { privateKey: string; publicKey: string } {
        const keyPair = crypto.generateKeyPairSync('ec', {
            namedCurve: 'secp521r1',
            publicKeyEncoding: {
                type: 'spki',
                format: 'pem',
            },
            privateKeyEncoding: {
                type: 'pkcs8',
                format: 'pem',
            },
        });

        if (saveToFile && privateKeyPath && publicKeyPath) {
            fs.writeFileSync(privateKeyPath, keyPair.privateKey);
            fs.writeFileSync(publicKeyPath, keyPair.publicKey);

            try {
                fs.chmodSync(privateKeyPath, 0o600);
            } catch (err) {
                console.warn(`Could not set permissions for ${privateKeyPath}`);
            }
        }

        return {
            privateKey: keyPair.privateKey,
            publicKey: keyPair.publicKey,
        };
    }

    /**
     * Extracts elliptic curve parameters from public key string for JWK creation.
     * @param publicKeyString - Public key string in PEM format
     * @returns Object containing x, y coordinates and curve type
     */
    extractECParamsFromString(publicKeyString: string): {
        x?: string;
        y?: string;
        crv?: string;
    } {
        try {
            const publicKey = crypto.createPublicKey({
                key: publicKeyString,
                format: 'pem',
            });

            const keyDetails = publicKey.export({ format: 'jwk' });

            return {
                x: keyDetails.x,
                y: keyDetails.y,
                crv: keyDetails.crv,
            };
        } catch (error) {
            console.error(
                `Error extracting EC parameters from public key: ${error instanceof Error ? error.message : String(error)}`
            );
            throw error;
        }
    }

    /**
     * Extracts elliptic curve parameters from public key file for JWK creation.
     * @param publicKeyPath - Path to public key file
     * @returns Object containing x, y coordinates and curve type
     */
    extractECParams(publicKeyPath: string): {
        x?: string;
        y?: string;
        crv?: string;
    } {
        try {
            const pemContent = fs.readFileSync(publicKeyPath, 'utf8');
            return this.extractECParamsFromString(pemContent);
        } catch (error) {
            console.error(
                `Error extracting EC parameters from ${publicKeyPath}: ${error instanceof Error ? error.message : String(error)}`
            );
            throw error;
        }
    }

    /**
     * Creates JSON Web Key (JWK) object from elliptic curve parameters.
     * @param params - EC parameters (x, y, crv)
     * @param kid - Key identifier
     * @returns JWK object for ES512 algorithm
     */
    createJwk(
        params: {
            x?: string;
            y?: string;
            crv?: string;
        },
        kid: string
    ): {
        kty: string;
        crv?: string;
        x?: string;
        y?: string;
        use: string;
        alg: string;
        kid: string;
    } {
        return {
            kty: 'EC',
            crv: params.crv,
            x: params.x,
            y: params.y,
            use: 'sig',
            alg: 'ES512',
            kid,
        };
    }

    /**
     * Creates JSON Web Key Set (JWKS) from access and refresh token public keys.
     * @param accessKeyPath - Path to access token public key
     * @param refreshKeyPath - Path to refresh token public key
     * @param outputPath - Path to save JWKS file
     */
    createJwks(
        accessKeyPath: string,
        refreshKeyPath: string,
        outputPath: string
    ): void {
        try {
            const accessParams = this.extractECParams(accessKeyPath);
            const refreshParams = this.extractECParams(refreshKeyPath);

            // randomly generate a kid for the keys
            const accessKid = crypto.randomBytes(16).toString('hex');
            const refreshKid = crypto.randomBytes(16).toString('hex');
            const accessJwk = this.createJwk(accessParams, accessKid);
            const refreshJwk = this.createJwk(refreshParams, refreshKid);

            const jwks = {
                keys: [accessJwk, refreshJwk],
            };

            const outputDir = path.dirname(outputPath);
            this.ensureDir(outputDir);

            fs.writeFileSync(outputPath, JSON.stringify(jwks, null, 2));
            console.log(`JWKS successfully created at ${outputPath}`);
        } catch (error) {
            console.error(
                `Error creating JWKS: ${error instanceof Error ? error.message : String(error)}`
            );
            throw error;
        }
    }

    /**
     * Creates JWKS from public key strings and returns both JWKS and KIDs.
     * @param accessPublicKey - Access token public key string
     * @param refreshPublicKey - Refresh token public key string
     * @returns Object containing JWKS and generated KIDs
     */
    createJwksFromStrings(
        accessPublicKey: string,
        refreshPublicKey: string
    ): { jwks: any; accessKid: string; refreshKid: string } {
        const accessParams = this.extractECParamsFromString(accessPublicKey);
        const refreshParams = this.extractECParamsFromString(refreshPublicKey);

        // randomly generate a kid for the keys
        const accessKid = crypto.randomBytes(16).toString('hex');
        const refreshKid = crypto.randomBytes(16).toString('hex');
        const accessJwk = this.createJwk(accessParams, accessKid);
        const refreshJwk = this.createJwk(refreshParams, refreshKid);

        const jwks = {
            keys: [accessJwk, refreshJwk],
        };

        return { jwks, accessKid, refreshKid };
    }

    /**
     * Prints JWT keys and configuration to console in a formatted way.
     * @param accessKeys - Access token key pair
     * @param refreshKeys - Refresh token key pair
     * @param accessKid - Access token key ID
     * @param refreshKid - Refresh token key ID
     */
    printKeysToConsole(
        accessKeys: { privateKey: string; publicKey: string },
        refreshKeys: { privateKey: string; publicKey: string },
        accessKid: string,
        refreshKid: string
    ): void {
        console.log('\n' + '='.repeat(80));
        console.log('🔑 JWT KEYS GENERATED - CONSOLE OUTPUT');
        console.log('='.repeat(80));

        console.log('\n📋 Environment Variables for .env:');
        console.log('-'.repeat(50));
        console.log(`AUTH_JWT_ACCESS_TOKEN_KID=${accessKid}`);
        console.log(`AUTH_JWT_REFRESH_TOKEN_KID=${refreshKid}`);

        // Convert keys to base64 for env storage (escape newlines)
        const accessPrivateKeyForEnv = accessKeys.privateKey.replace(
            /\n/g,
            '\\n'
        );
        const accessPublicKeyForEnv = accessKeys.publicKey.replace(
            /\n/g,
            '\\n'
        );
        const refreshPrivateKeyForEnv = refreshKeys.privateKey.replace(
            /\n/g,
            '\\n'
        );
        const refreshPublicKeyForEnv = refreshKeys.publicKey.replace(
            /\n/g,
            '\\n'
        );

        console.log(
            `AUTH_JWT_ACCESS_TOKEN_PRIVATE_KEY="${accessPrivateKeyForEnv}"`
        );
        console.log(
            `AUTH_JWT_ACCESS_TOKEN_PUBLIC_KEY="${accessPublicKeyForEnv}"`
        );
        console.log(
            `AUTH_JWT_REFRESH_TOKEN_PRIVATE_KEY="${refreshPrivateKeyForEnv}"`
        );
        console.log(
            `AUTH_JWT_REFRESH_TOKEN_PUBLIC_KEY="${refreshPublicKeyForEnv}"`
        );

        console.log('\n🔐 Access Token Keys:');
        console.log('-'.repeat(50));
        console.log('Private Key:');
        console.log(accessKeys.privateKey);
        console.log('\nPublic Key:');
        console.log(accessKeys.publicKey);

        console.log('\n🔄 Refresh Token Keys:');
        console.log('-'.repeat(50));
        console.log('Private Key:');
        console.log(refreshKeys.privateKey);
        console.log('\nPublic Key:');
        console.log(refreshKeys.publicKey);

        console.log('\n' + '='.repeat(80));
        console.log('✅ Keys printed to console successfully!');
        console.log('='.repeat(80) + '\n');
    }

    /**
     * Main method to generate all JWT keys and JWKS file.
     * Creates access token keys, refresh token keys, and JWKS configuration.
     * Supports three output modes: console, env update, and file creation.
     */
    generateKeys(): void {
        try {
            this.ensureDir(this.keyDir);

            // Generate access token keys
            console.log('Generating Access Token ES512 keys...');
            const accessKeys = this.generateES512KeyPair(
                this.accessTokenPrivateKeyPath,
                this.accessTokenPublicKeyPath,
                true
            );

            // Generate refresh token keys
            console.log('Generating Refresh Token ES512 keys...');
            const refreshKeys = this.generateES512KeyPair(
                this.refreshTokenPrivateKeyPath,
                this.refreshTokenPublicKeyPath,
                true
            );

            // Generate JWKS and get KIDs
            console.log('Generating JWKS...');
            const { jwks, accessKid, refreshKid } = this.createJwksFromStrings(
                accessKeys.publicKey,
                refreshKeys.publicKey
            );

            // Save JWKS to file
            const outputDir = path.dirname(this.jwksOutputPath);
            this.ensureDir(outputDir);
            fs.writeFileSync(
                this.jwksOutputPath,
                JSON.stringify(jwks, null, 2)
            );
            console.log(`JWKS successfully created at ${this.jwksOutputPath}`);

            // 1. Print to console
            this.printKeysToConsole(
                accessKeys,
                refreshKeys,
                accessKid,
                refreshKid
            );

            // 2. Update .env file
            this.updateEnvWithKeys(
                accessKid,
                refreshKid,
                accessKeys,
                refreshKeys
            );

            console.log('✅ JWT keys and JWKS generated successfully!');
            console.log('📝 Keys have been:');
            console.log('   1. ✅ Printed to console');
            console.log('   2. ✅ Saved to files');
            console.log('   3. ✅ Updated in .env');
        } catch (err) {
            console.error(
                `Failed to generate JWT keys: ${err instanceof Error ? err.message : String(err)}`
            );
            process.exit(1);
        }
    }

    /**
     * Removes all generated JWT keys and JWKS files.
     * Used for cleanup or regeneration scenarios.
     */
    rollbackKeys(): void {
        try {
            if (fs.existsSync(this.accessTokenPrivateKeyPath)) {
                fs.unlinkSync(this.accessTokenPrivateKeyPath);
            }

            if (fs.existsSync(this.accessTokenPublicKeyPath)) {
                fs.unlinkSync(this.accessTokenPublicKeyPath);
            }

            if (fs.existsSync(this.refreshTokenPrivateKeyPath)) {
                fs.unlinkSync(this.refreshTokenPrivateKeyPath);
            }

            if (fs.existsSync(this.refreshTokenPublicKeyPath)) {
                fs.unlinkSync(this.refreshTokenPublicKeyPath);
            }

            if (fs.existsSync(this.jwksOutputPath)) {
                fs.unlinkSync(this.jwksOutputPath);
            }

            console.log('JWT keys and JWKS removed successfully!');
        } catch (err) {
            console.error(
                `Failed to remove JWT keys: ${err instanceof Error ? err.message : String(err)}`
            );
            process.exit(1);
        }
    }

    /**
     * Updates .env file with new key identifiers and key strings.
     * @param accessKid - Access token key ID
     * @param refreshKid - Refresh token key ID
     * @param accessKeys - Access token key pair
     * @param refreshKeys - Refresh token key pair
     */
    updateEnvWithKeys(
        accessKid: string,
        refreshKid: string,
        accessKeys: { privateKey: string; publicKey: string },
        refreshKeys: { privateKey: string; publicKey: string }
    ): void {
        const envPath = path.join(process.cwd(), '.env');
        const envExamplePath = path.join(process.cwd(), '.env.example');

        // Ensure .env exists
        if (!fs.existsSync(envPath)) {
            if (fs.existsSync(envExamplePath)) {
                fs.copyFileSync(envExamplePath, envPath);
                console.log('📄 .env file created from .env.example');
            } else {
                console.error('.env.example not found. Cannot create .env');
                process.exit(1);
            }
        }

        // Read current .env content
        let envContent = fs.readFileSync(envPath, 'utf8');

        // Prepare key strings for env (escape newlines)
        const accessPrivateKeyForEnv = accessKeys.privateKey.replace(
            /\n/g,
            '\\n'
        );
        const accessPublicKeyForEnv = accessKeys.publicKey.replace(
            /\n/g,
            '\\n'
        );
        const refreshPrivateKeyForEnv = refreshKeys.privateKey.replace(
            /\n/g,
            '\\n'
        );
        const refreshPublicKeyForEnv = refreshKeys.publicKey.replace(
            /\n/g,
            '\\n'
        );

        // Define env variables to update
        const envUpdates = [
            { key: 'AUTH_JWT_ACCESS_TOKEN_KID', value: accessKid },
            { key: 'AUTH_JWT_REFRESH_TOKEN_KID', value: refreshKid },
            {
                key: 'AUTH_JWT_ACCESS_TOKEN_PRIVATE_KEY',
                value: `"${accessPrivateKeyForEnv}"`,
            },
            {
                key: 'AUTH_JWT_ACCESS_TOKEN_PUBLIC_KEY',
                value: `"${accessPublicKeyForEnv}"`,
            },
            {
                key: 'AUTH_JWT_REFRESH_TOKEN_PRIVATE_KEY',
                value: `"${refreshPrivateKeyForEnv}"`,
            },
            {
                key: 'AUTH_JWT_REFRESH_TOKEN_PUBLIC_KEY',
                value: `"${refreshPublicKeyForEnv}"`,
            },
        ];

        // Update or add each environment variable
        for (const { key, value } of envUpdates) {
            const regex = new RegExp(`^${key}=.*$`, 'm');
            if (regex.test(envContent)) {
                envContent = envContent.replace(regex, `${key}=${value}`);
            } else {
                envContent += `\n${key}=${value}`;
            }
        }

        // Write updated content back to .env
        fs.writeFileSync(envPath, envContent);
        console.log('📝 .env file updated with new keys and KIDs');
    }

    /**
     * Updates .env file with new key identifiers from generated JWKS (Legacy method).
     * Synchronizes environment configuration with generated keys.
     * @deprecated Use updateEnvWithKeys instead for new key format
     */
    updateEnv(): void {
        const envPath = path.join(process.cwd(), '.env');
        const envExamplePath = path.join(process.cwd(), '.env.example');

        // 1. Read jwks.json
        const jwksPath = path.join(this.keyDir, 'jwks.json');
        if (!fs.existsSync(jwksPath)) {
            console.error(`jwks.json not found at ${jwksPath}`);
            process.exit(1);
        }
        const jwks = JSON.parse(fs.readFileSync(jwksPath, 'utf8'));
        const [accessJwk, refreshJwk] = jwks.keys;

        // 2. Ensure .env exists
        if (!fs.existsSync(envPath)) {
            if (fs.existsSync(envExamplePath)) {
                fs.copyFileSync(envExamplePath, envPath);
                console.log('.env file created from .env.example');
            } else {
                console.error('.env.example not found. Cannot create .env');
                process.exit(1);
            }
        }

        // 3. Extract current KIDs from .env
        const envContent = fs.readFileSync(envPath, 'utf8');
        const accessKidMatch = envContent.match(
            /^AUTH_JWT_ACCESS_TOKEN_KID=(.*)$/m
        );
        const refreshKidMatch = envContent.match(
            /^AUTH_JWT_REFRESH_TOKEN_KID=(.*)$/m
        );
        const accessKid = accessKidMatch ? accessKidMatch[1] : '';
        const refreshKid = refreshKidMatch ? refreshKidMatch[1] : '';

        // 4. If already up-to-date, skip
        if (accessKid === accessJwk.kid && refreshKid === refreshJwk.kid) {
            console.log('.env KIDs are already up to date.');
            return;
        }

        // 5. Update .env with new KIDs
        let newEnv = envContent;
        if (accessKidMatch) {
            newEnv = newEnv.replace(
                /^AUTH_JWT_ACCESS_TOKEN_KID=.*$/m,
                `AUTH_JWT_ACCESS_TOKEN_KID=${accessJwk.kid}`
            );
        } else {
            newEnv += `\nAUTH_JWT_ACCESS_TOKEN_KID=${accessJwk.kid}`;
        }
        if (refreshKidMatch) {
            newEnv = newEnv.replace(
                /^AUTH_JWT_REFRESH_TOKEN_KID=.*$/m,
                `AUTH_JWT_REFRESH_TOKEN_KID=${refreshJwk.kid}`
            );
        } else {
            newEnv += `\nAUTH_JWT_REFRESH_TOKEN_KID=${refreshJwk.kid}`;
        }
        fs.writeFileSync(envPath, newEnv);
        console.log('.env KIDs updated successfully.');
    }
}

function main() {
    const argv = process.argv.slice(2);
    const command = argv[0] || 'generate';
    const keyDir = argv[1] || join(process.cwd(), 'keys');

    const generator = new JwtKeysGenerator(keyDir);

    if (command === 'generate') {
        generator.generateKeys();
        // Note: generateKeys() now handles all three outputs:
        // 1. Console printing
        // 2. File creation
        // 3. .env update
    } else if (command === 'rollback') {
        generator.rollbackKeys();
    } else {
        console.log(`
Usage: node generate-keys.js [command] [keysDir]

Commands:
  generate    Generate JWT ES512 keys and JWKS with 3 outputs:
              1. Print keys to console
              2. Save keys to files  
              3. Update .env with keys and KIDs (default)
  rollback    Remove JWT ES512 keys and JWKS files

Arguments:
  keysDir     Output directory for keys (default: ./keys)

Examples:
  yarn generate:keys
  node generate-keys.js generate
  node generate-keys.js rollback ./keys
        `);
    }
}

/**
 * CLI entry point that processes command line arguments and executes appropriate operations.
 * Supports generate and rollback commands with configurable key directory.
 */
main();
