// This line gets the HTML element for the 'Go' button.
const goButton = document.getElementById('go-button');
// This line gets the HTML element for the 'Stop' button.
const stopButton = document.getElementById('stop-button');
// This line gets the HTML element for the 'Play Again' button.
const playAgainButton = document.getElementById('play-again-button');
// This line gets the HTML element where the results will be shown.
const resultsContainer = document.getElementById('results-container');

// This line gets the span where the player's light color is displayed.
const lightColorSpan = document.getElementById('light-color-span');
// This line gets the span where the player's final choice is displayed.
const playerChoiceSpan = document.getElementById('player-choice-span');
// This line gets the span where the computer's final choice is displayed.
const computerChoiceSpan = document.getElementById('computer-choice-span');
// This line gets the span where the text outcome is displayed.
const outcomeSpan = document.getElementById('outcome-span');
// This line gets the span where the player's score is displayed.
const playerPayoffSpan = document.getElementById('player-payoff-span');
// This line gets the span where the computer's score is displayed.
const computerPayoffSpan = document.getElementById('computer-payoff-span');
// This line gets the span where the Nash Equilibrium analysis is displayed.
const analysisSpan = document.getElementById('analysis-span');

// This variable will store the player's assigned light color for the round.
let playerLight;
// This variable will store the computer's assigned light color for the round.
let computerLight;

// This constant defines the payoff matrix, which remains the same as it's based on actions (Go/Stop).
const payoffMatrix = {
    'Go': {
        'Go': { player: -10, computer: -10, outcome: 'Crash! Both lose.' },
        'Stop': { player: 5, computer: -1, outcome: 'You went safely!' }
    },
    'Stop': {
        'Go': { player: -1, computer: 5, outcome: 'Computer went safely!' },
        'Stop': { player: 0, computer: 0, outcome: 'You both waited.' }
    }
};

// This function starts a new round of the game.
function startNewRound() {
    // Randomly assign 'Green' or 'Red' to the player.
    playerLight = Math.random() < 0.5 ? 'Green' : 'Red';
    // The computer gets the opposite light color.
    computerLight = playerLight === 'Green' ? 'Red' : 'Green';

    // Display the player's light color in the HTML.
    lightColorSpan.textContent = playerLight;
    // Set the text color based on the light color.
    lightColorSpan.style.color = playerLight === 'Green' ? '#28a745' : '#dc3545';

    // Hide the results from the previous round.
    resultsContainer.classList.add('hidden');
    // Enable the choice buttons for the new round.
    goButton.disabled = false;
    // Enable the choice buttons for the new round.
    stopButton.disabled = false;
    // Hide the 'Play Again' button.
    playAgainButton.classList.add('hidden');
// This closes the startNewRound function.
}

// This function executes when the player makes a choice.
function playGame(playerChoice) {
    // The computer makes a random choice, as per the assignment instructions.
    const computerChoice = Math.random() < 0.5 ? 'Go' : 'Stop';
    // Get the result (payoffs, outcome message) from the matrix based on the actions.
    const result = payoffMatrix[playerChoice][computerChoice];

    // Determine if the player followed the "law" of the stoplight.
    const playerObeys = (playerLight === 'Green' && playerChoice === 'Go') || (playerLight === 'Red' && playerChoice === 'Stop');
    // Determine if the computer followed the "law" of the stoplight.
    const computerObeys = (computerLight === 'Green' && computerChoice === 'Go') || (computerLight === 'Red' && computerChoice === 'Stop');

    // Display the player's choice and whether they obeyed.
    playerChoiceSpan.textContent = `${playerChoice} (You ${playerObeys ? 'obeyed' : 'disobeyed'} the light)`;
    // Display the computer's choice and whether it obeyed.
    computerChoiceSpan.textContent = `${computerChoice} (Computer ${computerObeys ? 'obeyed' : 'disobeyed'} the light)`;
    // Display the outcome message.
    outcomeSpan.textContent = result.outcome;
    // Display the player's payoff.
    playerPayoffSpan.textContent = result.player;
    // Display the computer's payoff.
    computerPayoffSpan.textContent = result.computer;

    // Check if the outcome is a Nash Equilibrium.
    if (playerObeys && computerObeys) {
        // If both players obey the light, it's a Nash Equilibrium.
        analysisSpan.textContent = "This is a Nash Equilibrium. Neither player has an incentive to change their action alone.";
    } else {
        // If at least one player disobeys, it's not a Nash Equilibrium.
        analysisSpan.textContent = "This is NOT a Nash Equilibrium. At least one player could have gotten a better outcome by changing their choice (e.g., to avoid a crash).";
    }

    // Show the results container.
    resultsContainer.classList.remove('hidden');
    // Disable the 'Go' button.
    goButton.disabled = true;
    // Disable the 'Stop' button.
    stopButton.disabled = true;
    // Show the 'Play Again' button.
    playAgainButton.classList.remove('hidden');
// This closes the playGame function.
}

// Add a click event listener to the 'Go' button.
goButton.addEventListener('click', () => playGame('Go'));
// Add a click event listener to the 'Stop' button.
stopButton.addEventListener('click', () => playGame('Stop'));
// Add a click event listener to the 'Play Again' button, which starts a new round.
playAgainButton.addEventListener('click', startNewRound);

// This line calls the function to set up the very first round when the page loads.
startNewRound();