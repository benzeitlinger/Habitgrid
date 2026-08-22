import ionGlyphs from '@expo/vector-icons/build/vendor/react-native-vector-icons/glyphmaps/Ionicons.json';
import mciGlyphs from '@expo/vector-icons/build/vendor/react-native-vector-icons/glyphmaps/MaterialCommunityIcons.json';

import { ICONS } from '@/icons';

describe('icon catalog', () => {
  it('only references glyphs that actually exist', () => {
    const missing = Object.entries(ICONS)
      .filter(([, def]) => {
        const map: Record<string, number> =
          def.set === 'ion' ? (ionGlyphs as never) : (mciGlyphs as never);
        return !(def.name in map);
      })
      .map(([key, def]) => `${key} -> ${def.set}:${def.name}`);

    expect(missing).toEqual([]);
  });
});
