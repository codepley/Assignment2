document.addEventListener('DOMContentLoaded', () => {
    // DOM Elements
    const setupContainer = document.getElementById('setup-container');
    const gameContainer = document.getElementById('game-container');
    const imageUploader = document.getElementById('image-uploader');
    const difficultySelect = document.getElementById('difficulty-select');
    const startButton = document.getElementById('start-button');
    const resetButton = document.getElementById('reset-button');
    const hintButton = document.getElementById('hint-button');
    const puzzleBoard = document.getElementById('puzzle-board');
    const piecesContainer = document.getElementById('pieces-container');
    const scoreDisplay = document.getElementById('score-display');

    let pieces = [];
    let pieceCount = 0;
    let score = 0;
    let imageSrc = '';
    
    // --- Event Listeners ---
    startButton.addEventListener('click', startGame);
    resetButton.addEventListener('click', resetGame);
    hintButton.addEventListener('click', provideHint);
    
    function startGame() {
        const file = imageUploader.files[0];
        if (!file) {
            alert('Please select an image first!');
            return;
        }

        pieceCount = parseInt(difficultySelect.value);
        score = 0;

        const reader = new FileReader();
        reader.onload = (e) => {
            imageSrc = e.target.result;
            setupPuzzle();
        };
        reader.readAsDataURL(file);
    }

    function setupPuzzle() {
        setupContainer.classList.add('hidden');
        gameContainer.classList.remove('hidden');
        resetButton.classList.remove('hidden');
        hintButton.classList.remove('hidden');
        
        pieces = [];
        puzzleBoard.innerHTML = '';
        piecesContainer.innerHTML = '';
        updateScore();

        const img = new Image();
        img.onload = () => {
            const MAX_BOARD_WIDTH = Math.min(window.innerWidth * 0.6, 800);
            let boardWidth = img.width;
            let boardHeight = img.height;
            const aspectRatio = img.width / img.height;

            if (boardWidth > MAX_BOARD_WIDTH) {
                boardWidth = MAX_BOARD_WIDTH;
                boardHeight = boardWidth / aspectRatio;
            }
            
            puzzleBoard.style.width = `${boardWidth}px`;
            puzzleBoard.style.height = `${boardHeight}px`;

            // ADDED: Set pieces container height to match the puzzle board
            piecesContainer.style.height = `${boardHeight}px`;

            const { cols, rows } = getGridSize(pieceCount);
            const pieceWidth = boardWidth / cols;
            const pieceHeight = boardHeight / rows;

            puzzleBoard.style.gridTemplateColumns = `repeat(${cols}, 1fr)`;
            puzzleBoard.style.gridTemplateRows = `repeat(${rows}, 1fr)`;
            
            for (let i = 0; i < pieceCount; i++) {
                const col = i % cols;
                const row = Math.floor(i / cols);

                const piece = document.createElement('div');
                piece.classList.add('puzzle-piece');
                piece.setAttribute('draggable', true);
                piece.dataset.id = i;
                
                // CHANGED: Set the piece's base size explicitly. CSS will scale it when in the container.
                piece.style.width = `${pieceWidth}px`;
                piece.style.height = `${pieceHeight}px`;

                piece.style.backgroundImage = `url(${imageSrc})`;
                piece.style.backgroundSize = `${boardWidth}px ${boardHeight}px`;
                piece.style.backgroundPosition = `-${col * pieceWidth}px -${row * pieceHeight}px`;

                piece.addEventListener('dragstart', onDragStart);
                pieces.push(piece);

                const slot = document.createElement('div');
                slot.classList.add('puzzle-slot');
                slot.dataset.id = i;
                slot.addEventListener('dragover', onDragOver);
                slot.addEventListener('drop', onDrop);
                puzzleBoard.appendChild(slot);
            }

            pieces.sort(() => Math.random() - 0.5);
            pieces.forEach(p => piecesContainer.appendChild(p));
        };
        img.src = imageSrc;
    }
    
    function onDragStart(event) {
        event.dataTransfer.setData('text/plain', event.target.dataset.id);
    }

    function onDragOver(event) {
        event.preventDefault();
    }

    function onDrop(event) {
        event.preventDefault();
        const pieceId = event.dataTransfer.getData('text/plain');
        const draggedPiece = document.querySelector(`.puzzle-piece[data-id='${pieceId}']`);
        const targetSlot = event.target.closest('.puzzle-slot');

        if (targetSlot && targetSlot.classList.contains('puzzle-slot') && !targetSlot.hasChildNodes()) {
            targetSlot.appendChild(draggedPiece);
            if (draggedPiece.dataset.id === targetSlot.dataset.id) {
                markPieceAsCorrect(draggedPiece);
            }
        }
    }
    
    function provideHint() {
        const unsolvedPiece = piecesContainer.querySelector('.puzzle-piece');
        if (!unsolvedPiece) return;

        const pieceId = unsolvedPiece.dataset.id;
        const correctSlot = puzzleBoard.querySelector(`.puzzle-slot[data-id='${pieceId}']`);
        
        if (correctSlot.firstChild) {
            piecesContainer.appendChild(correctSlot.firstChild);
        }
        
        correctSlot.appendChild(unsolvedPiece);
        markPieceAsCorrect(unsolvedPiece);
    }

    function markPieceAsCorrect(piece) {
        piece.classList.add('correct');
        piece.setAttribute('draggable', false);
        score++;
        updateScore();
        checkWinCondition();
    }
    
    function updateScore() {
        scoreDisplay.textContent = `Score: ${score} / ${pieceCount}`;
    }

    function checkWinCondition() {
        if (score === pieceCount) {
            setTimeout(() => alert('Congratulations! You solved the puzzle!'), 200);
            puzzleBoard.style.borderColor = '#00ff88';
            puzzleBoard.style.boxShadow = '0 0 15px #00ff88';
            hintButton.classList.add('hidden');
        }
    }
    
    function resetGame() {
        gameContainer.classList.add('hidden');
        resetButton.classList.add('hidden');
        hintButton.classList.add('hidden');
        setupContainer.classList.remove('hidden');
        imageUploader.value = '';
        puzzleBoard.style.borderColor = 'var(--secondary-color)';
        puzzleBoard.style.boxShadow = 'none';
    }
    
    function getGridSize(count) {
        if (count === 5) return { cols: 5, rows: 1 };
        if (count === 20) return { cols: 5, rows: 4 };
        if (count === 40) return { cols: 8, rows: 5 };
        if (count === 80) return { cols: 10, rows: 8 };
        if (count === 100) return { cols: 10, rows: 10 };
        return { cols: count, rows: 1 };
    }
});