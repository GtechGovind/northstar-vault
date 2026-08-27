import { initializeApp } from 'https://www.gstatic.com/firebasejs/11.0.2/firebase-app.js';
import {
  getAuth,
  getRedirectResult,
  GoogleAuthProvider,
  onAuthStateChanged,
  signInWithPopup,
  signInWithRedirect,
  signOut,
} from 'https://www.gstatic.com/firebasejs/11.0.2/firebase-auth.js';
import { createPrivacyReceipt } from './privacy-receipt.js?v=20260827-receipt';

const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => [...document.querySelectorAll(selector)];
// Private state is memory-only. viewEpoch invalidates async work whenever the
// active account/reflection changes; stale replies must never repopulate the UI.
const state = {
  auth: null,
  user: null,
  sessionId: null,
  sessions: [],
  busy: false,
  loadingSession: false,
  viewEpoch: 0,
  receipt: null,
  exportController: null,
  confirmation: null,
  deleting: false,
  drafts: new Map(),
};
const media = {
  history: window.matchMedia('(min-width: 1024px)'),
  signal: window.matchMedia('(min-width: 1280px)'),
};
const drawers = {
  history: { panel: '#sidebar', slot: '#history-slot' },
  signal: { panel: '#signal-panel', slot: '#signal-slot' },
};
const icon = (name, classes = 'size-4') =>
  `<svg class="${classes}" aria-hidden="true"><use href="/icons.svg#${name}"></use></svg>`;
function visible(selector, show) {
  $(selector).classList.toggle('hidden', !show);
}

function toast(message) {
  const node = $('#toast');
  node.textContent = message;
  node.dataset.visible = 'true';
  clearTimeout(toast.timer);
  toast.timer = setTimeout(() => {
    node.dataset.visible = 'false';
  }, 5000);
}

function restoreDrawer(name) {
  $(drawers[name].slot).append($(drawers[name].panel));
  $('#open-' + name).setAttribute('aria-expanded', 'false');
}

function closeDrawer(name) {
  $('#' + name + '-dialog').close();
  restoreDrawer(name);
}

/** Move the existing panel into a focus-trapped dialog; never clone private DOM. */
function openDrawer(name) {
  if (!state.user || media[name].matches) return;
  for (const other of Object.keys(drawers)) if (other !== name) closeDrawer(other);
  const dialog = $('#' + name + '-dialog');
  dialog.append($(drawers[name].panel));
  $('#open-' + name).setAttribute('aria-expanded', 'true');
  dialog.showModal();
  $('#close-' + name).focus();
}

/** Keep browser chrome / on-screen keyboards from covering the composer.
 * Visual viewport measurement and textarea auto-height are the only inline styles.
 * Pinch zoom is left to the browser rather than forcing a smaller layout.
 */
function syncViewportHeight() {
  const viewport = window.visualViewport;
  if (viewport?.scale === 1) $('#workspace').style.height = `${viewport.height}px`;
  else $('#workspace').style.removeProperty('height');
  updateScrollControl();
}

function composerFeedback(message = '') {
  $('#composer-feedback').textContent = message;
  visible('#composer-feedback', Boolean(message));
}

function updateControls() {
  const locked = state.busy || state.loadingSession || state.deleting;
  $('#send-button').disabled =
    !state.user ||
    locked ||
    navigator.onLine === false ||
    !$('#message-input').value.trim() ||
    $('#message-input').value.length > 4000;
  $('#new-session').disabled = state.deleting;
  $('#delete-session').disabled = locked;
  $('#send-button').setAttribute(
    'aria-label',
    state.busy ? 'Northstar is reflecting' : 'Send reflection',
  );
  $('#messages').setAttribute('aria-busy', String(state.loadingSession));
  visible('#send-spinner', state.busy);
  visible('#send-icon', !state.busy);
  visible('#offline-banner', navigator.onLine === false);
  const length = $('#message-input').value.length;
  $('#character-count').textContent = `${length.toLocaleString()} / 4,000 characters`;
  visible('#character-count', length >= 3000);
  $('#session-status').textContent = state.busy
    ? 'Northstar is reflecting…'
    : state.loadingSession
      ? 'Opening reflection…'
      : state.sessionId
        ? 'Saved in your private vault'
        : 'Only in your private vault';
}

