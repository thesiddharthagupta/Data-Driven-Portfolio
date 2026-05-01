const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  'https://uflybwitdxbjnjmgdydq.supabase.co',
  'sb_publishable_nwAWGDO6npNCPRQ1IubgdA_zk-Rg9-o'
);

async function test() {
  const { data, error } = await supabase.from('projects').select('*').limit(1);
  if (error) {
    console.error('Error fetching projects:', error);
  } else {
    console.log('Success! Data:', data);
  }
}

test();
