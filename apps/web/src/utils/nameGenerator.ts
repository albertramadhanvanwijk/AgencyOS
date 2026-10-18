/**
 * Indonesian Agent Identity Name Generator
 * Generates natural 2 to 3-word Indonesian names for AI agents.
 * Format: 2 to 3 words maximum (e.g. "Budi Santoso", "Rian Pratama Putra", "Dewi Lestari").
 */

const FIRST_NAMES = [
  "Aditya",
  "Ahmad",
  "Agus",
  "Bagus",
  "Bayu",
  "Bima",
  "Budi",
  "Danang",
  "Dewi",
  "Dimas",
  "Eko",
  "Fajar",
  "Galih",
  "Gilang",
  "Hadi",
  "Hendra",
  "Ilham",
  "Indra",
  "Irfan",
  "Joko",
  "Lukman",
  "Mega",
  "Muhammad",
  "Nadia",
  "Nur",
  "Putra",
  "Putri",
  "Raden",
  "Rafi",
  "Rian",
  "Rini",
  "Rizky",
  "Satria",
  "Siti",
  "Surya",
  "Teguh",
  "Tri",
  "Wahyu",
  "Wawan",
  "Wibowo",
  "Wisnu",
  "Yoga",
  "Yudha",
  "Yuni",
  "Reza",
  "Fauzan",
  "Farhan",
  "Anisa",
  "Dian",
];

const SECOND_NAMES = [
  "Pratama",
  "Santoso",
  "Kusuma",
  "Hidayat",
  "Saputra",
  "Saputri",
  "Setiawan",
  "Wijaya",
  "Nugraha",
  "Permana",
  "Wibowo",
  "Ramadhan",
  "Lestari",
  "Utami",
  "Firmansyah",
  "Purnama",
  "Siregar",
  "Nasution",
  "Suryani",
  "Gunawan",
  "Susanto",
  "Anggraini",
  "Maulana",
  "Arifin",
  "Fauzi",
  "Budiman",
  "Irawan",
  "Prasetyo",
  "Kurnia",
  "Subekti",
  "Wahyudi",
  "Rahmawati",
  "Suherman",
  "Syahputra",
  "Pratiwi",
  "Puspita",
  "Handayani",
  "Wulandari",
  "Mahendra",
  "Pangestu",
];

const THIRD_NAMES = [
  "Putra",
  "Putri",
  "Utama",
  "Pratama",
  "Kusuma",
  "Wijaya",
  "Purnama",
  "Hidayat",
  "Lestari",
  "Nugroho",
  "Santoso",
  "Perkasa",
  "Wisesa",
  "Wardhana",
  "Saputra",
  "Saputri",
  "Firmansyah",
  "Alamsyah",
  "Hakim",
  "Akbar",
];

function getRandomElement<T>(array: T[], exclude?: T[]): T {
  const filtered = exclude ? array.filter((item) => !exclude.includes(item)) : array;
  const list = filtered.length > 0 ? filtered : array;
  return list[Math.floor(Math.random() * list.length)];
}

/**
 * Generates an Indonesian name with strictly 2 or 3 words.
 */
export function generateIndonesianName(): string {
  const first = getRandomElement(FIRST_NAMES);
  const second = getRandomElement(SECOND_NAMES, [first]);

  // 50% chance of 3 words, 50% chance of 2 words
  const isThreeWords = Math.random() > 0.5;

  if (isThreeWords) {
    const third = getRandomElement(THIRD_NAMES, [first, second]);
    return `${first} ${second} ${third}`;
  }

  return `${first} ${second}`;
}
