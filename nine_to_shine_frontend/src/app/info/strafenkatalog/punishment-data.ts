export interface PunishmentRule {
  id: string;
  vergehen: string;
  betrag: number;
  bemerkung: string;
}

export const punishmentRules: PunishmentRule[] = [
  {
    id: '5J5vGuHy1WL6yclM3EjytY',
    vergehen: 'Besondere Vorkommnisse',
    betrag: 0,
    bemerkung: 'Betrag entscheidet die Gruppe',
  },
  {
    id: '6UONWsicN4EMtbslXDNIPu',
    vergehen: 'Handy benutzen',
    betrag: 5,
    bemerkung: 'nur bei zocken und social media',
  },
  {
    id: '5rVexbNZz5JCLQ9EZyt9IN',
    vergehen: 'Geld vergessen',
    betrag: 10,
    bemerkung: '',
  },
  {
    id: '373KDh9VNbJSWr9cpOZkUS',
    vergehen: 'Schummeln',
    betrag: 10,
    bemerkung: '',
  },
  {
    id: '635wYVU06uu75wxNK4lRnG',
    vergehen: 'Gegenstände vergessen',
    betrag: 5,
    bemerkung: '(vorher/nachher) pro Gegenstand',
  },
  {
    id: '2yDUvLFAIWxrO4OEhtcANA',
    vergehen: 'Getränke verschütten',
    betrag: 5,
    bemerkung: '',
  },
  {
    id: '6cyAdnmVjQriXNwPE3jcgm',
    vergehen: 'Strafen nicht in der Frist zahlen',
    betrag: 0,
    bemerkung: 'Verdoppelung der Strafe',
  },
  {
    id: '2vXECwtDsWxSWwbBtkI7I6',
    vergehen: 'Verspätung',
    betrag: 10,
    bemerkung: 'Keine Toleranz, Entschuldigung 30 Minuten vor Treffen',
  },
  {
    id: '31qzAXfBjw0ChRItoWp87s',
    vergehen: 'unentschuldigtes Fehlen',
    betrag: 40,
    bemerkung: '',
  },
];
