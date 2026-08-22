/** Pure icon catalog. Deliberately free of React Native imports so it can
 * be unit tested without the font runtime. */

export type IconSet = 'ion' | 'mci';
export type IconDef = { set: IconSet; name: string };

/**
 * Curated line icons approximating the HabitKit picker. Keys are stable and
 * stored on the habit, so entries may be added but never renamed.
 */
export const ICONS: Record<string, IconDef> = {
  pulse: { set: 'ion', name: 'pulse' },
  alarm: { set: 'ion', name: 'alarm-outline' },
  pen: { set: 'mci', name: 'fountain-pen-tip' },
  aperture: { set: 'mci', name: 'camera-iris' },
  sun: { set: 'ion', name: 'partly-sunny-outline' },
  book: { set: 'ion', name: 'book-outline' },
  eye: { set: 'ion', name: 'eye-outline' },
  close: { set: 'ion', name: 'close' },
  cannabis: { set: 'mci', name: 'cannabis' },
  scale: { set: 'mci', name: 'scale-bathroom' },
  barbell: { set: 'ion', name: 'barbell-outline' },
  water: { set: 'ion', name: 'water-outline' },
  bed: { set: 'ion', name: 'bed-outline' },
  walk: { set: 'ion', name: 'walk-outline' },
  bicycle: { set: 'ion', name: 'bicycle-outline' },
  run: { set: 'mci', name: 'run' },
  meditate: { set: 'mci', name: 'meditation' },
  yoga: { set: 'mci', name: 'yoga' },
  brush: { set: 'mci', name: 'toothbrush' },
  shower: { set: 'mci', name: 'shower' },
  food: { set: 'ion', name: 'restaurant-outline' },
  fruit: { set: 'mci', name: 'fruit-cherries' },
  coffee: { set: 'ion', name: 'cafe-outline' },
  beer: { set: 'ion', name: 'beer-outline' },
  wine: { set: 'ion', name: 'wine-outline' },
  cigarette: { set: 'mci', name: 'smoking-off' },
  pill: { set: 'mci', name: 'pill' },
  heart: { set: 'ion', name: 'heart-outline' },
  brain: { set: 'mci', name: 'brain' },
  school: { set: 'ion', name: 'school-outline' },
  language: { set: 'ion', name: 'language-outline' },
  code: { set: 'ion', name: 'code-slash-outline' },
  laptop: { set: 'ion', name: 'laptop-outline' },
  briefcase: { set: 'ion', name: 'briefcase-outline' },
  money: { set: 'ion', name: 'cash-outline' },
  cart: { set: 'ion', name: 'cart-outline' },
  home: { set: 'ion', name: 'home-outline' },
  broom: { set: 'mci', name: 'broom' },
  leaf: { set: 'ion', name: 'leaf-outline' },
  paw: { set: 'ion', name: 'paw-outline' },
  people: { set: 'ion', name: 'people-outline' },
  call: { set: 'ion', name: 'call-outline' },
  chat: { set: 'ion', name: 'chatbubble-outline' },
  music: { set: 'ion', name: 'musical-notes-outline' },
  film: { set: 'ion', name: 'film-outline' },
  game: { set: 'ion', name: 'game-controller-outline' },
  camera: { set: 'ion', name: 'camera-outline' },
  paint: { set: 'ion', name: 'color-palette-outline' },
  phone: { set: 'ion', name: 'phone-portrait-outline' },
  tv: { set: 'ion', name: 'tv-outline' },
  sunrise: { set: 'mci', name: 'weather-sunset-up' },
  moon: { set: 'ion', name: 'moon-outline' },
  star: { set: 'ion', name: 'star-outline' },
  trophy: { set: 'ion', name: 'trophy-outline' },
  flag: { set: 'ion', name: 'flag-outline' },
  timer: { set: 'ion', name: 'timer-outline' },
  calendar: { set: 'ion', name: 'calendar-outline' },
  checkbox: { set: 'ion', name: 'checkbox-outline' },
  pray: { set: 'mci', name: 'hand-heart' },
  tag: { set: 'ion', name: 'pricetag-outline' },
  edit: { set: 'ion', name: 'create-outline' },
  glass: { set: 'mci', name: 'glass-mug-variant' },
  xsocial: { set: 'mci', name: 'twitter' },
  diamond: { set: 'mci', name: 'diamond-stone' },

  // UI chrome. Not offered in the habit picker (see ICON_KEYS below).
  'ui-settings': { set: 'ion', name: 'settings-outline' },
  'ui-chart': { set: 'ion', name: 'stats-chart-outline' },
  'ui-plus': { set: 'ion', name: 'add-circle-outline' },
  'ui-close': { set: 'ion', name: 'close' },
  'ui-back': { set: 'ion', name: 'chevron-back' },
  'ui-forward': { set: 'ion', name: 'chevron-forward' },
  'ui-down': { set: 'ion', name: 'chevron-down' },
  'ui-up': { set: 'ion', name: 'chevron-up' },
  'ui-flame': { set: 'ion', name: 'flame-outline' },
  'ui-hash': { set: 'mci', name: 'pound' },
  'ui-percent': { set: 'mci', name: 'percent-outline' },
  'ui-trend': { set: 'mci', name: 'chart-line-variant' },
  'ui-warning': { set: 'ion', name: 'alert-circle-outline' },
  'ui-trash': { set: 'ion', name: 'trash-outline' },
  'ui-archive': { set: 'ion', name: 'archive-outline' },
  'ui-restore': { set: 'mci', name: 'restore' },
  'ui-export': { set: 'ion', name: 'share-outline' },
  'ui-import': { set: 'ion', name: 'download-outline' },
  'ui-palette': { set: 'ion', name: 'color-palette-outline' },
  'ui-reorder': { set: 'ion', name: 'reorder-three-outline' },
  'ui-general': { set: 'ion', name: 'options-outline' },
  'ui-check': { set: 'ion', name: 'checkmark' },
};

/** Keys offered in the habit icon picker; UI chrome is excluded. */
export const ICON_KEYS = Object.keys(ICONS).filter((k) => !k.startsWith('ui-'));

export const DEFAULT_ICON = 'pulse';

export function iconDef(key: string): IconDef {
  return ICONS[key] ?? ICONS[DEFAULT_ICON];
}
