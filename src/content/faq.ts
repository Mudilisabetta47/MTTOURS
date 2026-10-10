/**
 * FAQ describing how booking on this platform actually works. No promises beyond what the system does.
 * Cancellation and luggage rules are always those of the booked fare and the travel conditions.
 */
export interface FaqGroup {
  id: string;
  title: string;
  items: { q: string; a: string }[];
}

export const FAQ: FaqGroup[] = [
  {
    id: "buchung",
    title: "Buchung & Zahlung",
    items: [
      { q: "Brauche ich ein Kundenkonto?", a: "Nein. Sie buchen als Gast. Nach der Buchung erhalten Sie einen persönlichen Link zu Ihrer Buchung." },
      { q: "Wie bezahle ich?", a: "Online bei der Buchung über unseren Zahlungsdienstleister. Ihre Buchung ist erst bestätigt, wenn die Zahlung beim Zahlungsdienstleister eingegangen ist – nicht schon durch die Rückleitung auf unsere Seite." },
      { q: "Sind meine Plätze während der Zahlung sicher?", a: "Ja. Sobald Sie auf „Zahlungspflichtig buchen“ klicken, sind Ihre Plätze für 30 Minuten reserviert. Wird die Zahlung nicht abgeschlossen, werden sie wieder freigegeben." },
      { q: "Was kostet der Zustieg?", a: "Für manche Zustiege fällt ein Aufpreis pro Person an. Er steht beim jeweiligen Zustieg und wird im Gesamtpreis ausgewiesen." },
      { q: "Kann ich stornieren oder umbuchen?", a: "Das hängt vom gebuchten Tarif und unseren Reisebedingungen ab. Die Bedingungen des Tarifs sehen Sie vor der Buchung bei der Tarifauswahl." },
    ],
  },
  {
    id: "tickets",
    title: "Tickets & Einsteigen",
    items: [
      { q: "Wo finde ich mein Ticket?", a: "Nach bestätigter Zahlung erhalten Sie für jede reisende Person ein Ticket mit QR-Code. Es steht auf Ihrer Buchungsseite, die Sie über Ihren persönlichen Link erreichen." },
      { q: "Muss ich das Ticket ausdrucken?", a: "Nein. Zeigen Sie den QR-Code beim Einsteigen auf dem Handy vor. Ausgedruckt funktioniert er ebenso." },
      { q: "Wann muss ich am Zustieg sein?", a: "Bitte seien Sie spätestens 15 Minuten vor der angegebenen Abfahrtszeit am genannten Steig." },
    ],
  },
  {
    id: "reise",
    title: "Reiseinformationen",
    items: [
      { q: "Wie viel Gepäck darf ich mitnehmen?", a: "Das Gepäck richtet sich nach dem gebuchten Tarif. Die Angaben stehen bei jedem Tarif." },
      { q: "Welche Dokumente brauche ich?", a: "Einen gültigen Personalausweis oder Reisepass. Für einzelne Ziele können weitere Bestimmungen gelten – bitte prüfen Sie diese vor der Reise." },
      { q: "Was ist eine Pauschalreise?", a: "Eine Reise mit mindestens zwei Reiseleistungen, etwa Busfahrt und Unterkunft, zu einem Gesamtpreis. Für Pauschalreisen gelten die §§ 651a ff. BGB; vor der Buchung erhalten Sie das gesetzliche Formblatt." },
    ],
  },
  {
    id: "busmiete",
    title: "Bus mieten",
    items: [
      { q: "Wie bekomme ich ein Angebot?", a: "Über das Anfrageformular: Strecke, Datum und Personenzahl genügen. Sie erhalten ein schriftliches Angebot inklusive Fahrer." },
      { q: "Kann der Bus an unserer Adresse halten?", a: "In der Regel ja, sofern die Zufahrt für einen Reisebus geeignet ist. Wir prüfen die Adresse vor der Bestätigung." },
    ],
  },
];
