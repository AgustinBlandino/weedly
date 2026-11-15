import React from 'react';
import Svg, { Circle, Ellipse, G, Path, Rect } from 'react-native-svg';
import { CARD_ART as A } from './theme';
import type { Phase } from './types';

/** Hoja de cannabis: 3 o 5 dedos (7 en la punta de la vege), dibujada hacia arriba desde (0,0). */
function Leaf({ transform, fingers = 5, fill }: { transform: string; fingers?: 3 | 5 | 7; fill?: string }) {
  return (
    <G transform={transform} fill={fill}>
      <Ellipse cx={0} cy={-20} rx={4.5} ry={20} />
      <Ellipse cx={0} cy={-18} rx={4} ry={18} transform="rotate(-28)" />
      <Ellipse cx={0} cy={-18} rx={4} ry={18} transform="rotate(28)" />
      {fingers >= 5 ? (
        <>
          <Ellipse cx={0} cy={-13} rx={3.5} ry={13} transform="rotate(-56)" />
          <Ellipse cx={0} cy={-13} rx={3.5} ry={13} transform="rotate(56)" />
        </>
      ) : null}
      {fingers === 7 ? (
        <>
          <Ellipse cx={0} cy={-8} rx={3} ry={8} transform="rotate(-84)" />
          <Ellipse cx={0} cy={-8} rx={3} ry={8} transform="rotate(84)" />
        </>
      ) : null}
    </G>
  );
}

function Pot({ wide = false }: { wide?: boolean }) {
  // Germinación usa una maceta un poco más ancha y más abajo (como el mockup).
  return wide ? (
    <>
      <Path d="M60 166 L140 166 L133 200 L67 200 Z" fill={A.pot} />
      <Rect x={56} y={160} width={88} height={10} rx={3} fill={A.potRim} />
    </>
  ) : (
    <>
      <Path d="M64 160 L136 160 L130 194 L70 194 Z" fill={A.pot} />
      <Rect x={60} y={154} width={80} height={10} rx={3} fill={A.potRim} />
    </>
  );
}

function Germination() {
  return (
    <>
      <Path d="M100 168 C100 150 101 135 100 118" stroke={A.leaf} strokeWidth={5} fill="none" strokeLinecap="round" />
      <Ellipse cx={84} cy={112} rx={18} ry={9} fill={A.cotyledon} transform="rotate(-20 84 112)" />
      <Ellipse cx={116} cy={112} rx={18} ry={9} fill={A.cotyledon} transform="rotate(20 116 112)" />
      <Leaf transform="translate(100,112) scale(0.7)" fingers={3} fill={A.leafTop} />
      <Pot wide />
    </>
  );
}

function Vege() {
  return (
    <>
      <Path d="M100 160 C100 120 99 80 100 40" stroke={A.stem} strokeWidth={5} fill="none" strokeLinecap="round" />
      <G fill={A.leaf}>
        <Leaf transform="translate(98,130) rotate(-62) scale(1.2)" />
        <Leaf transform="translate(102,122) rotate(62) scale(1.2)" />
        <Leaf transform="translate(99,94) rotate(-50) scale(1)" />
        <Leaf transform="translate(101,88) rotate(50) scale(1)" />
        <Leaf transform="translate(100,44) scale(0.95)" fingers={7} fill={A.leafTop} />
      </G>
      <Pot />
    </>
  );
}

function Flora() {
  return (
    <>
      <Ellipse cx={100} cy={192} rx={56} ry={6} fill={A.shade} opacity={0.12} />
      <Path d="M100 160 C100 120 98 80 100 30" stroke={A.stem} strokeWidth={5} fill="none" strokeLinecap="round" />
      <G fill={A.leaf}>
        <Leaf transform="translate(98,128) rotate(-62) scale(1.15)" />
        <Leaf transform="translate(102,120) rotate(62) scale(1.15)" />
        <Leaf transform="translate(99,92) rotate(-55) scale(0.9)" />
        <Leaf transform="translate(101,86) rotate(55) scale(0.9)" />
      </G>
      <Ellipse cx={100} cy={46} rx={15} ry={26} fill={A.bud} />
      <Circle cx={93} cy={34} r={7} fill={A.budLight} />
      <Circle cx={106} cy={40} r={7} fill={A.budMid} />
      <Circle cx={95} cy={54} r={7} fill={A.budLight} />
      <Circle cx={106} cy={60} r={6} fill={A.budMid} />
      <Circle cx={100} cy={24} r={6} fill={A.budTip} />
      <Circle cx={98} cy={45} r={3} fill={A.trichome} />
      <Circle cx={104} cy={29} r={2.5} fill={A.trichome} />
      <Path
        d="M92 30 l-6 -5 M108 36 l7 -4 M94 50 l-7 2 M107 56 l7 3 M100 20 l0 -7"
        stroke={A.pistil}
        strokeWidth={1.6}
        strokeLinecap="round"
      />
      <Ellipse cx={72} cy={112} rx={8} ry={12} fill={A.budMid} />
      <Ellipse cx={128} cy={104} rx={8} ry={12} fill={A.budMid} />
      <Path d="M70 102 l-4 -5 M130 94 l4 -5" stroke={A.pistil} strokeWidth={1.4} strokeLinecap="round" />
      <Pot />
    </>
  );
}

/** Tamaño base de cada ilustración dentro de la ventana de 196 de alto (como el mockup). */
export const ILLUSTRATION_SIZE: Record<Phase, number> = {
  germinacion: 170,
  vege: 180,
  flora: 190,
  secado: 190,
  curado: 190,
};

/** Ilustración vectorial de la fase para el cromo de una planta sin foto. Secado y curado usan la de flora. */
export function PhaseIllustration({ phase, size }: { phase: Phase; size: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 200 200">
      {phase === 'germinacion' ? <Germination /> : phase === 'vege' ? <Vege /> : <Flora />}
    </Svg>
  );
}
