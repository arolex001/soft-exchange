
const pairSelect = document.getElementById("trading-pair");
const chartLine = document.getElementById("chart-line");
const chartArea = document.getElementById("chart-area");
const whatsappNumber = "2347068821778";
const pairPrice = document.getElementById("pair-price");
const pairChange = document.getElementById("pair-change");
const baseSymbol = document.getElementById("base-symbol");
const orderType = document.getElementById("order-type");
const amountInput = document.getElementById("order-amount");
const limitPriceInput = document.getElementById("limit-price");
const limitPriceGroup = document.getElementById("limit-price-group");
const orderTotal = document.getElementById("order-total");
const orderForm = document.getElementById("order-form");
const orderSubmit = document.getElementById("order-submit");
const orderMessage = document.getElementById("order-message");
const orderHistory = document.getElementById("order-history");

const markets = {
    "BTC/USDT": { price: 67420.50, change: 2.45 },
    "ETH/USDT": { price: 3520.75, change: 1.82 },
    "SOL/USDT": { price: 148.30, change: -0.65 },
    "BTC/NGN": { price: 105000000, change: 2.10 },
    "ETH/NGN": { price: 5480000, change: 1.35 }
};


async function updateLiveMarkets() {
    try {
        const response = await fetch(
            "https://api.coingecko.com/api/v3/simple/price?ids=bitcoin,ethereum,solana&vs_currencies=usd,ngn&include_24hr_change=true"
        );

        if (!response.ok) {
            throw new Error("Live market prices are unavailable");
        }

        const data = await response.json();

        if (data.bitcoin?.usd > 0) {
            markets["BTC/USDT"].price = data.bitcoin.usd;
            markets["BTC/USDT"].change =
                data.bitcoin.usd_24h_change ?? markets["BTC/USDT"].change;
        }

        if (data.ethereum?.usd > 0) {
            markets["ETH/USDT"].price = data.ethereum.usd;
            markets["ETH/USDT"].change =
                data.ethereum.usd_24h_change ?? markets["ETH/USDT"].change;
        }

        if (data.solana?.usd > 0) {
            markets["SOL/USDT"].price = data.solana.usd;
            markets["SOL/USDT"].change =
                data.solana.usd_24h_change ?? markets["SOL/USDT"].change;
        }

        if (data.bitcoin?.ngn > 0) {
            markets["BTC/NGN"].price = data.bitcoin.ngn;
            markets["BTC/NGN"].change =
                data.bitcoin.ngn_24h_change ?? markets["BTC/NGN"].change;
        }

        if (data.ethereum?.ngn > 0) {
            markets["ETH/NGN"].price = data.ethereum.ngn;
            markets["ETH/NGN"].change =
                data.ethereum.ngn_24h_change ?? markets["ETH/NGN"].change;
        }

        updatePair();
    } catch (error) {
        console.warn("Live market update failed:", error);
    }
}

let side = "buy";

const timeframeSettings = {
    "1H": { days: 1, hours: 1 },
    "4H": { days: 1, hours: 4 },
    "1D": { days: 1, hours: 24 },
    "1W": { days: 7, hours: 168 }
};

async function loadHistoricalChart(timeframe = "1H") {
    const { pair, quote } = getPairDetails();

    const coinIds = {
        BTC: "bitcoin",
        ETH: "ethereum",
        SOL: "solana"
    };

    const base = pair.split("/")[0];
    const coinId = coinIds[base];
    const settings = timeframeSettings[timeframe];

    if (!coinId || !settings) return;

    const currency = quote === "NGN" ? "ngn" : "usd";
    const days = timeframe === "1W" ? 7 : 1;

    try {
        const response = await fetch(
            `https://api.coingecko.com/api/v3/coins/${coinId}/market_chart?vs_currency=${currency}&days=${days}`
        );

        if (!response.ok) {
            throw new Error("Historical prices unavailable");
        }

        const data = await response.json();
        let prices = data.prices;

        const cutoff = Date.now() - settings.hours * 60 * 60 * 1000;
        prices = prices.filter(point => point[0] >= cutoff);

        if (prices.length < 2) {
            throw new Error("Not enough historical price data");
        }

        const values = prices.map(point => point[1]);
        const min = Math.min(...values);
        const max = Math.max(...values);
        const range = max - min || 1;

        const points = values.map((price, index) => {
            const x = index / (values.length - 1) * 700;
            const y = 260 - ((price - min) / range) * 220;
            return `${index === 0 ? "M" : "L"}${x.toFixed(2)},${y.toFixed(2)}`;
        });

        const path = points.join(" ");

        chartLine.setAttribute("d", path);
        chartArea.setAttribute("d", `${path} L700,300 L0,300 Z`);
        chartLine.setAttribute(
            "aria-label",
            `${pair} historical prices over ${timeframe}`
        );
    } catch (error) {
        console.warn("Historical chart update failed:", error);
    }
}


function getPairDetails() {
    const pair = pairSelect.value;
    const [base, quote] = pair.split("/");
    return { pair, base, quote, market: markets[pair] };
}

