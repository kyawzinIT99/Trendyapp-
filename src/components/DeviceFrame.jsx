import React, { useState } from 'react';
import { Smartphone, Monitor, Settings, Sparkles, Zap, ShoppingBag, X } from 'lucide-react';

export function DeviceFrame({
  deviceMode,
  setDeviceMode,
  onOpenAdminPanel,
  canOpenAdmin = false,
  cartCount,
  children
}) {
  const [islandExpanded, setIslandExpanded] = useState(false);
  const currentTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  return (
    <div className="app-wrapper">
      {/* Outer Studio Toolbar */}
      <header className="top-control-toolbar">
        <div className="brand-badge">
          <div className="brand-icon-gem">
            <Sparkles size={20} />
          </div>
          <div>
            <div className="brand-title">Trendy Studio</div>
            <div className="brand-subtitle">iOS & Android Front Frame • Connected Admin Engine</div>
          </div>
        </div>

        {/* Device Switcher */}
        <div className="device-mode-switch">
          <button
            className={`device-btn ${deviceMode === 'ios' ? 'active' : ''}`}
            onClick={() => setDeviceMode('ios')}
            title="iPhone 16 Pro Viewport"
          >
            <Smartphone size={14} />
            <span>iPhone 16 Pro</span>
          </button>

          <button
            className={`device-btn ${deviceMode === 'android' ? 'active' : ''}`}
            onClick={() => setDeviceMode('android')}
            title="Samsung Galaxy S24 Viewport"
          >
            <Smartphone size={14} />
            <span>Galaxy S24</span>
          </button>

          <button
            className={`device-btn ${deviceMode === 'responsive' ? 'active' : ''}`}
            onClick={() => setDeviceMode('responsive')}
            title="Full Screen View"
          >
            <Monitor size={14} />
            <span>Full View</span>
          </button>
        </div>

        {/* Admin Panel Entry */}
        <div className="toolbar-actions">
          {canOpenAdmin && (
            <button
              className="n8n-badge-btn"
              style={{
                background: '#1c1917',
                borderColor: '#1c1917',
                color: '#f6f3ee'
              }}
              onClick={onOpenAdminPanel}
              title="Open Admin Panel to edit photos, items & configure backend n8n automation"
            >
              <Settings size={14} />
              <span>Admin Panel & Front Editor</span>
              <span className="pulse-dot" />
            </button>
          )}
        </div>
      </header>

      {/* Main Simulation Viewport */}
      <main className="canvas-area">
        <div className={
          deviceMode === 'ios' ? 'device-container-ios' :
          deviceMode === 'android' ? 'device-container-android' :
          'device-container-responsive'
        }>
          {/* Interactive iOS Dynamic Island */}
          {deviceMode === 'ios' && (
            <>
              <div
                className={`ios-dynamic-island ${islandExpanded ? 'expanded' : ''}`}
                onClick={() => setIslandExpanded(!islandExpanded)}
                title="Tap Dynamic Island to inspect live status"
              >
                {!islandExpanded ? (
                  <>
                    <div className="island-camera" />
                    <div className="island-sensor" />
                  </>
                ) : (
                  <div className="island-expanded-content">
                    <div className="island-expanded-left">
                      <div className="island-app-orb">
                        <Zap size={16} />
                      </div>
                      <div>
                        <div className="island-expanded-title">Trendy Live Activity</div>
                        <div className="island-expanded-sub">Stock & Admin Sync Active</div>
                      </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ fontSize: '0.72rem', color: '#fff', background: 'rgba(255,255,255,0.1)', padding: '2px 8px', borderRadius: 999, display: 'flex', alignItems: 'center', gap: 4 }}>
                        <ShoppingBag size={11} /> {cartCount}
                      </span>
                      <button
                        onClick={(e) => { e.stopPropagation(); setIslandExpanded(false); }}
                        style={{ color: '#94a3b8', padding: 2 }}
                      >
                        <X size={14} />
                      </button>
                    </div>
                  </div>
                )}
              </div>
              <div className="ios-home-indicator" />
            </>
          )}

          {/* Android Punch Hole & Gesture Bar */}
          {deviceMode === 'android' && (
            <>
              <div className="android-punch-hole" />
              <div className="android-nav-bar" />
            </>
          )}

          {/* Mobile Status Bar */}
          <div className="mobile-status-bar">
            <span>{currentTime}</span>
            <div className="status-bar-icons">
              <span style={{ fontSize: '0.72rem', color: '#1c1917', fontWeight: 700, letterSpacing: '0.04em' }}>
                Trendy
              </span>
              <span style={{ fontSize: '0.75rem', opacity: 0.85 }}>5G</span>
              <span style={{ fontSize: '0.75rem', opacity: 0.85 }}>100%</span>
            </div>
          </div>

          {/* Screen Content Viewport */}
          {children}
        </div>
      </main>
    </div>
  );
}
