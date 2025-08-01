/*
 * indikator – Interactive trading dashboard proof‑of‑concept
 *
 * This script drives the core logic for the indikator app. It loads a small
 * sample dataset (see data/sample_data.json) and uses the TradingView
 * Lightweight Charts library to render candlestick charts. It also
 * implements a basic watchlist, stock search overlay, command bar for
 * simple chart commands, and a market sentiment signal box that
 * evaluates each ticker using a simplified ruleset. The resulting
 * application is a minimal demonstration of the features described in
 * the specification. To hook this up to live data, replace the sample
 * dataset loading with a call to your preferred market data API.
 */

(() => {
  // Global state
  let allData = {};
  let watchlist = [];
  let activeSymbol = null;
  let chart, candleSeries;
  let emaSeries = [];
  let rsiSeries;
  let sentimentState = {};

  // DOM elements
  const addBtn = document.getElementById('add-stock');
  const searchOverlay = document.getElementById('search-overlay');
  const searchInput = document.getElementById('search-input');
  const searchResults = document.getElementById('search-results');
  const watchlistElement = document.getElementById('watchlist-items');
  const chartWrapper = document.getElementById('chart-wrapper');
  const chartContainer = document.getElementById('chart');
  const fullscreenBtn = document.getElementById('fullscreen-btn');
  const sentimentBox = document.getElementById('sentiment-box');
  const sentimentItems = document.getElementById('sentiment-items');
  const sentimentActions = document.getElementById('sentiment-actions');
  const marketBuyBtn = document.getElementById('market-buy');
  const marketSellBtn = document.getElementById('market-sell');
  const commandInput = document.getElementById('command-input');

  // Embed sample data directly into the script. This avoids fetch() from file://
  // which is blocked by browsers for security reasons. To hook this up to live
  // data simply replace this object with an asynchronous fetch call.
  const sampleData = {
    "VOO": [
      { time: "2025-07-01", open: 580.5, high: 582.3, low: 579.5, close: 581.8, volume: 5000000 },
      { time: "2025-07-02", open: 582.0, high: 584.1, low: 581.0, close: 583.5, volume: 4800000 },
      { time: "2025-07-03", open: 583.0, high: 585.4, low: 582.5, close: 584.0, volume: 5100000 },
      { time: "2025-07-05", open: 584.5, high: 586.0, low: 583.0, close: 585.7, volume: 5200000 },
      { time: "2025-07-06", open: 585.7, high: 587.0, low: 584.0, close: 586.5, volume: 5300000 }
    ],
    "GOOGL": [
      { time: "2025-07-01", open: 2700.5, high: 2720.1, low: 2690.0, close: 2710.0, volume: 1500000 },
      { time: "2025-07-02", open: 2710.0, high: 2735.0, low: 2700.0, close: 2725.0, volume: 1600000 },
      { time: "2025-07-03", open: 2725.0, high: 2750.0, low: 2715.0, close: 2745.0, volume: 1550000 },
      { time: "2025-07-05", open: 2745.0, high: 2760.0, low: 2735.0, close: 2755.0, volume: 1580000 },
      { time: "2025-07-06", open: 2755.0, high: 2770.0, low: 2740.0, close: 2765.0, volume: 1600000 }
    ],
    "TSLA": [
      { time: "2025-07-01", open: 700.0, high: 710.0, low: 690.0, close: 705.0, volume: 25000000 },
      { time: "2025-07-02", open: 705.0, high: 715.0, low: 695.0, close: 710.0, volume: 24000000 },
      { time: "2025-07-03", open: 710.0, high: 720.0, low: 700.0, close: 715.0, volume: 24500000 },
      { time: "2025-07-05", open: 715.0, high: 725.0, low: 705.0, close: 720.0, volume: 25000000 },
      { time: "2025-07-06", open: 720.0, high: 730.0, low: 710.0, close: 725.0, volume: 25500000 }
    ],
    "NVDA": [
      { time: "2025-07-01", open: 400.0, high: 405.0, low: 395.0, close: 402.0, volume: 20000000 },
      { time: "2025-07-02", open: 402.0, high: 410.0, low: 400.0, close: 407.0, volume: 19000000 },
      { time: "2025-07-03", open: 407.0, high: 415.0, low: 405.0, close: 410.0, volume: 19500000 },
      { time: "2025-07-05", open: 410.0, high: 417.0, low: 408.0, close: 415.0, volume: 20000000 },
      { time: "2025-07-06", open: 415.0, high: 420.0, low: 410.0, close: 418.0, volume: 20500000 }
    ],
    "AMD": [
      { time: "2025-07-01", open: 110.0, high: 112.0, low: 108.0, close: 111.0, volume: 30000000 },
      { time: "2025-07-02", open: 111.0, high: 113.0, low: 109.0, close: 112.0, volume: 29500000 },
      { time: "2025-07-03", open: 112.0, high: 114.0, low: 110.0, close: 113.0, volume: 29800000 },
      { time: "2025-07-05", open: 113.0, high: 115.0, low: 111.0, close: 114.0, volume: 30200000 },
      { time: "2025-07-06", open: 114.0, high: 116.0, low: 112.0, close: 115.0, volume: 30500000 }
    ]
  };

  // Initialise state with sample data
  allData = sampleData;
  watchlist = ['VOO'];
  activeSymbol = 'VOO';
  // Build chart and UI
  buildChart();
  renderWatchlist();
  evaluateSentiment();

  /**
   * Build a new chart instance and populate with current active symbol's data.
   */
  function buildChart() {
    // Clear existing chart if present
    if (chart) {
      chart.remove();
    }
    chart = LightweightCharts.createChart(chartContainer, {
      layout: {
        background: { color: '#0d1117' },
        textColor: '#c9d1d9',
      },
      grid: {
        vertLines: { color: '#21262d' },
        horzLines: { color: '#21262d' },
      },
      timeScale: {
        borderColor: '#30363d',
      },
      rightPriceScale: {
        borderColor: '#30363d',
      },
      crosshair: {
        mode: LightweightCharts.CrosshairMode.Normal,
      },
      height: chartContainer.clientHeight,
    });
    candleSeries = chart.addCandlestickSeries({
      upColor: '#26a269',
      downColor: '#a03535',
      wickUpColor: '#26a269',
      wickDownColor: '#a03535',
      borderVisible: false,
    });
    // Load initial data
    loadSymbolData(activeSymbol);
    // Click on chart for manual support/resistance lines
    chart.subscribeClick((param) => {
      if (!param.time || !param.point) return;
      const price = candleSeries.coordinateToPrice(param.point.y);
      drawSupportResistance(price);
    });
  }

  /**
   * Load candlestick data for a given symbol and update the chart.
   * Also resets any existing overlays (EMA/RSI).
   * @param {string} symbol
   */
  function loadSymbolData(symbol) {
    const bars = (allData[symbol] || []).map((item) => ({
      time: item.time,
      open: item.open,
      high: item.high,
      low: item.low,
      close: item.close,
    }));
    candleSeries.setData(bars);
    // Remove previous series for EMAs and RSI
    emaSeries.forEach((series) => chart.removeSeries(series));
    emaSeries = [];
    if (rsiSeries) {
      chart.removeSeries(rsiSeries);
      rsiSeries = null;
    }
  }

  /**
   * Render the current watchlist below the chart and wire click handlers.
   */
  function renderWatchlist() {
    watchlistElement.innerHTML = '';
    watchlist.forEach((symbol) => {
      const li = document.createElement('li');
      li.textContent = symbol;
      li.dataset.symbol = symbol;
      if (symbol === activeSymbol) {
        li.classList.add('active');
      }
      li.addEventListener('click', () => {
        activeSymbol = symbol;
        renderWatchlist();
        loadSymbolData(symbol);
      });
      watchlistElement.appendChild(li);
    });
  }

  /**
   * When user clicks the + button show the search overlay.
   */
  addBtn.addEventListener('click', () => {
    searchOverlay.classList.remove('hidden');
    searchInput.value = '';
    populateSearchResults('');
    searchInput.focus();
  });

  /**
   * Populate the search results based on a query.
   * For now we search only within keys of allData. In a production app
   * you would fetch from a remote service.
   * @param {string} query
   */
  function populateSearchResults(query) {
    searchResults.innerHTML = '';
    const lower = query.toLowerCase();
    const candidates = Object.keys(allData).filter(
      (sym) => sym.toLowerCase().includes(lower) || lower === ''
    );
    candidates.forEach((sym) => {
      // Skip if already in watchlist
      if (watchlist.includes(sym)) return;
      const li = document.createElement('li');
      li.textContent = sym;
      li.addEventListener('click', () => {
        watchlist.push(sym);
        renderWatchlist();
        evaluateSentiment();
        searchOverlay.classList.add('hidden');
      });
      searchResults.appendChild(li);
    });
  }

  searchInput.addEventListener('input', (e) => {
    populateSearchResults(e.target.value.trim());
  });

  // Hide search overlay on outside click or escape
  searchOverlay.addEventListener('click', (e) => {
    if (e.target === searchOverlay) {
      searchOverlay.classList.add('hidden');
    }
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && !searchOverlay.classList.contains('hidden')) {
      searchOverlay.classList.add('hidden');
    }
  });

  /**
   * Fullscreen toggle. Adds/removes a CSS class on body to adjust layout
   * and shows the sentiment box.
   */
  fullscreenBtn.addEventListener('click', () => {
    document.body.classList.toggle('fullscreen');
    // When entering fullscreen, show sentiment box
    if (document.body.classList.contains('fullscreen')) {
      sentimentBox.classList.remove('hidden');
    } else {
      sentimentBox.classList.add('hidden');
    }
    // Resize chart to fill space
    if (chart) {
      chart.applyOptions({
        height: chartContainer.clientHeight,
      });
    }
  });

  /**
   * Draw horizontal support or resistance line at given price. We treat these
   * lines as simple horizontal rays that extend infinitely across the chart.
   * @param {number} price
   */
  function drawSupportResistance(price) {
    const lineSeries = chart.addLineSeries({
      color: '#8b949e',
      lineWidth: 1,
      lineStyle: LightweightCharts.LineStyle.Dotted,
    });
    // Create line data with two points at far left and right times
    const candles = allData[activeSymbol] || [];
    const firstTime = candles[0]?.time;
    const lastTime = candles[candles.length - 1]?.time;
    if (!firstTime || !lastTime) return;
    const lineData = [
      { time: firstTime, value: price },
      { time: lastTime, value: price },
    ];
    lineSeries.setData(lineData);
  }

  /**
   * Simple exponential moving average calculation.
   * @param {Array} values Array of closing prices
   * @param {number} length Period length for EMA
   * @returns {Array} Array of EMA values aligned to input
   */
  function calculateEMA(values, length) {
    const ema = [];
    let multiplier = 2 / (length + 1);
    let prevEma = values[0];
    ema.push(prevEma);
    for (let i = 1; i < values.length; i++) {
      const current = values[i] * multiplier + prevEma * (1 - multiplier);
      ema.push(current);
      prevEma = current;
    }
    return ema;
  }

  /**
   * Calculate RSI (Relative Strength Index) using the classic 14-period formula.
   * Returns an array of RSI values aligned to input.
   * @param {Array} closes Array of closing prices
   * @param {number} period Period length
   * @returns {Array}
   */
  function calculateRSI(closes, period = 14) {
    const rsi = [];
    let gains = 0;
    let losses = 0;
    // Seed initial average gain/loss
    for (let i = 1; i <= period; i++) {
      const diff = closes[i] - closes[i - 1];
      if (diff >= 0) gains += diff;
      else losses -= diff;
    }
    gains /= period;
    losses /= period;
    rsi[period] = losses === 0 ? 100 : 100 - 100 / (1 + gains / losses);
    for (let i = period + 1; i < closes.length; i++) {
      const diff = closes[i] - closes[i - 1];
      let up = 0,
        down = 0;
      if (diff >= 0) up = diff;
      else down = -diff;
      gains = (gains * (period - 1) + up) / period;
      losses = (losses * (period - 1) + down) / period;
      const rs = losses === 0 ? 0 : gains / losses;
      rsi[i] = losses === 0 ? 100 : 100 - 100 / (1 + rs);
    }
    return rsi;
  }

  /**
   * Add EMA lines to the chart for given periods (9 and 21). Called in
   * response to command input.
   */
  function addEMAs() {
    const candles = allData[activeSymbol] || [];
    const closes = candles.map((c) => c.close);
    const ema9 = calculateEMA(closes, 9);
    const ema21 = calculateEMA(closes, 21);
    // Trim start to align with data length
    const ema9Data = candles.map((c, i) => ({ time: c.time, value: ema9[i] }));
    const ema21Data = candles.map((c, i) => ({ time: c.time, value: ema21[i] }));
    const series9 = chart.addLineSeries({ color: '#f0c674', lineWidth: 1 });
    series9.setData(ema9Data);
    const series21 = chart.addLineSeries({ color: '#b392ac', lineWidth: 1 });
    series21.setData(ema21Data);
    emaSeries.push(series9, series21);
  }

  /**
   * Plot RSI as a separate line series on a second price scale. The series
   * shares the same time axis as the main chart but uses its own scale.
   */
  function addRSI() {
    const candles = allData[activeSymbol] || [];
    const closes = candles.map((c) => c.close);
    const rsi = calculateRSI(closes, 14);
    const data = candles.map((c, i) => ({ time: c.time, value: rsi[i] || null }));
    rsiSeries = chart.addLineSeries({
      color: '#539bf5',
      lineWidth: 1,
      pane: 0,
      priceScaleId: 'rsi',
    });
    // Create separate price scale for RSI (0-100)
    chart.priceScale('rsi', {
      position: 'left',
      scaleMargins: { top: 0.8, bottom: 0.0 },
      borderColor: '#30363d',
    });
    rsiSeries.setData(data);
  }

  /**
   * Parse command input and perform actions accordingly. Supported
   * commands: 'show me rsi', 'plot the 9 and 21 ema', 'draw major and minor support and resistance'.
   */
  commandInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      const cmd = commandInput.value.trim().toLowerCase();
      commandInput.value = '';
      if (cmd.includes('rsi')) {
        addRSI();
      }
      if (cmd.includes('ema')) {
        addEMAs();
      }
      if (cmd.includes('support') || cmd.includes('resistance')) {
        // Draw simple support/resistance at most recent high/low
        const candles = allData[activeSymbol] || [];
        const highs = candles.map((c) => c.high);
        const lows = candles.map((c) => c.low);
        // major support/resistance using max/min
        const maxHigh = Math.max(...highs);
        const minLow = Math.min(...lows);
        drawSupportResistance(maxHigh);
        drawSupportResistance(minLow);
        // minor levels using average
        const avgHigh = highs.reduce((a, b) => a + b, 0) / highs.length;
        const avgLow = lows.reduce((a, b) => a + b, 0) / lows.length;
        drawSupportResistance(avgHigh);
        drawSupportResistance(avgLow);
      }
      // Additional commands can be added here
    }
  });

  /**
   * Evaluate sentiment for each ticker in the watchlist using simplified logic.
   * For demonstration, we apply the rules described in the specification.
   * Signals are determined based on RSI, EMA and VWAP positions. This is a
   * vastly simplified approximation suitable for sample data.
   */
  function evaluateSentiment() {
    sentimentState = {};
    watchlist.forEach((symbol) => {
      const data = allData[symbol] || [];
      if (data.length < 2) {
        sentimentState[symbol] = 'hold';
        return;
      }
      // Get closing prices and volumes
      const closes = data.map((d) => d.close);
      const volumes = data.map((d) => d.volume);
      // Compute RSI
      const rsi = calculateRSI(closes, 14);
      const currentRSI = rsi[rsi.length - 1] || 50;
      // Compute EMA and price vs EMA
      const ema9 = calculateEMA(closes, 9);
      const ema21 = calculateEMA(closes, 21);
      const currentPrice = closes[closes.length - 1];
      const currentEMA9 = ema9[ema9.length - 1];
      const currentEMA21 = ema21[ema21.length - 1];
      // Compute VWAP (simple average of price weighted by volume)
      const typicalPrices = data.map((d) => (d.high + d.low + d.close) / 3);
      const numerator = typicalPrices.reduce((sum, tp, i) => sum + tp * volumes[i], 0);
      const denominator = volumes.reduce((a, b) => a + b, 0);
      const vwap = denominator !== 0 ? numerator / denominator : currentPrice;
      // Determine signal based on simplified rules
      let signal = 'hold';
      // BUY: price above both EMAs and RSI between 50 and 65
      if (currentPrice > currentEMA9 && currentPrice > currentEMA21 && currentRSI > 50 && currentRSI <= 65 && currentPrice > vwap) {
        signal = 'buy';
      }
      // SELL: price below EMAs and RSI < 50
      else if (currentPrice < currentEMA9 && currentPrice < currentEMA21 && currentRSI < 50 && currentPrice < vwap) {
        signal = 'sell';
      }
      // otherwise hold
      sentimentState[symbol] = signal;
    });
    renderSentimentBox();
  }

  /**
   * Update the sentiment box UI based on sentimentState. Shows buy/sell
   * actions when conditions across watchlist meet triggers defined in spec.
   */
  function renderSentimentBox() {
    // Clear items
    sentimentItems.innerHTML = '';
    let buyCount = 0;
    let sellCount = 0;
    const vooSignal = sentimentState['VOO'];
    // Build list items
    Object.entries(sentimentState).forEach(([symbol, signal]) => {
      const li = document.createElement('li');
      const nameSpan = document.createElement('span');
      nameSpan.textContent = symbol;
      const statusSpan = document.createElement('span');
      statusSpan.classList.add('status');
      if (signal === 'buy') {
        statusSpan.classList.add('buy');
        statusSpan.textContent = '✅';
        buyCount++;
      } else if (signal === 'sell') {
        statusSpan.classList.add('sell');
        statusSpan.textContent = '🔻';
        sellCount++;
      } else {
        statusSpan.classList.add('hold');
        statusSpan.textContent = '⏸️';
      }
      li.appendChild(nameSpan);
      li.appendChild(statusSpan);
      sentimentItems.appendChild(li);
    });
    // Determine aggregate actions
    let showBuy = false;
    let showSell = false;
    // BUY: at least 3 tickers have a BUY signal
    if (buyCount >= 3) {
      showBuy = true;
    }
    // SELL: VOO must be sell and at least 2 others must be sell
    if (vooSignal === 'sell' && sellCount >= 3) {
      showSell = true;
    }
    // Update action buttons
    if (showBuy) {
      marketBuyBtn.classList.remove('hidden');
      marketBuyBtn.classList.add('buy');
    } else {
      marketBuyBtn.classList.add('hidden');
      marketBuyBtn.classList.remove('buy');
    }
    if (showSell) {
      marketSellBtn.classList.remove('hidden');
      marketSellBtn.classList.add('sell');
    } else {
      marketSellBtn.classList.add('hidden');
      marketSellBtn.classList.remove('sell');
    }
    // Show sentiment actions section if either buy or sell triggered
    if (showBuy || showSell) {
      sentimentActions.classList.remove('hidden');
    } else {
      sentimentActions.classList.add('hidden');
    }
  }

  // Re-evaluate sentiment periodically (e.g., every 30 seconds). In a
  // production app this would be triggered by live data updates.
  setInterval(evaluateSentiment, 30000);
})();