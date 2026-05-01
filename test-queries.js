const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  'https://uflybwitdxbjnjmgdydq.supabase.co',
  'sb_publishable_nwAWGDO6npNCPRQ1IubgdA_zk-Rg9-o'
);

async function testQuery() {
  console.log("Testing loadProjects query from admin.js...");
  const { data: adminProjects, error: adminError } = await supabase
      .from('projects')
      .select('*')
      .order('is_featured', { ascending: false })
      .order('updated_at', { ascending: false });
      
  if (adminError) {
      console.error("❌ Admin Query Error:", adminError);
  } else {
      console.log(`✅ Admin Query Success! Found ${adminProjects.length} projects.`);
      if (adminProjects.length > 0) {
          console.log("First project keys:", Object.keys(adminProjects[0]));
      }
  }

  console.log("\nTesting loadProjects query from script.js...");
  const { data: scriptProjects, error: scriptError } = await supabase
      .from('projects')
      .select('*')
      .neq('display_order', -1)
      .order('is_featured', { ascending: false })
      .order('updated_at', { ascending: false });

  if (scriptError) {
      console.error("❌ Script Query Error:", scriptError);
  } else {
      console.log(`✅ Script Query Success! Found ${scriptProjects.length} visible projects.`);
  }
}

testQuery();
