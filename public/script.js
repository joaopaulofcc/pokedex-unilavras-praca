// A função principal é envolvida por este 'listener' para garantir que o JavaScript
// só será executado depois que todo o HTML da página for carregado.
document.addEventListener('DOMContentLoaded', () => {

    // --- SELETORES DE ELEMENTOS E CONSTANTES GLOBAIS ---
    const grid = document.getElementById('pokedex-grid');
    const template = document.getElementById('card-template');
    const testControls = document.querySelector('.test-controls');
    const testNewButton = document.getElementById('test-new');
    const testDuplicateButton = document.getElementById('test-duplicate');
    const testResetButton = document.getElementById('test-reset');
    const testCompleteButton = document.getElementById('test-complete');
    const capturedCountElement = document.getElementById('captured-count');
    const totalCountElement = document.getElementById('total-count');
    const muteButton = document.getElementById('mute-button');
    const toggleTestButton = document.getElementById('toggle-test-mode');
    const completionBanner = document.getElementById('completion-banner');
    const closeBannerButton = document.getElementById('close-banner-button');

    const totalPokemon = 151;
    const STORAGE_KEY = 'unilavrasPokedexState';

    // --- VARIÁVEIS DE ESTADO ---
    let capturedCount = 0;
    let isMuted = false;
    let completionMusic;

    // --- LÓGICA DE INICIALIZAÇÃO DA PÁGINA ---
    function initialize() {
        setupMuteButton();
        setupTestModeToggleButton();
        setupCloseBannerButton();
        generateGrid();
        loadState();
        updateCounter();
        console.log('Aplicação Pokédex iniciada com sucesso!');
    }
    
    // --- FUNÇÕES DE CONFIGURAÇÃO INICIAL ---

    function setupMuteButton() {
        muteButton.classList.add('unmuted');
        muteButton.addEventListener('click', () => {
            isMuted = !isMuted;
            muteButton.classList.toggle('muted', isMuted);
            muteButton.classList.toggle('unmuted', !isMuted);
            console.log(`Som ${isMuted ? 'desativado' : 'ativado'}.`);
        });
    }

    function setupTestModeToggleButton() {
        toggleTestButton.addEventListener('click', () => {
            const isVisible = testControls.style.display === 'block';
            testControls.style.display = isVisible ? 'none' : 'block';
        });
    }
    
    function setupCloseBannerButton() {
        closeBannerButton.addEventListener('click', () => {
            completionBanner.classList.add('hidden');
            document.body.classList.remove('pokedex-complete');
            if (completionMusic) {
                completionMusic.pause();
                completionMusic.currentTime = 0;
            }
        });
    }

    function generateGrid() {
        for (let i = 1; i <= totalPokemon; i++) {
            const clone = template.content.cloneNode(true);
            const card = clone.querySelector('.pokemon-card');
            card.dataset.id = i;
            card.querySelector('.pokemon-silhouette').src = `https://gearoid.me/pokemon/images/artwork/${i}.png`;
            card.querySelector('.pokemon-id').textContent = `#${i.toString().padStart(3, '0')}`;
            grid.appendChild(card);
        }
    }

    // --- FUNÇÕES DE PERSISTÊNCIA DE DADOS (localStorage) ---

    function saveState() {
        const capturedIds = [];
        document.querySelectorAll('.pokemon-card.captured').forEach(card => {
            capturedIds.push(card.dataset.id);
        });
        localStorage.setItem(STORAGE_KEY, JSON.stringify(capturedIds));
    }

    function loadState() {
        const savedIds = JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
        if (savedIds.length > 0) {
            savedIds.forEach(id => {
                const card = document.querySelector(`.pokemon-card[data-id='${id}']`);
                if (card && !card.classList.contains('captured')) {
                    card.classList.add('captured');
                    card.querySelector('.pokemon-img').src = `https://gearoid.me/pokemon/images/artwork/${id}.png`;
                    card.querySelector('.pokemon-name').textContent = POKEMON_NAMES[id - 1];
                }
            });
            capturedCount = savedIds.length;
        }
    }
    
    // --- FUNÇÕES DE LÓGICA E ANIMAÇÃO ---

    function updateCounter() {
        capturedCountElement.textContent = capturedCount;
        totalCountElement.textContent = totalPokemon;
    }
    
    function playPokemonCry(pokemonName) {
        if (isMuted) return;
        const sanitizedName = pokemonName.toLowerCase().replace('♀', 'f').replace('♂', 'm').replace(/[. ']/g, ''); 
        const audio = new Audio(`https://play.pokemonshowdown.com/audio/cries/${sanitizedName}.mp3`);
        audio.play().catch(error => console.warn(`Áudio para ${pokemonName} não encontrado.`));
    }

    function playCompletionMusic() {
        if (isMuted) return;
        const victoryUrl = 'https://eta.vgmtreasurechest.com/soundtracks/pokemon-game-boy-pok-mon-sound-complete-set-play-cd/vfywpihuos/1-01.%20Opening.mp3';
        completionMusic = new Audio(victoryUrl);
        completionMusic.play().catch(error => console.warn('Não foi possível tocar a música de vitória.', error));

        setTimeout(() => {
            if (completionMusic) {
                completionMusic.pause();
                completionMusic.currentTime = 0;
            }
        }, 10000);
    }
    
    function showHighlightAnimation(id, name, originalCard) {
        const rect = originalCard.getBoundingClientRect();
        const highlightNode = document.createElement('div');
        highlightNode.className = 'pokemon-highlight';
        const bannerNode = document.createElement('div');
        bannerNode.className = 'highlight-banner';
        bannerNode.innerHTML = `Novo Pokémon Capturado!`;
        highlightNode.innerHTML = `
            <div class="card-back">
                <img src="https://gearoid.me/pokemon/images/artwork/${id}.png" class="pokemon-img" alt="${name}">
                <p class="highlight-name">${name}</p>
            </div>`;
        highlightNode.style.cssText = `width: ${rect.width}px; height: ${rect.height}px; top: ${rect.top}px; left: ${rect.left}px;`;
        document.body.appendChild(highlightNode);
        document.body.appendChild(bannerNode);
        setTimeout(() => {
            highlightNode.style.cssText += `width: 350px; height: 490px; top: calc(50% - 245px); left: calc(50% - 175px); transform: scale(1.1);`;
            bannerNode.style.top = '20px';
            bannerNode.style.opacity = '1';
        }, 50);
        setTimeout(() => {
            highlightNode.style.cssText += `width: ${rect.width}px; height: ${rect.height}px; top: ${rect.top}px; left: ${rect.left}px; transform: scale(1); box-shadow: none;`;
            bannerNode.style.top = '-150px';
            bannerNode.style.opacity = '0';
        }, 2000);
        highlightNode.addEventListener('transitionend', () => {
            if (highlightNode.style.transform === 'scale(1)') {
                highlightNode.remove();
                bannerNode.remove();
            }
        });
    }

    function triggerPokedexCompletionCelebration() {
        console.log('🎉 POKÉDEX COMPLETA! INICIANDO CELEBRAÇÃO! 🎉');
        playCompletionMusic();
        document.body.classList.add('pokedex-complete');
        completionBanner.classList.remove('hidden');
        document.querySelectorAll('.pokemon-card').forEach((card, index) => {
            setTimeout(() => { card.classList.add('wave-animate'); }, index * 15);
        });
        launchConfetti();
    }

    function handlePokemonAction(data) {
        const targetCard = document.querySelector(`.pokemon-card[data-id='${data.id}']`);
        if (!targetCard) return;
        playPokemonCry(data.name);
        switch (data.action) {
            case 'new_capture':
                if (targetCard.classList.contains('captured')) {
                    handlePokemonAction({ ...data, action: 'duplicate_capture' });
                    return;
                }
                showHighlightAnimation(data.id, data.name, targetCard);
                setTimeout(() => {
                    targetCard.querySelector('.pokemon-img').src = `https://gearoid.me/pokemon/images/artwork/${data.id}.png`;
                    targetCard.querySelector('.pokemon-name').textContent = data.name;
                    targetCard.classList.add('captured');
                    capturedCount++;
                    updateCounter();
                    saveState();
                    if (capturedCount === totalPokemon) {
                        triggerPokedexCompletionCelebration();
                    }
                }, 500);
                break;
            case 'duplicate_capture':
                if (!targetCard.classList.contains('captured')) return;
                targetCard.classList.add('glow');
                setTimeout(() => { targetCard.classList.remove('glow'); }, 1500);
                break;
        }
    }
    
    function launchConfetti() {
        if (typeof confetti !== 'function') return;
        const colors = ['#009DE0', '#FFFFFF', '#021D34'];
        confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 }, colors: colors });
        setTimeout(() => {
            confetti({ particleCount: 150, angle: 60, spread: 55, origin: { x: 0 }, colors: colors });
            confetti({ particleCount: 150, angle: 120, spread: 55, origin: { x: 1 }, colors: colors });
        }, 400);
    }

    const POKEMON_NAMES = ["Bulbasaur", "Ivysaur", "Venusaur", "Charmander", "Charmeleon", "Charizard", "Squirtle", "Wartortle", "Blastoise", "Caterpie", "Metapod", "Butterfree", "Weedle", "Kakuna", "Beedrill", "Pidgey", "Pidgeotto", "Pidgeot", "Rattata", "Raticate", "Spearow", "Fearow", "Ekans", "Arbok", "Pikachu", "Raichu", "Sandshrew", "Sandslash", "Nidoran♀", "Nidorina", "Nidoqueen", "Nidoran♂", "Nidorino", "Nidoking", "Clefairy", "Clefable", "Vulpix", "Ninetales", "Jigglypuff", "Wigglytuff", "Zubat", "Golbat", "Oddish", "Gloom", "Vileplume", "Paras", "Parasect", "Venonat", "Venomoth", "Diglett", "Dugtrio", "Meowth", "Persian", "Psyduck", "Golduck", "Mankey", "Primeape", "Growlithe", "Arcanine", "Poliwag", "Poliwhirl", "Poliwrath", "Abra", "Kadabra", "Alakazam", "Machop", "Machoke", "Machamp", "Bellsprout", "Weepinbell", "Victreebel", "Tentacool", "Tentacruel", "Geodude", "Graveler", "Golem", "Ponyta", "Rapidash", "Slowpoke", "Slowbro", "Magnemite", "Magneton", "Farfetch'd", "Doduo", "Dodrio", "Seel", "Dewgong", "Grimer", "Muk", "Shellder", "Cloyster", "Gastly", "Haunter", "Gengar", "Onix", "Drowzee", "Hypno", "Krabby", "Kingler", "Voltorb", "Electrode", "Exeggcute", "Exeggutor", "Cubone", "Marowak", "Hitmonlee", "Hitmonchan", "Lickitung", "Koffing", "Weezing", "Rhyhorn", "Rhydon", "Chansey", "Tangela", "Kangaskhan", "Horsea", "Seadra", "Goldeen", "Seaking", "Staryu", "Starmie", "Mr. Mime", "Scyther", "Jynx", "Electabuzz", "Magmar", "Pinsir", "Tauros", "Magikarp", "Gyarados", "Lapras", "Ditto", "Eevee", "Vaporeon", "Jolteon", "Flareon", "Porygon", "Omanyte", "Omastar", "Kabuto", "Kabutops", "Aerodactyl", "Snorlax", "Articuno", "Zapdos", "Moltres", "Dratini", "Dragonair", "Dragonite", "Mewtwo", "Mew"];

    // --- LÓGICA DOS BOTÕES DE TESTE ---
    testNewButton.addEventListener('click', () => {
        const uncapturedCards = document.querySelectorAll('.pokemon-card:not(.captured)');
        if (uncapturedCards.length === 0) {
            alert('Parabéns! Todos os Pokémon já foram capturados!');
            if (!document.body.classList.contains('pokedex-complete')) triggerPokedexCompletionCelebration();
            return;
        }
        const randomCard = uncapturedCards[Math.floor(Math.random() * uncapturedCards.length)];
        const id = parseInt(randomCard.dataset.id);
        const name = POKEMON_NAMES[id - 1];
        handlePokemonAction({ id, name, action: 'new_capture' });
    });
    testDuplicateButton.addEventListener('click', () => {
        const capturedCards = document.querySelectorAll('.pokemon-card.captured');
        if (capturedCards.length === 0) { alert('Capture um Pokémon primeiro para testar a duplicata.'); return; }
        const randomCapturedCard = capturedCards[Math.floor(Math.random() * capturedCards.length)];
        const id = parseInt(randomCapturedCard.dataset.id);
        const name = randomCapturedCard.querySelector('.pokemon-name').textContent;
        handlePokemonAction({ id, name, action: 'duplicate_capture' });
    });
    testResetButton.addEventListener('click', () => {
        if (confirm('Tem certeza que deseja zerar toda a Pokédex? O progresso será perdido.')) {
            localStorage.removeItem(STORAGE_KEY);
            location.reload(); 
        }
    });
    testCompleteButton.addEventListener('click', () => {
        if (confirm('Tem certeza que deseja completar a Pokédex?')) {
            document.querySelectorAll('.pokemon-card:not(.captured)').forEach(card => {
                const id = parseInt(card.dataset.id);
                const name = POKEMON_NAMES[id - 1];
                card.querySelector('.pokemon-img').src = `https://gearoid.me/pokemon/images/artwork/${id}.png`;
                card.querySelector('.pokemon-name').textContent = name;
                card.classList.add('captured');
            });
            capturedCount = 151;
            updateCounter();
            saveState();
            if (!document.body.classList.contains('pokedex-complete')) triggerPokedexCompletionCelebration();
        }
    });
    
    // --- LÓGICA PARA O EVENTO FINAL (agora com a conexão correta) ---
    // Para o evento real, comente a lógica dos botões de teste acima e descomente esta seção.
    
    /*
    console.log('Iniciando conexão WebSocket para o evento...');
    
    // CORREÇÃO: Constrói a URL do WebSocket dinamicamente a partir da URL da página.
    const host = window.location.host;
    const protocol = window.location.protocol === 'https:' ? 'wss' : 'ws';
    const wsUrl = `${protocol}://${host}`;

    console.log(`Conectando ao servidor WebSocket em: ${wsUrl}`);
    const ws = new WebSocket(wsUrl); 

    let pingInterval;

    ws.onopen = () => { 
        console.log('✅ Conexão com o servidor estabelecida!');
        pingInterval = setInterval(() => {
            if (ws.readyState === WebSocket.OPEN) {
                ws.send(JSON.stringify({ type: 'ping' }));
            }
        }, 25000);
    };
    ws.onmessage = (event) => {
        try { 
            const data = JSON.parse(event.data);
            if (data.type === 'pong') return; // Ignora as respostas de pong.
            handlePokemonAction(data); 
        } catch (e) { 
            console.error('Erro ao processar dados do servidor:', e);
        }
    };
    ws.onclose = () => { 
        console.warn('❌ Conexão com o servidor foi fechada.');
        clearInterval(pingInterval);
    };
    ws.onerror = (error) => { 
        console.error('🔥 Erro no WebSocket.', error);
        clearInterval(pingInterval);
    };
    */

    // --- INICIA A APLICAÇÃO ---
    initialize();
});