/***** DATA LAYER (with optional localStorage) *****/
const USE_LOCAL_STORAGE = true; // toggle persistence

// default seed data
const seedPets = [
  { id: 1, name: "Sparky", species: "Dog", age: 3, status: "Available", photo: null, records: [] },
  { id: 2, name: "Whiskers", species: "Cat", age: 5, status: "Adopted", photo: null, records: [] },
  { id: 3, name: "Bunny", species: "Rabbit", age: 1, status: "Available", photo: null, records: [] }
];
const seedUsers = [
  { id: 'u1', name: "Jane Doe", role: "Applicant", status: "Active", email: "jane@example.com" },
  { id: 'u2', name: "John Smith", role: "Admin", status: "Active", email: "john@example.com" }
];
const seedAdoptions = [
  { id: 101, petId: 1, petName: "Sparky", userId: 'u1', userName: "Jane Doe", status: "Pending", notes: "Has fenced yard." }
];

let MOCK_PETS = [];
let MOCK_USERS = [];
let MOCK_ADOPTIONS = [];
let nextPetId = 1;
let nextAdoptionId = 101;

function loadData(){
  if(USE_LOCAL_STORAGE && localStorage.getItem('adm_pets')){
    try {
      MOCK_PETS = JSON.parse(localStorage.getItem('adm_pets'));
      MOCK_USERS = JSON.parse(localStorage.getItem('adm_users'));
      MOCK_ADOPTIONS = JSON.parse(localStorage.getItem('adm_adoptions'));
      nextPetId = parseInt(localStorage.getItem('adm_nextPetId')|| (MOCK_PETS.length+1));
      nextAdoptionId = parseInt(localStorage.getItem('adm_nextAdoptionId') || 101);
      return;
    } catch(e){
      console.warn('localStorage parse error, seeding defaults', e);
    }
  }
  // seed
  MOCK_PETS = seedPets.map(p => ({...p, records: p.records||[]}));
  MOCK_USERS = seedUsers.slice();
  MOCK_ADOPTIONS = seedAdoptions.slice();
  nextPetId = MOCK_PETS.length + 1;
  nextAdoptionId = MOCK_ADOPTIONS.length ? Math.max(...MOCK_ADOPTIONS.map(a=>a.id)) + 1 : 101;
  saveData();
}

function saveData(){
  if(!USE_LOCAL_STORAGE) return;
  localStorage.setItem('adm_pets', JSON.stringify(MOCK_PETS));
  localStorage.setItem('adm_users', JSON.stringify(MOCK_USERS));
  localStorage.setItem('adm_adoptions', JSON.stringify(MOCK_ADOPTIONS));
  localStorage.setItem('adm_nextPetId', String(nextPetId));
  localStorage.setItem('adm_nextAdoptionId', String(nextAdoptionId));
}

/***** UTILS *****/
function uid(prefix='id'){ return prefix + Math.random().toString(36).slice(2,9); }
function el(tag, cls='', inner=''){ const d=document.createElement(tag); if(cls) d.className=cls; if(inner!==undefined) d.innerHTML=inner; return d; }

// Exposed globally for use in HTML onclick handlers
window.showModal = function(title, bodyHtml, opts={}) {
  const root = document.getElementById('modal-root');
  document.getElementById('modal-title').textContent = title;
  const body = document.getElementById('modal-body');
  body.innerHTML = '';
  if(typeof bodyHtml === 'string') body.innerHTML = bodyHtml;
  else if(bodyHtml instanceof HTMLElement) body.appendChild(bodyHtml);
  root.classList.remove('hidden');
  lucide.createIcons();
}
window.closeModal = function(){
  document.getElementById('modal-root').classList.add('hidden');
}

function formatDate(ts = Date.now()){
  const d = new Date(ts);
  return d.toLocaleString();
}