function updateTitle() {
  $('#session-title').textContent =
    state.sessions.find((item) => item.id === state.sessionId)?.title ||
    (state.sessionId ? 'Your reflection' : 'New reflection');
}

function saveDraft() {
  if (state.user) state.drafts.set(state.sessionId || 'new', $('#message-input').value);
}

function beginNewReflection() {
  if (state.deleting) return;
  saveDraft();
  resetSession();
  $('#message-input').value = state.drafts.get('new') || '';
  resizeComposer();
  closeDrawer('history');
  $('#message-input').focus();
}

/**
 * Send an owner-bound API request. Check identity again after token resolution
 * so switching accounts while Firebase refreshes a token cannot mix identities.
 * @param {string} path Same-origin API path.
 * @param {RequestInit} [options] Fetch options, including cancellation signal.
 * @returns {Promise<Response|null>} Valid response, or null for HTTP 204.
 */
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
      'auth/operation-not-supported-in-this-environment',
    ]);
    if (!error.code || redirectCodes.has(error.code)) {
      const provider = new GoogleAuthProvider();
      provider.setCustomParameters({ prompt: 'select_account' });
      await signInWithRedirect(state.auth, provider);
      return;
    }
    if (error.code !== 'auth/popup-closed-by-user') {
      console.error('Firebase sign-in failed:', error.code || 'unknown');
      toast(
        `Google Sign-In could not be completed${error.code ? ` (${error.code.replace('auth/', '')})` : ''}.`,
      );
    }
  }
}

function showWorkspace(user) {
  $('#landing').classList.add('hidden');
  $('#workspace').classList.remove('hidden');
  $('#profile-name').textContent = user.displayName || 'Private user';
  $('#profile-email').textContent = user.email || '';
  $('#profile-initials').textContent = (user.displayName || user.email || 'N')
    .slice(0, 1)
    .toUpperCase();
  $('#profile-photo').removeAttribute('src');
  visible('#profile-photo', Boolean(user.photoURL));
  if (user.photoURL) $('#profile-photo').src = user.photoURL;
  $('#skip-link').href = '#journal';
  updateControls();
  syncViewportHeight();
}

function showLanding() {
  state.sessions = [];
  state.drafts.clear();
  state.confirmation = null;
  state.deleting = false;
  $('#confirm-dialog').close();
  $('#confirm-phrase').value = '';
  $('#confirm-phrase').disabled = false;
  $('#confirm-cancel').disabled = false;
  $('#confirm-target').textContent = '';
  $('#confirm-error').textContent = '';
  $('#session-search').value = '';
  visible('#history-error', false);
  $('#session-list').setAttribute('aria-busy', 'false');
  for (const name of Object.keys(drawers)) closeDrawer(name);
  resetSession();
  $('#privacy-dialog').close();
  $('#profile-name').textContent = '';
  $('#profile-email').textContent = '';
  $('#profile-photo').removeAttribute('src');
  visible('#profile-photo', false);
  $('#profile-initials').textContent = '';
  $('#toast').textContent = '';
  $('#toast').dataset.visible = 'false';
  $('#workspace').classList.add('hidden');
  $('#landing').classList.remove('hidden');
  $('#skip-link').href = '#main-content';
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
  const query = $('#session-search').value.trim().toLocaleLowerCase();
  const sessions = state.sessions.filter((session) =>
    [session.title, ...(session.tags || [])].join(' ').toLocaleLowerCase().includes(query),
  );
  $('#session-count').textContent = String(state.sessions.length);
  if (!sessions.length) {
    const empty = document.createElement('p');
    empty.className = 'px-3 py-6 text-xs leading-6 text-muted';
    empty.textContent = query
      ? 'No matching reflections. Try another word.'
      : 'A fresh page awaits. Your reflections will appear here.';
    list.append(empty);
  }
  sessions.forEach((session) => {
    const button = document.createElement('button');
    button.className =
      'group block min-h-16 w-full min-w-0 rounded-xl border border-transparent px-3 py-3 text-left transition hover:bg-ink/5 aria-current:border-leaf/15 aria-current:bg-leaf/8 motion-reduce:transition-none';
    if (session.id === state.sessionId) button.setAttribute('aria-current', 'true');
    button.title = session.title || 'Untitled reflection';
    button.innerHTML = `<span class="block truncate text-xs font-semibold leading-5">${escapeHTML(session.title || 'Untitled reflection')}</span><span class="mt-1 block truncate text-[11px] leading-5 text-muted">${escapeHTML(sessionTime(session.updatedAt))} · ${escapeHTML(session.tags?.[0] || 'reflection')}</span>`;
    button.addEventListener('click', () => openSession(session.id));
    list.append(button);
  });
}

