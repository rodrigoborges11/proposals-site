document.addEventListener('DOMContentLoaded', () => {
    const grid = document.getElementById('proposalsGrid');
    const searchInput = document.getElementById('searchInput');
    const statsCounter = document.getElementById('statsCounter');
    
    // Main Tabs logic for multiple selection
    const mainTabs = document.querySelectorAll('.main-tab');
    let activeTabs = new Set(['Todas']);

    // Modal elements
    const modal = document.getElementById('proposalModal');
    const closeModalBtn = document.getElementById('closeModal');
    const mTitle = document.getElementById('mTitle');
    const mId = document.getElementById('mId');
    const mStatusBadge = document.getElementById('mStatusBadge');
    
    // UI elements inside modal tabs
    const uiFields = {
        'Enquadramento': { sec: document.getElementById('mEnquadramentoSec'), text: document.getElementById('mEnquadramento') },
        'Objetivos': { sec: document.getElementById('mObjetivosSec'), text: document.getElementById('mObjetivos') },
        'Plano1': { sec: null, text: document.getElementById('mPlano1') },
        'Plano2': { sec: null, text: document.getElementById('mPlano2') },
        'Condicoes': { sec: document.getElementById('mCondicoesSec'), text: document.getElementById('mCondicoes') },
        'Observacoes': { sec: document.getElementById('mObservacoesSec'), text: document.getElementById('mObservacoes') },
        'Atribuicao': { sec: document.getElementById('mAtribuicaoSec'), text: document.getElementById('mAtribuicao') },
        'Especializacoes': { sec: document.getElementById('mEspecializacoesSec'), text: document.getElementById('mEspecializacoes') },
        'Orientadores': { sec: document.getElementById('mOrientadoresSec'), text: document.getElementById('mOrientadores') }
    };

    const mPlanoSec = document.getElementById('mPlanoSec');

    // Data parsing
    let allProposals = [];
    if (typeof proposalsData !== 'undefined' && proposalsData.proposals) {
        allProposals = proposalsData.proposals;
    }

    // Helper function to check if proposal is from a company
    function isEmpresa(p) {
        const academicDomains = ['uc.pt', 'isec.pt', 'up.pt', 'ulisboa.pt', 'ipleiria.pt', 'ipt.pt'];
        const orientadores = p.ordem_orientadores || [];
        for (let o of orientadores) {
            if (o.email) {
                const domain = o.email.split('@').pop().toLowerCase();
                const isAcad = academicDomains.some(acc => domain === acc || domain.endsWith('.' + acc));
                if (!isAcad && domain !== 'ieee.org' && domain !== 'gmail.com' && domain !== 'hotmail.com' && domain !== 'outlook.com') {
                    return true;
                }
            }
        }
        return false;
    }

    // Render cards
    function renderProposals() {
        const query = searchInput.value.toLowerCase();
        
        const filtered = allProposals.filter(p => {
            // Main Tab filter (AND logic: passes if it has ALL of the selected specializations)
            let passesTab = false;
            if (activeTabs.has('Todas')) {
                passesTab = true;
            } else {
                const specs = p.especializacao_proposta || [];
                passesTab = Array.from(activeTabs).every(tab => {
                    if (tab === 'Empresas') {
                        return isEmpresa(p);
                    } else {
                        return specs.some(s => s.nome === tab);
                    }
                });
            }

            // Search query filter
            const titleMatch = (p.titulo || '').toLowerCase().includes(query);
            const titleEnMatch = (p.titulo_en || '').toLowerCase().includes(query);
            const orientadorMatch = (p.ordem_orientadores || []).some(o => (o.nome || '').toLowerCase().includes(query));
            
            return passesTab && (titleMatch || titleEnMatch || orientadorMatch);
        });

        grid.innerHTML = '';
        
        if (filtered.length === 0) {
            grid.innerHTML = '<p style="color: var(--text-secondary); text-align: center; grid-column: 1 / -1; padding: 3rem;">Nenhuma proposta encontrada.</p>';
            statsCounter.textContent = '0 propostas';
            return;
        }

        const selectedStr = activeTabs.has('Todas') ? 'Todas' : Array.from(activeTabs).join(', ');
        statsCounter.textContent = `${filtered.length} propostas listadas (${selectedStr})`;

        filtered.forEach(p => {
            const card = document.createElement('div');
            card.className = 'proposal-card';
            
            const title = p.titulo || 'Sem Título';
            const id = p.codigo_proposta || p.id.substring(0,6);
            
            let supervisorTags = '';
            if (p.ordem_orientadores && p.ordem_orientadores.length > 0) {
                supervisorTags = p.ordem_orientadores.map(o => 
                    `<span class="supervisor-badge">${o.nome}</span>`
                ).join('');
            }
            
            const isAssigned = p.aluno_identificado ? true : false;
            const statusBadge = isAssigned 
                ? `<span class="status-badge" style="background: rgba(239, 68, 68, 0.15); color: #f87171;">Já Atribuído</span>`
                : `<span class="status-badge">Disponível</span>`;

            card.innerHTML = `
                <div class="card-header">
                    <span class="card-id">#${id}</span>
                </div>
                <div class="card-body">
                    <h3 class="card-title">${title}</h3>
                    <div class="supervisor-list">
                        ${supervisorTags}
                    </div>
                </div>
                <div style="margin-top: auto;">
                    ${statusBadge}
                </div>
            `;

            card.addEventListener('click', () => openModal(p));
            grid.appendChild(card);
        });
    }

    // Modal Sub Tabs logic
    const modalTabs = document.querySelectorAll('.modal-tab');
    const modalTabContents = document.querySelectorAll('.modal-tab-content');

    modalTabs.forEach(tab => {
        tab.addEventListener('click', () => {
            modalTabs.forEach(t => t.classList.remove('active'));
            modalTabContents.forEach(c => c.classList.remove('active'));
            tab.classList.add('active');
            const target = tab.getAttribute('data-target');
            document.getElementById(target).classList.add('active');
        });
    });

    function resetModalTabs() {
        modalTabs.forEach(t => t.classList.remove('active'));
        modalTabContents.forEach(c => c.classList.remove('active'));
        if(modalTabs.length > 0) {
            modalTabs[0].classList.add('active');
            document.getElementById(modalTabs[0].getAttribute('data-target')).classList.add('active');
        }
    }

    // Modal Logic
    function openModal(p) {
        resetModalTabs();
        
        mId.textContent = `Proposta #${p.codigo_proposta || p.id.substring(0,6)}`;
        mTitle.textContent = p.titulo || 'Sem Título';
        
        const isAssigned = p.aluno_identificado ? true : false;
        mStatusBadge.innerHTML = isAssigned 
            ? `<span style="color: #f87171;">Estado: Atribuída a ${p.nome_aluno_identificado}</span>`
            : `<span style="color: #34d399;">Estado: Disponível</span>`;
        
        uiFields.Especializacoes.text.innerHTML = '';
        if (p.especializacao_proposta && p.especializacao_proposta.length > 0) {
            p.especializacao_proposta.forEach(esp => {
                const span = document.createElement('span');
                span.className = 'tag';
                span.textContent = esp.nome;
                uiFields.Especializacoes.text.appendChild(span);
            });
            uiFields.Especializacoes.sec.style.display = 'block';
        } else {
            uiFields.Especializacoes.sec.style.display = 'none';
        }

        uiFields.Orientadores.text.innerHTML = '';
        if (p.ordem_orientadores && p.ordem_orientadores.length > 0) {
            p.ordem_orientadores.forEach(o => {
                const span = document.createElement('span');
                span.className = 'tag';
                span.textContent = `${o.nome} (${o.email})`;
                uiFields.Orientadores.text.appendChild(span);
            });
            uiFields.Orientadores.sec.style.display = 'block';
        } else {
            uiFields.Orientadores.sec.style.display = 'none';
        }

        const simpleFields = ['Enquadramento', 'Objetivos', 'Condicoes', 'Observacoes'];
        simpleFields.forEach(k => {
            const val = p[k.toLowerCase()];
            if (val && val.trim() !== '') {
                uiFields[k].sec.style.display = 'block';
                uiFields[k].text.textContent = val.trim();
            } else {
                uiFields[k].sec.style.display = 'none';
            }
        });

        let hasPlano = false;
        ['plano1', 'plano2'].forEach((k, i) => {
            const val = p[k];
            const textEl = uiFields[k === 'plano1' ? 'Plano1' : 'Plano2'].text;
            if (val && val.trim() !== '') {
                textEl.textContent = val.trim();
                textEl.style.display = 'block';
                textEl.previousElementSibling.style.display = 'block'; 
                hasPlano = true;
            } else {
                textEl.style.display = 'none';
                textEl.previousElementSibling.style.display = 'none';
            }
        });
        mPlanoSec.style.display = hasPlano ? 'block' : 'none';

        if (p.aluno_identificado) {
            uiFields.Atribuicao.sec.style.display = 'block';
            uiFields.Atribuicao.text.textContent = `Atribuído a: ${p.nome_aluno_identificado || 'Aluno'} (${p.aluno_identificado})`;
        } else {
            uiFields.Atribuicao.sec.style.display = 'none';
        }

        modal.classList.add('active');
        document.body.style.overflow = 'hidden'; 
    }

    function closeModal() {
        modal.classList.remove('active');
        document.body.style.overflow = '';
    }

    closeModalBtn.addEventListener('click', closeModal);
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            closeModal();
        }
    });
    
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && modal.classList.contains('active')) {
            closeModal();
        }
    });

    // Event listeners for main tabs (Multiple Selection)
    mainTabs.forEach(tab => {
        tab.addEventListener('click', (e) => {
            const spec = e.target.getAttribute('data-spec');
            
            if (spec === 'Todas') {
                activeTabs.clear();
                activeTabs.add('Todas');
            } else {
                activeTabs.delete('Todas');
                if (activeTabs.has(spec)) {
                    activeTabs.delete(spec);
                } else {
                    activeTabs.add(spec);
                }
                
                if (activeTabs.size === 0) {
                    activeTabs.add('Todas');
                }
            }

            // Update UI
            mainTabs.forEach(t => {
                const tSpec = t.getAttribute('data-spec');
                if (activeTabs.has(tSpec)) {
                    t.classList.add('active');
                } else {
                    t.classList.remove('active');
                }
            });

            renderProposals();
        });
    });

    searchInput.addEventListener('input', renderProposals);

    // Initial render
    renderProposals();
});