function formatMoney(value, quote) {
    const currency = quote === "NGN" ? "NGN" : "USD";
    const symbol = quote === "NGN" ? "₦" : "$";

    return symbol + new Intl.NumberFormat("en-US", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    }).format(value);
}

function updatePair() {
    const { market, base } = getPairDetails();

    pairPrice.textContent = formatMoney(market.price, getPairDetails().quote);
    pairChange.textContent =
        `${market.change > 0 ? "+" : ""}${market.change.toFixed(2)}%`;

    pairChange.classList.toggle("positive", market.change >= 0);
    pairChange.classList.toggle("negative", market.change < 0);

    baseSymbol.textContent = base;
    updateTotal();
}

function updateTotal() {
    const { market, quote } = getPairDetails();
    const amount = Number(amountInput.value) || 0;

    const price = orderType.value === "limit"
        ? Number(limitPriceInput.value) || 0
        : market.price;

    orderTotal.textContent = formatMoney(amount * price, quote);
}

function updateSide(nextSide) {
    side = nextSide;

    document.querySelectorAll(".order-tab").forEach((tab) => {
        tab.classList.toggle("active", tab.dataset.side === side);
    });

    orderSubmit.textContent = "Continue to WhatsApp";
    orderSubmit.classList.toggle("buy-button", side === "buy");
    orderSubmit.classList.toggle("sell-button", side === "sell");

    orderMessage.textContent = "";
}

function updateOrderType() {
    const isLimit = orderType.value === "limit";
    limitPriceGroup.hidden = !isLimit;
    limitPriceInput.required = isLimit;
    updateTotal();
}

pairSelect.addEventListener("change", updatePair);
amountInput.addEventListener("input", updateTotal);
limitPriceInput.addEventListener("input", updateTotal);
orderType.addEventListener("change", updateOrderType);

document.querySelectorAll(".order-tab").forEach((tab) => {
    tab.addEventListener("click", () => updateSide(tab.dataset.side));
});



document.querySelectorAll(".timeframe").forEach((button) => {
    button.addEventListener("click", () => {
        document.querySelectorAll(".timeframe").forEach((item) => {
            item.classList.toggle("active", item === button);
        });

        loadHistoricalChart(button.dataset.time);
    });
});



orderForm.addEventListener("submit", (event) => {
    event.preventDefault();

    const { pair, base, quote, market } = getPairDetails();
    const amount = Number(amountInput.value);
    const price = orderType.value === "limit"
        ? Number(limitPriceInput.value)
        : market.price;

    if (!Number.isFinite(amount) || amount <= 0) {
        orderMessage.textContent = "Enter an amount greater than zero.";
        return;
    }

    if (!Number.isFinite(price) || price <= 0) {
        orderMessage.textContent = "Enter a valid price greater than zero.";
        return;
    }

    const total = amount * price;
    const row = document.createElement("tr");

    [
        pair,
        side.toUpperCase(),
        orderType.value.toUpperCase(),
        `${amount} ${base}`,
        formatMoney(total, quote),
        "Pending confirmation"
    ].forEach((value) => {
        const cell = document.createElement("td");
        cell.textContent = value;
        row.appendChild(cell);
    });

    if (orderHistory.querySelector("td[colspan]")) {
        orderHistory.replaceChildren();
    }

orderHistory.prepend(row);
localStorage.setItem("softExchangeOrders", orderHistory.innerHTML);

const message = [
    "Hello Soft Exchange, I want to make a crypto trade.",
    "",
    `Action: ${side.toUpperCase()}`,
    `Trading pair: ${pair}`,
    `Amount: ${amount} ${base}`,
    `Order type: ${orderType.value.toUpperCase()}`,
    `Estimated total: ${formatMoney(total, quote)}`,
    "",
    "Please confirm the current price and payment details before proceeding."
].join("\n");

orderMessage.textContent =
    "Your order details are ready. WhatsApp will open so you can send your request.";

const whatsappUrl =
    `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(message)}`;

window.open(whatsappUrl, "_blank", "noopener,noreferrer");

amountInput.value = "";
updateTotal();
});

const savedOrders = localStorage.getItem("softExchangeOrders");

if (savedOrders) {
    orderHistory.innerHTML = savedOrders;

    orderHistory.querySelectorAll("tr").forEach((row) => {
        const cells = row.querySelectorAll("td");
        const statusCell = cells[cells.length - 1];

        if (statusCell && statusCell.textContent.trim() === "Preview only") {
            statusCell.textContent = "Pending confirmation";
        }
    });

    localStorage.setItem("softExchangeOrders", orderHistory.innerHTML);
}
updatePair();
updateOrderType();
updateSide("buy");

updateLiveMarkets();
setInterval(updateLiveMarkets, 60000);
loadHistoricalChart("1H");
pairSelect.addEventListener("change", () => {
    const activeTimeframe = document.querySelector(".timeframe.active");
    loadHistoricalChart(activeTimeframe?.dataset.time || "1H");
});