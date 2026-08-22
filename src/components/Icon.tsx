import Ionicons from '@expo/vector-icons/Ionicons';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import React from 'react';
import type { StyleProp, TextStyle } from 'react-native';

import { iconDef } from '@/icons';

type Props = {
  name: string;
  size?: number;
  color?: string;
  style?: StyleProp<TextStyle>;
};

/** Renders one of the curated icons by its stable key. */
export function Icon({ name, size = 22, color = '#fff', style }: Props) {
  const def = iconDef(name);
  const Component = (def.set === 'ion' ? Ionicons : MaterialCommunityIcons) as React.ComponentType<{
    name: string;
    size: number;
    color: string;
    style?: StyleProp<TextStyle>;
  }>;
  return <Component name={def.name} size={size} color={color} style={style} />;
}
