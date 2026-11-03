# Weedly

App mobile de seguimiento de cultivo indoor (Expo + React Native + TypeScript).

## Correrla en tu celu (Android o iPhone)

Necesitás Node 20+ en la PC y la app **Expo Go** en el celular (Play Store / App Store).

```bash
npm install        # instala la última versión de Expo
npm run setup      # instala el resto con versiones compatibles con ese Expo
npx expo start     # levanta el servidor y muestra un QR
```

- **Android:** abrí Expo Go y escaneá el QR.
- **iPhone:** escaneá el QR con la cámara.

La PC y el celu tienen que estar en la misma red Wi-Fi. Si no conecta, probá `npx expo start --tunnel`.

Si la primera vez Expo te pregunta si querés instalar TypeScript, decile que sí.

## Qué tiene esta versión (v0.1)

- **Carpa 3D**: vista isométrica de la carpa con las macetas como cilindros, se mueve sola y la girás arrastrando. La foto de portada de cada planta aparece arriba de su maceta. Alternás con vista Lista.
- **Ficha de planta**: foto de portada con balanceo 3D, fase y días calculados solos, barra vege/flora, descripción, riegos, fotos con su descripción, genética (efectos y sabores) y cata.
- **Registrar riego**: varias plantas a la vez, receta con cálculo de ml según litros, pH, EC y runoff opcional.
- **Nueva foto**: cámara o galería, descripción, etiquetas (poda, LST, plaga…) y opción de usarla como portada.
- **Clima**: temperatura y humedad con VPD calculado.
- **Diario**: todo lo que pasó, agrupado por día.
- **Biblioteca**: genéticas, fertilizantes (precargado el Nutripack de Namasté), recetas y aviso de riego cada N días.

Arranca con tu ciclo actual cargado: carpa 80×80×160, 6 macetas de 10 L en tierra, germinación 30/07 y flora desde 08/09. Las fechas se corrigen desde Editar planta.

## Dónde se guardan los datos

Por ahora **en el celular** (AsyncStorage). Las fotos quedan referenciadas desde donde las toma el picker.
El próximo paso es sincronizar con **Supabase** (base + fotos en Storage) para tener backup y poder usarla en otro dispositivo.

## Estructura

```
app/                 pantallas (expo-router)
  (tabs)/            Carpa, Diario, Biblioteca
  planta/[id].tsx    ficha de planta
  riego.tsx          registrar riego (modal)
  foto.tsx           nueva foto + descripción (modal)
  clima.tsx          lectura de clima (modal)
  editar-planta/     editar planta, fechas de fase, genética
  genetica/ receta/ fertilizante/   formularios de la biblioteca
src/
  store.ts           estado persistido (zustand)
  selectors.ts       cálculos: fase, días, riego pendiente, portada
  Tent3D.tsx         carpa isométrica animada
  TiltPhoto.tsx      foto con balanceo 3D
  ui.tsx theme.ts    componentes y tokens de diseño
```

## Instalarla como app (sin Expo Go)

- **Android:** `npx eas build -p android --profile preview` genera un APK para instalar directo.
- **iPhone:** necesita cuenta de Apple Developer; `npx eas build -p ios` y distribución por TestFlight.
