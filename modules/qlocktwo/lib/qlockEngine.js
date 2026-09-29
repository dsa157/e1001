/**
 * QLOCKTWO Core Logic Engine
 * Version: 2026.09.28.15.58.00
 *
 * Provides language bitmask decoding, time-to-matrix conversion, and minute dot calculation
 * for 9 languages: German (de), English (en), Dutch (nl), Italian (it), Spanish (es),
 * French (fr), Danish (da), Russian (ru), Swedish (sv).
 */

const LANGUAGES = {
  de: {
    name: 'German',
    offset: 35, // default: 35
    clock: 'ESKISTAFÜNFZEHNZWANZIGDREIVIERTELVORFUNKNACHHALBAELFÜNFEINSXÄMZWEIDREIAUJVIERSECHSNLACHTSIEBENZWÖLFZEHNEUNKUHR',
    hr: [
      '3b:0:7:0', '3b:0:780:0', '3b:0:7800:0', '3b:0:3c0000:0',
      '3b:7800000:0:0', '3b:0:7c00000:0', '3b:0:0:7e0', '3b:0:0:1e',
      '3b:0:0:780000', '3b:0:0:f0000', '3b:e00000:0:0', '3b:0:0:f800'
    ],
    mi: [
      '0:0:0:7000000', '780:f000:0:0', '7800:f000:0:0', 'c000000:f01f:0:0',
      '3f8000:f000:0:0', '780:f00e0:0:0', '0:f0000:0:0', '780:ff000:0:0',
      '3f8000:e0:0:0', 'c000000:ff:0:0', '7800:e0:0:0', '780:e0:0:0'
    ]
  },
  en: {
    name: 'English',
    offset: 25, // default: 25
    clock: 'ITLISASTIMEACQUARTERDCTWENTYFIVEXHALFBTENFTOPASTERUNINEONESIXTHREEFOURFIVETWOEIGHTELEVENSEVENTWELVETENSEoCLOCK',
    hr: [
      '1b:0:7:0', '1b:0:380000:0', '1b:0:7c0:0', '1b:0:7800:0',
      '1b:0:78000:0', '1b:0:38:0', '1b:0:0:3e0', '1b:0:7c00000:0',
      '1b:7800000:0:0', '1b:0:0:70000', '1b:0:8000000:1f', '1b:0:0:fc00'
    ],
    mi: [
      '0:0:0:7e00000', '0:f000f:0:0', '0:f1c00:0:0', 'fe800:f0000:0:0',
      'fc00000:f0000:0:0', 'fc00000:f000f:0:0', '0:f01e0:0:0', 'fc00000:c00f:0:0',
      'fc00000:c000:0:0', 'fe800:c000:0:0', '0:dc00:0:0', '0:c00f:0:0'
    ]
  },
  nl: {
    name: 'Dutch',
    offset: 40, // default: 40
    clock: 'HETKISAVIJFTIENBTZVOOROVERMEKWARTHALFSPWOVERVOORTHGÉÉNSTWEEPVCDRIEVIERVIJFZESZEVENONEGENACHTTIENELFTWAALFBFUUR',
    hr: [
      '37:3800000:0:0', '37:0:f:0', '37:0:780:0', '37:0:7800:0',
      '37:0:78000:0', '37:0:380000:0', '37:0:7c00000:0', '37:0:0:1e0',
      '37:0:0:1f', '37:0:0:1e00', '37:0:0:e000', '37:0:0:3f0000'
    ],
    mi: [
      '0:0:0:7000000', '3c00780:0:0:0', '3c07800:0:0:0', '0:f01f:0:0',
      '3c7800:1e0:0:0', '3c0780:1e0:0:0', '0:1e0:0:0', '3c00780:1e0:0:0',
      '3c07800:1e0:0:0', '0:f001f:0:0', '3c7800:0:0:0', '3c0780:0:0:0'
    ]
  },
  it: {
    name: 'Italian',
    offset: 25, // default: 25
    clock: 'SONORLEBOREÉRĽUNASDUEZTREOTTONOVEDIECIUNDICIDODICISETTEQUATTROCSEICINQUESMENOECUNOQUARTOVENTICINQUEDIECIEMEZZA',
    hr: [
      '1e800:0:0:0', '1c006f:0:0:0', '1c0006f:0:0:0', '6f:0:7f:0',
      '6f:0:1f800:0', '6f:0:700:0', '6f:7c00000:0:0', 'e00006f:1:0:0',
      '6f:1e:0:0', '6f:3e0:0:0', '6f:fc00:0:0', '6f:3f0000:0:0'
    ],
    mi: [
      '0:0:0:0', '0:0:400000:fc00', '0:0:400000:1f0000', '0:0:b400000:1f',
      '0:0:400000:3e0', '0:0:400000:ffe0', '0:0:400000:7c00000', '0:0:3c0000:ffe0',
      '0:0:3c0000:3e0', '0:0:b3c0000:1f', '0:0:3c0000:1f0000', '0:0:3c0000:fc00'
    ]
  },
  es: {
    name: 'Spanish',
    offset: 25, // default: 25
    clock: 'ESONELASUNADOSITRESORECUATROCINCOSEISASIETENOCHONUEVEYOLADIEZSONCEDOCELYMENOSOVEINTEDIEZVEINTICINCOMEDIACUARTO',
    hr: [
      '763:0:0:0', '38ee:0:0:0', '780ee:0:0:0', 'fc000ee:0:0:0',
      'ee:1f:0:0', 'ee:1e0:0:0', 'ee:7c00:0:0', 'ee:f0000:0:0',
      'ee:1f00000:0:0', 'ee:0:3c:0', 'ee:0:780:0', 'ee:0:7800:0'
    ],
    mi: [
      '0:0:0:0', '0:0:10000:f800', '0:0:10000:1e', '0:0:10000:7e00000',
      '0:0:f810000:1', '0:0:10000:ffe0', '0:0:10000:1f0000', '0:0:3e0000:ffe0',
      '0:0:fbe0000:1', '0:0:3e0000:7e00000', '0:0:3e0000:1e', '0:0:3e0000:f800'
    ]
  },
  fr: {
    name: 'French',
    offset: 25, // default: 25
    clock: 'ILNESTOUNERDEUXNUTROISQUATREDOUZECINQSIXSEPTHUITNEUFDIXONZERHEURESMOINSOLEDIXETRQUARTREDVINGT-CINQUETSDEMIEPAN',
    hr: [
      '3bb:0:3e0:0', '783b:0:7e0:0', '3e003b:0:7e0:0', 'fc0003b:0:7e0:0',
      '3b:1e0:7e0:0', '3b:e00:7e0:0', '3b:f000:7e0:0', '3b:f0000:7e0:0',
      '3b:f00000:7e0:0', '3b:7000000:7e0:0', '3b:0:7ef:0', '3b:1f:7e0:0'
    ],
    mi: [
      '0:0:0:0', '0:0:0:7800', '0:0:380000:0', '0:0:ec00000:3',
      '0:0:0:3e0', '0:0:0:7fe0', '0:0:0:fb0000', '0:0:f800:7fe0',
      '0:0:f800:3e0', '0:0:e06f800:3', '0:0:38f800:0', '0:0:f800:7800'
    ]
  },
  da: {
    name: 'Danish',
    offset: 35, // default: 35
    clock: 'KLOKKENVEROFEMTYVESKLAOJEKVARTVATTIAMINUTTERVEMOVERILMFMONALISHALVETTOTREFIREFEMSEKSRSYVOTTERNIMETIELLEVEATOLV',
    hr: [
      '37f:0:1800:0', '37f:0:6000:0', '37f:0:38000:0', '37f:0:3c0000:0',
      '37f:0:1c00000:0', '37f:0:e000000:1', '37f:0:0:1c', '37f:0:0:1e0',
      '37f:0:0:c00', '37f:0:0:c000', '37f:0:0:3f0000', '37f:0:0:7800000'
    ],
    mi: [
      '0:0:0:0', '3800:78ff00:0:0', '0:78ff60:0:0', 'e000000:780003:0:0',
      '3c000:78ff00:0:0', '3800:ff00:7a0:0', '0:0:780:0', '3800:78ff00:780:0',
      '3c000:ff00:20:0', 'e000000:3:20:0', '0:60:20:0', '3800:0:20:0'
    ]
  },
  ru: {
    name: 'Russian',
    offset: 0, // default: 0
    clock: 'СЕЙЧАСБДВАОЧЕТЫРЕДВЕПЯОДИННАДЦАТЬТРИДЕВОСЕМЬДЕСЯТЬФПЯТЬШЕСТЬОЧАСОВЧАСАЯДВАТРИПЯТНАДЦАТЬЛЬДЕСЯТСОРОКПЯТЬВФМИНУТ',
    hr: [
      '3f:0:3800:0', '3bf:0:7800:0', '3f:e0:7800:0', '1f83f:0:7800:0',
      '3f:7800000:7c0:0', '3f:0:7df:0', '3f:f000:7c0:0', '3f:fc00:7c0:0',
      '3f:380700:7c0:0', '3f:3f0000:7c0:0', 'fc0003f:1f:7c0:0', 'c0e003f:1f:7c0:0'
    ],
    mi: [
      '0:0:0:0', '0:0:0:7cf0000', '0:0:0:7ce01c0', '0:0:fc00000:7c0000f',
      '0:0:8070000:7c0000f', '0:0:8070000:7cf000f', '0:0:8380000:7c0000f', '0:0:8380000:7cf000f',
      '0:0:0:7c0f800', '0:0:0:7cff800', '0:0:1c00000:7c007e0', '0:0:1c00000:7cf07e0'
    ]
  },
  sv: {
    name: 'Swedish',
    offset: 35, // default: 35
    clock: 'KLOCKANVÄRKFEMYISTIONIKVARTQIENZOTJUGOLIVINAÖVERKONHALVETTUSCHXTVÅTREMYKYFYRAFEMSTWORSEXSJUÅTTAINIOTIOELVATOLV',
    hr: [
      '37f:0:7:0', '37f:0:700:0', '37f:0:3800:0', '37f:0:3c0000:0',
      '37f:0:1c00000:0', '37f:0:0:1c', '37f:0:0:e0', '37f:0:0:f00',
      '37f:0:0:e000', '37f:0:0:70000', '37f:0:0:780000', '37f:0:0:7800000'
    ],
    mi: [
      '0:0:0:0', '3800:f0000:0:0', 'e0000:f0000:0:0', '7c00000:f0000:0:0',
      '0:f03e0:0:0', 'b800:7800000:0:0', '0:7800000:0:0', '3800:78f0000:0:0',
      '0:be0:0:0', '7c00000:1:0:0', '2e0000:0:0:0', 'b800:0:0:0'
    ]
  }
};

