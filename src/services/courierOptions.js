/** Myanmar stays on the sheet. Thailand hires a courier and follows that courier's trail. */

export const DELIVERY_COUNTRIES = ['Myanmar', 'Thailand'];

export const LOCATIONS = {
  Myanmar: [
    'Ayeyarwady Region', 'Bago Region', 'Chin State', 'Kachin State',
    'Kayah State', 'Kayin State', 'Magway Region', 'Mandalay Region',
    'Mon State', 'Nay Pyi Taw Union Territory', 'Rakhine State',
    'Sagaing Region', 'Shan State', 'Tanintharyi Region', 'Yangon Region',
  ],
  Thailand: [
    'Bangkok', 'Chiang Mai', 'Chiang Rai', 'Chonburi',
    'Khon Kaen', 'Nakhon Ratchasima', 'Phuket', 'Songkhla',
  ],
};

const SHEET = 'sheet';
const API = 'api';

const MYANMAR = [
  {
    id: 'mm-nationwide',
    labelKey: 'courier.mmNationwide',
    etaKey: 'courier.eta37',
    noteKey: 'courier.sheetNote',
    price: 8000,
    currency: 'MMK',
    tracking: SHEET,
    places: '*',
  },
  {
    id: 'mm-city',
    labelKey: 'courier.mmCity',
    etaKey: 'courier.eta12',
    noteKey: 'courier.sheetNote',
    price: 5000,
    currency: 'MMK',
    tracking: SHEET,
    places: ['Yangon Region', 'Mandalay Region', 'Nay Pyi Taw Union Territory'],
  },
  {
    id: 'mm-day',
    labelKey: 'courier.mmDay',
    etaKey: 'courier.etaSame',
    noteKey: 'courier.sheetNote',
    price: 3500,
    currency: 'MMK',
    tracking: SHEET,
    places: ['Yangon Region'],
  },
  {
    id: 'mm-royal',
    labelKey: 'courier.mmRoyal',
    etaKey: 'courier.eta37',
    noteKey: 'courier.sheetNote',
    price: 7000,
    currency: 'MMK',
    tracking: SHEET,
    places: '*',
  },
  {
    id: 'mm-ninja',
    labelKey: 'courier.mmNinja',
    etaKey: 'courier.eta12',
    noteKey: 'courier.sheetNote',
    price: 4500,
    currency: 'MMK',
    tracking: SHEET,
    places: ['Yangon Region', 'Mandalay Region', 'Nay Pyi Taw Union Territory', 'Bago Region'],
  },
];

const THAILAND = [
  {
    id: 'th-flash',
    labelKey: 'courier.thFlash',
    etaKey: 'courier.etaTh2',
    noteKey: 'courier.hiredNote',
    price: 45,
    priceMmk: 5400,
    currency: 'THB',
    tracking: API,
    places: '*',
  },
  {
    id: 'th-kerry',
    labelKey: 'courier.thKerry',
    etaKey: 'courier.etaTh2',
    noteKey: 'courier.hiredNote',
    price: 50,
    priceMmk: 6000,
    currency: 'THB',
    tracking: API,
    places: '*',
  },
  {
    id: 'th-post',
    labelKey: 'courier.thPost',
    etaKey: 'courier.eta37',
    noteKey: 'courier.hiredNote',
    price: 35,
    priceMmk: 4200,
    currency: 'THB',
    tracking: API,
    places: '*',
  },
  {
    id: 'th-jt',
    labelKey: 'courier.thJt',
    etaKey: 'courier.etaTh1',
    noteKey: 'courier.hiredNote',
    price: 40,
    priceMmk: 4800,
    currency: 'THB',
    tracking: API,
    places: '*',
  },
];

const CHIANG_MAI = {
  id: 'cm-sameday',
  labelKey: 'courier.cmBike',
  etaKey: 'courier.etaSame',
  noteKey: 'courier.hiredNote',
  price: 35,
  priceMmk: 4200,
  currency: 'THB',
  tracking: API,
  places: ['Chiang Mai'],
};

export function couriersFor(country, location) {
  if (!location) return [];
  if (country === 'Thailand') {
    const list = location === 'Chiang Mai' ? [CHIANG_MAI, ...THAILAND] : THAILAND;
    return list.filter((courier) => courier.places === '*' || courier.places.includes(location));
  }
  return MYANMAR.filter((courier) => courier.places === '*' || courier.places.includes(location));
}

export function feeInMmk(courier) {
  if (!courier) return 0;
  return courier.currency === 'THB' ? courier.priceMmk : courier.price;
}

export function formatCourierPrice(courier) {
  if (!courier) return '';
  if (courier.currency === 'THB') return `฿${courier.price}`;
  return '';
}

export function courierTrailUrl(courierId, trackingNumber) {
  const number = encodeURIComponent(String(trackingNumber || '').trim());
  if (!number) return '';
  const pages = {
    'th-flash': `https://www.flashexpress.com/fle/tracking?se=${number}`,
    'th-kerry': `https://th.kerryexpress.com/en/track/?track=${number}`,
    'th-post': `https://track.thailandpost.co.th/?trackNumber=${number}`,
    'th-jt': `https://www.jtexpress.co.th/service/track?waybillNo=${number}`,
  };
  return pages[courierId] || '';
}
