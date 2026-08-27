import { initializeApp } from 'https://www.gstatic.com/firebasejs/11.0.2/firebase-app.js';
import { getAuth, getRedirectResult, GoogleAuthProvider, onAuthStateChanged, signInWithPopup, signInWithRedirect, signOut } from 'https://www.gstatic.com/firebasejs/11.0.2/firebase-auth.js';
import { createPrivacyReceipt } from './privacy-receipt.js?v=20260827-receipt';

const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => [...document.querySelectorAll(selector)];
const state = { auth: null, user: null, sessionId: null, sessions: [], busy: false, viewEpoch: 0, receipt: null, exportController: null };

function toast(message) {
  const node = $('#toast');
  node.textContent = message;
  node.classList.add('show');
  clearTimeout(toast.timer);
  toast.timer = setTimeout(() => node.classList.remove('show'), 3500);
}

async function api(path, options = {}) {
  const user = state.user;
  const headers = new Headers(options.headers || {});
  if (options.body) headers.set('Content-Type', 'application/json');
  if (user) headers.set('Authorization', `Bearer ${await user.getIdToken()}`);
  if (!user || user !== state.user) throw new DOMException('Session changed.', 'AbortError');
  const response = await fetch(path, { ...options, headers });
  if (!response.ok) {
    const detail = await response.json().catch(() => ({}));
    throw new Error(detail.error || 'Request failed.');
  }
  if (response.status === 204) return null;
  return response;
}

async function signIn() {
  if (!state.auth) return toast('Sign-in is still loading. Please try again.');
  try {
    const provider = new GoogleAuthProvider();
    provider.setCustomParameters({ prompt: 'select_account' });
    await signInWithPopup(state.auth, provider);
  } catch (error) {
    const redirectCodes = new Set([
      'auth/popup-blocked',
      'auth/cancelled-popup-request',
      'auth/operation-not-supported-in-this-environment'
    ]);
    if (!error.code || redirectCodes.has(error.code)) {
      const provider = new GoogleAuthProvider();
      provider.setCustomParameters({ prompt: 'select_account' });
      await signInWithRedirect(state.auth, provider);
      return;
    }
    if (error.code !== 'auth/popup-closed-by-user') {
      console.error('Firebase sign-in failed:', error.code || 'unknown');
      toast(`Google Sign-In could not be completed${error.code ? ` (${error.code.replace('auth/', '')})` : ''}.`);
    }
  }
}

function showWorkspace(user) {
  $('#landing').classList.add('hidden');
  $('#workspace').classList.remove('hidden');
  $('#profile-name').textContent = user.displayName || 'Private user';
  $('#profile-email').textContent = user.email || '';
  if (user.photoURL) $('#profile-photo').src = user.photoURL;
}

function showLanding() {
  state.sessions = [];
  resetSession();
  $('#privacy-dialog').close();
  $('#profile-name').textContent = '';
  $('#profile-email').textContent = '';
  $('#profile-photo').removeAttribute('src');
  $('#toast').textContent = '';
  $('#toast').classList.remove('show');
  $('#workspace').classList.add('hidden');
  $('#landing').classList.remove('hidden');
}

function escapeHTML(value) {
  const node = document.createElement('div');
  node.textContent = value ?? '';
  return node.innerHTML;
}

