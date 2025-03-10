import fetch from 'node-fetch';
import { Logger } from './logger.js';

/**
 * Class to send notifications about domain expiration
 */
export class Notifier {
  /**
   * @param {import('./interfaces.js').NtfyConfig} ntfyConfig - Configuration for ntfy.sh
   */
  constructor(ntfyConfig) {
    this.ntfyUrl = ntfyConfig.url;
    this.priority = ntfyConfig.priority;
    Logger.debug(`Notifier initialized with URL: ${this.ntfyUrl}, priority: ${this.priority}`);
  }

  /**
   * Send a notification about domain expiration
   * @param {import('./interfaces.js').DomainStatus} domainInfo - Domain status information
   * @returns {Promise<void>}
   */
  async sendNotification(domainInfo) {
    const done = Logger.task(`Send notification for ${domainInfo.domain}`);
    const message = `Domain ${domainInfo.domain} will expire in ${domainInfo.daysUntilExpiration} days (${domainInfo.expirationDate.toISOString().split('T')[0]})`;
    
    Logger.warn(`Sending notification for ${domainInfo.domain}: ${message}`);
    
    try {
      await fetch(this.ntfyUrl, {
        method: 'POST',
        body: message,
        headers: {
          'Priority': this.priority,
          'Title': 'Domain Expiration Warning'
        }
      });
      Logger.info(`Notification sent successfully for ${domainInfo.domain}`);
      done('completed');
    } catch (error) {
      Logger.error(`Error sending notification for ${domainInfo.domain}:`, error);
      done('failed');
    }
  }
} 