async function loadSessions() {
  const epoch = state.viewEpoch;
  try {
    visible('#history-error', false);
    $('#session-list').setAttribute('aria-busy', 'true');
    const response = await api('/api/private/sessions');
    const data = await response.json();
    if (epoch !== state.viewEpoch) return;
    state.sessions = data.sessions;
    renderSessions();
    updateTitle();
  } catch (error) {
    if (epoch === state.viewEpoch) visible('#history-error', true);
  } finally {
    if (epoch === state.viewEpoch) $('#session-list').setAttribute('aria-busy', 'false');
  }
}

function resetSession() {
  state.viewEpoch += 1;
  clearReceipt();
  state.busy = false;
  state.loadingSession = false;
  state.sessionId = null;
  $('#message-input').value = '';
  $('#messages').replaceChildren();
  $('#signal-content').replaceChildren();
  $('#empty-state').classList.remove('hidden');
  $('#delete-session').classList.add('hidden');
  $('#signal-empty').classList.remove('hidden');
  $('#signal-content').classList.add('hidden');
  visible('#signal-ready-dot', false);
  visible('#history-loading', false);
  visible('#jump-latest', false);
  composerFeedback();
  renderSessions();
  updateTitle();
  resizeComposer();
}

function messageNode(role, text, pending = false) {
  const article = document.createElement('article');
  article.className =
    role === 'user'
      ? 'ml-auto w-fit min-w-0 max-w-[94%] rounded-3xl rounded-tr-lg border border-ink/5 bg-canvas px-5 py-4 sm:max-w-[88%]'
      : 'min-w-0';
  const label = document.createElement('span');
  label.className = 'mb-2 flex items-center gap-2 text-[11px] font-semibold text-muted';
  label.textContent = role === 'user' ? 'You' : 'Northstar';
  if (role !== 'user')
    label.innerHTML = `<span class="grid size-6 place-items-center rounded-lg bg-leaf/10 text-leaf">${icon('sparkles', 'size-3.5')}</span>Northstar <span class="rounded-md border border-ink/10 px-1.5 py-0.5 text-[9px] font-medium tracking-wide">AI</span>`;
  const body = document.createElement('div');
  body.className =
    'text-[15px] leading-7 whitespace-pre-wrap wrap-anywhere sm:text-base sm:leading-8';
  if (pending) {
    body.className = 'flex items-center gap-2 py-2 text-sm text-muted';
    body.innerHTML = `${icon('loader-circle', 'size-4 animate-spin motion-reduce:animate-none')}Finding a little perspective…`;
  } else body.textContent = text;
  article.append(label, body);
  if (role === 'assistant' && !pending) {
    const copy = document.createElement('button');
    copy.className =
      'mt-2 flex min-h-12 items-center gap-2 rounded-full px-3 text-[11px] font-medium text-muted hover:bg-ink/5 hover:text-ink';
    copy.setAttribute('aria-label', 'Copy Northstar response');
    copy.innerHTML = `${icon('copy', 'size-3.5')}Copy response`;
    copy.addEventListener('click', async () => {
      const user = state.user;
      try {
        await navigator.clipboard.writeText(text);
        if (user === state.user) toast('Response copied.');
      } catch {
        if (user === state.user)
          toast('Copy is unavailable. You can select and copy the text instead.');
      }
    });
    article.append(copy);
  }
  return article;
}

function addMessage(role, text, pending = false) {
  const conversation = $('#conversation');
  const follow =
    conversation.scrollHeight - conversation.scrollTop - conversation.clientHeight < 240;
  $('#empty-state').classList.add('hidden');
  const node = messageNode(role, text, pending);
  $('#messages').append(node);
  if (follow || role === 'user' || pending) scrollToLatest();
  else updateScrollControl();
  return node;
}

function scrollToLatest() {
  const conversation = $('#conversation');
  conversation.scrollTo({ top: conversation.scrollHeight, behavior: 'instant' });
  visible('#jump-latest', false);
}

function updateScrollControl() {
  const view = $('#conversation');
  visible(
    '#jump-latest',
    view.scrollHeight - view.scrollTop - view.clientHeight > 160 &&
      Boolean($('#messages').children.length),
  );
}

