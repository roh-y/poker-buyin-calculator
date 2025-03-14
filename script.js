let playerData = [];
const STORAGE_KEY = 'pokerGameHistory';
const CHIPS_PER_BUYIN = 200;

function startGame() {
    const numPlayers = parseInt(document.getElementById('players').value);
    if (numPlayers < 8 || numPlayers > 12) {
        alert('Please enter a number between 8 and 12');
        return;
    }

    playerData = [];
    const playerInputs = document.getElementById('playerInputs');
    playerInputs.innerHTML = '';

    for (let i = 1; i <= numPlayers; i++) {
        playerData.push({
            name: `Player ${i}`,
            buyIns: 1,
            chips: 0
        });

        const div = document.createElement('div');
        div.className = 'player-row';
        div.innerHTML = `
            <label>Name: <input type="text" value="Player ${i}" onchange="updateName(${i-1}, this.value)"></label>
            <label>Buy-ins: <input type="number" min="1" value="1" onchange="updateBuyIns(${i-1}, this.value)"></label>
        `;
        playerInputs.appendChild(div);
    }

    document.getElementById('gameArea').classList.remove('hidden');
    document.getElementById('results').classList.add('hidden');
}

function updateName(index, name) {
    playerData[index].name = name;
}

function updateBuyIns(index, buyIns) {
    playerData[index].buyIns = parseInt(buyIns);
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

    const endButton = document.querySelector('#gameArea button');
    endButton.textContent = 'Calculate Results';
    endButton.onclick = calculateResults;
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
            const chipDifference = Math.abs(player.chips - expectedChips);
            if (chipDifference > totalChipsDistributed * 0.2) {
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

    resultsHTML += '</table>';

    if (totalChipsCashedIn !== totalChipsDistributed) {
        resultsHTML = `
            <div class="warning">
                ⚠️ Chip count mismatch! 
                Distributed: ${totalChipsDistributed} chips, 
                Cashed in: ${totalChipsCashedIn} chips.
                ${suspiciousPlayers.length > 0 ? 'Possible errors from: ' + suspiciousPlayers.join(', ') : 'Check all counts.'}
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
        div.addEventListener('touchstart', () => showGameDetails(game)); // Touch support
        div.addEventListener('click', () => showGameDetails(game)); // Mouse support
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
    let suspiciousPlayers = [];
    if (game.totalChipsCashedIn !== game.totalChipsDistributed) {
        game.players.forEach(player => {
            const expectedChips = player.buyIns * CHIPS_PER_BUYIN;
            const chipDifference = Math.abs(player.chips - expectedChips);
            if (chipDifference > game.totalChipsDistributed * 0.2) {
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
    details += '</table>';

    if (game.totalChipsCashedIn !== game.totalChipsDistributed) {
        details = `
            <div class="warning">
                ⚠️ Chip count mismatch! 
                Distributed: ${game.totalChipsDistributed} chips, 
                Cashed in: ${game.totalChipsCashedIn} chips.
                ${suspiciousPlayers.length > 0 ? 'Possible errors from: ' + suspiciousPlayers.join(', ') : 'Check all counts.'}
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
