export interface ConstitutionListItem {
  text: string;
  children?: readonly string[];
}

export interface ConstitutionRole {
  title: string;
  description: string;
}

export interface FullConstitutionSection {
  id: string;
  title: string;
  paragraphs?: readonly string[];
  items?: readonly ConstitutionListItem[];
  subheading?: string;
  roles?: readonly ConstitutionRole[];
  includesPunishmentTable?: boolean;
}

export const constitutionIntroduction =
  'Im festen Willen, die Bande der Freundschaft zu stärken, die Lebensfreude zu pflegen und in geselliger Runde frohen Sinn und gemeinschaftlichen Geist zu nähren, haben sich wackere Männer zusammengefunden, um den Verein „Nine to Shine“ zu gründen. Ehre, Treue und Heiterkeit sollen das Band sein, das uns eint; möge Frohsinn herrschen, wo wir uns versammeln.';

export const fullConstitutionSections = [
  {
    id: 'name-and-seat',
    title: '§ 1 – Name und Sitz',
    items: [
      { text: 'Der Verein führt den Namen „Nine to Shine“.' },
      { text: 'Der Sitz des Vereins ist Brixen.' },
    ],
  },
  {
    id: 'purpose',
    title: '§ 2 – Zweck des Vereins',
    items: [
      {
        text: 'Der Verein bezweckt die Pflege von Spaß, Gemeinschaft und Lebensfreude durch gemeinsame Unternehmungen, Veranstaltungen und kreative Aktionen.',
      },
      {
        text: 'Allmonatlich wird ein geselliges Beisammensein organisiert; einmal im Jahre soll ein größerer Ausflug stattfinden, an welchem alle Mitglieder teilzunehmen trachten.',
      },
      {
        text: 'Der Verein verfolgt keinerlei eigennützige Bestrebungen; er dient ausschließlich der Freude und dem Miteinander seiner Mitglieder.',
      },
      {
        text: 'Der Verein ist gemeinnützig im Geiste der Freundschaft und der guten Sitte.',
      },
    ],
  },
  {
    id: 'membership',
    title: '§ 3 – Mitgliedschaft',
    items: [
      {
        text: 'Mitglied des Vereins kann jeder ehrenhafte Mann werden, der die Ziele des Vereins achtet und unterstützt. (Die Zahl der Mitglieder ist auf neun beschränkt.)',
      },
      {
        text: 'Der Aufnahmeantrag ist mündlich zu stellen; über die Aufnahme entscheidet die Gemeinschaft der Mitglieder.',
      },
      { text: 'Die Mitgliedschaft endet durch Austritt, Ausschluss oder Tod.' },
      {
        text: 'Der Austritt erfolgt durch mündliche Erklärung gegenüber dem Verein.',
      },
    ],
  },
  {
    id: 'contributions',
    title: '§ 4 – Beiträge',
    items: [
      {
        text: 'Von den Mitgliedern werden Beiträge erhoben, deren Höhe und Fälligkeit durch Beschluss der Mitgliederversammlung bestimmt werden.',
      },
      {
        text: 'Die Beiträge dienen der Durchführung gemeinsamer Unternehmungen, der Anschaffung notwendiger Materialien sowie der Pflege der Vereinstätigkeit.',
      },
    ],
  },
  {
    id: 'bodies',
    title: '§ 5 – Organe des Vereins',
    paragraphs: ['Die Organe des Vereins sind:'],
    items: [
      { text: 'die Mitgliederversammlung,' },
      { text: 'sämtliche Mitglieder in ihrer Gesamtheit.' },
    ],
  },
  {
    id: 'offices',
    title: '§ 6 – Der Verein und seine Ämter',
    items: [
      {
        text: 'Die Ämter werden alljährlich von der Mitgliederversammlung gewählt.',
      },
      {
        text: 'Der Verein besteht aus folgenden Ämtern:',
        children: [
          'dem Präsidenten',
          'dem Digitalminister',
          'dem Kammerer',
          'dem Spieleminister',
          'dem Schriftführer',
          'sowie weiteren Mitgliedern.',
        ],
      },
    ],
    subheading: 'Rollen und Pflichten:',
    roles: [
      {
        title: 'Präsident',
        description:
          'Hüter des Zusammenhalts und Schlichter in Streitfragen. Er erinnert an die Organisation der Zusammenkünfte und wacht über den guten Ton.',
      },
      {
        title: 'Kammerer',
        description:
          'Führt ein ordentliches Journal über Einnahmen und Ausgaben, verwaltet die Vereinskasse und trägt die verhängten Strafen in das Register ein.',
      },
      {
        title: 'Schriftführer',
        description:
          'Verfasst kurze Chroniken zu jedem Treffen, führt Protokoll bei den Versammlungen und wahrt das Andenken an die Taten der Mitglieder.',
      },
      {
        title: 'Spieleminister',
        description:
          'Verantwortlich für die Durchführung von Spielen bei den Treffen, fungiert als Schiedsrichter und trägt die Ergebnisse auf der Vereins-Webseite ein.',
      },
      {
        title: 'Fotograf',
        description:
          'Sorgt bei jedem Ereignis für ein Gruppenbild und einige Aufnahmen, die den Geist der Zusammenkunft festhalten.',
      },
      {
        title: 'Digitalminister',
        description:
          'Betreut die Webseite und ist Ansprechpartner für technische Belange des Vereins.',
      },
      {
        title: 'Mitglieder',
        description:
          'Sorgen für das Zustandekommen der Treffen, für anständiges Benehmen und tatkräftige Unterstützung bei der Organisation der Veranstaltungen.',
      },
    ],
  },
  {
    id: 'general-assembly',
    title: '§ 7 – Mitgliederversammlung',
    items: [
      { text: 'Die Mitgliederversammlung findet einmal im Jahre statt.' },
      {
        text: 'Sie wird vom Präsidenten unter Bekanntgabe der Tagesordnung einberufen.',
      },
      {
        text: 'Die Mitgliederversammlung entscheidet über:',
        children: [
          'Wahl und Entlastung der Amtsträger',
          'Festsetzung der Mitgliedsbeiträge',
          'Änderungen der Satzung',
        ],
      },
      {
        text: 'Beschlüsse werden mit einfacher Mehrheit gefasst, sofern nicht anderes bestimmt ist.',
      },
    ],
  },
  {
    id: 'amendments',
    title: '§ 8 – Satzungsänderungen',
    paragraphs: [
      'Satzungsänderungen bedürfen einer Mehrheit von zwei Dritteln aller Mitglieder zuzüglich einer Stimme.',
    ],
  },
  {
    id: 'meeting-organization',
    title: '§ 9 – Organisation der Treffen',
    items: [
      {
        text: 'Über den Termin eines Treffens wird spätestens zur Mitte des vorherigen Monats abgestimmt.',
      },
      { text: 'Die Abstimmung endet mit dem ersten Tage des Monats.' },
      {
        text: 'Vorschläge für Aktivitäten sollen mindestens eine Woche vor dem Termin kundgetan werden.',
      },
      { text: 'Nichtmitglieder sind von den Treffen ausgeschlossen.' },
      {
        text: 'Frauen ist die Teilnahme an den Zusammenkünften nicht gestattet.',
      },
      {
        text: 'Es sollen mindestens drei verschiedene Vorschläge zur Aktivität eingebracht werden.',
      },
    ],
  },
  {
    id: 'punishments',
    title: '§ 10 – Strafenkatalog',
    paragraphs: [
      'Ein festgelegter Strafenkatalog ist Bestandteil dieser Verfassung. Änderungen daran dürfen nur durch Beschluss einer Mitgliederversammlung erfolgen.',
    ],
    includesPunishmentTable: true,
  },
  {
    id: 'dissolution',
    title: '§ 11 – Auflösung des Vereins',
    items: [
      {
        text: 'Die Auflösung des Vereins kann nur in einer eigens dafür einberufenen Mitgliederversammlung beschlossen werden.',
      },
      {
        text: 'Im Falle der Auflösung fällt das verbleibende Vermögen an eine gemeinnützige Organisation, welche von der Mitgliederversammlung bestimmt wird.',
      },
    ],
  },
  {
    id: 'effective-date',
    title: '§ 12 – Inkrafttreten',
    paragraphs: [
      'Diese Verfassung wurde in der Gründungsversammlung zu Brixen, am [Datum], feierlich beschlossen und tritt mit demselben Tage in Kraft.',
    ],
  },
] satisfies readonly FullConstitutionSection[];

export const constitutionMotto =
  'Möge der Geist von Frohsinn, Freundschaft und Männerehre unseren Bund stets leiten.';
