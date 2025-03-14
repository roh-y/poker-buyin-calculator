let playerData = [];
const STORAGE_KEY = 'pokerGameHistory';
const CURRENT_GAME_KEY = 'currentPokerGame';
const CHIPS_PER_BUYIN = 200;

function startGame() {
    const numPlayersInput = parseInt(document.getElementById('players').value);
    const savedGame = JSON.parse(localStorage.getItem(CURRENT_GAME_KEY));

    if (savedGame && confirm('Resume saved game?')) {
        playerData = savedGame;
    } else {
        if (numPlayersInput < 8 || numPlayersInput > 12) {
            alert('Please enter a number between 8 and 12');
            return;
        }
        playerData = [];
        for (let i = 1; i <= numPlayersInput; i++) {
            playerData.push({
                name: `Player ${i}`,
                buyIns: 1,
                chips: 0
            });
        }
    }

    const playerInputs = document.getElementById('playerInputs');
    playerInputs.innerHTML = '';

    playerData.forEach((player, index) => {
        const div = document.createElement('div');
        div.className = 'player-row';
        div.innerHTML = `
            <label>Name: <input type="text" value="${player.name}" onchange="updateName(${index}, this.value)"></label>
            <label>Buy-ins: <input type="number" min="1" value="${player.buyIns}" onchange="updateBuyIns(${index}, this.value)"></label>
        `;
        playerInputs.appendChild(div);
    });

    document.getElementById('gameArea').classList.remove('hidden');
    document.getElementById('results').classList.add('hidden');
}

function addPlayer() {
    const playerInputs = document.getElementById('playerInputs');
    const newPlayerIndex = playerData.length;
    playerData.push({
        name: `Player ${newPlayerIndex + 1}`,
        buyIns: 1,
        chips: 0
    });

    const div = document.createElement('div');
    div.className = 'player-row';
    div.innerHTML = `
        <label>Name: <input type="text" value="Player ${newPlayerIndex + 1}" onchange="updateName(${newPlayerIndex}, this.value)"></label>
        <label>Buy-ins: <input type="number" min="1" value="1" onchange="updateBuyIns(${newPlayerIndex}, this.value)"></label>
    `;
    playerInputs.appendChild(div);
}

function updateName(index, name) {
    playerData[index].name = name;
}

function updateBuyIns(index, buyIns) {
    playerData[index].buyIns = parseInt(buyIns);
}

function saveGame() {
    localStorage.setItem(CURRENT_GAME_KEY, JSON.stringify(playerData));
    alert('Game progress saved!');
}

function endGame() {
    const playerInputs = document.getElementById('playerInputs');
    playerInputs.innerHTML = '';

    playerData.forEach((player, index) => {
        const div = document.createElement('div');
        div.className = 'player-row';
        div.innerHTML = `
            <label>${player.name} - Final Chips: 
                <input type="number" min="0" value="0" onchange="updateChips(${index}, this.value)">
            </label>
        `;
        playerInputs.appendChild(div);
    });

    const endButton = document.querySelector('#gameArea button:last-child');
    endButton.textContent = 'Calculate Results';
    endButton.onclick = calculateResults;
    
    document.querySelector('#gameArea button.save').classList.add('hidden');
    document.querySelector('#gameArea button.add').classList.add('hidden');
}

function updateChips(index, chips) {
    playerData[index].chips = parseInt(chips);
}

function calculateResults() {
    let totalPool = 0;
    let totalChipsDistributed = 0;
    playerData.forEach(player => {
        totalPool += player.buyIns * 5;
        totalChipsDistributed += player.buyIns * CHIPS_PER_BUYIN;
    });

    const totalChipsCashedIn = playerData.reduce((sum, p) => sum + p.chips, 0);
    const chipValue = totalPool / (totalChipsCashedIn || 1);
    const chipDifference = totalChipsCashedIn - totalChipsDistributed;

    let resultsHTML = `
        <table>
            <tr>
                <th>Player</th>
                <th>Buy-ins ($5)</th>
                <th>Chips</th>
                <th>Amount Owed/Won</th>
            </tr>
    `;

    let suspiciousPlayers = [];
    if (totalChipsCashedIn !== totalChipsDistributed) {
        playerData.forEach(player => {
            const expectedChips = player.buyIns * CHIPS_PER_BUYIN;
            const chipDiff = Math.abs(player.chips - expectedChips);
            if (chipDiff > totalChipsDistributed * 0.2) {
                suspiciousPlayers.push(player.name);
            }
        });
    }

    playerData.forEach(player => {
        const amountWon = player.chips * chipValue;
        const amountPaid = player.buyIns * 5;
        const difference = amountWon - amountPaid;
        const isSuspicious = suspiciousPlayers.includes(player.name);
        
        resultsHTML += `
            <tr ${isSuspicious ? 'class="suspicious"' : ''}>
                <td>${player.name}</td>
                <td>${player.buyIns}</td>
                <td>${player.chips}</td>
                <td>$${difference.toFixed(2)} ${difference >= 0 ? '(WON)' : '(OWED)'}</td>
            </tr>
        `;
    });

    // Add "DONGA" if there's a chip difference
    if (totalChipsCashedIn !== totalChipsDistributed) {
        const dongaAmount = chipDifference * chipValue;
        resultsHTML += `
            <tr class="donga">
                <td>DONGA (Difference)</td>
                <td>0</td>
                <td>${chipDifference > 0 ? '+' : ''}${chipDifference}</td>
                <td>$${dongaAmount.toFixed(2)}</td>
            </tr>
        `;
    }

    resultsHTML += '</table>';

    if (totalChipsCashedIn !== totalChipsDistributed) {
        resultsHTML = `
            <div class="warning">
                ⚠️ Chip count mismatch! 
                Distributed: ${totalChipsDistributed} chips, 
                Cashed in: ${totalChipsCashedIn} chips,
                Difference: ${chipDifference > 0 ? '+' : ''}${chipDifference} chips.
                ${suspiciousPlayers.length > 0 ? 'Possible errors from: ' + suspiciousPlayers.join(', ') : 'Check all counts.'}
            </div>
        ` + resultsHTML;
    } else {
        resultsHTML = `
            <div class="info">
                ✅ Chips match! Distributed and cashed in: ${totalChipsDistributed} chips.
            </div>
        ` + resultsHTML;
    }

    document.getElementById('resultsTable').innerHTML = resultsHTML;
    document.getElementById('totalPool').textContent = totalPool.toFixed(2);
    document.getElementById('results').classList.remove('hidden');
    document.getElementById('gameArea').classList.add('hidden');

    saveGameToHistory({
        date: new Date().toLocaleString(),
        players: [...playerData],
        totalPool: totalPool,
        totalChipsDistributed: totalChipsDistributed,
        totalChipsCashedIn: totalChipsCashedIn
    });

    localStorage.removeItem(CURRENT_GAME_KEY);
    loadHistory();
}

