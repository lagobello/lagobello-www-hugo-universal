+++
title = "Contact"
id = "contact"
+++

# We are here to help you

Are you curious about something?

Please feel free to contact us—our customer service center is here for you **24 / 7**.

If you are in the Brownsville area looking for a beautiful property for your home or investment, look no further!

**Dial:** [+1 (956) 305-LAGO, +1 (956) 305-5246](tel:+19563055246)  
**Email:** [info@lagobello.com](mailto:info@lagobello.com)

## For Sales, Contact Our Realtors

<div id="realtors-list" class="row">
    <div class="col-md-12 text-center">Loading realtors...</div>
</div>

<script>
    document.addEventListener("DOMContentLoaded", function() {
        fetch('/data/lots.json')
            .then(response => response.json())
            .then(data => {
                const uniqueAgents = {};
                // Logos mapping copied from lots-table.js
                const companyLogos = {
                    'coldwell banker': 'coldwell-banker-logo.svg',
                    'keller williams': 'keller-williams-logo.svg',
                    'liz realty': 'liz-realty-logo.jpg',
                    'spi realty': 'spi-realty-logo.png'
                };

                data.forEach(lot => {
                    const agentName = lot["Listing Agent"];
                    // Filter out nulls and FSBO
                    if (agentName && agentName !== "For Sale By Owner" && !uniqueAgents[agentName]) {
                        uniqueAgents[agentName] = {
                            name: agentName,
                            phone: lot["Listing Agent Phone Number"],
                            firm: lot["Listing Firm"]
                        };
                    }
                });

                const container = document.getElementById('realtors-list');
                container.innerHTML = '';

                if (Object.keys(uniqueAgents).length === 0) {
                     container.innerHTML = '<div class="col-md-12 text-center">No agents currently found.</div>';
                     return;
                }

                Object.values(uniqueAgents).forEach(agent => {
                    let logoHtml = '';
                    if (agent.firm) {
                        const lowerFirm = agent.firm.toLowerCase();
                         let logoFile = null;
                         for (const key in companyLogos) {
                             if (lowerFirm.includes(key)) {
                                 logoFile = companyLogos[key];
                                 break;
                             }
                         }
                         if (logoFile) {
                             logoHtml = `<img src="/img/realtors/${logoFile}" alt="${agent.firm}" class="img-responsive" style="max-height: 60px; margin: 0 auto;">`;
                         } else {
                             logoHtml = `<h5 style="margin-bottom: 0;">${agent.firm}</h5>`;
                         }
                    }

                    // Format phone number
                    let phoneDisplay = agent.phone ? String(agent.phone).replace(/\D/g, '') : '';
                    // Remove leading 1 if 11 digits
                    if (phoneDisplay.length === 11 && phoneDisplay.startsWith('1')) {
                        phoneDisplay = phoneDisplay.substring(1);
                    }
                    const phoneLink = phoneDisplay.length === 10 ? '+1' + phoneDisplay : phoneDisplay;
                    
                    if (phoneDisplay.length === 10) {
                         phoneDisplay = '(' + phoneDisplay.substring(0, 3) + ') ' + phoneDisplay.substring(3, 6) + '-' + phoneDisplay.substring(6);
                    }

                    const agentHtml = `
                        <div class="col-md-4 col-sm-6 text-center" style="margin-bottom: 30px;">
                            <div class="box-simple" style="padding: 20px; border: 1px solid #eee; height: 100%; display: flex; flex-direction: column; justify-content: space-between; align-items: center;">
                                <div style="min-height: 60px; display: flex; align-items: center; margin-bottom: 15px;">
                                    ${logoHtml}
                                </div>
                                <h4 style="margin: 0 0 15px 0;">${agent.name}</h4>
                                <a href="tel:${phoneLink}" class="btn btn-template-main"><i class="fas fa-phone"></i> ${phoneDisplay}</a>
                            </div>
                        </div>
                    `;
                    container.innerHTML += agentHtml;
                });
            })
            .catch(error => {
                console.error('Error fetching realtors:', error);
                document.getElementById('realtors-list').innerHTML = '<div class="col-md-12 text-center">Error loading realtors.</div>';
            });
    });
</script>
