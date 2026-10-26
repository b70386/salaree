const $ = (id) => document.getElementById(id);
const rupiah = (value) => new Intl.NumberFormat('id-ID', {style:'currency',currency:'IDR',maximumFractionDigits:0}).format(Number(value)||0);
let regions = [];
let activeRegion = null;
async function getJSON(url, options = {}) { const response = await fetch(url, {headers:{'Content-Type':'application/json'}, ...options}); const data = await response.json(); if (!response.ok) throw new Error(data.error || 'Permintaan gagal.'); return data; }
function toast(message) { const el = $('toast'); el.textContent = message; el.classList.add('visible'); window.setTimeout(() => el.classList.remove('visible'), 2600); }
function renderStats(summary) { $('regionCount').textContent = summary.region_count ?? '—'; $('averageRatio').textContent = summary.average_ratio == null ? '—' : summary.average_ratio + '%'; $('highestRatio').textContent = summary.highest_ratio ? summary.highest_ratio.ratio_percent + '%' : '—'; $('highestName').textContent = summary.highest_ratio?.name || 'Tidak tersedia'; $('lowestRatio').textContent = summary.lowest_ratio ? summary.lowest_ratio.ratio_percent + '%' : '—'; $('lowestName').textContent = summary.lowest_ratio?.name || 'Tidak tersedia'; }
function escapeHTML(value) { return String(value).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }
function renderRows() { const query = $('regionSearch').value.trim().toLocaleLowerCase('id-ID'); const rows = regions.filter(r => r.name.toLocaleLowerCase('id-ID').includes(query) || r.province.toLocaleLowerCase('id-ID').includes(query)); $('regionRows').innerHTML = rows.map(r => { const ratio = Math.max(0,Math.min(100,Number(r.ratio_percent)||0)); return '<tr><td><span class="region-name">'+escapeHTML(r.name)+'</span><span class="region-sub">'+escapeHTML(r.wage_type)+' · Dataset demo</span></td><td class="money">'+rupiah(r.monthly_wage)+'</td><td class="money">'+rupiah(r.basket_cost)+'</td><td class="ratio-cell"><div class="ratio-number"><span>'+r.ratio_percent+'%</span><span>upah</span></div><div class="mini-track"><span style="width:'+ratio+'%"></span></div></td><td><button class="row-action" data-region="'+escapeHTML(r.id)+'">Pilih ↗</button></td></tr>'; }).join('') || '<tr><td colspan="5" class="loading">Wilayah tidak ditemukan.</td></tr>'; document.querySelectorAll('[data-region]').forEach(btn => btn.addEventListener('click', () => selectRegion(btn.dataset.region,true))); }
function renderBreakdown(items) { $('itemBreakdown').innerHTML = items.map(item => '<div class="item-line"><span>'+escapeHTML(item.name)+' <span style="color:#a1aaa1">· '+item.monthly_quantity+' '+escapeHTML(item.unit)+'</span></span><strong>'+rupiah(item.cost)+'</strong></div>').join(''); }
async function selectRegion(id, scroll = false) { try { const data = await getJSON('/api/regions/'+encodeURIComponent(id)); activeRegion = data.region; $('calcRegion').value = id; $('calcWage').value = activeRegion.monthly_wage; await calculateNow(); if (scroll) $('kalkulator').scrollIntoView({behavior:'smooth',block:'start'}); } catch (error) { toast(error.message); } }
async function calculateNow() { const regionId = $('calcRegion').value; const wage = Number($('calcWage').value); const people = Number($('calcPeople').value); if (!regionId || !Number.isFinite(wage) || wage <= 0 || !Number.isInteger(people) || people < 1 || people > 20) { toast('Masukkan upah positif dan jumlah anggota 1–20 orang.'); return; } try { const data = await getJSON('/api/calculate',{method:'POST',body:JSON.stringify({region_id:regionId,wage,people})}); const c = data.calculation; $('resultCost').textContent = rupiah(c.basket_cost); $('resultRatio').textContent = c.ratio_percent == null ? '—' : c.ratio_percent+'%'; $('resultRemaining').textContent = rupiah(c.remaining); $('ratioBar').style.width = Math.max(0,Math.min(100,c.ratio_percent||0))+'%'; $('resultStatus').textContent = data.metadata.dataset_status || 'DEMO'; $('resultHint').textContent = c.remaining < 0 ? 'Biaya paket simulasi melebihi upah yang dimasukkan. Ini belum mencakup kebutuhan hidup lainnya.' : 'Sisa ini hanya setelah paket sembako simulasi; belum dikurangi kebutuhan hidup lain.'; renderBreakdown(c.items); } catch (error) { toast(error.message); } }
async function init() { try { const results = await Promise.all([getJSON('/api/regions'),getJSON('/api/summary')]); const regionData = results[0], summary = results[1]; regions = regionData.regions; renderStats(summary); $('calcRegion').innerHTML = regions.map(r => '<option value="'+escapeHTML(r.id)+'">'+escapeHTML(r.name)+'</option>').join(''); renderRows(); if (regions.length) await selectRegion(regions[0].id); if (regionData.metadata?.is_demo) $('dataNotice').hidden = false; } catch (error) { $('regionRows').innerHTML = '<tr><td colspan="5" class="loading">Gagal memuat data. Pastikan server Flask berjalan, lalu muat ulang halaman.</td></tr>'; toast(error.message); } }
$('regionSearch').addEventListener('input',renderRows);
$('calcRegion').addEventListener('change',() => { const r = regions.find(item => item.id === $('calcRegion').value); if (r) $('calcWage').value = r.monthly_wage; calculateNow(); });
$('calculateBtn').addEventListener('click',calculateNow);
$('minusPeople').addEventListener('click',() => {$('calcPeople').value = Math.max(1,Number($('calcPeople').value||1)-1);calculateNow();});
$('plusPeople').addEventListener('click',() => {$('calcPeople').value = Math.min(20,Number($('calcPeople').value||1)+1);calculateNow();});
$('calcWage').addEventListener('change',calculateNow);
$('calcPeople').addEventListener('change',() => {$('calcPeople').value=Math.max(1,Math.min(20,Math.round(Number($('calcPeople').value)||1)));calculateNow();});
init();


