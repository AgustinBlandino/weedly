import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  BackHandler,
  Keyboard,
  KeyboardAvoidingView,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { existingDateErrors, gridFor } from '@/onboarding';
import { SUBSTRATE_PRESETS } from '@/presets';
import { useStore } from '@/store';
import type { ExistingPlantsInput } from '@/store';
import { Tent3D } from '@/Tent3D';
import { colors, fonts, radius } from '@/theme';
import { Body, Chip, DateField, Field, H2, IconButton, Muted, PrimaryButton, Rise, Stepper, Title } from '@/ui';
import { fmt, parseNum, today } from '@/utils';

const SIZE_PRESETS = [
  { w: 60, d: 60 },
  { w: 80, d: 80 },
  { w: 100, d: 100 },
  { w: 120, d: 120 },
];
const HEIGHT_PRESETS = [140, 160, 180, 200];
const LITER_PRESETS = ['5', '7', '10', '15', '20'];
const PHASE_OPTIONS = [
  { id: 'germinacion', label: 'Germinación' },
  { id: 'vege', label: 'Vege' },
  { id: 'flora', label: 'Flora' },
] as const;

const SIDE_MIN = 30;
const SIDE_MAX = 400;
const HEIGHT_MIN = 50;
const HEIGHT_MAX = 400;
const POTS_MAX = 24;
const LITERS_MAX = 200;
const FORM_STEPS = 3;
const PREVIEW_HEIGHT = 220;
const SCENE_HEIGHT = 340;

type Step = 0 | 1 | 2 | 3;
type Start = 'cero' | 'plantas';
type CurrentPhase = (typeof PHASE_OPTIONS)[number]['id'];

const inRange = (n: number | undefined, min: number, max: number): n is number => n != null && n >= min && n <= max;

