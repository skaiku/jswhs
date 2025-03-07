import whois from 'whois-json';

export class DomainChecker {
  constructor(warningDays) {
    this.warningDays = warningDays;
  }

  async checkDomain(domain) {
    try {
      const result = await whois(domain);
      
      // Log the full WHOIS response
      console.log('\n=== WHOIS Response for', domain, '===');
      console.log(JSON.stringify(result, null, 2));
      console.log('=====================================\n');

      const expirationDate = new Date(result.expirationDate);
      const daysUntilExpiration = this.calculateDaysUntilExpiration(expirationDate);

      return {
        domain,
        expirationDate,
        daysUntilExpiration,
        needsWarning: daysUntilExpiration <= this.warningDays
      };
    } catch (error) {
      console.error(`Error checking domain ${domain}:`, error);
      return {
        domain,
        error: error.message
      };
    }
  }

  calculateDaysUntilExpiration(expirationDate) {
    const today = new Date();
    const diffTime = expirationDate - today;
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  }
} 