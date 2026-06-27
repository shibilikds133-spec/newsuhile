
import { createClient } from '@supabase/supabase-js';

const url = 'https://fxkjkdejpfdyqbqnosik.supabase.co';
const key = 'sb_publishable_3t3r3-3IlAvKY4f57pQQIQ_o3EvooEm';
const supabase = createClient(url, key);

async function test() {
  console.log('Fetching 1 record...');
  const { data: fetch1, error: err1 } = await supabase.from('income').select('*').limit(1);
  if (err1) { console.error('Fetch error:', err1); return; }
  if (!fetch1 || fetch1.length === 0) { console.log('No records found.'); return; }
  
  const id = fetch1[0].id;
  console.log('Original record:', fetch1[0]);

  console.log('Running deleteRecord update...');
  const { error: err2 } = await supabase
    .from('income')
    .update({ is_deleted: true })
    .eq('id', id);
  if (err2) { console.error('Update error:', err2); }

  console.log('Fetching record again...');
  const { data: fetch2, error: err3 } = await supabase.from('income').select('*').eq('id', id);
  if (err3) { console.error('Refetch error:', err3); }
  
  if (!fetch2 || fetch2.length === 0) {
    console.log('Case C: Row no longer exists');
  } else {
    console.log('Resulting record:', fetch2[0]);
    if (fetch2[0].is_deleted === true) {
      console.log('Case A: is_deleted is true');
    } else {
      console.log('Case B: is_deleted is false (or not true)');
    }
  }

  // Restore it
  await supabase.from('income').update({ is_deleted: false }).eq('id', id);
}

test();

