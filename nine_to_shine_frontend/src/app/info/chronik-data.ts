export type ChronikBlock =
  | { type: 'paragraph'; text: string }
  | { type: 'heading'; level: 3 | 4; text: string }
  | { type: 'list'; items: string[] }
  | { type: 'table'; headers: string[]; rows: string[][] };

export interface ChronikImage {
  src: string;
  alt: string;
  width: number;
  height: number;
}

export interface ChronikEntry {
  id: string;
  title: string;
  date: string;
  blocks: ChronikBlock[];
  images: ChronikImage[];
}

export const chronikEntries: ChronikEntry[] = [
  {
    id: '1Mzawp47DRaeL8vcGVYALp',
    title: 'Hauptversammlung 2025',
    date: '2025-10-24',
    blocks: [
      { type: 'paragraph', text: 'Treffen: Büro Simi' },
      { type: 'paragraph', text: 'Anwesend: alle' },
      { type: 'paragraph', text: 'Essen: Marende' },
      { type: 'paragraph', text: 'Kisten Bier: 2 waren zu wenig' },
      { type: 'paragraph', text: 'Stocki zu spät' },
      { type: 'paragraph', text: 'Dave entschuldigt zu spät' },
      {
        type: 'paragraph',
        text: 'Kurzer Recap vom letzten Jahr, generell hatten alle Spaß und möchten weiter machen',
      },
      {
        type: 'paragraph',
        text: 'Preisverleihung Martin hat gewonnen',
      },
      { type: 'paragraph', text: 'Neue Wahlen' },
      { type: 'paragraph', text: 'offenes Thema war Geld' },
      {
        type: 'paragraph',
        text: 'Neuer Präsident hat Abstimmung gemacht. Thema konnte nicht geklärt werden, auf nächste Sitzung verschoben\n\nAbschlusswacht: Dommo, Martin, Flori, Simi',
      },
    ],
    images: [
      {
        src: '/info/snag-538067.png',
        alt: 'Spielzeugboxer mit goldenem Siegerkranz vor einem Pokal',
        width: 945,
        height: 479,
      },
    ],
  },
  {
    id: '6BqVUYvbSoeU1o32iQvmtZ',
    title: 'Treffen Dezember 2024',
    date: '2024-12-13',
    blocks: [
      { type: 'paragraph', text: 'Anwesend: alle' },
      {
        type: 'paragraph',
        text: 'Verspätungen: nicht gefahndet (beim nächsten Mal aber!)',
      },
      {
        type: 'paragraph',
        text: 'Danke an Stocki für die Organisation!!',
      },
      {
        type: 'paragraph',
        text: 'Dieses Mal wurden wir zum alten Schmiedhof geladen. Genauer in Stockis Taverne. Ein Ort, der uns schon sehr lange begleitet. Spätestens als man die Tür öffnete und zwei der Herren sich schon um den Raumduft gekümmert haben, kamen Erinnerungen von früher hoch. Wir setzten uns zum Tisch und quatschten.',
      },
      {
        type: 'paragraph',
        text: 'Nach etwas Zeit waren alle am Tisch und versorgt mit Bier und wir konnten uns mit voller Konzentration und Motivation der Tagesordnung widmen. Als erstes haben wir eine Pizza bestellt, welche wir als lecker und schnell geliefert vermerkt haben.',
      },
      {
        type: 'paragraph',
        text: 'Die anderen Punkte gingen vorbei wie nichts und nach etwas Zeit konnten wir uns dem Spiel des heutigen Abends widmen. Poker.',
      },
      {
        type: 'paragraph',
        text: 'Die Regeln waren allen klar. Klar war aber nicht wie viele Chips wir wohl bekommen würden. Aber schlussendlich hat jeder gleich viel Chips bekommen und wir konnten loslegen.',
      },
      {
        type: 'paragraph',
        text: 'Das Spiel hat für ein paar von uns nicht sehr lange gedauert, obwohl sie klar die Favoriten waren (Dave, Simi, Dommo). So geschah es, dass nur noch der Einsatz stieg aber das Niveau immer gleich blieb.',
      },
      {
        type: 'paragraph',
        text: 'Stocki, Tom und Geiti haben tapfer gekämpft, doch für eine Einladung ins Finale hats nicht mehr gereicht. Die letzten drei Flori, Martin und Bubi haben gekämpft, aber diesmal ging der Pokal an Bubi. Der sich mit dem richtigen Riecher zum Champion spielte.',
      },
      {
        type: 'paragraph',
        text: 'Nachdem Spiel verließen manche die Taverne. Leider auch mit dem Auto, was wir versuchen sollten, stets zu vermeiden!',
      },
      {
        type: 'paragraph',
        text: 'Nach ein paar Bier und Whiskey später trotteten auch die letzten nach Hause. Überrascht von der Wunderschönen Winterlandschaft, welche sich unbemerkt ausgebreitet hat.',
      },
      { type: 'heading', level: 3, text: 'Tagesordnung' },
      { type: 'heading', level: 4, text: 'Strafenkatalog' },
      {
        type: 'paragraph',
        text: 'Das war der erste Punkt in der Tagesordnung und bei weitem auch der intensivste. Nach kurzweiliger Diskussion und einer unerwartet guten Pizza zwischendurch haben wir folgende Regeln aufgestellt.',
      },
      { type: 'paragraph', text: 'Der 1. Entwurf:' },
      {
        type: 'table',
        headers: ['Beschreibung Vergehen', 'Entschuldigungsbetrag'],
        rows: [
          ['unentschuldigtes Fehlen', '40 €'],
          [
            'Verspätungen, keine Toleranz, Entschuldigung 30 Minuten vor Treffen',
            '10 €',
          ],
          ['Strafen nicht in der Frist zahlen', 'Verdoppelung'],
          ['Getränke verschütten', '5 €'],
          ['Gegenstände vergessen (vorher/nachher) pro Gegenstand', '5 €'],
          ['Besondere Vorkommnisse', 'gesammelter Rat'],
          ['Schummeln', '10 €'],
          ['Geld vergessen', '10 €'],
          ['Handy benutzen (zocken/social media)', '5 €'],
        ],
      },
      {
        type: 'paragraph',
        text: 'Fazit: Mein Respekt gegenüber unseren Vorfahren, welche sich der Verfassung angenommen haben, ist gestiegen.',
      },
      { type: 'heading', level: 4, text: 'Webseite' },
      {
        type: 'paragraph',
        text: 'Hier haben wir unsere Vorstellungen ausgetauscht, wie unsere gemeinsame Webseite aussehen könnte. Federführend ist hier Dommo, unser Minister für Digitales. Folgende Punkte:',
      },
      {
        type: 'list',
        items: [
          'Rangliste',
          'Chronik',
          'Fotos',
          'Mitglieder',
          'Domain',
          'Kosten',
          'Alles editierbar',
          'Flori unterstützt beim Design',
        ],
      },
      {
        type: 'heading',
        level: 4,
        text: 'Organisation der monatlichen Treffen (rotierende Organisation)',
      },
      {
        type: 'paragraph',
        text: 'Auf Wunsch des Pres(id)ente(n) haben wir dieses Thema aufgenommen. Er und weitere Gentlemans sind der Meinung, dass dieses Vergnügen jeden einmal zu Teil werden darf. Der Präsident bietet sich für Fragen und Tipps gerne an.',
      },
      {
        type: 'paragraph',
        text: 'Hier die Monate und der jeweilige Gentleman',
      },
      {
        type: 'table',
        headers: ['Monat', 'Gentleman'],
        rows: [
          ['Januar', 'Flori'],
          ['Februar', 'Geiti'],
          ['März', 'Dommo'],
          ['April', 'Dave (20.04)'],
          ['Mai', 'Bubi'],
          ['Juni', 'Martin'],
          ['Juli', 'Stocki'],
          ['August', 'Simi'],
          ['September', 'Tom'],
          ['Oktober', ''],
          ['November', ''],
          ['Dezember', ''],
        ],
      },
      { type: 'heading', level: 4, text: 'Namen' },
      {
        type: 'paragraph',
        text: 'Die Wahl des Namens haben wir vertagt. Beim nächsten Treffen darf jeder 3 Vorschläge mitnehmen. Diese werden 1x durchgelesen und schließlich wird darüber abgestimmt. Dafür hat jeder Gentleman 3 Stimmen. Der Name der am Ende am meisten Stimmen hat, könnte unser Name sein.',
      },
      { type: 'heading', level: 4, text: 'Logo' },
      {
        type: 'paragraph',
        text: 'Hier gibt es leider keine schriftlichen Informationen.',
      },
      { type: 'heading', level: 4, text: 'Protokoll' },
      { type: 'heading', level: 4, text: 'Kosten' },
      {
        type: 'paragraph',
        text: 'Für die Kosten haben wir uns auch ein neues System überlegt. Die monatlichen Beiträge steigen auf 50€. Dafür werden aber für jedes Treffen 10€ von der Kasse zur Verfügung gestellt. Bei Fragen steht euch unser Finanzminister Tom gerne zur Verfügung! Rangliste Das ist die erste Rangliste. Gratulier an Bubi für das Erklimmen der Spitze! Rangliste Gentleman Summe Bubi 9 Martin 8 Flori 7 Geiti 6 Tom 5 Stocki 4 Dommo 3 Simi 2 Dave 1',
      },
    ],
    images: [],
  },
];

export function formatChronikDate(date: string) {
  return date.split('-').reverse().join('.');
}

export function getChronikEntry(id: string) {
  return chronikEntries.find((entry) => entry.id === id);
}
