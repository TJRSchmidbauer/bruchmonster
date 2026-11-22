// Impressum und Datenschutz als eigener Bildschirm (alles Text, keine Abfragen ins Netz).
import { h, button } from '../dom.js';
import { go } from '../router.js';
import { URLS, extLink } from '../legal.js';

export function renderRecht(root, params = {}) {
  const back = params.back === 'hub' ? 'hub' : 'profile';
  const part = params.part === 'datenschutz' ? 'datenschutz' : 'impressum';
  const zurueck = button('Zurück', { variant: 'ghost', onClick: () => go(back) });

  const impressum = h('section', { class: 'card', 'aria-label': 'Impressum' },
    h('p', null, 'Tobias Schmidbauer', h('br'), 'Lilienstraße 32', h('br'), '93173 Wenzenbach'),
    h('p', null, 'Kontakt: info@schmidbauer.jetzt'),
    h('p', null, 'Verantwortlich für den Inhalt nach § 18 Abs. 2 MStV: Tobias Schmidbauer, Anschrift wie oben.'),
    h('p', { class: 'small' }, 'Dies ist ein rein privates Angebot ohne Bezug zu einem Dienstherrn oder einer Schule. Weitere Angaben: ', extLink(URLS.homepage, 'schmidbauer.io'), '.'));

  const datenschutz = h('section', { class: 'card legal-text', 'aria-label': 'Datenschutz' },
    h('h3', null, 'Verantwortlicher'),
    h('p', null, 'Tobias Schmidbauer, Lilienstraße 32, 93173 Wenzenbach, info@schmidbauer.jetzt.'),
    h('h3', null, 'Die App selbst'),
    h('p', null, 'Bruchmonster läuft komplett in deinem Browser. Die App hat keine Anmeldung, keine Cookies, keine Statistik und sendet keine Daten an einen Server. Name, Münzen und Lernfortschritt werden nur im Speicher deines Browsers abgelegt. Sicherungsdatei und Spielstand-Code liegen nur bei dir. Bitte gib keinen echten Nachnamen ein, ein Spitzname reicht.'),
    h('h3', null, 'Aufruf über GitHub Pages'),
    h('p', null, 'Diese Seite liegt auf GitHub und wird über GitHub Pages ausgeliefert. Beim Aufruf verarbeitet GitHub technisch notwendige Verbindungsdaten, zum Beispiel deine IP-Adresse, Datum und Uhrzeit sowie Angaben zu Browser und aufgerufener Seite. Darauf habe ich keinen Einfluss und keinen Zugriff. Es gilt die allgemeine Datenschutzerklärung von GitHub: ',
      extLink(URLS.github, 'Allgemeine Datenschutzerklärung für GitHub'), '.'),
    h('p', null, 'Wer das vermeiden möchte, lädt die Datei „bruchmonster.html“ herunter und öffnet sie im Browser. Sie läuft auch ohne Internet.'),
    h('h3', null, 'Verweise'),
    h('p', null, 'Links zu GitHub, zur Lizenz und zu schmidbauer.io werden nur geladen, wenn du sie anklickst. Danach gelten die Datenschutzbestimmungen der jeweiligen Seite.'),
    h('h3', null, 'Deine Rechte'),
    h('p', null, 'Du hast die Rechte auf Auskunft, Berichtigung, Löschung, Einschränkung und Widerspruch nach der DSGVO. Da ich selbst keine Daten über dich speichere, kann ich dazu in der Regel nur auf GitHub verweisen. Beschwerden kannst du an die Datenschutzaufsicht richten, in Bayern an das Bayerische Landesamt für Datenschutzaufsicht (BayLDA).'),
    h('p', { class: 'small' }, 'Für Kinder: Frag bei Fragen zu diesen Texten deine Eltern oder deine Lehrkraft.'));

  root.append(
    h('div', { class: 'screen screen--recht' },
      h('header', { class: 'world__head' }, zurueck, h('h1', { class: 'world__title' }, part === 'impressum' ? 'Impressum' : 'Datenschutz')),
      part === 'impressum' ? impressum : datenschutz,
      h('p', { class: 'legal__switch' },
        button(part === 'impressum' ? 'Zum Datenschutz' : 'Zum Impressum', { variant: 'secondary',
          onClick: () => go('recht', { back, part: part === 'impressum' ? 'datenschutz' : 'impressum' }) }))));
}