function list(items) {
  if (!items?.length)
    return '<p class="text-xs leading-6 text-muted">Nothing inferred here yet.</p>';
  return `<ul class="space-y-2 text-xs leading-6 text-muted">${items.map((item) => `<li class="flex gap-2"><span class="mt-2.5 size-1 shrink-0 rounded-full bg-leaf/50" aria-hidden="true"></span><span class="min-w-0">${escapeHTML(item)}</span></li>`).join('')}</ul>`;
}

/** Render normalized model output as escaped text, never trusted HTML. */
function renderSignal(analysis) {
  $('#signal-empty').classList.add('hidden');
  const content = $('#signal-content');
  content.classList.remove('hidden');
  visible('#signal-ready-dot', true);
  const score = (value) => Math.max(1, Math.min(5, Number(value) || 1));
  const card = (title, body) =>
    `<article class="rounded-2xl border border-ink/10 bg-paper p-4"><h3 class="mb-2 text-xs font-semibold">${title}</h3>${body}</article>`;
  content.innerHTML = `
    <section class="rounded-2xl border border-leaf/15 bg-leaf/5 p-4" aria-label="Reflection compass">
      <div class="grid grid-cols-3 gap-2">${['clarity', 'agency', 'energy'].map((key) => `<div><span class="block text-[10px] text-muted capitalize">${key}</span><span class="mt-1 block text-xl font-semibold tabular-nums">${score(analysis.compass[key])}<span class="ml-0.5 text-[10px] font-normal text-muted">/5</span></span></div>`).join('')}</div>
      <p class="mt-3 border-t border-leaf/10 pt-3 text-[10px] leading-4 text-muted">AI’s reading of this entry—not a score of you.</p>
    </section>
    ${card('Observed facts', list(analysis.signals.facts))}
    ${card('Possible assumptions', list(analysis.signals.assumptions))}
    ${analysis.signals.tensions?.length ? card('Competing needs', list(analysis.signals.tensions)) : ''}
    ${card('Paths you could take', list(analysis.signals.options))}
    ${card('An honest counterpoint', `<p class="text-xs leading-6 text-muted">${escapeHTML(analysis.signals.counterpoint)}</p>`)}
    <article class="rounded-2xl border border-leaf/15 bg-moss/40 p-4"><h3 class="mb-3 flex items-center gap-2 text-xs font-semibold text-leaf">${icon('lightbulb')}Your 48-hour experiment</h3><p class="text-sm leading-6 font-medium">${escapeHTML(analysis.signals.nextExperiment.action)}</p><p class="mt-2 text-xs leading-6 text-muted">${escapeHTML(analysis.signals.nextExperiment.why)}</p><p class="mt-4 border-t border-leaf/15 pt-3 text-xs leading-6"><span class="font-semibold">Look for:</span> ${escapeHTML(analysis.signals.nextExperiment.checkIn)}</p></article>
    <p class="px-1 text-[10px] leading-5 text-muted">Generated from this reflection. Keep what’s useful; question the rest.</p>`;
}

async function openSession(id) {
  if (state.deleting || id === state.sessionId) return;
  saveDraft();
  const epoch = ++state.viewEpoch;
  state.busy = false;
  state.loadingSession = true;
  state.sessionId = id;
  clearReceipt();
  closeDrawer('history');
  $('#message-input').value = state.drafts.get(id) || '';
  $('#messages').replaceChildren();
  $('#signal-content').replaceChildren();
  visible('#signal-content', false);
  visible('#signal-empty', true);
  visible('#signal-ready-dot', false);
  visible('#empty-state', false);
  visible('#delete-session', false);
  visible('#history-loading', true);
  visible('#jump-latest', false);
  composerFeedback();
  updateTitle();
  resizeComposer();
  try {
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
    scrollToLatest();
  } catch (error) {
    if (epoch !== state.viewEpoch) return;
    state.sessionId = null;
    visible('#empty-state', true);
    toast('This reflection could not be opened. Please try again from your history.');
    renderSessions();
    updateTitle();
  } finally {
    if (epoch === state.viewEpoch) {
      state.loadingSession = false;
      visible('#history-loading', false);
      updateControls();
    }
  }
}