/***** RENDER / UI LIFECYCLE *****/
window.showSection = function(id){
  document.querySelectorAll('main section').forEach(s => s.classList.add('hidden'));
  const sec = document.getElementById(id);
  if(sec) sec.classList.remove('hidden');
  // highlight nav
  document.querySelectorAll('header nav .nav-item').forEach(b => b.classList.remove('bg-amber-500/10','text-amber-600'));
  const btn = Array.from(document.querySelectorAll('header nav .nav-item')).find(b => b.textContent.trim().toLowerCase() === (id==='dashboard'?'dashboard': id.replace('-',' ')));
  // best-effort highlight: fallback to simple approach
  document.querySelectorAll('header nav .nav-item').forEach(b => { if(b.onclick && b.getAttribute('onclick').includes(id)) b.classList.add('bg-amber-500/10','text-amber-600'); });
  // special render calls
  if(id === 'dashboard') renderDashboard();
  if(id === 'pet-management') renderPetList();
  if(id === 'adoption-management') renderAdoptionRequests();
  if(id === 'health-records') { renderHealthRecords(); renderHealthSelector(); }
  if(id === 'user-management') renderUserList();
}

window.renderDashboard = function(){
  document.getElementById('metric-total-pets').textContent = MOCK_PETS.length;
  const pending = MOCK_ADOPTIONS.filter(a => a.status === 'Pending').length;
  document.getElementById('metric-pending').textContent = pending;
  const available = MOCK_PETS.filter(p => p.status === 'Available').length;
  document.getElementById('metric-available').textContent = available;

  // Recent activity (last 8 events)
  const recent = [];
  MOCK_ADOPTIONS.slice(-6).reverse().forEach(a => recent.push(`${formatDate()} — Application #${a.id} (${a.petName}) status: ${a.status}`));
  // add pet additions
  MOCK_PETS.slice(-3).reverse().forEach(p => recent.push(`${formatDate()} — Pet added: ${p.name}`));
  const rEl = document.getElementById('recent-activity');
  rEl.innerHTML = recent.length ? recent.map(t => `<li>${t}</li>`).join('') : '<li class="text-sm text-slate-500">No recent activity</li>';

  // System alerts
  const alerts = [];
  if(MOCK_ADOPTIONS.some(a => a.status === 'Pending')) alerts.push('There are pending adoption requests that need review.');
  if(MOCK_USERS.some(u => u.status === 'Deactivated')) alerts.push('Some user accounts are deactivated.');
  const aEl = document.getElementById('system-alerts');
  aEl.innerHTML = alerts.length ? alerts.map(x=>`<li>${x}</li>`).join('') : '<li class="text-sm text-slate-500">No critical alerts</li>';
}

/***** PET LIST UI *****/
window.renderPetList = function(){
  const container = document.getElementById('pet-list');
  const q = (document.getElementById('pet-search').value||'').toLowerCase();
  container.innerHTML = '';
  const filtered = MOCK_PETS.filter(p => `${p.name} ${p.species}`.toLowerCase().includes(q) || String(p.id) === q);
  if(filtered.length === 0){
    container.innerHTML = `<div class="glass-card p-6 text-slate-600 italic">No pets found.</div>`;
    return;
  }
  filtered.forEach(p => {
    const card = el('div','glass-card p-4 flex gap-3 items-center');
    const left = el('div','w-20 h-20 rounded-full overflow-hidden bg-slate-100 flex items-center justify-center');
    if(p.photo){
      const img = el('img','preview-img');
      img.src = p.photo;
      left.appendChild(img);
    } else {
      left.innerHTML = `<i data-lucide="paw" class="text-amber-500"></i>`;
    }
    card.appendChild(left);
    const mid = el('div','flex-1 min-w-0');
    mid.innerHTML = `<div class="font-semibold">${p.name} <span class="text-xs text-slate-500">(${p.species})</span></div>
                     <div class="text-sm text-slate-600">${p.age} yr(s) • <span class="px-2 py-0.5 rounded-full text-xs border ${p.status==='Available'?'border-green-300 text-green-700 bg-green-50':'border-slate-200 text-slate-700'}">${p.status}</span></div>`;
    card.appendChild(mid);

    const actions = el('div','flex flex-col gap-2 items-end');
    const editBtn = el('button','icon-btn text-amber-600','<i data-lucide="edit-2"></i>');
    editBtn.title = 'Edit Pet';
    editBtn.onclick = () => openEditPetModal(p.id);
    const healthBtn = el('button','icon-btn text-sky-600','<i data-lucide="stethoscope"></i>');
    healthBtn.title = 'Log Health Record';
    healthBtn.onclick = () => openLogHealthModal(p.id);
    const adoptBtn = el('button','px-3 py-1 rounded-md bg-amber-100 text-amber-700 text-sm font-semibold','Create Request');
    adoptBtn.onclick = () => openCreateAdoptionModal(p.id);
    const delBtn = el('button','icon-btn text-red-600','<i data-lucide="trash-2"></i>');
    delBtn.title = 'Delete Pet';
    delBtn.onclick = () => confirmDeletePet(p.id);

    actions.appendChild(editBtn);
    actions.appendChild(healthBtn);
    actions.appendChild(adoptBtn);
    actions.appendChild(delBtn);
    card.appendChild(actions);

    container.appendChild(card);
  });
  lucide.createIcons();
}