function saveGameToHistory(gameData) {
    let history = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
    history.push(gameData);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(history));
}

function loadHistory() {
    const historyList = document.getElementById('historyList');
    const history = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
    
    historyList.innerHTML = '';
    history.forEach((game, index) => {
        const div = document.createElement('div');
        div.className = 'history-item';
        div.innerHTML = `
            <strong>Game ${index + 1}</strong> - ${game.date} 
            (Players: ${game.players.length}, Pool: $${game.totalPool.toFixed(2)})
        `;
        div.addEventListener('touchstart', () => showGameDetails(game));
        div.addEventListener('click', () => showGameDetails(game));
        historyList.appendChild(div);
    });
}

function showGameDetails(game) {
    let details = `
        <table>
            <tr>
                <th>Player</th>
                <th>Buy-ins ($5)</th>
                <th>Chips</th>
                <th>Amount Owed/Won</th>
            </tr>
    `;
    
    const chipValue = game.totalPool / (game.totalChipsCashedIn || 1);
    const chipDifference = game.totalChipsCashedIn - game.totalChipsDistributed;
    let suspiciousPlayers = [];
    if (game.totalChipsCashedIn !== game.totalChipsDistributed) {
        game.players.forEach(player => {
            const expectedChips = player.buyIns * CHIPS_PER_BUYIN;
            const chipDiff = Math.abs(player.chips - expectedChips);
            if (chipDiff > game.totalChipsDistributed * 0.2) {
                suspiciousPlayers.push(player.name);
            }
        });
    }

    game.players.forEach(player => {
        const amountWon = player.chips * chipValue;
        const amountPaid = player.buyIns * 5;
        const difference = amountWon - amountPaid;
        const isSuspicious = suspiciousPlayers.includes(player.name);
        
        details += `
            <tr ${isSuspicious ? 'class="suspicious"' : ''}>
                <td>${player.name}</td>
                <td>${player.buyIns}</td>
                <td>${player.chips}</td>
                <td>$${difference.toFixed(2)} ${difference >= 0 ? '(WON)' : '(OWED)'}</td>
            </tr>
        `;
    });

    // Add "DONGA" if there's a chip difference
    if (game.totalChipsCashedIn !== game.totalChipsDistributed) {
        const dongaAmount = chipDifference * chipValue;
        details += `
            <tr class="donga">
                <td>DONGA (Difference)</td>
                <td>0</td>
                <td>${chipDifference > 0 ? '+' : ''}${chipDifference}</td>
                <td>$${dongaAmount.toFixed(2)}</td>
            </tr>
        `;
    }

    details += '</table>';

    if (game.totalChipsCashedIn !== game.totalChipsDistributed) {
        details = `
            <div class="warning">
                ⚠️ Chip count mismatch! 
                Distributed: ${game.totalChipsDistributed} chips, 
                Cashed in: ${game.totalChipsCashedIn} chips,
                Difference: ${chipDifference > 0 ? '+' : ''}${chipDifference} chips.
                ${suspiciousPlayers.length > 0 ? 'Possible errors from: ' + suspiciousPlayers.join(', ') : 'Check all counts.'}
            </div>
        ` + details;
    } else {
        details = `
            <div class="info">
                ✅ Chips match! Distributed and cashed in: ${game.totalChipsDistributed} chips.
            </div>
        ` + details;
    }

    document.getElementById('resultsTable').innerHTML = details;
    document.getElementById('totalPool').textContent = game.totalPool.toFixed(2);
    document.getElementById('results').classList.remove('hidden');
    document.getElementById('gameArea').classList.add('hidden');
}

function clearHistory() {
    if (confirm('Are you sure you want to clear all game history?')) {
        localStorage.removeItem(STORAGE_KEY);
        loadHistory();
    }
}

window.onload = loadHistory;
