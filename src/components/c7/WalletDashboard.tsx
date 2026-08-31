import { c7Theme as t } from '@/theme/c7-sun27-compat';
import { useSound } from '@/hooks/useSound';
import './c7-animations.css';

export type TxKind = 'deposit' | 'withdraw' | 'win' | 'bet' | 'bonus' | 'refund';
export type TxStatus = 'completed' | 'pending' | 'failed';

export interface Transaction {
  id: string;
  kind: TxKind;
  amount: number;
  currency?: string;
  /** ISO datetime or millis */
  timestamp: string | number;
  /** Optional human label (e.g. game name, payment method) */
  label?: string;
  status?: TxStatus;
  /** Optional tx hash / external id */
  externalId?: string;
}

export interface WalletDashboardProps {
  /** Total spendable balance */
  balance: number;
  /** Locked/bonus balance not yet withdrawable */
  bonusBalance?: number;
  /** Recent transactions, newest first */
  transactions?: Transaction[];
  /** Max transactions to render */
  txLimit?: number;
  /** Currency symbol (default $) */
  currency?: string;
  /** Optional native currency breakdown (e.g. USDT/TRX) */
  breakdowns?: Array<{ symbol: string; amount: number; label?: string }>;
  /** Click handlers */
  onDeposit?: () => void;
  onWithdraw?: () => void;
  onHistory?: () => void;
  onTransactionClick?: (tx: Transaction) => void;
}

const TX_META: Record<TxKind, { icon: string; color: string; label: string; sign: '+' | '-' | '' }> = {
  deposit:  { icon: '↓', color: '#ffc935', label: 'Deposit',  sign: '+' },
  withdraw: { icon: '↑', color: '#ef2a4c', label: 'Withdraw', sign: '-' },
  win:      { icon: '🏆', color: '#ffc940', label: 'Win',     sign: '+' },
  bet:      { icon: '🎰', color: '#a78bfa', label: 'Bet',     sign: '-' },
  bonus:    { icon: '🎁', color: '#ffc935', label: 'Bonus',   sign: '+' },
  refund:   { icon: '↻', color: '#e0a81f', label: 'Refund',  sign: '+' },
};

const STATUS_BADGE: Record<TxStatus, { bg: string; color: string; label: string }> = {
  completed: { bg: 'rgba(255, 201, 53,0.15)', color: '#ffc935', label: 'Completed' },
  pending:   { bg: 'rgba(255,201,64,0.15)', color: '#ffc940', label: 'Pending'   },
  failed:    { bg: 'rgba(239,42,76,0.15)',  color: '#ef2a4c', label: 'Failed'    },
};

function relativeTime(ts: string | number): string {
  const t = typeof ts === 'number' ? ts : new Date(ts).getTime();
  if (!isFinite(t)) return '';
  const diff = Date.now() - t;
  if (diff < 0) return 'in the future';
  const s = Math.floor(diff / 1000);
  if (s < 60) return `${s}s ago`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 7) return `${d}d ago`;
  return new Date(t).toLocaleDateString();
}