/***** PET CRUD *****/
window.openAddPetModal = function(){
  const body = document.createElement('div');
  body.innerHTML = `
    <div class="grid gap-3">
      <input id="m-pet-name" class="px-3 py-2 border rounded-lg" placeholder="Pet name" />
      <div class="grid grid-cols-2 gap-2">
        <select id="m-pet-species" class="px-3 py-2 border rounded-lg">
          <option>Dog</option><option>Cat</option><option>Rabbit</option><option>Other</option>
        </select>
        <input id="m-pet-age" type="number" class="px-3 py-2 border rounded-lg" placeholder="Age" min="0" />
      </div>
      <div>
        <label class="text-sm text-slate-600">Photo (max 500KB)</label>
        <input id="m-pet-photo" type="file" accept="image/*" class="mt-2" />
        <div id="m-pet-photo-preview" class="mt-2 w-20 h-20 rounded-full overflow-hidden bg-slate-100"></div>
      </div>
      <div class="flex gap-2">
        <button id="m-pet-save" class="px-3 py-2 rounded-lg accent-btn text-white font-semibold">Save Pet</button>
        <button id="m-pet-cancel" class="px-3 py-2 rounded-lg border">Cancel</button>
      </div>
    </div>
  `;
  showModal('Add New Pet', body);

  const fileInput = document.getElementById('m-pet-photo');
  const preview = document.getElementById('m-pet-photo-preview');
  let currentPhoto = null;
  fileInput.onchange = async (e) => {
    const f = e.target.files && e.target.files[0];
    if(!f) return;
    if(f.size > 500*1024){ alert('File too large (max 500KB)'); fileInput.value=''; return; }
    const data = await readFileAsDataURL(f);
    currentPhoto = data;
    preview.innerHTML = `<img src="${data}" class="w-full h-full object-cover">`;
  };

  document.getElementById('m-pet-cancel').onclick = closeModal;
  document.getElementById('m-pet-save').onclick = () => {
    const name = (document.getElementById('m-pet-name').value||'').trim();
    const species = (document.getElementById('m-pet-species').value||'').trim();
    const age = parseInt(document.getElementById('m-pet-age').value||0);
    if(!name || !species || isNaN(age)){ alert('Please fill all fields'); return; }
    const newPet = { id: nextPetId++, name, species, age, status: 'Available', photo: currentPhoto, records: [] };
    MOCK_PETS.push(newPet);
    saveData();
    renderPetList();
    renderDashboard();
    closeModal();
    showToast('Pet added successfully');
  };
}