async function sendReflection(message) {
  if (
    !state.user ||
    state.busy ||
    state.loadingSession ||
    state.deleting ||
    !message.trim() ||
    message.length > 4000
  )
    return;
  if (navigator.onLine === false)
    return composerFeedback('You’re offline. Reconnect, then send your reflection.');
  const epoch = state.viewEpoch;
  const draftKey = state.sessionId || 'new';
  state.busy = true;
  $('#message-input').value = '';
  state.drafts.delete(draftKey);
  composerFeedback();
  resizeComposer();
  const userMessage = addMessage('user', message.trim());
  const thinking = addMessage('assistant', '', true);
  try {
    const response = await api('/api/private/chat', {
      method: 'POST',
      body: JSON.stringify({
        message: message.trim(),
        ...(state.sessionId && { sessionId: state.sessionId }),
      }),
    });
    const data = await response.json();
    if (epoch !== state.viewEpoch) return;
    state.sessionId = data.sessionId;
    saveDraft();
    thinking.remove();
    addMessage('assistant', data.analysis.reply);
    renderSignal(data.analysis);
    $('#session-title').textContent = data.analysis.title || 'Your reflection';
    $('#delete-session').classList.remove('hidden');
    await loadSessions();
  } catch (error) {
    if (epoch !== state.viewEpoch) return;
    thinking.remove();
    userMessage.remove();
    if (!$('#message-input').value.trim()) $('#message-input').value = message;
    else state.drafts.set('retry:' + draftKey, message);
    visible('#empty-state', !$('#messages').children.length);
    composerFeedback(
      'No response was received. Check your history before retrying in case the request was saved. ' +
        ($('#message-input').value === message
          ? 'Your draft has been restored.'
          : 'Your current draft is unchanged. The earlier text is available below.'),
    );
    if ($('#message-input').value !== message) {
      const restore = document.createElement('button');
      restore.className = 'ml-1 min-h-12 font-semibold underline underline-offset-4';
      restore.textContent = 'Restore earlier draft';
      restore.addEventListener('click', () => {
        const current = $('#message-input').value;
        $('#message-input').value = state.drafts.get('retry:' + draftKey) || '';
        state.drafts.set('retry:' + draftKey, current);
        resizeComposer();
        $('#message-input').focus();
      });
      $('#composer-feedback').append(restore);
    }
    saveDraft();
  } finally {
    if (epoch === state.viewEpoch) {
      state.busy = false;
      resizeComposer();
    }
  }
}

function resizeComposer() {
  const input = $('#message-input');
  input.style.height = 'auto';
  // Intrinsic textarea height is the only runtime style; all visual styling is Tailwind.
  input.style.height = `${Math.min(input.scrollHeight, 160)}px`;
  updateControls();
}

async function deleteCurrentSession() {
  if (!state.user || !state.sessionId || state.busy || state.loadingSession) return;
  showConfirmation('reflection');
}

/** Capture the exact identity and reflection being approved before opening UI. */
function showConfirmation(kind) {
  if (!state.user || state.deleting) return;
  const erase = kind === 'vault';
  state.confirmation = { kind, id: state.sessionId, user: state.user, epoch: state.viewEpoch };
  $('#privacy-dialog').close();
  $('#confirm-title').textContent = erase ? 'Erase your entire vault?' : 'Delete this reflection?';
  $('#confirm-description').textContent = erase
    ? 'Every reflection and message will be permanently removed. This cannot be undone. Download an export first if you want to keep a copy.'
    : 'This reflection and its messages will be permanently removed. Your other reflections will not be affected. This cannot be undone.';
  $('#confirm-target').textContent = erase
    ? state.user.email || 'Your private vault'
    : $('#session-title').textContent;
  $('#confirm-delete').textContent = erase ? 'Erase my vault' : 'Delete reflection';
  $('#confirm-cancel').textContent = erase ? 'Keep my vault' : 'Keep it';
  $('#confirm-phrase').value = '';
  $('#confirm-error').textContent = '';
  visible('#confirm-error', false);
  visible('#confirm-phrase-group', erase);
  $('#confirm-delete').disabled = erase;
  $('#confirm-dialog').showModal();
  $('#confirm-cancel').focus();
}

function cancelConfirmation() {
  if (state.deleting) return;
  const returnToPrivacy = state.confirmation?.kind === 'vault';
  state.confirmation = null;
  $('#confirm-dialog').close();
  $('#confirm-phrase').value = '';
  $('#confirm-target').textContent = '';
  if (returnToPrivacy && state.user) $('#privacy-dialog').showModal();
}

