const telegram = window.Telegram?.WebApp;
const startButton = document.querySelector("#start-button");
const statusText = document.querySelector("#status");

if (telegram) {
    telegram.ready();
    telegram.expand();

    const userName = telegram.initDataUnsafe?.user?.first_name;
    if (userName) {
        statusText.textContent = `${userName}, первый день уже готов начаться.`;
    }
}

startButton.addEventListener("click", () => {
    telegram?.HapticFeedback?.impactOccurred("medium");

    startButton.disabled = true;
    startButton.textContent = "День начинается…";
    statusText.textContent = "Следующий этап — утро Марины и первые показатели.";
});
