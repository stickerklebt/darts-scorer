/* Anmeldung beim Start: 1) E-Mail → 2a) Passwort (Konto gibt es) oder 2b) Passwort festlegen + eindeutigen Namen wählen. */
import { ui } from '../store.js';
import { esc } from './common.js';
import { crest, divider } from './svg.js';

export function authView() {
  const a = ui.auth || (ui.auth = { step: 'email', email: '' });
  const err = a.error ? `<p class="auth-err" role="alert">${esc(a.error)}</p>` : '';
  const busy = a.busy ? 'disabled' : '';
  let body;
  if (a.step === 'login') {
    body = `<div class="auth-form" data-key="auth-login">
      <h1 class="display">Willkommen zurück</h1>
      <button class="auth-mail" data-act="authBack">${esc(a.email)}<small>ändern</small></button>
      <input id="authPw" class="field plain" type="password" placeholder="Passwort" autocomplete="current-password" enterkeyhint="go">
      ${err}
      <button class="btn red big" data-act="authLogin" ${busy}>${a.busy ? 'Moment …' : 'Anmelden'}</button>
      <p class="auth-note">Passwort vergessen? Zurücksetzen per E-Mail kommt noch – bis dahin hilft der Betreiber des Servers.</p>
    </div>`;
  } else if (a.step === 'register') {
    body = `<div class="auth-form" data-key="auth-register">
      <h1 class="display">Neues Konto</h1>
      <button class="auth-mail" data-act="authBack">${esc(a.email)}<small>ändern</small></button>
      <label class="auth-lbl" for="authName">Dein Name</label>
      <input id="authName" class="field name" placeholder="Eindeutiger Name" maxlength="20" autocomplete="username" autocorrect="off" autocapitalize="none" spellcheck="false" enterkeyhint="next">
      <p id="authNameHint" class="name-hint ${a.nameOk ? 'ok' : ''}" aria-live="polite">${esc(a.nameHint || 'Freunde finden dich über diesen Namen. 3–20 Zeichen, ohne Leerzeichen.')}</p>
      <label class="auth-lbl" for="authPw">Passwort festlegen</label>
      <input id="authPw" class="field plain" type="password" placeholder="Mindestens 8 Zeichen" autocomplete="new-password" enterkeyhint="next">
      <input id="authPw2" class="field plain" type="password" placeholder="Passwort wiederholen" autocomplete="new-password" enterkeyhint="go">
      ${err}
      <button class="btn red big" data-act="authRegister" ${busy}>${a.busy ? 'Moment …' : 'Konto anlegen'}</button>
    </div>`;
  } else {
    body = `<div class="auth-form" data-key="auth-email">
      <h1 class="display">Willkommen</h1>
      <p>Melde dich mit deiner E-Mail an. Deine Spiele und Statistiken liegen dann sicher in deinem Konto – auf jedem Gerät.</p>
      <input id="authEmail" class="field plain" type="email" placeholder="E-Mail-Adresse" autocomplete="email" autocapitalize="none" autocorrect="off" spellcheck="false" inputmode="email" enterkeyhint="next" value="${esc(a.email || '')}">
      ${err}
      <button class="btn red big" data-act="authEmail" ${busy}>${a.busy ? 'Moment …' : 'Weiter'}</button>
    </div>`;
  }
  return `<div class="stage auth">
    <div class="stage-crest">${crest({ size: 200 })}</div>
    ${divider()}
    ${body}
  </div>`;
}