window.openEditPetModal = function(petId){
  const pet = MOCK_PETS.find(p=>p.id===petId);
  if(!pet) return;
  const body = document.createElement('div');
  body.innerHTML = `
    <div class="grid gap-3">
      <input id="m-pet-name" class="px-3 py-2 border rounded-lg" value="${escapeHtml(pet.name)}" />
      <div class="grid grid-cols-2 gap-2">
        <select id="m-pet-species" class="px-3 py-2 border rounded-lg">
          <option ${pet.species==='Dog'?'selected':''}>Dog</option>
          <option ${pet.species==='Cat'?'selected':''}>Cat</option>
          <option ${pet.species==='Rabbit'?'selected':''}>Rabbit</option>
          <option ${pet.species==='Other'?'selected':''}>Other</option>
        </select>
        <input id="m-pet-age" type="number" class="px-3 py-2 border rounded-lg" value="${pet.age}" min="0" />
      </div>
      <div>
        <label class="text-sm text-slate-600">Photo (max 500KB)</label>
        <input id="m-pet-photo" type="file" accept="image/*" class="mt-2" />
        <div id="m-pet-photo-preview" class="mt-2 w-20 h-20 rounded-full overflow-hidden bg-slate-100">
          ${pet.photo? `<img src="${pet.photo}" class="w-full h-full object-cover">` : ''}
        </div>
      </div>
      <div class="flex gap-2">
        <button id="m-pet-save" class="px-3 py-2 rounded-lg accent-btn text-white font-semibold">Save Changes</button>
        <button id="m-pet-cancel" class="px-3 py-2 rounded-lg border">Cancel</button>
      </div>
    </div>
  `;
  showModal('Edit Pet', body);

  const fileInput = document.getElementById('m-pet-photo');
  const preview = document.getElementById('m-pet-photo-preview');
  let currentPhoto = pet.photo;
  fileInput.onchange = async (e) => {
    const f = e.target.files && e.target.files[0];
    if(!f) return;
    if(f.size > 500*1024){ alert('File too large (max 500KB)'); fileInput.value=''; return; }
    const data = await readFileAsDataURL(f);
    currentPhoto = data;
    preview.innerHTML = `<img src="${data}" class="w-full h-full object-cover">`;
  };

  document.getElementById('m-pet-cancel').onclick = closeModal;
  document.getElementById('m-pet-save').onclick = () => {
    const name = (document.getElementById('m-pet-name').value||'').trim();
    const species = (document.getElementById('m-pet-species').value||'').trim();
    const age = parseInt(document.getElementById('m-pet-age').value||0);
    if(!name || !species || isNaN(age)){ alert('Please fill all fields'); return; }
    pet.name = name; pet.species = species; pet.age = age; pet.photo = currentPhoto;
    saveData();
    renderPetList();
    renderDashboard();
    closeModal();
    showToast('Pet updated');
  };
}

window.confirmDeletePet = function(petId){
  const pet = MOCK_PETS.find(p=>p.id===petId);
  if(!pet) return;
  showModal('Confirm Delete', `<div>
    <p>Are you sure you want to permanently delete <strong>${escapeHtml(pet.name)}</strong>?</p>
    <div class="mt-4 flex gap-2">
      <button id="confirm-del" class="px-3 py-2 rounded-lg bg-red-600 text-white">Delete</button>
      <button id="cancel-del" class="px-3 py-2 rounded-lg border">Cancel</button>
    </div>
  </div>`);
  document.getElementById('cancel-del').onclick = closeModal;
  document.getElementById('confirm-del').onclick = () => {
    MOCK_PETS = MOCK_PETS.filter(p=>p.id!==petId);
    // also remove related adoptions
    MOCK_ADOPTIONS = MOCK_ADOPTIONS.filter(a=>a.petId!==petId);
    saveData();
    renderPetList(); renderAdoptionRequests(); renderDashboard();
    closeModal();
    showToast('Pet deleted');
  };
}

/***** ADOPTION REQUESTS *****/
window.renderAdoptionRequests = function(){
  const container = document.getElementById('adoption-requests');
  const q = (document.getElementById('adoption-search').value||'').toLowerCase();
  container.innerHTML = '';
  const filtered = MOCK_ADOPTIONS.filter(a => `${a.petName} ${a.userName} ${a.status}`.toLowerCase().includes(q) || String(a.id)===q);
  if(filtered.length===0){ container.innerHTML = `<div class="glass-card p-4 text-slate-600 italic">No requests found.</div>`; return; }
  filtered.forEach(a => {
    const card = el('div','glass-card p-4 flex justify-between items-start gap-4');
    card.innerHTML = `<div class="flex-1">
      <div class="font-semibold">Application #${a.id} — ${escapeHtml(a.petName)}</div>
      <div class="text-sm text-slate-600">Applicant: ${escapeHtml(a.userName)} • ${escapeHtml(a.notes||'')}</div>
      <div class="mt-2"><span class="px-2 py-0.5 rounded-full text-xs border ${a.status==='Pending'?'border-yellow-300 text-yellow-700':'border-green-300 text-green-700'}">${a.status}</span></div>
    </div>`;
    const actions = el('div','flex flex-col gap-2');
    if(a.status==='Pending'){
      const approve = el('button','px-3 py-1 rounded-md bg-green-600 text-white text-sm','Approve');
      approve.onclick = () => updateAdoptionStatus(a.id,'Approved');
      const reject = el('button','px-3 py-1 rounded-md bg-red-600 text-white text-sm','Reject');
      reject.onclick = () => updateAdoptionStatus(a.id,'Rejected');
      const more = el('button','px-3 py-1 rounded-md bg-amber-500 text-white text-sm','More Info');
      more.onclick = () => updateAdoptionStatus(a.id,'Need More Info');
      actions.appendChild(approve); actions.appendChild(reject); actions.appendChild(more);
    } else {
      const info = el('div','text-sm text-slate-600',`Status: ${a.status}`);
      actions.appendChild(info);
    }
    card.appendChild(actions);
    container.appendChild(card);
  });
  lucide.createIcons();
}