/**
 * Parse colon-separated hex bitmask into 4 integers
 * @param {string} cellText 
 * @returns {number[]}
 */
function parseCells(cellText) {
  const parsed = [0, 0, 0, 0];
  const parts = cellText.split(':');
  for (let i = 0; i < 4; i++) {
    parsed[i] = parseInt(parts[i] || '0', 16);
  }
  return parsed;
}

/**
 * Bitwise OR of two 4-element cell masks
 * @param {number[]} lCells 
 * @param {number[]} rCells 
 * @returns {number[]}
 */
function mergeCells(lCells, rCells) {
  const merged = [0, 0, 0, 0];
  for (let i = 0; i < 4; i++) {
    merged[i] = lCells[i] | rCells[i];
  }
  return merged;
}

/**
 * Convert 4-part bitmask to an array of illuminated 1-indexed cell numbers (1..110)
 * @param {number[]} cells 
 * @returns {number[]}
 */
function getLitCellIds(cells) {
  const litIds = [];
  const offsets = [1, 29, 56, 84];
  for (let i = 0; i < 4; i++) {
    let cellSet = cells[i];
    const cellRange = 28 - (i % 2);
    const cellOffset = offsets[i];
    for (let j = 0; j < cellRange; j++) {
      if ((cellSet & 1) === 1) {
        litIds.push(j + cellOffset);
      }
      cellSet >>>= 1;
    }
  }
  return litIds;
}