// AKG reference calculator. These are reference targets, not a meal prescription.
let akgProfiles = [];
let akgMembers = [];
const akgNumber = (value) => new Intl.NumberFormat('id-ID', {maximumFractionDigits:1}).format(Number(value)||0);
async function initAKG() {
  try {
    const data = await getJSON('/api/akg');
    akgProfiles = data.profiles || [];
    $('akgProfile').innerHTML = akgProfiles.map(p => '<option value="'+escapeHTML(p.id)+'">'+escapeHTML(p.label)+'</option>').join('');
    $('akgProfileNote').textContent = 'Sumber: '+data.metadata.regulation+'. Nilai adalah referensi per orang per hari.';
    $('akgProfile').addEventListener('change', renderAKGProfile);
    $('akgAddBtn').addEventListener('click', addAKGMember);
    $('akgResetBtn').addEventListener('click', () => { akgMembers = []; renderAKGMembers(); });
    renderAKGProfile();
  } catch (error) {
    $('akgProfileNote').textContent = 'Referensi AKG gagal dimuat: '+error.message;
  }
}
function renderAKGProfile() {
  const profile = akgProfiles.find(p => p.id === $('akgProfile').value);
  if (!profile) return;
  $('akgProfileNote').textContent = profile.label+': '+akgNumber(profile.energy_kcal)+' kkal, protein '+akgNumber(profile.protein_g)+' g, lemak '+akgNumber(profile.fat_g)+' g per hari. Nilai ini berdasarkan berat/tinggi rujukan AKG.';
}
async function addAKGMember() {
  const profileId = $('akgProfile').value;
  const count = Number($('akgCount').value);
  if (!profileId || !Number.isInteger(count) || count < 1 || count > 20 || akgMembers.reduce((n,m)=>n+m.count,0)+count > 20) {
    toast('Jumlah anggota harus 1–20 orang secara keseluruhan.'); return;
  }
  const existing = akgMembers.find(m => m.profile_id === profileId);
  if (existing) existing.count += count;
  else akgMembers.push({profile_id:profileId,count});
  await renderAKGMembers();
}
async function removeAKGMember(index) {
  akgMembers.splice(index,1);
  await renderAKGMembers();
}
async function renderAKGMembers() {
  if (!akgMembers.length) {
    $('akgMembers').innerHTML = '<p class="loading">Belum ada kelompok anggota keluarga yang ditambahkan.</p>';
    $('akgTotals').innerHTML = '<p class="loading">Tambahkan kelompok umur untuk menghitung target gabungan.</p>';
    return;
  }
  $('akgMembers').innerHTML = akgMembers.map((m,i) => {
    const p = akgProfiles.find(profile => profile.id === m.profile_id);
    return '<div class="akg-member"><span><strong>'+escapeHTML(p?.label || m.profile_id)+'</strong><small>'+m.count+' orang</small></span><button class="row-action" type="button" data-akg-remove="'+i+'" aria-label="Hapus kelompok">Hapus</button></div>';
  }).join('');
  document.querySelectorAll('[data-akg-remove]').forEach(btn => btn.addEventListener('click', () => removeAKGMember(Number(btn.dataset.akgRemove))));
  try {
    const result = await getJSON('/api/akg/calculate',{method:'POST',body:JSON.stringify({members:akgMembers})});
    const fields = [
      ['energy_kcal','Energi','kkal'],['protein_g','Protein','g'],['fat_g','Lemak total','g'],['carbohydrate_g','Karbohidrat','g'],['fiber_g','Serat','g'],['water_ml','Air total','ml']
    ];
    $('akgTotals').innerHTML = '<div class="akg-metrics">'+fields.map(([key,label,unit]) => '<div class="akg-metric"><span>'+label+'</span><strong>'+akgNumber(result.daily_household_targets[key])+' <small>'+unit+'/hari</small></strong><em>'+akgNumber(result.monthly_household_targets[key])+' '+unit+'/30 hari</em></div>').join('')+'</div><p class="akg-small">Jumlah orang: '+result.member_count+'. Total adalah penjumlahan target referensi, bukan jumlah makanan yang harus dibeli. '+escapeHTML(result.warning)+'</p>';
  } catch (error) { toast(error.message); }
}
initAKG();