window.openCreateAdoptionModal = function(prefillPetId){
  const body = document.createElement('div');
  // build pet and user options
  const petOptions = MOCK_PETS.map(p => `<option value="${p.id}">${escapeHtml(p.name)} (${p.species})</option>`).join('');
  const userOptions = MOCK_USERS.map(u => `<option value="${u.id}">${escapeHtml(u.name)} (${u.email||''})</option>`).join('');
  body.innerHTML = `
    <div class="grid gap-3">
      <label class="text-sm text-slate-600">Pet</label>
      <select id="m-adv-pet" class="px-3 py-2 border rounded-lg">${petOptions}</select>
      <label class="text-sm text-slate-600">Applicant</label>
      <select id="m-adv-user" class="px-3 py-2 border rounded-lg">${userOptions}</select>
      <textarea id="m-adv-notes" class="px-3 py-2 border rounded-lg" placeholder="Notes (fenced yard, experience...)"></textarea>
      <div class="flex gap-2">
        <button id="m-adv-save" class="px-3 py-2 rounded-lg accent-btn text-white font-semibold">Create Request</button>
        <button id="m-adv-cancel" class="px-3 py-2 rounded-lg border">Cancel</button>
      </div>
    </div>
  `;
  showModal('New Adoption Request', body);
  if(prefillPetId) document.getElementById('m-adv-pet').value = prefillPetId;
  document.getElementById('m-adv-cancel').onclick = closeModal;
  document.getElementById('m-adv-save').onclick = () => {
    const petId = parseInt(document.getElementById('m-adv-pet').value);
    const userId = document.getElementById('m-adv-user').value;
    const notes = (document.getElementById('m-adv-notes').value||'').trim();
    if(!petId || !userId){ alert('Select pet and applicant'); return; }
    const pet = MOCK_PETS.find(p=>p.id===petId);
    const user = MOCK_USERS.find(u=>u.id===userId);
    const newA = { id: nextAdoptionId++, petId, petName: pet.name, userId, userName: user.name, status: 'Pending', notes };
    MOCK_ADOPTIONS.push(newA);
    saveData();
    renderAdoptionRequests();
    renderDashboard();
    closeModal();
    showToast('Adoption request created');
  };
}

window.updateAdoptionStatus = function(appId, newStatus){
  const app = MOCK_ADOPTIONS.find(a=>a.id===appId);
  if(!app) return;
  app.status = newStatus;
  if(newStatus === 'Approved'){
    const pet = MOCK_PETS.find(p=>p.id===app.petId);
    if(pet) pet.status = 'Adopted';
  }
  saveData();
  renderAdoptionRequests();
  renderPetList();
  renderDashboard();
  showToast(`Application ${appId} set to ${newStatus}`);
}

/***** USER MANAGEMENT *****/
window.renderUserList = function(){
  const container = document.getElementById('user-list');
  const q = (document.getElementById('user-search').value||'').toLowerCase();
  container.innerHTML = '';
  const filtered = MOCK_USERS.filter(u => `${u.name} ${u.role} ${u.status} ${u.email||''}`.toLowerCase().includes(q));
  if(filtered.length===0){ container.innerHTML = `<div class="glass-card p-4 text-slate-600 italic">No users found.</div>`; return; }
  filtered.forEach(u => {
    const card = el('div','glass-card p-4 flex items-center justify-between');
    card.innerHTML = `<div>
      <div class="font-semibold">${escapeHtml(u.name)} <span class="text-xs text-slate-500">(${escapeHtml(u.role)})</span></div>
      <div class="text-sm text-slate-600">${escapeHtml(u.email||'')}</div>
    </div>`;
    const actions = el('div','flex gap-2 items-center');
    const toggle = el('button','px-3 py-1 rounded-md border text-sm', u.status==='Active'?'Deactivate':'Activate');
    toggle.onclick = () => {
      if(u.status==='Active') u.status='Deactivated'; else u.status='Active';
      saveData(); renderUserList(); renderDashboard(); showToast('User status updated');
    };
    const ban = el('button','px-3 py-1 rounded-md bg-red-600 text-white text-sm', u.status==='Banned'?'Unban':'Ban');
    ban.onclick = () => {
      u.status = (u.status==='Banned') ? 'Active' : 'Banned';
      saveData(); renderUserList(); renderDashboard(); showToast('User ban updated');
    };
    const edit = el('button','icon-btn text-amber-600','<i data-lucide="edit-2"></i>');
    edit.title='Edit User';
    edit.onclick = () => openEditUserModal(u.id);
    actions.appendChild(edit); actions.appendChild(toggle); actions.appendChild(ban);
    card.appendChild(actions);
    container.appendChild(card);
  });
  lucide.createIcons();
}