/**
 * Calculate the illuminated matrix and corner dots for a given date and language
 * @param {Date} date
 * @param {string} langCode
 */
function calculateQlockState(date = new Date(), langCode = 'en') {
  const langKey = LANGUAGES[langCode] ? langCode : 'en';
  const lang = LANGUAGES[langKey];

  const minute = date.getMinutes();
  const second = date.getSeconds();
  const fiveMinIndex = Math.floor(minute / 5);
  let hour = date.getHours();

  if (hour === 0) {
    hour = 12;
  }
  if ((fiveMinIndex * 5 + lang.offset) >= 60) {
    hour += 1;
  }
  if (hour > 12) {
    hour -= 12;
  }
  if (hour === 0) {
    hour = 12;
  }

  const hrCells = parseCells(lang.hr[hour - 1]);
  const miCells = parseCells(lang.mi[fiveMinIndex]);
  const mergedCells = mergeCells(hrCells, miCells);
  const litCellIds = getLitCellIds(mergedCells);
  const litSet = new Set(litCellIds);

  // Corner minutes calculation: 0..4 minutes represented by 4 corner dots
  const remainderMinutes = minute % 5;
  const cornerMask = Math.pow(2, remainderMinutes) - 1;
  const corners = {
    topLeft: (cornerMask & 1) === 1,     // minute 1
    topRight: (cornerMask & 2) === 2,    // minute 2
    bottomRight: (cornerMask & 4) === 4, // minute 3
    bottomLeft: (cornerMask & 8) === 8   // minute 4
  };

  // Build grid of 10 rows x 11 cols (110 characters)
  const rows = [];
  const clockChars = Array.from(lang.clock);

  for (let r = 0; r < 10; r++) {
    const rowCells = [];
    for (let c = 0; c < 11; c++) {
      const cellNum = (r * 11) + c + 1; // 1-indexed
      const rawChar = clockChars[cellNum - 1] || ' ';
      const isApostropheO = rawChar === 'o';
      const charDisplay = isApostropheO ? "O'" : rawChar;

      rowCells.push({
        id: cellNum,
        row: r,
        col: c,
        char: charDisplay,
        rawChar: rawChar,
        isLit: litSet.has(cellNum)
      });
    }
    rows.push(rowCells);
  }

  return {
    language: langKey,
    languageName: lang.name,
    timestamp: date.toISOString(),
    hours: date.getHours(),
    minutes: minute,
    seconds: second,
    displayHour: hour,
    fiveMinIndex,
    remainderMinutes,
    corners,
    litCellIds,
    grid: rows
  };
}

module.exports = {
  LANGUAGES,
  calculateQlockState,
  parseCells,
  mergeCells,
  getLitCellIds
};
