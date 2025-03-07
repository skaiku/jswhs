let currentConfig = null;

async function loadConfig() {
    try {
        const response = await fetch('/api/config');
        const data = await response.json();
        currentConfig = data;
        
        // Fill in the form
        document.getElementById('ntfyUrl').value = data.config.ntfy.url;
        document.getElementById('priority').value = data.config.ntfy.priority;
        document.getElementById('checkInterval').value = data.config.checkInterval;
        document.getElementById('warningDays').value = data.config.warningDays;
        
        // Load domains
        const domainsList = document.getElementById('domains-list');
        domainsList.innerHTML = '';
        data.domains.domains.forEach(domain => {
            addDomainToList(domain);
        });
    } catch (error) {
        console.error('Error loading config:', error);
        alert('Error loading configuration');
    }
}

function addDomain(domain = '') {
    const domainEntry = document.createElement('div');
    domainEntry.className = 'domain-entry';
    domainEntry.innerHTML = `
        <input type="text" class="domain-input" value="${domain}" placeholder="example.com">
        <button onclick="this.parentElement.remove()" class="btn-remove">Remove</button>
    `;
    document.getElementById('domains-list').appendChild(domainEntry);
}

function addDomainToList(domain) {
    addDomain(domain);
}

async function saveConfig() {
    const config = {
        ntfy: {
            url: document.getElementById('ntfyUrl').value,
            priority: document.getElementById('priority').value
        },
        checkInterval: document.getElementById('checkInterval').value,
        warningDays: parseInt(document.getElementById('warningDays').value)
    };

    const domains = {
        domains: Array.from(document.getElementsByClassName('domain-input'))
            .map(input => input.value.trim())
            .filter(domain => domain !== '')
    };

    try {
        const response = await fetch('/api/config', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ config, domains })
        });

        if (response.ok) {
            alert('Configuration saved successfully');
        } else {
            throw new Error('Failed to save configuration');
        }
    } catch (error) {
        console.error('Error saving config:', error);
        alert('Error saving configuration');
    }
}

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
            return;
        }
        
        domains.forEach(domain => {
            dashboard.appendChild(createDomainCard(domain));
        });
    } catch (error) {
        console.error('Error loading dashboard:', error);
        alert('Error loading domain status');
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
        const response = await fetch(`/api/domains/${encodeURIComponent(domain)}/whois`);
        const data = await response.json();
        
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
        closeBtn.onclick = () => modal.remove();
        
        window.onclick = (event) => {
            if (event.target === modal) {
                modal.remove();
            }
        };
    } catch (error) {
        console.error('Error loading WHOIS details:', error);
        alert('Error loading domain details');
    }
}

// Load config when page loads
document.addEventListener('DOMContentLoaded', loadConfig);

// Load dashboard when page loads
document.addEventListener('DOMContentLoaded', loadDashboard); 