export function WalletDashboard({
  balance,
  bonusBalance = 0,
  transactions = [],
  txLimit = 8,
  currency = '$',
  breakdowns = [],
  onDeposit,
  onWithdraw,
  onHistory,
  onTransactionClick,
}: WalletDashboardProps) {
  const { play } = useSound();

  const fmt = (n: number) =>
    currency + Math.abs(n).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',');

  const click = (fn?: () => void) => () => { play('buttonClick'); fn?.(); };

  const txs = transactions.slice(0, txLimit);

  return (
    <div
      style={{
        background: t.colors.surface.glass,
        backdropFilter: 'blur(14px)',
        borderRadius: t.radius.card,
        padding: '20px 16px',
        border: `1px solid ${t.colors.border.aqua}`,
        boxShadow: `${t.glow.aquaSm}, ${t.shadow.card}`,
      }}
    >
      {/* Balance hero */}
      <div className="c7-card" style={{ textAlign: 'center', marginBottom: 18 }}>
        <div
          style={{
            fontSize: 10,
            color: t.colors.text.tertiary,
            fontWeight: 800,
            letterSpacing: t.type.tracking.widest,
            marginBottom: 4,
            textTransform: 'uppercase',
          }}
        >
          Total Balance
        </div>
        <div
          style={{
            fontSize: 40,
            fontWeight: 900,
            fontFamily: t.type.family.display,
            background: t.gradients.hero,
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
            letterSpacing: t.type.tracking.wide,
            lineHeight: 1.1,
            textShadow: '0 0 24px rgba(255, 201, 53,0.4)',
            fontVariantNumeric: 'tabular-nums',
          }}
        >
          {fmt(balance)}
        </div>
        {bonusBalance > 0 && (
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              marginTop: 8,
              fontSize: 11,
              fontWeight: 700,
              color: t.colors.gold[400],
              background: 'rgba(255,201,64,0.12)',
              padding: '4px 10px',
              borderRadius: t.radius.pill,
              border: `1px solid ${t.colors.gold[400]}55`,
            }}
          >
            🎁 {fmt(bonusBalance)} bonus available
          </div>
        )}
      </div>

      {/* Quick actions */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: 8,
          marginBottom: 16,
        }}
      >
        <button
          className="c7-btn"
          onClick={click(onDeposit)}
          style={{
            padding: '12px 0',
            background: t.gradients.aquaBar,
            border: 'none',
            borderRadius: t.radius.lg,
            fontSize: 14,
            fontWeight: 900,
            color: t.colors.text.onAccent,
            cursor: 'pointer',
            letterSpacing: t.type.tracking.wider,
            fontFamily: t.type.family.display,
            boxShadow: t.glow.aquaSm,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 6,
          }}
        >
          <span style={{ fontSize: 16 }}>↓</span> DEPOSIT
        </button>
        <button
          className="c7-btn"
          onClick={click(onWithdraw)}
          style={{
            padding: '12px 0',
            background: t.colors.surface.elevated,
            border: `1.5px solid ${t.colors.gold[400]}`,
            borderRadius: t.radius.lg,
            fontSize: 14,
            fontWeight: 900,
            color: t.colors.gold[400],
            cursor: 'pointer',
            letterSpacing: t.type.tracking.wider,
            fontFamily: t.type.family.display,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 6,
          }}
        >
          <span style={{ fontSize: 16 }}>↑</span> WITHDRAW
        </button>
      </div>

      {/* Currency breakdown */}
      {breakdowns.length > 0 && (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: `repeat(${Math.min(breakdowns.length, 3)}, 1fr)`,
            gap: 6,
            marginBottom: 18,
          }}
        >
          {breakdowns.slice(0, 3).map(b => (
            <div
              key={b.symbol}
              style={{
                background: t.colors.surface.raised,
                borderRadius: t.radius.md,
                padding: '8px 10px',
                border: `1px solid ${t.colors.border.subtle}`,
                textAlign: 'center',
              }}
            >
              <div
                style={{
                  fontSize: 9,
                  color: t.colors.text.tertiary,
                  letterSpacing: t.type.tracking.wider,
                  fontWeight: 800,
                  marginBottom: 2,
                }}
              >
                {b.label ?? b.symbol}
              </div>
              <div
                style={{
                  fontSize: 13,
                  fontWeight: 800,
                  color: t.colors.aqua[500],
                  fontFamily: t.type.family.mono,
                  fontVariantNumeric: 'tabular-nums',
                }}
              >
                {b.amount.toLocaleString(undefined, { maximumFractionDigits: 4 })}
                <span style={{ fontSize: 9, color: t.colors.text.tertiary, marginLeft: 3 }}>
                  {b.symbol}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Transactions header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'baseline',
          justifyContent: 'space-between',
          marginBottom: 10,
          padding: '0 2px',
        }}
      >
        <div
          style={{
            fontSize: 12,
            fontWeight: 800,
            color: t.colors.text.tertiary,
            letterSpacing: t.type.tracking.wider,
            textTransform: 'uppercase',
          }}
        >
          Recent Activity
        </div>
        {onHistory && txs.length > 0 && (
          <button
            className="c7-btn"
            onClick={click(onHistory)}
            style={{
              background: 'transparent',
              border: 'none',
              color: t.colors.aqua[500],
              fontSize: 11,
              fontWeight: 700,
              cursor: 'pointer',
              padding: 0,
              letterSpacing: t.type.tracking.wide,
            }}
          >
            View all →
          </button>
        )}
      </div>

      {/* Transactions list */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {txs.length === 0 ? (
          <div
            style={{
              padding: '24px 12px',
              textAlign: 'center',
              color: t.colors.text.tertiary,
              fontSize: 12,
              background: t.colors.surface.raised,
              borderRadius: t.radius.md,
              border: `1px dashed ${t.colors.border.subtle}`,
            }}
          >
            No transactions yet. Make your first deposit to start playing 🎰
          </div>
        ) : (
          txs.map((tx, i) => {
            const meta = TX_META[tx.kind];
            const status = tx.status ? STATUS_BADGE[tx.status] : null;
            return (
              <div
                key={tx.id}
                className="c7-slide-in"
                role={onTransactionClick ? 'button' : undefined}
                tabIndex={onTransactionClick ? 0 : undefined}
                onClick={onTransactionClick ? () => { play('buttonClick'); onTransactionClick(tx); } : undefined}
                onKeyDown={onTransactionClick ? (e) => {
                  if (e.key === 'Enter' || e.key === ' ') { play('buttonClick'); onTransactionClick(tx); }
                } : undefined}
                style={{
                  animationDelay: `${i * 0.04}s`,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  padding: '10px 12px',
                  background: t.colors.surface.raised,
                  borderRadius: t.radius.md,
                  border: `1px solid ${t.colors.border.subtle}`,
                  cursor: onTransactionClick ? 'pointer' : 'default',
                  transition: 'background 0.18s',
                }}
              >
                {/* Icon */}
                <div
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: 10,
                    background: `${meta.color}22`,
                    border: `1px solid ${meta.color}44`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 16,
                    color: meta.color,
                    flexShrink: 0,
                  }}
                >
                  {meta.icon}
                </div>

                {/* Label + time */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div
                    style={{
                      fontSize: 13,
                      fontWeight: 700,
                      color: t.colors.text.primary,
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {tx.label || meta.label}
                  </div>
                  <div
                    style={{
                      display: 'flex',
                      gap: 6,
                      alignItems: 'center',
                      marginTop: 1,
                    }}
                  >
                    <span style={{ fontSize: 10, color: t.colors.text.tertiary }}>
                      {relativeTime(tx.timestamp)}
                    </span>
                    {status && (
                      <span
                        style={{
                          fontSize: 9,
                          fontWeight: 700,
                          color: status.color,
                          background: status.bg,
                          padding: '1px 6px',
                          borderRadius: 6,
                          letterSpacing: t.type.tracking.wide,
                        }}
                      >
                        {status.label}
                      </span>
                    )}
                  </div>
                </div>

                {/* Amount */}
                <div
                  style={{
                    fontSize: 14,
                    fontWeight: 900,
                    color: meta.sign === '+' ? meta.color : t.colors.text.primary,
                    fontFamily: t.type.family.mono,
                    fontVariantNumeric: 'tabular-nums',
                    flexShrink: 0,
                  }}
                >
                  {meta.sign}{fmt(tx.amount)}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

export default WalletDashboard;
