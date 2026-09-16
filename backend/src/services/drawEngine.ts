import { supabase } from '../lib/supabase';

const TIER_SPLITS = { 5: 0.40, 4: 0.35, 3: 0.25 } as const;

function drawNumbers(): number[] {
  const pool = Array.from({ length: 45 }, (_, i) => i + 1);
  const result: number[] = [];
  for (let i = 0; i < 5; i++) {
    const idx = Math.floor(Math.random() * pool.length);
    result.push(pool.splice(idx, 1)[0]);
  }
  return result.sort((a, b) => a - b);
}

function countMatches(userNumbers: number[], winningNumbers: number[]): number {
  return userNumbers.filter(n => winningNumbers.includes(n)).length;
}

export async function buildDrawEntries(drawId: string, mode: 'random' | 'weighted') {
  const { data: subs } = await supabase
    .from('subscriptions')
    .select('user_id')
    .eq('status', 'active');

  if (!subs || subs.length === 0) return;

  const entries = [];
  for (const sub of subs) {
    const { data: scores } = await supabase
      .from('scores')
      .select('value')
      .eq('user_id', sub.user_id)
      .order('played_on', { ascending: false })
      .limit(5);

    if (!scores || scores.length === 0) continue;

    entries.push({
      draw_id: drawId,
      user_id: sub.user_id,
      numbers: scores.map(s => s.value),
      weight: mode === 'weighted' ? scores.length : 1,
    });
  }

  if (entries.length > 0) {
    await supabase.from('draw_entries').upsert(entries, { onConflict: 'draw_id,user_id' });
  }
}

export async function runDraw(drawId: string, isSimulation: boolean) {
  const { data: draw } = await supabase
    .from('draws')
    .select('prize_pool_pence, rollover_pence, mode')
    .eq('id', drawId)
    .single();

  if (!draw) throw new Error('Draw not found');

  await buildDrawEntries(drawId, draw.mode);

  const { data: entries } = await supabase
    .from('draw_entries')
    .select('user_id, numbers, weight')
    .eq('draw_id', drawId);

  if (!entries || entries.length === 0) throw new Error('No entries for this draw');

  const winningNumbers = drawNumbers();
  const tierWinners: Record<number, string[]> = { 5: [], 4: [], 3: [] };

  for (const entry of entries) {
    const matches = countMatches(entry.numbers, winningNumbers);
    if (matches >= 3 && matches <= 5) tierWinners[matches].push(entry.user_id);
  }

  // Effective pool = base pool + any rolled-over jackpot
  const effectivePool = draw.prize_pool_pence + draw.rollover_pence;
  const winnerRows = [];
  let newRollover = 0;

  for (const tier of [5, 4, 3] as const) {
    const winners = tierWinners[tier];
    const tierPool = Math.floor(effectivePool * TIER_SPLITS[tier]);

    if (winners.length === 0) {
      // Tier 5 jackpot rolls over; tiers 3 & 4 do not
      if (tier === 5) newRollover = tierPool;
      continue;
    }

    const prizeEach = Math.floor(tierPool / winners.length);
    for (const userId of winners) {
      winnerRows.push({ draw_id: drawId, user_id: userId, tier, prize_pence: prizeEach, verification_status: 'pending' });
    }
  }

  if (!isSimulation) {
    await supabase.from('draws').update({
      winning_numbers: winningNumbers,
      is_simulation_run: false,
      status: 'published',
    }).eq('id', drawId);

    if (winnerRows.length > 0) {
      await supabase.from('winners').insert(winnerRows);
    }

    // Carry rollover into next draw if it exists, otherwise store on this draw for reference
    if (newRollover > 0) {
      const { data: nextDraw } = await supabase
        .from('draws')
        .select('id')
        .eq('status', 'draft')
        .order('month', { ascending: true })
        .limit(1)
        .single();

      if (nextDraw) {
        await supabase.from('draws')
          .update({ rollover_pence: newRollover })
          .eq('id', nextDraw.id);
      }
    }
  } else {
    await supabase.from('draws').update({
      winning_numbers: winningNumbers,
      is_simulation_run: true,
      status: 'simulated',
    }).eq('id', drawId);
  }

  return { winningNumbers, tierWinners, winnerRows, rolloverPence: newRollover };
}

export async function calculatePrizePool(drawId: string): Promise<number> {
  const { count } = await supabase
    .from('subscriptions')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'active');

  const MONTHLY_FEE_PENCE = 999;
  const CHARITY_PCT = 0.10;
  const pool = Math.floor((count ?? 0) * MONTHLY_FEE_PENCE * (1 - CHARITY_PCT));

  await supabase.from('draws').update({ prize_pool_pence: pool }).eq('id', drawId);
  return pool;
}
