import type { Work } from './types';

export const WORKS: Work[] = [
  {
    slug: 'lorenz-attractor',
    label: 'Study',
    date: '2026-07-23',
    animated: true,
    title: { en: 'Lorenz Attractor', ja: 'ローレンツ・アトラクター' },
    description: {
      en: 'A rotating 3D Lorenz strange attractor traced as a glowing ribbon, colored by instantaneous speed.',
      ja: '速度に応じて色づく発光リボンとして描いた、回転する3Dローレンツ・アトラクター。',
    },
    about: {
      en: [
        'The Lorenz system is three simple equations — a stripped-down model of convection in the atmosphere. Their solution never repeats and never settles, yet it never escapes this two-lobed shape. That bounded-but-unrepeating orbit is a strange attractor.',
        'The motion is fully deterministic: the same seed always traces the same path. But it is exquisitely sensitive — nudge the starting point and the trajectory soon diverges completely. Watching order produce something that looks alive and unpredictable is the whole point of the piece.',
        'The ribbon is coloured by speed: deep blue where the path crawls through the dense spirals, white-hot orange where it sweeps fast between the lobes. Light adds up where the trajectory overlaps itself. Drag to rotate; raise ρ to push the system further toward chaos. As a Study, it re-implements the system faithfully rather than reinterpreting it.',
      ],
      ja: [
        'ローレンツ方程式は、大気の対流を極限まで単純化した 3 本の式にすぎない。その解は決して繰り返さず静止もしないが、この 2 つの翼のような形から外へ出ることもない。この「有界なのに反復しない」軌道が strange attractor（ストレンジ・アトラクター）と呼ばれるものだ。',
        '運動は完全に決定論的で、同じ seed は必ず同じ軌道を描く。しかし初期値にきわめて敏感で、出発点をわずかにずらすだけで軌道はやがて全く別物になる。決定論から、生きているように予測不能に見えるものが立ち上がる——それを眺めることがこの作品の核心だ。',
        'リボンは速度で色づけしてある。密な渦をゆっくり這うところは深い青、翼の間を一気に駆けるところは白熱したオレンジ。軌道が自分自身と重なる場所ほど、光が加算されて明るくなる。ドラッグで回転、ρ を上げると系はさらにカオス寄りになる。Study（習作）として、再解釈ではなく系そのものの忠実な再実装を目指した。',
      ],
    },
    parameters: [
      {
        term: 'σ = 10, β = 8/3',
        desc: {
          en: 'The two constants held fixed (the Prandtl number and a geometric aspect ratio). They set the character of the system; only ρ is left adjustable.',
          ja: '固定してある 2 つの定数（プラントル数と幾何比）。系の性格を決める。可変にしてあるのは ρ だけ。',
        },
      },
      {
        term: 'ρ (rho)',
        desc: {
          en: 'The Rayleigh number — how hard the fluid is driven, and the main knob here. Below about 24.7 the motion decays to a fixed point; 28 is the classic chaotic value; higher reshapes the wings.',
          ja: 'レイリー数——流体をどれだけ強く駆動するか、この作品の主役つまみ。約 24.7 未満では軌道は 1 点に収束し、28 が古典的なカオス値。上げるほど翼の形が変わる。',
        },
      },
      {
        term: 'Trail',
        desc: {
          en: 'How much of the recent path is kept and drawn — a longer trail thickens the ribbon into denser spirals.',
          ja: '直近の軌道をどれだけ保持して描くか。長いほどリボンが密な渦になる。',
        },
      },
      {
        term: 'Speed',
        desc: {
          en: 'Integration steps advanced per frame — how fast the bright head races along the curve.',
          ja: '1 フレームで進める積分ステップ数。明るい先端がどれだけ速く曲線を進むか。',
        },
      },
      {
        term: 'Spin',
        desc: {
          en: 'Auto-rotation rate of the 3D view. Set it to zero and rotate by dragging instead.',
          ja: '3D ビューの自動回転の速さ。0 にしてドラッグで手動回転も可能。',
        },
      },
    ],
    tags: ['strange-attractor', 'chaos', 'rk4', 'glow'],
  },
];