/** Revalidate the captured target, then send the server's exact confirmation. */
async function confirmDeletion() {
  const target = state.confirmation;
  if (!target || state.deleting) return;
  if (
    target.user !== state.user ||
    target.epoch !== state.viewEpoch ||
    target.id !== state.sessionId
  ) {
    cancelConfirmation();
    return toast('The session changed. Nothing was deleted. Please review the reflection again.');
  }
  const erase = target.kind === 'vault';
  if (erase && $('#confirm-phrase').value !== 'ERASE MY VAULT') return;
  state.deleting = target;
  $('#confirm-delete').disabled = true;
  $('#confirm-cancel').disabled = true;
  $('#confirm-phrase').disabled = true;
  $('#confirm-delete').textContent = 'Deleting…';
  updateControls();
  try {
    await api(
      erase ? '/api/private/data' : `/api/private/sessions/${encodeURIComponent(target.id)}`,
      {
        method: 'DELETE',
        body: JSON.stringify({ confirmation: erase ? 'ERASE MY VAULT' : 'DELETE REFLECTION' }),
      },
    );
    if (target.epoch !== state.viewEpoch || target.user !== state.user) return;
    state.confirmation = null;
    $('#confirm-dialog').close();
    $('#confirm-phrase').value = '';
    $('#confirm-target').textContent = '';
    if (erase) {
      state.drafts.clear();
      state.sessions = [];
    } else {
      state.drafts.delete(target.id);
      state.sessions = state.sessions.filter((item) => item.id !== target.id);
    }
    resetSession();
    await loadSessions();
    toast(erase ? 'Your vault has been permanently erased.' : 'Reflection permanently deleted.');
  } catch (error) {
    if (target.user === state.user && target.epoch === state.viewEpoch) {
      $('#confirm-error').textContent =
        'Deletion could not be confirmed. Check your connection and try again.';
      visible('#confirm-error', true);
    }
  } finally {
    if (state.deleting === target) {
      state.deleting = false;
      $('#confirm-cancel').disabled = false;
      $('#confirm-phrase').disabled = false;
      $('#confirm-delete').disabled = erase && $('#confirm-phrase').value !== 'ERASE MY VAULT';
      $('#confirm-delete').textContent = erase ? 'Erase my vault' : 'Delete reflection';
      updateControls();
    }
  }
}

function clearReceipt() {
  state.exportController?.abort();
  state.exportController = null;
  state.receipt = null;
  $('#privacy-receipt').classList.add('hidden');
  [
    '#receipt-exported-at',
    '#receipt-reflections',
    '#receipt-messages',
    '#receipt-bytes',
    '#receipt-sha256',
    '#receipt-status',
  ].forEach((id) => {
    $(id).textContent = '';
  });
  $('#export-data').disabled = false;
  $('#cancel-export').classList.add('hidden');
}

function downloadJSON(text, filename) {
  const url = URL.createObjectURL(new Blob([text], { type: 'application/json;charset=utf-8' }));
  const link = document.createElement('a');
  try {
    link.href = url;
    link.download = filename;
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

/**
 * Download unchanged UTF-8 JSON and compute its optional integrity receipt.
 * Identity/view changes and cancellation invalidate both download and receipt.
 * A hashing failure must not prevent access to the user's own export.
 */
async function exportData() {
  clearReceipt();
  const epoch = state.viewEpoch;
  const controller = new AbortController();
  state.exportController = controller;
  const isCurrent = () =>
    epoch === state.viewEpoch &&
    state.exportController === controller &&
    !controller.signal.aborted;
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
      $('#receipt-status').textContent =
        'Export downloaded, but no integrity receipt could be created. Your export is still available; no checksum was verified.';
    } else {
      renderReceipt(receipt);
      $('#receipt-status').textContent =
        'Export downloaded. Receipt computed locally; no additional copy was sent anywhere.';
    }
  } catch (error) {
    if (isCurrent())
      $('#receipt-status').textContent =
        error.name === 'AbortError'
          ? 'Export cancelled.'
          : 'Export failed. No new export download or receipt was created.';
  } finally {
    if (state.exportController === controller) {
      state.exportController = null;
      $('#export-data').disabled = false;
      $('#cancel-export').classList.add('hidden');
    }
  }
}

async function eraseVault() {
  showConfirmation('vault');
}

