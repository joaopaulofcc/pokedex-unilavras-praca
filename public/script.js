// ================================================
// SCRIPT DA POKÉDEX INTERATIVA DO UNILAVRAS
// -----------------------------------------------
// Este script cria e gerencia a exibição dos cards
// dos Pokémon, controla eventos como capturas, som,
// animações, WebSocket e rolagem automática.
// Ele é escrito em JavaScript moderno e se conecta
// a um servidor WebSocket para receber atualizações.
// Ideal para iniciantes entenderem como interações
// com HTML, CSS e dados podem ser feitas.
// ================================================

// Espera o carregamento completo da página para iniciar o script
document.addEventListener('DOMContentLoaded', () => {

// Define se a aplicação está no modo ao vivo (true) ou teste (false)
    const IS_LIVE_MODE = true; 

// Pega o elemento HTML onde os cards dos Pokémon serão inseridos
    const grid = document.getElementById('pokedex-grid');
// Pega o template de card para clonarmos para cada Pokémon
    const template = document.getElementById('card-template');
// Pega a área dos botões de teste (nova captura, reset, etc.)
    const testControls = document.querySelector('.test-controls');
// Botão para simular a captura de um novo Pokémon (modo teste)
    const testNewButton = document.getElementById('test-new');
// Botão para simular a captura duplicada de um Pokémon (modo teste)
    const testDuplicateButton = document.getElementById('test-duplicate');
// Botão para apagar todo o progresso da Pokédex (modo teste)
    const testResetButton = document.getElementById('test-reset');
// Botão para simular a Pokédex completa instantaneamente (modo teste)
    const testCompleteButton = document.getElementById('test-complete');
// Elemento HTML onde mostramos o número de Pokémon capturados
    const capturedCountElement = document.getElementById('captured-count');
// Elemento HTML onde mostramos o total de Pokémon existentes
    const totalCountElement = document.getElementById('total-count');
// Botão para ativar/desativar o som
    const muteButton = document.getElementById('mute-button');
// Botão que ativa/desativa os controles de teste
    const toggleTestButton = document.getElementById('toggle-test-mode');
// Banner que aparece quando o jogador completa a Pokédex
    const completionBanner = document.getElementById('completion-banner');
// Botão para fechar o banner de Pokédex completa
    const closeBannerButton = document.getElementById('close-banner-button');

// Define o número total de Pokémon usados na Pokédex
    const totalPokemon = 151;
// Chave usada para salvar o progresso no navegador
    const STORAGE_KEY = 'unilavrasPokedexState';

// Guarda a quantidade de Pokémon capturados pelo jogador
    let capturedCount = 0;
// Variável que indica se o som está desligado
    let isMuted = false;
// Variável para controlar a música final de comemoração
    let completionMusic;
// Variável que guarda o timer da rolagem automática
    let autoScrollTimeout = null; // Variável para controlar o auto-scroll

// Função principal que inicia toda a lógica da Pokédex
    function initialize() {
// Inicializa o botão de som
        setupMuteButton();
// Inicializa o botão que ativa o modo de testes
        setupTestModeToggleButton();
// Inicializa o botão de fechar o banner final
        setupCloseBannerButton();
// Gera todos os cards de Pokémon automaticamente
        generateGrid();
// Carrega o progresso salvo no navegador (quais Pokémon já foram capturados)
        loadState();
// Atualiza o número de capturas na tela
        updateCounter();

// Se o modo for ao vivo, conecta ao servidor WebSocket
        if (IS_LIVE_MODE) {
// Função que inicia a conexão com o servidor WebSocket
            connectWebSocket();
        } else {
// Se estiver em modo teste, inicializa os botões de simulação
            setupTestButtons(); 
        }
        
        console.log(`Aplicação iniciada em modo ${IS_LIVE_MODE ? 'AO VIVO' : 'DE TESTE'}.`);

        // Inicia o auto-scroll após um breve delay quando a página carrega
// Começa a rolagem automática da tela
        startAutoScroll();
    }
    
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
        if (toggleTestButton) {
            toggleTestButton.addEventListener('click', () => {
                const isVisible = testControls.style.display === 'block';
                testControls.style.display = isVisible ? 'none' : 'block';
            });
        }
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

    function connectWebSocket() {
        if (toggleTestButton) {
            toggleTestButton.style.display = 'none';
        }
        console.log('Iniciando conexão WebSocket para o evento...');
        
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
                if (data.type === 'pong') {
                    console.log('Pong recebido do servidor.');
                    return; 
                }
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
    }
    
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
            if (capturedCount === totalPokemon) {
                document.body.classList.add('pokedex-complete');
                completionBanner.classList.remove('hidden');
            }
        }
    }
    
    function updateCounter() {
        capturedCountElement.textContent = capturedCount;
        totalCountElement.textContent = totalPokemon;
    }

    function playPokemonCry(pokemonName) {
        if (isMuted) return;
        const sanitizedName = pokemonName.toLowerCase().replace('♀', 'f').replace('♂', 'm').replace(/[. ']/g, '');
        const audio = new Audio(`https://play.pokemonshowdown.com/audio/cries/${sanitizedName}.mp3`);
        audio.play().catch(error => console.warn(`Áudio para ${pokemonName} não encontrado ou bloqueado pelo navegador.`, error));
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
    
    function showHighlightAnimation(id, name, originalCard, bannerText) {
        const rect = originalCard.getBoundingClientRect();
        
        const highlightNode = document.createElement('div');
        highlightNode.className = 'pokemon-highlight';
        highlightNode.innerHTML = `
            <div class="card-back">
                <img src="https://gearoid.me/pokemon/images/artwork/${id}.png" class="pokemon-img" alt="${name}">
            </div>`;

        const bannerNode = document.createElement('div');
        bannerNode.className = 'highlight-banner';
        bannerNode.textContent = bannerText;

        highlightNode.style.cssText = `width: ${rect.width}px; height: ${rect.height}px; top: ${rect.top}px; left: ${rect.left}px; transform: scale(1);`;
        
        document.body.appendChild(highlightNode);
        document.body.appendChild(bannerNode);

        setTimeout(() => {
            const targetX = `calc(50vw - ${rect.width / 2}px - ${rect.left}px)`;
            const targetY = `calc(50vh - ${rect.height / 2}px - ${rect.top}px)`;
            const scale = 350 / rect.width;
            highlightNode.style.transform = `translate(${targetX}, ${targetY}) scale(${scale})`;
            bannerNode.style.top = '20px';
            bannerNode.style.opacity = '1';
        }, 50);

        const nameNode = document.createElement('div');
        nameNode.className = 'pokemon-name-separate';
        nameNode.textContent = name;
        document.body.appendChild(nameNode);
        
        setTimeout(() => {
            nameNode.style.opacity = '1';
            nameNode.style.transform = 'translate(-50%, 0)';
        }, 500);

        setTimeout(() => {
            highlightNode.style.transform = `translate(0, 0) scale(1)`;
            highlightNode.style.opacity = '0';
            bannerNode.style.top = '-150px';
            bannerNode.style.opacity = '0';
            nameNode.style.opacity = '0';
        }, 2500);

        setTimeout(() => {
            highlightNode.remove();
            bannerNode.remove();
            nameNode.remove();
        }, 3300);
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
        stopAutoScroll(); // Para a rolagem automática ao capturar um pokémon

        const isNewCapture = !targetCard.classList.contains('captured');

        if (data.action === 'new_capture' && isNewCapture) {
            showHighlightAnimation(data.id, data.name, targetCard, 'Novo Pokémon Capturado!');
            
            setTimeout(() => {
                targetCard.querySelector('.pokemon-img').src = `https://gearoid.me/pokemon/images/artwork/${data.id}.png`;
                targetCard.querySelector('.pokemon-name').textContent = data.name;
                targetCard.classList.add('captured');
                capturedCount++;
// Atualiza o número de capturas na tela
                updateCounter();
                saveState();
                if (capturedCount === totalPokemon) {
                    triggerPokedexCompletionCelebration();
                }
            }, 500);

        } else {
            showHighlightAnimation(data.id, data.name, targetCard, 'Captura Duplicada!');
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

    function setupTestButtons() {
        if (toggleTestButton) {
            toggleTestButton.style.display = 'flex'; 
        }
        
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
// Atualiza o número de capturas na tela
                updateCounter();
                saveState();
                if (!document.body.classList.contains('pokedex-complete')) triggerPokedexCompletionCelebration();
            }
        });
    }

    // --- LÓGICA DE AUTO-SCROLL ---

    /**
     * Para a rolagem automática da página.
     */
    function stopAutoScroll() {
        if (autoScrollTimeout) {
            clearTimeout(autoScrollTimeout);
            autoScrollTimeout = null;
            console.log('Auto-scroll interrompido pela interação do usuário.');
        }
    }

    /**
     * Inicia um ciclo de rolagem suave para baixo e para cima.
     */
    function startAutoScroll() {
        stopAutoScroll(); // Garante que não haja ciclos duplicados

        // Você pode ajustar estes valores
        const PAUSE_AT_TOP_BOTTOM = 4000; // 4 segundos de pausa
        const SCROLL_SPEED_FACTOR = 1.2; // Aumente para uma rolagem mais LENTA, diminua para mais RÁPIDA

        function scrollLoop() {
            const scrollHeight = document.body.scrollHeight;
            const viewportHeight = window.innerHeight;
            const scrollDistance = scrollHeight - viewportHeight;
            
            // Estima a duração da rolagem baseada na distância
            const scrollDuration = scrollDistance * SCROLL_SPEED_FACTOR;

            // Rola para o final
            window.scrollTo({ top: scrollHeight, behavior: 'smooth' });

            // Agenda a rolagem para o topo
            autoScrollTimeout = setTimeout(() => {
                window.scrollTo({ top: 0, behavior: 'smooth' });

                // Agenda o reinício do ciclo
                autoScrollTimeout = setTimeout(scrollLoop, scrollDuration + PAUSE_AT_TOP_BOTTOM);
            }, scrollDuration + PAUSE_AT_TOP_BOTTOM);
        }

        console.log('Iniciando auto-scroll...');
        autoScrollTimeout = setTimeout(scrollLoop, PAUSE_AT_TOP_BOTTOM);
    }

    // Adiciona "ouvintes" para parar o auto-scroll com qualquer interação
    window.addEventListener('wheel', stopAutoScroll, { passive: true });
    window.addEventListener('touchstart', stopAutoScroll, { passive: true });
    window.addEventListener('mousedown', stopAutoScroll);


    // --- INICIA A APLICAÇÃO ---
    initialize();
});