export default function OnboardingScreen() {
  const [step, setStep] = useState<Step>(0);

  // Carpa
  const [nameInput, setNameInput] = useState<string | null>(null);
  const [sizeId, setSizeId] = useState<number | 'custom'>(1);
  const [customW, setCustomW] = useState('80');
  const [customD, setCustomD] = useState('80');
  const [heightId, setHeightId] = useState<number | 'custom'>(160);
  const [customH, setCustomH] = useState('160');
  const [potCount, setPotCount] = useState(4);

  // Macetas
  const [litersInput, setLitersInput] = useState('10');
  const [substrate, setSubstrate] = useState('Tierra');

  // Punto de partida
  const [start, setStart] = useState<Start | null>(null);
  const [existingCount, setExistingCount] = useState(POTS_MAX);
  const [plantType, setPlantType] = useState<'foto' | 'auto'>('foto');
  const [phase, setPhase] = useState<CurrentPhase>('germinacion');
  const [germinationDate, setGerminationDate] = useState(() => today());
  // Sin elegir, vege arranca el mismo día que la germinación.
  const [vegeInput, setVegeInput] = useState<string | undefined>();
  const [floraInput, setFloraInput] = useState(() => today());

  const [keyboardOpen, setKeyboardOpen] = useState(false);
  const scrollRef = useRef<React.ComponentRef<typeof ScrollView>>(null);
  const contentRef = useRef<React.ComponentRef<typeof View>>(null);
  const finished = useRef(false);

  const preset = sizeId === 'custom' ? undefined : SIZE_PRESETS[sizeId];
  const widthCm = preset ? preset.w : parseNum(customW);
  const depthCm = preset ? preset.d : parseNum(customD);
  const heightCm = heightId === 'custom' ? parseNum(customH) : heightId;
  const widthOk = inRange(widthCm, SIDE_MIN, SIDE_MAX);
  const depthOk = inRange(depthCm, SIDE_MIN, SIDE_MAX);
  const heightOk = inRange(heightCm, HEIGHT_MIN, HEIGHT_MAX);

  // La vista previa conserva la última medida válida mientras se escribe.
  const lastValid = useRef({ w: 80, d: 80, h: 160 });
  const previewW = widthOk ? widthCm : lastValid.current.w;
  const previewD = depthOk ? depthCm : lastValid.current.d;
  const previewH = heightOk ? heightCm : lastValid.current.h;
  useEffect(() => {
    lastValid.current = { w: previewW, d: previewD, h: previewH };
  });

  const grid = gridFor(potCount, previewW, previewD);
  const slots = Array.from({ length: potCount }, (_, i) => ({
    id: String(i),
    row: Math.floor(i / grid.cols),
    col: i % grid.cols,
  }));
  const defaultName = `Carpa ${fmt(previewW)} × ${fmt(previewD)}`;
  const name = nameInput ?? defaultName;

  const liters = parseNum(litersInput);
  const litersOk = liters != null && liters > 0 && liters <= LITERS_MAX;
  const substrateOk = substrate.trim().length > 0;

  const hoy = today();
  const plantCount = Math.max(1, Math.min(existingCount, potCount));
  const vegeDate = phase === 'germinacion' ? undefined : (vegeInput ?? germinationDate);
  const floraDate = phase === 'flora' ? floraInput : undefined;
  const dateErrors = existingDateErrors({ germinationDate, vegeDate, floraDate }, hoy);
  const datesOk = !dateErrors.germination && !dateErrors.vege && !dateErrors.flora;

  const canContinue =
    step === 0 ||
    (step === 1 && widthOk && depthOk && heightOk) ||
    (step === 2 && litersOk && substrateOk) ||
    (step === 3 && (start === 'cero' || (start === 'plantas' && datesOk)));

  const goBack = useCallback(() => {
    setStep((current) => (current > 0 ? ((current - 1) as Step) : current));
  }, []);

  useEffect(() => {
    if (step === 0) return;
    // En Android, volver retrocede un paso y nunca cierra el onboarding a la mitad.
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      goBack();
      return true;
    });
    return () => sub.remove();
  }, [step, goBack]);

  const scrollToFocused = useCallback(() => {
    const input = TextInput.State.currentlyFocusedInput?.();
    const content = contentRef.current;
    if (!input || !content) return;
    input.measureLayout(
      content,
      (_x, y) => scrollRef.current?.scrollTo({ y: Math.max(0, y - 40), animated: true }),
      () => {},
    );
  }, []);

  useEffect(() => {
    const opened = Keyboard.addListener('keyboardDidShow', () => {
      setKeyboardOpen(true);
      scrollToFocused();
    });
    const closed = Keyboard.addListener('keyboardDidHide', () => setKeyboardOpen(false));
    return () => {
      opened.remove();
      closed.remove();
    };
  }, [scrollToFocused]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ y: 0, animated: false });
  }, [step]);

  const finish = () => {
    if (finished.current || !canContinue || !widthOk || !depthOk || !heightOk || !litersOk) return;
    // Si ya hay una carpa, el guard del layout saca al usuario de acá: no se crea otra.
    if (useStore.getState().tents.length > 0) return;
    finished.current = true;
    const existing: ExistingPlantsInput | undefined =
      start === 'plantas'
        ? { count: plantCount, germinationDate, vegeDate, floraDate, type: plantType }
        : undefined;
    const { rows, cols } = gridFor(potCount, widthCm, depthCm);
    useStore.getState().setupTent(
      {
        name: name.trim() || `Carpa ${fmt(widthCm)} × ${fmt(depthCm)}`,
        widthCm,
        depthCm,
        heightCm,
        rows,
        cols,
      },
      {
        name: 'Ciclo 1',
        startDate: existing ? germinationDate : hoy,
        potCount,
        liters,
        substrate: substrate.trim(),
      },
      existing,
    );
    router.replace('/(tabs)');
  };

  const next = () => {
    if (!canContinue) return;
    if (step === 3) finish();
    else setStep((step + 1) as Step);
  };

  const buttonLabel = step === 0 ? 'Empezar' : step < 3 ? 'Seguir' : start ? 'Crear mi carpa' : 'Elegí cómo arrancás';

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }} edges={['top', 'bottom']}>
      <KeyboardAvoidingView behavior="padding" style={{ flex: 1 }}>
        {step > 0 ? (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14, paddingHorizontal: 20, paddingTop: 8 }}>
            <IconButton icon="arrow-back" label="Paso anterior" onPress={goBack} />
            <View
              accessible
              accessibilityRole="progressbar"
              accessibilityLabel={`Paso ${step} de ${FORM_STEPS}`}
              style={{ flex: 1, flexDirection: 'row', gap: 6 }}
            >
              {[1, 2, 3].map((n) => (
                <View
                  key={n}
                  style={{ flex: 1, height: 4, borderRadius: 2, backgroundColor: n <= step ? colors.lime : colors.border }}
                />
              ))}
            </View>
          </View>
        ) : null}

        {step === 1 ? (
          <View
            accessible
            accessibilityLabel={`Vista previa de la carpa: ${fmt(previewW)} por ${fmt(previewD)} por ${fmt(previewH)} centímetros, ${potCount} ${potCount === 1 ? 'maceta' : 'macetas'}`}
            style={{ height: keyboardOpen ? 0 : PREVIEW_HEIGHT + 22, overflow: 'hidden' }}
          >
            <View style={{ height: PREVIEW_HEIGHT, overflow: 'hidden' }}>
              <View
                style={{
                  height: SCENE_HEIGHT,
                  marginTop: (PREVIEW_HEIGHT - SCENE_HEIGHT) / 2,
                  transform: [{ scale: PREVIEW_HEIGHT / SCENE_HEIGHT }],
                }}
              >
                <Tent3D
                  items={[]}
                  emptySlots={slots}
                  rows={grid.rows}
                  cols={grid.cols}
                  widthCm={previewW}
                  depthCm={previewD}
                  heightCm={previewH}
                  height={SCENE_HEIGHT}
                  onPressPlant={() => {}}
                />
              </View>
            </View>
            <Muted style={{ textAlign: 'center' }}>
              {fmt(previewW)} × {fmt(previewD)} × {fmt(previewH)} cm · {grid.rows} × {grid.cols} · Arrastrá para girar
            </Muted>
          </View>
        ) : null}

        <ScrollView
          ref={scrollRef}
          style={{ flex: 1 }}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          contentContainerStyle={{ padding: 20, paddingBottom: 24, flexGrow: 1 }}
        >
          <View ref={contentRef} collapsable={false} style={{ flexGrow: 1 }}>
            <Rise key={step} style={{ flexGrow: 1 }}>
              {step === 0 ? (
                <View style={{ flexGrow: 1, justifyContent: 'center', gap: 14, minHeight: 420 }}>
                  <View
                    style={{
                      width: 72,
                      height: 72,
                      borderRadius: radius.lg,
                      backgroundColor: colors.sage,
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <Ionicons name="leaf" size={34} color={colors.leafLight} />
                  </View>
                  <Title size={36}>Hola, esto es Weedly</Title>
                  <Body style={{ fontSize: 16, lineHeight: 24, color: colors.textSoft }}>
                    Acá vas a seguir tu cultivo día a día. Primero armemos tu carpa: te lleva un par de minutos.
                  </Body>
                </View>
              ) : null}

              {step === 1 ? (
                <View style={{ gap: 16 }}>
                  <Title size={28}>Armá tu carpa</Title>
                  <Field
                    label="Nombre"
                    value={name}
                    onChangeText={setNameInput}
                    onFocus={scrollToFocused}
                    accessibilityLabel="Nombre de la carpa"
                    maxLength={40}
                    returnKeyType="done"
                  />

                  <View style={{ gap: 8 }}>
                    <Muted style={{ fontSize: 13 }}>Medidas (cm)</Muted>
                    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                      {SIZE_PRESETS.map((p, i) => (
                        <Chip key={`${p.w}x${p.d}`} label={`${p.w} × ${p.d}`} active={sizeId === i} onPress={() => setSizeId(i)} />
                      ))}
                      <Chip
                        label="Personalizada"
                        active={sizeId === 'custom'}
                        onPress={() => {
                          if (sizeId !== 'custom') {
                            setCustomW(fmt(previewW));
                            setCustomD(fmt(previewD));
                          }
                          setSizeId('custom');
                        }}
                      />
                    </View>
                    {sizeId === 'custom' ? (
                      <View style={{ flexDirection: 'row', gap: 10 }}>
                        <Field
                          label="Ancho"
                          value={customW}
                          onChangeText={setCustomW}
                          onFocus={scrollToFocused}
                          keyboardType="decimal-pad"
                          accessibilityLabel="Ancho en centímetros"
                          style={{ flex: 1 }}
                        />
                        <Field
                          label="Profundidad"
                          value={customD}
                          onChangeText={setCustomD}
                          onFocus={scrollToFocused}
                          keyboardType="decimal-pad"
                          accessibilityLabel="Profundidad en centímetros"
                          style={{ flex: 1 }}
                        />
                      </View>
                    ) : null}
                    {!widthOk || !depthOk ? <ErrorText text={`Poné medidas entre ${SIDE_MIN} y ${SIDE_MAX} cm.`} /> : null}
                  </View>

                  <View style={{ gap: 8 }}>
                    <Muted style={{ fontSize: 13 }}>Altura (cm)</Muted>
                    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                      {HEIGHT_PRESETS.map((h) => (
                        <Chip key={h} label={`${h}`} active={heightId === h} onPress={() => setHeightId(h)} />
                      ))}
                      <Chip
                        label="Otra"
                        active={heightId === 'custom'}
                        onPress={() => {
                          if (heightId !== 'custom') setCustomH(fmt(previewH));
                          setHeightId('custom');
                        }}
                      />
                    </View>
                    {heightId === 'custom' ? (
                      <Field
                        label="Altura"
                        value={customH}
                        onChangeText={setCustomH}
                        onFocus={scrollToFocused}
                        keyboardType="decimal-pad"
                        accessibilityLabel="Altura en centímetros"
                      />
                    ) : null}
                    {!heightOk ? <ErrorText text={`Poné una altura entre ${HEIGHT_MIN} y ${HEIGHT_MAX} cm.`} /> : null}
                  </View>

                  <Stepper label="Macetas" unit="maceta" value={potCount} min={1} max={POTS_MAX} onChange={setPotCount} />
                </View>
              ) : null}

              {step === 2 ? (
                <View style={{ gap: 16 }}>
                  <Title size={28}>Tus macetas</Title>
                  <Body style={{ color: colors.textSoft }}>
                    Los mismos litros y sustrato para {potCount === 1 ? 'la maceta' : `las ${potCount} macetas`}.
                  </Body>
                  <View style={{ gap: 8 }}>
                    <Muted style={{ fontSize: 13 }}>Litros por maceta</Muted>
                    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                      {LITER_PRESETS.map((l) => (
                        <Chip key={l} label={`${l} L`} active={liters === Number(l)} onPress={() => setLitersInput(l)} />
                      ))}
                    </View>
                    <Field
                      label="Otra cantidad"
                      value={litersInput}
                      onChangeText={setLitersInput}
                      onFocus={scrollToFocused}
                      keyboardType="decimal-pad"
                      accessibilityLabel="Litros por maceta"
                      placeholder="10,5"
                    />
                    {!litersOk ? <ErrorText text={`Poné un valor mayor a 0 y hasta ${LITERS_MAX} L.`} /> : null}
                  </View>
                  <View style={{ gap: 8 }}>
                    <Muted style={{ fontSize: 13 }}>Sustrato</Muted>
                    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                      {SUBSTRATE_PRESETS.map((sub) => (
                        <Chip key={sub} label={sub} active={substrate.trim() === sub} onPress={() => setSubstrate(sub)} />
                      ))}
                    </View>
                    <Field
                      label="Otro sustrato"
                      value={substrate}
                      onChangeText={setSubstrate}
                      onFocus={scrollToFocused}
                      accessibilityLabel="Sustrato"
                      maxLength={40}
                      returnKeyType="done"
                    />
                    {!substrateOk ? <ErrorText text="Contame qué sustrato usás." /> : null}
                  </View>
                </View>
              ) : null}

              {step === 3 ? (
                <View style={{ gap: 16 }}>
                  <Title size={28}>¿Cómo arrancás?</Title>
                  <View accessibilityRole="radiogroup" style={{ gap: 10 }}>
                    <StartOption
                      icon="sparkles-outline"
                      title="Arranco de cero"
                      detail="Las macetas quedan vacías, listas para plantar."
                      selected={start === 'cero'}
                      onPress={() => setStart('cero')}
                    />
                    <StartOption
                      icon="leaf-outline"
                      title="Ya tengo plantas"
                      detail="Cargá cuántas tenés y en qué fase están."
                      selected={start === 'plantas'}
                      onPress={() => setStart('plantas')}
                    />
                  </View>

                  {start === 'plantas' ? (
                    <View style={{ gap: 16 }}>
                      <Stepper
                        label="Cuántas plantas"
                        unit="planta"
                        value={plantCount}
                        min={1}
                        max={potCount}
                        onChange={setExistingCount}
                      />
                      <View style={{ gap: 8 }}>
                        <Muted style={{ fontSize: 13 }}>Tipo</Muted>
                        <View style={{ flexDirection: 'row', gap: 8 }}>
                          <Chip label="Foto" active={plantType === 'foto'} onPress={() => setPlantType('foto')} />
                          <Chip label="Auto" active={plantType === 'auto'} onPress={() => setPlantType('auto')} />
                        </View>
                      </View>
                      <DateField
                        label="Fecha de germinación"
                        value={germinationDate}
                        onChange={setGerminationDate}
                        maxDate={hoy}
                        error={dateErrors.germination}
                      />
                      <View style={{ gap: 8 }}>
                        <Muted style={{ fontSize: 13 }}>Fase actual</Muted>
                        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                          {PHASE_OPTIONS.map((p) => (
                            <Chip key={p.id} label={p.label} active={phase === p.id} onPress={() => setPhase(p.id)} />
                          ))}
                        </View>
                      </View>
                      {vegeDate ? (
                        <DateField
                          label="Arrancó vege"
                          value={vegeDate}
                          onChange={setVegeInput}
                          minDate={germinationDate}
                          maxDate={hoy}
                          error={dateErrors.vege}
                        />
                      ) : null}
                      {floraDate ? (
                        <DateField
                          label="Arrancó flora"
                          value={floraDate}
                          onChange={setFloraInput}
                          minDate={vegeDate}
                          maxDate={hoy}
                          error={dateErrors.flora}
                        />
                      ) : null}
                    </View>
                  ) : null}
                </View>
              ) : null}
            </Rise>
          </View>
        </ScrollView>

        <View style={{ paddingHorizontal: 20, paddingTop: 8, paddingBottom: 12 }}>
          <PrimaryButton label={buttonLabel} disabled={!canContinue} onPress={next} />
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function ErrorText({ text }: { text: string }) {
  return (
    <Text accessibilityRole="alert" style={{ fontFamily: fonts.body, fontSize: 12, color: colors.danger }}>
      {text}
    </Text>
  );
}

function StartOption({
  icon,
  title,
  detail,
  selected,
  onPress,
}: {
  icon: React.ComponentProps<typeof Ionicons>['name'];
  title: string;
  detail: string;
  selected: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="radio"
      accessibilityState={{ checked: selected }}
      accessibilityLabel={`${title}. ${detail}`}
      style={({ pressed }) => ({
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        padding: 14,
        minHeight: 72,
        borderRadius: radius.md,
        borderWidth: 1.5,
        borderColor: selected ? colors.lime : colors.card,
        backgroundColor: colors.card,
        transform: [{ scale: pressed ? 0.98 : 1 }],
      })}
    >
      <Ionicons name={icon} size={24} color={selected ? colors.lime : colors.textSoft} />
      <View style={{ flex: 1, gap: 2 }}>
        <H2 style={{ fontSize: 17 }}>{title}</H2>
        <Muted>{detail}</Muted>
      </View>
      <Ionicons name={selected ? 'checkmark-circle' : 'ellipse-outline'} size={22} color={selected ? colors.lime : colors.border} />
    </Pressable>
  );
}
