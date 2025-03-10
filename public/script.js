/**
 * Client-side logging function
 * @param {string} level - Log level
 * @param {string} message - Log message
 * @param {...any} args - Additional arguments
 */
function log(level, message, ...args) {
  const timestamp = new Date().toISOString();
  const formattedMessage = `[${timestamp}] [${level.toUpperCase()}] ${message}`;
  
  switch (level) {
    case 'debug':
      console.debug(formattedMessage, ...args);
      break;
    case 'info':
      console.info(formattedMessage, ...args);
      break;
    case 'warn':
      console.warn(formattedMessage, ...args);
      break;
    case 'error':
      console.error(formattedMessage, ...args);
      break;
    default:
      console.log(formattedMessage, ...args);
  }
}

/**
 * Load domain status data from cache
 */
async function loadDashboard() {
    try {
        log('info', 'Loading dashboard data');
        const response = await fetch('/api/domains/status');
        const domains = await response.json();
        
        const dashboard = document.getElementById('dashboard');
        dashboard.innerHTML = '';
        
        if (domains.length === 0) {
            log('warn', 'No domain data available');
            dashboard.innerHTML = '<div class="no-data">No domain data available. Please add domains in the configuration and wait for the first check to complete.</div>';
            toast.warning('No Data', 'No domain data available. Please add domains in the configuration.');
            return;
        }
        
        log('info', `Rendering ${domains.length} domain cards`);
        domains.forEach(domain => {
            dashboard.appendChild(createDomainCard(domain));
        });
        
        // Show summary toast
        const expiringSoon = domains.filter(d => d.needsWarning).length;
        if (expiringSoon > 0) {
            log('warn', `${expiringSoon} domains expiring soon`);
            toast.warning('Domains Expiring Soon', `${expiringSoon} domain${expiringSoon > 1 ? 's' : ''} will expire soon`);
        } else {
            log('info', 'All domains in good standing');
            toast.success('Domains Checked', 'All domains are in good standing');
        }
    } catch (error) {
        log('error', 'Error loading dashboard:', error);
        toast.error('Loading Error', 'Failed to load domain status');
    }
}

/**
 * Get emoji based on days until expiration
 */
function getStatusEmoji(daysUntilExpiration) {
    if (daysUntilExpiration <= 7) return '🚨'; // Critical
    if (daysUntilExpiration <= 30) return '⚠️'; // Warning
    return '✅'; // OK
}

/**
 * Create a card for a domain
 */
function createDomainCard(domain) {
    const card = document.createElement('div');
    card.className = 'domain-card';
    
    // Handle error case
    if (domain.error) {
        card.innerHTML = `
            <div class="card-header">
                <h3>${domain.domain}</h3>
                <span class="status-emoji">❌</span>
            </div>
            <div class="card-body">
                <p class="description">${domain.description || ''}</p>
                <p class="error">Error: ${domain.error}</p>
            </div>
            <button onclick="showDetails('${domain.domain}')" class="btn-details">Show Details</button>
        `;
        return card;
    }
    
    const expiryDate = new Date(domain.expirationDate).toLocaleDateString();
    const statusEmoji = getStatusEmoji(domain.daysUntilExpiration);
    
    card.innerHTML = `
        <div class="card-header">
            <h3>${domain.domain}</h3>
            <span class="status-emoji">${statusEmoji}</span>
        </div>
        <div class="card-body">
            <p class="description">${domain.description || ''}</p>
            <p>Expires: ${expiryDate}</p>
            <p>Days remaining: ${domain.daysUntilExpiration}</p>
        </div>
        <button onclick="showDetails('${domain.domain}')" class="btn-details">Show Details</button>
    `;
    
    return card;
}

/**
 * Show WHOIS details for a domain
 */
async function showDetails(domain) {
    try {
        log('info', `WHOIS details requested for domain: ${domain}`);
        console.time(`WHOIS query for ${domain}`);
        
        toast.info('Loading...', `Fetching WHOIS data for ${domain}`);
        
        const response = await fetch(`/api/domains/${encodeURIComponent(domain)}/whois`);
        const data = await response.json();

        console.timeEnd(`WHOIS query for ${domain}`);
        log('info', `WHOIS data received for ${domain}`);
        
        // Log key information separately for quick reference
        if (data.domainName) log('debug', `Domain Name: ${data.domainName}`);
        if (data.registrar) log('debug', `Registrar: ${data.registrar}`);
        if (data.registrarUrl) log('debug', `Registrar URL: ${data.registrarUrl}`);
        if (data.updatedDate) log('debug', `Updated Date: ${data.updatedDate}`);
        if (data.creationDate) log('debug', `Creation Date: ${data.creationDate}`);
        if (data.expirationDate || data.registryExpiryDate || data.expiresOn) {
            log('debug', `Expiration Date: ${data.expirationDate || data.registryExpiryDate || data.expiresOn}`);
        }
        if (data.nameServers) log('debug', `Name Servers: ${data.nameServers}`);
        
        // Log the full response
        log('debug', 'Full WHOIS Response:', data);
        
        const modal = document.createElement('div');
        modal.className = 'modal';
        modal.innerHTML = `
            <div class="modal-content">
                <span class="close">&times;</span>
                <h2>WHOIS Details - ${domain}</h2>
                <pre>${JSON.stringify(data, null, 2)}</pre>
            </div>
        `;
        
        document.body.appendChild(modal);
        log('info', `WHOIS modal opened for ${domain}`);
        
        const closeBtn = modal.querySelector('.close');
        closeBtn.onclick = () => {
            log('info', `WHOIS modal closed for ${domain}`);
            modal.remove();
        };
        
        window.onclick = (event) => {
            if (event.target === modal) {
                log('info', `WHOIS modal closed for ${domain}`);
                modal.remove();
            }
        };
    } catch (error) {
        log('error', `Error loading WHOIS details for ${domain}:`, error);
        toast.error('WHOIS Error', `Failed to load details for ${domain}`);
    }
}

// Load dashboard when page loads
document.addEventListener('DOMContentLoaded', () => {
    log('info', 'Dashboard page loaded');
    loadDashboard();
}); 