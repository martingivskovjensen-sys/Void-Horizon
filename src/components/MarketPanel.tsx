import React, { useState, useEffect, useRef } from 'react';
import { useGame } from '../context/GameContext';
import type { ResourceType } from '../types';

export const MarketPanel: React.FC = () => {
  const { state, buyResource, sellResource, fulfillContract, configureAutoTrade } = useGame();
  const [selectedResource, setSelectedResource] = useState<ResourceType>('ironOre');
  const chartCanvasRef = useRef<HTMLCanvasElement | null>(null);

  const marketKeys = Object.keys(state.market) as ResourceType[];
  const config = state.autoTrades?.[selectedResource] || {
    buyActive: false,
    buyThreshold: 2,
    buyAmount: 10,
    sellActive: false,
    sellThreshold: 8,
    sellAmount: 10
  };

  // Render High-tech price history chart
  useEffect(() => {
    const canvas = chartCanvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const resourceMarket = state.market[selectedResource];
    const history = resourceMarket.history;

    // Get device pixel ratio for super-crisp high-DPI scaling
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    
    // Scale drawings
    ctx.scale(dpr, dpr);
    
    const width = rect.width;
    const height = rect.height;

    // Clear Canvas
    ctx.fillStyle = '#06070d';
    ctx.fillRect(0, 0, width, height);

    // Padding parameters
    const padLeft = 45;
    const padRight = 20;
    const padTop = 20;
    const padBottom = 30;

    const chartW = width - padLeft - padRight;
    const chartH = height - padTop - padBottom;

    // Draw background grid lines
    ctx.strokeStyle = 'rgba(0, 242, 254, 0.05)';
    ctx.lineWidth = 1;
    const horizGrid = 4;
    for (let i = 0; i <= horizGrid; i++) {
      const y = padTop + (chartH / horizGrid) * i;
      ctx.beginPath();
      ctx.moveTo(padLeft, y);
      ctx.lineTo(width - padRight, y);
      ctx.stroke();
    }

    const vertGrid = history.length - 1;
    for (let i = 0; i <= vertGrid; i++) {
      const x = padLeft + (chartW / vertGrid) * i;
      ctx.beginPath();
      ctx.moveTo(x, padTop);
      ctx.lineTo(x, height - padBottom);
      ctx.stroke();
    }

    // Determine scale heights
    const minVal = Math.min(...history) * 0.9;
    const maxVal = Math.max(...history) * 1.1;
    const valRange = maxVal - minVal || 1;

    // Base price threshold line
    const baseVal = resourceMarket.basePrice;
    const baseY = height - padBottom - ((baseVal - minVal) / valRange) * chartH;
    if (baseY >= padTop && baseY <= height - padBottom) {
      ctx.save();
      ctx.strokeStyle = 'rgba(255, 184, 0, 0.15)';
      ctx.setLineDash([4, 4]);
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(padLeft, baseY);
      ctx.lineTo(width - padRight, baseY);
      ctx.stroke();
      ctx.fillStyle = 'rgba(255, 184, 0, 0.4)';
      ctx.font = '600 9px "Rajdhani"';
      ctx.textAlign = 'left';
      ctx.fillText(`BASE INDEX (₵${baseVal})`, padLeft + 8, baseY - 4);
      ctx.restore();
    }

    // Chart Line color select
    let lineColor = '#00f2fe';
    let gradientFill = 'rgba(0, 242, 254, 0.1)';
    if (resourceMarket.category === 'raw') {
      lineColor = '#ffb800'; // Amber
      gradientFill = 'rgba(255, 184, 0, 0.08)';
    } else if (resourceMarket.category === 'exotic') {
      lineColor = '#ff007f'; // Pink
      gradientFill = 'rgba(255, 0, 127, 0.08)';
    }

    // Plot data path points
    const points: { x: number; y: number }[] = [];
    history.forEach((val, idx) => {
      const x = padLeft + (chartW / (history.length - 1)) * idx;
      const y = height - padBottom - ((val - minVal) / valRange) * chartH;
      points.push({ x, y });
    });

    // Draw fill gradient beneath smooth curve
    if (points.length > 1) {
      ctx.save();
      const grad = ctx.createLinearGradient(0, padTop, 0, height - padBottom);
      grad.addColorStop(0, gradientFill);
      grad.addColorStop(1, 'rgba(6, 7, 13, 0)');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.moveTo(points[0].x, height - padBottom);
      ctx.lineTo(points[0].x, points[0].y);
      for (let i = 0; i < points.length - 1; i++) {
        const xc = (points[i].x + points[i + 1].x) / 2;
        const yc = (points[i].y + points[i + 1].y) / 2;
        ctx.quadraticCurveTo(points[i].x, points[i].y, xc, yc);
      }
      ctx.lineTo(points[points.length - 1].x, points[points.length - 1].y);
      ctx.lineTo(points[points.length - 1].x, height - padBottom);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    }

    // Draw Price Path Line (Smooth Quadratic Curves)
    if (points.length > 1) {
      ctx.save();
      ctx.strokeStyle = lineColor;
      ctx.lineWidth = 2.5;
      ctx.shadowBlur = 8;
      ctx.shadowColor = lineColor;
      ctx.beginPath();
      ctx.moveTo(points[0].x, points[0].y);
      for (let i = 0; i < points.length - 1; i++) {
        const xc = (points[i].x + points[i + 1].x) / 2;
        const yc = (points[i].y + points[i + 1].y) / 2;
        ctx.quadraticCurveTo(points[i].x, points[i].y, xc, yc);
      }
      ctx.lineTo(points[points.length - 1].x, points[points.length - 1].y);
      ctx.stroke();
      ctx.restore();
    }

    // Draw interactive nodes (price dots)
    points.forEach((p, idx) => {
      ctx.fillStyle = '#fff';
      ctx.beginPath();
      ctx.arc(p.x, p.y, idx === history.length - 1 ? 5 : 3, 0, 2 * Math.PI);
      ctx.fill();
      ctx.strokeStyle = lineColor;
      ctx.lineWidth = 1.5;
      ctx.stroke();
    });

    // Draw scale text labels
    ctx.fillStyle = 'var(--text-secondary)';
    ctx.font = '500 11px "Rajdhani"';
    ctx.textAlign = 'right';
    
    // Y-axis price thresholds
    for (let i = 0; i <= horizGrid; i++) {
      const val = maxVal - (valRange / horizGrid) * i;
      const y = padTop + (chartH / horizGrid) * i + 4;
      ctx.fillText(`₵${Math.round(val)}`, padLeft - 8, y);
    }

    // X-axis timestamps
    ctx.textAlign = 'center';
    ctx.fillText('Oldest Tick', padLeft, height - 12);
    ctx.fillText('Real-Time Now', width - padRight - 20, height - 12);

  }, [selectedResource, state.market[selectedResource].history]);

  return (
    <div className="font-rajdhani" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      
      {/* 2-Column Split: Price Ticker list & Selected Asset details */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '20px' }}>
        
        {/* Exchange Grid of Assets */}
        <section className="panel" style={{
          padding: '20px',
          background: 'rgba(9, 13, 24, 0.5)',
          display: 'flex',
          flexDirection: 'column'
        }}>
          <h2 className="font-orbitron" style={{
            fontSize: '1.25rem',
            color: 'var(--color-cyan)',
            textShadow: '0 0 8px rgba(0, 242, 254, 0.4)',
            marginBottom: '4px'
          }}>
            COMMODITY INDEX TRADING
          </h2>
          <p style={{
            fontSize: '0.85rem',
            color: 'var(--text-secondary)',
            marginBottom: '16px'
          }}>
            Speculate on materials prices. Prices adjust procedurally every 4 seconds.
          </p>

          <div style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '8px',
            overflowY: 'auto',
            maxHeight: '410px'
          }}>
            {marketKeys.map(key => {
              const item = state.market[key];
              const stock = state.resources[key].amount;
              const isSelected = selectedResource === key;

              // Compare current price with second to last history price
              const prevPrice = item.history[item.history.length - 2] || item.currentPrice;
              const change = item.currentPrice - prevPrice;

              return (
                <button
                  key={key}
                  onClick={() => setSelectedResource(key)}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    background: isSelected ? 'rgba(0, 242, 254, 0.06)' : 'rgba(0, 0, 0, 0.2)',
                    border: '1px solid',
                    borderColor: isSelected ? 'var(--color-cyan)' : 'rgba(255, 255, 255, 0.05)',
                    padding: '10px 14px',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    color: '#fff',
                    textAlign: 'left',
                    transition: 'all 0.2s ease'
                  }}
                >
                  {/* Left side */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span style={{ fontWeight: 600, fontSize: '1.05rem' }}>{item.name}</span>
                      <span className={`badge ${
                        item.category === 'raw' ? 'badge-amber' : 
                        item.category === 'refined' ? 'badge-cyan' : 'badge-pink'
                      }`} style={{ fontSize: '0.65rem' }}>
                        {item.category}
                      </span>
                    </div>
                    <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                      In Cargo Bays: <span style={{ color: '#fff', fontWeight: 600 }}>{Math.floor(stock)}</span>
                    </div>
                  </div>

                  {/* Right side */}
                  <div style={{ textAlign: 'right' }}>
                    <div style={{
                      fontSize: '1.15rem',
                      fontWeight: 700,
                      color: isSelected ? 'var(--color-cyan)' : '#fff'
                    }}>
                      ₵{item.currentPrice}
                    </div>
                    {change !== 0 ? (
                      <div style={{
                        fontSize: '0.72rem',
                        fontWeight: 700,
                        color: change > 0 ? 'var(--color-green)' : 'var(--color-red)'
                      }}>
                        {change > 0 ? `▲ +₵${change}` : `▼ -₵${Math.abs(change)}`}
                      </div>
                    ) : (
                      <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>STABLE</div>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </section>

        {/* Selected Asset Visual Chart & Exchange Deck */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          
          {/* Real-time price chart card */}
          <section className="panel" style={{
            padding: '16px',
            background: 'rgba(9, 13, 24, 0.5)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center'
          }}>
            <div style={{ display: 'flex', width: '100%', justifyContent: 'space-between', marginBottom: '8px' }}>
              <span className="font-orbitron" style={{ fontSize: '0.9rem', color: 'var(--color-cyan)' }}>
                {state.market[selectedResource].name.toUpperCase()} Ticker History
              </span>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                Volatility Index: {(state.market[selectedResource].volatility * 100).toFixed(0)}%
              </span>
            </div>

            <canvas
              ref={chartCanvasRef}
              width={340}
              height={170}
              style={{
                background: '#06070d',
                border: '1px solid rgba(255, 255, 255, 0.05)',
                borderRadius: '6px',
                width: '100%'
              }}
            />
          </section>

          {/* Asset Exchange Deck */}
          <section className="panel" style={{
            padding: '20px',
            background: 'rgba(9, 13, 24, 0.5)',
            display: 'flex',
            flexDirection: 'column',
            gap: '12px'
          }}>
            <h3 className="font-orbitron" style={{ fontSize: '1rem', color: 'var(--color-cyan)' }}>
              EXECUTE EXCHANGE ORDERS
            </h3>

            {/* Trading balance details */}
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
              <span>Exchange Price: ₵{state.market[selectedResource].currentPrice}</span>
              <span>Available Stock: {Math.floor(state.resources[selectedResource].amount)}</span>
            </div>

            {/* Buying & Selling clusters */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginTop: '4px' }}>
              
              {/* Buy Cluster */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <div style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--color-cyan)', letterSpacing: '0.5px' }}>BUY ORDERS</div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '6px' }}>
                  <button
                    onClick={() => buyResource(selectedResource, 1)}
                    disabled={state.credits < state.market[selectedResource].currentPrice}
                    className="btn"
                    style={{ fontSize: '0.75rem', padding: '4px 0', justifyContent: 'center' }}
                  >
                    +1
                  </button>
                  <button
                    onClick={() => buyResource(selectedResource, 10)}
                    disabled={state.credits < state.market[selectedResource].currentPrice * 10}
                    className="btn"
                    style={{ fontSize: '0.75rem', padding: '4px 0', justifyContent: 'center' }}
                  >
                    +10
                  </button>
                  <button
                    onClick={() => buyResource(selectedResource, 100)}
                    disabled={state.credits < state.market[selectedResource].currentPrice * 100}
                    className="btn"
                    style={{ fontSize: '0.75rem', padding: '4px 0', justifyContent: 'center' }}
                  >
                    +100
                  </button>
                </div>
                
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px' }}>
                  <button
                    onClick={() => {
                      const costVal = state.market[selectedResource].currentPrice;
                      const qty = Math.floor((state.credits * 0.25) / costVal);
                      if (qty > 0) buyResource(selectedResource, qty);
                    }}
                    disabled={state.credits < state.market[selectedResource].currentPrice * 4}
                    className="btn"
                    style={{ fontSize: '0.7rem', padding: '4px 0', justifyContent: 'center' }}
                  >
                    Buy 25%
                  </button>
                  <button
                    onClick={() => {
                      const costVal = state.market[selectedResource].currentPrice;
                      const qty = Math.floor((state.credits * 0.5) / costVal);
                      if (qty > 0) buyResource(selectedResource, qty);
                    }}
                    disabled={state.credits < state.market[selectedResource].currentPrice * 2}
                    className="btn"
                    style={{ fontSize: '0.7rem', padding: '4px 0', justifyContent: 'center' }}
                  >
                    Buy 50%
                  </button>
                </div>
              </div>

              {/* Sell Cluster */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <div style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--color-pink)', letterSpacing: '0.5px' }}>SELL ORDERS</div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '6px' }}>
                  <button
                    onClick={() => sellResource(selectedResource, 1)}
                    disabled={state.resources[selectedResource].amount < 1}
                    className="btn btn-pink"
                    style={{ fontSize: '0.75rem', padding: '4px 0', justifyContent: 'center' }}
                  >
                    -1
                  </button>
                  <button
                    onClick={() => sellResource(selectedResource, 10)}
                    disabled={state.resources[selectedResource].amount < 10}
                    className="btn btn-pink"
                    style={{ fontSize: '0.75rem', padding: '4px 0', justifyContent: 'center' }}
                  >
                    -10
                  </button>
                  <button
                    onClick={() => sellResource(selectedResource, 100)}
                    disabled={state.resources[selectedResource].amount < 100}
                    className="btn btn-pink"
                    style={{ fontSize: '0.75rem', padding: '4px 0', justifyContent: 'center' }}
                  >
                    -100
                  </button>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px' }}>
                  <button
                    onClick={() => {
                      const qty = Math.floor(state.resources[selectedResource].amount * 0.25);
                      if (qty > 0) sellResource(selectedResource, qty);
                    }}
                    disabled={state.resources[selectedResource].amount < 4}
                    className="btn btn-pink"
                    style={{ fontSize: '0.7rem', padding: '4px 0', justifyContent: 'center' }}
                  >
                    Sell 25%
                  </button>
                  <button
                    onClick={() => {
                      const qty = Math.floor(state.resources[selectedResource].amount * 0.5);
                      if (qty > 0) sellResource(selectedResource, qty);
                    }}
                    disabled={state.resources[selectedResource].amount < 2}
                    className="btn btn-pink"
                    style={{ fontSize: '0.7rem', padding: '4px 0', justifyContent: 'center' }}
                  >
                    Sell 50%
                  </button>
                </div>
              </div>

            </div>

            {/* MAX options */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <button
                onClick={() => {
                  const maxBuy = Math.floor(state.credits / state.market[selectedResource].currentPrice);
                  if (maxBuy > 0) buyResource(selectedResource, maxBuy);
                }}
                disabled={state.credits < state.market[selectedResource].currentPrice}
                className="btn"
                style={{ justifyContent: 'center', fontSize: '0.85rem', padding: '8px 0' }}
              >
                Buy Max ({Math.floor(state.credits / state.market[selectedResource].currentPrice)})
              </button>

              <button
                onClick={() => {
                  const maxSell = Math.floor(state.resources[selectedResource].amount);
                  if (maxSell > 0) sellResource(selectedResource, maxSell);
                }}
                disabled={state.resources[selectedResource].amount < 1}
                className="btn btn-pink"
                style={{ justifyContent: 'center', fontSize: '0.85rem', padding: '8px 0' }}
              >
                Sell Max ({Math.floor(state.resources[selectedResource].amount)})
              </button>
            </div>
          </section>

          {/* Automated Trading Protocols */}
          <section className="panel" style={{
            padding: '16px 20px',
            background: 'rgba(9, 13, 24, 0.5)',
            display: 'flex',
            flexDirection: 'column',
            gap: '12px'
          }}>
            <h3 className="font-orbitron" style={{ fontSize: '0.92rem', color: 'var(--color-amber)', display: 'flex', alignItems: 'center', gap: '6px', margin: 0 }}>
              🤖 AUTO-TRADE ORDER BOOK
            </h3>
            <p style={{ fontSize: '0.76rem', color: 'var(--text-secondary)', margin: 0, lineHeight: 1.3 }}>
              Configure automatic trade orders when market prices cross target bounds.
            </p>

            {/* Split Buy / Sell Configuration */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginTop: '4px' }}>
              
              {/* Auto Buy order */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', borderRight: '1px solid rgba(255,255,255,0.05)', paddingRight: '12px' }}>
                <div style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--color-cyan)', letterSpacing: '0.5px' }}>AUTO-BUY LIMIT</div>
                
                <button
                  onClick={() => configureAutoTrade(selectedResource, { buyActive: !config.buyActive })}
                  className={`btn ${config.buyActive ? 'btn-cyan' : ''}`}
                  style={{ 
                    fontSize: '0.75rem', 
                    padding: '4px 0', 
                    justifyContent: 'center', 
                    borderColor: config.buyActive ? 'var(--color-cyan)' : 'rgba(255,255,255,0.1)',
                    background: config.buyActive ? 'rgba(0, 242, 254, 0.15)' : ''
                  }}
                >
                  {config.buyActive ? '🟢 AUTO-BUY ON' : '🔴 AUTO-BUY OFF'}
                </button>

                <label style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', display: 'flex', flexDirection: 'column', gap: '2px' }}>
                  Target Price (≤):
                  <input
                    type="number"
                    min="1"
                    value={config.buyThreshold}
                    onChange={(e) => configureAutoTrade(selectedResource, { buyThreshold: Math.max(1, parseInt(e.target.value) || 0) })}
                    style={{
                      background: '#06070d',
                      border: '1px solid rgba(0, 242, 254, 0.25)',
                      borderRadius: '4px',
                      color: '#fff',
                      fontSize: '0.8rem',
                      fontFamily: 'var(--mono)',
                      padding: '4px 6px',
                      width: '100%'
                    }}
                  />
                </label>

                <label style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', display: 'flex', flexDirection: 'column', gap: '2px' }}>
                  Purchase Qty:
                  <input
                    type="number"
                    min="1"
                    value={config.buyAmount}
                    onChange={(e) => configureAutoTrade(selectedResource, { buyAmount: Math.max(1, parseInt(e.target.value) || 0) })}
                    style={{
                      background: '#06070d',
                      border: '1px solid rgba(0, 242, 254, 0.25)',
                      borderRadius: '4px',
                      color: '#fff',
                      fontSize: '0.8rem',
                      fontFamily: 'var(--mono)',
                      padding: '4px 6px',
                      width: '100%'
                    }}
                  />
                </label>
              </div>

              {/* Auto Sell order */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <div style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--color-pink)', letterSpacing: '0.5px' }}>AUTO-SELL LIMIT</div>

                <button
                  onClick={() => configureAutoTrade(selectedResource, { sellActive: !config.sellActive })}
                  className={`btn ${config.sellActive ? 'btn-pink' : ''}`}
                  style={{ 
                    fontSize: '0.75rem', 
                    padding: '4px 0', 
                    justifyContent: 'center', 
                    borderColor: config.sellActive ? 'var(--color-pink)' : 'rgba(255,255,255,0.1)',
                    background: config.sellActive ? 'rgba(255, 0, 127, 0.15)' : ''
                  }}
                >
                  {config.sellActive ? '🟢 AUTO-SELL ON' : '🔴 AUTO-SELL OFF'}
                </button>

                <label style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', display: 'flex', flexDirection: 'column', gap: '2px' }}>
                  Target Price (≥):
                  <input
                    type="number"
                    min="1"
                    value={config.sellThreshold}
                    onChange={(e) => configureAutoTrade(selectedResource, { sellThreshold: Math.max(1, parseInt(e.target.value) || 0) })}
                    style={{
                      background: '#06070d',
                      border: '1px solid rgba(255, 0, 127, 0.25)',
                      borderRadius: '4px',
                      color: '#fff',
                      fontSize: '0.8rem',
                      fontFamily: 'var(--mono)',
                      padding: '4px 6px',
                      width: '100%'
                    }}
                  />
                </label>

                <label style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', display: 'flex', flexDirection: 'column', gap: '2px' }}>
                  Sale Qty:
                  <input
                    type="number"
                    min="1"
                    value={config.sellAmount}
                    onChange={(e) => configureAutoTrade(selectedResource, { sellAmount: Math.max(1, parseInt(e.target.value) || 0) })}
                    style={{
                      background: '#06070d',
                      border: '1px solid rgba(255, 0, 127, 0.25)',
                      borderRadius: '4px',
                      color: '#fff',
                      fontSize: '0.8rem',
                      fontFamily: 'var(--mono)',
                      padding: '4px 6px',
                      width: '100%'
                    }}
                  />
                </label>
              </div>

            </div>
          </section>
        </div>
      </div>

      {/* Galactic Faction Supply Contracts */}
      <section className="panel" style={{
        padding: '20px',
        background: 'rgba(9, 13, 24, 0.5)'
      }}>
        <h2 className="font-orbitron" style={{
          fontSize: '1.25rem',
          color: 'var(--color-cyan)',
          textShadow: '0 0 8px rgba(0, 242, 254, 0.4)',
          marginBottom: '4px'
        }}>
          FACTION SUPPLY CONTRACTS
        </h2>
        <p style={{
          fontSize: '0.85rem',
          color: 'var(--text-secondary)',
          marginBottom: '16px'
        }}>
          Deliver materials to factions at premium rates before their supply transports depart. Pays +35% over index prices!
        </p>

        {/* Contracts Grid */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: state.contracts.length > 0 ? '1fr 1fr 1fr' : '1fr',
          gap: '20px',
          minHeight: '110px'
        }}>
          {state.contracts.length > 0 ? (
            state.contracts.map(contract => {
              const item = state.market[contract.resourceType];
              const owned = state.resources[contract.resourceType].amount;
              const hasEnough = owned >= contract.requiredAmount;
              const timePct = (contract.timeLeft / contract.duration) * 100;

              const rarity = contract.rarity || 'common';
              let borderColor = 'rgba(255, 255, 255, 0.05)';
              let rarityLabel = 'COMMON';
              let rarityColor = 'var(--text-secondary)';
              let glowStyle = {};

              if (rarity === 'rare') {
                borderColor = 'rgba(255, 184, 0, 0.3)';
                rarityLabel = 'RARE CONTRACT';
                rarityColor = 'var(--color-amber)';
              } else if (rarity === 'legendary') {
                borderColor = 'rgba(255, 0, 127, 0.5)';
                rarityLabel = 'LEGENDARY CONTRACT';
                rarityColor = 'var(--color-pink)';
                glowStyle = { boxShadow: '0 0 10px rgba(255, 0, 127, 0.2)' };
              }

              return (
                <div key={contract.id} style={{
                  background: 'rgba(0,0,0,0.25)',
                  border: '1px solid',
                  borderColor,
                  padding: '16px',
                  borderRadius: '6px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '8px',
                  position: 'relative',
                  ...glowStyle
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontWeight: 700, color: 'var(--color-cyan)', fontSize: '0.9rem' }}>
                      {contract.faction.toUpperCase()}
                    </span>
                    <span style={{ fontSize: '0.68rem', fontWeight: 700, color: rarityColor }}>
                      {rarityLabel}
                    </span>
                  </div>

                  {/* Contract content */}
                  <div style={{ fontSize: '0.85rem', lineHeight: '1.3' }}>
                    Requesting: <span style={{ color: '#fff', fontWeight: 600 }}>{contract.requiredAmount} units</span> of {item.name}<br />
                    Bounty payout: <span style={{ color: 'var(--color-green)', fontWeight: 700 }}>₵{contract.rewardCredits}</span>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
                      Stock: <span style={{ color: hasEnough ? 'var(--color-green)' : 'var(--color-pink)', fontWeight: 700 }}>
                        {Math.floor(owned)}
                      </span> / {contract.requiredAmount}
                    </div>
                  </div>

                  {/* Contract remaining duration bar */}
                  <div className="meter-bar" style={{ height: '3px' }}>
                    <div className="meter-fill meter-fill-amber" style={{ width: `${timePct}%` }} />
                  </div>

                  <button
                    onClick={() => fulfillContract(contract.id)}
                    disabled={!hasEnough}
                    className="btn"
                    style={{ fontSize: '0.8rem', padding: '6px 0', justifyContent: 'center', marginTop: '4px' }}
                  >
                    Deliver Cargo
                  </button>
                </div>
              );
            })
          ) : (
            <div style={{
              gridColumn: '1 / -1',
              textAlign: 'center',
              padding: '24px 0',
              color: 'var(--text-muted)',
              fontSize: '1rem',
              border: '1px dashed rgba(255,255,255,0.05)',
              borderRadius: '6px'
            }}>
              Scanning hyperwave networks for active corporate bids... (Contract incoming)
            </div>
          )}
        </div>
      </section>

    </div>
  );
};
