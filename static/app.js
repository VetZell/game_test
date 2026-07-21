const telegram = window.Telegram?.WebApp;
const welcomeScreen = document.querySelector('#welcome-screen');
const gameScreen = document.querySelector('#game-screen');
const startButton = document.querySelector('#start-button');
const welcomeStatus = document.querySelector('#welcome-status');
const gameStatus = document.querySelector('#game-status');
const speech = document.querySelector('#speech');
const marina = document.querySelector('#marina');
const actionButtons = document.querySelectorAll('.action-button');

const state = {
    love: 70,
    mood: 62,
    energy: 45,
    hunger: 38,
    calm: 58,
};

const actions = {
    coffee: {
        changes: { energy: 12, mood: 4, calm: -2 },
        speech: 'Спасибо за кофе. Теперь просыпаться намного приятнее ☕',
        status: 'Марина выпила кофе: энергия выросла.',
    },
    breakfast: {
        changes: { hunger: 22, mood: 6, love: 4 },
        speech: 'Как вкусно! Завтрак с заботой — лучшее начало дня.',
        status: 'Завтрак поднял сытость и настроение.',
    },
    sleep: {
        changes: { energy: 18, calm: 8, hunger: -5 },
        speech: 'Ещё десять минут… Спасибо, что не торопишь меня 😴',
        status: 'Марина немного отдохнула и стала спокойнее.',
    },
    message: {
        changes: { love: 12, mood: 10, calm: 4 },
        speech: 'Мне очень приятно это слышать. Теперь утро точно доброе ❤️',
        status: 'Добрые слова особенно сильно подняли настроение.',
    },
};

function clamp(value) {
    return Math.max(0, Math.min(100, value));
}

function renderStats() {
    Object.entries(state).forEach(([key, value]) => {
        document.querySelector(`#${key}-value`).textContent = value;
        document.querySelector(`#${key}-bar`).style.width = `${value}%`;
    });
}

function react() {
    marina.classList.add('react');
    window.setTimeout(() => marina.classList.remove('react'), 300);
}

if (telegram) {
    telegram.ready();
    telegram.expand();
    const userName = telegram.initDataUnsafe?.user?.first_name;
    if (userName) {
        welcomeStatus.textContent = `${userName}, первый день уже готов начаться.`;
    }
}

startButton.addEventListener('click', () => {
    telegram?.HapticFeedback?.impactOccurred('medium');
    welcomeScreen.classList.add('hidden');
    gameScreen.classList.remove('hidden');
    renderStats();
});

actionButtons.forEach((button) => {
    button.addEventListener('click', () => {
        const action = actions[button.dataset.action];
        if (!action) return;

        Object.entries(action.changes).forEach(([key, amount]) => {
            state[key] = clamp(state[key] + amount);
        });

        renderStats();
        speech.textContent = action.speech;
        gameStatus.textContent = action.status;
        telegram?.HapticFeedback?.impactOccurred('light');
        react();

        button.disabled = true;
    });
});