import React, { useState } from 'react';
import { useGame } from '../context/GameContext';
import type { MailMessage } from '../types';

export const Mailroom: React.FC = () => {
  const { state, readMail, hireNPC, deleteMail } = useGame();
  const [selectedMailId, setSelectedMailId] = useState<string | null>(state.mail?.[0]?.id || null);

  const mails = state.mail || [];
  const activeMods = state.activePriceModifications || [];

  const selectedMail = mails.find(m => m.id === selectedMailId);

  const handleSelectMail = (mail: MailMessage) => {
    setSelectedMailId(mail.id);
    if (!mail.read) {
      readMail(mail.id);
    }
  };

  return (
    <div className="font-rajdhani" style={{ display: 'flex', flexDirection: 'column', gap: '20px', height: '100%' }}>
      
      {/* Active Buffs / Manipulator Feed Alert Banner */}
      {activeMods.length > 0 && (
        <section className="panel" style={{
          padding: '12px 20px',
          background: 'rgba(255, 184, 0, 0.05)',
          border: '1px solid rgba(255, 184, 0, 0.25)',
          borderRadius: '6px',
          display: 'flex',
          flexDirection: 'column',
          gap: '8px'
        }}>
          <h4 style={{ margin: 0, color: 'var(--color-amber)', fontSize: '0.85rem', fontWeight: 700, letterSpacing: '1px' }}>
            ⚠️ ACTIVE HYPERWAVE MARKET MANIPULATIONS
          </h4>
          <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
            {activeMods.map((mod, idx) => (
              <div key={idx} style={{
                background: 'rgba(0,0,0,0.3)',
                padding: '6px 12px',
                borderRadius: '4px',
                border: '1px solid rgba(255, 255, 255, 0.05)',
                fontSize: '0.8rem',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}>
                <span style={{ color: '#fff', fontWeight: 600 }}>{mod.npcName}</span>
                <span className={`badge ${mod.action === 'dump' ? 'badge-pink' : 'badge-cyan'}`} style={{ fontSize: '0.7rem' }}>
                  {mod.action.toUpperCase()} ({Math.round(mod.effectPct * 100)}%)
                </span>
                <span style={{ color: 'var(--text-secondary)' }}>
                  {state.market[mod.resourceType]?.name}
                </span>
                <span style={{ color: 'var(--color-amber)', fontWeight: 700 }}>
                  ⏱️ {mod.timeLeft}s left
                </span>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Main Mail splits */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.3fr', gap: '20px', minHeight: '440px' }}>
        
        {/* Left Column: Messages list panel */}
        <section className="panel" style={{
          padding: '20px',
          background: 'rgba(9, 13, 24, 0.5)',
          display: 'flex',
          flexDirection: 'column',
          position: 'relative'
        }}>
          <div className="scanline-overlay" />
          
          <h2 className="font-orbitron" style={{
            fontSize: '1.25rem',
            color: 'var(--color-cyan)',
            textShadow: '0 0 8px rgba(0, 242, 254, 0.4)',
            marginBottom: '4px'
          }}>
            HYPERWAVE DECK
          </h2>
          <p style={{
            fontSize: '0.85rem',
            color: 'var(--text-secondary)',
            marginBottom: '16px'
          }}>
            Secure messages and tactical operational proposals from sector entities.
          </p>

          {/* Inbox items list */}
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '8px',
            overflowY: 'auto',
            maxHeight: '340px',
            flexGrow: 1
          }}>
            {mails.length > 0 ? (
              [...mails].reverse().map(mail => {
                const isSelected = selectedMailId === mail.id;
                return (
                  <button
                    key={mail.id}
                    onClick={() => handleSelectMail(mail)}
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '4px',
                      background: isSelected ? 'rgba(0, 242, 254, 0.06)' : 'rgba(0, 0, 0, 0.2)',
                      border: '1px solid',
                      borderColor: isSelected ? 'var(--color-cyan)' : 'rgba(255, 255, 255, 0.05)',
                      padding: '10px 14px',
                      borderRadius: '6px',
                      cursor: 'pointer',
                      color: '#fff',
                      textAlign: 'left',
                      position: 'relative',
                      transition: 'all 0.2s ease'
                    }}
                  >
                    {/* Unread indicator dot */}
                    {!mail.read && (
                      <div style={{
                        position: 'absolute',
                        top: '12px',
                        right: '12px',
                        width: '7px',
                        height: '7px',
                        borderRadius: '50%',
                        background: 'var(--color-pink)',
                        boxShadow: 'var(--shadow-glow-pink)'
                      }} />
                    )}

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', width: '92%' }}>
                      <span style={{ fontWeight: 700, fontSize: '0.88rem', color: mail.read ? 'var(--text-primary)' : 'var(--color-cyan)' }}>
                        {mail.sender}
                      </span>
                    </div>

                    <div style={{
                      fontWeight: 600,
                      fontSize: '0.85rem',
                      color: mail.read ? 'var(--text-secondary)' : '#fff'
                    }}>
                      {mail.subject}
                    </div>
                  </button>
                );
              })
            ) : (
              <div style={{
                textAlign: 'center',
                padding: '40px 0',
                color: 'var(--text-muted)',
                fontSize: '0.9rem',
                border: '1px dashed rgba(255,255,255,0.05)',
                borderRadius: '6px'
              }}>
                No messages in the hyperwave matrix. Proposals arrive periodically.
              </div>
            )}
          </div>
        </section>

        {/* Right Column: Reading Panel */}
        <section className="panel" style={{
          padding: '20px',
          background: 'rgba(9, 13, 24, 0.5)',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          minHeight: '400px'
        }}>
          {selectedMail ? (
            <div style={{ display: 'flex', flexDirection: 'column', height: '100%', justifyContent: 'space-between', gap: '16px' }}>
              
              {/* Mail Content */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '12px' }}>
                  <div>
                    <h3 className="font-orbitron" style={{ fontSize: '1.1rem', color: 'var(--color-cyan)', margin: 0 }}>
                      {selectedMail.subject}
                    </h3>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
                      From: <span style={{ color: '#fff', fontWeight: 600 }}>{selectedMail.sender}</span>
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      deleteMail(selectedMail.id);
                      setSelectedMailId(null);
                    }}
                    className="btn btn-pink"
                    style={{ fontSize: '0.75rem', padding: '4px 8px' }}
                  >
                    🗑️ Delete
                  </button>
                </div>

                <div style={{
                  fontSize: '0.92rem',
                  lineHeight: '1.5',
                  color: 'var(--text-primary)',
                  padding: '20px 0',
                  whiteSpace: 'pre-line'
                }}>
                  {selectedMail.body}
                </div>
              </div>

              {/* Special NPC offer block if applicable */}
              {selectedMail.type === 'npc_offer' && selectedMail.npcAction && (
                <div style={{
                  border: '1px solid',
                  borderColor: selectedMail.npcAction.hired ? 'rgba(0, 242, 254, 0.3)' : 'rgba(255, 184, 0, 0.3)',
                  background: selectedMail.npcAction.hired ? 'rgba(0, 242, 254, 0.05)' : 'rgba(255, 184, 0, 0.03)',
                  padding: '16px',
                  borderRadius: '6px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '12px'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontWeight: 700, color: 'var(--color-amber)', fontSize: '0.88rem' }}>
                      INTRUDER COMMERCE OFFER
                    </span>
                    <span className="badge badge-amber" style={{ fontSize: '0.72rem' }}>
                      {selectedMail.npcAction.action === 'dump' ? '📉 DUMP OPERATION' : '📈 PUMP OPERATION'}
                    </span>
                  </div>

                  <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', lineHeight: 1.4 }}>
                    NPC Target Commodity: <span style={{ color: '#fff', fontWeight: 700 }}>{state.market[selectedMail.npcAction.resource]?.name}</span><br />
                    Operation Effect: <span style={{ color: selectedMail.npcAction.action === 'dump' ? 'var(--color-pink)' : 'var(--color-green)', fontWeight: 700 }}>
                      {selectedMail.npcAction.action === 'dump' ? 'Dump price' : 'Pump price'} by {Math.abs(selectedMail.npcAction.priceEffectPct * 100)}%
                    </span><br />
                    Duration: <span style={{ color: '#fff', fontWeight: 600 }}>{selectedMail.npcAction.duration} seconds</span>
                  </div>

                  <button
                    onClick={() => hireNPC(selectedMail.id)}
                    disabled={selectedMail.npcAction.hired || state.credits < selectedMail.npcAction.cost}
                    className="btn btn-amber"
                    style={{
                      width: '100%',
                      padding: '8px 0',
                      justifyContent: 'center',
                      fontSize: '0.88rem'
                    }}
                  >
                    {selectedMail.npcAction.hired 
                      ? '🟢 PROPOSAL APPROVED & INJECTED' 
                      : `🤝 HIRE MANIPULATOR (₵${selectedMail.npcAction.cost})`}
                  </button>
                </div>
              )}

            </div>
          ) : (
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              height: '100%',
              textAlign: 'center',
              color: 'var(--text-muted)',
              padding: '20px'
            }}>
              <div style={{ fontSize: '3rem', marginBottom: '12px' }}>📬</div>
              <div className="font-orbitron" style={{ fontSize: '1rem', color: 'var(--text-secondary)', fontWeight: 700 }}>
                NO MESSAGE OPENED
              </div>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '6px', maxWidth: '240px' }}>
                Select a wave message from the index on the left to read content or activate proposals.
              </p>
            </div>
          )}
        </section>

      </div>
    </div>
  );
};
