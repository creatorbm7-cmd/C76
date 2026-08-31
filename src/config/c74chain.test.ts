import { describe, it, expect } from 'vitest';
import {
  C74_CHAIN,
  c74TokenAddress,
  c74ClaimAddress,
  c74OnchainLive,
  c74IsTestnet,
  c74NetworkLabel,
} from './c74chain';

// These tests guard the honesty invariant: until a deliberate mainnet go-live,
// the on-chain C74 features must stay OFF and no mainnet address may leak in.
describe('c74chain config — safe defaults', () => {
  it('is disabled by default', () => {
    expect(C74_CHAIN.enabled).toBe(false);
  });

  it('defaults to the Nile testnet', () => {
    expect(C74_CHAIN.network).toBe('nile');
    expect(c74IsTestnet()).toBe(true);
    expect(c74NetworkLabel()).toMatch(/nile/i);
  });

  it('has no mainnet addresses committed', () => {
    expect(C74_CHAIN.token.mainnet).toBe('');
    expect(C74_CHAIN.claim.mainnet).toBe('');
  });

  it('exposes the validated Nile testnet addresses', () => {
    expect(c74TokenAddress()).toBe('TNF8yYEsXT8PE3rB7PcnT4No7j6gVvC5of');
    expect(c74ClaimAddress()).toBe('TUXk5Bwy49nYTxDMWhaeJdrQWUgX67nzdP');
  });

  it('reports on-chain NOT live while the master flag is off', () => {
    // Even though a (testnet) token address exists, the master flag gates it.
    expect(c74OnchainLive()).toBe(false);
  });
});
