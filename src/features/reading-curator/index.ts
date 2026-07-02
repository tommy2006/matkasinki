// Reading Curator — a reading list from the vibe quiz. Finishing books grants
// manager XP. Deterministic built-in sets per vibe (works with no API key).

import { vibeKeyOf, type VibeKey } from "@/agents/scout/atlas";

export interface Book {
  title: string;
  author: string;
  why: string;
}

const SHELVES: Record<VibeKey, Book[]> = {
  explorer: [
    { title: "The Songlines", author: "Bruce Chatwin", why: "The patron saint of wandering off the map." },
    { title: "The Great Railway Bazaar", author: "Paul Theroux", why: "Overland travel as a state of mind." },
    { title: "Wild", author: "Cheryl Strayed", why: "One trail, no plan, total transformation." },
    { title: "In Patagonia", author: "Bruce Chatwin", why: "The book that reinvented the travelogue." },
    { title: "Vagabonding", author: "Rolf Potts", why: "The practical philosophy of long, slow trips." },
  ],
  foodie: [
    { title: "Kitchen Confidential", author: "Anthony Bourdain", why: "Eat where the cooks eat — his whole ethos." },
    { title: "The Omnivore's Dilemma", author: "Michael Pollan", why: "So you taste the place, not just the plate." },
    { title: "Salt, Fat, Acid, Heat", author: "Samin Nosrat", why: "Reverse-engineer every dish you fall for abroad." },
    { title: "Rice, Noodle, Fish", author: "Matt Goulding", why: "Japan told entirely through its food regions." },
    { title: "The Man Who Ate Everything", author: "Jeffrey Steingarten", why: "Permission to be gloriously obsessive." },
  ],
  "beach": [
    { title: "The Beach", author: "Alex Garland", why: "The paradise-hunt cautionary tale — read it on a lounger." },
    { title: "The Salt Path", author: "Raynor Winn", why: "Coastline, slowness, and starting over." },
    { title: "Swimming Studies", author: "Leanne Shapton", why: "A meditation on water and the pleasure of doing nothing fast." },
    { title: "Island", author: "Aldous Huxley", why: "Utopia, hammock-adjacent." },
    { title: "A Year of Marvellous Ways", author: "Sarah Winman", why: "Sun-warmed and gentle." },
  ],
  culture: [
    { title: "The Architecture of Happiness", author: "Alain de Botton", why: "You'll never look at a facade the same way." },
    { title: "The Silk Roads", author: "Peter Frankopan", why: "History from the crossroads out — reframes every city." },
    { title: "A Room with a View", author: "E.M. Forster", why: "The original culture-shock coming-of-age abroad." },
    { title: "The Art of Travel", author: "Alain de Botton", why: "Why we go, and how to actually see." },
    { title: "SPQR", author: "Mary Beard", why: "For any trip that brushes against Rome." },
  ],
  adrenaline: [
    { title: "Into Thin Air", author: "Jon Krakauer", why: "The high-altitude classic — respect the mountain." },
    { title: "Touching the Void", author: "Joe Simpson", why: "The greatest survival story in mountaineering." },
    { title: "Endurance", author: "Alfred Lansing", why: "Shackleton — the bar for 'that was intense'." },
    { title: "The Push", author: "Tommy Caldwell", why: "Obsession, walls, and El Cap." },
    { title: "Alone on the Wall", author: "Alex Honnold", why: "For when your comfort zone needs a talking-to." },
  ],
  chill: [
    { title: "The Little Book of Hygge", author: "Meik Wiking", why: "The science of doing less, cosily." },
    { title: "A Gentleman in Moscow", author: "Amor Towles", why: "A whole life inside one grand hotel — pure slow luxury." },
    { title: "Norwegian Wood", author: "Haruki Murakami", why: "Melancholy, jazz, and long walks." },
    { title: "The Enchanted April", author: "Elizabeth von Arnim", why: "Renting a castle to do absolutely nothing." },
    { title: "Pilgrim at Tinker Creek", author: "Annie Dillard", why: "Attention as a form of rest." },
  ],
};

export async function curateReading(vibe: string): Promise<Book[]> {
  return SHELVES[vibeKeyOf(vibe)];
}
