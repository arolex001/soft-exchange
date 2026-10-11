
const coins = [
    { name: "Bitcoin", symbol: "BTC", icon: "₿", price: 67420.50, change: 2.45, cap: "$1.33T" },
    { name: "Ethereum", symbol: "ETH", icon: "Ξ", price: 3521.80, change: 1.82, cap: "$423.5B" },
    { name: "Tether", symbol: "USDT", icon: "₮", price: 1.00, change: 0.04, cap: "$112.8B" },
    { name: "BNB", symbol: "BNB", icon: "B", price: 586.40, change: -0.76, cap: "$86.2B" },
    { name: "Solana", symbol: "SOL", icon: "◎", price: 178.25, change: 4.21, cap: "$79.6B" },
    { name: "XRP", symbol: "XRP", icon: "X", price: 0.62, change: -1.15, cap: "$34.1B" }
];

async function updateLivePrices() {
    try {
        const response = await fetch(
            "https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&ids=bitcoin,ethereum,tether,binancecoin,solana,ripple&price_change_percentage=24h"
        );

        if (!response.ok) {
            throw new Error("Could not fetch market prices");
        }

        const liveCoins = await response.json();

        liveCoins.forEach(liveCoin => {
            const coin = coins.find(
                item => item.symbol === liveCoin.symbol.toUpperCase()
            );

            if (coin) {
                coin.price = liveCoin.current_price;
                coin.change =
                    liveCoin.price_change_percentage_24h ?? coin.change;

                coin.cap = "$" + (
                    liveCoin.market_cap >= 1e12
                        ? (liveCoin.market_cap / 1e12).toFixed(2) + "T"
                        : (liveCoin.market_cap / 1e9).toFixed(1) + "B"
                );
            }
        });

        renderCoins(coinSearch.value.trim());
        renderWatchlist();

    } catch (error) {
        console.log("Using demo prices:", error.message);
    }
}

const coinList = document.getElementById("coin-list");
const coinSearch = document.getElementById("coin-search");
const watchlistItems = document.getElementById("watchlist-items");
const assetCount = document.getElementById("asset-count");

const savedCoins = new Set(
    JSON.parse(localStorage.getItem("softExchangeWatchlist") || "[]")
);

function formatPrice(price) {
    return price < 1
        ? "$" + price.toFixed(4)
        : "$" + price.toLocaleString("en-US", {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        });
}

function renderCoins(searchTerm = "") {
    const filteredCoins = coins.filter(coin =>
        coin.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        coin.symbol.toLowerCase().includes(searchTerm.toLowerCase())
    );

    coinList.innerHTML = "";

    if (filteredCoins.length === 0) {
        coinList.innerHTML = `
            <tr>
                <td colspan="5">No matching cryptocurrencies found.</td>
            </tr>
        `;
        return;
    }

    filteredCoins.forEach(coin => {
        const isSaved = savedCoins.has(coin.symbol);
        const changeClass = coin.change >= 0 ? "positive" : "negative";
        const changeSign = coin.change > 0 ? "+" : "";

        const row = document.createElement("tr");

        row.innerHTML = `
            <td>
                <div class="coin-cell">
                    <span class="coin-icon">${coin.icon}</span>
                    <div>
                        <div class="coin-name">${coin.name}</div>
                        <div class="coin-symbol">${coin.symbol}</div>
                    </div>
                </div>
            </td>
            <td>${formatPrice(coin.price)}</td>
            <td class="${changeClass}">
                ${changeSign}${coin.change.toFixed(2)}%
            </td>
            <td>${coin.cap}</td>
            <td>
                <button
                    class="star-button ${isSaved ? "saved" : ""}"
                    data-symbol="${coin.symbol}"
                    aria-label="${isSaved ? "Remove" : "Add"} ${coin.name} ${isSaved ? "from" : "to"} watchlist"
                >${isSaved ? "★ Saved" : "☆ Watch"}</button>
            </td>
        `;

        coinList.appendChild(row);
    });
}

function renderWatchlist() {
    const selectedCoins = coins.filter(coin =>
        savedCoins.has(coin.symbol)
    );

    assetCount.textContent = coins.length;

    if (selectedCoins.length === 0) {
        watchlistItems.innerHTML =
            '<p class="muted">Your watchlist is empty.</p>';
        return;
    }

    watchlistItems.innerHTML = selectedCoins.map(coin => `
        <div class="watchlist-item">
            <span>
                <strong>${coin.name}</strong>
                <span class="coin-symbol"> (${coin.symbol})</span>
            </span>
            <span>${formatPrice(coin.price)}</span>
        </div>
    `).join("");
}

coinList.addEventListener("click", event => {
    const button = event.target.closest(".star-button");

    if (!button) return;

    const symbol = button.dataset.symbol;

   if (savedCoins.has(symbol)) {
    savedCoins.delete(symbol);
} else {
    savedCoins.add(symbol);
}

localStorage.setItem(
    "softExchangeWatchlist",
    JSON.stringify([...savedCoins])
);

    renderCoins(coinSearch.value);
    renderWatchlist();
});

coinSearch.addEventListener("input", () => {
    renderCoins(coinSearch.value.trim());
});

renderCoins();
renderWatchlist();
updateLivePrices();
updateMarketStats();

setInterval(updateLivePrices, 60000);
setInterval(updateMarketStats, 60000);

async function updateMarketStats() {
    try {
        const response = await fetch(
            "https://api.coingecko.com/api/v3/global"
        );

        if (!response.ok) {
            throw new Error("Could not fetch global market data");
        }

        const result = await response.json();
        const data = result.data;

        document.getElementById("total-market-cap").textContent =
            "$" + (data.total_market_cap.usd / 1e12).toFixed(2) + "T";

        document.getElementById("total-trading-volume").textContent =
            "$" + (data.total_volume.usd / 1e9).toFixed(1) + "B";

        document.getElementById("bitcoin-dominance").textContent =
            data.market_cap_percentage.btc.toFixed(1) + "%";

    } catch (error) {
        console.log("Market stats unavailable:", error.message);
    }
}