window.openAddUserModal = function(){
  const body = document.createElement('div');
  body.innerHTML = `
    <div class="grid gap-3">
      <input id="m-user-name" class="px-3 py-2 border rounded-lg" placeholder="Full name" />
      <input id="m-user-email" class="px-3 py-2 border rounded-lg" placeholder="Email" />
      <select id="m-user-role" class="px-3 py-2 border rounded-lg"><option>Applicant</option><option>Admin</option></select>
      <div class="flex gap-2">
        <button id="m-user-save" class="px-3 py-2 rounded-lg accent-btn text-white font-semibold">Save User</button>
        <button id="m-user-cancel" class="px-3 py-2 rounded-lg border">Cancel</button>
      </div>
    </div>
  `;
  showModal('Add User', body);
  document.getElementById('m-user-cancel').onclick = closeModal;
  document.getElementById('m-user-save').onclick = () => {
    const name = (document.getElementById('m-user-name').value||'').trim();
    const email = (document.getElementById('m-user-email').value||'').trim();
    const role = document.getElementById('m-user-role').value;
    if(!name || !email){ alert('Please add name and email'); return; }
    const id = uid('u');
    MOCK_USERS.push({ id, name, role, status:'Active', email });
    saveData(); renderUserList(); closeModal(); showToast('User added');
  };
}

window.openEditUserModal = function(userId){
  const user = MOCK_USERS.find(u=>u.id===userId);
  if(!user) return;
  const body = document.createElement('div');
  body.innerHTML = `
    <div class="grid gap-3">
      <input id="m-user-name" class="px-3 py-2 border rounded-lg" value="${escapeHtml(user.name)}" />
      <input id="m-user-email" class="px-3 py-2 border rounded-lg" value="${escapeHtml(user.email||'')}" />
      <select id="m-user-role" class="px-3 py-2 border rounded-lg"><option ${user.role==='Applicant'?'selected':''}>Applicant</option><option ${user.role==='Admin'?'selected':''}>Admin</option></select>
      <div class="flex gap-2">
        <button id="m-user-save" class="px-3 py-2 rounded-lg accent-btn text-white font-semibold">Save</button>
        <button id="m-user-cancel" class="px-3 py-2 rounded-lg border">Cancel</button>
      </div>
    </div>
  `;
  showModal('Edit User', body);
  document.getElementById('m-user-cancel').onclick = closeModal;
  document.getElementById('m-user-save').onclick = () => {
    const name = (document.getElementById('m-user-name').value||'').trim();
    const email = (document.getElementById('m-user-email').value||'').trim();
    const role = document.getElementById('m-user-role').value;
    if(!name || !email){ alert('Please add name and email'); return; }
    user.name = name; user.email = email; user.role = role;
    saveData(); renderUserList(); closeModal(); showToast('User updated');
  };
}

/***** HEALTH RECORDS *****/
window.renderHealthSelector = function(){
  const sel = document.getElementById('health-pet-select');
  sel.innerHTML = '<option value="">Select a pet...</option>';
  MOCK_PETS.forEach(p => {
    const opt = document.createElement('option');
    opt.value = p.id; opt.textContent = `${p.name} (${p.species}) — ${p.status}`;
    sel.appendChild(opt);
  });
  sel.onchange = function(){ document.getElementById('view-records-btn').disabled = !this.value; };
}

