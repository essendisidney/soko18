export const EMERGENCY_KEY = "soko18_emergency_contact";
export const EMERGENCY_EXTRA_KEY = "soko18_emergency_contact_extra";

export type EmergencyContact = { name: string; phone: string };

function parseContact(raw: string | null): EmergencyContact | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as EmergencyContact;
    if (!parsed.name || !parsed.phone) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function readEmergencyContact(): EmergencyContact | null {
  if (typeof window === "undefined") return null;
  return parseContact(localStorage.getItem(EMERGENCY_KEY));
}

export function writeEmergencyContact(contact: EmergencyContact) {
  localStorage.setItem(EMERGENCY_KEY, JSON.stringify(contact));
}

export function readExtraEmergencyContact(): EmergencyContact | null {
  if (typeof window === "undefined") return null;
  return parseContact(localStorage.getItem(EMERGENCY_EXTRA_KEY));
}

export function writeExtraEmergencyContact(contact: EmergencyContact | null) {
  if (!contact) {
    localStorage.removeItem(EMERGENCY_EXTRA_KEY);
    return;
  }
  localStorage.setItem(EMERGENCY_EXTRA_KEY, JSON.stringify(contact));
}

export function readEmergencyContacts() {
  return [readEmergencyContact(), readExtraEmergencyContact()].filter(Boolean) as EmergencyContact[];
}
