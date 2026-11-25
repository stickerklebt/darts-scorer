/* Anmeldung beim Start: 1) E-Mail oder Name → 2a) Passwort (Konto gibt es; „Passwort vergessen?“ → Mail mit Link) oder 2b) Passwort festlegen + eindeutigen Namen wählen.
   Link aus der Mail (?reset=TOKEN) → Schritt „Neues Passwort“.
   Eine gerahmte Karte mit Eck-Ornamenten und wanderndem Licht, Schritt-Anzeige oben, Wappen mit Lichtschein darüber. */
import { ui } from '../store.js';
import { esc } from './common.js';
import { crestLine, cornerOrnament, stars } from './svg.js';

export function authView() {
  const a = ui.auth || (ui.auth = { step: 'email', email: '' });
  const err = a.error ? `<p class="auth-err" role="alert">${esc(a.error)}</p>` : '';
  const busy = a.busy ? 'disabled' : '';
  const type = a.show ? 'text' : 'password';
  const showBtn = `<button class="pw-show" data-act="pwShow" type="button">${a.show ? 'Verbergen' : 'Zeigen'}</button>`;
  const mail = `<button class="auth-mail" data-act="authBack"><span>${esc(a.email)}</span><small>ändern</small></button>`;
  let body;
  if (a.step === 'login') {
    body = `<div class="auth-form" data-key="auth-login">
      <h1 class="display">Willkommen zurück</h1>
      ${mail}
      <div class="auth-row"><label class="auth-lbl" for="authPw">Passwort</label>${showBtn}</div>
      <input id="authPw" class="field plain" type="${type}" placeholder="Dein Passwort" autocomplete="current-password" enterkeyhint="go">
      ${err}
      <button class="btn red big" data-act="authLogin" ${busy}>${a.busy ? 'Moment …' : 'Anmelden'}</button>
      <button class="auth-forgot" data-act="authForgot" type="button" ${busy}>Passwort vergessen?</button>
    </div>`;
  } else if (a.step === 'sent') {
    body = `<div class="auth-form" data-key="auth-sent">
      <h1 class="display">Schau in dein Postfach</h1>
      <p class="auth-lead">Wir haben dir eine E-Mail ${a.email.includes('@') ? `an <b>${esc(a.email)}</b>` : 'an die Adresse deines Kontos'} geschickt. Über den Link darin legst du ein neues Passwort fest – er gilt eine Stunde.</p>
      <p class="auth-note">Nichts angekommen? Schau auch im Spam-Ordner nach.</p>
      <button class="btn red big" data-act="authBack">Zurück zur Anmeldung</button>
    </div>`;
  } else if (a.step === 'reset') {
    body = `<div class="auth-form" data-key="auth-reset">
      <h1 class="display">Neues Passwort</h1>
      <div class="auth-row"><label class="auth-lbl" for="authPw">Neues Passwort</label>${showBtn}</div>
      <input id="authPw" class="field plain" type="${type}" placeholder="Mindestens 8 Zeichen" autocomplete="new-password" enterkeyhint="next">
      <input id="authPw2" class="field plain" type="${type}" placeholder="Passwort wiederholen" autocomplete="new-password" enterkeyhint="go">
      ${err}
      <button class="btn red big" data-act="authReset" ${busy}>${a.busy ? 'Moment …' : 'Passwort speichern'}</button>
    </div>`;
  } else if (a.step === 'register') {
    body = `<div class="auth-form" data-key="auth-register">
      <h1 class="display">Neues Konto</h1>
      ${mail}
      <label class="auth-lbl" for="authName">Dein Name</label>
      <input id="authName" class="field name" placeholder="Eindeutiger Name" maxlength="20" autocomplete="username" autocorrect="off" autocapitalize="none" spellcheck="false" enterkeyhint="next">
      <p id="authNameHint" class="name-hint ${a.nameOk ? 'ok' : ''}" aria-live="polite">${esc(a.nameHint || 'Freunde finden dich darüber · 3–20 Zeichen, ohne Leerzeichen')}</p>
      <div class="auth-row"><label class="auth-lbl" for="authPw">Passwort festlegen</label>${showBtn}</div>
      <input id="authPw" class="field plain" type="${type}" placeholder="Mindestens 8 Zeichen" autocomplete="new-password" enterkeyhint="next">
      <input id="authPw2" class="field plain" type="${type}" placeholder="Passwort wiederholen" autocomplete="new-password" enterkeyhint="go">
      ${err}
      <button class="btn red big" data-act="authRegister" ${busy}>${a.busy ? 'Moment …' : 'Konto anlegen'}</button>
    </div>`;
  } else {
    body = `<div class="auth-form" data-key="auth-email">
      <h1 class="display">Willkommen</h1>
      <p class="auth-lead">Melde dich mit deiner E-Mail oder deinem Namen an. Neu hier? Dann mit E-Mail – den Rest klären wir im nächsten Schritt.</p>
      <label class="auth-lbl" for="authEmail">E-Mail oder Name</label>
      <input id="authEmail" class="field plain" type="text" placeholder="name@beispiel.de oder Name" autocomplete="username" autocapitalize="none" autocorrect="off" spellcheck="false" enterkeyhint="next" value="${esc(a.email || '')}">
      ${err}
      <button class="btn red big" data-act="authEmail" ${busy}>${a.busy ? 'Moment …' : 'Weiter'}</button>
    </div>`;
  }
  const s2 = a.step === 'register' ? 'Konto anlegen' : a.step === 'reset' ? 'Neues Passwort' : 'Passwort';
  const corners = ['tl', 'tr', 'bl', 'br'].map((c) => `<span class="corner ${c}">${cornerOrnament()}</span>`).join('');
  return `<div class="stage auth">
    <div class="auth-halo" aria-hidden="true"></div>
    <div class="auth-crest">${crestLine({ size: 150 })}</div>
    <section class="auth-card glint" style="--gd:-2s">${corners}
      <div class="auth-steps"><span class="on">1 · Konto</span><i class="${a.step !== 'email' ? 'on' : ''}"></i><span class="${a.step !== 'email' ? 'on' : ''}">2 · ${s2}</span></div>
      ${body}
    </section>
    <p class="auth-foot">${stars(3, '#e3ae2b', 9)}<span>Deine Spiele liegen sicher in deinem Konto – spielen geht auch offline.</span></p>
  </div>`;
}