window.viewPetHealthRecords = function(){
  const pid = parseInt(document.getElementById('health-pet-select').value);
  const pet = MOCK_PETS.find(p=>p.id===pid);
  const display = document.getElementById('health-records-display');
  if(!pet){ display.innerHTML = '<p class="text-slate-600 italic">Please select a pet.</p>'; return; }
  const box = document.createElement('div');
  box.innerHTML = `<div class="flex items-center justify-between">
    <div>
      <div class="font-bold text-lg">${escapeHtml(pet.name)}</div>
      <div class="text-sm text-slate-600">${pet.species} • ${pet.age} yr(s)</div>
    </div>
    <div class="flex gap-2">
      <button class="px-3 py-2 rounded-md border" onclick="openLogHealthModal(${pet.id})">Log Record</button>
      <button class="px-3 py-2 rounded-md accent-btn text-white" onclick="openAddPetModal()">Edit Pet</button>
    </div>
  </div>
  <div class="mt-4 space-y-3" id="records-list"></div>`;
  display.innerHTML=''; display.appendChild(box);
  renderRecordsForPet(pet.id);
}

function renderRecordsForPet(petId){
  const pet = MOCK_PETS.find(p=>p.id===petId);
  const list = document.getElementById('records-list');
  list.innerHTML = '';
  if(!pet || !pet.records || pet.records.length===0){
    list.innerHTML = '<div class="text-slate-600 italic">No records found. Use "Log Record" to add one.</div>'; return;
  }
  pet.records.slice().reverse().forEach((r, idx) => {
    const card = el('div','glass-card p-3');
    card.innerHTML = `<div class="flex items-start justify-between">
      <div>
        <div class="font-semibold">${escapeHtml(r.type)} <span class="text-xs text-slate-500">${formatDate(r.ts)}</span></div>
        <div class="text-sm text-slate-700 mt-1">${escapeHtml(r.details)}</div>
      </div>
      <div class="flex flex-col gap-2">
        <button class="icon-btn text-amber-600" title="Edit" onclick="openEditRecordModal(${pet.id}, ${r.id})"><i data-lucide="edit-2"></i></button>
        <button class="icon-btn text-red-600" title="Delete" onclick="confirmDeleteRecord(${pet.id}, ${r.id})"><i data-lucide="trash-2"></i></button>
      </div>
    </div>`;
    list.appendChild(card);
  });
  lucide.createIcons();
}

window.openLogHealthModal = function(petId){
  const pet = MOCK_PETS.find(p=>p.id===petId);
  if(!pet) return;
  const body = document.createElement('div');
  body.innerHTML = `
    <div class="grid gap-3">
      <div class="text-sm text-slate-600">Adding record for <strong>${escapeHtml(pet.name)}</strong></div>
      <input id="m-rec-type" class="px-3 py-2 border rounded-lg" placeholder="Type (Vaccination, Check-up, Treatment)" />
      <textarea id="m-rec-details" class="px-3 py-2 border rounded-lg" placeholder="Details..."></textarea>
      <div class="flex gap-2">
        <button id="m-rec-save" class="px-3 py-2 rounded-lg accent-btn text-white font-semibold">Save Record</button>
        <button id="m-rec-cancel" class="px-3 py-2 rounded-lg border">Cancel</button>
      </div>
    </div>
  `;
  showModal('Log Health Record', body);
  document.getElementById('m-rec-cancel').onclick = closeModal;
  document.getElementById('m-rec-save').onclick = () => {
    const type = (document.getElementById('m-rec-type').value||'').trim();
    const details = (document.getElementById('m-rec-details').value||'').trim();
    if(!type || !details){ alert('Please fill type and details'); return; }
    const rec = { id: Date.now(), ts: Date.now(), type, details };
    pet.records = pet.records || []; pet.records.push(rec);
    saveData();
    closeModal();
    showToast('Health record saved');
    // if currently viewing that pet, re-render
    const sel = document.getElementById('health-pet-select');
    if(String(sel.value) === String(petId)) renderRecordsForPet(petId);
  };
}

