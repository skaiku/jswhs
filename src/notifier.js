import fetch from 'node-fetch';

export class Notifier {
  constructor(ntfyConfig) {
    this.ntfyUrl = ntfyConfig.url;
    this.priority = ntfyConfig.priority;
  }

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