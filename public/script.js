/**
 * Load domain status data from cache
 */
async function loadDashboard() {
    try {
        const response = await fetch('/api/domains/status');
        const domains = await response.json();
        
        const dashboard = document.getElementById('dashboard');
        dashboard.innerHTML = '';
        
        if (domains.length === 0) {
            dashboard.innerHTML = '<div class="no-data">No domain data available. Please add domains in the configuration and wait for the first check to complete.</div>';
            toast.warning('No Data', 'No domain data available. Please add domains in the configuration.');
            return;
        }
        
        domains.forEach(domain => {
            dashboard.appendChild(createDomainCard(domain));
        });
        
        // Show summary toast
        const expiringSoon = domains.filter(d => d.needsWarning).length;
        if (expiringSoon > 0) {
            toast.warning('Domains Expiring Soon', `${expiringSoon} domain${expiringSoon > 1 ? 's' : ''} will expire soon`);
        } else {
            toast.success('Domains Checked', 'All domains are in good standing');
        }
    } catch (error) {
        console.error('Error loading dashboard:', error);
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
        console.log(`🔍 WHOIS details requested for domain: ${domain}`);
        console.time(`WHOIS query for ${domain}`);
        
        toast.info('Loading...', `Fetching WHOIS data for ${domain}`);
        
        const response = await fetch(`/api/domains/${encodeURIComponent(domain)}/whois`);
        const data = await response.json();

        console.timeEnd(`WHOIS query for ${domain}`);
        console.log('\n====================================================');
        console.log(`🌐 WHOIS DETAILS FOR: ${domain.toUpperCase()}`);
        console.log('====================================================');
        
        // Log key information separately for quick reference
        if (data.domainName) console.log(`Domain Name: ${data.domainName}`);
        if (data.registrar) console.log(`Registrar: ${data.registrar}`);
        if (data.registrarUrl) console.log(`Registrar URL: ${data.registrarUrl}`);
        if (data.updatedDate) console.log(`Updated Date: ${data.updatedDate}`);
        if (data.creationDate) console.log(`Creation Date: ${data.creationDate}`);
        if (data.expirationDate || data.registryExpiryDate || data.expiresOn) {
            console.log(`Expiration Date: ${data.expirationDate || data.registryExpiryDate || data.expiresOn}`);
        }
        if (data.nameServers) console.log(`Name Servers: ${data.nameServers}`);
        
        // Log the full response
        console.log('\nFull WHOIS Response:');
        console.log(data);
        console.log('====================================================\n');
        
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
        
        const closeBtn = modal.querySelector('.close');
        closeBtn.onclick = () => {
            console.log(`🔍 WHOIS details modal closed for: ${domain}`);
            modal.remove();
        };
        
        window.onclick = (event) => {
            if (event.target === modal) {
                console.log(`🔍 WHOIS details modal closed for: ${domain}`);
                modal.remove();
            }
        };
    } catch (error) {
        console.error(`❌ Error loading WHOIS details for ${domain}:`, error);
        toast.error('WHOIS Error', `Failed to load details for ${domain}`);
    }
}

// Load dashboard when page loads
document.addEventListener('DOMContentLoaded', loadDashboard); 