window.openEditRecordModal = function(petId, recId){
  const pet = MOCK_PETS.find(p=>p.id===petId);
  if(!pet) return;
  const rec = pet.records.find(r=>r.id===recId);
  if(!rec) return;
  const body = document.createElement('div');
  body.innerHTML = `
    <div class="grid gap-3">
      <input id="m-rec-type" class="px-3 py-2 border rounded-lg" value="${escapeHtml(rec.type)}" />
      <textarea id="m-rec-details" class="px-3 py-2 border rounded-lg">${escapeHtml(rec.details)}</textarea>
      <div class="flex gap-2">
        <button id="m-rec-save" class="px-3 py-2 rounded-lg accent-btn text-white font-semibold">Save</button>
        <button id="m-rec-cancel" class="px-3 py-2 rounded-lg border">Cancel</button>
      </div>
    </div>
  `;
  showModal('Edit Health Record', body);
  document.getElementById('m-rec-cancel').onclick = closeModal;
  document.getElementById('m-rec-save').onclick = () => {
    const type = (document.getElementById('m-rec-type').value||'').trim();
    const details = (document.getElementById('m-rec-details').value||'').trim();
    if(!type || !details){ alert('Please fill type and details'); return; }
    rec.type = type; rec.details = details; rec.ts = Date.now();
    saveData();
    closeModal();
    showToast('Record updated');
    const sel = document.getElementById('health-pet-select');
    if(String(sel.value) === String(petId)) renderRecordsForPet(petId);
  };
}

window.confirmDeleteRecord = function(petId, recId){
  const pet = MOCK_PETS.find(p=>p.id===petId);
  if(!pet) return;
  showModal('Delete Record', `<div>Delete this health record?<div class="mt-3 flex gap-2"><button id="del-rec" class="px-3 py-2 rounded-md bg-red-600 text-white">Delete</button><button id="cancel-rec" class="px-3 py-2 rounded-md border">Cancel</button></div></div>`);
  document.getElementById('cancel-rec').onclick = closeModal;
  document.getElementById('del-rec').onclick = () => {
    pet.records = pet.records.filter(r=>r.id!==recId);
    saveData(); closeModal();
    showToast('Record deleted');
    const sel = document.getElementById('health-pet-select');
    if(String(sel.value) === String(petId)) renderRecordsForPet(petId);
  };
}

/***** HELPERS / SMALL UX *****/
function readFileAsDataURL(file){ return new Promise((res,rej)=>{ const r=new FileReader(); r.onload=()=>res(r.result); r.onerror=rej; r.readAsDataURL(file); }); }
function escapeHtml(s){ return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }

function showToast(msg, timeout=2200){
  let t = document.getElementById('global-toast');
  if(!t){
    t = document.createElement('div'); t.id='global-toast';
    t.className='fixed right-6 bottom-6 bg-slate-900 text-white px-4 py-2 rounded-lg shadow-lg';
    document.body.appendChild(t);
  }
  t.textContent = msg;
  t.style.opacity = '1';
  clearTimeout(t._timeout);
  t._timeout = setTimeout(()=> t.style.opacity='0', timeout);
}

window.downloadSnapshot = function(){
  const snapshot = { pets: MOCK_PETS, users: MOCK_USERS, adoptions: MOCK_ADOPTIONS };
  const blob = new Blob([JSON.stringify(snapshot, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a'); a.href = url; a.download = 'dashboard_snapshot.json'; a.click(); URL.revokeObjectURL(url);
}

window.renderAllVisible = function(){
  const q = (document.getElementById('global-search').value||'').toLowerCase();
  // quick render: highlight lists that include q
  renderDashboard();
  renderPetList();
  renderUserList();
  renderAdoptionRequests();
}

window.logout = function() {
  if(confirm("Are you sure you want to logout?")) {
    // OPTIONAL: Clear localStorage if your login system needs it
    // localStorage.clear();

    window.location.href = "index.html"; // Change to your login page
  }
}

/***** INIT *****/
document.addEventListener('DOMContentLoaded', () => {
  loadData();
  
  // Set up modal listeners
  document.getElementById('modal-close').onclick = closeModal;
  document.getElementById('modal-root').onclick = (e) => { 
    if(e.target.id === 'modal-root') closeModal(); 
  };
  
  // initial renders
  showSection('dashboard');
  lucide.createIcons();
  
  // Connect some global keyboard shortcuts (optional)
  window.addEventListener('keydown', (e)=>{
    if(e.key==='/' && document.activeElement.tagName !== 'INPUT' && document.activeElement.tagName !== 'TEXTAREA'){
      e.preventDefault(); document.getElementById('global-search').focus();
    }
  });

  // initial call ensures all lists are populated after data load
  renderPetList();
  renderUserList();
  renderAdoptionRequests();
  renderHealthSelector();
  renderDashboard();
});