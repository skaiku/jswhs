import fetch from 'node-fetch';

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
  }

  /**
   * Send a notification about domain expiration
   * @param {import('./interfaces.js').DomainStatus} domainInfo - Domain status information
   * @returns {Promise<void>}
   */
  async sendNotification(domainInfo) {
    const message = `Domain ${domainInfo.domain} will expire in ${domainInfo.daysUntilExpiration} days (${domainInfo.expirationDate.toISOString().split('T')[0]})`;
    
    try {
      await fetch(this.ntfyUrl, {
        method: 'POST',
        body: message,
        headers: {
          'Priority': this.priority,
          'Title': 'Domain Expiration Warning'
        }
      });
    } catch (error) {
      console.error('Error sending notification:', error);
    }
  }
} 