async function handleAuthChange(user) {
  if (state.user?.uid !== user?.uid) {
    state.user = null;
    showLanding();
  }
  state.user = user;
  if (!user) return showLanding();
  showWorkspace(user);
  resetSession();
  await loadSessions();
}

async function boot() {
  try {
    const response = await fetch('/api/config');
    if (!response.ok) throw new Error('App configuration is incomplete.');
    const config = await response.json();
    state.auth = getAuth(initializeApp(config));
    await getRedirectResult(state.auth).catch((error) => {
      console.error('Firebase redirect sign-in failed:', error.code || 'unknown');
      toast(
        `Google Sign-In could not be completed${error.code ? ` (${error.code.replace('auth/', '')})` : ''}.`,
      );
    });
    onAuthStateChanged(state.auth, handleAuthChange);
  } catch (error) {
    toast(error.message);
  }
}

['#sign-in-top', '#sign-in-main'].forEach((id) => $(id).addEventListener('click', signIn));
$('#sign-out').addEventListener('click', async () => {
  state.user = null;
  showLanding();
  try {
    await signOut(state.auth);
  } catch {
    toast('Sign-out could not be confirmed. Please close this tab and try again.');
  }
});
$('#new-session').addEventListener('click', beginNewReflection);
$('#delete-session').addEventListener('click', deleteCurrentSession);
$('#privacy-button').addEventListener('click', () => {
  closeDrawer('history');
  $('#privacy-dialog').showModal();
});
$('.dialog-close').addEventListener('click', () => $('#privacy-dialog').close());
$('#export-data').addEventListener('click', exportData);
$('#cancel-export').addEventListener('click', () => {
  clearReceipt();
  $('#receipt-status').textContent = 'Export cancelled. No new download was started.';
});
$('#clear-receipt').addEventListener('click', clearReceipt);
$('#download-receipt').addEventListener('click', () => {
  if (state.user && state.receipt)
    downloadJSON(JSON.stringify(state.receipt, null, 2), 'northstar-privacy-receipt.json');
});
$('#privacy-dialog').addEventListener('close', clearReceipt);
$('#delete-data').addEventListener('click', eraseVault);
$('#composer').addEventListener('submit', (event) => {
  event.preventDefault();
  sendReflection($('#message-input').value);
});
$('#message-input').addEventListener('input', () => {
  resizeComposer();
  saveDraft();
});
$('#message-input').addEventListener('keydown', (event) => {
  if (!event.isComposing && (event.metaKey || event.ctrlKey) && event.key === 'Enter') {
    event.preventDefault();
    sendReflection(event.currentTarget.value);
  }
});
$$('[data-starter]').forEach((button) =>
  button.addEventListener('click', () => {
    $('#message-input').value = button.dataset.starter;
    resizeComposer();
    $('#message-input').focus();
  }),
);

for (const name of Object.keys(drawers)) {
  $('#open-' + name).addEventListener('click', () => openDrawer(name));
  $('#close-' + name).addEventListener('click', () => closeDrawer(name));
  $('#' + name + '-dialog').addEventListener('close', () => {
    if (!$('#' + name + '-dialog').open) restoreDrawer(name);
  });
  media[name].addEventListener('change', (event) => {
    if (event.matches) closeDrawer(name);
  });
}
$('#session-search').addEventListener('input', renderSessions);
$('#retry-history').addEventListener('click', loadSessions);
$('#profile-photo').addEventListener('error', () => visible('#profile-photo', false));
$('#conversation').addEventListener('scroll', updateScrollControl, { passive: true });
$('#jump-latest').addEventListener('click', scrollToLatest);
$('#confirm-form').addEventListener('submit', (event) => {
  event.preventDefault();
  confirmDeletion();
});
$('#confirm-cancel').addEventListener('click', cancelConfirmation);
$('#confirm-dialog').addEventListener('cancel', (event) => {
  event.preventDefault();
  cancelConfirmation();
});
$('#confirm-phrase').addEventListener('input', () => {
  $('#confirm-delete').disabled = state.deleting || $('#confirm-phrase').value !== 'ERASE MY VAULT';
});
window.addEventListener('online', updateControls);
window.addEventListener('offline', updateControls);
window.addEventListener('resize', syncViewportHeight, { passive: true });
window.visualViewport?.addEventListener('resize', syncViewportHeight, { passive: true });

boot();
