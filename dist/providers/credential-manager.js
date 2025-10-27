/**
 * Secure credential storage manager
 */
import { promises as fs, readFileSync } from 'fs';
import { join } from 'path';
import { homedir } from 'os';
import crypto from 'crypto';
import { createLogger } from '../utils/logger.js';
export class CredentialManager {
    logger;
    credentialsDir;
    credentialsFile;
    encryptionKey;
    constructor(customDir, encryptionKey) {
        this.logger = createLogger('credential-manager');
        this.credentialsDir = customDir || join(homedir(), '.altegio-mcp');
        this.credentialsFile = join(this.credentialsDir, 'credentials.json');
        this.encryptionKey = encryptionKey || process.env.CREDENTIALS_ENCRYPTION_KEY;
    }
    /**
     * Ensure credentials directory exists with proper permissions
     */
    async ensureDirectory() {
        try {
            await fs.mkdir(this.credentialsDir, { recursive: true, mode: 0o700 });
        }
        catch (error) {
            this.logger.error({ error }, 'Failed to create credentials directory');
            throw error;
        }
    }
    /**
     * Encrypt data if encryption key is available
     */
    encrypt(data) {
        if (!this.encryptionKey) {
            return data;
        }
        const iv = crypto.randomBytes(16);
        const key = crypto.scryptSync(this.encryptionKey, 'salt', 32);
        const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
        let encrypted = cipher.update(data, 'utf8', 'hex');
        encrypted += cipher.final('hex');
        const authTag = cipher.getAuthTag();
        return JSON.stringify({
            iv: iv.toString('hex'),
            authTag: authTag.toString('hex'),
            encrypted,
        });
    }
    /**
     * Decrypt data if encryption key is available
     */
    decrypt(encryptedData) {
        if (!this.encryptionKey) {
            return encryptedData;
        }
        try {
            const { iv, authTag, encrypted } = JSON.parse(encryptedData);
            const key = crypto.scryptSync(this.encryptionKey, 'salt', 32);
            const decipher = crypto.createDecipheriv('aes-256-gcm', key, Buffer.from(iv, 'hex'));
            decipher.setAuthTag(Buffer.from(authTag, 'hex'));
            let decrypted = decipher.update(encrypted, 'hex', 'utf8');
            decrypted += decipher.final('utf8');
            return decrypted;
        }
        catch (error) {
            this.logger.error({ error }, 'Failed to decrypt credentials');
            throw new Error('Invalid credentials or encryption key');
        }
    }
    /**
     * Save credentials to file
     */
    async save(credentials) {
        await this.ensureDirectory();
        try {
            const data = JSON.stringify(credentials, null, 2);
            const finalData = this.encrypt(data);
            await fs.writeFile(this.credentialsFile, finalData, {
                mode: 0o600,
                encoding: 'utf8',
            });
            this.logger.info('Credentials saved successfully');
        }
        catch (error) {
            this.logger.error({ error }, 'Failed to save credentials');
            throw error;
        }
    }
    /**
     * Load credentials from file
     */
    load() {
        try {
            const data = readFileSync(this.credentialsFile, 'utf8');
            const decryptedData = this.decrypt(data);
            const credentials = JSON.parse(decryptedData);
            this.logger.debug('Credentials loaded successfully');
            return credentials;
        }
        catch (error) {
            if (error.code === 'ENOENT') {
                this.logger.debug('No saved credentials found');
                return null;
            }
            this.logger.error({ error }, 'Failed to load credentials');
            return null;
        }
    }
    /**
     * Load credentials async
     */
    async loadAsync() {
        try {
            const data = await fs.readFile(this.credentialsFile, 'utf8');
            const decryptedData = this.decrypt(data);
            const credentials = JSON.parse(decryptedData);
            this.logger.debug('Credentials loaded successfully');
            return credentials;
        }
        catch (error) {
            if (error.code === 'ENOENT') {
                this.logger.debug('No saved credentials found');
                return null;
            }
            this.logger.error({ error }, 'Failed to load credentials');
            return null;
        }
    }
    /**
     * Clear saved credentials
     */
    async clear() {
        try {
            await fs.unlink(this.credentialsFile);
            this.logger.info('Credentials cleared successfully');
        }
        catch (error) {
            if (error.code !== 'ENOENT') {
                this.logger.error({ error }, 'Failed to clear credentials');
                throw error;
            }
        }
    }
    /**
     * Check if credentials exist
     */
    async exists() {
        try {
            await fs.access(this.credentialsFile);
            return true;
        }
        catch {
            return false;
        }
    }
    /**
     * Get credentials file path
     */
    getFilePath() {
        return this.credentialsFile;
    }
}
//# sourceMappingURL=credential-manager.js.map