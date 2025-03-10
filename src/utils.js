import { readFile, writeFile } from 'fs/promises';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { Logger } from './logger.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

/**
 * Utility functions for the application
 */
export class Utils {
  /**
   * Load configuration from files
   * @returns {Promise<{config: import('./interfaces.js').AppConfig, domains: import('./interfaces.js').DomainsConfig}>}
   */
  static async loadConfig() {
    const done = Logger.task('Load configuration');
    try {
      const config = JSON.parse(
        await readFile(new URL('../config.json', import.meta.url))
      );
      const domains = JSON.parse(
        await readFile(new URL('../domains.json', import.meta.url))
      );
      
      Logger.debug('Configuration loaded successfully');
      Logger.debug(`Loaded ${domains.domains.length} domains`);
      
      done('completed');
      return { config, domains };
    } catch (error) {
      Logger.error('Error loading configuration:', error);
      done('failed');
      throw error;
    }
  }

  /**
   * Save configuration to files
   * @param {import('./interfaces.js').AppConfig} config - Application configuration
   * @param {import('./interfaces.js').DomainsConfig} domains - Domains configuration
   * @returns {Promise<void>}
   */
  static async saveConfig(config, domains) {
    const done = Logger.task('Save configuration');
    try {
      await writeFile(
        new URL('../config.json', import.meta.url),
        JSON.stringify(config, null, 2)
      );
      await writeFile(
        new URL('../domains.json', import.meta.url),
        JSON.stringify(domains, null, 2)
      );
      
      Logger.info('Configuration saved successfully');
      Logger.debug(`Saved ${domains.domains.length} domains`);
      
      done('completed');
    } catch (error) {
      Logger.error('Error saving configuration:', error);
      done('failed');
      throw error;
    }
  }

  /**
   * Load domain status cache
   * @returns {Promise<import('./interfaces.js').DomainStatus[]>}
   */
  static async loadDomainStatusCache() {
    const done = Logger.task('Load domain status cache');
    try {
      const data = JSON.parse(
        await readFile(new URL('../cache/domain-status.json', import.meta.url))
      );
      Logger.debug(`Loaded ${data.length} domain status records from cache`);
      done('completed');
      return data;
    } catch (error) {
      Logger.debug('No domain status cache found or error reading cache:', error.message);
      done('no cache found');
      return [];
    }
  }

  /**
   * Save domain status cache
   * @param {import('./interfaces.js').DomainStatus[]} statusData - Domain status data
   * @returns {Promise<void>}
   */
  static async saveDomainStatusCache(statusData) {
    const done = Logger.task('Save domain status cache');
    try {
      // Ensure cache directory exists
      const fs = await import('fs');
      const cachePath = join(__dirname, '../cache');
      
      if (!fs.existsSync(cachePath)) {
        Logger.debug(`Creating cache directory: ${cachePath}`);
        fs.mkdirSync(cachePath, { recursive: true });
      }
      
      await writeFile(
        new URL('../cache/domain-status.json', import.meta.url),
        JSON.stringify(statusData, null, 2)
      );
      
      Logger.debug(`Saved ${statusData.length} domain status records to cache`);
      done('completed');
    } catch (error) {
      Logger.error('Error saving domain status cache:', error);
      done('failed');
    }
  }
} 