function sessionTime(value) {
  if (!value) return 'Just now';
  const date = new Date(value);
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

function renderSessions() {
  const list = $('#session-list');
  list.replaceChildren();
  state.sessions.forEach((session) => {
    const button = document.createElement('button');
    button.className = `session-item${session.id === state.sessionId ? ' active' : ''}`;
    button.innerHTML = `<strong>${escapeHTML(session.title)}</strong><span>${sessionTime(session.updatedAt)} · ${escapeHTML(session.tags?.[0] || 'reflection')}</span>`;
    button.addEventListener('click', () => openSession(session.id));
    list.append(button);
  });
}

async function loadSessions() {
  const epoch = state.viewEpoch;
  try {
    const response = await api('/api/private/sessions');
    const data = await response.json();
    if (epoch !== state.viewEpoch) return;
    state.sessions = data.sessions;
    renderSessions();
  } catch (error) { if (epoch === state.viewEpoch) toast(error.message); }
}

function resetSession() {
  state.viewEpoch += 1;
  clearReceipt();
  state.busy = false;
  $('#send-button').disabled = false;
  state.sessionId = null;
  $('#message-input').value = '';
  $('#messages').replaceChildren();
  $('#signal-content').replaceChildren();
  $('#empty-state').classList.remove('hidden');
  $('#delete-session').classList.add('hidden');
  $('#signal-empty').classList.remove('hidden');
  $('#signal-content').classList.add('hidden');
  renderSessions();
  $('#message-input').focus();
}

function messageNode(role, text, pending = false) {
  const article = document.createElement('article');
  article.className = `message ${role}`;
  const label = document.createElement('span');
  label.className = 'message-label';
  label.textContent = role === 'user' ? 'You' : 'Northstar';
  const body = document.createElement('div');
  body.className = 'message-body';
  if (pending) body.innerHTML = '<div class="thinking" aria-label="Northstar is reflecting"><i></i><i></i><i></i></div>';
  else body.textContent = text;
  article.append(label, body);
  return article;
}

function addMessage(role, text, pending = false) {
  $('#empty-state').classList.add('hidden');
  const node = messageNode(role, text, pending);
  $('#messages').append(node);
  node.scrollIntoView({ behavior: 'smooth', block: 'end' });
  return node;
}

function list(items) {
  if (!items?.length) return '<p>Nothing was inferred here.</p>';
  return `<ul>${items.map((item) => `<li>${escapeHTML(item)}</li>`).join('')}</ul>`;
}

function renderSignal(analysis) {
  $('#signal-empty').classList.add('hidden');
  const content = $('#signal-content');
  content.classList.remove('hidden');
  content.innerHTML = `
    <div class="compass">
      <div><span>Clarity</span><b>${analysis.compass.clarity}</b>/5</div>
      <div><span>Agency</span><b>${analysis.compass.agency}</b>/5</div>
      <div><span>Energy</span><b>${analysis.compass.energy}</b>/5</div>
    </div>
    <article class="signal-card"><h3>Observed facts</h3>${list(analysis.signals.facts)}</article>
    <article class="signal-card"><h3>Possible assumptions</h3>${list(analysis.signals.assumptions)}</article>
    <article class="signal-card"><h3>Options</h3>${list(analysis.signals.options)}</article>
    <article class="signal-card"><h3>Honest counterpoint</h3><p>${escapeHTML(analysis.signals.counterpoint)}</p></article>
    <article class="signal-card experiment"><h3>48-hour experiment</h3><strong>${escapeHTML(analysis.signals.nextExperiment.action)}</strong><p>${escapeHTML(analysis.signals.nextExperiment.why)}</p><small>Check for: ${escapeHTML(analysis.signals.nextExperiment.checkIn)}</small></article>`;
}

async function openSession(id) {
  if (state.busy) return;
  const epoch = ++state.viewEpoch;
  try {
    state.sessionId = id;
    renderSessions();
    const response = await api(`/api/private/sessions/${encodeURIComponent(id)}`);
    const data = await response.json();
    if (epoch !== state.viewEpoch) return;
    $('#messages').replaceChildren();
    $('#empty-state').classList.add('hidden');
    $('#delete-session').classList.remove('hidden');
    data.messages.forEach((message) => addMessage(message.role, message.text));
    const latest = [...data.messages].reverse().find((message) => message.analysis);
    if (latest) renderSignal(latest.analysis);
    else {
      $('#signal-empty').classList.remove('hidden');
      $('#signal-content').classList.add('hidden');
    }
  } catch (error) { if (epoch === state.viewEpoch) toast(error.message); }
}

async function sendReflection(message) {
  if (state.busy || !message.trim()) return;
  const epoch = state.viewEpoch;
  state.busy = true;
  $('#send-button').disabled = true;
  $('#message-input').value = '';
  resizeComposer();
  addMessage('user', message.trim());
  const thinking = addMessage('assistant', '', true);
  try {
    const response = await api('/api/private/chat', {
      method: 'POST',
      body: JSON.stringify({ message: message.trim(), ...(state.sessionId && { sessionId: state.sessionId }) })
    });
    const data = await response.json();
    if (epoch !== state.viewEpoch) return;
    state.sessionId = data.sessionId;
    thinking.remove();
    addMessage('assistant', data.analysis.reply);
    renderSignal(data.analysis);
    $('#delete-session').classList.remove('hidden');
    await loadSessions();
  } catch (error) {
    if (epoch !== state.viewEpoch) return;
    thinking.remove();
    addMessage('assistant', 'I could not process that reflection just now. Your words were not added to an AI response—please try again.');
    toast(error.message);
  } finally {
    if (epoch === state.viewEpoch) {
      state.busy = false;
      $('#send-button').disabled = false;
      $('#message-input').focus();
    }
  }
}

function resizeComposer() {
  const input = $('#message-input');
  input.style.height = 'auto';
  input.style.height = `${Math.min(input.scrollHeight, 170)}px`;
}

async function deleteCurrentSession() {
  if (!state.sessionId || !confirm('Permanently delete this reflection? This cannot be undone.')) return;
  const epoch = state.viewEpoch;
  const id = state.sessionId;
  try {
    await api(`/api/private/sessions/${encodeURIComponent(id)}`, {
      method: 'DELETE', body: JSON.stringify({ confirmation: 'DELETE REFLECTION' })
    });
    if (epoch !== state.viewEpoch) return;
    resetSession();
    await loadSessions();
    toast('Reflection permanently deleted.');
  } catch (error) { if (epoch === state.viewEpoch) toast(error.message); }
}

function clearReceipt() {
  state.exportController?.abort();
  state.exportController = null;
  state.receipt = null;
  $('#privacy-receipt').classList.add('hidden');
  ['#receipt-exported-at', '#receipt-reflections', '#receipt-messages', '#receipt-bytes', '#receipt-sha256', '#receipt-status'].forEach(id => { $(id).textContent = ''; });
  $('#export-data').disabled = false;
  $('#cancel-export').classList.add('hidden');
}

function downloadJSON(text, filename) {
  const url = URL.createObjectURL(new Blob([text], { type: 'application/json;charset=utf-8' }));
  const link = document.createElement('a');
  try {
    link.href = url; link.download = filename;
    document.body.append(link);
    link.click();
  } finally {
    link.remove();
    URL.revokeObjectURL(url);
  }
}

function renderReceipt(receipt) {
  state.receipt = receipt;
  $('#receipt-exported-at').textContent = receipt.exportedAt;
  $('#receipt-reflections').textContent = String(receipt.reflectionCount);
  $('#receipt-messages').textContent = String(receipt.messageCount);
  $('#receipt-bytes').textContent = receipt.byteLength.toLocaleString();
  $('#receipt-sha256').textContent = receipt.sha256;
  $('#privacy-receipt').classList.remove('hidden');
}

async function exportData() {
  clearReceipt();
  const epoch = state.viewEpoch;
  const controller = new AbortController();
  state.exportController = controller;
  const isCurrent = () => epoch === state.viewEpoch && state.exportController === controller && !controller.signal.aborted;
  $('#export-data').disabled = true;
  $('#cancel-export').classList.remove('hidden');
  $('#receipt-status').textContent = 'Preparing your export and local integrity receipt…';
  try {
    const response = await api('/api/private/export', { signal: controller.signal });
    const exportText = await response.text();
    if (!isCurrent()) return;
    let receipt;
    let receiptError;
    try {
      receipt = await createPrivacyReceipt(exportText, { signal: controller.signal });
    } catch (error) {
      if (error.name === 'AbortError') throw error;
      receiptError = error;
    }
    if (!isCurrent()) return;
    // This is the same unchanged UTF-8 string used by the local digest.
    // Receipt validation failure must never prevent access to the user's export.
    downloadJSON(exportText, 'northstar-vault-export.json');
    if (receiptError) {
      $('#receipt-status').textContent = 'Export downloaded, but no integrity receipt could be created. Your export is still available; no checksum was verified.';
    } else {
      renderReceipt(receipt);
      $('#receipt-status').textContent = 'Export downloaded. Receipt computed locally; no additional copy was sent anywhere.';
    }
  } catch (error) {
    if (isCurrent()) $('#receipt-status').textContent = error.name === 'AbortError' ? 'Export cancelled.' : 'Export failed. No new export download or receipt was created.';
  } finally {
    if (state.exportController === controller) {
      state.exportController = null;
      $('#export-data').disabled = false;
      $('#cancel-export').classList.add('hidden');
    }
  }
}

async function eraseVault() {
  const phrase = prompt('This permanently deletes every reflection. Type ERASE MY VAULT to continue.');
  if (phrase !== 'ERASE MY VAULT') return;
  const epoch = state.viewEpoch;
  try {
    await api('/api/private/data', {
      method: 'DELETE', body: JSON.stringify({ confirmation: phrase })
    });
    if (epoch !== state.viewEpoch) return;
    $('#privacy-dialog').close();
    resetSession();
    state.sessions = [];
    renderSessions();
    toast('Your vault has been permanently erased.');
  } catch (error) { if (epoch === state.viewEpoch) toast(error.message); }
}

async function boot() {
  try {
    const response = await fetch('/api/config');
    if (!response.ok) throw new Error('App configuration is incomplete.');
    const config = await response.json();
    state.auth = getAuth(initializeApp(config));
    await getRedirectResult(state.auth).catch((error) => {
      console.error('Firebase redirect sign-in failed:', error.code || 'unknown');
      toast(`Google Sign-In could not be completed${error.code ? ` (${error.code.replace('auth/', '')})` : ''}.`);
    });
    onAuthStateChanged(state.auth, async (user) => {
      state.user = user;
      if (!user) return showLanding();
      showWorkspace(user);
      resetSession();
      await loadSessions();
    });
  } catch (error) { toast(error.message); }
}

['#sign-in-top', '#sign-in-main'].forEach((id) => $(id).addEventListener('click', signIn));
$('#sign-out').addEventListener('click', async () => {
  state.user = null;
  showLanding();
  try { await signOut(state.auth); }
  catch { toast('Sign-out could not be confirmed. Please close this tab and try again.'); }
});
$('#new-session').addEventListener('click', resetSession);
$('#delete-session').addEventListener('click', deleteCurrentSession);
$('#privacy-button').addEventListener('click', () => $('#privacy-dialog').showModal());
$('.dialog-close').addEventListener('click', () => $('#privacy-dialog').close());
$('#export-data').addEventListener('click', exportData);
$('#cancel-export').addEventListener('click', () => {
  clearReceipt();
  $('#receipt-status').textContent = 'Export cancelled. No new download was started.';
});
$('#clear-receipt').addEventListener('click', clearReceipt);
$('#download-receipt').addEventListener('click', () => {
  if (state.user && state.receipt) downloadJSON(JSON.stringify(state.receipt, null, 2), 'northstar-privacy-receipt.json');
});
$('#privacy-dialog').addEventListener('close', clearReceipt);
$('#delete-data').addEventListener('click', eraseVault);
$('#composer').addEventListener('submit', (event) => { event.preventDefault(); sendReflection($('#message-input').value); });
$('#message-input').addEventListener('input', resizeComposer);
$('#message-input').addEventListener('keydown', (event) => {
  if ((event.metaKey || event.ctrlKey) && event.key === 'Enter') {
    event.preventDefault(); sendReflection(event.currentTarget.value);
  }
});
$$('[data-starter]').forEach((button) => button.addEventListener('click', () => {
  $('#message-input').value = button.dataset.starter; resizeComposer(); $('#message-input').focus();
}));

boot();
